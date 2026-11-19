import crypto from 'crypto';
import firebaseConfig from '../../firebase-applet-config.json';
import {
  type QuizAttemptRecord,
  type QuizDefinition,
  type StudentSafeQuiz,
  buildAllQuizAttemptsCsv,
  buildQuizAttemptsCsv,
  checkQuizAvailability,
  countMatchingAttempts,
  gradeQuizByAnswerHashes,
  gradeQuizSubmission,
  toStudentSafeQuiz,
  validateQuizPayload,
} from '../lib/quizAndWaDomain';
import { normalizeWhatsappPhone } from '../lib/domain';
import {
  fetchPublishedQuizFromFirestoreRest,
  listPublishedQuizzesFromFirestoreRest,
  saveQuizAttemptToFirestoreRest,
} from './quizFirestoreRest';
import { readJsonData, writeJsonData } from './storage';

const QUIZZES_FILE = 'quizzes.json';
const ATTEMPTS_FILE = 'quiz-attempts.json';
const SUBMITTED_SESSIONS_FILE = 'quiz-submitted-sessions.json';

interface StatelessSessionPayload {
  sid: string;
  qid: string;
  sn: string;
  sc: string;
  pw?: string;
  st: string;
  dl?: string;
}

function getQuizSessionSecret(): string {
  return (
    process.env.QUIZ_SESSION_SECRET ||
    process.env.FONNTE_TOKEN ||
    `tomoyo-quiz-hmac-${firebaseConfig.projectId}-${firebaseConfig.apiKey}`
  );
}

function signQuizSession(payload: StatelessSessionPayload): string {
  const encoded = Buffer.from(JSON.stringify(payload), 'utf-8').toString('base64url');
  const sig = crypto
    .createHmac('sha256', getQuizSessionSecret())
    .update(encoded)
    .digest('base64url');
  return `v1.${encoded}.${sig}`;
}

function verifyQuizSessionToken(
  token: string,
  expectedQuizId: string
): StatelessSessionPayload | null {
  if (!token || !token.startsWith('v1.')) return null;
  const parts = token.split('.');
  if (parts.length !== 3) return null;
  const [, encoded, sig] = parts;
  const expectedSig = crypto
    .createHmac('sha256', getQuizSessionSecret())
    .update(encoded)
    .digest('base64url');
  const sigBuf = Buffer.from(sig);
  const expBuf = Buffer.from(expectedSig);
  if (sigBuf.length !== expBuf.length || !crypto.timingSafeEqual(sigBuf, expBuf)) {
    return null;
  }
  try {
    const parsed = JSON.parse(
      Buffer.from(encoded, 'base64url').toString('utf-8')
    ) as StatelessSessionPayload;
    if (!parsed || parsed.qid !== expectedQuizId || !parsed.sn || !parsed.sc || !parsed.st) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

function loadQuizzes(): QuizDefinition[] {
  const loaded = readJsonData<QuizDefinition[] | null>(QUIZZES_FILE, null);
  if (!loaded || !Array.isArray(loaded)) {
    return [];
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

function loadSubmittedSessionIds(): string[] {
  return readJsonData<string[]>(SUBMITTED_SESSIONS_FILE, []);
}

function markSessionSubmitted(sid: string) {
  const existing = loadSubmittedSessionIds();
  if (!existing.includes(sid)) {
    existing.push(sid);
    writeJsonData(SUBMITTED_SESSIONS_FILE, existing.slice(-2000));
  }
}

async function resolvePublicQuizWithSource(quizId: string): Promise<{
  quiz: QuizDefinition | null;
  source: 'firestore' | 'local';
}> {
  const firestoreQuiz = await fetchPublishedQuizFromFirestoreRest(quizId);
  if (firestoreQuiz) {
    return { quiz: firestoreQuiz, source: 'firestore' };
  }
  const localFound = loadQuizzes().find((q) => q.id === quizId) || null;
  return { quiz: localFound, source: 'local' };
}

export async function listPublicQuizzes(): Promise<
  Array<
    StudentSafeQuiz & {
      availability: ReturnType<typeof checkQuizAvailability>;
    }
  >
> {
  const firestoreQuizzes = await listPublishedQuizzesFromFirestoreRest();
  if (firestoreQuizzes.length > 0) {
    return firestoreQuizzes.map((q) => ({
      ...toStudentSafeQuiz(q),
      availability: checkQuizAvailability(q),
    }));
  }
  const localQuizzes = loadQuizzes();
  return localQuizzes
    .filter((q) => q.status === 'published')
    .map((q) => ({
      ...toStudentSafeQuiz(q),
      availability: checkQuizAvailability(q),
    }));
}

export async function getPublicQuizById(quizId: string): Promise<{
  quiz: StudentSafeQuiz | null;
  availability: ReturnType<typeof checkQuizAvailability> | null;
}> {
  const { quiz } = await resolvePublicQuizWithSource(quizId);
  if (!quiz || quiz.status !== 'published') {
    return { quiz: null, availability: null };
  }
  return {
    quiz: toStudentSafeQuiz(quiz),
    availability: checkQuizAvailability(quiz),
  };
}

export async function startStudentQuizSession(input: {
  quizId: string;
  studentName: string;
  studentClass: string;
  parentWhatsapp?: string;
}): Promise<{
  ok: boolean;
  error?: string;
  sessionToken?: string;
  startedAtIso?: string;
  deadlineIso?: string;
  attemptsUsed?: number;
  quiz?: StudentSafeQuiz;
}> {
  const studentName = input.studentName.trim();
  const studentClass = input.studentClass.trim();
  if (studentName.length < 2 || studentName.length > 120) {
    return { ok: false, error: 'Nama lengkap siswa wajib diisi (minimal 2 karakter).' };
  }
  if (studentClass.length < 1 || studentClass.length > 60) {
    return { ok: false, error: 'Kelas wajib diisi.' };
  }

  const { quiz, source } = await resolvePublicQuizWithSource(input.quizId);
  if (!quiz) {
    return { ok: false, error: 'Kuis tidak ditemukan.' };
  }

  const avail = checkQuizAvailability(quiz);
  if (!avail.available) {
    return { ok: false, error: avail.reason || 'Kuis belum dapat dikerjakan saat ini.' };
  }

  let attemptsUsed = 0;
  if (source === 'local') {
    const attempts = loadAttempts();
    attemptsUsed = countMatchingAttempts(attempts, quiz.id, studentName, studentClass);
    if (quiz.maxAttempts > 0 && attemptsUsed >= quiz.maxAttempts) {
      return {
        ok: false,
        error: `Batas maksimal pengerjaan (${quiz.maxAttempts} kali) untuk ${studentName} (${studentClass}) telah tercapai.`,
      };
    }
  }

  const now = new Date();
  const startedAtIso = now.toISOString();
  const deadlineIso =
    quiz.timeLimitMinutes > 0
      ? new Date(now.getTime() + quiz.timeLimitMinutes * 60 * 1000).toISOString()
      : undefined;

  const sid = crypto.randomBytes(8).toString('hex');
  const normalizedParentWa = input.parentWhatsapp?.trim()
    ? normalizeWhatsappPhone(input.parentWhatsapp.trim())
    : undefined;

  const sessionToken = signQuizSession({
    sid,
    qid: quiz.id,
    sn: studentName,
    sc: studentClass,
    ...(normalizedParentWa ? { pw: normalizedParentWa } : {}),
    st: startedAtIso,
    ...(deadlineIso ? { dl: deadlineIso } : {}),
  });

  return {
    ok: true,
    sessionToken,
    startedAtIso,
    deadlineIso,
    attemptsUsed,
    quiz: toStudentSafeQuiz(quiz),
  };
}

export async function submitStudentQuizAttempt(input: {
  quizId: string;
  sessionToken?: string;
  studentName: string;
  studentClass: string;
  parentWhatsapp?: string;
  answers: Record<string, string>;
}): Promise<{
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
  attemptRecord?: QuizAttemptRecord;
  savedToFirestore?: boolean;
  firestoreError?: string;
}> {
  const { quiz, source } = await resolvePublicQuizWithSource(input.quizId);
  if (!quiz) {
    return { ok: false, error: 'Kuis tidak ditemukan.' };
  }

  const avail = checkQuizAvailability(quiz);
  if (!avail.available) {
    return { ok: false, error: avail.reason || 'Kuis sudah tidak menerima jawaban.' };
  }

  const session = input.sessionToken
    ? verifyQuizSessionToken(input.sessionToken, quiz.id)
    : null;
  if (!session) {
    return { ok: false, error: 'Sesi pengerjaan kuis tidak valid atau sudah kedaluwarsa.' };
  }

  const submittedIds = loadSubmittedSessionIds();
  if (submittedIds.includes(session.sid)) {
    return { ok: false, error: 'Jawaban pada sesi ini sudah pernah dikirim sebelumnya.' };
  }

  const nowMs = Date.now();
  const startedMs = new Date(session.st).getTime();
  if (Number.isNaN(startedMs)) {
    return { ok: false, error: 'Waktu mulai sesi kuis tidak valid.' };
  }
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

  if (source === 'local') {
    const attempts = loadAttempts();
    const attemptsUsed = countMatchingAttempts(attempts, quiz.id, session.sn, session.sc);
    if (quiz.maxAttempts > 0 && attemptsUsed >= quiz.maxAttempts) {
      return {
        ok: false,
        error: `Batas maksimal percobaan (${quiz.maxAttempts}x) telah tercapai.`,
      };
    }
  }

  const hasPlainKeys = quiz.questions.every(
    (q) => typeof q.correctOptionId === 'string' && q.correctOptionId.trim().length > 0
  );
  const graded = hasPlainKeys
    ? gradeQuizSubmission(quiz, input.answers || {}, durationSeconds)
    : await gradeQuizByAnswerHashes(quiz.id, quiz.questions, input.answers || {}, durationSeconds);

  const submittedAtIso = new Date().toISOString();
  const attemptId = `att_${session.sid}`;

  const record: QuizAttemptRecord = {
    id: attemptId,
    quizId: quiz.id,
    quizTitle: quiz.title,
    studentName: session.sn,
    studentClass: session.sc,
    ...(session.pw ? { parentWhatsapp: session.pw } : {}),
    answers: input.answers || {},
    score: graded.score,
    maxScore: graded.maxScore,
    percentage: graded.percentage,
    correctCount: graded.correctCount,
    wrongCount: graded.wrongCount,
    unansweredCount: graded.unansweredCount,
    durationSeconds,
    startedAtIso: session.st,
    submittedAtIso,
    gradedDetails: graded.gradedDetails,
  };

  let savedToFirestore = false;
  let firestoreError: string | undefined;

  if (source === 'local') {
    const attempts = loadAttempts();
    attempts.unshift(record);
    saveAttempts(attempts);
  } else {
    const persisted = await saveQuizAttemptToFirestoreRest(record);
    savedToFirestore = persisted.ok;
    if (!persisted.ok) {
      firestoreError = persisted.error;
    }
  }
  markSessionSubmitted(session.sid);

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
    attemptRecord: record,
    savedToFirestore,
    ...(firestoreError ? { firestoreError } : {}),
  };
}

// Local Admin Quiz CRUD & Analytics (retained for offline unit tests)
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
    imageUrl: typeof q.imageUrl === 'string' && q.imageUrl.trim() ? q.imageUrl.trim() : undefined,
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

  const attempts = loadAttempts();
  const nextAttempts = attempts.filter((a) => a.quizId !== quizId);
  if (nextAttempts.length !== attempts.length) {
    saveAttempts(nextAttempts);
  }
  return true;
}

export function listAllAdminQuizAttempts(): QuizAttemptRecord[] {
  const attempts = loadAttempts();
  return [...attempts].sort(
    (a, b) => new Date(b.submittedAtIso).getTime() - new Date(a.submittedAtIso).getTime()
  );
}

export function deleteAdminQuizAttempt(attemptId: string): boolean {
  const attempts = loadAttempts();
  const next = attempts.filter((a) => a.id !== attemptId);
  if (next.length === attempts.length) return false;
  saveAttempts(next);
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

export function exportAllAdminQuizAttemptsCsv(filters?: {
  quizId?: string;
  studentClass?: string;
  search?: string;
}): { filename: string; csv: string } {
  let rows = listAllAdminQuizAttempts();
  if (filters?.quizId && filters.quizId !== 'all') {
    rows = rows.filter((r) => r.quizId === filters.quizId);
  }
  if (filters?.studentClass && filters.studentClass !== 'all') {
    const cls = filters.studentClass.trim().toLowerCase();
    rows = rows.filter((r) => r.studentClass.trim().toLowerCase() === cls);
  }
  if (filters?.search && filters.search.trim()) {
    const q = filters.search.trim().toLowerCase();
    rows = rows.filter(
      (r) =>
        r.studentName.toLowerCase().includes(q) ||
        r.studentClass.toLowerCase().includes(q) ||
        r.quizTitle.toLowerCase().includes(q)
    );
  }
  return {
    filename: 'rekap-nilai-kuis-siswa.csv',
    csv: buildAllQuizAttemptsCsv(rows),
  };
}
