import {
  collection,
  deleteDoc,
  deleteField,
  doc,
  getDoc,
  getDocFromServer,
  getDocs,
  getDocsFromServer,
  onSnapshot,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
  writeBatch,
  type Timestamp,
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from './firebase';
import {
  type GradedQuestionDetail,
  type PublicFirestoreQuizQuestion,
  type QuizAttemptRecord,
  type QuizDefinition,
  type QuizQuestion,
  type StudentSafeQuiz,
  checkQuizAvailability,
  computeQuestionAnswerHash,
  sanitizeQuizAttemptForFirestore,
  toStudentSafeQuiz,
  validateQuizPayload,
} from './quizAndWaDomain';

export interface AdminQuizItem extends QuizDefinition {
  attemptCount: number;
}

export interface PublicQuizListItem extends StudentSafeQuiz {
  availability: ReturnType<typeof checkQuizAvailability>;
}

interface FirestoreQuizDoc {
  title: string;
  description?: string;
  instructions?: string;
  targetClass?: string;
  status: 'draft' | 'published' | 'disabled';
  isPublished: boolean;
  timeLimitMinutes?: number;
  maxAttempts?: number;
  startAtIso?: string;
  endAtIso?: string;
  questionsCount: number;
  totalPoints?: number;
  questions: PublicFirestoreQuizQuestion[];
  createdAt?: Timestamp | { toDate?: () => Date };
  updatedAt?: Timestamp | { toDate?: () => Date };
}

interface FirestoreQuizKeyDoc {
  quizId: string;
  questionCount: number;
  answers: Record<
    string,
    {
      correctOptionId: string;
      explanation?: string;
    }
  >;
}

function timestampToIso(ts: unknown, fallbackIso: string): string {
  if (
    ts &&
    typeof ts === 'object' &&
    'toDate' in ts &&
    typeof (ts as { toDate?: () => Date }).toDate === 'function'
  ) {
    try {
      return (ts as { toDate: () => Date }).toDate().toISOString();
    } catch {
      return fallbackIso;
    }
  }
  return fallbackIso;
}

export function isFirestorePermissionDeniedError(err: unknown): boolean {
  const msg = err instanceof Error ? err.message : String(err);
  if (msg.toLowerCase().includes('permission')) return true;
  if (
    typeof err === 'object' &&
    err !== null &&
    'code' in err &&
    (err as { code?: string }).code === 'permission-denied'
  ) {
    return true;
  }
  return false;
}

function mergeQuizWithKeys(
  quizId: string,
  docData: FirestoreQuizDoc,
  keyData?: FirestoreQuizKeyDoc
): QuizDefinition {
  const nowIso = new Date().toISOString();
  const createdAtIso = timestampToIso(docData.createdAt, nowIso);
  const updatedAtIso = timestampToIso(docData.updatedAt, createdAtIso);

  const questions: QuizQuestion[] = (Array.isArray(docData.questions) ? docData.questions : []).map(
    (q, idx) => {
      const keyEntry = keyData?.answers?.[q.id];
      return {
        id: q.id || `q_${idx + 1}`,
        order: Number(q.order) || idx + 1,
        type: q.type === 'true_false' ? 'true_false' : 'multiple_choice',
        prompt: q.prompt || '',
        ...(q.imageUrl ? { imageUrl: q.imageUrl } : {}),
        options: Array.isArray(q.options) ? q.options : [],
        points: Math.max(1, Number(q.points) || 10),
        correctOptionId:
          keyEntry?.correctOptionId || (Array.isArray(q.options) && q.options[0]?.id) || 'a',
        ...(keyEntry?.explanation ? { explanation: keyEntry.explanation } : {}),
        ...(q.answerHash ? { answerHash: q.answerHash } : {}),
      };
    }
  );

  return {
    id: quizId,
    title: docData.title || '',
    description: docData.description || '',
    instructions: docData.instructions || '',
    targetClass: docData.targetClass || 'Semua Tingkat',
    status: docData.status || 'draft',
    timeLimitMinutes: Math.max(0, Number(docData.timeLimitMinutes) || 0),
    maxAttempts: Math.max(0, Number(docData.maxAttempts) || 0),
    ...(docData.startAtIso ? { startAtIso: docData.startAtIso } : {}),
    ...(docData.endAtIso ? { endAtIso: docData.endAtIso } : {}),
    questions,
    createdAtIso,
    updatedAtIso,
  };
}

function parseIsoMs(iso: string | undefined): number {
  if (!iso) return 0;
  const ms = new Date(iso).getTime();
  return Number.isNaN(ms) ? 0 : ms;
}

export function mapFirestoreAttemptDoc(
  id: string,
  raw: Partial<Omit<QuizAttemptRecord, 'id'>> & { createdAt?: unknown }
): QuizAttemptRecord {
  const fallbackIso = timestampToIso(raw.createdAt, new Date().toISOString());
  const submittedAtIso =
    typeof raw.submittedAtIso === 'string' && raw.submittedAtIso.trim()
      ? raw.submittedAtIso
      : fallbackIso;
  return {
    id,
    quizId: raw.quizId || '',
    quizTitle: raw.quizTitle || 'Kuis Online',
    studentName: raw.studentName || '-',
    studentClass: raw.studentClass || '-',
    ...(raw.parentWhatsapp ? { parentWhatsapp: raw.parentWhatsapp } : {}),
    answers: raw.answers || {},
    score: Number(raw.score) || 0,
    maxScore: Number(raw.maxScore) || 0,
    percentage: Number(raw.percentage) || 0,
    correctCount: Number(raw.correctCount) || 0,
    wrongCount: Number(raw.wrongCount) || 0,
    unansweredCount: Number(raw.unansweredCount) || 0,
    durationSeconds: Number(raw.durationSeconds) || 0,
    startedAtIso: raw.startedAtIso || submittedAtIso,
    submittedAtIso,
    gradedDetails: Array.isArray(raw.gradedDetails) ? raw.gradedDetails : [],
  };
}

export function subscribeAdminQuizAttempts(
  onUpdate: (attempts: QuizAttemptRecord[]) => void,
  onError?: (err: unknown) => void
): () => void {
  return onSnapshot(
    collection(db, 'quizAttempts'),
    (snap) => {
      const list = snap.docs
        .map((d) =>
          mapFirestoreAttemptDoc(
            d.id,
            d.data() as Partial<Omit<QuizAttemptRecord, 'id'>> & { createdAt?: unknown }
          )
        )
        .sort((a, b) => parseIsoMs(b.submittedAtIso) - parseIsoMs(a.submittedAtIso));
      onUpdate(list);
    },
    (err) => {
      if (onError) onError(err);
    }
  );
}

export async function adminFetchQuizzesAndAttemptsFromFirestore(): Promise<{
  quizzes: AdminQuizItem[];
  attempts: QuizAttemptRecord[];
  attemptsError?: string;
}> {
  let quizSnap;
  try {
    quizSnap = await getDocsFromServer(collection(db, 'quizzes'));
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, 'quizzes');
  }

  let keySnap: Awaited<ReturnType<typeof getDocsFromServer>> | null = null;
  try {
    keySnap = await getDocsFromServer(collection(db, 'quizKeys'));
  } catch (error) {
    if (isFirestorePermissionDeniedError(error)) {
      handleFirestoreError(error, OperationType.LIST, 'quizKeys');
    }
    keySnap = null;
  }

  let attemptsSnap: Awaited<ReturnType<typeof getDocsFromServer>> | null = null;
  let attemptsError: string | undefined;
  try {
    attemptsSnap = await getDocsFromServer(collection(db, 'quizAttempts'));
  } catch (error) {
    if (isFirestorePermissionDeniedError(error)) {
      handleFirestoreError(error, OperationType.LIST, 'quizAttempts');
    }
    attemptsError =
      error instanceof Error ? error.message : 'Gagal memuat daftar nilai siswa dari Firestore.';
    attemptsSnap = null;
  }

  const keyMap = new Map<string, FirestoreQuizKeyDoc>();
  keySnap?.docs.forEach((d) => {
    keyMap.set(d.id, d.data() as FirestoreQuizKeyDoc);
  });

  const attempts: QuizAttemptRecord[] = (attemptsSnap?.docs || [])
    .map((d) =>
      mapFirestoreAttemptDoc(
        d.id,
        d.data() as Partial<Omit<QuizAttemptRecord, 'id'>> & { createdAt?: unknown }
      )
    )
    .sort((a, b) => parseIsoMs(b.submittedAtIso) - parseIsoMs(a.submittedAtIso));

  const quizzes: AdminQuizItem[] = quizSnap.docs
    .map((d) => {
      const merged = mergeQuizWithKeys(d.id, d.data() as FirestoreQuizDoc, keyMap.get(d.id));
      return {
        ...merged,
        attemptCount: attempts.filter((a) => a.quizId === d.id).length,
      };
    })
    .sort((a, b) => parseIsoMs(b.updatedAtIso) - parseIsoMs(a.updatedAtIso));

  return { quizzes, attempts, ...(attemptsError ? { attemptsError } : {}) };
}

export async function adminSaveQuizToFirestore(
  payload: Partial<QuizDefinition> & { id?: string }
): Promise<{ ok: boolean; errors?: string[]; quiz?: QuizDefinition }> {
  const validation = validateQuizPayload(payload);
  if (!validation.valid) {
    return { ok: false, errors: validation.errors };
  }

  const randomHex = Math.random().toString(16).slice(2, 6);
  const quizId =
    payload.id && /^[a-zA-Z0-9_-]{3,128}$/.test(payload.id)
      ? payload.id
      : `kuis-${Date.now()}-${randomHex}`;

  const rawQuestions = payload.questions || [];
  const publicQuestions: PublicFirestoreQuizQuestion[] = [];
  const fullQuestions: QuizQuestion[] = [];
  const keyAnswers: FirestoreQuizKeyDoc['answers'] = {};
  let totalPoints = 0;

  for (let idx = 0; idx < rawQuestions.length; idx += 1) {
    const q = rawQuestions[idx];
    const qId = (q.id && /^[a-zA-Z0-9_-]{1,64}$/.test(q.id) ? q.id : `q_${idx + 1}`).trim();
    const points = Math.max(1, Number(q.points) || 10);
    totalPoints += points;
    const cleanOptions = q.options.map((o, oIdx) => ({
      id: (o.id || `opt_${oIdx + 1}`).trim(),
      text: o.text.trim(),
    }));
    const cleanImageUrl =
      typeof q.imageUrl === 'string' && q.imageUrl.trim() ? q.imageUrl.trim() : undefined;
    const cleanExplanation = q.explanation?.trim() || undefined;
    const answerHash = await computeQuestionAnswerHash(quizId, qId, q.correctOptionId);

    publicQuestions.push({
      id: qId,
      order: idx + 1,
      type: q.type,
      prompt: q.prompt.trim(),
      ...(cleanImageUrl ? { imageUrl: cleanImageUrl } : {}),
      options: cleanOptions,
      points,
      answerHash,
    });

    fullQuestions.push({
      id: qId,
      order: idx + 1,
      type: q.type,
      prompt: q.prompt.trim(),
      ...(cleanImageUrl ? { imageUrl: cleanImageUrl } : {}),
      options: cleanOptions,
      points,
      correctOptionId: q.correctOptionId,
      ...(cleanExplanation ? { explanation: cleanExplanation } : {}),
      answerHash,
    });

    keyAnswers[qId] = {
      correctOptionId: q.correctOptionId,
      ...(cleanExplanation ? { explanation: cleanExplanation } : {}),
    };
  }

  const quizRef = doc(db, 'quizzes', quizId);
  const keyRef = doc(db, 'quizKeys', quizId);

  let existingSnap;
  try {
    existingSnap = await getDocFromServer(quizRef);
  } catch (error) {
    try {
      existingSnap = await getDoc(quizRef);
    } catch {
      handleFirestoreError(error, OperationType.GET, `quizzes/${quizId}`);
    }
  }

  const title = (payload.title || '').trim().slice(0, 180);
  const description = (payload.description || '').trim().slice(0, 1000);
  const instructions = (payload.instructions || '').trim().slice(0, 1500);
  const targetClass = (payload.targetClass || 'Semua Tingkat').trim().slice(0, 60);
  const status = payload.status || 'draft';
  const isPublished = status === 'published';
  const timeLimitMinutes = Math.max(0, Number(payload.timeLimitMinutes) || 0);
  const maxAttempts = Math.max(0, Number(payload.maxAttempts) || 0);
  const startAtIso = (payload.startAtIso || '').trim().slice(0, 50);
  const endAtIso = (payload.endAtIso || '').trim().slice(0, 50);

  const batch = writeBatch(db);

  if (existingSnap.exists()) {
    const updatePayload: Record<string, unknown> = {
      title,
      description: description ? description : deleteField(),
      instructions: instructions ? instructions : deleteField(),
      targetClass: targetClass ? targetClass : deleteField(),
      status,
      isPublished,
      timeLimitMinutes,
      maxAttempts,
      startAtIso: startAtIso ? startAtIso : deleteField(),
      endAtIso: endAtIso ? endAtIso : deleteField(),
      questionsCount: publicQuestions.length,
      totalPoints,
      questions: publicQuestions,
      updatedAt: serverTimestamp(),
    };
    batch.update(quizRef, updatePayload);
  } else {
    const createPayload: Record<string, unknown> = {
      title,
      status,
      isPublished,
      timeLimitMinutes,
      maxAttempts,
      questionsCount: publicQuestions.length,
      totalPoints,
      questions: publicQuestions,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };
    if (description) createPayload.description = description;
    if (instructions) createPayload.instructions = instructions;
    if (targetClass) createPayload.targetClass = targetClass;
    if (startAtIso) createPayload.startAtIso = startAtIso;
    if (endAtIso) createPayload.endAtIso = endAtIso;
    batch.set(quizRef, createPayload);
  }

  batch.set(keyRef, {
    quizId,
    questionCount: publicQuestions.length,
    answers: keyAnswers,
    updatedAt: serverTimestamp(),
  });

  try {
    await batch.commit();
  } catch (error) {
    handleFirestoreError(
      error,
      existingSnap.exists() ? OperationType.UPDATE : OperationType.CREATE,
      `quizzes/${quizId}`
    );
  }

  // Verify immediately against Firestore server so UI never shows ephemeral/cached-only state
  try {
    const verifiedSnap = await getDocFromServer(quizRef);
    if (!verifiedSnap.exists()) {
      throw new Error(
        'Kuis tidak terkonfirmasi di server Firestore setelah disimpan. Pastikan aturan firestore.rules sudah dipublish pada database yang benar.'
      );
    }
  } catch (verifyErr) {
    if (verifyErr instanceof Error && verifyErr.message.includes('terkonfirmasi')) {
      throw verifyErr;
    }
    handleFirestoreError(verifyErr, OperationType.GET, `quizzes/${quizId}`);
  }

  const nowIso = new Date().toISOString();
  const savedQuiz: QuizDefinition = {
    id: quizId,
    title,
    description,
    instructions,
    targetClass,
    status,
    timeLimitMinutes,
    maxAttempts,
    ...(startAtIso ? { startAtIso } : {}),
    ...(endAtIso ? { endAtIso } : {}),
    questions: fullQuestions,
    createdAtIso: timestampToIso(existingSnap.exists() ? existingSnap.data()?.createdAt : null, nowIso),
    updatedAtIso: nowIso,
  };

  return { ok: true, quiz: savedQuiz };
}

export async function adminUpdateQuizStatusInFirestore(
  quizId: string,
  status: 'draft' | 'published' | 'disabled'
): Promise<void> {
  const quizRef = doc(db, 'quizzes', quizId);
  try {
    await updateDoc(quizRef, {
      status,
      isPublished: status === 'published',
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `quizzes/${quizId}`);
  }
}

export async function adminDeleteQuizFromFirestore(quizId: string): Promise<void> {
  try {
    const attemptsSnap = await getDocs(
      query(collection(db, 'quizAttempts'), where('quizId', '==', quizId))
    );
    const docsToDelete = [
      doc(db, 'quizzes', quizId),
      doc(db, 'quizKeys', quizId),
      ...attemptsSnap.docs.map((d) => doc(db, 'quizAttempts', d.id)),
    ];

    for (let i = 0; i < docsToDelete.length; i += 400) {
      const batch = writeBatch(db);
      docsToDelete.slice(i, i + 400).forEach((ref) => batch.delete(ref));
      await batch.commit();
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, `quizzes/${quizId}`);
  }
}

export async function adminDeleteQuizAttemptFromFirestore(attemptId: string): Promise<void> {
  try {
    await deleteDoc(doc(db, 'quizAttempts', attemptId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, `quizAttempts/${attemptId}`);
  }
}

export async function fetchPublishedQuizzesFromFirestore(): Promise<PublicQuizListItem[]> {
  try {
    const snap = await getDocsFromServer(
      query(collection(db, 'quizzes'), where('isPublished', '==', true))
    );
    return snap.docs
      .map((d) => {
        const merged = mergeQuizWithKeys(d.id, d.data() as FirestoreQuizDoc);
        return {
          ...toStudentSafeQuiz(merged),
          availability: checkQuizAvailability(merged),
        };
      })
      .sort((a, b) => new Date(b.updatedAtIso).getTime() - new Date(a.updatedAtIso).getTime());
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, 'quizzes');
  }
}

export async function fetchPublishedQuizByIdFromFirestore(quizId: string): Promise<{
  quiz: StudentSafeQuiz | null;
  availability: ReturnType<typeof checkQuizAvailability> | null;
}> {
  try {
    const snap = await getDocFromServer(doc(db, 'quizzes', quizId));
    if (!snap.exists()) {
      return { quiz: null, availability: null };
    }
    const raw = snap.data() as FirestoreQuizDoc;
    if (!raw.isPublished || raw.status !== 'published') {
      return { quiz: null, availability: null };
    }
    const merged = mergeQuizWithKeys(snap.id, raw);
    return {
      quiz: toStudentSafeQuiz(merged),
      availability: checkQuizAvailability(merged),
    };
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, `quizzes/${quizId}`);
  }
}

export async function saveStudentQuizAttemptToFirestore(input: {
  id?: string;
  attemptId?: string;
  quizId: string;
  quizTitle: string;
  studentName: string;
  studentClass: string;
  parentWhatsapp?: string;
  answers: Record<string, string>;
  score: number;
  maxScore: number;
  percentage: number;
  correctCount: number;
  wrongCount: number;
  unansweredCount: number;
  durationSeconds: number;
  startedAtIso: string;
  submittedAtIso: string;
  gradedDetails: GradedQuestionDetail[];
}): Promise<string> {
  const clean = sanitizeQuizAttemptForFirestore(input);

  const payload: Record<string, unknown> = {
    quizId: clean.quizId,
    quizTitle: clean.quizTitle,
    studentName: clean.studentName,
    studentClass: clean.studentClass,
    answers: clean.answers,
    score: clean.score,
    maxScore: clean.maxScore,
    percentage: clean.percentage,
    correctCount: clean.correctCount,
    wrongCount: clean.wrongCount,
    unansweredCount: clean.unansweredCount,
    durationSeconds: clean.durationSeconds,
    startedAtIso: clean.startedAtIso,
    submittedAtIso: clean.submittedAtIso,
    gradedDetails: clean.gradedDetails,
    createdAt: serverTimestamp(),
  };

  if (clean.parentWhatsapp) {
    payload.parentWhatsapp = clean.parentWhatsapp;
  }

  try {
    await setDoc(doc(db, 'quizAttempts', clean.attemptId), payload);
    return clean.attemptId;
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, `quizAttempts/${clean.attemptId}`);
  }
}
