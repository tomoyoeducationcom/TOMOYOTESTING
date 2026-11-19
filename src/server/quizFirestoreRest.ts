import firebaseConfig from '../../firebase-applet-config.json';
import type { QuizDefinition, QuizQuestion } from '../lib/quizAndWaDomain';

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
