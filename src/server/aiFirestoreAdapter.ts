import firebaseConfig from '../../firebase-applet-config.json';
import {
  type AnnouncementItem,
  type BranchLocation,
  INITIAL_ABOUT,
  INITIAL_BRANCHES,
  INITIAL_CONTACT,
  INITIAL_FOUNDER,
  INITIAL_PACKAGES,
  INITIAL_TEACHERS,
  type LearningPackage,
  type PaymentRecord,
  type ScheduleItem,
  type SiteContentSection,
  type StudentRecord,
  type TeacherProfile,
  getPackagePriceDisplayForBranch,
  getPackagePriceNoteForBranch,
} from '../lib/domain';
import {
  type AiChatbotSettings,
  type AiInstructionConfig,
  type AiKnowledgeItem,
  type AiUsageDailyRecord,
} from '../lib/aiDomain';
import { encodeFirestoreRestValue } from './quizFirestoreRest';

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

function getFirestoreBaseUrl(): string | null {
  const projectId = firebaseConfig.projectId;
  const dbId = firebaseConfig.firestoreDatabaseId || '(default)';
  if (!projectId || projectId === 'remixed-project-id') return null;
  return `https://firestore.googleapis.com/v1/projects/${encodeURIComponent(
    projectId
  )}/databases/${encodeURIComponent(dbId)}/documents`;
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

function decodeDoc<T>(doc: FirestoreRestDoc): (T & { id: string; _createTime?: string; _updateTime?: string }) | null {
  if (!doc.name || !doc.fields) return null;
  const id = doc.name.split('/').pop() || '';
  if (!id) return null;
  const out: Record<string, unknown> = { id };
  for (const [k, v] of Object.entries(doc.fields)) {
    out[k] = decodeValue(v);
  }
  if (doc.createTime) out._createTime = doc.createTime;
  if (doc.updateTime) out._updateTime = doc.updateTime;
  return out as T & { id: string; _createTime?: string; _updateTime?: string };
}

async function listCollectionDocs(params: {
  collectionName: string;
  idToken?: string;
  pageSize?: number;
  maxPages?: number;
}): Promise<{ ok: boolean; docs: FirestoreRestDoc[]; error?: string }> {
  const baseUrl = getFirestoreBaseUrl();
  if (!baseUrl) {
    return { ok: false, docs: [], error: 'Konfigurasi project Firebase tidak tersedia.' };
  }

  const pageSize = params.pageSize ?? 300;
  const maxPages = params.maxPages ?? 5;
  const allDocs: FirestoreRestDoc[] = [];
  let pageToken = '';

  const headers: Record<string, string> = {};
  if (params.idToken) {
    headers.Authorization = `Bearer ${params.idToken}`;
  }

  try {
    for (let page = 0; page < maxPages; page++) {
      const url = new URL(`${baseUrl}/${encodeURIComponent(params.collectionName)}`);
      url.searchParams.set('pageSize', String(pageSize));
      if (pageToken) {
        url.searchParams.set('pageToken', pageToken);
      }
      const res = await fetch(url.toString(), {
        headers,
        signal: AbortSignal.timeout(8000),
        cache: 'no-store',
      });
      if (!res.ok) {
        const text = await res.text().catch(() => '');
        return {
          ok: false,
          docs: [],
          error: `Firestore HTTP ${res.status}: ${text.slice(0, 180)}`,
        };
      }
      const data = (await res.json()) as {
        documents?: FirestoreRestDoc[];
        nextPageToken?: string;
      };
      if (Array.isArray(data.documents)) {
        allDocs.push(...data.documents);
      }
      if (!data.nextPageToken) break;
      pageToken = data.nextPageToken;
    }
    return { ok: true, docs: allDocs };
  } catch (err) {
    return {
      ok: false,
      docs: [],
      error: err instanceof Error ? err.message : 'Gagal terhubung ke Firestore.',
    };
  }
}

async function runPublicPublishedQuery(collectionName: string): Promise<FirestoreRestDoc[]> {
  const baseUrl = getFirestoreBaseUrl();
  if (!baseUrl) return [];
  try {
    const res = await fetch(`${baseUrl}:runQuery`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        structuredQuery: {
          from: [{ collectionId: collectionName }],
          where: {
            fieldFilter: {
              field: { fieldPath: 'isPublished' },
              op: 'EQUAL',
              value: { booleanValue: true },
            },
          },
        },
      }),
      signal: AbortSignal.timeout(8000),
      cache: 'no-store',
    });
    if (!res.ok) return [];
    const rows = (await res.json()) as Array<{ document?: FirestoreRestDoc }>;
    if (!Array.isArray(rows)) return [];
    return rows.map((r) => r.document).filter((d): d is FirestoreRestDoc => Boolean(d));
  } catch {
    return [];
  }
}

export async function fetchPublicProgramsInfo(packageId?: string): Promise<{
  source: 'firebase' | 'default_fallback';
  packages: Array<{
    id: string;
    title: string;
    levelRange: string;
    programType: string;
    subjects: string[];
    description?: string;
    priceIndramayuKotaPusat: string | null;
    pricePusatNote?: string;
    priceTerisiCabang: string | null;
    priceCabangNote?: string;
  }>;
}> {
  const docs = await runPublicPublishedQuery('packages');
  const parsed = docs
    .map((d) => decodeDoc<Omit<LearningPackage, 'id'>>(d))
    .filter((d): d is LearningPackage => Boolean(d && d.isPublished))
    .sort((a, b) => (a.order || 0) - (b.order || 0));

  const sourceList = parsed.length > 0 ? parsed : INITIAL_PACKAGES;
  const filtered = packageId
    ? sourceList.filter(
        (p) =>
          p.id.toLowerCase() === packageId.toLowerCase() ||
          p.slug.toLowerCase() === packageId.toLowerCase()
      )
    : sourceList;

  return {
    source: parsed.length > 0 ? 'firebase' : 'default_fallback',
    packages: (filtered.length > 0 ? filtered : sourceList).map((pkg) => ({
      id: pkg.id,
      title: pkg.title,
      levelRange: pkg.levelRange,
      programType: pkg.programType,
      subjects: Array.isArray(pkg.subjects) ? pkg.subjects : [],
      ...(pkg.description ? { description: pkg.description } : {}),
      priceIndramayuKotaPusat: getPackagePriceDisplayForBranch(pkg, 'indramayu-kota'),
      pricePusatNote: getPackagePriceNoteForBranch(pkg, 'indramayu-kota'),
      priceTerisiCabang: getPackagePriceDisplayForBranch(pkg, 'terisi'),
      priceCabangNote: getPackagePriceNoteForBranch(pkg, 'terisi'),
    })),
  };
}

export async function fetchPublicSchedulesAndBranches(filters?: {
  branchId?: string;
  packageId?: string;
}) {
  const [schedDocs, branchDocs, announcementDocs] = await Promise.all([
    runPublicPublishedQuery('schedules'),
    runPublicPublishedQuery('branches'),
    runPublicPublishedQuery('announcements'),
  ]);

  const parsedBranches = branchDocs
    .map((d) => decodeDoc<Omit<BranchLocation, 'id'>>(d))
    .filter((b): b is BranchLocation => Boolean(b && b.isPublished))
    .sort((a, b) => (a.order || 0) - (b.order || 0));

  const branches = parsedBranches.length > 0 ? parsedBranches : INITIAL_BRANCHES;

  const parsedSchedules = schedDocs
    .map((d) => decodeDoc<Omit<ScheduleItem, 'id'>>(d))
    .filter((s): s is ScheduleItem => Boolean(s && s.isPublished));

  const filteredSchedules = parsedSchedules.filter((s) => {
    if (filters?.branchId && s.branchId && s.branchId !== filters.branchId) return false;
    if (filters?.packageId && s.packageId && s.packageId !== filters.packageId) return false;
    return true;
  });

  const announcements = announcementDocs
    .map((d) => decodeDoc<Omit<AnnouncementItem, 'id'>>(d))
    .filter((a): a is AnnouncementItem => Boolean(a && a.isPublished))
    .slice(0, 8)
    .map((a) => ({
      id: a.id,
      title: a.title,
      dateLabel: a.dateLabel || '',
      content: a.content,
    }));

  return {
    branches: branches.map((b) => ({
      id: b.id,
      slug: b.slug,
      name: b.name,
      roleLabel: b.roleLabel,
      mapsUrl: b.mapsUrl,
    })),
    schedules: filteredSchedules.map((s) => ({
      id: s.id,
      title: s.title,
      packageId: s.packageId || 'Umum',
      branchId: s.branchId || 'Semua Cabang',
      dayTime: s.dayTime,
      notes: s.notes || '',
    })),
    announcements,
  };
}

export async function fetchPublicInstitutionProfile() {
  const [siteDocs, teacherDocs, branchDocs] = await Promise.all([
    runPublicPublishedQuery('siteContent'),
    runPublicPublishedQuery('teachers'),
    runPublicPublishedQuery('branches'),
  ]);

  const siteMap = new Map<string, SiteContentSection>();
  for (const d of siteDocs) {
    const parsed = decodeDoc<Omit<SiteContentSection, 'id'>>(d);
    if (parsed) siteMap.set(parsed.id, parsed);
  }

  const about = siteMap.get('about') || INITIAL_ABOUT;
  const founder = siteMap.get('founder') || INITIAL_FOUNDER;
  const contact = siteMap.get('contact') || INITIAL_CONTACT;

  const teachersParsed = teacherDocs
    .map((d) => decodeDoc<Omit<TeacherProfile, 'id'>>(d))
    .filter((t): t is TeacherProfile => Boolean(t && t.isPublished))
    .sort((a, b) => (a.order || 0) - (b.order || 0));
  const teachers = (teachersParsed.length > 0 ? teachersParsed : INITIAL_TEACHERS).map((t) => ({
    name: t.name,
    description: t.description || '',
  }));

  const branchesParsed = branchDocs
    .map((d) => decodeDoc<Omit<BranchLocation, 'id'>>(d))
    .filter((b): b is BranchLocation => Boolean(b && b.isPublished))
    .sort((a, b) => (a.order || 0) - (b.order || 0));
  const branches = (branchesParsed.length > 0 ? branchesParsed : INITIAL_BRANCHES).map((b) => ({
    name: b.name,
    roleLabel: b.roleLabel,
    mapsUrl: b.mapsUrl,
  }));

  return {
    about: {
      title: about.title || INITIAL_ABOUT.title,
      subtitle: about.subtitle || INITIAL_ABOUT.subtitle,
      body: about.body || INITIAL_ABOUT.body,
      vision: about.vision || '',
      mission: about.mission || '',
    },
    founder: {
      name: founder.founderName || INITIAL_FOUNDER.founderName,
      role: founder.founderRole || INITIAL_FOUNDER.founderRole,
      bio: founder.founderBio || '',
    },
    contact: {
      email: contact.email || INITIAL_CONTACT.email,
      whatsappDisplay: contact.whatsappDisplay || INITIAL_CONTACT.whatsappDisplay,
      whatsappUrl: contact.whatsappUrl || INITIAL_CONTACT.whatsappUrl,
      instagramUrl: contact.instagramUrl || INITIAL_CONTACT.instagramUrl,
      facebookUrl: contact.facebookUrl || INITIAL_CONTACT.facebookUrl,
    },
    teachersCount: teachers.length,
    teachers,
    branches,
  };
}

export async function fetchAdminStudentsFromFirestore(idToken: string): Promise<{
  ok: boolean;
  students: StudentRecord[];
  error?: string;
}> {
  const res = await listCollectionDocs({
    collectionName: 'students',
    idToken,
    pageSize: 300,
    maxPages: 10,
  });
  if (!res.ok) {
    return { ok: false, students: [], error: res.error };
  }
  const students = res.docs
    .map((d) => decodeDoc<Omit<StudentRecord, 'id'>>(d))
    .filter((s): s is StudentRecord & { _createTime?: string; _updateTime?: string } => Boolean(s))
    .map((s) => ({
      ...s,
      createdAt: s.createdAt || s._createTime,
      updatedAt: s.updatedAt || s._updateTime,
    }));
  return { ok: true, students };
}

export async function fetchAdminPaymentsFromFirestore(idToken: string): Promise<{
  ok: boolean;
  payments: PaymentRecord[];
  error?: string;
}> {
  const res = await listCollectionDocs({
    collectionName: 'payments',
    idToken,
    pageSize: 300,
    maxPages: 10,
  });
  if (!res.ok) {
    return { ok: false, payments: [], error: res.error };
  }
  const payments = res.docs
    .map((d) => decodeDoc<Omit<PaymentRecord, 'id'>>(d))
    .filter((p): p is PaymentRecord & { _createTime?: string; _updateTime?: string } => Boolean(p))
    .map((p) => ({
      ...p,
      createdAt: p.createdAt || p._createTime,
    }));
  return { ok: true, payments };
}

// ==================== OPTIONAL FIRESTORE REST MIRROR FOR AI COLLECTIONS ====================

export async function fetchActiveKnowledgeFromFirestoreRest(): Promise<AiKnowledgeItem[] | null> {
  const baseUrl = getFirestoreBaseUrl();
  if (!baseUrl) return null;
  try {
    const res = await fetch(`${baseUrl}:runQuery`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        structuredQuery: {
          from: [{ collectionId: 'aiKnowledge' }],
          where: {
            fieldFilter: {
              field: { fieldPath: 'isActive' },
              op: 'EQUAL',
              value: { booleanValue: true },
            },
          },
        },
      }),
      signal: AbortSignal.timeout(5000),
      cache: 'no-store',
    });
    if (!res.ok) return null;
    const rows = (await res.json()) as Array<{ document?: FirestoreRestDoc }>;
    if (!Array.isArray(rows)) return null;
    return rows
      .map((r) =>
        r.document
          ? decodeDoc<{
              title?: string;
              category?: string;
              content?: string;
              isActive?: boolean;
              createdAt?: string;
              updatedAt?: string;
              _createTime?: string;
              _updateTime?: string;
            }>(r.document)
          : null
      )
      .filter((d): d is NonNullable<typeof d> => Boolean(d && d.title && d.content))
      .map((d) => ({
        id: d.id,
        title: String(d.title),
        category: String(d.category || 'Informasi Tambahan'),
        content: String(d.content),
        isActive: Boolean(d.isActive),
        createdAtIso: String(d.createdAt || d._createTime || new Date().toISOString()),
        updatedAtIso: String(d.updatedAt || d._updateTime || new Date().toISOString()),
      }));
  } catch {
    return null;
  }
}

export async function fetchAllKnowledgeFromFirestoreRest(
  idToken: string
): Promise<AiKnowledgeItem[] | null> {
  const res = await listCollectionDocs({
    collectionName: 'aiKnowledge',
    idToken,
    pageSize: 300,
    maxPages: 3,
  });
  if (!res.ok) return null;
  return res.docs
    .map((doc) =>
      decodeDoc<{
        title?: string;
        category?: string;
        content?: string;
        isActive?: boolean;
        createdAt?: string;
        updatedAt?: string;
        _createTime?: string;
        _updateTime?: string;
      }>(doc)
    )
    .filter((d): d is NonNullable<typeof d> => Boolean(d && d.title && d.content))
    .map((d) => ({
      id: d.id,
      title: String(d.title),
      category: String(d.category || 'Informasi Tambahan'),
      content: String(d.content),
      isActive: Boolean(d.isActive),
      createdAtIso: String(d.createdAt || d._createTime || new Date().toISOString()),
      updatedAtIso: String(d.updatedAt || d._updateTime || new Date().toISOString()),
    }));
}

export async function syncKnowledgeToFirestoreRest(
  idToken: string,
  item: AiKnowledgeItem,
  isNew: boolean
): Promise<boolean> {
  const projectId = firebaseConfig.projectId;
  const dbId = firebaseConfig.firestoreDatabaseId || '(default)';
  if (!projectId || projectId === 'remixed-project-id') return false;

  const docName = `projects/${projectId}/databases/${dbId}/documents/aiKnowledge/${item.id}`;
  const commitUrl = `https://firestore.googleapis.com/v1/projects/${encodeURIComponent(
    projectId
  )}/databases/${encodeURIComponent(dbId)}/documents:commit`;

  const fields: Record<string, FirestoreRestValue> = {
    title: encodeFirestoreRestValue(item.title),
    category: encodeFirestoreRestValue(item.category),
    content: encodeFirestoreRestValue(item.content),
    isActive: encodeFirestoreRestValue(item.isActive),
  };

  const transforms: Array<{ fieldPath: string; setToServerValue: 'REQUEST_TIME' }> = [
    { fieldPath: 'updatedAt', setToServerValue: 'REQUEST_TIME' },
  ];
  if (isNew) {
    transforms.push({ fieldPath: 'createdAt', setToServerValue: 'REQUEST_TIME' });
  } else {
    fields.createdAt = { timestampValue: item.createdAtIso };
  }

  try {
    const res = await fetch(commitUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${idToken}`,
      },
      body: JSON.stringify({
        writes: [
          {
            update: { name: docName, fields },
            updateTransforms: transforms,
          },
        ],
      }),
      signal: AbortSignal.timeout(5000),
    });
    return res.ok;
  } catch {
    return false;
  }
}

export async function deleteKnowledgeFromFirestoreRest(
  idToken: string,
  itemId: string
): Promise<boolean> {
  const baseUrl = getFirestoreBaseUrl();
  if (!baseUrl) return false;
  try {
    const res = await fetch(`${baseUrl}/aiKnowledge/${encodeURIComponent(itemId)}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${idToken}` },
      signal: AbortSignal.timeout(5000),
    });
    return res.ok || res.status === 404;
  } catch {
    return false;
  }
}

export async function fetchChatbotSettingsFromFirestoreRest(): Promise<AiChatbotSettings | null> {
  const baseUrl = getFirestoreBaseUrl();
  if (!baseUrl) return null;
  try {
    const res = await fetch(`${baseUrl}/aiSettings/chatbot`, {
      signal: AbortSignal.timeout(4000),
      cache: 'no-store',
    });
    if (!res.ok) return null;
    const doc = (await res.json()) as FirestoreRestDoc;
    const decoded = decodeDoc<Partial<AiChatbotSettings> & { updatedAt?: string }>(doc);
    if (!decoded || typeof decoded.botName !== 'string') return null;
    return {
      enabled: Boolean(decoded.enabled),
      botName: decoded.botName,
      tagline: typeof decoded.tagline === 'string' ? decoded.tagline : '',
      description: typeof decoded.description === 'string' ? decoded.description : '',
      welcomeMessage: String(decoded.welcomeMessage || ''),
      suggestedQuestions: Array.isArray(decoded.suggestedQuestions)
        ? decoded.suggestedQuestions.map(String)
        : [],
      adminWhatsapp: String(decoded.adminWhatsapp || '+62 831-2190-2760'),
      publicEnabled: Boolean(decoded.publicEnabled),
      adminEnabled: Boolean(decoded.adminEnabled),
      allowPublicStudentCount: Boolean(decoded.allowPublicStudentCount),
      maxRequestsPerSession: Number(decoded.maxRequestsPerSession) || 20,
      maxInputLength: Number(decoded.maxInputLength) || 600,
      maxOutputTokens: Number(decoded.maxOutputTokens) || 900,
      dailyRequestLimit: Number(decoded.dailyRequestLimit) || 500,
      monthlyRequestLimit: Number(decoded.monthlyRequestLimit) || 10000,
      model: String(decoded.model || 'gpt-4o-mini'),
      updatedAtIso: String(decoded.updatedAt || new Date().toISOString()),
    };
  } catch {
    return null;
  }
}

export async function syncChatbotSettingsToFirestoreRest(
  idToken: string,
  settings: AiChatbotSettings
): Promise<boolean> {
  const projectId = firebaseConfig.projectId;
  const dbId = firebaseConfig.firestoreDatabaseId || '(default)';
  if (!projectId || projectId === 'remixed-project-id') return false;

  const docName = `projects/${projectId}/databases/${dbId}/documents/aiSettings/chatbot`;
  const commitUrl = `https://firestore.googleapis.com/v1/projects/${encodeURIComponent(
    projectId
  )}/databases/${encodeURIComponent(dbId)}/documents:commit`;

  const fields: Record<string, FirestoreRestValue> = {
    enabled: encodeFirestoreRestValue(settings.enabled),
    botName: encodeFirestoreRestValue(settings.botName),
    tagline: encodeFirestoreRestValue(settings.tagline),
    description: encodeFirestoreRestValue(settings.description),
    welcomeMessage: encodeFirestoreRestValue(settings.welcomeMessage),
    suggestedQuestions: encodeFirestoreRestValue(settings.suggestedQuestions),
    adminWhatsapp: encodeFirestoreRestValue(settings.adminWhatsapp),
    publicEnabled: encodeFirestoreRestValue(settings.publicEnabled),
    adminEnabled: encodeFirestoreRestValue(settings.adminEnabled),
    allowPublicStudentCount: encodeFirestoreRestValue(settings.allowPublicStudentCount),
    maxRequestsPerSession: encodeFirestoreRestValue(settings.maxRequestsPerSession),
    maxInputLength: encodeFirestoreRestValue(settings.maxInputLength),
    maxOutputTokens: encodeFirestoreRestValue(settings.maxOutputTokens),
    dailyRequestLimit: encodeFirestoreRestValue(settings.dailyRequestLimit),
    monthlyRequestLimit: encodeFirestoreRestValue(settings.monthlyRequestLimit),
    model: encodeFirestoreRestValue(settings.model),
  };

  try {
    const res = await fetch(commitUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${idToken}`,
      },
      body: JSON.stringify({
        writes: [
          {
            update: { name: docName, fields },
            updateTransforms: [{ fieldPath: 'updatedAt', setToServerValue: 'REQUEST_TIME' }],
          },
        ],
      }),
      signal: AbortSignal.timeout(5000),
    });
    return res.ok;
  } catch {
    return false;
  }
}

export async function fetchInstructionsFromFirestoreRest(
  idToken: string
): Promise<AiInstructionConfig | null> {
  const baseUrl = getFirestoreBaseUrl();
  if (!baseUrl) return null;
  try {
    const res = await fetch(`${baseUrl}/aiInstructions/default`, {
      headers: { Authorization: `Bearer ${idToken}` },
      signal: AbortSignal.timeout(4000),
      cache: 'no-store',
    });
    if (!res.ok) return null;
    const doc = (await res.json()) as FirestoreRestDoc;
    const decoded = decodeDoc<Partial<AiInstructionConfig> & { updatedAt?: string }>(doc);
    if (!decoded || typeof decoded.character !== 'string') return null;
    return {
      character: decoded.character,
      languageStyle: String(decoded.languageStyle || ''),
      extraRules: String(decoded.extraRules || ''),
      answerBounds: String(decoded.answerBounds || ''),
      unavailableBehavior: String(decoded.unavailableBehavior || ''),
      updatedAtIso: String(decoded.updatedAt || new Date().toISOString()),
    };
  } catch {
    return null;
  }
}

export async function syncInstructionsToFirestoreRest(
  idToken: string,
  instructions: AiInstructionConfig
): Promise<boolean> {
  const projectId = firebaseConfig.projectId;
  const dbId = firebaseConfig.firestoreDatabaseId || '(default)';
  if (!projectId || projectId === 'remixed-project-id') return false;

  const docName = `projects/${projectId}/databases/${dbId}/documents/aiInstructions/default`;
  const commitUrl = `https://firestore.googleapis.com/v1/projects/${encodeURIComponent(
    projectId
  )}/databases/${encodeURIComponent(dbId)}/documents:commit`;

  const fields: Record<string, FirestoreRestValue> = {
    character: encodeFirestoreRestValue(instructions.character),
    languageStyle: encodeFirestoreRestValue(instructions.languageStyle),
    extraRules: encodeFirestoreRestValue(instructions.extraRules),
    answerBounds: encodeFirestoreRestValue(instructions.answerBounds),
    unavailableBehavior: encodeFirestoreRestValue(instructions.unavailableBehavior),
  };

  try {
    const res = await fetch(commitUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${idToken}`,
      },
      body: JSON.stringify({
        writes: [
          {
            update: { name: docName, fields },
            updateTransforms: [{ fieldPath: 'updatedAt', setToServerValue: 'REQUEST_TIME' }],
          },
        ],
      }),
      signal: AbortSignal.timeout(5000),
    });
    return res.ok;
  } catch {
    return false;
  }
}

export async function syncDailyUsageToFirestoreRest(
  idToken: string,
  daily: AiUsageDailyRecord
): Promise<boolean> {
  const projectId = firebaseConfig.projectId;
  const dbId = firebaseConfig.firestoreDatabaseId || '(default)';
  if (!projectId || projectId === 'remixed-project-id') return false;

  const docName = `projects/${projectId}/databases/${dbId}/documents/aiUsageDaily/${daily.dateKey}`;
  const commitUrl = `https://firestore.googleapis.com/v1/projects/${encodeURIComponent(
    projectId
  )}/databases/${encodeURIComponent(dbId)}/documents:commit`;

  const fields: Record<string, FirestoreRestValue> = {
    dateKey: encodeFirestoreRestValue(daily.dateKey),
    totalRequests: encodeFirestoreRestValue(daily.totalRequests),
    publicRequests: encodeFirestoreRestValue(daily.publicRequests),
    adminRequests: encodeFirestoreRestValue(daily.adminRequests),
    failedRequests: encodeFirestoreRestValue(daily.failedRequests),
    inputTokens: encodeFirestoreRestValue(daily.inputTokens),
    outputTokens: encodeFirestoreRestValue(daily.outputTokens),
    estimatedCostUsd: encodeFirestoreRestValue(daily.estimatedCostUsd),
    sessionCount: encodeFirestoreRestValue(daily.sessionCount),
    model: encodeFirestoreRestValue(daily.model),
  };

  try {
    const res = await fetch(commitUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${idToken}`,
      },
      body: JSON.stringify({
        writes: [
          {
            update: { name: docName, fields },
            updateTransforms: [{ fieldPath: 'updatedAt', setToServerValue: 'REQUEST_TIME' }],
          },
        ],
      }),
      signal: AbortSignal.timeout(5000),
    });
    return res.ok;
  } catch {
    return false;
  }
}
