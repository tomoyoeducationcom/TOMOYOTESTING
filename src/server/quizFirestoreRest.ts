import firebaseConfig from '../../firebase-applet-config.json';
import {
  type QuizAttemptRecord,
  type QuizDefinition,
  type QuizQuestion,
  sanitizeQuizAttemptForFirestore,
} from '../lib/quizAndWaDomain';

interface FirestoreRestValue {
  stringValue?: string;
  integerValue?: string;
  doubleValue?: number;
  booleanValue?: boolean;
  timestampValue?: string;
  nullValue?: null;
  arrayValue?: { values?: FirestoreRestValue[] };
  mapValue?: { fields?: Record<string, FirestoreRestValue> };
}

interface FirestoreRestDoc {
  name?: string;
  fields?: Record<string, FirestoreRestValue>;
  createTime?: string;
  updateTime?: string;
}

function decodeValue(val: FirestoreRestValue | undefined): unknown {
  if (!val) return undefined;
  if ('stringValue' in val) return val.stringValue;
  if ('booleanValue' in val) return val.booleanValue;
  if ('integerValue' in val) return Number(val.integerValue);
  if ('doubleValue' in val) return Number(val.doubleValue);
  if ('timestampValue' in val) return val.timestampValue;
  if ('nullValue' in val) return null;
  if ('arrayValue' in val) {
    return (val.arrayValue?.values || []).map((v) => decodeValue(v));
  }
  if ('mapValue' in val) {
    const out: Record<string, unknown> = {};
    const fields = val.mapValue?.fields || {};
    for (const [k, v] of Object.entries(fields)) {
      out[k] = decodeValue(v);
    }
    return out;
  }
  return undefined;
}

function decodeQuizDoc(doc: FirestoreRestDoc): QuizDefinition | null {
  if (!doc.name || !doc.fields) return null;
  const id = doc.name.split('/').pop() || '';
  if (!id) return null;

  const decoded: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(doc.fields)) {
    decoded[k] = decodeValue(v);
  }

  const rawQuestions = Array.isArray(decoded.questions) ? decoded.questions : [];
  const questions: QuizQuestion[] = rawQuestions.map((item, idx) => {
    const q = (item && typeof item === 'object' ? item : {}) as Record<string, unknown>;
    const rawOpts = Array.isArray(q.options) ? q.options : [];
    return {
      id: typeof q.id === 'string' && q.id ? q.id : `q_${idx + 1}`,
      order: typeof q.order === 'number' ? q.order : idx + 1,
      type: q.type === 'true_false' ? 'true_false' : 'multiple_choice',
      prompt: typeof q.prompt === 'string' ? q.prompt : '',
      ...(typeof q.imageUrl === 'string' && q.imageUrl ? { imageUrl: q.imageUrl } : {}),
      options: rawOpts.map((opt, oIdx) => {
        const o = (opt && typeof opt === 'object' ? opt : {}) as Record<string, unknown>;
        return {
          id: typeof o.id === 'string' ? o.id : `opt_${oIdx + 1}`,
          text: typeof o.text === 'string' ? o.text : '',
        };
      }),
      points: typeof q.points === 'number' ? Math.max(1, q.points) : 10,
      correctOptionId: '',
      ...(typeof q.answerHash === 'string' ? { answerHash: q.answerHash } : {}),
    };
  });

  const nowIso = new Date().toISOString();
  return {
    id,
    title: typeof decoded.title === 'string' ? decoded.title : '',
    description: typeof decoded.description === 'string' ? decoded.description : '',
    instructions: typeof decoded.instructions === 'string' ? decoded.instructions : '',
    targetClass: typeof decoded.targetClass === 'string' ? decoded.targetClass : 'Semua Tingkat',
    status:
      decoded.status === 'published' || decoded.status === 'disabled' ? decoded.status : 'draft',
    timeLimitMinutes: typeof decoded.timeLimitMinutes === 'number' ? decoded.timeLimitMinutes : 0,
    maxAttempts: typeof decoded.maxAttempts === 'number' ? decoded.maxAttempts : 0,
    ...(typeof decoded.startAtIso === 'string' && decoded.startAtIso
      ? { startAtIso: decoded.startAtIso }
      : {}),
    ...(typeof decoded.endAtIso === 'string' && decoded.endAtIso
      ? { endAtIso: decoded.endAtIso }
      : {}),
    questions,
    createdAtIso:
      typeof decoded.createdAt === 'string' ? decoded.createdAt : doc.createTime || nowIso,
    updatedAtIso:
      typeof decoded.updatedAt === 'string' ? decoded.updatedAt : doc.updateTime || nowIso,
  };
}

function getFirestoreBaseUrl(): string | null {
  const projectId = firebaseConfig.projectId;
  const dbId = firebaseConfig.firestoreDatabaseId || '(default)';
  if (!projectId || projectId === 'remixed-project-id') return null;
  return `https://firestore.googleapis.com/v1/projects/${encodeURIComponent(
    projectId
  )}/databases/${encodeURIComponent(dbId)}/documents`;
}

export async function fetchPublishedQuizFromFirestoreRest(
  quizId: string
): Promise<QuizDefinition | null> {
  const baseUrl = getFirestoreBaseUrl();
  if (!baseUrl) return null;
  try {
    const res = await fetch(`${baseUrl}/quizzes/${encodeURIComponent(quizId)}`, {
      cache: 'no-store',
    });
    if (!res.ok) return null;
    const doc = (await res.json()) as FirestoreRestDoc;
    const quiz = decodeQuizDoc(doc);
    if (!quiz || quiz.status !== 'published') return null;
    return quiz;
  } catch {
    return null;
  }
}

export async function listPublishedQuizzesFromFirestoreRest(): Promise<QuizDefinition[]> {
  const baseUrl = getFirestoreBaseUrl();
  if (!baseUrl) return [];
  try {
    const res = await fetch(`${baseUrl}:runQuery`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        structuredQuery: {
          from: [{ collectionId: 'quizzes' }],
          where: {
            fieldFilter: {
              field: { fieldPath: 'isPublished' },
              op: 'EQUAL',
              value: { booleanValue: true },
            },
          },
        },
      }),
      cache: 'no-store',
    });
    if (!res.ok) return [];
    const rows = (await res.json()) as Array<{ document?: FirestoreRestDoc }>;
    if (!Array.isArray(rows)) return [];
    return rows
      .map((r) => (r.document ? decodeQuizDoc(r.document) : null))
      .filter((q): q is QuizDefinition => Boolean(q && q.status === 'published'))
      .sort((a, b) => new Date(b.updatedAtIso).getTime() - new Date(a.updatedAtIso).getTime());
  } catch {
    return [];
  }
}

export function encodeFirestoreRestValue(val: unknown): FirestoreRestValue {
  if (val === null || val === undefined) return { nullValue: null };
  if (typeof val === 'boolean') return { booleanValue: val };
  if (typeof val === 'number') {
    if (!Number.isFinite(val)) return { integerValue: '0' };
    return Number.isInteger(val) ? { integerValue: String(val) } : { doubleValue: val };
  }
  if (typeof val === 'string') return { stringValue: val };
  if (Array.isArray(val)) {
    return {
      arrayValue: {
        values: val.map((item) => encodeFirestoreRestValue(item)),
      },
    };
  }
  if (typeof val === 'object') {
    const fields: Record<string, FirestoreRestValue> = {};
    for (const [k, v] of Object.entries(val as Record<string, unknown>)) {
      if (v !== undefined) {
        fields[k] = encodeFirestoreRestValue(v);
      }
    }
    return { mapValue: { fields } };
  }
  return { stringValue: String(val) };
}

export function buildFirestoreAttemptCommitPayload(
  record: Partial<QuizAttemptRecord> & { attemptId?: string }
): {
  attemptId: string;
  commitUrl: string;
  body: {
    writes: Array<{
      currentDocument: { exists: false };
      update: { name: string; fields: Record<string, FirestoreRestValue> };
      updateTransforms: Array<{ fieldPath: string; setToServerValue: 'REQUEST_TIME' }>;
    }>;
  };
} | null {
  const projectId = firebaseConfig.projectId;
  const dbId = firebaseConfig.firestoreDatabaseId || '(default)';
  if (!projectId || projectId === 'remixed-project-id') return null;

  const clean = sanitizeQuizAttemptForFirestore(record);
  const fieldsObj: Record<string, unknown> = {
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
  };
  if (clean.parentWhatsapp) {
    fieldsObj.parentWhatsapp = clean.parentWhatsapp;
  }

  const encodedFields: Record<string, FirestoreRestValue> = {};
  for (const [k, v] of Object.entries(fieldsObj)) {
    encodedFields[k] = encodeFirestoreRestValue(v);
  }

  const docName = `projects/${projectId}/databases/${dbId}/documents/quizAttempts/${clean.attemptId}`;
  const commitUrl = `https://firestore.googleapis.com/v1/projects/${encodeURIComponent(
    projectId
  )}/databases/${encodeURIComponent(dbId)}/documents:commit`;

  return {
    attemptId: clean.attemptId,
    commitUrl,
    body: {
      writes: [
        {
          currentDocument: { exists: false },
          update: {
            name: docName,
            fields: encodedFields,
          },
          updateTransforms: [
            {
              fieldPath: 'createdAt',
              setToServerValue: 'REQUEST_TIME',
            },
          ],
        },
      ],
    },
  };
}

export async function saveQuizAttemptToFirestoreRest(
  record: Partial<QuizAttemptRecord> & { attemptId?: string }
): Promise<{ ok: boolean; attemptId?: string; alreadyExists?: boolean; error?: string }> {
  const built = buildFirestoreAttemptCommitPayload(record);
  if (!built) {
    return { ok: false, error: 'Konfigurasi project Firestore belum tersedia.' };
  }

  try {
    const res = await fetch(built.commitUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(built.body),
      cache: 'no-store',
    });
    if (res.ok) {
      return { ok: true, attemptId: built.attemptId };
    }
    const errText = await res.text().catch(() => '');
    if (res.status === 409 || /ALREADY_EXISTS|already exists/i.test(errText)) {
      return { ok: true, attemptId: built.attemptId, alreadyExists: true };
    }
    return {
      ok: false,
      attemptId: built.attemptId,
      error: `Firestore REST commit HTTP ${res.status}: ${errText.slice(0, 250)}`,
    };
  } catch (err) {
    return {
      ok: false,
      attemptId: built.attemptId,
      error: err instanceof Error ? err.message : 'Gagal menghubungi Firestore REST API.',
    };
  }
}
