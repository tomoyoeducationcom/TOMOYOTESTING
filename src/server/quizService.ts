import crypto from 'crypto';
import {
  INITIAL_SAMPLE_QUIZZES,
  type QuizAttemptRecord,
  type QuizDefinition,
  type StudentSafeQuiz,
  buildQuizAttemptsCsv,
  checkQuizAvailability,
  countMatchingAttempts,
  gradeQuizSubmission,
  toStudentSafeQuiz,
  validateQuizPayload,
} from '../lib/quizAndWaDomain';
import { normalizeWhatsappPhone } from '../lib/domain';
import { readJsonData, writeJsonData } from './storage';

const QUIZZES_FILE = 'quizzes.json';
const ATTEMPTS_FILE = 'quiz-attempts.json';
const SESSIONS_FILE = 'quiz-sessions.json';

interface QuizSessionRecord {
  sessionToken: string;
  quizId: string;
  studentName: string;
  studentClass: string;
  parentWhatsapp?: string;
  startedAtIso: string;
  deadlineIso?: string;
  submitted: boolean;
}

function loadQuizzes(): QuizDefinition[] {
  const loaded = readJsonData<QuizDefinition[] | null>(QUIZZES_FILE, null);
  if (!loaded || !Array.isArray(loaded) || loaded.length === 0) {
    writeJsonData(QUIZZES_FILE, INITIAL_SAMPLE_QUIZZES);
    return [...INITIAL_SAMPLE_QUIZZES];
  }
  return loaded;
}

function saveQuizzes(quizzes: QuizDefinition[]) {
  writeJsonData(QUIZZES_FILE, quizzes);
}

function loadAttempts(): QuizAttemptRecord[] {
  return readJsonData<QuizAttemptRecord[]>(ATTEMPTS_FILE, []);
}

function saveAttempts(attempts: QuizAttemptRecord[]) {
  writeJsonData(ATTEMPTS_FILE, attempts);
}

function loadSessions(): QuizSessionRecord[] {
  return readJsonData<QuizSessionRecord[]>(SESSIONS_FILE, []);
}

function saveSessions(sessions: QuizSessionRecord[]) {
  writeJsonData(SESSIONS_FILE, sessions.slice(-1000));
}

export function listPublicQuizzes(): Array<
  StudentSafeQuiz & {
    availability: ReturnType<typeof checkQuizAvailability>;
  }
> {
  const quizzes = loadQuizzes();
  return quizzes
    .filter((q) => q.status === 'published')
    .map((q) => ({
      ...toStudentSafeQuiz(q),
      availability: checkQuizAvailability(q),
    }));
}

export function getPublicQuizById(quizId: string): {
  quiz: StudentSafeQuiz | null;
  availability: ReturnType<typeof checkQuizAvailability> | null;
} {
  const quizzes = loadQuizzes();
  const found = quizzes.find((q) => q.id === quizId);
  if (!found || found.status !== 'published') {
    return { quiz: null, availability: null };
  }
  return {
    quiz: toStudentSafeQuiz(found),
    availability: checkQuizAvailability(found),
  };
}

export function startStudentQuizSession(input: {
  quizId: string;
  studentName: string;
  studentClass: string;
  parentWhatsapp?: string;
}): {
  ok: boolean;
  error?: string;
  sessionToken?: string;
  startedAtIso?: string;
  deadlineIso?: string;
  attemptsUsed?: number;
  quiz?: StudentSafeQuiz;
} {
  const studentName = input.studentName.trim();
  const studentClass = input.studentClass.trim();
  if (studentName.length < 2 || studentName.length > 120) {
    return { ok: false, error: 'Nama lengkap siswa wajib diisi (minimal 2 karakter).' };
  }
  if (studentClass.length < 1 || studentClass.length > 60) {
    return { ok: false, error: 'Kelas wajib diisi.' };
  }

  const quizzes = loadQuizzes();
  const quiz = quizzes.find((q) => q.id === input.quizId);
  if (!quiz) {
    return { ok: false, error: 'Kuis tidak ditemukan.' };
  }

  const avail = checkQuizAvailability(quiz);
  if (!avail.available) {
    return { ok: false, error: avail.reason || 'Kuis belum dapat dikerjakan saat ini.' };
  }

  const attempts = loadAttempts();
  const attemptsUsed = countMatchingAttempts(attempts, quiz.id, studentName, studentClass);
  if (quiz.maxAttempts > 0 && attemptsUsed >= quiz.maxAttempts) {
    return {
      ok: false,
      error: `Batas maksimal pengerjaan (${quiz.maxAttempts} kali) untuk ${studentName} (${studentClass}) telah tercapai.`,
    };
  }

  const now = new Date();
  const startedAtIso = now.toISOString();
  const deadlineIso =
    quiz.timeLimitMinutes > 0
      ? new Date(now.getTime() + quiz.timeLimitMinutes * 60 * 1000).toISOString()
      : undefined;

  const sessionToken = crypto.randomUUID();
  const sessions = loadSessions();
  sessions.push({
    sessionToken,
    quizId: quiz.id,
    studentName,
    studentClass,
    parentWhatsapp: input.parentWhatsapp?.trim()
      ? normalizeWhatsappPhone(input.parentWhatsapp.trim())
      : undefined,
    startedAtIso,
    deadlineIso,
    submitted: false,
  });
  saveSessions(sessions);

  return {
    ok: true,
    sessionToken,
    startedAtIso,
    deadlineIso,
    attemptsUsed,
    quiz: toStudentSafeQuiz(quiz),
  };
}

export function submitStudentQuizAttempt(input: {
  quizId: string;
  sessionToken?: string;
  studentName: string;
  studentClass: string;
  parentWhatsapp?: string;
  answers: Record<string, string>;
}): {
  ok: boolean;
  error?: string;
  result?: {
    attemptId: string;
    quizTitle: string;
    studentName: string;
    studentClass: string;
    score: number;
    maxScore: number;
    percentage: number;
    correctCount: number;
    wrongCount: number;
    unansweredCount: number;
    durationSeconds: number;
    submittedAtIso: string;
  };
} {
  const quizzes = loadQuizzes();
  const quiz = quizzes.find((q) => q.id === input.quizId);
  if (!quiz) {
    return { ok: false, error: 'Kuis tidak ditemukan.' };
  }

  const avail = checkQuizAvailability(quiz);
  if (!avail.available) {
    return { ok: false, error: avail.reason || 'Kuis sudah tidak menerima jawaban.' };
  }

  const sessions = loadSessions();
  const sessionIdx = input.sessionToken
    ? sessions.findIndex((s) => s.sessionToken === input.sessionToken && s.quizId === quiz.id)
    : -1;

  if (sessionIdx < 0) {
    return { ok: false, error: 'Sesi pengerjaan kuis tidak valid atau sudah kedaluwarsa.' };
  }

  const session = sessions[sessionIdx];
  if (session.submitted) {
    return { ok: false, error: 'Jawaban pada sesi ini sudah pernah dikirim sebelumnya.' };
  }

  const nowMs = Date.now();
  const startedMs = new Date(session.startedAtIso).getTime();
  const durationSeconds = Math.max(1, Math.round((nowMs - startedMs) / 1000));

  if (quiz.timeLimitMinutes > 0) {
    const allowedSec = quiz.timeLimitMinutes * 60 + 20; // 20s network grace
    if (durationSeconds > allowedSec) {
      return {
        ok: false,
        error: `Waktu pengerjaan melebihi batas maksimal (${quiz.timeLimitMinutes} menit). Jawaban ditolak oleh server.`,
      };
    }
  }

  const attempts = loadAttempts();
  const attemptsUsed = countMatchingAttempts(
    attempts,
    quiz.id,
    session.studentName,
    session.studentClass
  );
  if (quiz.maxAttempts > 0 && attemptsUsed >= quiz.maxAttempts) {
    return {
      ok: false,
      error: `Batas maksimal percobaan (${quiz.maxAttempts}x) telah tercapai.`,
    };
  }

  const graded = gradeQuizSubmission(quiz, input.answers || {}, durationSeconds);
  const submittedAtIso = new Date().toISOString();
  const attemptId = `att_${Date.now()}_${crypto.randomBytes(3).toString('hex')}`;

  const record: QuizAttemptRecord = {
    id: attemptId,
    quizId: quiz.id,
    quizTitle: quiz.title,
    studentName: session.studentName,
    studentClass: session.studentClass,
    parentWhatsapp: session.parentWhatsapp,
    answers: input.answers || {},
    score: graded.score,
    maxScore: graded.maxScore,
    percentage: graded.percentage,
    correctCount: graded.correctCount,
    wrongCount: graded.wrongCount,
    unansweredCount: graded.unansweredCount,
    durationSeconds,
    startedAtIso: session.startedAtIso,
    submittedAtIso,
    gradedDetails: graded.gradedDetails,
  };

  attempts.unshift(record);
  saveAttempts(attempts);

  sessions[sessionIdx] = { ...session, submitted: true };
  saveSessions(sessions);

  return {
    ok: true,
    result: {
      attemptId,
      quizTitle: quiz.title,
      studentName: record.studentName,
      studentClass: record.studentClass,
      score: record.score,
      maxScore: record.maxScore,
      percentage: record.percentage,
      correctCount: record.correctCount,
      wrongCount: record.wrongCount,
      unansweredCount: record.unansweredCount,
      durationSeconds: record.durationSeconds,
      submittedAtIso: record.submittedAtIso,
    },
  };
}

// Admin Quiz CRUD & Analytics
export function listAdminQuizzes(): Array<
  QuizDefinition & { attemptCount: number }
> {
  const quizzes = loadQuizzes();
  const attempts = loadAttempts();
  return quizzes.map((q) => ({
    ...q,
    attemptCount: attempts.filter((a) => a.quizId === q.id).length,
  }));
}

export function upsertAdminQuiz(
  payload: Partial<QuizDefinition> & { id?: string }
): { ok: boolean; errors?: string[]; quiz?: QuizDefinition } {
  const validation = validateQuizPayload(payload);
  if (!validation.valid) {
    return { ok: false, errors: validation.errors };
  }

  const quizzes = loadQuizzes();
  const nowIso = new Date().toISOString();
  const cleanId =
    payload.id && /^[a-zA-Z0-9_-]{3,80}$/.test(payload.id)
      ? payload.id
      : `kuis-${Date.now()}-${crypto.randomBytes(2).toString('hex')}`;

  const existingIdx = quizzes.findIndex((q) => q.id === cleanId);
  const existing = existingIdx >= 0 ? quizzes[existingIdx] : null;

  const normalizedQuestions = (payload.questions || []).map((q, idx) => ({
    id: q.id || `q_${idx + 1}`,
    order: idx + 1,
    type: q.type,
    prompt: q.prompt.trim(),
    options: q.options.map((o, oIdx) => ({
      id: o.id || `opt_${oIdx + 1}`,
      text: o.text.trim(),
    })),
    points: Math.max(1, Number(q.points) || 10),
    correctOptionId: q.correctOptionId,
    explanation: q.explanation?.trim() || undefined,
  }));

  const record: QuizDefinition = {
    id: cleanId,
    title: (payload.title || '').trim(),
    description: (payload.description || '').trim(),
    instructions: (payload.instructions || '').trim(),
    targetClass: (payload.targetClass || 'Semua Tingkat').trim(),
    status: payload.status || 'draft',
    timeLimitMinutes: Math.max(0, Number(payload.timeLimitMinutes) || 0),
    maxAttempts: Math.max(0, Number(payload.maxAttempts) || 0),
    startAtIso: payload.startAtIso || undefined,
    endAtIso: payload.endAtIso || undefined,
    questions: normalizedQuestions,
    createdAtIso: existing?.createdAtIso || nowIso,
    updatedAtIso: nowIso,
  };

  if (existingIdx >= 0) {
    quizzes[existingIdx] = record;
  } else {
    quizzes.unshift(record);
  }
  saveQuizzes(quizzes);
  return { ok: true, quiz: record };
}

export function deleteAdminQuiz(quizId: string): boolean {
  const quizzes = loadQuizzes();
  const next = quizzes.filter((q) => q.id !== quizId);
  if (next.length === quizzes.length) return false;
  saveQuizzes(next);
  return true;
}

export function getAdminQuizAttempts(quizId: string): {
  quiz: QuizDefinition | null;
  attempts: QuizAttemptRecord[];
} {
  const quizzes = loadQuizzes();
  const quiz = quizzes.find((q) => q.id === quizId) || null;
  const attempts = loadAttempts().filter((a) => a.quizId === quizId);
  return { quiz, attempts };
}

export function exportAdminQuizCsv(quizId: string): {
  ok: boolean;
  filename?: string;
  csv?: string;
} {
  const { quiz, attempts } = getAdminQuizAttempts(quizId);
  if (!quiz) return { ok: false };
  const safeSlug = quiz.id.replace(/[^a-zA-Z0-9_-]/g, '_');
  return {
    ok: true,
    filename: `hasil-${safeSlug}.csv`,
    csv: buildQuizAttemptsCsv(quiz, attempts),
  };
}
