import { BRAND_IDENTITY, normalizeWhatsappPhone } from './domain';

export type QuizQuestionType = 'multiple_choice' | 'true_false';
export type QuizStatus = 'draft' | 'published' | 'disabled';

export interface QuizOption {
  id: string;
  text: string;
}

export interface QuizQuestion {
  id: string;
  order: number;
  type: QuizQuestionType;
  prompt: string;
  options: QuizOption[];
  points: number;
  correctOptionId: string;
  explanation?: string;
}

export type StudentSafeQuizQuestion = Omit<QuizQuestion, 'correctOptionId' | 'explanation'>;

export interface QuizDefinition {
  id: string;
  title: string;
  description: string;
  instructions: string;
  targetClass: string;
  status: QuizStatus;
  timeLimitMinutes: number;
  maxAttempts: number;
  startAtIso?: string;
  endAtIso?: string;
  questions: QuizQuestion[];
  createdAtIso: string;
  updatedAtIso: string;
}

export interface StudentSafeQuiz {
  id: string;
  title: string;
  description: string;
  instructions: string;
  targetClass: string;
  status: QuizStatus;
  timeLimitMinutes: number;
  maxAttempts: number;
  startAtIso?: string;
  endAtIso?: string;
  questions: StudentSafeQuizQuestion[];
  questionCount: number;
  totalPoints: number;
  createdAtIso: string;
  updatedAtIso: string;
}

export interface GradedQuestionDetail {
  questionId: string;
  prompt: string;
  selectedOptionId: string;
  selectedOptionText: string;
  correctOptionId: string;
  correctOptionText: string;
  isCorrect: boolean;
  earnedPoints: number;
  maxPoints: number;
  explanation?: string;
}

export interface QuizAttemptRecord {
  id: string;
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
}

export function toStudentSafeQuiz(quiz: QuizDefinition): StudentSafeQuiz {
  const sorted = [...quiz.questions].sort((a, b) => a.order - b.order);
  const totalPoints = sorted.reduce((sum, q) => sum + (Number(q.points) || 0), 0);
  return {
    id: quiz.id,
    title: quiz.title,
    description: quiz.description,
    instructions: quiz.instructions,
    targetClass: quiz.targetClass,
    status: quiz.status,
    timeLimitMinutes: quiz.timeLimitMinutes,
    maxAttempts: quiz.maxAttempts,
    startAtIso: quiz.startAtIso,
    endAtIso: quiz.endAtIso,
    questions: sorted.map((q) => ({
      id: q.id,
      order: q.order,
      type: q.type,
      prompt: q.prompt,
      options: q.options.map((o) => ({ id: o.id, text: o.text })),
      points: q.points,
    })),
    questionCount: sorted.length,
    totalPoints,
    createdAtIso: quiz.createdAtIso,
    updatedAtIso: quiz.updatedAtIso,
  };
}

export function checkQuizAvailability(
  quiz: Pick<QuizDefinition, 'status' | 'startAtIso' | 'endAtIso'>,
  now: Date = new Date()
): {
  available: boolean;
  state: 'active' | 'draft' | 'disabled' | 'upcoming' | 'ended';
  reason?: string;
} {
  if (quiz.status === 'draft') {
    return { available: false, state: 'draft', reason: 'Kuis masih berstatus draf dan belum diterbitkan.' };
  }
  if (quiz.status === 'disabled') {
    return { available: false, state: 'disabled', reason: 'Kuis sedang dinonaktifkan oleh pengelola.' };
  }
  const nowMs = now.getTime();
  if (quiz.startAtIso) {
    const startMs = new Date(quiz.startAtIso).getTime();
    if (!Number.isNaN(startMs) && nowMs < startMs) {
      return {
        available: false,
        state: 'upcoming',
        reason: 'Jadwal pelaksanaan kuis belum dimulai.',
      };
    }
  }
  if (quiz.endAtIso) {
    const endMs = new Date(quiz.endAtIso).getTime();
    if (!Number.isNaN(endMs) && nowMs > endMs) {
      return {
        available: false,
        state: 'ended',
        reason: 'Batas waktu pelaksanaan kuis telah berakhir.',
      };
    }
  }
  return { available: true, state: 'active' };
}

export function normalizeParticipantIdentity(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, ' ');
}

export function countMatchingAttempts(
  attempts: QuizAttemptRecord[],
  quizId: string,
  studentName: string,
  studentClass: string
): number {
  const normName = normalizeParticipantIdentity(studentName);
  const normClass = normalizeParticipantIdentity(studentClass);
  return attempts.filter(
    (a) =>
      a.quizId === quizId &&
      normalizeParticipantIdentity(a.studentName) === normName &&
      normalizeParticipantIdentity(a.studentClass) === normClass
  ).length;
}

export function gradeQuizSubmission(
  quiz: QuizDefinition,
  answers: Record<string, string>,
  durationSeconds: number
): {
  score: number;
  maxScore: number;
  percentage: number;
  correctCount: number;
  wrongCount: number;
  unansweredCount: number;
  gradedDetails: GradedQuestionDetail[];
} {
  const sorted = [...quiz.questions].sort((a, b) => a.order - b.order);
  let score = 0;
  let maxScore = 0;
  let correctCount = 0;
  let wrongCount = 0;
  let unansweredCount = 0;

  const gradedDetails: GradedQuestionDetail[] = sorted.map((q) => {
    const qPoints = Math.max(0, Number(q.points) || 0);
    maxScore += qPoints;
    const selectedId = typeof answers[q.id] === 'string' ? answers[q.id].trim() : '';
    const selectedOpt = q.options.find((o) => o.id === selectedId);
    const correctOpt = q.options.find((o) => o.id === q.correctOptionId);
    const isCorrect = Boolean(selectedId) && selectedId === q.correctOptionId;

    if (!selectedId) {
      unansweredCount += 1;
      wrongCount += 1;
    } else if (isCorrect) {
      correctCount += 1;
      score += qPoints;
    } else {
      wrongCount += 1;
    }

    return {
      questionId: q.id,
      prompt: q.prompt,
      selectedOptionId: selectedId,
      selectedOptionText: selectedOpt?.text || '(Tidak dijawab)',
      correctOptionId: q.correctOptionId,
      correctOptionText: correctOpt?.text || q.correctOptionId,
      isCorrect,
      earnedPoints: isCorrect ? qPoints : 0,
      maxPoints: qPoints,
      explanation: q.explanation,
    };
  });

  const percentage = maxScore > 0 ? Math.round((score / maxScore) * 100) : 0;
  return {
    score,
    maxScore,
    percentage,
    correctCount,
    wrongCount,
    unansweredCount,
    gradedDetails: gradedDetails.map((d) => ({ ...d, durationSeconds } as GradedQuestionDetail)),
  };
}

export function validateQuizPayload(input: Partial<QuizDefinition>): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];
  const title = (input.title || '').trim();
  if (title.length < 3 || title.length > 180) {
    errors.push('Judul kuis wajib diisi (3–180 karakter).');
  }
  if (!input.status || !['draft', 'published', 'disabled'].includes(input.status)) {
    errors.push('Status kuis harus draft, published, atau disabled.');
  }
  const timeLimit = Number(input.timeLimitMinutes ?? 0);
  if (Number.isNaN(timeLimit) || timeLimit < 0 || timeLimit > 240) {
    errors.push('Batas waktu kuis harus antara 0 (tanpa batas) sampai 240 menit.');
  }
  const maxAttempts = Number(input.maxAttempts ?? 1);
  if (Number.isNaN(maxAttempts) || maxAttempts < 0 || maxAttempts > 50) {
    errors.push('Batas percobaan harus antara 0 (tidak terbatas) sampai 50.');
  }
  if (input.startAtIso && input.endAtIso) {
    const startMs = new Date(input.startAtIso).getTime();
    const endMs = new Date(input.endAtIso).getTime();
    if (!Number.isNaN(startMs) && !Number.isNaN(endMs) && endMs <= startMs) {
      errors.push('Waktu selesai kuis harus setelah waktu mulai.');
    }
  }
  const questions = Array.isArray(input.questions) ? input.questions : [];
  if (questions.length === 0) {
    errors.push('Minimal harus ada 1 soal dalam kuis.');
  } else if (questions.length > 100) {
    errors.push('Maksimal 100 soal per kuis.');
  } else {
    questions.forEach((q, idx) => {
      const label = `Soal #${idx + 1}`;
      if (!q.prompt || q.prompt.trim().length < 2) {
        errors.push(`${label}: Pertanyaan wajib diisi.`);
      }
      if (!['multiple_choice', 'true_false'].includes(q.type)) {
        errors.push(`${label}: Tipe soal tidak valid.`);
      }
      if (!Array.isArray(q.options) || q.options.length < 2) {
        errors.push(`${label}: Minimal harus memiliki 2 pilihan jawaban.`);
      } else {
        const emptyOpt = q.options.some((o) => !o.text || !o.text.trim());
        if (emptyOpt) {
          errors.push(`${label}: Semua teks pilihan jawaban harus diisi.`);
        }
        const hasKey = q.options.some((o) => o.id === q.correctOptionId);
        if (!hasKey) {
          errors.push(`${label}: Kunci jawaban yang benar wajib dipilih.`);
        }
      }
      if (Number.isNaN(Number(q.points)) || Number(q.points) <= 0) {
        errors.push(`${label}: Bobot nilai soal harus lebih dari 0.`);
      }
    });
  }
  return { valid: errors.length === 0, errors };
}

export function escapeCsvCell(value: string | number | boolean | undefined | null): string {
  const str = value === undefined || value === null ? '' : String(value);
  if (/[",\r\n]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

export function buildQuizAttemptsCsv(
  quiz: Pick<QuizDefinition, 'title'>,
  attempts: QuizAttemptRecord[]
): string {
  const header = [
    'No',
    'Judul Kuis',
    'Nama Siswa',
    'Kelas',
    'WA Orang Tua',
    'Skor',
    'Skor Maksimal',
    'Persentase (%)',
    'Benar',
    'Salah',
    'Durasi (Detik)',
    'Waktu Selesai',
  ];
  const rows = attempts.map((a, idx) => [
    idx + 1,
    quiz.title,
    a.studentName,
    a.studentClass,
    a.parentWhatsapp || '-',
    a.score,
    a.maxScore,
    a.percentage,
    a.correctCount,
    a.wrongCount,
    a.durationSeconds,
    a.submittedAtIso,
  ]);
  const lines = [header, ...rows].map((row) => row.map(escapeCsvCell).join(','));
  return '\uFEFF' + lines.join('\r\n');
}

// ============================================================================
// WHATSAPP GROUP & WHATSAPP CENTER DOMAIN
// ============================================================================

export interface WaGroupRecord {
  id: string;
  name: string;
  pinned: boolean;
  lastSyncedIso?: string;
}

export interface WaGroupSendLog {
  id: string;
  groupIds: string[];
  groupNames: string[];
  message: string;
  status: 'sent' | 'partial' | 'failed' | 'unconfigured';
  results: Array<{
    groupId: string;
    groupName: string;
    status: string;
    detail: string;
  }>;
  sentAtIso: string;
  sentByEmail: string;
}

export const WA_TEMPLATE_CATEGORIES = [
  'Pendaftaran',
  'Pembayaran & Jatuh Tempo',
  'Pengumuman Umum',
  'Kuis Online',
  'Jadwal Belajar',
  'Evaluasi & Laporan Belajar',
  'Pengingat Kelas',
  'Ucapan & Apresiasi',
] as const;

export type WaTemplateCategory = (typeof WA_TEMPLATE_CATEGORIES)[number];

export const WA_TEMPLATE_VARIABLES = [
  'nama_siswa',
  'nama_orang_tua',
  'kelas',
  'nama_program',
  'jadwal',
  'tanggal',
  'jam',
  'nama_lembaga',
] as const;

export type WaTemplateVariable = (typeof WA_TEMPLATE_VARIABLES)[number];

export interface WaTemplateRecord {
  id: string;
  name: string;
  category: WaTemplateCategory;
  content: string;
  isEnabled: boolean;
  createdAtIso: string;
  updatedAtIso: string;
}

export interface WaRecipientInput {
  name?: string;
  parentName?: string;
  phone: string;
  studentClass?: string;
  programName?: string;
  scheduleLabel?: string;
  source?: 'manual' | 'student' | 'parent' | 'group' | 'csv';
}

export type WaQueueItemStatus = 'menunggu' | 'diproses' | 'berhasil' | 'gagal';

export interface WaQueueItem {
  id: string;
  phone: string;
  displayName: string;
  resolvedMessage: string;
  source: string;
  status: WaQueueItemStatus;
  attempts: number;
  lastError?: string;
  sentAtIso?: string;
  variables: Record<string, string>;
}

export interface WaCampaignRecord {
  id: string;
  title: string;
  templateId?: string;
  templateName?: string;
  rawMessage: string;
  status: 'draft' | 'running' | 'paused' | 'completed';
  totalCount: number;
  waitingCount: number;
  processingCount: number;
  successCount: number;
  failedCount: number;
  delaySeconds: number;
  batchSize: number;
  maxRetries: number;
  createdAtIso: string;
  updatedAtIso: string;
  createdByEmail: string;
  items: WaQueueItem[];
}

export interface WaOptOutRecord {
  phone: string;
  reason?: string;
  addedAtIso: string;
}

export interface WaAutomationSettings {
  delaySeconds: number;
  batchSize: number;
  maxRetries: number;
  defaultTemplateId: string;
  testRecipientPhone: string;
  autoNotifyQuizPublished: boolean;
  autoQuizTemplateId: string;
  autoNotifyRegistration: boolean;
  autoRegistrationTemplateId: string;
  autoNotifyLearningInfo: boolean;
  autoLearningTemplateId: string;
  updatedAtIso: string;
}

export function extractTemplatePlaceholders(template: string): string[] {
  const found = new Set<string>();
  const regex = /\{([a-zA-Z0-9_]+)\}/g;
  let match: RegExpExecArray | null;
  while ((match = regex.exec(template)) !== null) {
    found.add(match[1]);
  }
  return Array.from(found);
}

export function renderTemplateVariables(
  template: string,
  variables: Record<string, string | undefined>
): {
  rendered: string;
  missingVariables: string[];
  unknownVariables: string[];
} {
  const placeholders = extractTemplatePlaceholders(template);
  const allowedSet = new Set<string>(WA_TEMPLATE_VARIABLES);
  const missingVariables: string[] = [];
  const unknownVariables: string[] = [];

  const nowJakarta = new Date();
  const defaultDate = nowJakarta.toLocaleDateString('id-ID', {
    timeZone: 'Asia/Jakarta',
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  });
  const defaultTime =
    nowJakarta.toLocaleTimeString('id-ID', {
      timeZone: 'Asia/Jakarta',
      hour: '2-digit',
      minute: '2-digit',
    }) + ' WIB';

  const lookup: Record<string, string> = {
    nama_lembaga: BRAND_IDENTITY.officialName,
    tanggal: defaultDate,
    jam: defaultTime,
  };
  for (const [key, val] of Object.entries(variables)) {
    if (typeof val === 'string' && val.trim().length > 0) {
      lookup[key] = val.trim();
    }
  }

  for (const key of placeholders) {
    if (!allowedSet.has(key)) {
      unknownVariables.push(key);
    } else if (!lookup[key] || lookup[key].trim().length === 0) {
      missingVariables.push(key);
    }
  }

  const rendered = template.replace(/\{([a-zA-Z0-9_]+)\}/g, (full, key: string) => {
    if (lookup[key]) return lookup[key];
    return full;
  });

  return {
    rendered,
    missingVariables,
    unknownVariables,
  };
}

export function isValidWaTarget(raw: string): {
  valid: boolean;
  normalized: string;
  isGroupId: boolean;
  reason?: string;
} {
  const trimmed = raw.trim();
  if (!trimmed) {
    return { valid: false, normalized: '', isGroupId: false, reason: 'Nomor atau ID tujuan kosong.' };
  }
  if (trimmed.endsWith('@g.us')) {
    return { valid: true, normalized: trimmed, isGroupId: true };
  }
  const normalized = normalizeWhatsappPhone(trimmed);
  const digits = normalized.replace(/\D/g, '');
  if (digits.length < 8 || digits.length > 16) {
    return {
      valid: false,
      normalized,
      isGroupId: false,
      reason: 'Nomor WhatsApp harus terdiri dari 8–16 digit.',
    };
  }
  return { valid: true, normalized: digits, isGroupId: false };
}

export function parseContactsCsvText(csvText: string): WaRecipientInput[] {
  const lines = csvText
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);
  if (lines.length === 0) return [];

  const results: WaRecipientInput[] = [];
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const parts = line.split(/[,;\t]/).map((p) => p.trim().replace(/^"|"$/g, ''));
    if (i === 0 && /nama|name|phone|wa|hp|telepon/i.test(parts.join(' '))) {
      continue;
    }
    if (parts.length === 1) {
      results.push({ phone: parts[0], source: 'csv' });
    } else {
      results.push({
        name: parts[0] || undefined,
        phone: parts[1] || parts[0],
        parentName: parts[2] || undefined,
        studentClass: parts[3] || undefined,
        programName: parts[4] || undefined,
        scheduleLabel: parts[5] || undefined,
        source: 'csv',
      });
    }
  }
  return results;
}

export function deduplicateAndFilterRecipients(
  inputs: WaRecipientInput[],
  optOutPhones: string[]
): {
  accepted: Array<WaRecipientInput & { normalizedPhone: string }>;
  invalid: Array<{ raw: string; reason: string }>;
  duplicates: number;
  optedOut: number;
} {
  const optOutSet = new Set(
    optOutPhones.map((p) => {
      const check = isValidWaTarget(p);
      return check.valid ? check.normalized : p.trim();
    })
  );
  const seen = new Set<string>();
  const accepted: Array<WaRecipientInput & { normalizedPhone: string }> = [];
  const invalid: Array<{ raw: string; reason: string }> = [];
  let duplicates = 0;
  let optedOut = 0;

  for (const item of inputs) {
    const check = isValidWaTarget(item.phone);
    if (!check.valid) {
      invalid.push({ raw: item.phone, reason: check.reason || 'Format nomor tidak valid.' });
      continue;
    }
    if (optOutSet.has(check.normalized)) {
      optedOut += 1;
      continue;
    }
    if (seen.has(check.normalized)) {
      duplicates += 1;
      continue;
    }
    seen.add(check.normalized);
    accepted.push({
      ...item,
      normalizedPhone: check.normalized,
    });
  }

  return { accepted, invalid, duplicates, optedOut };
}

export function recalculateCampaignCounts(campaign: WaCampaignRecord): WaCampaignRecord {
  let waitingCount = 0;
  let processingCount = 0;
  let successCount = 0;
  let failedCount = 0;

  for (const item of campaign.items) {
    if (item.status === 'menunggu') waitingCount += 1;
    else if (item.status === 'diproses') processingCount += 1;
    else if (item.status === 'berhasil') successCount += 1;
    else if (item.status === 'gagal') failedCount += 1;
  }

  const totalCount = campaign.items.length;
  let status = campaign.status;
  if (totalCount > 0 && waitingCount === 0 && processingCount === 0) {
    status = 'completed';
  }

  return {
    ...campaign,
    status,
    totalCount,
    waitingCount,
    processingCount,
    successCount,
    failedCount,
  };
}

export function buildCampaignReportCsv(campaign: WaCampaignRecord): string {
  const header = [
    'No',
    'Nama Kampanye',
    'Template',
    'Penerima',
    'Nomor/ID WA',
    'Sumber',
    'Status',
    'Percobaan',
    'Waktu Kirim',
    'Detail / Alasan Gagal',
  ];
  const rows = campaign.items.map((item, idx) => [
    idx + 1,
    campaign.title,
    campaign.templateName || 'Pesan Kustom',
    item.displayName,
    item.phone,
    item.source,
    item.status,
    item.attempts,
    item.sentAtIso || '-',
    item.lastError || '-',
  ]);
  const lines = [header, ...rows].map((row) => row.map(escapeCsvCell).join(','));
  return '\uFEFF' + lines.join('\r\n');
}

export const INITIAL_SAMPLE_QUIZZES: QuizDefinition[] = [
  {
    id: 'kuis-calistung-dasar',
    title: 'Latihan Calistung Dasar (TK – Kelas 1)',
    description: 'Evaluasi ringan pengenalan huruf, suku kata sederhana, dan penjumlahan dasar 1 sampai 20.',
    instructions:
      'Bacalah setiap soal bersama pendamping atau secara mandiri dengan teliti. Pilih satu jawaban yang paling tepat sebelum menekan tombol Kirim Jawaban.',
    targetClass: 'TK – Kelas 1 SD',
    status: 'published',
    timeLimitMinutes: 15,
    maxAttempts: 3,
    questions: [
      {
        id: 'q1',
        order: 1,
        type: 'multiple_choice',
        prompt: 'Hasil penjumlahan dari 7 + 5 adalah ...',
        options: [
          { id: 'a', text: '11' },
          { id: 'b', text: '12' },
          { id: 'c', text: '13' },
          { id: 'd', text: '14' },
        ],
        points: 25,
        correctOptionId: 'b',
        explanation: '7 ditambah 5 sama dengan 12.',
      },
      {
        id: 'q2',
        order: 2,
        type: 'multiple_choice',
        prompt: 'Manakah kata yang diawali dengan huruf B?',
        options: [
          { id: 'a', text: 'Apel' },
          { id: 'b', text: 'Bola' },
          { id: 'c', text: 'Meja' },
          { id: 'd', text: 'Kursi' },
        ],
        points: 25,
        correctOptionId: 'b',
        explanation: 'Kata Bola diawali huruf B.',
      },
      {
        id: 'q3',
        order: 3,
        type: 'true_false',
        prompt: 'Angka 15 lebih besar daripada angka 12.',
        options: [
          { id: 'true', text: 'Benar' },
          { id: 'false', text: 'Salah' },
        ],
        points: 25,
        correctOptionId: 'true',
        explanation: '15 berada setelah 12 pada urutan bilangan.',
      },
      {
        id: 'q4',
        order: 4,
        type: 'multiple_choice',
        prompt: 'Jika Ibu membeli 9 jeruk lalu dimakan 3 jeruk, sisa jeruk adalah ...',
        options: [
          { id: 'a', text: '5' },
          { id: 'b', text: '6' },
          { id: 'c', text: '7' },
          { id: 'd', text: '12' },
        ],
        points: 25,
        correctOptionId: 'b',
        explanation: '9 dikurangi 3 sama dengan 6.',
      },
    ],
    createdAtIso: '2026-11-01T08:00:00.000Z',
    updatedAtIso: '2026-11-01T08:00:00.000Z',
  },
  {
    id: 'kuis-tka-kelas6-latihan',
    title: 'Simulasi Persiapan TKA — Paket 3 (Kelas 6 SD)',
    description: 'Latihan soal Matematika, Bahasa Indonesia, dan IPAS untuk mengukur kesiapan menghadapi TKA.',
    instructions:
      'Kerjakan soal secara mandiri dalam batas waktu yang tersedia. Nilai akan dihitung otomatis oleh sistem setelah seluruh jawaban dikirim.',
    targetClass: 'Kelas 6 SD',
    status: 'published',
    timeLimitMinutes: 20,
    maxAttempts: 2,
    questions: [
      {
        id: 't1',
        order: 1,
        type: 'multiple_choice',
        prompt: 'Hasil dari 24 × 5 - 35 adalah ...',
        options: [
          { id: 'a', text: '75' },
          { id: 'b', text: '85' },
          { id: 'c', text: '95' },
          { id: 'd', text: '105' },
        ],
        points: 25,
        correctOptionId: 'b',
        explanation: 'Perkalian didahulukan: 24 × 5 = 120, lalu 120 - 35 = 85.',
      },
      {
        id: 't2',
        order: 2,
        type: 'multiple_choice',
        prompt: 'Kalimat utama pada sebuah paragraf deduktif terletak pada ...',
        options: [
          { id: 'a', text: 'Awal paragraf' },
          { id: 'b', text: 'Tengah paragraf' },
          { id: 'c', text: 'Akhir paragraf' },
          { id: 'd', text: 'Judul bacaan' },
        ],
        points: 25,
        correctOptionId: 'a',
        explanation: 'Paragraf deduktif menempatkan gagasan utama di awal paragraf.',
      },
      {
        id: 't3',
        order: 3,
        type: 'true_false',
        prompt: 'Proses tumbuhan hijau membuat makanannya sendiri dengan bantuan cahaya matahari disebut fotosintesis.',
        options: [
          { id: 'true', text: 'Benar' },
          { id: 'false', text: 'Salah' },
        ],
        points: 25,
        correctOptionId: 'true',
        explanation: 'Fotosintesis memanfaatkan cahaya matahari, air, dan karbon dioksida.',
      },
      {
        id: 't4',
        order: 4,
        type: 'multiple_choice',
        prompt: 'Sebuah persegi memiliki panjang sisi 14 cm. Keliling persegi tersebut adalah ...',
        options: [
          { id: 'a', text: '28 cm' },
          { id: 'b', text: '42 cm' },
          { id: 'c', text: '56 cm' },
          { id: 'd', text: '196 cm' },
        ],
        points: 25,
        correctOptionId: 'c',
        explanation: 'Keliling persegi = 4 × sisi = 4 × 14 = 56 cm.',
      },
    ],
    createdAtIso: '2026-11-01T08:00:00.000Z',
    updatedAtIso: '2026-11-01T08:00:00.000Z',
  },
];

export const INITIAL_WA_TEMPLATES: WaTemplateRecord[] = [
  {
    id: 'tpl-pendaftaran',
    name: 'Konfirmasi Pendaftaran Siswa Baru',
    category: 'Pendaftaran',
    content:
      'Halo Bapak/Ibu *{nama_orang_tua}*, terima kasih telah mendaftarkan ananda *{nama_siswa}* ({kelas}) pada *{nama_program}* di *{nama_lembaga}*. Tim kami akan segera mengonfirmasi jadwal belajar pada {tanggal}.',
    isEnabled: true,
    createdAtIso: '2026-11-01T08:00:00.000Z',
    updatedAtIso: '2026-11-01T08:00:00.000Z',
  },
  {
    id: 'tpl-pembayaran',
    name: 'Pengingat Pembayaran Bulanan',
    category: 'Pembayaran & Jatuh Tempo',
    content:
      'Yth. Bapak/Ibu *{nama_orang_tua}*, kami informasikan jadwal administrasi bulanan ananda *{nama_siswa}* ({nama_program}) jatuh pada *{tanggal}*. Mohon konfirmasi kepada admin *{nama_lembaga}*.',
    isEnabled: true,
    createdAtIso: '2026-11-01T08:00:00.000Z',
    updatedAtIso: '2026-11-01T08:00:00.000Z',
  },
  {
    id: 'tpl-pengumuman',
    name: 'Pengumuman Resmi Lembaga',
    category: 'Pengumuman Umum',
    content:
      '*PENGUMUMAN — {nama_lembaga}*\n\nKepada Yth. Bapak/Ibu *{nama_orang_tua}* (Orang Tua dari *{nama_siswa}* - {kelas}), kami sampaikan pembaruan kegiatan belajar pada {tanggal} pukul {jam}.',
    isEnabled: true,
    createdAtIso: '2026-11-01T08:00:00.000Z',
    updatedAtIso: '2026-11-01T08:00:00.000Z',
  },
  {
    id: 'tpl-kuis',
    name: 'Undangan Mengerjakan Kuis Online',
    category: 'Kuis Online',
    content:
      'Halo *{nama_siswa}* ({kelas}) & Bapak/Ibu *{nama_orang_tua}*, kuis latihan *{nama_program}* telah dibuka di portal Kuis Online *{nama_lembaga}*. Silakan kerjakan sebelum jadwal berikutnya ({jadwal}).',
    isEnabled: true,
    createdAtIso: '2026-11-01T08:00:00.000Z',
    updatedAtIso: '2026-11-01T08:00:00.000Z',
  },
  {
    id: 'tpl-jadwal',
    name: 'Informasi Perubahan Jadwal',
    category: 'Jadwal Belajar',
    content:
      'Yth. Bapak/Ibu *{nama_orang_tua}*, jadwal belajar ananda *{nama_siswa}* ({nama_program}) tercatat pada *{jadwal}* mulai {tanggal} pukul {jam} bersama *{nama_lembaga}*.',
    isEnabled: true,
    createdAtIso: '2026-11-01T08:00:00.000Z',
    updatedAtIso: '2026-11-01T08:00:00.000Z',
  },
  {
    id: 'tpl-evaluasi',
    name: 'Laporan Perkembangan Belajar',
    category: 'Evaluasi & Laporan Belajar',
    content:
      'Yth. Bapak/Ibu *{nama_orang_tua}*, berikut catatan evaluasi belajar ananda *{nama_siswa}* ({kelas} · {nama_program}) per {tanggal} di *{nama_lembaga}*.',
    isEnabled: true,
    createdAtIso: '2026-11-01T08:00:00.000Z',
    updatedAtIso: '2026-11-01T08:00:00.000Z',
  },
  {
    id: 'tpl-pengingat-kelas',
    name: 'Pengingat Sesi Belajar Hari Ini',
    category: 'Pengingat Kelas',
    content:
      'Selamat pagi Bapak/Ibu *{nama_orang_tua}*, mengingatkan sesi belajar *{nama_siswa}* ({nama_program}) hari ini *{jadwal}* pukul *{jam}* di *{nama_lembaga}*.',
    isEnabled: true,
    createdAtIso: '2026-11-01T08:00:00.000Z',
    updatedAtIso: '2026-11-01T08:00:00.000Z',
  },
  {
    id: 'tpl-apresiasi',
    name: 'Apresiasi Kemajuan Siswa',
    category: 'Ucapan & Apresiasi',
    content:
      'Selamat untuk ananda *{nama_siswa}* ({kelas})! Terima kasih Bapak/Ibu *{nama_orang_tua}* atas dukungan belajar bersama *{nama_lembaga}*. Terus semangat!',
    isEnabled: true,
    createdAtIso: '2026-11-01T08:00:00.000Z',
    updatedAtIso: '2026-11-01T08:00:00.000Z',
  },
];
