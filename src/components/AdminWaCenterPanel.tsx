import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { User } from 'firebase/auth';
import {
  CheckCircle2,
  Download,
  Pause,
  Play,
  Plus,
  RefreshCw,
  Send,
  Settings,
  Trash2,
  Upload,
} from 'lucide-react';
import {
  ADMIN_WHATSAPP_TARGET,
  FONNTE_SENDER_DISPLAY,
  FONNTE_SENDER_NUMBER,
  type LearningPackage,
  type StudentRecord,
} from '../lib/domain';
import {
  WA_TEMPLATE_CATEGORIES,
  WA_TEMPLATE_VARIABLES,
  type WaAutomationSettings,
  type WaCampaignRecord,
  type WaGroupRecord,
  type WaOptOutRecord,
  type WaRecipientInput,
  type WaTemplateCategory,
  type WaTemplateRecord,
  deduplicateAndFilterRecipients,
  parseContactsCsvText,
  renderTemplateVariables,
} from '../lib/quizAndWaDomain';

type CenterSubTab = 'compose' | 'templates' | 'history' | 'settings';

export function AdminWaCenterPanel({
  user,
  students,
  packages,
}: {
  user: User;
  students: StudentRecord[];
  packages: LearningPackage[];
}) {
  const [subTab, setSubTab] = useState<CenterSubTab>('compose');
  const [loading, setLoading] = useState(true);
  const [fonnteConfigured, setFonnteConfigured] = useState(false);
  const [deviceInfo, setDeviceInfo] = useState<{ status: string; detail: string; deviceName?: string }>({
    status: 'unknown',
    detail: '',
  });
  const [templates, setTemplates] = useState<WaTemplateRecord[]>([]);
  const [optOuts, setOptOuts] = useState<WaOptOutRecord[]>([]);
  const [campaigns, setCampaigns] = useState<WaCampaignRecord[]>([]);
  const [settings, setSettings] = useState<WaAutomationSettings | null>(null);
  const [waGroups, setWaGroups] = useState<WaGroupRecord[]>([]);
  const [banner, setBanner] = useState<{ type: 'ok' | 'warn' | 'err'; text: string } | null>(null);

  // Composer state
  const [campaignTitle, setCampaignTitle] = useState('');
  const [selectedTemplateId, setSelectedTemplateId] = useState('');
  const [messageText, setMessageText] = useState('');
  const [manualPhonesText, setManualPhonesText] = useState('');
  const [csvRecipients, setCsvRecipients] = useState<WaRecipientInput[]>([]);
  const [selectedStudentIds, setSelectedStudentIds] = useState<string[]>([]);
  const [selectedGroupIds, setSelectedGroupIds] = useState<string[]>([]);
  const [branchFilter, setBranchFilter] = useState('all');
  const [packageFilter, setPackageFilter] = useState('all');
  const [fallbackClass, setFallbackClass] = useState('');
  const [fallbackSchedule, setFallbackSchedule] = useState('');
  const [confirmReady, setConfirmReady] = useState(false);
  const [launching, setLaunching] = useState(false);
  const [activeCampaignId, setActiveCampaignId] = useState<string | null>(null);

  // Template editor state
  const [tplDraft, setTplDraft] = useState<{
    id?: string;
    name: string;
    category: WaTemplateCategory;
    content: string;
    isEnabled: boolean;
  } | null>(null);

  // Opt-out input
  const [newOptOutPhone, setNewOptOutPhone] = useState('');
  const [newOptOutReason, setNewOptOutReason] = useState('');

  // Settings form busy state
  const [savingSettings, setSavingSettings] = useState(false);
  const [sendingTest, setSendingTest] = useState(false);

  const loadOverview = useCallback(async () => {
    setLoading(true);
    try {
      const token = await user.getIdToken();
      const [overviewRes, groupsRes] = await Promise.all([
        fetch('/api/admin/wa-center/overview', { headers: { Authorization: `Bearer ${token}` } }),
        fetch('/api/admin/wa-groups', { headers: { Authorization: `Bearer ${token}` } }),
      ]);
      const data = await overviewRes.json();
      const grpData = await groupsRes.json();
      if (!overviewRes.ok) throw new Error(data?.error || 'Gagal memuat WhatsApp Center.');
      setFonnteConfigured(Boolean(data.fonnteConfigured));
      setDeviceInfo(data.device || { status: 'unknown', detail: '' });
      setTemplates(Array.isArray(data.templates) ? data.templates : []);
      setOptOuts(Array.isArray(data.optOuts) ? data.optOuts : []);
      setCampaigns(Array.isArray(data.campaigns) ? data.campaigns : []);
      setSettings(data.settings || null);
      setWaGroups(Array.isArray(grpData.groups) ? grpData.groups : []);
    } catch (err) {
      setBanner({
        type: 'err',
        text: err instanceof Error ? err.message : 'Gagal memuat WhatsApp Center.',
      });
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    loadOverview();
  }, [loadOverview]);

  // Stepped Queue Batch Runner while an active campaign is in "running" state
  const processingRef = useRef(false);
  const activeCampaign = useMemo(
    () => campaigns.find((c) => c.id === activeCampaignId) || campaigns.find((c) => c.status === 'running') || null,
    [activeCampaignId, campaigns]
  );

  useEffect(() => {
    if (!activeCampaign || activeCampaign.status !== 'running' || activeCampaign.waitingCount === 0) {
      return;
    }
    let cancelled = false;
    const runNextStep = async () => {
      if (processingRef.current || cancelled) return;
      processingRef.current = true;
      try {
        const token = await user.getIdToken();
        const res = await fetch(
          `/api/admin/wa-center/campaigns/${encodeURIComponent(activeCampaign.id)}/process-batch`,
          {
            method: 'POST',
            headers: { Authorization: `Bearer ${token}` },
          }
        );
        const data = await res.json();
        if (!cancelled && data.ok && data.campaign) {
          setCampaigns((prev) =>
            prev.map((c) => (c.id === data.campaign.id ? data.campaign : c))
          );
        }
      } finally {
        processingRef.current = false;
      }
    };

    const timer = window.setTimeout(runNextStep, 800);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [activeCampaign, user]);

  // Combined Recipient Calculation
  const filteredStudentsForPicker = useMemo(() => {
    return students.filter((s) => {
      if (branchFilter !== 'all' && s.branchId !== branchFilter) return false;
      if (packageFilter !== 'all' && s.packageId !== packageFilter) return false;
      return Boolean(s.parentPhone);
    });
  }, [branchFilter, packageFilter, students]);

  const combinedRecipients: WaRecipientInput[] = useMemo(() => {
    const list: WaRecipientInput[] = [];
    selectedStudentIds.forEach((sid) => {
      const s = students.find((st) => st.id === sid);
      if (!s) return;
      list.push({
        name: s.childName,
        parentName: s.parentName,
        phone: s.parentPhone,
        studentClass: s.gradeLevel,
        programName: s.packageName,
        scheduleLabel: fallbackSchedule || undefined,
        source: 'student',
      });
    });
    selectedGroupIds.forEach((gid) => {
      const g = waGroups.find((gr) => gr.id === gid);
      list.push({
        name: g?.name || gid,
        phone: gid,
        source: 'group',
      });
    });
    manualPhonesText
      .split(/[\n,;]+/)
      .map((p) => p.trim())
      .filter(Boolean)
      .forEach((phone) => {
        list.push({ phone, source: 'manual' });
      });
    csvRecipients.forEach((r) => list.push(r));
    return list;
  }, [csvRecipients, fallbackSchedule, manualPhonesText, selectedGroupIds, selectedStudentIds, students, waGroups]);

  const recipientSummary = useMemo(
    () =>
      deduplicateAndFilterRecipients(
        combinedRecipients,
        optOuts.map((o) => o.phone)
      ),
    [combinedRecipients, optOuts]
  );

  const previewOutcome = useMemo(() => {
    const sample = recipientSummary.accepted[0];
    return renderTemplateVariables(messageText || '', {
      nama_siswa: sample?.name || 'Ananda Budi',
      nama_orang_tua: sample?.parentName || 'Bapak/Ibu Orang Tua',
      kelas: sample?.studentClass || fallbackClass || 'Kelas 4 SD',
      nama_program: sample?.programName || 'PAKET 2: Kelas 2 – Kelas 5',
      jadwal: sample?.scheduleLabel || fallbackSchedule || 'Senin & Rabu 15.30 WIB',
    });
  }, [fallbackClass, fallbackSchedule, messageText, recipientSummary.accepted]);

  const handleSelectTemplate = (tplId: string) => {
    setSelectedTemplateId(tplId);
    const tpl = templates.find((t) => t.id === tplId);
    if (tpl) {
      setMessageText(tpl.content);
      if (!campaignTitle) setCampaignTitle(tpl.name);
    }
  };

  const handleCsvFileUpload = async (file: File | undefined) => {
    if (!file) return;
    const text = await file.text();
    const parsed = parseContactsCsvText(text);
    setCsvRecipients((prev) => [...prev, ...parsed]);
    setBanner({
      type: 'ok',
      text: `${parsed.length} kontak berhasil dibaca dari file CSV "${file.name}".`,
    });
  };

  const handleLaunchCampaign = async () => {
    if (launching) return;
    setLaunching(true);
    setBanner(null);
    try {
      const token = await user.getIdToken();
      const tpl = templates.find((t) => t.id === selectedTemplateId);
      const res = await fetch('/api/admin/wa-center/campaigns', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          title: campaignTitle.trim() || 'Siaran WhatsApp TOMOYO',
          templateId: tpl?.id,
          templateName: tpl?.name,
          rawMessage: messageText,
          recipients: combinedRecipients,
          fallbackVariables: {
            kelas: fallbackClass,
            jadwal: fallbackSchedule,
          },
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        throw new Error(data?.error || 'Gagal membuat antrean siaran WhatsApp.');
      }
      setCampaigns((prev) => [data.campaign, ...prev]);
      setActiveCampaignId(data.campaign.id);
      setConfirmReady(false);
      setBanner({
        type: 'ok',
        text: `Antrean siaran dibuat untuk ${data.campaign.totalCount} penerima valid. Pengiriman bertahap dimulai otomatis.`,
      });
    } catch (err) {
      setBanner({
        type: 'err',
        text: err instanceof Error ? err.message : 'Gagal membuat antrean siaran.',
      });
    } finally {
      setLaunching(false);
    }
  };

  const handleToggleCampaignPause = async (cmp: WaCampaignRecord) => {
    const nextStatus = cmp.status === 'paused' ? 'running' : 'paused';
    const token = await user.getIdToken();
    const res = await fetch(`/api/admin/wa-center/campaigns/${encodeURIComponent(cmp.id)}/status`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ status: nextStatus }),
    });
    const data = await res.json();
    if (data.ok && data.campaign) {
      setCampaigns((prev) => prev.map((c) => (c.id === data.campaign.id ? data.campaign : c)));
      if (nextStatus === 'running') setActiveCampaignId(cmp.id);
    }
  };

  const handleDownloadCampaignCsv = async (campaignId: string) => {
    const token = await user.getIdToken();
    const res = await fetch(`/api/admin/wa-center/campaigns/${encodeURIComponent(campaignId)}/export`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) return;
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `laporan-wa-${campaignId}.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  const handleSaveTemplate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tplDraft) return;
    const token = await user.getIdToken();
    const res = await fetch('/api/admin/wa-center/templates', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(tplDraft),
    });
    const data = await res.json();
    if (!res.ok || !data.ok) {
      setBanner({ type: 'err', text: data?.error || 'Gagal menyimpan template.' });
      return;
    }
    setTemplates(data.templates);
    setTplDraft(null);
    setBanner({ type: 'ok', text: `Template "${data.template.name}" berhasil disimpan.` });
  };

  const handleDeleteTemplate = async (id: string) => {
    const token = await user.getIdToken();
    const res = await fetch(`/api/admin/wa-center/templates/${encodeURIComponent(id)}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    });
    const data = await res.json();
    if (data.ok) setTemplates(data.templates);
  };

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!settings) return;
    setSavingSettings(true);
    try {
      const token = await user.getIdToken();
      const res = await fetch('/api/admin/wa-center/settings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(settings),
      });
      const data = await res.json();
      if (data.ok) {
        setSettings(data.settings);
        setBanner({ type: 'ok', text: 'Pengaturan WhatsApp Center & Otomatisasi tersimpan.' });
      }
    } finally {
      setSavingSettings(false);
    }
  };

  const handleSendTestMessage = async () => {
    setSendingTest(true);
    setBanner(null);
    try {
      const token = await user.getIdToken();
      const res = await fetch('/api/admin/test-whatsapp', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          target: settings?.testRecipientPhone || ADMIN_WHATSAPP_TARGET,
        }),
      });
      const data = await res.json();
      setBanner({
        type: data.status === 'sent' ? 'ok' : 'warn',
        text: `Uji kirim ke ${settings?.testRecipientPhone || ADMIN_WHATSAPP_TARGET}: ${data.detail}`,
      });
    } finally {
      setSendingTest(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header & Sub-Tabs */}
      <div className="editorial-card rounded-2xl p-6 space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <h2 className="font-display text-2xl font-bold text-[#121820]">
              WhatsApp Center &amp; Siaran Pesan
            </h2>
            <p className="text-xs sm:text-sm text-[#3F4A59] mt-0.5">
              Device Pengirim: <strong className="font-mono">{FONNTE_SENDER_DISPLAY} ({FONNTE_SENDER_NUMBER})</strong> · Token Backend:{' '}
              <strong className={fonnteConfigured ? 'text-[#15803D]' : 'text-[#B45309]'}>
                {fonnteConfigured ? 'Aktif' : 'Belum Diatur'}
              </strong>{' '}
              · Status Koneksi: <strong>{deviceInfo.status}</strong>
            </p>
          </div>
          <button
            type="button"
            onClick={loadOverview}
            disabled={loading}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-[#121820] bg-[#EFECE4] hover:bg-[#DFDCD3] rounded-xl cursor-pointer self-start"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>Periksa Status Fonnte</span>
          </button>
        </div>

        <div className="flex flex-wrap gap-2 pt-2 border-t border-[#DFDCD3]">
          {[
            { id: 'compose', label: 'Siaran & Antrean' },
            { id: 'templates', label: `Template Pesan (${templates.length})` },
            { id: 'history', label: `Riwayat & CSV (${campaigns.length})` },
            { id: 'settings', label: 'Pengaturan & Otomatisasi' },
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setSubTab(tab.id as CenterSubTab)}
              className={`px-4 py-2 min-h-[40px] text-xs font-semibold rounded-xl transition-colors cursor-pointer ${
                subTab === tab.id
                  ? 'bg-[#121820] text-white'
                  : 'bg-[#F7F6F2] text-[#3F4A59] border border-[#DFDCD3] hover:border-[#121820]'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {banner && (
        <div
          role="status"
          className={`p-4 rounded-xl border text-xs sm:text-sm ${
            banner.type === 'ok'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
              : banner.type === 'warn'
              ? 'bg-amber-50 border-amber-200 text-amber-900'
              : 'bg-rose-50 border-rose-200 text-[#B91C1C]'
          }`}
        >
          {banner.text}
        </div>
      )}

      {/* SUB-TAB 1: COMPOSE + MULTI-SOURCE RECIPIENTS + LIVE QUEUE */}
      {subTab === 'compose' && (
        <div className="space-y-6">
          {/* Active Campaign Progress */}
          {activeCampaign && (
            <div className="editorial-card rounded-2xl p-6 space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold text-[#BE123C] uppercase">
                    Antrean Pengiriman Berjalan
                  </p>
                  <h3 className="font-display text-2xl font-bold text-[#121820]">
                    {activeCampaign.title}
                  </h3>
                </div>
                <div className="flex items-center gap-2">
                  {activeCampaign.status !== 'completed' && (
                    <button
                      type="button"
                      onClick={() => handleToggleCampaignPause(activeCampaign)}
                      className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-[#121820] rounded-xl cursor-pointer"
                    >
                      {activeCampaign.status === 'paused' ? (
                        <>
                          <Play className="w-3.5 h-3.5" />
                          <span>Lanjutkan</span>
                        </>
                      ) : (
                        <>
                          <Pause className="w-3.5 h-3.5" />
                          <span>Jeda Antrean</span>
                        </>
                      )}
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => handleDownloadCampaignCsv(activeCampaign.id)}
                    className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-[#0F766E] bg-[#EFECE4] rounded-xl cursor-pointer"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Ekspor CSV</span>
                  </button>
                </div>
              </div>

              <div className="w-full h-3 bg-[#EFECE4] rounded-full overflow-hidden">
                <div
                  className="h-full bg-[#0F766E] transition-all"
                  style={{
                    width: `${
                      activeCampaign.totalCount > 0
                        ? Math.round(
                            ((activeCampaign.successCount + activeCampaign.failedCount) /
                              activeCampaign.totalCount) *
                              100
                          )
                        : 0
                    }%`,
                  }}
                />
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs font-mono">
                <div className="p-3 rounded-xl bg-[#F7F6F2] border border-[#DFDCD3]">
                  <p className="text-[#626E7E] font-sans">Menunggu</p>
                  <p className="text-lg font-bold tabular-nums">{activeCampaign.waitingCount}</p>
                </div>
                <div className="p-3 rounded-xl bg-[#F7F6F2] border border-[#DFDCD3]">
                  <p className="text-[#626E7E] font-sans">Diproses</p>
                  <p className="text-lg font-bold tabular-nums">{activeCampaign.processingCount}</p>
                </div>
                <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200">
                  <p className="text-emerald-800 font-sans">Berhasil</p>
                  <p className="text-lg font-bold text-[#15803D] tabular-nums">
                    {activeCampaign.successCount}
                  </p>
                </div>
                <div className="p-3 rounded-xl bg-rose-50 border border-rose-200">
                  <p className="text-rose-800 font-sans">Gagal</p>
                  <p className="text-lg font-bold text-[#B91C1C] tabular-nums">
                    {activeCampaign.failedCount}
                  </p>
                </div>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* Message Editor */}
            <div className="lg:col-span-7 editorial-card rounded-2xl p-6 space-y-4">
              <h3 className="text-base font-bold text-[#121820]">1. Editor Pesan &amp; Template</h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-[#121820] mb-1">Judul Kampanye / Siaran</label>
                  <input
                    type="text"
                    value={campaignTitle}
                    onChange={(e) => setCampaignTitle(e.target.value)}
                    placeholder="Contoh: Info Jadwal Evaluasi November"
                    className="w-full px-3.5 py-2.5 min-h-[42px] text-sm bg-white border border-[#DFDCD3] rounded-xl"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#121820] mb-1">Pilih Template Resmi</label>
                  <select
                    value={selectedTemplateId}
                    onChange={(e) => handleSelectTemplate(e.target.value)}
                    className="w-full px-3.5 py-2.5 min-h-[42px] text-sm bg-white border border-[#DFDCD3] rounded-xl"
                  >
                    <option value="">-- Tulis Pesan Kustom --</option>
                    {templates
                      .filter((t) => t.isEnabled)
                      .map((t) => (
                        <option key={t.id} value={t.id}>
                          [{t.category}] {t.name}
                        </option>
                      ))}
                  </select>
                </div>
              </div>

              <div className="space-y-1.5">
                <p className="text-xs font-semibold text-[#626E7E]">Sisipkan Variabel Otomatis:</p>
                <div className="flex flex-wrap gap-1.5">
                  {WA_TEMPLATE_VARIABLES.map((v) => (
                    <button
                      key={v}
                      type="button"
                      onClick={() => setMessageText((prev) => `${prev}{${v}}`)}
                      className="px-2.5 py-1 text-[11px] font-mono bg-[#EFECE4] hover:bg-[#DFDCD3] text-[#121820] rounded-lg cursor-pointer"
                    >
                      {`{${v}}`}
                    </button>
                  ))}
                </div>
              </div>

              <textarea
                rows={6}
                value={messageText}
                onChange={(e) => setMessageText(e.target.value)}
                placeholder="Tulis isi pesan WhatsApp di sini... Mendukung *tebal*, _miring_, baris baru, dan variabel {nama_siswa}."
                className="w-full px-4 py-3 text-sm bg-white border border-[#DFDCD3] rounded-xl"
              />

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-[#626E7E] mb-1">
                    Nilai Default {'{kelas}'} (untuk nomor manual)
                  </label>
                  <input
                    type="text"
                    value={fallbackClass}
                    onChange={(e) => setFallbackClass(e.target.value)}
                    placeholder="Contoh: Semua Kelas"
                    className="w-full px-3 py-2 text-xs bg-white border border-[#DFDCD3] rounded-xl"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#626E7E] mb-1">
                    Nilai Default {'{jadwal}'}
                  </label>
                  <input
                    type="text"
                    value={fallbackSchedule}
                    onChange={(e) => setFallbackSchedule(e.target.value)}
                    placeholder="Contoh: Senin 15.30 WIB"
                    className="w-full px-3 py-2 text-xs bg-white border border-[#DFDCD3] rounded-xl"
                  />
                </div>
              </div>

              {messageText.trim() && (
                <div className="p-4 rounded-xl bg-[#EFECE4] border border-[#DFDCD3] space-y-1.5">
                  <p className="text-[11px] font-bold uppercase text-[#626E7E]">
                    Pratinjau Pesan (Contoh Penerima Pertama)
                  </p>
                  <p className="text-xs sm:text-sm text-[#121820] whitespace-pre-line leading-relaxed">
                    {previewOutcome.rendered}
                  </p>
                </div>
              )}

              <div className="flex flex-wrap items-center gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setSubTab('templates');
                    setTplDraft({
                      name: campaignTitle || 'Template Baru',
                      category: 'Pengumuman Umum',
                      content: messageText,
                      isEnabled: true,
                    });
                  }}
                  disabled={!messageText.trim()}
                  className="px-4 py-2.5 text-xs font-semibold text-[#121820] bg-[#EFECE4] hover:bg-[#DFDCD3] rounded-xl cursor-pointer disabled:opacity-50"
                >
                  Simpan sebagai Template
                </button>
                <button
                  type="button"
                  onClick={handleSendTestMessage}
                  disabled={sendingTest}
                  className="px-4 py-2.5 text-xs font-semibold text-[#0F766E] bg-white border border-[#DFDCD3] hover:border-[#0F766E] rounded-xl cursor-pointer"
                >
                  {sendingTest ? 'Mengirim Uji...' : 'Kirim Pesan Uji'}
                </button>
              </div>
            </div>

            {/* Recipient Picker */}
            <div className="lg:col-span-5 editorial-card rounded-2xl p-6 space-y-5">
              <h3 className="text-base font-bold text-[#121820]">2. Penerima Multi-Sumber</h3>

              {/* Filter & Pick Students */}
              <div className="space-y-2.5">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-xs font-semibold text-[#121820]">
                    Siswa &amp; Orang Tua ({filteredStudentsForPicker.length})
                  </p>
                  <button
                    type="button"
                    onClick={() =>
                      setSelectedStudentIds(
                        selectedStudentIds.length === filteredStudentsForPicker.length
                          ? []
                          : filteredStudentsForPicker.map((s) => s.id)
                      )
                    }
                    className="text-xs font-semibold text-[#BE123C] cursor-pointer"
                  >
                    {selectedStudentIds.length === filteredStudentsForPicker.length
                      ? 'Kosongkan'
                      : 'Pilih Semua Hasil Filter'}
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <select
                    value={branchFilter}
                    onChange={(e) => setBranchFilter(e.target.value)}
                    className="px-2.5 py-2 text-xs bg-white border border-[#DFDCD3] rounded-xl"
                  >
                    <option value="all">Semua Cabang</option>
                    <option value="indramayu-kota">Indramayu Kota</option>
                    <option value="terisi">Kec. Terisi</option>
                  </select>
                  <select
                    value={packageFilter}
                    onChange={(e) => setPackageFilter(e.target.value)}
                    className="px-2.5 py-2 text-xs bg-white border border-[#DFDCD3] rounded-xl"
                  >
                    <option value="all">Semua Paket</option>
                    {packages.map((p) => (
                      <option key={p.id} value={p.slug}>
                        {p.title}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="max-h-40 overflow-y-auto space-y-1.5 border border-[#DFDCD3] rounded-xl p-2 bg-[#F7F6F2]">
                  {filteredStudentsForPicker.map((s) => {
                    const checked = selectedStudentIds.includes(s.id);
                    return (
                      <label key={s.id} className="flex items-center gap-2 text-xs p-1.5 rounded-lg hover:bg-white cursor-pointer">
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() =>
                            setSelectedStudentIds((prev) =>
                              checked ? prev.filter((id) => id !== s.id) : [...prev, s.id]
                            )
                          }
                          className="accent-[#BE123C]"
                        />
                        <span className="truncate font-semibold text-[#121820]">{s.childName}</span>
                        <span className="text-[#626E7E] font-mono ml-auto shrink-0">{s.parentPhone}</span>
                      </label>
                    );
                  })}
                </div>
              </div>

              {/* WA Groups */}
              {waGroups.length > 0 && (
                <div className="space-y-2">
                  <p className="text-xs font-semibold text-[#121820]">Grup WhatsApp Tersimpan</p>
                  <div className="max-h-28 overflow-y-auto space-y-1 border border-[#DFDCD3] rounded-xl p-2 bg-[#F7F6F2]">
                    {waGroups.map((g) => {
                      const checked = selectedGroupIds.includes(g.id);
                      return (
                        <label key={g.id} className="flex items-center gap-2 text-xs p-1 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={() =>
                              setSelectedGroupIds((prev) =>
                                checked ? prev.filter((id) => id !== g.id) : [...prev, g.id]
                              )
                            }
                            className="accent-[#BE123C]"
                          />
                          <span className="truncate">{g.name}</span>
                        </label>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Manual + CSV */}
              <div className="space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <label className="text-xs font-semibold text-[#121820]">
                    Nomor Manual (1 per baris / koma)
                  </label>
                  <label className="inline-flex items-center gap-1 text-xs font-semibold text-[#0F766E] cursor-pointer">
                    <Upload className="w-3.5 h-3.5" />
                    <span>Impor CSV</span>
                    <input
                      type="file"
                      accept=".csv,text/csv"
                      className="hidden"
                      onChange={(e) => {
                        handleCsvFileUpload(e.target.files?.[0]);
                        e.target.value = '';
                      }}
                    />
                  </label>
                </div>
                <textarea
                  rows={3}
                  value={manualPhonesText}
                  onChange={(e) => setManualPhonesText(e.target.value)}
                  placeholder="082119770700&#10;6281996284733"
                  className="w-full px-3 py-2 text-xs font-mono bg-white border border-[#DFDCD3] rounded-xl"
                />
                {csvRecipients.length > 0 && (
                  <p className="text-[11px] text-[#0F766E]">
                    +{csvRecipients.length} kontak dari CSV dimuat.{' '}
                    <button
                      type="button"
                      onClick={() => setCsvRecipients([])}
                      className="underline text-[#B91C1C] cursor-pointer"
                    >
                      Hapus CSV
                    </button>
                  </p>
                )}
              </div>

              {/* Validation Summary & Launch */}
              <div className="p-4 rounded-xl bg-[#F7F6F2] border border-[#DFDCD3] space-y-2 text-xs">
                <p className="font-bold text-[#121820]">Ringkasan Validasi Penerima:</p>
                <div className="grid grid-cols-2 gap-1 font-mono tabular-nums">
                  <span>Valid Siap Kirim:</span>
                  <strong className="text-right text-[#15803D]">{recipientSummary.accepted.length}</strong>
                  <span>Duplikat Dihapus:</span>
                  <strong className="text-right">{recipientSummary.duplicates}</strong>
                  <span>Dilewati (Opt-Out):</span>
                  <strong className="text-right text-[#B45309]">{recipientSummary.optedOut}</strong>
                  <span>Format Tidak Valid:</span>
                  <strong className="text-right text-[#B91C1C]">{recipientSummary.invalid.length}</strong>
                </div>
              </div>

              {!confirmReady ? (
                <button
                  type="button"
                  disabled={!messageText.trim() || recipientSummary.accepted.length === 0}
                  onClick={() => setConfirmReady(true)}
                  className="w-full inline-flex items-center justify-center gap-2 px-5 py-3 min-h-[46px] text-sm font-semibold text-white bg-[#121820] hover:bg-[#BE123C] rounded-xl transition-colors cursor-pointer disabled:opacity-50"
                >
                  <Send className="w-4 h-4" />
                  <span>Tinjau &amp; Jalankan Siaran ({recipientSummary.accepted.length})</span>
                </button>
              ) : (
                <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 space-y-3">
                  <p className="text-xs font-semibold text-amber-900">
                    Konfirmasi: Siap mengirim pesan ke {recipientSummary.accepted.length} penerima secara bertahap?
                  </p>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      disabled={launching}
                      onClick={handleLaunchCampaign}
                      className="flex-1 px-4 py-2.5 text-xs font-semibold text-white bg-[#BE123C] hover:bg-[#9F1239] rounded-xl cursor-pointer"
                    >
                      {launching ? 'Memulai Antrean...' : 'Ya, Mulai Kirim Sekarang'}
                    </button>
                    <button
                      type="button"
                      onClick={() => setConfirmReady(false)}
                      className="px-4 py-2.5 text-xs font-semibold text-[#121820] bg-white border border-[#DFDCD3] rounded-xl cursor-pointer"
                    >
                      Batal
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* SUB-TAB 2: TEMPLATES CRUD */}
      {subTab === 'templates' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between gap-3">
            <h3 className="font-display text-2xl font-bold text-[#121820]">
              Daftar Template Pesan (8 Kategori)
            </h3>
            <button
              type="button"
              onClick={() =>
                setTplDraft({
                  name: '',
                  category: 'Pengumuman Umum',
                  content: '',
                  isEnabled: true,
                })
              }
              className="inline-flex items-center gap-1.5 px-4 py-2.5 text-xs font-semibold text-white bg-[#BE123C] hover:bg-[#9F1239] rounded-xl cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Template Baru</span>
            </button>
          </div>

          {tplDraft && (
            <form onSubmit={handleSaveTemplate} className="editorial-card rounded-2xl p-6 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-[#121820] mb-1">Nama Template *</label>
                  <input
                    type="text"
                    required
                    value={tplDraft.name}
                    onChange={(e) => setTplDraft({ ...tplDraft, name: e.target.value })}
                    className="w-full px-3.5 py-2.5 text-sm bg-white border border-[#DFDCD3] rounded-xl"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#121820] mb-1">Kategori *</label>
                  <select
                    value={tplDraft.category}
                    onChange={(e) =>
                      setTplDraft({ ...tplDraft, category: e.target.value as WaTemplateCategory })
                    }
                    className="w-full px-3.5 py-2.5 text-sm bg-white border border-[#DFDCD3] rounded-xl"
                  >
                    {WA_TEMPLATE_CATEGORIES.map((cat) => (
                      <option key={cat} value={cat}>
                        {cat}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-[#121820] mb-1">Isi Pesan *</label>
                <textarea
                  rows={4}
                  required
                  value={tplDraft.content}
                  onChange={(e) => setTplDraft({ ...tplDraft, content: e.target.value })}
                  className="w-full px-3.5 py-2.5 text-sm bg-white border border-[#DFDCD3] rounded-xl"
                />
              </div>
              <label className="inline-flex items-center gap-2 text-xs font-semibold text-[#121820]">
                <input
                  type="checkbox"
                  checked={tplDraft.isEnabled}
                  onChange={(e) => setTplDraft({ ...tplDraft, isEnabled: e.target.checked })}
                  className="accent-[#BE123C]"
                />
                <span>Template Aktif</span>
              </label>
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setTplDraft(null)}
                  className="px-4 py-2 text-xs font-semibold bg-[#EFECE4] rounded-xl cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-xs font-semibold text-white bg-[#121820] hover:bg-[#BE123C] rounded-xl cursor-pointer"
                >
                  Simpan Template
                </button>
              </div>
            </form>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {templates.map((tpl) => (
              <div key={tpl.id} className="editorial-card rounded-2xl p-5 flex flex-col justify-between gap-3">
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between gap-2 text-xs">
                    <span className="font-semibold text-[#BE123C]">{tpl.category}</span>
                    <span className={tpl.isEnabled ? 'text-[#15803D] font-semibold' : 'text-[#626E7E]'}>
                      {tpl.isEnabled ? 'Aktif' : 'Nonaktif'}
                    </span>
                  </div>
                  <h4 className="text-base font-bold text-[#121820]">{tpl.name}</h4>
                  <p className="text-xs text-[#3F4A59] whitespace-pre-line leading-relaxed">{tpl.content}</p>
                </div>
                <div className="flex items-center justify-between pt-3 border-t border-[#DFDCD3]">
                  <button
                    type="button"
                    onClick={() => {
                      handleSelectTemplate(tpl.id);
                      setSubTab('compose');
                    }}
                    className="text-xs font-semibold text-[#0F766E] cursor-pointer"
                  >
                    Gunakan di Siaran
                  </button>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() =>
                        setTplDraft({
                          id: tpl.id,
                          name: tpl.name,
                          category: tpl.category,
                          content: tpl.content,
                          isEnabled: tpl.isEnabled,
                        })
                      }
                      className="px-3 py-1.5 text-xs font-semibold bg-[#EFECE4] rounded-lg cursor-pointer"
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeleteTemplate(tpl.id)}
                      className="px-2.5 py-1.5 text-xs font-semibold text-[#B91C1C] bg-rose-50 rounded-lg cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* SUB-TAB 3: HISTORY & CSV EXPORT */}
      {subTab === 'history' && (
        <div className="editorial-card rounded-2xl p-6 space-y-4">
          <h3 className="font-display text-2xl font-bold text-[#121820]">
            Riwayat Kampanye &amp; Laporan CSV
          </h3>
          {campaigns.length === 0 ? (
            <p className="text-sm text-[#626E7E]">Belum ada riwayat siaran pesan.</p>
          ) : (
            <div className="space-y-4">
              {campaigns.map((c) => (
                <div key={c.id} className="p-5 rounded-xl bg-[#F7F6F2] border border-[#DFDCD3] space-y-3">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <h4 className="text-base font-bold text-[#121820]">{c.title}</h4>
                      <p className="text-xs text-[#626E7E]">
                        {new Date(c.createdAtIso).toLocaleString('id-ID')} · Oleh {c.createdByEmail}
                      </p>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-xs font-mono font-bold uppercase text-[#121820]">
                        {c.status}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleDownloadCampaignCsv(c.id)}
                        className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-[#0F766E] rounded-xl cursor-pointer"
                      >
                        <Download className="w-3.5 h-3.5" />
                        <span>Unduh CSV</span>
                      </button>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-4 text-xs font-mono tabular-nums">
                    <span>Total: <strong>{c.totalCount}</strong></span>
                    <span className="text-[#15803D]">Berhasil: <strong>{c.successCount}</strong></span>
                    <span className="text-[#B91C1C]">Gagal: <strong>{c.failedCount}</strong></span>
                    <span className="text-[#B45309]">Menunggu: <strong>{c.waitingCount}</strong></span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* SUB-TAB 4: SETTINGS, OPT-OUTS, AUTOMATION */}
      {subTab === 'settings' && settings && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          <form onSubmit={handleSaveSettings} className="lg:col-span-7 editorial-card rounded-2xl p-6 space-y-5">
            <div className="flex items-center gap-2 border-b border-[#DFDCD3] pb-3">
              <Settings className="w-4 h-4 text-[#BE123C]" />
              <h3 className="text-base font-bold text-[#121820]">
                Pengaturan Antrean &amp; Otomatisasi
              </h3>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-semibold text-[#121820] mb-1">Jeda Antar Pesan (Detik)</label>
                <input
                  type="number"
                  min={1}
                  max={60}
                  value={settings.delaySeconds}
                  onChange={(e) =>
                    setSettings({ ...settings, delaySeconds: Math.max(1, Number(e.target.value) || 2) })
                  }
                  className="w-full px-3 py-2 text-sm font-mono bg-white border border-[#DFDCD3] rounded-xl"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-[#121820] mb-1">Ukuran Batch per Langkah</label>
                <input
                  type="number"
                  min={1}
                  max={25}
                  value={settings.batchSize}
                  onChange={(e) =>
                    setSettings({ ...settings, batchSize: Math.max(1, Number(e.target.value) || 5) })
                  }
                  className="w-full px-3 py-2 text-sm font-mono bg-white border border-[#DFDCD3] rounded-xl"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-[#121820] mb-1">Maks. Retry Gagal</label>
                <input
                  type="number"
                  min={0}
                  max={3}
                  value={settings.maxRetries}
                  onChange={(e) =>
                    setSettings({ ...settings, maxRetries: Math.max(0, Number(e.target.value) || 1) })
                  }
                  className="w-full px-3 py-2 text-sm font-mono bg-white border border-[#DFDCD3] rounded-xl"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#121820] mb-1">Nomor Penerima Uji Pesan</label>
              <input
                type="tel"
                value={settings.testRecipientPhone}
                onChange={(e) => setSettings({ ...settings, testRecipientPhone: e.target.value })}
                className="w-full px-3.5 py-2.5 text-sm font-mono bg-white border border-[#DFDCD3] rounded-xl"
              />
            </div>

            <div className="space-y-3 pt-2 border-t border-[#DFDCD3]">
              <p className="text-xs font-bold uppercase text-[#626E7E]">
                Otomatisasi Notifikasi &amp; Pemetaan Template
              </p>

              <label className="flex items-center justify-between gap-3 p-3 rounded-xl bg-[#F7F6F2] border border-[#DFDCD3]">
                <span className="text-xs font-semibold text-[#121820]">
                  Notifikasi Otomatis Pendaftaran Siswa Baru
                </span>
                <input
                  type="checkbox"
                  checked={settings.autoNotifyRegistration}
                  onChange={(e) => setSettings({ ...settings, autoNotifyRegistration: e.target.checked })}
                  className="w-4 h-4 accent-[#BE123C]"
                />
              </label>

              <label className="flex items-center justify-between gap-3 p-3 rounded-xl bg-[#F7F6F2] border border-[#DFDCD3]">
                <span className="text-xs font-semibold text-[#121820]">
                  Kirim Otomatis Pengumuman Kuis Online Saat Terbit (jika target diisi)
                </span>
                <input
                  type="checkbox"
                  checked={settings.autoNotifyQuizPublished}
                  onChange={(e) => setSettings({ ...settings, autoNotifyQuizPublished: e.target.checked })}
                  className="w-4 h-4 accent-[#BE123C]"
                />
              </label>

              <label className="flex items-center justify-between gap-3 p-3 rounded-xl bg-[#F7F6F2] border border-[#DFDCD3]">
                <span className="text-xs font-semibold text-[#121820]">
                  Aktifkan Pengingat Pembelajaran Terjadwal
                </span>
                <input
                  type="checkbox"
                  checked={settings.autoNotifyLearningInfo}
                  onChange={(e) => setSettings({ ...settings, autoNotifyLearningInfo: e.target.checked })}
                  className="w-4 h-4 accent-[#BE123C]"
                />
              </label>
            </div>

            <div className="flex justify-end">
              <button
                type="submit"
                disabled={savingSettings}
                className="inline-flex items-center gap-2 px-5 py-2.5 min-h-[44px] text-xs font-semibold text-white bg-[#121820] hover:bg-[#BE123C] rounded-xl cursor-pointer"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>{savingSettings ? 'Menyimpan...' : 'Simpan Pengaturan'}</span>
              </button>
            </div>
          </form>

          {/* Opt-Out Management */}
          <div className="lg:col-span-5 editorial-card rounded-2xl p-6 space-y-4">
            <h3 className="text-base font-bold text-[#121820]">
              Daftar Pengecualian (Opt-Out / Berhenti Pesan)
            </h3>
            <p className="text-xs text-[#626E7E]">
              Nomor dalam daftar ini akan dilewati otomatis saat pengiriman siaran massal.
            </p>
            <div className="space-y-2">
              <input
                type="tel"
                value={newOptOutPhone}
                onChange={(e) => setNewOptOutPhone(e.target.value)}
                placeholder="Nomor WA (mis. 0812...)"
                className="w-full px-3 py-2 text-xs font-mono bg-white border border-[#DFDCD3] rounded-xl"
              />
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newOptOutReason}
                  onChange={(e) => setNewOptOutReason(e.target.value)}
                  placeholder="Alasan (opsional)"
                  className="flex-1 px-3 py-2 text-xs bg-white border border-[#DFDCD3] rounded-xl"
                />
                <button
                  type="button"
                  onClick={async () => {
                    if (!newOptOutPhone.trim()) return;
                    const token = await user.getIdToken();
                    const res = await fetch('/api/admin/wa-center/optouts', {
                      method: 'POST',
                      headers: {
                        'Content-Type': 'application/json',
                        Authorization: `Bearer ${token}`,
                      },
                      body: JSON.stringify({
                        phone: newOptOutPhone.trim(),
                        reason: newOptOutReason.trim(),
                      }),
                    });
                    const data = await res.json();
                    if (data.ok) {
                      setOptOuts(data.optOuts);
                      setNewOptOutPhone('');
                      setNewOptOutReason('');
                    }
                  }}
                  className="px-4 py-2 text-xs font-semibold text-white bg-[#121820] rounded-xl cursor-pointer"
                >
                  Tambah
                </button>
              </div>
            </div>

            <div className="space-y-2 max-h-60 overflow-y-auto">
              {optOuts.length === 0 ? (
                <p className="text-xs text-[#626E7E]">Belum ada nomor opt-out.</p>
              ) : (
                optOuts.map((o) => (
                  <div
                    key={o.phone}
                    className="flex items-center justify-between gap-2 p-2.5 rounded-xl bg-[#F7F6F2] border border-[#DFDCD3] text-xs"
                  >
                    <div>
                      <p className="font-mono font-bold text-[#121820]">{o.phone}</p>
                      <p className="text-[11px] text-[#626E7E]">{o.reason}</p>
                    </div>
                    <button
                      type="button"
                      onClick={async () => {
                        const token = await user.getIdToken();
                        const res = await fetch(
                          `/api/admin/wa-center/optouts/${encodeURIComponent(o.phone)}`,
                          {
                            method: 'DELETE',
                            headers: { Authorization: `Bearer ${token}` },
                          }
                        );
                        const data = await res.json();
                        if (data.ok) setOptOuts(data.optOuts);
                      }}
                      className="text-xs text-[#B91C1C] cursor-pointer"
                    >
                      Hapus
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
