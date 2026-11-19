import React, { useCallback, useEffect, useMemo, useState } from 'react';
import type { User } from 'firebase/auth';
import {
  Activity,
  BarChart3,
  BookOpen,
  Bot,
  CheckCircle2,
  Eye,
  FolderPlus,
  History,
  Lock,
  Pencil,
  Plus,
  RefreshCw,
  Save,
  Search,
  Send,
  Settings,
  ShieldCheck,
  Sliders,
  Trash2,
  X,
  XCircle,
} from 'lucide-react';
import {
  type AiChatbotSettings,
  type AiInstructionConfig,
  type AiKnowledgeItem,
  type AiModelPricing,
  type AiSessionStatSummary,
  type AiUsageDailyRecord,
  DEFAULT_AI_INSTRUCTIONS,
  INITIAL_AI_KNOWLEDGE_CATEGORIES,
  SUPPORTED_AI_MODELS,
  buildChatbotWhatsappUrl,
  createDefaultAiSettings,
} from '../lib/aiDomain';
import { formatJakartaDateTime } from '../lib/domain';

type AiSubMenu =
  | 'dashboard'
  | 'knowledge'
  | 'instructions'
  | 'settings'
  | 'analytics'
  | 'sessions';

interface AnalyticsSummary {
  totalRequests: number;
  publicRequests: number;
  adminRequests: number;
  failedRequests: number;
  inputTokens: number;
  outputTokens: number;
  estimatedCostUsd: number;
  sessionCount: number;
}

interface LimitsSummary {
  dailyRequestLimit: number;
  monthlyRequestLimit: number;
  maxRequestsPerSession: number;
  maxOutputTokens: number;
  todayRequests: number;
}

interface AdminTestChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  mode: 'admin' | 'public';
  modelUsed?: string;
  errorDetail?: string;
}

const ADMIN_TEST_PROMPTS: string[] = [
  'Berapa jumlah seluruh murid saat ini?',
  'Berapa murid yang masih aktif?',
  'Kelas mana yang mempunyai murid terbanyak?',
  'Ringkasan pembayaran tercatat saat ini?',
];

export function AdminAiPanel({ user }: { user: User }) {
  const [subMenu, setSubMenu] = useState<AiSubMenu>('dashboard');
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [banner, setBanner] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);

  // Overview / Server Config State
  const [groqConfigured, setGroqConfigured] = useState(false);
  const [activeModel, setActiveModel] = useState('openai/gpt-oss-20b');
  const [supportedModels, setSupportedModels] = useState<AiModelPricing[]>(SUPPORTED_AI_MODELS);
  const [limits, setLimits] = useState<LimitsSummary>({
    dailyRequestLimit: 500,
    monthlyRequestLimit: 10000,
    maxRequestsPerSession: 20,
    maxOutputTokens: 900,
    todayRequests: 0,
  });

  // Knowledge Center State
  const [knowledgeItems, setKnowledgeItems] = useState<AiKnowledgeItem[]>([]);
  const [categories, setCategories] = useState<string[]>(INITIAL_AI_KNOWLEDGE_CATEGORIES);
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [newCategoryName, setNewCategoryName] = useState('');
  const [showNewCatForm, setShowNewCatForm] = useState(false);
  const [editingKnowledge, setEditingKnowledge] = useState<{
    id?: string;
    title: string;
    category: string;
    content: string;
    isActive: boolean;
  } | null>(null);
  const [previewKnowledge, setPreviewKnowledge] = useState<AiKnowledgeItem | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  // Instructions State
  const [instructions, setInstructions] = useState<AiInstructionConfig>(DEFAULT_AI_INSTRUCTIONS);

  // Settings State
  const [settings, setSettings] = useState<AiChatbotSettings>(createDefaultAiSettings);
  const [newSuggestedQ, setNewSuggestedQ] = useState('');

  // Analytics & Session State
  const [period, setPeriod] = useState<'today' | '7d' | '30d' | 'all'>('30d');
  const [analyticsSummary, setAnalyticsSummary] = useState<AnalyticsSummary>({
    totalRequests: 0,
    publicRequests: 0,
    adminRequests: 0,
    failedRequests: 0,
    inputTokens: 0,
    outputTokens: 0,
    estimatedCostUsd: 0,
    sessionCount: 0,
  });
  const [dailyRows, setDailyRows] = useState<AiUsageDailyRecord[]>([]);
  const [sessionRows, setSessionRows] = useState<AiSessionStatSummary[]>([]);

  // Inline Admin Assistant Tester (on Dashboard AI)
  const [testMode, setTestMode] = useState<'admin' | 'public'>('admin');
  const [testSessionId, setTestSessionId] = useState<string>(
    () => `admin_test_${Date.now().toString(36)}`
  );
  const [testMessages, setTestMessages] = useState<AdminTestChatMessage[]>([]);
  const [testInput, setTestInput] = useState('');
  const [testSending, setTestSending] = useState(false);

  const authFetch = useCallback(
    async (url: string, init?: RequestInit) => {
      const token = await user.getIdToken();
      return fetch(url, {
        ...init,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
          ...(init?.headers || {}),
        },
      });
    },
    [user]
  );

  const loadAll = useCallback(async () => {
    setLoading(true);
    try {
      const [ovRes, knRes, anRes] = await Promise.all([
        authFetch('/api/admin/ai/overview'),
        authFetch('/api/admin/ai/knowledge'),
        authFetch(`/api/admin/ai/analytics?period=${encodeURIComponent(period)}`),
      ]);

      if (ovRes.ok) {
        const ov = (await ovRes.json()) as {
          groqConfigured?: boolean;
          activeModel: string;
          supportedModels: AiModelPricing[];
          settings: AiChatbotSettings;
          instructions: AiInstructionConfig;
          limits: LimitsSummary;
        };
        setGroqConfigured(Boolean(ov.groqConfigured));
        setActiveModel(ov.activeModel || 'openai/gpt-oss-20b');
        if (Array.isArray(ov.supportedModels) && ov.supportedModels.length > 0) {
          setSupportedModels(ov.supportedModels);
        }
        if (ov.settings) setSettings(ov.settings);
        if (ov.instructions) setInstructions(ov.instructions);
        if (ov.limits) setLimits(ov.limits);
      }

      if (knRes.ok) {
        const kn = (await knRes.json()) as {
          items: AiKnowledgeItem[];
          categories: string[];
        };
        setKnowledgeItems(Array.isArray(kn.items) ? kn.items : []);
        if (Array.isArray(kn.categories) && kn.categories.length > 0) {
          setCategories(kn.categories);
        }
      }

      if (anRes.ok) {
        const an = (await anRes.json()) as {
          summary: AnalyticsSummary;
          daily: AiUsageDailyRecord[];
          sessions: AiSessionStatSummary[];
          limits?: LimitsSummary;
        };
        if (an.summary) setAnalyticsSummary(an.summary);
        setDailyRows(Array.isArray(an.daily) ? an.daily : []);
        setSessionRows(Array.isArray(an.sessions) ? an.sessions : []);
        if (an.limits) setLimits(an.limits);
      }
    } catch {
      setBanner({ type: 'err', text: 'Gagal memuat data modul TOMOYO AI.' });
    } finally {
      setLoading(false);
    }
  }, [authFetch, period]);

  useEffect(() => {
    void loadAll();
  }, [loadAll]);

  const loadAnalyticsPeriod = async (nextPeriod: 'today' | '7d' | '30d' | 'all') => {
    setPeriod(nextPeriod);
    try {
      const res = await authFetch(`/api/admin/ai/analytics?period=${encodeURIComponent(nextPeriod)}`);
      if (res.ok) {
        const an = (await res.json()) as {
          summary: AnalyticsSummary;
          daily: AiUsageDailyRecord[];
          sessions: AiSessionStatSummary[];
        };
        if (an.summary) setAnalyticsSummary(an.summary);
        setDailyRows(Array.isArray(an.daily) ? an.daily : []);
        setSessionRows(Array.isArray(an.sessions) ? an.sessions : []);
      }
    } catch {
      setBanner({ type: 'err', text: 'Gagal memuat statistik periode.' });
    }
  };

  const filteredKnowledge = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return knowledgeItems.filter((item) => {
      if (categoryFilter !== 'all' && item.category !== categoryFilter) return false;
      if (statusFilter === 'active' && !item.isActive) return false;
      if (statusFilter === 'inactive' && item.isActive) return false;
      if (q) {
        const hay = `${item.title} ${item.category} ${item.content}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [knowledgeItems, searchQuery, categoryFilter, statusFilter]);

  const handleSaveKnowledge = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingKnowledge) return;
    setBusy(true);
    setBanner(null);
    try {
      const isEdit = Boolean(editingKnowledge.id);
      const url = isEdit
        ? `/api/admin/ai/knowledge/${encodeURIComponent(editingKnowledge.id!)}`
        : '/api/admin/ai/knowledge';
      const res = await authFetch(url, {
        method: isEdit ? 'PUT' : 'POST',
        body: JSON.stringify({
          title: editingKnowledge.title,
          category: editingKnowledge.category,
          content: editingKnowledge.content,
          isActive: editingKnowledge.isActive,
        }),
      });
      const json = (await res.json()) as {
        ok?: boolean;
        error?: string;
        item?: AiKnowledgeItem;
        categories?: string[];
      };
      if (!res.ok || !json.ok) {
        setBanner({ type: 'err', text: json.error || 'Gagal menyimpan materi Knowledge Center.' });
        return;
      }
      if (Array.isArray(json.categories)) setCategories(json.categories);
      setEditingKnowledge(null);
      setBanner({
        type: 'ok',
        text: isEdit
          ? 'Materi Knowledge Center berhasil diperbarui.'
          : 'Materi baru berhasil ditambahkan ke Knowledge Center.',
      });
      await loadAll();
    } finally {
      setBusy(false);
    }
  };

  const handleToggleKnowledgeActive = async (item: AiKnowledgeItem) => {
    setBusy(true);
    setBanner(null);
    try {
      const res = await authFetch(`/api/admin/ai/knowledge/${encodeURIComponent(item.id)}`, {
        method: 'PUT',
        body: JSON.stringify({
          title: item.title,
          category: item.category,
          content: item.content,
          isActive: !item.isActive,
        }),
      });
      if (!res.ok) {
        setBanner({ type: 'err', text: 'Gagal mengubah status aktif materi.' });
        return;
      }
      await loadAll();
    } finally {
      setBusy(false);
    }
  };

  const handleDeleteKnowledge = async (id: string) => {
    setBusy(true);
    setBanner(null);
    try {
      const res = await authFetch(`/api/admin/ai/knowledge/${encodeURIComponent(id)}`, {
        method: 'DELETE',
      });
      if (!res.ok) {
        setBanner({ type: 'err', text: 'Gagal menghapus materi Knowledge Center.' });
        return;
      }
      setConfirmDeleteId(null);
      setBanner({ type: 'ok', text: 'Materi Knowledge Center berhasil dihapus.' });
      await loadAll();
    } finally {
      setBusy(false);
    }
  };

  const handleCreateCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    const clean = newCategoryName.trim();
    if (clean.length < 2) return;
    setBusy(true);
    try {
      const res = await authFetch('/api/admin/ai/knowledge/categories', {
        method: 'POST',
        body: JSON.stringify({ name: clean }),
      });
      const json = (await res.json()) as { ok?: boolean; categories?: string[]; error?: string };
      if (!res.ok || !json.ok) {
        setBanner({ type: 'err', text: json.error || 'Gagal menambah kategori baru.' });
        return;
      }
      if (Array.isArray(json.categories)) setCategories(json.categories);
      if (editingKnowledge) {
        setEditingKnowledge({ ...editingKnowledge, category: clean });
      }
      setNewCategoryName('');
      setShowNewCatForm(false);
      setBanner({ type: 'ok', text: `Kategori "${clean}" ditambahkan.` });
    } finally {
      setBusy(false);
    }
  };

  const handleSaveInstructions = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setBanner(null);
    try {
      const res = await authFetch('/api/admin/ai/instructions', {
        method: 'PUT',
        body: JSON.stringify(instructions),
      });
      const json = (await res.json()) as {
        ok?: boolean;
        instructions?: AiInstructionConfig;
        error?: string;
      };
      if (!res.ok || !json.ok) {
        setBanner({ type: 'err', text: json.error || 'Gagal menyimpan instruksi AI.' });
        return;
      }
      if (json.instructions) setInstructions(json.instructions);
      setBanner({ type: 'ok', text: 'Instruksi perilaku AI berhasil disimpan.' });
    } finally {
      setBusy(false);
    }
  };

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setBanner(null);
    try {
      const res = await authFetch('/api/admin/ai/settings', {
        method: 'PUT',
        body: JSON.stringify(settings),
      });
      const json = (await res.json()) as {
        ok?: boolean;
        settings?: AiChatbotSettings;
        error?: string;
      };
      if (!res.ok || !json.ok) {
        setBanner({ type: 'err', text: json.error || 'Gagal menyimpan pengaturan chatbot.' });
        return;
      }
      if (json.settings) setSettings(json.settings);
      setBanner({ type: 'ok', text: 'Pengaturan TOMOYO ASISTEN berhasil diperbarui.' });
      await loadAll();
    } finally {
      setBusy(false);
    }
  };

  const handleSendTestChat = async (overrideText?: string) => {
    const prompt = (typeof overrideText === 'string' ? overrideText : testInput).trim();
    if (!prompt || testSending) return;

    const historyPayload = testMessages.slice(-8).map((m) => ({
      role: m.role,
      content: m.content,
    }));

    setTestMessages((prev) => [
      ...prev,
      { id: `u_${Date.now()}`, role: 'user', content: prompt, mode: testMode },
    ]);
    if (typeof overrideText !== 'string') setTestInput('');
    setTestSending(true);

    try {
      const res = await authFetch('/api/ai/chat', {
        method: 'POST',
        body: JSON.stringify({
          sessionId: testSessionId,
          message: prompt,
          history: historyPayload,
          mode: testMode,
        }),
      });
      const json = (await res.json()) as {
        reply?: string;
        mode?: 'admin' | 'public';
        modelUsed?: string;
        error?: string;
      };
      setTestMessages((prev) => [
        ...prev,
        {
          id: `a_${Date.now()}`,
          role: 'assistant',
          content: json.reply || 'Tidak ada respons dari backend.',
          mode: json.mode || testMode,
          modelUsed: json.modelUsed,
          errorDetail: json.error,
        },
      ]);
      // Refresh analytics summary silently after test request
      void loadAnalyticsPeriod(period);
    } catch {
      setTestMessages((prev) => [
        ...prev,
        {
          id: `a_err_${Date.now()}`,
          role: 'assistant',
          content: 'Gagal menghubungi endpoint /api/ai/chat.',
          mode: testMode,
        },
      ]);
    } finally {
      setTestSending(false);
    }
  };

  const activeKnowledgeCount = knowledgeItems.filter((k) => k.isActive).length;
  const whatsappPreviewUrl = buildChatbotWhatsappUrl(
    settings.adminWhatsapp,
    'Halo Admin TOMOYO EDUCATION, saya ingin bertanya.'
  );

  const subMenuItems: Array<{ id: AiSubMenu; label: string; icon: React.ComponentType<{ className?: string }> }> = [
    { id: 'dashboard', label: 'Dashboard AI', icon: Bot },
    { id: 'knowledge', label: 'Knowledge Center', icon: BookOpen },
    { id: 'instructions', label: 'Instruksi AI', icon: Sliders },
    { id: 'settings', label: 'Pengaturan Chatbot', icon: Settings },
    { id: 'analytics', label: 'Statistik Penggunaan', icon: BarChart3 },
    { id: 'sessions', label: 'Riwayat Sesi', icon: History },
  ];

  return (
    <div className="space-y-6" data-testid="admin-ai-panel">
      {/* Submenu Navigation Bar */}
      <div className="bg-white border border-[#E5E2D9] rounded-xl p-2 flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap gap-1.5">
          {subMenuItems.map((tab) => {
            const Icon = tab.icon;
            const active = subMenu === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setSubMenu(tab.id)}
                data-testid={`ai-subtab-${tab.id}`}
                className={`inline-flex items-center gap-2 px-3.5 py-2 min-h-[40px] rounded-lg text-xs sm:text-sm font-semibold transition-colors cursor-pointer ${
                  active
                    ? 'bg-[#141A23] text-white'
                    : 'text-[#3E4856] hover:bg-[#FAF9F5] hover:text-[#141A23]'
                }`}
              >
                <Icon className="w-4 h-4 shrink-0" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        <button
          type="button"
          onClick={() => void loadAll()}
          disabled={loading}
          className="inline-flex items-center gap-1.5 px-3 py-2 min-h-[38px] text-xs font-semibold text-[#3E4856] bg-[#FAF9F5] border border-[#E5E2D9] hover:border-[#141A23] rounded-lg cursor-pointer"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          <span>Muat Ulang</span>
        </button>
      </div>

      {banner && (
        <div
          className={`rounded-xl px-4 py-3 text-sm font-medium flex items-center justify-between gap-3 border ${
            banner.type === 'ok'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
              : 'bg-rose-50 border-rose-200 text-rose-900'
          }`}
        >
          <span>{banner.text}</span>
          <button
            type="button"
            onClick={() => setBanner(null)}
            className="text-xs underline cursor-pointer shrink-0"
          >
            Tutup
          </button>
        </div>
      )}

      {/* ==================== 1. DASHBOARD AI ==================== */}
      {subMenu === 'dashboard' && (
        <div className="space-y-6">
          {/* Status Strip */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-white border border-[#E5E2D9] rounded-xl p-5 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-wider text-[#646F7E]">
                  Status Koneksi Groq AI
                </span>
                {groqConfigured ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                ) : (
                  <XCircle className="w-4 h-4 text-rose-600" />
                )}
              </div>
              <p className="text-base font-bold text-[#141A23]">
                {groqConfigured ? 'Terkonfigurasi (Server-Side)' : 'Belum Terkonfigurasi'}
              </p>
              <p className="text-xs text-[#646F7E]">
                API key dibaca aman melalui environment server (<code>GROQ_API_KEY</code>) dan tidak pernah dikirim ke browser.
              </p>
            </div>

            <div className="bg-white border border-[#E5E2D9] rounded-xl p-5 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-wider text-[#646F7E]">
                  Model &amp; Status Widget
                </span>
                <Activity className="w-4 h-4 text-[#0F6E66]" />
              </div>
              <p className="text-base font-bold font-mono text-[#141A23]">
                {activeModel}
              </p>
              <p className="text-xs text-[#646F7E]">
                Widget: <strong>{settings.enabled ? 'Aktif' : 'Nonaktif'}</strong> · Publik:{' '}
                <strong>{settings.publicEnabled ? 'Aktif' : 'Off'}</strong> · Admin:{' '}
                <strong>{settings.adminEnabled ? 'Aktif' : 'Off'}</strong>
              </p>
            </div>

            <div className="bg-white border border-[#E5E2D9] rounded-xl p-5 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-wider text-[#646F7E]">
                  Kuota Harian ({limits.todayRequests}/{limits.dailyRequestLimit})
                </span>
                <ShieldCheck className="w-4 h-4 text-[#A61B38]" />
              </div>
              <p className="text-base font-bold font-mono text-[#141A23] tabular-nums">
                {activeKnowledgeCount} / {knowledgeItems.length} Materi Aktif
              </p>
              <p className="text-xs text-[#646F7E]">
                Batas sesi: {limits.maxRequestsPerSession} tanya · Max output: {limits.maxOutputTokens} token.
              </p>
            </div>
          </div>

          {/* KPI Strip */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white border border-[#E5E2D9] rounded-xl p-4">
              <p className="text-xs text-[#646F7E]">Total Permintaan (30 Hari)</p>
              <p className="mt-1 text-2xl font-extrabold font-mono text-[#141A23] tabular-nums">
                {analyticsSummary.totalRequests.toLocaleString('id-ID')}
              </p>
            </div>
            <div className="bg-white border border-[#E5E2D9] rounded-xl p-4">
              <p className="text-xs text-[#646F7E]">Publik / Admin</p>
              <p className="mt-1 text-2xl font-extrabold font-mono text-[#0F6E66] tabular-nums">
                {analyticsSummary.publicRequests} / {analyticsSummary.adminRequests}
              </p>
            </div>
            <div className="bg-white border border-[#E5E2D9] rounded-xl p-4">
              <p className="text-xs text-[#646F7E]">Total Token (In / Out)</p>
              <p className="mt-1 text-lg sm:text-xl font-extrabold font-mono text-[#141A23] tabular-nums">
                {analyticsSummary.inputTokens.toLocaleString('id-ID')} /{' '}
                {analyticsSummary.outputTokens.toLocaleString('id-ID')}
              </p>
            </div>
            <div className="bg-white border border-[#E5E2D9] rounded-xl p-4">
              <p className="text-xs text-[#646F7E]">Perkiraan Biaya API</p>
              <p className="mt-1 text-2xl font-extrabold font-mono text-[#A61B38] tabular-nums">
                ${analyticsSummary.estimatedCostUsd.toFixed(4)}
              </p>
            </div>
          </div>

          {/* Admin Assistant Inline Tester */}
          <div className="bg-white border border-[#E5E2D9] rounded-xl overflow-hidden">
            <div className="px-5 py-4 border-b border-[#E5E2D9] bg-[#FAF9F5] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h2 className="text-sm font-bold text-[#141A23]">
                  Uji TOMOYO ASISTEN (Pembacaan Data Firebase &amp; Knowledge Center)
                </h2>
                <p className="text-xs text-[#646F7E]">
                  Uji pertanyaan admin (baca-saja data murid, kelas, pembayaran) atau simulasi pratinjau publik.
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setTestMode('admin')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold border cursor-pointer ${
                    testMode === 'admin'
                      ? 'bg-[#0F6E66] text-white border-[#0F6E66]'
                      : 'bg-white text-[#3E4856] border-[#E5E2D9]'
                  }`}
                >
                  Mode Admin
                </button>
                <button
                  type="button"
                  onClick={() => setTestMode('public')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold border cursor-pointer ${
                    testMode === 'public'
                      ? 'bg-[#141A23] text-white border-[#141A23]'
                      : 'bg-white text-[#3E4856] border-[#E5E2D9]'
                  }`}
                >
                  Simulasi Publik
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setTestMessages([]);
                    setTestSessionId(`admin_test_${Date.now().toString(36)}`);
                  }}
                  className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-white border border-[#E5E2D9] text-[#3E4856] hover:border-[#141A23] cursor-pointer"
                >
                  Bersihkan
                </button>
              </div>
            </div>

            <div className="p-5 space-y-4">
              <div className="flex flex-wrap gap-2">
                {ADMIN_TEST_PROMPTS.map((q) => (
                  <button
                    key={q}
                    type="button"
                    disabled={testSending}
                    onClick={() => void handleSendTestChat(q)}
                    className="px-3 py-1.5 rounded-lg bg-[#FAF9F5] border border-[#E5E2D9] hover:border-[#A61B38] text-xs font-medium text-[#141A23] cursor-pointer disabled:opacity-50"
                  >
                    {q}
                  </button>
                ))}
              </div>

              {testMessages.length > 0 && (
                <div className="max-h-72 overflow-y-auto space-y-2.5 p-3.5 rounded-xl bg-[#FAF9F5] border border-[#E5E2D9]">
                  {testMessages.map((m) => (
                    <div
                      key={m.id}
                      className={`p-3 rounded-lg text-xs sm:text-sm ${
                        m.role === 'user'
                          ? 'bg-[#141A23] text-white ml-8'
                          : 'bg-white border border-[#E5E2D9] text-[#141A23] mr-8'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2 mb-1 text-[10px] font-mono opacity-75">
                        <span>{m.role === 'user' ? 'ADMIN TEST' : `ASISTEN (${m.mode.toUpperCase()})`}</span>
                        {m.modelUsed && <span>{m.modelUsed}</span>}
                      </div>
                      <p className="whitespace-pre-wrap leading-relaxed">{m.content}</p>
                      {m.errorDetail && (
                        <p className="mt-1.5 text-[11px] font-mono text-rose-700 bg-rose-50 border border-rose-200 rounded px-2 py-1">
                          Detail Groq: {m.errorDetail}
                        </p>
                      )}
                    </div>
                  ))}
                  {testSending && (
                    <p className="text-xs text-[#646F7E] italic">
                      Memproses permintaan melalui Groq AI &amp; tool Firebase...
                    </p>
                  )}
                </div>
              )}

              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  void handleSendTestChat();
                }}
                className="flex gap-2"
              >
                <input
                  type="text"
                  value={testInput}
                  onChange={(e) => setTestInput(e.target.value)}
                  placeholder={
                    testMode === 'admin'
                      ? 'Tanyakan statistik aktual Firebase (mis. berapa murid aktif bulan ini?)...'
                      : 'Uji pertanyaan pengunjung publik...'
                  }
                  className="flex-1 px-3.5 py-2.5 text-sm bg-[#FAF9F5] border border-[#E5E2D9] focus:border-[#141A23] focus:bg-white rounded-lg outline-none"
                />
                <button
                  type="submit"
                  disabled={testSending || !testInput.trim()}
                  className="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-semibold text-white bg-[#A61B38] hover:bg-[#88132B] disabled:opacity-50 rounded-lg cursor-pointer"
                >
                  <Send className="w-4 h-4" />
                  <span>Uji</span>
                </button>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* ==================== 2. KNOWLEDGE CENTER ==================== */}
      {subMenu === 'knowledge' && (
        <div className="space-y-5">
          <div className="bg-white border border-[#E5E2D9] rounded-xl p-5 space-y-4">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
              <div>
                <h2 className="text-base font-bold text-[#141A23]">
                  Knowledge Center TOMOYO ASISTEN
                </h2>
                <p className="text-xs text-[#646F7E]">
                  Hanya materi berstatus <strong>Aktif</strong> yang dibaca asisten, dengan prioritas pembaruan terbaru.
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => setShowNewCatForm((v) => !v)}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-[#141A23] bg-[#FAF9F5] border border-[#E5E2D9] hover:border-[#141A23] rounded-lg cursor-pointer"
                >
                  <FolderPlus className="w-4 h-4" />
                  <span>Tambah Kategori</span>
                </button>
                <button
                  type="button"
                  onClick={() =>
                    setEditingKnowledge({
                      title: '',
                      category: categories[0] || 'Informasi Tambahan',
                      content: '',
                      isActive: true,
                    })
                  }
                  data-testid="ai-add-knowledge-btn"
                  className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-[#A61B38] hover:bg-[#88132B] rounded-lg cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  <span>Tambah Materi</span>
                </button>
              </div>
            </div>

            {showNewCatForm && (
              <form
                onSubmit={handleCreateCategory}
                className="p-3.5 rounded-lg bg-[#FAF9F5] border border-[#E5E2D9] flex flex-wrap items-center gap-2"
              >
                <input
                  type="text"
                  value={newCategoryName}
                  onChange={(e) => setNewCategoryName(e.target.value)}
                  placeholder="Nama kategori baru (mis. Promo Pendaftaran)"
                  className="flex-1 min-w-[220px] px-3 py-2 text-sm bg-white border border-[#E5E2D9] rounded-lg"
                />
                <button
                  type="submit"
                  disabled={busy || newCategoryName.trim().length < 2}
                  className="px-4 py-2 text-xs font-semibold text-white bg-[#141A23] rounded-lg cursor-pointer disabled:opacity-50"
                >
                  Simpan Kategori
                </button>
              </form>
            )}

            {/* Search & Filters */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="relative">
                <Search className="w-4 h-4 text-[#646F7E] absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Cari judul atau isi materi..."
                  className="w-full pl-9 pr-3 py-2 text-sm bg-[#FAF9F5] border border-[#E5E2D9] rounded-lg"
                />
              </div>
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="px-3 py-2 text-sm bg-[#FAF9F5] border border-[#E5E2D9] rounded-lg"
              >
                <option value="all">Semua Kategori ({categories.length})</option>
                {categories.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as 'all' | 'active' | 'inactive')}
                className="px-3 py-2 text-sm bg-[#FAF9F5] border border-[#E5E2D9] rounded-lg"
              >
                <option value="all">Semua Status</option>
                <option value="active">Aktif Saja</option>
                <option value="inactive">Nonaktif Saja</option>
              </select>
            </div>
          </div>

          {/* Add / Edit Knowledge Form */}
          {editingKnowledge && (
            <form
              onSubmit={handleSaveKnowledge}
              className="bg-white border-2 border-[#141A23] rounded-xl p-5 space-y-4"
            >
              <div className="flex items-center justify-between border-b border-[#E5E2D9] pb-3">
                <h3 className="text-sm font-bold text-[#141A23]">
                  {editingKnowledge.id ? 'Edit Materi Knowledge Center' : 'Tambah Materi Knowledge Center'}
                </h3>
                <button
                  type="button"
                  onClick={() => setEditingKnowledge(null)}
                  className="text-slate-500 hover:text-[#141A23] cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-[#3E4856] mb-1">
                    Judul Materi *
                  </label>
                  <input
                    type="text"
                    required
                    maxLength={180}
                    value={editingKnowledge.title}
                    onChange={(e) =>
                      setEditingKnowledge({ ...editingKnowledge, title: e.target.value })
                    }
                    placeholder="Contoh: Jadwal & Biaya Kelas Persiapan TKA"
                    className="w-full px-3 py-2 text-sm bg-[#FAF9F5] border border-[#E5E2D9] rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#3E4856] mb-1">
                    Kategori *
                  </label>
                  <select
                    value={editingKnowledge.category}
                    onChange={(e) =>
                      setEditingKnowledge({ ...editingKnowledge, category: e.target.value })
                    }
                    className="w-full px-3 py-2 text-sm bg-[#FAF9F5] border border-[#E5E2D9] rounded-lg"
                  >
                    {categories.map((cat) => (
                      <option key={cat} value={cat}>
                        {cat}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#3E4856] mb-1">
                  Isi Informasi Resmi (maks. 6000 karakter) *
                </label>
                <textarea
                  rows={5}
                  required
                  maxLength={6000}
                  value={editingKnowledge.content}
                  onChange={(e) =>
                    setEditingKnowledge({ ...editingKnowledge, content: e.target.value })
                  }
                  placeholder="Tulis informasi resmi yang akurat, ringkas, dan jelas untuk disampaikan asisten..."
                  className="w-full px-3 py-2.5 text-sm bg-[#FAF9F5] border border-[#E5E2D9] rounded-lg"
                />
              </div>

              <div className="flex flex-wrap items-center justify-between gap-3">
                <label className="inline-flex items-center gap-2 text-xs font-medium text-[#141A23] cursor-pointer">
                  <input
                    type="checkbox"
                    checked={editingKnowledge.isActive}
                    onChange={(e) =>
                      setEditingKnowledge({ ...editingKnowledge, isActive: e.target.checked })
                    }
                    className="rounded border-slate-300"
                  />
                  <span>Aktifkan materi agar langsung dipakai oleh TOMOYO ASISTEN</span>
                </label>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setEditingKnowledge(null)}
                    className="px-4 py-2 text-xs font-semibold text-[#3E4856] bg-[#FAF9F5] border border-[#E5E2D9] rounded-lg cursor-pointer"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    disabled={busy}
                    className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-[#A61B38] hover:bg-[#88132B] rounded-lg cursor-pointer disabled:opacity-50"
                  >
                    <Save className="w-3.5 h-3.5" />
                    <span>{busy ? 'Menyimpan...' : 'Simpan Materi'}</span>
                  </button>
                </div>
              </div>
            </form>
          )}

          {/* Knowledge List */}
          {filteredKnowledge.length === 0 ? (
            <div className="bg-white border border-[#E5E2D9] rounded-xl p-8 text-center space-y-2">
              <p className="text-sm font-semibold text-[#141A23]">
                Belum ada materi yang sesuai filter.
              </p>
              <p className="text-xs text-[#646F7E]">
                Tambahkan materi FAQ, info pendaftaran, promo resmi, atau panduan khusus melalui tombol <strong>Tambah Materi</strong>. (Data paket, jadwal, cabang, dan guru di CMS Website juga dibaca otomatis oleh tool Firebase.)
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredKnowledge.map((item) => (
                <div
                  key={item.id}
                  className="bg-white border border-[#E5E2D9] rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                >
                  <div className="space-y-1 min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="px-2 py-0.5 rounded bg-[#FAF9F5] border border-[#E5E2D9] text-[11px] font-semibold text-[#3E4856]">
                        {item.category}
                      </span>
                      <span
                        className={`px-2 py-0.5 rounded text-[11px] font-semibold ${
                          item.isActive
                            ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                            : 'bg-slate-100 text-slate-600 border border-slate-200'
                        }`}
                      >
                        {item.isActive ? 'Aktif' : 'Nonaktif'}
                      </span>
                      <span className="text-[11px] font-mono text-[#646F7E]">
                        Diperbarui: {formatJakartaDateTime(item.updatedAtIso)}
                      </span>
                    </div>
                    <h3 className="text-sm font-bold text-[#141A23] truncate">{item.title}</h3>
                    <p className="text-xs text-[#3E4856] line-clamp-2 whitespace-pre-line">
                      {item.content}
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center gap-1.5 shrink-0">
                    <button
                      type="button"
                      onClick={() => setPreviewKnowledge(item)}
                      className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium text-[#3E4856] bg-[#FAF9F5] border border-[#E5E2D9] hover:border-[#141A23] cursor-pointer"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      <span>Pratinjau</span>
                    </button>
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => void handleToggleKnowledgeActive(item)}
                      className="px-2.5 py-1.5 rounded-lg text-xs font-medium text-[#141A23] bg-[#FAF9F5] border border-[#E5E2D9] hover:border-[#141A23] cursor-pointer"
                    >
                      {item.isActive ? 'Nonaktifkan' : 'Aktifkan'}
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        setEditingKnowledge({
                          id: item.id,
                          title: item.title,
                          category: item.category,
                          content: item.content,
                          isActive: item.isActive,
                        })
                      }
                      className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium text-[#0F6E66] bg-emerald-50 border border-emerald-200 cursor-pointer"
                    >
                      <Pencil className="w-3.5 h-3.5" />
                      <span>Edit</span>
                    </button>
                    {confirmDeleteId === item.id ? (
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          disabled={busy}
                          onClick={() => void handleDeleteKnowledge(item.id)}
                          className="px-2.5 py-1.5 rounded-lg text-xs font-bold text-white bg-rose-700 cursor-pointer"
                        >
                          Ya, Hapus
                        </button>
                        <button
                          type="button"
                          onClick={() => setConfirmDeleteId(null)}
                          className="px-2 py-1.5 rounded-lg text-xs bg-slate-100 text-slate-700 cursor-pointer"
                        >
                          Batal
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setConfirmDeleteId(item.id)}
                        className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium text-rose-700 bg-rose-50 border border-rose-200 cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>Hapus</span>
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Knowledge Preview Modal */}
          {previewKnowledge && (
            <div
              role="dialog"
              aria-modal="true"
              aria-label="Pratinjau Materi Knowledge Center"
              className="fixed inset-0 z-50 bg-slate-900/50 flex items-center justify-center p-4"
            >
              <div className="bg-white border border-[#E5E2D9] rounded-xl max-w-lg w-full p-5 space-y-3 shadow-xl">
                <div className="flex items-start justify-between gap-2 border-b border-[#E5E2D9] pb-3">
                  <div>
                    <span className="text-[11px] font-semibold text-[#0F6E66]">
                      {previewKnowledge.category}
                    </span>
                    <h3 className="text-base font-bold text-[#141A23]">{previewKnowledge.title}</h3>
                  </div>
                  <button
                    type="button"
                    onClick={() => setPreviewKnowledge(null)}
                    className="p-1 text-slate-500 hover:text-[#141A23] cursor-pointer"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
                <p className="text-sm text-[#141A23] whitespace-pre-wrap leading-relaxed max-h-80 overflow-y-auto">
                  {previewKnowledge.content}
                </p>
                <div className="pt-2 border-t border-[#E5E2D9] flex items-center justify-between text-[11px] text-[#646F7E]">
                  <span>Status: {previewKnowledge.isActive ? 'Aktif' : 'Nonaktif'}</span>
                  <span>Diperbarui: {formatJakartaDateTime(previewKnowledge.updatedAtIso)}</span>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ==================== 3. INSTRUKSI AI ==================== */}
      {subMenu === 'instructions' && (
        <form onSubmit={handleSaveInstructions} className="space-y-5">
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-start gap-3">
            <Lock className="w-5 h-5 text-amber-800 shrink-0 mt-0.5" />
            <div className="text-xs text-amber-950 space-y-1">
              <p className="font-bold">Aturan Keamanan Inti Pengembang (Terkunci &amp; Permanen)</p>
              <p>
                Instruksi di bawah bersifat aditif terhadap persona dan gaya bahasa. Aturan keamanan inti sistem—seperti larangan membocorkan data pribadi siswa/orang tua ke publik, larangan mutasi/hapus database (read-only), penolakan prompt injection, dan kerahasiaan API key—tetap terkunci di backend dan tidak dapat ditimpa.
              </p>
            </div>
          </div>

          <div className="bg-white border border-[#E5E2D9] rounded-xl p-5 space-y-4">
            <div>
              <label className="block text-xs font-semibold text-[#3E4856] mb-1">
                Karakter Asisten
              </label>
              <textarea
                rows={2}
                maxLength={600}
                value={instructions.character}
                onChange={(e) => setInstructions({ ...instructions, character: e.target.value })}
                className="w-full px-3.5 py-2.5 text-sm bg-[#FAF9F5] border border-[#E5E2D9] rounded-lg"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#3E4856] mb-1">
                Gaya Bahasa
              </label>
              <textarea
                rows={2}
                maxLength={600}
                value={instructions.languageStyle}
                onChange={(e) => setInstructions({ ...instructions, languageStyle: e.target.value })}
                className="w-full px-3.5 py-2.5 text-sm bg-[#FAF9F5] border border-[#E5E2D9] rounded-lg"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#3E4856] mb-1">
                Aturan Tambahan Admin
              </label>
              <textarea
                rows={3}
                maxLength={2000}
                value={instructions.extraRules}
                onChange={(e) => setInstructions({ ...instructions, extraRules: e.target.value })}
                className="w-full px-3.5 py-2.5 text-sm bg-[#FAF9F5] border border-[#E5E2D9] rounded-lg"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#3E4856] mb-1">
                Batasan Topik Jawaban
              </label>
              <textarea
                rows={2}
                maxLength={1500}
                value={instructions.answerBounds}
                onChange={(e) => setInstructions({ ...instructions, answerBounds: e.target.value })}
                className="w-full px-3.5 py-2.5 text-sm bg-[#FAF9F5] border border-[#E5E2D9] rounded-lg"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#3E4856] mb-1">
                Perilaku Saat Informasi Tidak Tersedia
              </label>
              <textarea
                rows={2}
                maxLength={1000}
                value={instructions.unavailableBehavior}
                onChange={(e) =>
                  setInstructions({ ...instructions, unavailableBehavior: e.target.value })
                }
                className="w-full px-3.5 py-2.5 text-sm bg-[#FAF9F5] border border-[#E5E2D9] rounded-lg"
              />
            </div>

            <div className="flex justify-end pt-2 border-t border-[#E5E2D9]">
              <button
                type="submit"
                disabled={busy}
                className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-bold text-white bg-[#A61B38] hover:bg-[#88132B] rounded-lg cursor-pointer disabled:opacity-50"
              >
                <Save className="w-4 h-4" />
                <span>{busy ? 'Menyimpan...' : 'Simpan Instruksi AI'}</span>
              </button>
            </div>
          </div>
        </form>
      )}

      {/* ==================== 4. PENGATURAN CHATBOT ==================== */}
      {subMenu === 'settings' && (
        <form onSubmit={handleSaveSettings} className="space-y-5">
          <div className="bg-white border border-[#E5E2D9] rounded-xl p-5 space-y-5">
            <h2 className="text-base font-bold text-[#141A23] border-b border-[#E5E2D9] pb-3">
              Identitas, Akses, &amp; WhatsApp Bantuan Chatbot
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <label className="flex items-start gap-3 p-3.5 rounded-lg bg-[#FAF9F5] border border-[#E5E2D9] cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings.enabled}
                  onChange={(e) => setSettings({ ...settings, enabled: e.target.checked })}
                  className="mt-1 rounded border-slate-300"
                />
                <div>
                  <span className="text-sm font-bold text-[#141A23] block">
                    Aktifkan TOMOYO ASISTEN
                  </span>
                  <span className="text-xs text-[#646F7E]">
                    Menampilkan widget melayang di website publik &amp; mengaktifkan endpoint chat.
                  </span>
                </div>
              </label>

              <label className="flex items-start gap-3 p-3.5 rounded-lg bg-[#FAF9F5] border border-[#E5E2D9] cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings.publicEnabled}
                  onChange={(e) => setSettings({ ...settings, publicEnabled: e.target.checked })}
                  className="mt-1 rounded border-slate-300"
                />
                <div>
                  <span className="text-sm font-bold text-[#141A23] block">
                    Izinkan Akses Publik
                  </span>
                  <span className="text-xs text-[#646F7E]">
                    Pengunjung dapat bertanya tanpa login menggunakan informasi resmi.
                  </span>
                </div>
              </label>

              <label className="flex items-start gap-3 p-3.5 rounded-lg bg-[#FAF9F5] border border-[#E5E2D9] cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings.adminEnabled}
                  onChange={(e) => setSettings({ ...settings, adminEnabled: e.target.checked })}
                  className="mt-1 rounded border-slate-300"
                />
                <div>
                  <span className="text-sm font-bold text-[#141A23] block">
                    Aktifkan Mode Admin (Read-Only)
                  </span>
                  <span className="text-xs text-[#646F7E]">
                    Admin terverifikasi dapat menanyakan statistik siswa, kelas, &amp; pembayaran Firebase.
                  </span>
                </div>
              </label>

              <label className="flex items-start gap-3 p-3.5 rounded-lg bg-[#FAF9F5] border border-[#E5E2D9] cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings.allowPublicStudentCount}
                  onChange={(e) =>
                    setSettings({ ...settings, allowPublicStudentCount: e.target.checked })
                  }
                  className="mt-1 rounded border-slate-300"
                />
                <div>
                  <span className="text-sm font-bold text-[#141A23] block">
                    Izinkan Jumlah Agregat Murid untuk Publik
                  </span>
                  <span className="text-xs text-[#646F7E]">
                    Jika aktif, hanya angka total tersinkron yang dibagikan (identitas pribadi tetap diblokir).
                  </span>
                </div>
              </label>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-[#3E4856] mb-1">Nama Chatbot</label>
                <input
                  type="text"
                  maxLength={80}
                  value={settings.botName}
                  onChange={(e) => setSettings({ ...settings, botName: e.target.value })}
                  className="w-full px-3 py-2 text-sm bg-[#FAF9F5] border border-[#E5E2D9] rounded-lg"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-[#3E4856] mb-1">Tagline</label>
                <input
                  type="text"
                  maxLength={120}
                  value={settings.tagline}
                  onChange={(e) => setSettings({ ...settings, tagline: e.target.value })}
                  className="w-full px-3 py-2 text-sm bg-[#FAF9F5] border border-[#E5E2D9] rounded-lg"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-[#3E4856] mb-1">
                  Nomor WhatsApp Admin (Handoff Bantuan Chatbot)
                </label>
                <input
                  type="text"
                  maxLength={30}
                  value={settings.adminWhatsapp}
                  onChange={(e) => setSettings({ ...settings, adminWhatsapp: e.target.value })}
                  placeholder="+62 831-2190-2760"
                  className="w-full px-3 py-2 text-sm font-mono bg-[#FAF9F5] border border-[#E5E2D9] rounded-lg"
                />
                <p className="mt-1 text-[11px] text-[#646F7E]">
                  Tautan aktif:{' '}
                  <a
                    href={whatsappPreviewUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[#0F6E66] underline font-mono break-all"
                  >
                    {whatsappPreviewUrl.split('?')[0]}
                  </a>
                </p>
              </div>
              <div>
                <label className="block text-xs font-semibold text-[#3E4856] mb-1">
                  Model Groq Aktif
                </label>
                <select
                  value={settings.model}
                  onChange={(e) => setSettings({ ...settings, model: e.target.value })}
                  className="w-full px-3 py-2 text-sm bg-[#FAF9F5] border border-[#E5E2D9] rounded-lg"
                >
                  {supportedModels.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.label} — {m.note}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#3E4856] mb-1">
                Pesan Pembuka (Welcome Message)
              </label>
              <textarea
                rows={4}
                maxLength={1000}
                value={settings.welcomeMessage}
                onChange={(e) => setSettings({ ...settings, welcomeMessage: e.target.value })}
                className="w-full px-3.5 py-2.5 text-sm bg-[#FAF9F5] border border-[#E5E2D9] rounded-lg"
              />
            </div>

            {/* Suggested Questions Editor */}
            <div className="space-y-2.5">
              <label className="block text-xs font-semibold text-[#3E4856]">
                Pertanyaan Rekomendasi Awal (maks. 8 tombol)
              </label>
              <div className="space-y-2">
                {settings.suggestedQuestions.map((q, idx) => (
                  <div key={idx} className="flex items-center gap-2">
                    <input
                      type="text"
                      maxLength={140}
                      value={q}
                      onChange={(e) => {
                        const copy = [...settings.suggestedQuestions];
                        copy[idx] = e.target.value;
                        setSettings({ ...settings, suggestedQuestions: copy });
                      }}
                      className="flex-1 px-3 py-2 text-sm bg-[#FAF9F5] border border-[#E5E2D9] rounded-lg"
                    />
                    <button
                      type="button"
                      onClick={() =>
                        setSettings({
                          ...settings,
                          suggestedQuestions: settings.suggestedQuestions.filter((_, i) => i !== idx),
                        })
                      }
                      aria-label="Hapus pertanyaan rekomendasi"
                      className="p-2 rounded-lg text-rose-700 bg-rose-50 border border-rose-200 cursor-pointer"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
              {settings.suggestedQuestions.length < 8 && (
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    maxLength={140}
                    value={newSuggestedQ}
                    onChange={(e) => setNewSuggestedQ(e.target.value)}
                    placeholder="Tambah pertanyaan rekomendasi baru..."
                    className="flex-1 px-3 py-2 text-sm bg-white border border-[#E5E2D9] rounded-lg"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      const clean = newSuggestedQ.trim();
                      if (!clean) return;
                      setSettings({
                        ...settings,
                        suggestedQuestions: [...settings.suggestedQuestions, clean],
                      });
                      setNewSuggestedQ('');
                    }}
                    className="inline-flex items-center gap-1 px-3.5 py-2 text-xs font-semibold text-white bg-[#141A23] rounded-lg cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Tambah</span>
                  </button>
                </div>
              )}
            </div>

            {/* Rate & Token Limits */}
            <div className="pt-3 border-t border-[#E5E2D9] space-y-3">
              <h3 className="text-sm font-bold text-[#141A23]">Batas Pemakaian &amp; Proteksi Biaya</h3>
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-[#3E4856] mb-1">
                    Max Tanya / Sesi
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={100}
                    value={settings.maxRequestsPerSession}
                    onChange={(e) =>
                      setSettings({ ...settings, maxRequestsPerSession: Number(e.target.value) || 20 })
                    }
                    className="w-full px-3 py-2 text-sm font-mono bg-[#FAF9F5] border border-[#E5E2D9] rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-[#3E4856] mb-1">
                    Max Input (Huruf)
                  </label>
                  <input
                    type="number"
                    min={50}
                    max={2000}
                    value={settings.maxInputLength}
                    onChange={(e) =>
                      setSettings({ ...settings, maxInputLength: Number(e.target.value) || 600 })
                    }
                    className="w-full px-3 py-2 text-sm font-mono bg-[#FAF9F5] border border-[#E5E2D9] rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-[#3E4856] mb-1">
                    Max Output Token
                  </label>
                  <input
                    type="number"
                    min={100}
                    max={4000}
                    value={settings.maxOutputTokens}
                    onChange={(e) =>
                      setSettings({ ...settings, maxOutputTokens: Number(e.target.value) || 900 })
                    }
                    className="w-full px-3 py-2 text-sm font-mono bg-[#FAF9F5] border border-[#E5E2D9] rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-[#3E4856] mb-1">
                    Batas Harian
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={10000}
                    value={settings.dailyRequestLimit}
                    onChange={(e) =>
                      setSettings({ ...settings, dailyRequestLimit: Number(e.target.value) || 500 })
                    }
                    className="w-full px-3 py-2 text-sm font-mono bg-[#FAF9F5] border border-[#E5E2D9] rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-[#3E4856] mb-1">
                    Batas Bulanan
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={200000}
                    value={settings.monthlyRequestLimit}
                    onChange={(e) =>
                      setSettings({
                        ...settings,
                        monthlyRequestLimit: Number(e.target.value) || 10000,
                      })
                    }
                    className="w-full px-3 py-2 text-sm font-mono bg-[#FAF9F5] border border-[#E5E2D9] rounded-lg"
                  />
                </div>
              </div>
            </div>

            <div className="flex justify-end pt-3 border-t border-[#E5E2D9]">
              <button
                type="submit"
                disabled={busy}
                className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-bold text-white bg-[#A61B38] hover:bg-[#88132B] rounded-lg cursor-pointer disabled:opacity-50"
              >
                <Save className="w-4 h-4" />
                <span>{busy ? 'Menyimpan...' : 'Simpan Pengaturan Chatbot'}</span>
              </button>
            </div>
          </div>
        </form>
      )}

      {/* ==================== 5. STATISTIK PENGGUNAAN ==================== */}
      {subMenu === 'analytics' && (
        <div className="space-y-5">
          <div className="bg-white border border-[#E5E2D9] rounded-xl p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 className="text-base font-bold text-[#141A23]">
                Statistik Penggunaan &amp; Estimasi Biaya Groq AI
              </h2>
              <p className="text-xs text-[#646F7E]">
                Hanya mencatat metrik token, jumlah permintaan, dan perkiraan biaya — tanpa menyimpan transkrip percakapan pengunjung.
              </p>
            </div>

            <div className="flex gap-1.5">
              {(
                [
                  { id: 'today', label: 'Hari Ini' },
                  { id: '7d', label: '7 Hari' },
                  { id: '30d', label: '30 Hari' },
                  { id: 'all', label: 'Semua' },
                ] as const
              ).map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => void loadAnalyticsPeriod(p.id)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold border cursor-pointer ${
                    period === p.id
                      ? 'bg-[#141A23] text-white border-[#141A23]'
                      : 'bg-[#FAF9F5] text-[#3E4856] border-[#E5E2D9]'
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-6 gap-3">
            <div className="bg-white border border-[#E5E2D9] rounded-xl p-4">
              <p className="text-[11px] text-[#646F7E]">Total Permintaan</p>
              <p className="mt-1 text-xl font-extrabold font-mono text-[#141A23] tabular-nums">
                {analyticsSummary.totalRequests.toLocaleString('id-ID')}
              </p>
            </div>
            <div className="bg-white border border-[#E5E2D9] rounded-xl p-4">
              <p className="text-[11px] text-[#646F7E]">Publik</p>
              <p className="mt-1 text-xl font-extrabold font-mono text-[#0F6E66] tabular-nums">
                {analyticsSummary.publicRequests.toLocaleString('id-ID')}
              </p>
            </div>
            <div className="bg-white border border-[#E5E2D9] rounded-xl p-4">
              <p className="text-[11px] text-[#646F7E]">Admin</p>
              <p className="mt-1 text-xl font-extrabold font-mono text-[#141A23] tabular-nums">
                {analyticsSummary.adminRequests.toLocaleString('id-ID')}
              </p>
            </div>
            <div className="bg-white border border-[#E5E2D9] rounded-xl p-4">
              <p className="text-[11px] text-[#646F7E]">Gagal</p>
              <p className="mt-1 text-xl font-extrabold font-mono text-rose-700 tabular-nums">
                {analyticsSummary.failedRequests.toLocaleString('id-ID')}
              </p>
            </div>
            <div className="bg-white border border-[#E5E2D9] rounded-xl p-4">
              <p className="text-[11px] text-[#646F7E]">Token (In + Out)</p>
              <p className="mt-1 text-xl font-extrabold font-mono text-[#141A23] tabular-nums">
                {(analyticsSummary.inputTokens + analyticsSummary.outputTokens).toLocaleString(
                  'id-ID'
                )}
              </p>
            </div>
            <div className="bg-white border border-[#E5E2D9] rounded-xl p-4">
              <p className="text-[11px] text-[#646F7E]">Biaya (USD)</p>
              <p className="mt-1 text-xl font-extrabold font-mono text-[#A61B38] tabular-nums">
                ${analyticsSummary.estimatedCostUsd.toFixed(4)}
              </p>
            </div>
          </div>

          <div className="bg-white border border-[#E5E2D9] rounded-xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-[#FAF9F5] border-b border-[#E5E2D9] text-[#3E4856]">
                    <th className="py-3 px-4 font-semibold">Tanggal (WIB)</th>
                    <th className="py-3 px-3 font-semibold text-right">Total</th>
                    <th className="py-3 px-3 font-semibold text-right">Publik</th>
                    <th className="py-3 px-3 font-semibold text-right">Admin</th>
                    <th className="py-3 px-3 font-semibold text-right">Gagal</th>
                    <th className="py-3 px-3 font-semibold text-right">Input Token</th>
                    <th className="py-3 px-3 font-semibold text-right">Output Token</th>
                    <th className="py-3 px-3 font-semibold text-right">Biaya USD</th>
                    <th className="py-3 px-4 font-semibold">Model</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E5E2D9] font-mono tabular-nums">
                  {dailyRows.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="py-8 text-center font-sans text-[#646F7E]">
                        Belum ada catatan pemakaian pada periode ini.
                      </td>
                    </tr>
                  ) : (
                    dailyRows.map((d) => (
                      <tr key={d.dateKey} className="hover:bg-[#FAF9F5]">
                        <td className="py-2.5 px-4 font-semibold text-[#141A23]">{d.dateKey}</td>
                        <td className="py-2.5 px-3 text-right">{d.totalRequests}</td>
                        <td className="py-2.5 px-3 text-right text-[#0F6E66]">{d.publicRequests}</td>
                        <td className="py-2.5 px-3 text-right">{d.adminRequests}</td>
                        <td className="py-2.5 px-3 text-right text-rose-700">{d.failedRequests}</td>
                        <td className="py-2.5 px-3 text-right">
                          {d.inputTokens.toLocaleString('id-ID')}
                        </td>
                        <td className="py-2.5 px-3 text-right">
                          {d.outputTokens.toLocaleString('id-ID')}
                        </td>
                        <td className="py-2.5 px-3 text-right font-semibold text-[#A61B38]">
                          ${d.estimatedCostUsd.toFixed(5)}
                        </td>
                        <td className="py-2.5 px-4 text-[#3E4856]">{d.model}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ==================== 6. RIWAYAT SESI (STATISTIK TANPA TRANSKRIP) ==================== */}
      {subMenu === 'sessions' && (
        <div className="space-y-4">
          <div className="bg-white border border-[#E5E2D9] rounded-xl p-5 space-y-1">
            <h2 className="text-base font-bold text-[#141A23]">
              Ringkasan Sesi (Metrik Anonim Tanpa Isi Percakapan)
            </h2>
            <p className="text-xs text-[#646F7E]">
              Sesuai kebijakan privasi TOMOYO ASISTEN, isi pesan pengunjung tidak pernah disimpan atau ditampilkan di sini. Tabel berikut hanya menampilkan ID sesi ter-hash dan metrik teknis.
            </p>
          </div>

          <div className="bg-white border border-[#E5E2D9] rounded-xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-[#FAF9F5] border-b border-[#E5E2D9] text-[#3E4856]">
                    <th className="py-3 px-4 font-semibold">ID Sesi (Hash)</th>
                    <th className="py-3 px-3 font-semibold">Mode</th>
                    <th className="py-3 px-3 font-semibold">Mulai</th>
                    <th className="py-3 px-3 font-semibold">Aktif Terakhir</th>
                    <th className="py-3 px-3 font-semibold text-right">Putaran</th>
                    <th className="py-3 px-3 font-semibold text-right">Token In / Out</th>
                    <th className="py-3 px-3 font-semibold text-right">Biaya USD</th>
                    <th className="py-3 px-4 font-semibold text-right">Gagal</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E5E2D9] font-mono tabular-nums">
                  {sessionRows.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="py-8 text-center font-sans text-[#646F7E]">
                        Belum ada sesi percakapan tercatat.
                      </td>
                    </tr>
                  ) : (
                    sessionRows.map((s) => (
                      <tr key={s.sessionIdHash} className="hover:bg-[#FAF9F5]">
                        <td className="py-2.5 px-4 font-semibold text-[#141A23]">
                          #{s.sessionIdHash}
                        </td>
                        <td className="py-2.5 px-3">
                          <span
                            className={`px-2 py-0.5 rounded font-sans text-[11px] font-semibold ${
                              s.mode === 'admin'
                                ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                                : 'bg-slate-100 text-slate-700 border border-slate-200'
                            }`}
                          >
                            {s.mode === 'admin' ? 'Admin' : 'Publik'}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 font-sans text-[#3E4856]">
                          {formatJakartaDateTime(s.startedAtIso)}
                        </td>
                        <td className="py-2.5 px-3 font-sans text-[#3E4856]">
                          {formatJakartaDateTime(s.lastActiveAtIso)}
                        </td>
                        <td className="py-2.5 px-3 text-right">{s.turnCount}</td>
                        <td className="py-2.5 px-3 text-right">
                          {s.inputTokens} / {s.outputTokens}
                        </td>
                        <td className="py-2.5 px-3 text-right text-[#A61B38]">
                          ${s.estimatedCostUsd.toFixed(5)}
                        </td>
                        <td className="py-2.5 px-4 text-right text-rose-700">{s.failedCount}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
