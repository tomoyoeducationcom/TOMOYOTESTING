import fs from 'fs';
import path from 'path';
import {
  ADMIN_WHATSAPP_TARGET,
  buildPaymentDueNotificationMessage,
} from '../lib/domain';

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

const sentIdempotencyKeys = new Set<string>();
const IDEMPOTENCY_DIR = path.resolve(process.cwd(), '.data');
const IDEMPOTENCY_FILE = path.join(IDEMPOTENCY_DIR, 'fonnte-idempotency.json');
const DUE_REMINDERS_FILE = path.join(IDEMPOTENCY_DIR, 'due-reminders.json');

let dueJobsCache: DueReminderJob[] = [];

function loadPersistedKeys() {
  try {
    if (fs.existsSync(IDEMPOTENCY_FILE)) {
      const raw = fs.readFileSync(IDEMPOTENCY_FILE, 'utf-8');
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        for (const key of parsed) {
          if (typeof key === 'string') {
            sentIdempotencyKeys.add(key);
          }
        }
      }
    }
  } catch {
    // Fallback to in-memory set if filesystem is read-only (e.g. serverless)
  }
}

function loadPersistedDueJobs() {
  try {
    if (fs.existsSync(DUE_REMINDERS_FILE)) {
      const raw = fs.readFileSync(DUE_REMINDERS_FILE, 'utf-8');
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        dueJobsCache = parsed;
      }
    }
  } catch {
    dueJobsCache = [];
  }
}

function saveDueJobs() {
  try {
    if (!fs.existsSync(IDEMPOTENCY_DIR)) {
      fs.mkdirSync(IDEMPOTENCY_DIR, { recursive: true });
    }
    fs.writeFileSync(DUE_REMINDERS_FILE, JSON.stringify(dueJobsCache, null, 2), 'utf-8');
  } catch {
    // Non-fatal in read-only environments
  }
}

function persistKey(key: string) {
  sentIdempotencyKeys.add(key);
  try {
    if (!fs.existsSync(IDEMPOTENCY_DIR)) {
      fs.mkdirSync(IDEMPOTENCY_DIR, { recursive: true });
    }
    const items = Array.from(sentIdempotencyKeys).slice(-1000);
    fs.writeFileSync(IDEMPOTENCY_FILE, JSON.stringify(items, null, 2), 'utf-8');
  } catch {
    // Non-fatal in read-only environments
  }
}

loadPersistedKeys();
loadPersistedDueJobs();

export function isFonnteConfigured(): boolean {
  const token = process.env.FONNTE_TOKEN;
  return typeof token === 'string' && token.trim().length > 0;
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
  const token = process.env.FONNTE_TOKEN?.trim();

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

      lastError =
        parsed?.reason ||
        parsed?.detail ||
        `Fonnte merespons HTTP ${response.status} dengan status gagal.`;

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

    // Avoid retrying failed/unconfigured automatically more often than once every 15 minutes
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
