import crypto from 'crypto';
import { ADMIN_WHATSAPP_TARGET } from '../lib/domain';
import {
  INITIAL_WA_TEMPLATES,
  type WaAutomationSettings,
  type WaCampaignRecord,
  type WaGroupRecord,
  type WaGroupSendLog,
  type WaOptOutRecord,
  type WaQueueItem,
  type WaRecipientInput,
  type WaTemplateCategory,
  type WaTemplateRecord,
  WA_TEMPLATE_CATEGORIES,
  buildCampaignReportCsv,
  deduplicateAndFilterRecipients,
  recalculateCampaignCounts,
  renderTemplateVariables,
} from '../lib/quizAndWaDomain';
import {
  checkFonnteDeviceStatus,
  fetchFonnteGroupRefresh,
  getFonnteWhatsappGroups,
  isFonnteConfigured,
  sendFonnteWhatsApp,
} from './fonnte';
import { readJsonData, writeJsonData } from './storage';

const WA_GROUPS_FILE = 'wa-groups.json';
const WA_GROUP_LOGS_FILE = 'wa-group-logs.json';
const WA_TEMPLATES_FILE = 'wa-templates.json';
const WA_CAMPAIGNS_FILE = 'wa-campaigns.json';
const WA_OPTOUTS_FILE = 'wa-optouts.json';
const WA_SETTINGS_FILE = 'wa-settings.json';

function loadGroups(): WaGroupRecord[] {
  return readJsonData<WaGroupRecord[]>(WA_GROUPS_FILE, []);
}

function saveGroups(groups: WaGroupRecord[]) {
  writeJsonData(WA_GROUPS_FILE, groups);
}

function loadGroupLogs(): WaGroupSendLog[] {
  return readJsonData<WaGroupSendLog[]>(WA_GROUP_LOGS_FILE, []);
}

function saveGroupLogs(logs: WaGroupSendLog[]) {
  writeJsonData(WA_GROUP_LOGS_FILE, logs.slice(0, 200));
}

export function listSavedWaGroups(): {
  groups: WaGroupRecord[];
  logs: WaGroupSendLog[];
} {
  return {
    groups: loadGroups(),
    logs: loadGroupLogs(),
  };
}

export async function refreshWaGroupsFromFonnte(triggerFetchGroup: boolean): Promise<{
  ok: boolean;
  configured: boolean;
  detail: string;
  groups: WaGroupRecord[];
}> {
  if (triggerFetchGroup) {
    const fetchRes = await fetchFonnteGroupRefresh();
    if (!fetchRes.ok) {
      return {
        ok: false,
        configured: fetchRes.configured,
        detail: fetchRes.detail,
        groups: loadGroups(),
      };
    }
  }

  const listRes = await getFonnteWhatsappGroups();
  if (!listRes.ok) {
    return {
      ok: false,
      configured: listRes.configured,
      detail: listRes.detail,
      groups: loadGroups(),
    };
  }

  const existing = loadGroups();
  const pinnedMap = new Map(existing.map((g) => [g.id, g.pinned]));
  const nowIso = new Date().toISOString();
  const merged: WaGroupRecord[] = listRes.groups.map((g) => ({
    id: g.id,
    name: g.name,
    pinned: pinnedMap.get(g.id) ?? false,
    lastSyncedIso: nowIso,
  }));
  saveGroups(merged);

  return {
    ok: true,
    configured: true,
    detail: listRes.detail,
    groups: merged,
  };
}

export function updatePinnedWaGroups(pinnedIds: string[]): WaGroupRecord[] {
  const pinnedSet = new Set(pinnedIds);
  const current = loadGroups();
  const next = current.map((g) => ({
    ...g,
    pinned: pinnedSet.has(g.id),
  }));
  saveGroups(next);
  return next;
}

export async function sendWaGroupAnnouncement(input: {
  groupIds: string[];
  message: string;
  sentByEmail: string;
  requestId?: string;
}): Promise<{ ok: boolean; error?: string; log?: WaGroupSendLog }> {
  const cleanMsg = input.message.trim();
  const uniqueIds = Array.from(new Set(input.groupIds.map((id) => id.trim()).filter(Boolean)));
  if (uniqueIds.length === 0) {
    return { ok: false, error: 'Pilih minimal satu grup WhatsApp tujuan.' };
  }
  if (!cleanMsg) {
    return { ok: false, error: 'Isi pengumuman grup wajib ditulis.' };
  }

  const groups = loadGroups();
  const groupNames = uniqueIds.map((id) => groups.find((g) => g.id === id)?.name || id);
  const results: WaGroupSendLog['results'] = [];

  for (let i = 0; i < uniqueIds.length; i++) {
    const gid = uniqueIds[i];
    const gname = groupNames[i];
    const delivery = await sendFonnteWhatsApp({
      target: gid,
      message: cleanMsg,
      idempotencyKey: input.requestId ? `wagroup_${input.requestId}_${gid}` : undefined,
    });
    results.push({
      groupId: gid,
      groupName: gname,
      status: delivery.status,
      detail: delivery.detail,
    });
    if (i < uniqueIds.length - 1) {
      await new Promise((r) => setTimeout(r, 800));
    }
  }

  const allSent = results.every((r) => r.status === 'sent' || r.status === 'skipped_duplicate');
  const anySent = results.some((r) => r.status === 'sent' || r.status === 'skipped_duplicate');
  const unconfigured = results.every((r) => r.status === 'unconfigured');

  const log: WaGroupSendLog = {
    id: `grplog_${Date.now()}_${crypto.randomBytes(2).toString('hex')}`,
    groupIds: uniqueIds,
    groupNames,
    message: cleanMsg,
    status: unconfigured ? 'unconfigured' : allSent ? 'sent' : anySent ? 'partial' : 'failed',
    results,
    sentAtIso: new Date().toISOString(),
    sentByEmail: input.sentByEmail,
  };

  const logs = loadGroupLogs();
  logs.unshift(log);
  saveGroupLogs(logs);

  return { ok: true, log };
}

// ============================================================================
// WHATSAPP CENTER: TEMPLATES, OPT-OUTS, SETTINGS, QUEUE CAMPAIGNS
// ============================================================================

function loadTemplates(): WaTemplateRecord[] {
  const loaded = readJsonData<WaTemplateRecord[] | null>(WA_TEMPLATES_FILE, null);
  if (!loaded || !Array.isArray(loaded) || loaded.length === 0) {
    writeJsonData(WA_TEMPLATES_FILE, INITIAL_WA_TEMPLATES);
    return [...INITIAL_WA_TEMPLATES];
  }
  return loaded;
}

function saveTemplates(templates: WaTemplateRecord[]) {
  writeJsonData(WA_TEMPLATES_FILE, templates);
}

export function listWaTemplates(): WaTemplateRecord[] {
  return loadTemplates();
}

export function upsertWaTemplate(input: {
  id?: string;
  name: string;
  category: string;
  content: string;
  isEnabled?: boolean;
}): { ok: boolean; error?: string; template?: WaTemplateRecord } {
  const name = input.name.trim();
  const content = input.content.trim();
  if (name.length < 2 || name.length > 150) {
    return { ok: false, error: 'Nama template wajib diisi (2–150 karakter).' };
  }
  if (!WA_TEMPLATE_CATEGORIES.includes(input.category as WaTemplateCategory)) {
    return { ok: false, error: 'Kategori template tidak valid.' };
  }
  if (content.length < 3 || content.length > 4000) {
    return { ok: false, error: 'Isi pesan template wajib diisi (3–4000 karakter).' };
  }

  const templates = loadTemplates();
  const nowIso = new Date().toISOString();
  const cleanId =
    input.id && /^[a-zA-Z0-9_-]{3,80}$/.test(input.id)
      ? input.id
      : `tpl_${Date.now()}_${crypto.randomBytes(2).toString('hex')}`;
  const idx = templates.findIndex((t) => t.id === cleanId);
  const existing = idx >= 0 ? templates[idx] : null;

  const record: WaTemplateRecord = {
    id: cleanId,
    name,
    category: input.category as WaTemplateCategory,
    content,
    isEnabled: input.isEnabled ?? existing?.isEnabled ?? true,
    createdAtIso: existing?.createdAtIso || nowIso,
    updatedAtIso: nowIso,
  };

  if (idx >= 0) templates[idx] = record;
  else templates.unshift(record);
  saveTemplates(templates);
  return { ok: true, template: record };
}

export function deleteWaTemplate(id: string): boolean {
  const templates = loadTemplates();
  const next = templates.filter((t) => t.id !== id);
  if (next.length === templates.length) return false;
  saveTemplates(next);
  return true;
}

function loadOptOuts(): WaOptOutRecord[] {
  return readJsonData<WaOptOutRecord[]>(WA_OPTOUTS_FILE, []);
}

function saveOptOuts(items: WaOptOutRecord[]) {
  writeJsonData(WA_OPTOUTS_FILE, items);
}

export function listWaOptOuts(): WaOptOutRecord[] {
  return loadOptOuts();
}

export function addWaOptOut(phone: string, reason?: string): WaOptOutRecord[] {
  const list = loadOptOuts();
  const clean = phone.replace(/[^\d+]/g, '').replace(/^\+/, '').replace(/^0/, '62');
  if (!clean) return list;
  if (!list.some((o) => o.phone === clean)) {
    list.unshift({
      phone: clean,
      reason: reason?.trim() || 'Berhenti menerima pesan',
      addedAtIso: new Date().toISOString(),
    });
    saveOptOuts(list);
  }
  return list;
}

export function removeWaOptOut(phone: string): WaOptOutRecord[] {
  const next = loadOptOuts().filter((o) => o.phone !== phone);
  saveOptOuts(next);
  return next;
}

const DEFAULT_SETTINGS: WaAutomationSettings = {
  delaySeconds: 2,
  batchSize: 5,
  maxRetries: 1,
  defaultTemplateId: 'tpl-pengumuman',
  testRecipientPhone: ADMIN_WHATSAPP_TARGET,
  autoNotifyQuizPublished: false,
  autoQuizTemplateId: 'tpl-kuis',
  autoNotifyRegistration: true,
  autoRegistrationTemplateId: 'tpl-pendaftaran',
  autoNotifyLearningInfo: false,
  autoLearningTemplateId: 'tpl-pengingat-kelas',
  updatedAtIso: '2026-11-01T08:00:00.000Z',
};

export function getWaSettings(): WaAutomationSettings {
  return readJsonData<WaAutomationSettings>(WA_SETTINGS_FILE, DEFAULT_SETTINGS);
}

export function saveWaSettings(
  updates: Partial<WaAutomationSettings>
): WaAutomationSettings {
  const current = getWaSettings();
  const next: WaAutomationSettings = {
    ...current,
    ...updates,
    delaySeconds: Math.min(60, Math.max(1, Number(updates.delaySeconds ?? current.delaySeconds) || 2)),
    batchSize: Math.min(25, Math.max(1, Number(updates.batchSize ?? current.batchSize) || 5)),
    maxRetries: Math.min(3, Math.max(0, Number(updates.maxRetries ?? current.maxRetries) || 1)),
    updatedAtIso: new Date().toISOString(),
  };
  writeJsonData(WA_SETTINGS_FILE, next);
  return next;
}

function loadCampaigns(): WaCampaignRecord[] {
  return readJsonData<WaCampaignRecord[]>(WA_CAMPAIGNS_FILE, []);
}

function saveCampaigns(campaigns: WaCampaignRecord[]) {
  writeJsonData(WA_CAMPAIGNS_FILE, campaigns.slice(0, 100));
}

export function listWaCampaigns(): WaCampaignRecord[] {
  return loadCampaigns().map(recalculateCampaignCounts);
}

export function getWaCampaign(id: string): WaCampaignRecord | null {
  const found = loadCampaigns().find((c) => c.id === id);
  return found ? recalculateCampaignCounts(found) : null;
}

export function createWaCampaign(input: {
  title: string;
  templateId?: string;
  templateName?: string;
  rawMessage: string;
  recipients: WaRecipientInput[];
  delaySeconds?: number;
  batchSize?: number;
  maxRetries?: number;
  createdByEmail: string;
  fallbackVariables?: Record<string, string>;
}): {
  ok: boolean;
  error?: string;
  missingVariableErrors?: Array<{ recipient: string; missing: string[] }>;
  campaign?: WaCampaignRecord;
  summary?: { invalidCount: number; duplicateCount: number; optedOutCount: number };
} {
  const title = input.title.trim() || `Siaran WhatsApp ${new Date().toLocaleDateString('id-ID')}`;
  const rawMessage = input.rawMessage.trim();
  if (!rawMessage) {
    return { ok: false, error: 'Isi pesan WhatsApp wajib diisi.' };
  }

  const optOuts = loadOptOuts().map((o) => o.phone);
  const filtered = deduplicateAndFilterRecipients(input.recipients, optOuts);
  if (filtered.accepted.length === 0) {
    return {
      ok: false,
      error: `Tidak ada penerima valid yang tersisa (tidak valid: ${filtered.invalid.length}, opt-out: ${filtered.optedOut}, duplikat: ${filtered.duplicates}).`,
    };
  }

  const missingVariableErrors: Array<{ recipient: string; missing: string[] }> = [];
  const items: WaQueueItem[] = [];

  for (let i = 0; i < filtered.accepted.length; i++) {
    const r = filtered.accepted[i];
    const vars: Record<string, string> = {
      nama_siswa: r.name || input.fallbackVariables?.nama_siswa || '',
      nama_orang_tua: r.parentName || input.fallbackVariables?.nama_orang_tua || '',
      kelas: r.studentClass || input.fallbackVariables?.kelas || '',
      nama_program: r.programName || input.fallbackVariables?.nama_program || '',
      jadwal: r.scheduleLabel || input.fallbackVariables?.jadwal || '',
    };
    const rendered = renderTemplateVariables(rawMessage, vars);
    if (rendered.missingVariables.length > 0) {
      missingVariableErrors.push({
        recipient: r.name || r.normalizedPhone,
        missing: rendered.missingVariables,
      });
    }
    items.push({
      id: `item_${i + 1}_${crypto.randomBytes(2).toString('hex')}`,
      phone: r.normalizedPhone,
      displayName: r.name || r.parentName || r.normalizedPhone,
      resolvedMessage: rendered.rendered,
      source: r.source || 'manual',
      status: 'menunggu',
      attempts: 0,
      variables: vars,
    });
  }

  if (missingVariableErrors.length > 0) {
    return {
      ok: false,
      error: `Terdapat variabel template yang belum lengkap untuk ${missingVariableErrors.length} penerima.`,
      missingVariableErrors: missingVariableErrors.slice(0, 10),
    };
  }

  const settings = getWaSettings();
  const nowIso = new Date().toISOString();
  const campaign = recalculateCampaignCounts({
    id: `cmp_${Date.now()}_${crypto.randomBytes(2).toString('hex')}`,
    title,
    templateId: input.templateId,
    templateName: input.templateName,
    rawMessage,
    status: 'running',
    totalCount: items.length,
    waitingCount: items.length,
    processingCount: 0,
    successCount: 0,
    failedCount: 0,
    delaySeconds: Math.min(30, Math.max(1, Number(input.delaySeconds ?? settings.delaySeconds) || 2)),
    batchSize: Math.min(25, Math.max(1, Number(input.batchSize ?? settings.batchSize) || 5)),
    maxRetries: Math.min(3, Math.max(0, Number(input.maxRetries ?? settings.maxRetries) || 1)),
    createdAtIso: nowIso,
    updatedAtIso: nowIso,
    createdByEmail: input.createdByEmail,
    items,
  });

  const campaigns = loadCampaigns();
  campaigns.unshift(campaign);
  saveCampaigns(campaigns);

  return {
    ok: true,
    campaign,
    summary: {
      invalidCount: filtered.invalid.length,
      duplicateCount: filtered.duplicates,
      optedOutCount: filtered.optedOut,
    },
  };
}

export async function processWaCampaignBatch(campaignId: string): Promise<{
  ok: boolean;
  error?: string;
  campaign?: WaCampaignRecord;
  processedInStep: number;
}> {
  const campaigns = loadCampaigns();
  const idx = campaigns.findIndex((c) => c.id === campaignId);
  if (idx < 0) {
    return { ok: false, error: 'Kampanye tidak ditemukan.', processedInStep: 0 };
  }

  let campaign = campaigns[idx];
  if (campaign.status === 'paused') {
    return { ok: true, campaign: recalculateCampaignCounts(campaign), processedInStep: 0 };
  }
  if (campaign.status === 'completed') {
    return { ok: true, campaign: recalculateCampaignCounts(campaign), processedInStep: 0 };
  }

  const maxStepMs = 9000; // Safe within serverless request limits
  const stepStart = Date.now();
  let processedInStep = 0;

  for (let i = 0; i < campaign.items.length; i++) {
    if (processedInStep >= campaign.batchSize) break;
    if (processedInStep > 0 && Date.now() - stepStart >= maxStepMs) break;

    const item = campaign.items[i];
    const canRetry = item.status === 'gagal' && item.attempts <= campaign.maxRetries;
    if (item.status !== 'menunggu' && !canRetry) continue;

    if (processedInStep > 0) {
      await new Promise((r) => setTimeout(r, Math.min(campaign.delaySeconds, 5) * 1000));
    }

    campaign.items[i] = { ...item, status: 'diproses', attempts: item.attempts + 1 };
    campaigns[idx] = recalculateCampaignCounts({
      ...campaign,
      updatedAtIso: new Date().toISOString(),
    });
    saveCampaigns(campaigns);

    const delivery = await sendFonnteWhatsApp({
      target: item.phone,
      message: item.resolvedMessage,
      idempotencyKey: `cmp_${campaign.id}_${item.id}`,
    });

    const isSuccess = delivery.status === 'sent' || delivery.status === 'skipped_duplicate';
    campaign.items[i] = {
      ...campaign.items[i],
      status: isSuccess ? 'berhasil' : 'gagal',
      lastError: isSuccess ? undefined : delivery.detail,
      sentAtIso: new Date().toISOString(),
    };
    processedInStep += 1;

    campaign = recalculateCampaignCounts({
      ...campaign,
      updatedAtIso: new Date().toISOString(),
    });
    campaigns[idx] = campaign;
    saveCampaigns(campaigns);
  }

  const finalized = recalculateCampaignCounts({
    ...campaign,
    updatedAtIso: new Date().toISOString(),
  });
  campaigns[idx] = finalized;
  saveCampaigns(campaigns);

  return { ok: true, campaign: finalized, processedInStep };
}

export function setWaCampaignStatus(
  campaignId: string,
  status: 'paused' | 'running'
): WaCampaignRecord | null {
  const campaigns = loadCampaigns();
  const idx = campaigns.findIndex((c) => c.id === campaignId);
  if (idx < 0) return null;
  const current = campaigns[idx];
  if (current.status === 'completed') return recalculateCampaignCounts(current);
  const updated = recalculateCampaignCounts({
    ...current,
    status,
    updatedAtIso: new Date().toISOString(),
  });
  campaigns[idx] = updated;
  saveCampaigns(campaigns);
  return updated;
}

export function exportWaCampaignCsv(campaignId: string): {
  ok: boolean;
  filename?: string;
  csv?: string;
} {
  const campaign = getWaCampaign(campaignId);
  if (!campaign) return { ok: false };
  return {
    ok: true,
    filename: `laporan-wa-${campaign.id}.csv`,
    csv: buildCampaignReportCsv(campaign),
  };
}

export async function getWaCenterOverviewStatus() {
  const device = await checkFonnteDeviceStatus();
  return {
    fonnteConfigured: isFonnteConfigured(),
    device,
    settings: getWaSettings(),
    templates: listWaTemplates(),
    optOuts: listWaOptOuts(),
    campaigns: listWaCampaigns(),
  };
}
