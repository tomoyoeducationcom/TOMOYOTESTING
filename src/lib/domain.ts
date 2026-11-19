export const ADMIN_UID = 'Tlqf2dNHYCRuYmxgEbHFa783iDs1';
export const ADMIN_EMAIL = 'tomoyoeducation.com@gmail.com';
export const ADMIN_WHATSAPP_TARGET = '6281996284733';
export const FONNTE_SENDER_NUMBER = '6283121902760';
export const FONNTE_SENDER_DISPLAY = '+62 831-2190-2760';
export const REGISTRATION_WHATSAPP_TARGET = FONNTE_SENDER_NUMBER;

export const BRAND_IDENTITY = {
  officialName: 'TOMOYO PRIVAT & BIMBEL EDUCATION',
  shortName: 'TOMOYO EDUCATION',
  tagline: 'LEARN • GROW • SUCCEED',
  meaning:
    'Tempat tumbuhnya generasi cerdas, mandiri, berprestasi, dan siap meraih masa depan.',
  philosophyNote:
    'TOMOYO merupakan nama yang dimaknai sebagai simbol harapan, semangat, dan masa depan yang lebih baik (filosofi kreatif brand, bukan klaim etimologi literal).',
  headerLogoPath: '/assets/aistudio/header_bb02064d.jpg',
  emblemLogoPath: '/assets/aistudio/favicon_67ba3fe5.png',
  founderPhotoPath: '/assets/aistudio/20261118_140704_95553ff5.jpg',
  founderName: 'JALALUDIN NUROHMAN,S.I.Kom.,S.Pd.,Gr',
  founderRole: 'Founder & CEO',
} as const;

export const TOMOYO_PHILOSOPHY = [
  { letter: 'T', word: 'Talenta', meaning: 'mengembangkan potensi.' },
  { letter: 'O', word: 'Optimis', meaning: 'memiliki keyakinan untuk sukses.' },
  { letter: 'M', word: 'Mandiri', meaning: 'membangun kemandirian belajar.' },
  { letter: 'O', word: 'Outstanding', meaning: 'berprestasi dan unggul.' },
  { letter: 'Y', word: 'Yakin', meaning: 'percaya pada kemampuan diri.' },
  { letter: 'O', word: 'Opportunity', meaning: 'menciptakan peluang masa depan.' },
] as const;

export type PackageId = 'paket-1' | 'paket-2' | 'paket-3';
export type BranchId = 'indramayu-kota' | 'terisi';
export type RegistrationStatus = 'pending' | 'approved' | 'rejected';
export type AcademicStatus = 'menunggu' | 'aktif' | 'lulus' | 'nonaktif';
export type PaymentStatus = 'lunas' | 'cicilan' | 'belum_bayar';
export type ChildGender = 'Laki-laki' | 'Perempuan';
export type RegistrationChannel = 'online' | 'offline' | 'migration';
export type NotificationType =
  | 'registration'
  | 'offline_registration'
  | 'payment_due'
  | 'manual_reminder';

export interface LearningPackage {
  id: string;
  slug: PackageId;
  order: number;
  title: string;
  levelRange: string;
  programType: string;
  subjects: string[];
  priceLabel?: string;
  priceNote?: string;
  pricePusat?: number;
  priceCabang?: number;
  pricePusatNote?: string;
  priceCabangNote?: string;
  description?: string;
  isPublished: boolean;
}

export interface BranchLocation {
  id: string;
  slug: BranchId;
  order: number;
  name: string;
  roleLabel: string;
  mapsUrl: string;
  latitude?: number;
  longitude?: number;
  isPublished: boolean;
}

export interface TeacherProfile {
  id: string;
  order: number;
  name: string;
  description?: string;
  photoUrl?: string;
  isPublished: boolean;
}

export interface SiteContentSection {
  id: string;
  sectionKey: string;
  title?: string;
  subtitle?: string;
  body?: string;
  vision?: string;
  mission?: string;
  founderName?: string;
  founderRole?: string;
  founderPhotoUrl?: string;
  founderBio?: string;
  email?: string;
  whatsappDisplay?: string;
  whatsappUrl?: string;
  instagramUrl?: string;
  facebookUrl?: string;
  isPublished: boolean;
}

export interface GalleryItem {
  id: string;
  title: string;
  caption?: string;
  imageUrl: string;
  category?: string;
  isPublished: boolean;
  createdAt?: unknown;
}

export interface AnnouncementItem {
  id: string;
  title: string;
  content: string;
  imageUrl?: string;
  dateLabel?: string;
  isPublished: boolean;
  createdAt?: unknown;
}

export interface ScheduleItem {
  id: string;
  title: string;
  packageId?: string;
  branchId?: string;
  dayTime: string;
  notes?: string;
  isPublished: boolean;
  createdAt?: unknown;
}

export interface StudentRecord {
  id: string;
  parentId: string;
  parentName: string;
  parentEmail: string;
  parentPhone: string;
  childName: string;
  birthDate?: string;
  schoolOrigin?: string;
  studentAddress?: string;
  childPhotoUrl?: string;
  childGender?: ChildGender;
  gradeLevel: string;
  packageId: PackageId;
  packageName: string;
  branchId: BranchId;
  branchName: string;
  registrationChannel?: RegistrationChannel;
  billingAmount?: number;
  initialPaymentStatus?: PaymentStatus;
  registeredAtIso?: string;
  nextDueAtIso?: string;
  lastDueNotifiedIso?: string;
  dueConfirmedIso?: string;
  status: RegistrationStatus;
  academicStatus: AcademicStatus;
  notes?: string;
  adminNotes?: string;
  createdAt?: unknown;
  updatedAt?: unknown;
}

export interface PaymentRecord {
  id: string;
  studentId: string;
  parentId: string;
  childName: string;
  amount: number;
  method: string;
  periodLabel: string;
  dueDateIso?: string;
  status: PaymentStatus;
  notes?: string;
  recordedBy: string;
  createdAt?: unknown;
}

export interface NotificationLogRecord {
  id: string;
  registrationId: string;
  parentId: string;
  type?: NotificationType;
  target: string;
  status: 'sent' | 'failed' | 'unconfigured' | 'skipped_duplicate';
  messagePreview: string;
  providerDetail?: string;
  createdAt?: unknown;
}

export const INITIAL_PACKAGES: LearningPackage[] = [
  {
    id: 'paket-1',
    slug: 'paket-1',
    order: 1,
    title: 'PAKET 1: TK – Kelas 1',
    levelRange: 'TK – Kelas 1',
    programType: 'Program: CALISTUNG',
    subjects: ['CALISTUNG (Membaca, Menulis, Berhitung)'],
    isPublished: true,
  },
  {
    id: 'paket-2',
    slug: 'paket-2',
    order: 2,
    title: 'PAKET 2: Kelas 2 – Kelas 5',
    levelRange: 'Kelas 2 – Kelas 5',
    programType: 'Mata pelajaran',
    subjects: ['Bahasa Indonesia', 'Bahasa Inggris', 'MTK', 'IPAS'],
    isPublished: true,
  },
  {
    id: 'paket-3',
    slug: 'paket-3',
    order: 3,
    title: 'PAKET 3: Kelas 6',
    levelRange: 'Program: Persiapan TKA',
    programType: 'Mata pelajaran',
    subjects: ['MTK', 'Bahasa Indonesia', 'IPAS'],
    isPublished: true,
  },
];

export const INITIAL_TEACHERS: TeacherProfile[] = [
  { id: 'guru-1', order: 1, name: 'JALALUDIN NUROHMAN,S.I.Kom.,S.Pd.,Gr', isPublished: true },
  { id: 'guru-2', order: 2, name: 'ALFIYANI, S.Pd', isPublished: true },
  { id: 'guru-3', order: 3, name: 'YACOB BATIPI S.Pd.,Gr', isPublished: true },
  { id: 'guru-4', order: 4, name: 'FAHMI HUAWIDI S.Pd.,Gr', isPublished: true },
  { id: 'guru-5', order: 5, name: 'ARTI IIN PARLINA,S.Pd.,Gr', isPublished: true },
  { id: 'guru-6', order: 6, name: 'HAYA S.Pd', isPublished: true },
  { id: 'guru-7', order: 7, name: 'RESTU SE.,S.Pd.,Gr', isPublished: true },
  { id: 'guru-8', order: 8, name: 'CIPTO KARATON S.Pi.,Gr', isPublished: true },
  { id: 'guru-9', order: 9, name: 'SOFYAN ANDI S.Si.,Gr', isPublished: true },
];

export const INITIAL_BRANCHES: BranchLocation[] = [
  {
    id: 'indramayu-kota',
    slug: 'indramayu-kota',
    order: 1,
    name: 'TOMOYO EDUCATION INDRAMAYU KOTA (PUSAT)',
    roleLabel: 'Pusat',
    mapsUrl: 'https://maps.app.goo.gl/nJjYFVJnFPuzzz6B8?g_st=ac',
    latitude: -6.333158,
    longitude: 108.341824,
    isPublished: true,
  },
  {
    id: 'terisi',
    slug: 'terisi',
    order: 2,
    name: 'TOMOYO EDUCATION KECAMATAN TERISI (CABANG)',
    roleLabel: 'Cabang',
    mapsUrl: 'https://maps.app.goo.gl/958GhajzPbbdWxoc6?g_st=ac',
    latitude: -6.455393,
    longitude: 108.140484,
    isPublished: true,
  },
];

export const INITIAL_CONTACT: SiteContentSection = {
  id: 'contact',
  sectionKey: 'contact',
  email: 'tomoyoeducation.com@gmail.com',
  whatsappDisplay: '0821-1977-0700',
  whatsappUrl: 'https://wa.me/6282119770700',
  instagramUrl: 'https://www.instagram.com/tomoyoeducation?bqrl=cHJsb3RnY3g1c3g2',
  facebookUrl: 'https://www.facebook.com/share/1CSomr9gXK/',
  isPublished: true,
};

export const INITIAL_FOUNDER: SiteContentSection = {
  id: 'founder',
  sectionKey: 'founder',
  founderName: BRAND_IDENTITY.founderName,
  founderRole: BRAND_IDENTITY.founderRole,
  founderPhotoUrl: BRAND_IDENTITY.founderPhotoPath,
  founderBio: '',
  isPublished: true,
};

export const INITIAL_ABOUT: SiteContentSection = {
  id: 'about',
  sectionKey: 'about',
  title: BRAND_IDENTITY.officialName,
  subtitle: BRAND_IDENTITY.meaning,
  body: BRAND_IDENTITY.philosophyNote,
  vision: '',
  mission: '',
  isPublished: true,
};

export function isAuthorizedAdminIdentity(identity: {
  uid?: string | null;
  email?: string | null;
  emailVerified?: boolean | null;
}): boolean {
  return (
    identity.uid === ADMIN_UID &&
    identity.email === ADMIN_EMAIL &&
    identity.emailVerified === true
  );
}

export function formatRupiah(amount: number): string {
  return `Rp ${Math.round(amount).toLocaleString('id-ID')}`;
}

export function parseRupiahAmount(raw: unknown): number | null {
  if (typeof raw === 'number' && Number.isFinite(raw) && raw >= 0) {
    return Math.round(raw);
  }
  if (typeof raw === 'string') {
    const trimmed = raw.trim();
    if (!trimmed) return null;
    const normalized = trimmed
      .replace(/^rp\.?\s*/i, '')
      .replace(/,00\s*$/i, '')
      .replace(/,-\s*$/i, '')
      .replace(/\./g, '')
      .replace(/\s+/g, '');
    if (/^\d+$/.test(normalized)) {
      const parsed = Number(normalized);
      if (Number.isFinite(parsed) && parsed >= 0) {
        return parsed;
      }
    }
  }
  return null;
}

export function getPackagePriceForBranch(
  pkg: LearningPackage | undefined,
  branchId: BranchId
): number | null {
  if (!pkg) return null;
  const pusat = parseRupiahAmount(pkg.pricePusat);
  const cabang = parseRupiahAmount(pkg.priceCabang);

  if (pusat !== null || cabang !== null) {
    return branchId === 'indramayu-kota' ? pusat : cabang;
  }

  return parseRupiahAmount(pkg.priceLabel);
}

export function getPackagePriceDisplayForBranch(
  pkg: LearningPackage | undefined,
  branchId: BranchId
): string | null {
  if (!pkg) return null;
  const numeric = getPackagePriceForBranch(pkg, branchId);
  if (numeric !== null) {
    return formatRupiah(numeric);
  }
  const pusat = parseRupiahAmount(pkg.pricePusat);
  const cabang = parseRupiahAmount(pkg.priceCabang);
  if (pusat === null && cabang === null && pkg.priceLabel && pkg.priceLabel.trim()) {
    return pkg.priceLabel.trim();
  }
  return null;
}

export function getPackagePriceNoteForBranch(
  pkg: LearningPackage | undefined,
  branchId: BranchId
): string | undefined {
  if (!pkg) return undefined;
  const note = branchId === 'indramayu-kota' ? pkg.pricePusatNote : pkg.priceCabangNote;
  if (note && note.trim()) return note.trim();
  if (pkg.priceNote && pkg.priceNote.trim()) return pkg.priceNote.trim();
  return undefined;
}

/**
 * Menghitung tanggal & jam jatuh tempo tepat 1 bulan kalender berikutnya.
 * Contoh: 25 Januari jam 12:00 -> 25 Februari jam 12:00.
 * Bila tanggal pendaftaran di akhir bulan (mis. 31 Januari), di-clamp ke hari terakhir bulan berikutnya (28/29 Februari).
 */
export function computeNextMonthlyDueDate(baseDate: Date): Date {
  const year = baseDate.getUTCFullYear();
  const month = baseDate.getUTCMonth();
  const day = baseDate.getUTCDate();
  const hours = baseDate.getUTCHours();
  const minutes = baseDate.getUTCMinutes();
  const seconds = baseDate.getUTCSeconds();
  const ms = baseDate.getUTCMilliseconds();

  const targetMonthIndex = month + 1;
  const targetYear = year + Math.floor(targetMonthIndex / 12);
  const normalizedTargetMonth = targetMonthIndex % 12;
  const daysInTargetMonth = new Date(Date.UTC(targetYear, normalizedTargetMonth + 1, 0)).getUTCDate();
  const clampedDay = Math.min(day, daysInTargetMonth);

  return new Date(
    Date.UTC(targetYear, normalizedTargetMonth, clampedDay, hours, minutes, seconds, ms)
  );
}

export function formatJakartaDateTime(isoString?: string): string {
  if (!isoString) return '-';
  const dt = new Date(isoString);
  if (Number.isNaN(dt.getTime())) return '-';
  return (
    dt.toLocaleString('id-ID', {
      timeZone: 'Asia/Jakarta',
      day: '2-digit',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }) + ' WIB'
  );
}

export function isPaymentDueNow(
  nextDueAtIso?: string,
  dueConfirmedIso?: string,
  now: Date = new Date()
): boolean {
  if (!nextDueAtIso) return false;
  const dueMs = new Date(nextDueAtIso).getTime();
  if (Number.isNaN(dueMs)) return false;
  if (dueConfirmedIso) {
    const confirmedMs = new Date(dueConfirmedIso).getTime();
    if (!Number.isNaN(confirmedMs) && confirmedMs >= dueMs) {
      return false;
    }
  }
  return now.getTime() >= dueMs;
}

export interface ChildRegistrationDraft {
  childName: string;
  childPhotoUrl: string;
  childGender: ChildGender;
  gradeLevel: string;
  packageId: PackageId;
  branchId: BranchId;
  notes?: string;
}

export interface OfflineRegistrationDraft {
  parentName: string;
  parentPhone: string;
  childName: string;
  childPhotoUrl: string;
  childGender: ChildGender;
  gradeLevel: string;
  packageId: PackageId;
  branchId: BranchId;
  billingAmount: number | '';
  initialPaymentStatus: PaymentStatus;
  paymentMethod: string;
  registeredAtLocal?: string;
  notes?: string;
}

export interface LegacyStudentMigrationDraft {
  parentName: string;
  parentPhone: string;
  childName: string;
  birthDate: string;
  childPhotoUrl: string;
  childGender: ChildGender;
  gradeLevel: string;
  schoolOrigin?: string;
  studentAddress?: string;
  packageId: PackageId;
  branchId: BranchId;
  registeredAtLocal: string;
  nextDueAtLocal?: string;
  billingAmount: number | '';
  initialPaymentStatus: PaymentStatus;
  paymentMethod: string;
  paymentPeriodLabel?: string;
  academicStatus: AcademicStatus;
  notes?: string;
  notifyWhatsappOnSave?: boolean;
}

export function formatIndonesianDate(dateStr?: string): string {
  if (!dateStr) return '-';
  const trimmed = dateStr.trim();
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(trimmed);
  const dt = match
    ? new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3])))
    : new Date(trimmed);
  if (Number.isNaN(dt.getTime())) return trimmed;
  return dt.toLocaleDateString('id-ID', {
    timeZone: 'UTC',
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  });
}

export function serializeArchiveMetaNotes(params: {
  birthDate?: string;
  schoolOrigin?: string;
  studentAddress?: string;
  userNotes?: string;
  isArchive?: boolean;
}): string {
  const parts: string[] = [];
  if (params.birthDate?.trim()) parts.push(`TglLahir=${params.birthDate.trim()}`);
  if (params.schoolOrigin?.trim()) parts.push(`Sekolah=${params.schoolOrigin.trim()}`);
  if (params.studentAddress?.trim()) parts.push(`Alamat=${params.studentAddress.trim()}`);
  const header = params.isArchive || parts.length > 0 ? `[ARSIP${parts.length ? `: ${parts.join(' | ')}` : ''}]` : '';
  const cleanUserNotes = (params.userNotes || '').replace(/\[ARSIP(?::[^\]]*)?\]\s*/g, '').trim();
  return [header, cleanUserNotes].filter(Boolean).join(' ').slice(0, 500);
}

export function parseStudentArchiveMeta(
  student: Pick<StudentRecord, 'birthDate' | 'schoolOrigin' | 'studentAddress' | 'notes' | 'registrationChannel'>
): {
  isMigration: boolean;
  birthDate?: string;
  schoolOrigin?: string;
  studentAddress?: string;
  cleanNotes?: string;
} {
  const notes = student.notes || '';
  const match = /\[ARSIP(?::\s*([^\]]*))?\]/i.exec(notes);
  let birthDate = student.birthDate?.trim() || undefined;
  let schoolOrigin = student.schoolOrigin?.trim() || undefined;
  let studentAddress = student.studentAddress?.trim() || undefined;

  if (match && match[1]) {
    const segments = match[1].split('|').map((s) => s.trim());
    for (const seg of segments) {
      if (seg.startsWith('TglLahir=') && !birthDate) {
        birthDate = seg.slice('TglLahir='.length).trim() || undefined;
      } else if (seg.startsWith('Sekolah=') && !schoolOrigin) {
        schoolOrigin = seg.slice('Sekolah='.length).trim() || undefined;
      } else if (seg.startsWith('Alamat=') && !studentAddress) {
        studentAddress = seg.slice('Alamat='.length).trim() || undefined;
      }
    }
  }

  const cleanNotes = notes.replace(/\[ARSIP(?::[^\]]*)?\]\s*/gi, '').trim() || undefined;
  const isMigration = student.registrationChannel === 'migration' || Boolean(match);
  return { isMigration, birthDate, schoolOrigin, studentAddress, cleanNotes };
}

export function normalizeWhatsappPhone(raw: string): string {
  const digits = raw.replace(/[^\d+]/g, '');
  if (!digits) return '';
  if (digits.startsWith('+62')) return digits.slice(1);
  if (digits.startsWith('62')) return digits;
  if (digits.startsWith('0')) return `62${digits.slice(1)}`;
  return digits;
}

export function validateChildDraft(
  draft: ChildRegistrationDraft,
  index: number
): string[] {
  const errors: string[] = [];
  const label = `Anak ke-${index + 1}`;
  const childName = draft.childName.trim();
  const gradeLevel = draft.gradeLevel.trim();
  const photoUrl = (draft.childPhotoUrl || '').trim();

  if (childName.length < 2 || childName.length > 120) {
    errors.push(`${label}: Nama anak wajib diisi (2–120 karakter).`);
  }
  if (!/^https?:\/\/.+/i.test(photoUrl)) {
    errors.push(`${label}: Foto anak wajib diunggah (ukuran bebas) melalui Cloudinary.`);
  }
  if (!['Laki-laki', 'Perempuan'].includes(draft.childGender)) {
    errors.push(`${label}: Jenis kelamin anak wajib dipilih.`);
  }
  if (gradeLevel.length < 2 || gradeLevel.length > 60) {
    errors.push(`${label}: Kelas/tingkat wajib diisi (2–60 karakter).`);
  }
  if (!['paket-1', 'paket-2', 'paket-3'].includes(draft.packageId)) {
    errors.push(`${label}: Paket belajar harus dipilih dari tiga paket resmi.`);
  }
  if (!['indramayu-kota', 'terisi'].includes(draft.branchId)) {
    errors.push(`${label}: Cabang pilihan tidak valid.`);
  }
  if (draft.notes && draft.notes.trim().length > 500) {
    errors.push(`${label}: Catatan maksimal 500 karakter.`);
  }
  return errors;
}

export function validateMultiChildSubmission(input: {
  parentName: string;
  parentPhone: string;
  children: ChildRegistrationDraft[];
}): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  if (input.parentName.trim().length < 2 || input.parentName.trim().length > 120) {
    errors.push('Nama orang tua wajib diisi (2–120 karakter).');
  }
  const cleanDigits = input.parentPhone.replace(/\D/g, '');
  if (cleanDigits.length < 8 || cleanDigits.length > 20) {
    errors.push('Nomor WhatsApp / kontak orang tua wajib valid (minimal 8 digit).');
  }
  if (!Array.isArray(input.children) || input.children.length === 0) {
    errors.push('Minimal harus ada satu data anak yang didaftarkan.');
  } else if (input.children.length > 10) {
    errors.push('Maksimal 10 anak dalam satu kali pengiriman formulir.');
  } else {
    input.children.forEach((child, idx) => {
      errors.push(...validateChildDraft(child, idx));
    });
  }
  return { valid: errors.length === 0, errors };
}

export function validateOfflineRegistrationDraft(
  draft: OfflineRegistrationDraft
): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  if (draft.parentName.trim().length < 2 || draft.parentName.trim().length > 120) {
    errors.push('Nama orang tua wajib diisi (2–120 karakter).');
  }
  const cleanDigits = draft.parentPhone.replace(/\D/g, '');
  if (cleanDigits.length < 8 || cleanDigits.length > 20) {
    errors.push('Nomor telepon / WhatsApp aktif wajib valid (minimal 8 digit).');
  }
  if (draft.childName.trim().length < 2 || draft.childName.trim().length > 120) {
    errors.push('Nama anak wajib diisi (2–120 karakter).');
  }
  if (!/^https?:\/\/.+/i.test((draft.childPhotoUrl || '').trim())) {
    errors.push('Foto anak (ukuran bebas) wajib diunggah ke Cloudinary.');
  }
  if (!['Laki-laki', 'Perempuan'].includes(draft.childGender)) {
    errors.push('Jenis kelamin anak wajib dipilih.');
  }
  if (draft.gradeLevel.trim().length < 2 || draft.gradeLevel.trim().length > 60) {
    errors.push('Kelas / tingkat wajib diisi.');
  }
  if (!['paket-1', 'paket-2', 'paket-3'].includes(draft.packageId)) {
    errors.push('Paket belajar harus dipilih.');
  }
  if (!['indramayu-kota', 'terisi'].includes(draft.branchId)) {
    errors.push('Cabang harus dipilih.');
  }
  if (draft.billingAmount === '' || Number.isNaN(Number(draft.billingAmount)) || Number(draft.billingAmount) < 0) {
    errors.push('Nominal yang harus dibayar wajib diisi (>= 0).');
  }
  if (!['lunas', 'cicilan', 'belum_bayar'].includes(draft.initialPaymentStatus)) {
    errors.push('Status pembayaran (Lunas / Cicilan / Belum Bayar) wajib dipilih.');
  }
  return { valid: errors.length === 0, errors };
}

export function validateLegacyMigrationDraft(
  draft: LegacyStudentMigrationDraft
): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  if (draft.childName.trim().length < 2 || draft.childName.trim().length > 120) {
    errors.push('Nama lengkap siswa wajib diisi (2–120 karakter).');
  }
  if (draft.birthDate.trim()) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(draft.birthDate.trim())) {
      errors.push('Format tanggal lahir siswa tidak valid (gunakan YYYY-MM-DD).');
    } else {
      const dob = new Date(`${draft.birthDate.trim()}T00:00:00Z`);
      if (Number.isNaN(dob.getTime()) || dob.getTime() > Date.now()) {
        errors.push('Tanggal lahir siswa tidak valid atau melebihi hari ini.');
      }
    }
  }
  if (draft.childPhotoUrl.trim() && !/^https?:\/\/.+/i.test(draft.childPhotoUrl.trim())) {
    errors.push('URL foto siswa harus berupa tautan Cloudinary yang valid.');
  }
  if (!['Laki-laki', 'Perempuan'].includes(draft.childGender)) {
    errors.push('Jenis kelamin siswa wajib dipilih.');
  }
  if (draft.gradeLevel.trim().length < 1 || draft.gradeLevel.trim().length > 60) {
    errors.push('Kelas / tingkat pendidikan siswa wajib diisi.');
  }
  if (draft.parentName.trim().length < 2 || draft.parentName.trim().length > 120) {
    errors.push('Nama orang tua / wali wajib diisi (2–120 karakter).');
  }
  const cleanDigits = draft.parentPhone.replace(/\D/g, '');
  if (cleanDigits.length < 8 || cleanDigits.length > 20) {
    errors.push('Kontak / WhatsApp orang tua wajib valid (minimal 8 digit).');
  }
  if (!['paket-1', 'paket-2', 'paket-3'].includes(draft.packageId)) {
    errors.push('Paket belajar resmi wajib dipilih.');
  }
  if (!['indramayu-kota', 'terisi'].includes(draft.branchId)) {
    errors.push('Cabang (Pusat Indramayu Kota atau Cabang Terisi) wajib dipilih.');
  }
  if (!draft.registeredAtLocal || Number.isNaN(new Date(draft.registeredAtLocal).getTime())) {
    errors.push('Tanggal masuk siswa wajib diisi dengan format tanggal yang valid.');
  }
  if (draft.billingAmount === '' || Number.isNaN(Number(draft.billingAmount)) || Number(draft.billingAmount) < 0) {
    errors.push('Nominal tagihan wajib diisi (>= 0).');
  }
  if (!['lunas', 'cicilan', 'belum_bayar'].includes(draft.initialPaymentStatus)) {
    errors.push('Status tagihan / pembayaran wajib dipilih.');
  }
  return { valid: errors.length === 0, errors };
}

export function filterAndSplitStudentsByBranch(
  students: StudentRecord[],
  filters: {
    searchQuery?: string;
    branchFilter?: 'all' | BranchId;
    statusFilter?: 'all' | RegistrationStatus;
    packageFilter?: 'all' | PackageId;
    channelFilter?: 'all' | RegistrationChannel;
  }
): {
  filtered: StudentRecord[];
  pusat: StudentRecord[];
  cabang: StudentRecord[];
} {
  const q = (filters.searchQuery || '').trim().toLowerCase();
  const filtered = students.filter((s) => {
    if (filters.branchFilter && filters.branchFilter !== 'all' && s.branchId !== filters.branchFilter) {
      return false;
    }
    if (filters.statusFilter && filters.statusFilter !== 'all' && s.status !== filters.statusFilter) {
      return false;
    }
    if (filters.packageFilter && filters.packageFilter !== 'all' && s.packageId !== filters.packageFilter) {
      return false;
    }
    const meta = parseStudentArchiveMeta(s);
    if (filters.channelFilter && filters.channelFilter !== 'all') {
      const effectiveChannel: RegistrationChannel = meta.isMigration
        ? 'migration'
        : s.registrationChannel || 'online';
      if (effectiveChannel !== filters.channelFilter) return false;
    }
    if (!q) return true;
    return (
      s.childName.toLowerCase().includes(q) ||
      s.parentName.toLowerCase().includes(q) ||
      s.parentEmail.toLowerCase().includes(q) ||
      s.parentPhone.toLowerCase().includes(q) ||
      (meta.schoolOrigin || '').toLowerCase().includes(q) ||
      (meta.studentAddress || '').toLowerCase().includes(q)
    );
  });

  const pusat = filtered.filter((s) => s.branchId === 'indramayu-kota');
  const cabang = filtered.filter((s) => s.branchId === 'terisi');
  return { filtered, pusat, cabang };
}

export function buildRegistrationNotificationMessage(params: {
  parentName: string;
  parentPhone?: string;
  childName: string;
  childGender?: string;
  gradeLevel: string;
  packageName: string;
  branchName: string;
  billingAmount?: number | null;
  nextDueAtIso?: string;
  channel?: RegistrationChannel;
  paymentStatusLabel?: string;
  appUrl: string;
}): string {
  const cleanBase = params.appUrl.replace(/\/+$/, '');
  const title =
    params.channel === 'migration'
      ? '📂 PINDAH DATA SISWA LAMA (ARSIP) — TOMOYO EDUCATION'
      : params.channel === 'offline'
      ? '📝 PENDAFTARAN SISWA OFFLINE (ADMIN) — TOMOYO EDUCATION'
      : '🔔 PENDAFTARAN SISWA BARU — TOMOYO EDUCATION';
  const statusText =
    params.channel === 'migration'
      ? 'TERDAFTAR DARI ARSIP BERKAS (AKTIF)'
      : params.channel === 'offline'
      ? 'TERDAFTAR OFFLINE (DISETUJUI ADMIN)'
      : 'MENUNGGU PERSETUJUAN';
  const lines = [
    title,
    '',
    `Nama Orang Tua: ${params.parentName}`,
    ...(params.parentPhone ? [`No. HP/WA Aktif: ${params.parentPhone}`] : []),
    `Nama Siswa: ${params.childName}`,
    ...(params.childGender ? [`Jenis Kelamin: ${params.childGender}`] : []),
    `Kelas: ${params.gradeLevel}`,
    `Program: ${params.packageName}`,
    `Cabang: ${params.branchName}`,
    ...(typeof params.billingAmount === 'number'
      ? [`Nominal Paket: ${formatRupiah(params.billingAmount)}`]
      : []),
    ...(params.paymentStatusLabel ? [`Status Pembayaran: ${params.paymentStatusLabel}`] : []),
    ...(params.nextDueAtIso
      ? [`Jadwal Jatuh Tempo Berikutnya: ${formatJakartaDateTime(params.nextDueAtIso)}`]
      : []),
    `Status: ${statusText}`,
    '',
    'Silakan periksa data siswa melalui dashboard admin:',
    `${cleanBase}/admintomoyo`,
  ];
  return lines.join('\n');
}

export function buildPaymentDueNotificationMessage(params: {
  childName: string;
  parentName: string;
  parentPhone: string;
  packageName: string;
  branchName: string;
  registeredAtIso?: string;
  dueAtIso: string;
  billingAmount?: number | null;
  appUrl: string;
}): string {
  const cleanBase = params.appUrl.replace(/\/+$/, '');
  return [
    '⏰ PENGINGAT PEMBAYARAN JATUH TEMPO — TOMOYO EDUCATION',
    '',
    `Siswa: ${params.childName}`,
    `Orang Tua: ${params.parentName} (${params.parentPhone})`,
    `Program: ${params.packageName}`,
    `Cabang: ${params.branchName}`,
    ...(params.registeredAtIso
      ? [`Tanggal Daftar: ${formatJakartaDateTime(params.registeredAtIso)}`]
      : []),
    `Waktu Jatuh Tempo: ${formatJakartaDateTime(params.dueAtIso)}`,
    ...(typeof params.billingAmount === 'number' && params.billingAmount > 0
      ? [`Nominal Tagihan: ${formatRupiah(params.billingAmount)}`]
      : []),
    '',
    'Status: JATUH TEMPO PEMBAYARAN — HARUS DIKONFIRMASI ADMIN.',
    `Konfirmasi melalui Dashboard Admin: ${cleanBase}/admintomoyo`,
  ].join('\n');
}

export function formatPackageOptionLabel(pkg: LearningPackage): string {
  return `${pkg.title} — ${pkg.programType}`;
}

export function getStatusLabel(status: RegistrationStatus): string {
  switch (status) {
    case 'approved':
      return 'Disetujui';
    case 'rejected':
      return 'Ditolak';
    default:
      return 'Menunggu Persetujuan';
  }
}

export function getAcademicStatusLabel(status: AcademicStatus): string {
  switch (status) {
    case 'aktif':
      return 'Aktif';
    case 'lulus':
      return 'Lulus';
    case 'nonaktif':
      return 'Nonaktif';
    default:
      return 'Menunggu';
  }
}

export function getPaymentStatusLabel(status: PaymentStatus): string {
  switch (status) {
    case 'lunas':
      return 'Lunas';
    case 'cicilan':
      return 'Cicilan';
    default:
      return 'Belum Bayar';
  }
}

export interface FormattedFirebaseAuthError {
  code: string;
  message: string;
  unauthorizedDomain: string | null;
}

export function formatFirebaseAuthError(
  error: unknown,
  currentHostname?: string
): FormattedFirebaseAuthError {
  const codeFromObj =
    typeof error === 'object' && error !== null && 'code' in error
      ? String((error as { code?: unknown }).code || '')
      : '';
  const rawMessage = error instanceof Error ? error.message : String(error || '');
  const code =
    codeFromObj ||
    (rawMessage.includes('auth/unauthorized-domain')
      ? 'auth/unauthorized-domain'
      : '');
  const host = (currentHostname || '').trim();

  if (code === 'auth/unauthorized-domain') {
    return {
      code,
      unauthorizedDomain: host || null,
      message: host
        ? `Domain "${host}" belum masuk ke daftar Authorized Domains di Firebase Authentication (project tomoyoindramayu).`
        : 'Domain saat ini belum masuk ke daftar Authorized Domains di Firebase Authentication (project tomoyoindramayu).',
    };
  }

  if (code === 'auth/popup-closed-by-user') {
    return {
      code,
      unauthorizedDomain: null,
      message: 'Jendela login Google ditutup sebelum proses selesai.',
    };
  }

  if (code === 'auth/cancelled-popup-request') {
    return {
      code,
      unauthorizedDomain: null,
      message: 'Permintaan login Google sebelumnya dibatalkan. Silakan klik tombol masuk sekali lagi.',
    };
  }

  if (code === 'auth/network-request-failed') {
    return {
      code,
      unauthorizedDomain: null,
      message: 'Koneksi jaringan ke layanan Google/Firebase terputus. Periksa internet Anda lalu coba lagi.',
    };
  }

  return {
    code,
    unauthorizedDomain: null,
    message: rawMessage || 'Terjadi kesalahan saat masuk dengan Google.',
  };
}

