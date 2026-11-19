import { normalizeWhatsappPhone } from './domain';

export const CHATBOT_DEFAULT_NAME = 'TOMOYO ASISTEN';
export const CHATBOT_DEFAULT_TAGLINE = 'Your Smart Education Assistant';
export const CHATBOT_DEFAULT_DESCRIPTION = 'AI Assistant resmi TOMOYO EDUCATION.';
export const CHATBOT_DEFAULT_ADMIN_WHATSAPP_DISPLAY = '+62 831-2190-2760';
export const CHATBOT_DEFAULT_ADMIN_WHATSAPP_NUMBER = '6283121902760';

export const CHATBOT_DEFAULT_WELCOME_MESSAGE =
  'Halo! 👋 Selamat datang di TOMOYO EDUCATION.\nSaya TOMOYO ASISTEN, asisten virtual yang siap membantu kamu mendapatkan informasi tentang program belajar, kelas, pendaftaran, jadwal, dan informasi lainnya.\nAda yang ingin kamu tanyakan?';

export const CHATBOT_DEFAULT_SUGGESTED_QUESTIONS: string[] = [
  'Apa saja program belajar yang tersedia?',
  'Bagaimana cara mendaftar?',
  'Berapa biaya pendidikannya?',
  'Di mana lokasi TOMOYO EDUCATION?',
];

export const INITIAL_AI_KNOWLEDGE_CATEGORIES: string[] = [
  'Profil Lembaga',
  'Sejarah',
  'Visi dan Misi',
  'Program Pendidikan',
  'Tingkatan Kelas',
  'Biaya Pendidikan',
  'Jadwal',
  'Pendaftaran',
  'FAQ',
  'Informasi Tambahan',
];

export interface AiModelPricing {
  id: string;
  label: string;
  inputUsdPer1M: number;
  outputUsdPer1M: number;
  note: string;
}

/**
 * Official OpenAI API per-1M-token rates (USD) for supported economical models.
 * Pricing reference: OpenAI API Pricing (Standard tier).
 */
export const SUPPORTED_AI_MODELS: AiModelPricing[] = [
  {
    id: 'gpt-4o-mini',
    label: 'gpt-4o-mini (Cepat & Hemat)',
    inputUsdPer1M: 0.15,
    outputUsdPer1M: 0.6,
    note: '$0.15 / 1M input · $0.60 / 1M output',
  },
  {
    id: 'gpt-4.1-mini',
    label: 'gpt-4.1-mini (Seimbang)',
    inputUsdPer1M: 0.4,
    outputUsdPer1M: 1.6,
    note: '$0.40 / 1M input · $1.60 / 1M output',
  },
  {
    id: 'gpt-5-mini',
    label: 'gpt-5-mini (Penalaran Lanjut)',
    inputUsdPer1M: 0.25,
    outputUsdPer1M: 2.0,
    note: '$0.25 / 1M input · $2.00 / 1M output',
  },
];

export interface AiKnowledgeItem {
  id: string;
  title: string;
  category: string;
  content: string;
  isActive: boolean;
  createdAtIso: string;
  updatedAtIso: string;
}

export interface AiInstructionConfig {
  character: string;
  languageStyle: string;
  extraRules: string;
  answerBounds: string;
  unavailableBehavior: string;
  updatedAtIso: string;
}

export interface AiChatbotSettings {
  enabled: boolean;
  botName: string;
  tagline: string;
  description: string;
  welcomeMessage: string;
  suggestedQuestions: string[];
  adminWhatsapp: string;
  publicEnabled: boolean;
  adminEnabled: boolean;
  allowPublicStudentCount: boolean;
  maxRequestsPerSession: number;
  maxInputLength: number;
  maxOutputTokens: number;
  dailyRequestLimit: number;
  monthlyRequestLimit: number;
  model: string;
  updatedAtIso: string;
}

export interface PublicChatbotSettingsView {
  enabled: boolean;
  botName: string;
  tagline: string;
  description: string;
  welcomeMessage: string;
  suggestedQuestions: string[];
  adminWhatsappDisplay: string;
  adminWhatsappNumber: string;
  adminWhatsappUrl: string;
  publicEnabled: boolean;
  adminEnabled: boolean;
  maxRequestsPerSession: number;
  maxInputLength: number;
}

export interface AiUsageDailyRecord {
  dateKey: string; // YYYY-MM-DD (Asia/Jakarta)
  totalRequests: number;
  publicRequests: number;
  adminRequests: number;
  failedRequests: number;
  inputTokens: number;
  outputTokens: number;
  estimatedCostUsd: number;
  sessionCount: number;
  model: string;
  updatedAtIso: string;
}

export interface AiSessionStatSummary {
  sessionIdHash: string;
  mode: 'public' | 'admin';
  startedAtIso: string;
  lastActiveAtIso: string;
  turnCount: number;
  inputTokens: number;
  outputTokens: number;
  estimatedCostUsd: number;
  failedCount: number;
}

export const DEFAULT_AI_INSTRUCTIONS: AiInstructionConfig = {
  character:
    'Asisten virtual resmi TOMOYO PRIVAT & BIMBEL EDUCATION yang ramah, sopan, informatif, profesional, dan membantu orang tua, siswa, maupun admin.',
  languageStyle:
    'Bahasa Indonesia yang hangat, jelas, mudah dipahami, rapi menggunakan poin bila perlu, dan tidak terlalu kaku.',
  extraRules:
    'Selalu perkenalkan diri sebagai asisten virtual TOMOYO EDUCATION (bukan manusia). Gunakan hanya data resmi dari Knowledge Center dan hasil fungsi pembacaan data resmi.',
  answerBounds:
    'Fokus pada informasi lembaga, program belajar, kelas, biaya, jadwal, pendaftaran, lokasi cabang Indramayu Kota & Terisi, serta statistik resmi khusus mode admin.',
  unavailableBehavior:
    'Jika informasi belum tersedia di data resmi, sampaikan dengan jujur bahwa informasi belum tersedia dan tawarkan tombol Hubungi Admin WhatsApp.',
  updatedAtIso: new Date(0).toISOString(),
};

export function createDefaultAiSettings(): AiChatbotSettings {
  return {
    enabled: true,
    botName: CHATBOT_DEFAULT_NAME,
    tagline: CHATBOT_DEFAULT_TAGLINE,
    description: CHATBOT_DEFAULT_DESCRIPTION,
    welcomeMessage: CHATBOT_DEFAULT_WELCOME_MESSAGE,
    suggestedQuestions: [...CHATBOT_DEFAULT_SUGGESTED_QUESTIONS],
    adminWhatsapp: CHATBOT_DEFAULT_ADMIN_WHATSAPP_DISPLAY,
    publicEnabled: true,
    adminEnabled: true,
    allowPublicStudentCount: false,
    maxRequestsPerSession: 20,
    maxInputLength: 600,
    maxOutputTokens: 900,
    dailyRequestLimit: 500,
    monthlyRequestLimit: 10000,
    model: 'gpt-4o-mini',
    updatedAtIso: new Date(0).toISOString(),
  };
}

export function normalizeChatbotWhatsappNumber(raw?: string): string {
  const normalized = normalizeWhatsappPhone(raw || '');
  if (/^62\d{8,14}$/.test(normalized)) {
    return normalized;
  }
  return CHATBOT_DEFAULT_ADMIN_WHATSAPP_NUMBER;
}

export function buildChatbotWhatsappUrl(rawNumber?: string, prefillMessage?: string): string {
  const digits = normalizeChatbotWhatsappNumber(rawNumber);
  const base = `https://wa.me/${digits}`;
  if (prefillMessage && prefillMessage.trim()) {
    return `${base}?text=${encodeURIComponent(prefillMessage.trim().slice(0, 300))}`;
  }
  return base;
}

export function toPublicChatbotSettingsView(
  settings: AiChatbotSettings
): PublicChatbotSettingsView {
  const digits = normalizeChatbotWhatsappNumber(settings.adminWhatsapp);
  return {
    enabled: Boolean(settings.enabled),
    botName: settings.botName.trim() || CHATBOT_DEFAULT_NAME,
    tagline: settings.tagline.trim() || CHATBOT_DEFAULT_TAGLINE,
    description: settings.description.trim() || CHATBOT_DEFAULT_DESCRIPTION,
    welcomeMessage: settings.welcomeMessage.trim() || CHATBOT_DEFAULT_WELCOME_MESSAGE,
    suggestedQuestions:
      Array.isArray(settings.suggestedQuestions) && settings.suggestedQuestions.length > 0
        ? settings.suggestedQuestions.slice(0, 6)
        : [...CHATBOT_DEFAULT_SUGGESTED_QUESTIONS],
    adminWhatsappDisplay: settings.adminWhatsapp.trim() || CHATBOT_DEFAULT_ADMIN_WHATSAPP_DISPLAY,
    adminWhatsappNumber: digits,
    adminWhatsappUrl: buildChatbotWhatsappUrl(
      digits,
      'Halo Admin TOMOYO EDUCATION, saya membutuhkan informasi lebih lanjut.'
    ),
    publicEnabled: Boolean(settings.publicEnabled),
    adminEnabled: Boolean(settings.adminEnabled),
    maxRequestsPerSession: settings.maxRequestsPerSession,
    maxInputLength: settings.maxInputLength,
  };
}

export function estimateOpenAiCostUsd(
  model: string,
  inputTokens: number,
  outputTokens: number
): number {
  const found =
    SUPPORTED_AI_MODELS.find((m) => m.id === model) || SUPPORTED_AI_MODELS[0];
  const safeIn = Math.max(0, Number(inputTokens) || 0);
  const safeOut = Math.max(0, Number(outputTokens) || 0);
  const cost =
    (safeIn / 1_000_000) * found.inputUsdPer1M +
    (safeOut / 1_000_000) * found.outputUsdPer1M;
  return Number(cost.toFixed(6));
}

export function getJakartaDateKey(date: Date = new Date()): string {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Jakarta',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(date);
  const year = parts.find((p) => p.type === 'year')?.value || '2026';
  const month = parts.find((p) => p.type === 'month')?.value || '01';
  const day = parts.find((p) => p.type === 'day')?.value || '01';
  return `${year}-${month}-${day}`;
}

export function validateKnowledgeInput(input: {
  title?: unknown;
  category?: unknown;
  content?: unknown;
  isActive?: unknown;
}): {
  ok: boolean;
  errors: string[];
  value?: { title: string; category: string; content: string; isActive: boolean };
} {
  const errors: string[] = [];
  const title = typeof input.title === 'string' ? input.title.trim() : '';
  const category = typeof input.category === 'string' ? input.category.trim() : '';
  const content = typeof input.content === 'string' ? input.content.trim() : '';
  const isActive = typeof input.isActive === 'boolean' ? input.isActive : true;

  if (title.length < 2 || title.length > 180) {
    errors.push('Judul materi wajib diisi (2–180 karakter).');
  }
  if (category.length < 2 || category.length > 80) {
    errors.push('Kategori materi wajib diisi (2–80 karakter).');
  }
  if (content.length < 5 || content.length > 6000) {
    errors.push('Isi informasi wajib diisi (5–6000 karakter).');
  }
  if (errors.length > 0) {
    return { ok: false, errors };
  }
  return { ok: true, errors: [], value: { title, category, content, isActive } };
}

export function sanitizeAiSettingsInput(
  raw: Partial<AiChatbotSettings>,
  current: AiChatbotSettings
): AiChatbotSettings {
  const clamp = (val: unknown, fallback: number, min: number, max: number) => {
    const num = typeof val === 'number' ? val : Number(val);
    if (!Number.isFinite(num)) return fallback;
    return Math.min(max, Math.max(min, Math.round(num)));
  };

  const suggested = Array.isArray(raw.suggestedQuestions)
    ? raw.suggestedQuestions
        .map((q) => (typeof q === 'string' ? q.trim().slice(0, 140) : ''))
        .filter(Boolean)
        .slice(0, 8)
    : current.suggestedQuestions;

  const requestedModel = typeof raw.model === 'string' ? raw.model.trim() : current.model;
  const modelValid = SUPPORTED_AI_MODELS.some((m) => m.id === requestedModel)
    ? requestedModel
    : current.model;

  return {
    enabled: typeof raw.enabled === 'boolean' ? raw.enabled : current.enabled,
    botName:
      typeof raw.botName === 'string' && raw.botName.trim()
        ? raw.botName.trim().slice(0, 80)
        : current.botName,
    tagline:
      typeof raw.tagline === 'string'
        ? raw.tagline.trim().slice(0, 120)
        : current.tagline,
    description:
      typeof raw.description === 'string'
        ? raw.description.trim().slice(0, 300)
        : current.description,
    welcomeMessage:
      typeof raw.welcomeMessage === 'string' && raw.welcomeMessage.trim()
        ? raw.welcomeMessage.trim().slice(0, 1000)
        : current.welcomeMessage,
    suggestedQuestions: suggested,
    adminWhatsapp:
      typeof raw.adminWhatsapp === 'string' && raw.adminWhatsapp.trim().length >= 8
        ? raw.adminWhatsapp.trim().slice(0, 30)
        : current.adminWhatsapp,
    publicEnabled:
      typeof raw.publicEnabled === 'boolean' ? raw.publicEnabled : current.publicEnabled,
    adminEnabled:
      typeof raw.adminEnabled === 'boolean' ? raw.adminEnabled : current.adminEnabled,
    allowPublicStudentCount:
      typeof raw.allowPublicStudentCount === 'boolean'
        ? raw.allowPublicStudentCount
        : current.allowPublicStudentCount,
    maxRequestsPerSession: clamp(raw.maxRequestsPerSession, current.maxRequestsPerSession, 1, 100),
    maxInputLength: clamp(raw.maxInputLength, current.maxInputLength, 50, 2000),
    maxOutputTokens: clamp(raw.maxOutputTokens, current.maxOutputTokens, 100, 4000),
    dailyRequestLimit: clamp(raw.dailyRequestLimit, current.dailyRequestLimit, 1, 10000),
    monthlyRequestLimit: clamp(raw.monthlyRequestLimit, current.monthlyRequestLimit, 1, 200000),
    model: modelValid,
    updatedAtIso: new Date().toISOString(),
  };
}

export function selectActiveKnowledgeNewestFirst(
  items: AiKnowledgeItem[],
  queryText?: string,
  category?: string
): AiKnowledgeItem[] {
  const catFilter = (category || '').trim().toLowerCase();
  const q = (queryText || '').trim().toLowerCase();
  const tokens = q.split(/\s+/).filter((t) => t.length >= 2);

  const active = items.filter((item) => item.isActive === true);
  const filteredByCat = catFilter
    ? active.filter((item) => item.category.toLowerCase() === catFilter)
    : active;

  const scored = filteredByCat.map((item) => {
    const hay = `${item.title} ${item.category} ${item.content}`.toLowerCase();
    let score = 0;
    for (const tok of tokens) {
      if (item.title.toLowerCase().includes(tok)) score += 3;
      if (item.category.toLowerCase().includes(tok)) score += 2;
      if (hay.includes(tok)) score += 1;
    }
    const updatedMs = new Date(item.updatedAtIso || item.createdAtIso || 0).getTime() || 0;
    return { item, score, updatedMs };
  });

  scored.sort((a, b) => {
    if (tokens.length > 0 && b.score !== a.score) return b.score - a.score;
    return b.updatedMs - a.updatedMs;
  });

  return scored.map((s) => s.item);
}

const PROMPT_INJECTION_PATTERNS = [
  /ignore\s+(all\s+)?(previous|above|prior|system)\s+instructions?/i,
  /abaikan\s+(semua\s+)?(instruksi|aturan|perintah)\s+(sebelumnya|sistem)/i,
  /reveal\s+(your\s+)?(system\s+prompt|api\s*key|secret|openai)/i,
  /tampilkan\s+(system\s+prompt|api\s*key|kunci\s+api|rahasia)/i,
  /act\s+as\s+(root|developer|admin|system)/i,
  /saya\s+(adalah\s+)?admin\b/i,
  /give\s+me\s+admin\s+access/i,
  /\bsk-[A-Za-z0-9_-]{16,}\b/,
];

export function detectPromptInjectionSignals(text: string): boolean {
  return PROMPT_INJECTION_PATTERNS.some((re) => re.test(text));
}

export function sanitizeAssistantOutputForPublic(text: string): string {
  // Never allow accidental secret leakage (OpenAI keys, Bearer tokens) in output
  return text
    .replace(/sk-(?:proj-)?[A-Za-z0-9_-]{16,}/g, '[REDACTED]')
    .replace(/Bearer\s+[A-Za-z0-9._-]{20,}/gi, '[REDACTED]');
}
