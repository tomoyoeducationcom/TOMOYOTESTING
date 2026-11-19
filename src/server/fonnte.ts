import {
  ADMIN_WHATSAPP_TARGET,
  FONNTE_SENDER_NUMBER,
  buildPaymentDueNotificationMessage,
} from '../lib/domain';
import { readJsonData, writeJsonData } from './storage';

export interface FonnteDeliveryResult {
  status: 'sent' | 'failed' | 'unconfigured' | 'skipped_duplicate';
  target: string;
  detail: string;
  providerStatus?: boolean;
}

export interface DueReminderJob {
  studentId: string;
  parentId: string;
  childName: string;
  parentName: string;
  parentPhone: string;
  packageName: string;
  branchName: string;
  registeredAtIso: string;
  dueAtIso: string;
  billingAmount?: number | null;
  status: 'scheduled' | 'notified' | 'confirmed';
  lastNotifiedAtIso?: string;
  lastConfirmedAtIso?: string;
  lastAttemptAtIso?: string;
  lastDeliveryStatus?: FonnteDeliveryResult['status'];
  lastDeliveryDetail?: string;
}

const IDEMPOTENCY_FILENAME = 'fonnte-idempotency.json';
const DUE_REMINDERS_FILENAME = 'due-reminders.json';

const sentIdempotencyKeys = new Set<string>(readJsonData<string[]>(IDEMPOTENCY_FILENAME, []));
let dueJobsCache: DueReminderJob[] = readJsonData<DueReminderJob[]>(DUE_REMINDERS_FILENAME, []);

function saveDueJobs() {
  writeJsonData(DUE_REMINDERS_FILENAME, dueJobsCache);
}

function persistKey(key: string) {
  sentIdempotencyKeys.add(key);
  const items = Array.from(sentIdempotencyKeys).slice(-2000);
  writeJsonData(IDEMPOTENCY_FILENAME, items);
}

export function sanitizeFonnteToken(raw: unknown): string {
  if (typeof raw !== 'string') return '';
  let cleaned = raw.trim();
  if (
    (cleaned.startsWith('"') && cleaned.endsWith('"')) ||
    (cleaned.startsWith("'") && cleaned.endsWith("'"))
  ) {
    cleaned = cleaned.slice(1, -1).trim();
  }
  cleaned = cleaned.replace(/^Bearer\s+/i, '').trim();
  return cleaned;
}

export function formatFonnteFailureDetail(rawDetail: string): string {
  const clean = rawDetail.trim();
  if (/unknown\s+token/i.test(clean)) {
    return `unknown token — Token device Fonnte ditolak oleh api.fonnte.com. Pastikan environment variable FONNTE_TOKEN di Vercel (scope Production) diisi dengan Device Token resmi untuk nomor 083121902760 (${FONNTE_SENDER_NUMBER}) — bukan Account Token — tanpa tanda kutip/spasi, lalu lakukan Redeploy tanpa cache.`;
  }
  if (/disconnect|not\s+connected|device\s+not\s+ready/i.test(clean)) {
    return `${clean} — Perangkat WhatsApp ${FONNTE_SENDER_NUMBER} di dashboard Fonnte sedang terputus; silakan scan ulang QR WhatsApp di Fonnte.`;
  }
  return clean;
}

export function isFonnteConfigured(): boolean {
  return sanitizeFonnteToken(process.env.FONNTE_TOKEN).length > 0;
}

export function hasIdempotencyKey(key: string): boolean {
  return sentIdempotencyKeys.has(key);
}

export async function sendFonnteWhatsApp(params: {
  message: string;
  idempotencyKey?: string;
  target?: string;
  scheduleTimestampSec?: number;
}): Promise<FonnteDeliveryResult> {
  const target = params.target || ADMIN_WHATSAPP_TARGET;
  const token = sanitizeFonnteToken(process.env.FONNTE_TOKEN);

  if (!token) {
    return {
      status: 'unconfigured',
      target,
      detail: 'FONNTE_TOKEN belum dikonfigurasi di environment backend.',
    };
  }

  if (params.idempotencyKey && sentIdempotencyKeys.has(params.idempotencyKey)) {
    return {
      status: 'skipped_duplicate',
      target,
      detail: 'Notifikasi ini sudah dikirim sebelumnya (idempotency).',
    };
  }

  const maxAttempts = 2;
  let lastError = 'Gagal mengirim notifikasi WhatsApp melalui Fonnte.';

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const formParams: Record<string, string> = {
        target,
        message: params.message,
        countryCode: '62',
      };
      if (
        typeof params.scheduleTimestampSec === 'number' &&
        params.scheduleTimestampSec > Math.floor(Date.now() / 1000) + 30
      ) {
        formParams.schedule = String(Math.floor(params.scheduleTimestampSec));
      }
      const body = new URLSearchParams(formParams);

      const response = await fetch('https://api.fonnte.com/send', {
        method: 'POST',
        headers: {
          Authorization: token,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: body.toString(),
        signal: AbortSignal.timeout(10000),
      });

      const text = await response.text();
      let parsed: { status?: boolean; reason?: string; detail?: string } | null = null;
      try {
        parsed = JSON.parse(text) as { status?: boolean; reason?: string; detail?: string };
      } catch {
        parsed = null;
      }

      if (response.ok && parsed && parsed.status === true) {
        if (params.idempotencyKey) {
          persistKey(params.idempotencyKey);
        }
        return {
          status: 'sent',
          target,
          providerStatus: true,
          detail: parsed.detail || 'Pesan berhasil dikirim oleh Fonnte.',
        };
      }

      const rawError =
        parsed?.reason ||
        parsed?.detail ||
        `Fonnte merespons HTTP ${response.status} dengan status gagal.`;
      lastError = formatFonnteFailureDetail(rawError);

      if (response.status < 500) {
        break;
      }
    } catch (error) {
      lastError =
        error instanceof Error ? error.message : 'Koneksi atau timeout saat menghubungi Fonnte.';
    }
  }

  return {
    status: 'failed',
    target,
    providerStatus: false,
    detail: lastError,
  };
}

export async function checkFonnteDeviceStatus(): Promise<{
  configured: boolean;
  connected: boolean;
  senderNumber: string;
  deviceNumber?: string;
  deviceName?: string;
  detail: string;
  deviceStatus?: string;
  quota?: string;
  tokenLength?: number;
}> {
  const token = sanitizeFonnteToken(process.env.FONNTE_TOKEN);
  if (!token) {
    return {
      configured: false,
      connected: false,
      senderNumber: FONNTE_SENDER_NUMBER,
      detail: 'FONNTE_TOKEN belum dikonfigurasi pada environment backend.',
    };
  }

  try {
    const response = await fetch('https://api.fonnte.com/device', {
      method: 'POST',
      headers: {
        Authorization: token,
      },
      signal: AbortSignal.timeout(8000),
    });
    const text = await response.text();
    let parsed: {
      status?: boolean;
      device?: string;
      name?: string;
      device_status?: string;
      quota?: string;
      reason?: string;
      detail?: string;
    } | null = null;
    try {
      parsed = JSON.parse(text);
    } catch {
      parsed = null;
    }

    if (response.ok && parsed && parsed.status === true) {
      const devStatus = parsed.device_status || 'connect';
      const connected = /connect/i.test(devStatus) && !/disconnect/i.test(devStatus);
      return {
        configured: true,
        connected,
        senderNumber: FONNTE_SENDER_NUMBER,
        deviceNumber: parsed.device ? String(parsed.device) : undefined,
        deviceName: parsed.name ? String(parsed.name) : undefined,
        deviceStatus: devStatus,
        quota: parsed.quota ? String(parsed.quota) : undefined,
        tokenLength: token.length,
        detail: connected
          ? `Perangkat Fonnte terhubung (${devStatus})${parsed.device ? ` — Nomor terdaftar: ${parsed.device}` : ''}.`
          : `Perangkat Fonnte berstatus: ${devStatus}.`,
      };
    }

    const rawErr = parsed?.reason || parsed?.detail || `HTTP ${response.status} dari Fonnte device check.`;
    return {
      configured: true,
      connected: false,
      senderNumber: FONNTE_SENDER_NUMBER,
      tokenLength: token.length,
      detail: formatFonnteFailureDetail(rawErr),
    };
  } catch (err) {
    return {
      configured: true,
      connected: false,
      senderNumber: FONNTE_SENDER_NUMBER,
      tokenLength: token.length,
      detail: err instanceof Error ? err.message : 'Gagal mengecek status perangkat Fonnte.',
    };
  }
}

export async function fetchFonnteGroupRefresh(): Promise<{
  ok: boolean;
  configured: boolean;
  detail: string;
}> {
  const token = sanitizeFonnteToken(process.env.FONNTE_TOKEN);
  if (!token) {
    return {
      ok: false,
      configured: false,
      detail: 'FONNTE_TOKEN belum dikonfigurasi di environment backend.',
    };
  }

  try {
    const response = await fetch('https://api.fonnte.com/fetch-group', {
      method: 'POST',
      headers: {
        Authorization: token,
      },
      signal: AbortSignal.timeout(12000),
    });
    const text = await response.text();
    let parsed: { status?: boolean; reason?: string; detail?: string } | null = null;
    try {
      parsed = JSON.parse(text);
    } catch {
      parsed = null;
    }
    if (response.ok && parsed && parsed.status === true) {
      return {
        ok: true,
        configured: true,
        detail: parsed.detail || 'Daftar grup WhatsApp berhasil disinkronkan dari Fonnte.',
      };
    }
    return {
      ok: false,
      configured: true,
      detail: formatFonnteFailureDetail(
        parsed?.reason || parsed?.detail || `Gagal fetch-group Fonnte (HTTP ${response.status}).`
      ),
    };
  } catch (err) {
    return {
      ok: false,
      configured: true,
      detail: err instanceof Error ? err.message : 'Koneksi ke Fonnte fetch-group gagal.',
    };
  }
}

export async function getFonnteWhatsappGroups(): Promise<{
  ok: boolean;
  configured: boolean;
  detail: string;
  groups: Array<{ id: string; name: string }>;
}> {
  const token = sanitizeFonnteToken(process.env.FONNTE_TOKEN);
  if (!token) {
    return {
      ok: false,
      configured: false,
      detail: 'FONNTE_TOKEN belum dikonfigurasi di environment backend.',
      groups: [],
    };
  }

  try {
    const response = await fetch('https://api.fonnte.com/get-whatsapp-group', {
      method: 'POST',
      headers: {
        Authorization: token,
      },
      signal: AbortSignal.timeout(12000),
    });
    const text = await response.text();
    let parsed: {
      status?: boolean;
      reason?: string;
      detail?: string;
      data?: Array<Record<string, unknown>>;
    } | null = null;
    try {
      parsed = JSON.parse(text);
    } catch {
      parsed = null;
    }

    if (response.ok && parsed && parsed.status === true) {
      const rawList = Array.isArray(parsed.data) ? parsed.data : [];
      const groups: Array<{ id: string; name: string }> = [];
      for (const item of rawList) {
        const id = String(item.id || item.target || item.jid || '').trim();
        const name = String(item.name || item.subject || item.title || id).trim();
        if (id) {
          groups.push({ id, name: name || id });
        }
      }
      return {
        ok: true,
        configured: true,
        detail:
          groups.length > 0
            ? `Berhasil memuat ${groups.length} grup WhatsApp dari Fonnte.`
            : 'Tidak ada grup WhatsApp yang ditemukan. Coba tekan Sinkronkan Grup terlebih dahulu.',
        groups,
      };
    }

    return {
      ok: false,
      configured: true,
      detail: formatFonnteFailureDetail(
        parsed?.reason || parsed?.detail || `Gagal mengambil grup (HTTP ${response.status}).`
      ),
      groups: [],
    };
  } catch (err) {
    return {
      ok: false,
      configured: true,
      detail: err instanceof Error ? err.message : 'Gagal menghubungi Fonnte get-whatsapp-group.',
      groups: [],
    };
  }
}

export function upsertDueReminder(input: {
  studentId: string;
  parentId: string;
  childName: string;
  parentName: string;
  parentPhone: string;
  packageName: string;
  branchName: string;
  registeredAtIso: string;
  dueAtIso: string;
  billingAmount?: number | null;
  confirmedIso?: string;
  notifiedIso?: string;
}): DueReminderJob {
  const idx = dueJobsCache.findIndex((j) => j.studentId === input.studentId);
  const existing = idx >= 0 ? dueJobsCache[idx] : undefined;

  let nextStatus: DueReminderJob['status'] = 'scheduled';
  if (existing && existing.dueAtIso === input.dueAtIso) {
    nextStatus = existing.status;
  }
  if (input.confirmedIso) {
    const confMs = new Date(input.confirmedIso).getTime();
    const dueMs = new Date(input.dueAtIso).getTime();
    if (!Number.isNaN(confMs) && !Number.isNaN(dueMs) && confMs >= dueMs) {
      nextStatus = 'confirmed';
    }
  } else if (input.notifiedIso && nextStatus === 'scheduled') {
    const notifMs = new Date(input.notifiedIso).getTime();
    const dueMs = new Date(input.dueAtIso).getTime();
    if (!Number.isNaN(notifMs) && !Number.isNaN(dueMs) && notifMs >= dueMs) {
      nextStatus = 'notified';
    }
  }

  const merged: DueReminderJob = {
    studentId: input.studentId,
    parentId: input.parentId,
    childName: input.childName,
    parentName: input.parentName,
    parentPhone: input.parentPhone,
    packageName: input.packageName,
    branchName: input.branchName,
    registeredAtIso: input.registeredAtIso,
    dueAtIso: input.dueAtIso,
    billingAmount: input.billingAmount ?? existing?.billingAmount ?? null,
    status: nextStatus,
    lastNotifiedAtIso: existing?.lastNotifiedAtIso || input.notifiedIso,
    lastConfirmedAtIso: existing?.lastConfirmedAtIso || input.confirmedIso,
    lastAttemptAtIso: existing?.lastAttemptAtIso,
    lastDeliveryStatus: existing?.lastDeliveryStatus,
    lastDeliveryDetail: existing?.lastDeliveryDetail,
  };

  if (idx >= 0) {
    dueJobsCache[idx] = merged;
  } else {
    dueJobsCache.push(merged);
  }
  saveDueJobs();
  return merged;
}

export function confirmDueReminder(
  studentId: string,
  nextDueAtIso: string,
  confirmedAtIso: string
): DueReminderJob | null {
  const idx = dueJobsCache.findIndex((j) => j.studentId === studentId);
  if (idx < 0) return null;
  const current = dueJobsCache[idx];
  const updated: DueReminderJob = {
    ...current,
    dueAtIso: nextDueAtIso,
    status: 'scheduled',
    lastConfirmedAtIso: confirmedAtIso,
    lastDeliveryStatus: undefined,
    lastDeliveryDetail: undefined,
    lastAttemptAtIso: undefined,
  };
  dueJobsCache[idx] = updated;
  saveDueJobs();
  return updated;
}

export function listDueReminders(): DueReminderJob[] {
  return [...dueJobsCache];
}

export async function processDueRemindersNow(appUrl: string): Promise<
  Array<{
    studentId: string;
    parentId: string;
    childName: string;
    dueAtIso: string;
    status: FonnteDeliveryResult['status'];
    detail: string;
    target: string;
    messagePreview: string;
  }>
> {
  const nowMs = Date.now();
  const triggered: Array<{
    studentId: string;
    parentId: string;
    childName: string;
    dueAtIso: string;
    status: FonnteDeliveryResult['status'];
    detail: string;
    target: string;
    messagePreview: string;
  }> = [];

  for (let i = 0; i < dueJobsCache.length; i++) {
    const job = dueJobsCache[i];
    if (job.status !== 'scheduled') continue;

    const dueMs = new Date(job.dueAtIso).getTime();
    if (Number.isNaN(dueMs) || nowMs < dueMs) continue;

    if (job.lastAttemptAtIso) {
      const lastAttemptMs = new Date(job.lastAttemptAtIso).getTime();
      if (!Number.isNaN(lastAttemptMs) && nowMs - lastAttemptMs < 15 * 60 * 1000) {
        continue;
      }
    }

    const message = buildPaymentDueNotificationMessage({
      childName: job.childName,
      parentName: job.parentName,
      parentPhone: job.parentPhone,
      packageName: job.packageName,
      branchName: job.branchName,
      registeredAtIso: job.registeredAtIso,
      dueAtIso: job.dueAtIso,
      billingAmount: job.billingAmount,
      appUrl,
    });

    const delivery = await sendFonnteWhatsApp({
      message,
      idempotencyKey: `due_${job.studentId}_${job.dueAtIso}`,
    });

    const nowIso = new Date().toISOString();
    dueJobsCache[i] = {
      ...job,
      lastAttemptAtIso: nowIso,
      lastDeliveryStatus: delivery.status,
      lastDeliveryDetail: delivery.detail,
      ...(delivery.status === 'sent' || delivery.status === 'skipped_duplicate'
        ? { status: 'notified', lastNotifiedAtIso: nowIso }
        : {}),
    };

    triggered.push({
      studentId: job.studentId,
      parentId: job.parentId,
      childName: job.childName,
      dueAtIso: job.dueAtIso,
      status: delivery.status,
      detail: delivery.detail,
      target: delivery.target,
      messagePreview: message.slice(0, 480),
    });
  }

  if (triggered.length > 0) {
    saveDueJobs();
  }
  return triggered;
}
