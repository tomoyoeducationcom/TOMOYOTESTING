import React, { useCallback, useEffect, useMemo, useState } from 'react';
import type { User } from 'firebase/auth';
import {
  ArrowDown,
  ArrowUp,
  Check,
  CheckCircle2,
  Copy,
  Download,
  Edit3,
  Eye,
  Image as ImageIcon,
  Link2,
  Phone,
  Plus,
  RefreshCw,
  Search,
  Send,
  Star,
  Target,
  Trash2,
  Users,
  X,
} from 'lucide-react';
import { uploadImageToCloudinary } from '../lib/cloudinary';
import {
  buildAllQuizAttemptsCsv,
  buildDefaultQuizWaMessage,
  buildQuizAttemptsCsv,
  isValidWaTarget,
  type QuizAttemptRecord,
  type QuizDefinition,
  type QuizQuestion,
  type QuizQuestionType,
  type QuizStatus,
  type WaGroupRecord,
} from '../lib/quizAndWaDomain';
import {
  adminDeleteQuizAttemptFromFirestore,
  adminDeleteQuizFromFirestore,
  adminFetchQuizzesAndAttemptsFromFirestore,
  adminSaveQuizToFirestore,
  adminUpdateQuizStatusInFirestore,
  isFirestorePermissionDeniedError,
  subscribeAdminQuizAttempts,
  type AdminQuizItem,
} from '../lib/quizFirestore';
import { formatJakartaDateTime } from '../lib/domain';

function createEmptyQuestion(order: number, type: QuizQuestionType = 'multiple_choice'): QuizQuestion {
  const id = `q_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
  if (type === 'true_false') {
    return {
      id,
      order,
      type: 'true_false',
      prompt: '',
      options: [
        { id: 'true', text: 'Benar' },
        { id: 'false', text: 'Salah' },
      ],
      points: 10,
      correctOptionId: 'true',
      explanation: '',
    };
  }
  return {
    id,
    order,
    type: 'multiple_choice',
    prompt: '',
    options: [
      { id: 'a', text: '' },
      { id: 'b', text: '' },
      { id: 'c', text: '' },
      { id: 'd', text: '' },
    ],
    points: 10,
    correctOptionId: 'a',
    explanation: '',
  };
}

function createEmptyQuizDraft(): Partial<QuizDefinition> {
  return {
    title: '',
    description: '',
    instructions: 'Bacalah setiap soal dengan teliti dan pilih satu jawaban yang paling tepat.',
    targetClass: 'Kelas 1 – 6 SD',
    status: 'published',
    timeLimitMinutes: 15,
    maxAttempts: 2,
    startAtIso: '',
    endAtIso: '',
    questions: [createEmptyQuestion(1, 'multiple_choice')],
  };
}

interface QuizWaSendResultItem {
  target: string;
  label: string;
  kind: 'group' | 'phone';
  status: string;
  detail: string;
}

export function AdminQuizPanel({ user }: { user: User }) {
  const [quizzes, setQuizzes] = useState<AdminQuizItem[]>([]);
  const [allAttempts, setAllAttempts] = useState<QuizAttemptRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [banner, setBanner] = useState<string | null>(null);
  const [lastSavedQuiz, setLastSavedQuiz] = useState<AdminQuizItem | null>(null);
  const [deletingQuizId, setDeletingQuizId] = useState<string | null>(null);
  const [togglingStatusQuizId, setTogglingStatusQuizId] = useState<string | null>(null);
  const [confirmDeleteAttemptId, setConfirmDeleteAttemptId] = useState<string | null>(null);
  const [deletingAttemptId, setDeletingAttemptId] = useState<string | null>(null);

  // Recap filter state
  const [filterQuizId, setFilterQuizId] = useState<string>('all');
  const [filterClass, setFilterClass] = useState<string>('all');
  const [searchStudent, setSearchStudent] = useState<string>('');

  // WhatsApp Groups state (synced from Fonnte backend)
  const [waGroups, setWaGroups] = useState<WaGroupRecord[]>([]);
  const [waGroupsLoading, setWaGroupsLoading] = useState(false);
  const [waGroupsSyncing, setWaGroupsSyncing] = useState(false);
  const [waGroupsNote, setWaGroupsNote] = useState<string | null>(null);

  // Editor state
  const [editingDraft, setEditingDraft] = useState<Partial<QuizDefinition> | null>(null);
  const [saving, setSaving] = useState(false);
  const [editorErrors, setEditorErrors] = useState<string[]>([]);
  const [editorGroupIds, setEditorGroupIds] = useState<string[]>([]);
  const [editorSinglePhone, setEditorSinglePhone] = useState('');
  const [uploadingQuestionIdx, setUploadingQuestionIdx] = useState<number | null>(null);
  const [questionImageError, setQuestionImageError] = useState<Record<string, string>>({});
  const [urlInputOpen, setUrlInputOpen] = useState<Record<string, boolean>>({});

  // Dedicated Send Quiz to WhatsApp Modal state
  const [shareQuiz, setShareQuiz] = useState<AdminQuizItem | null>(null);
  const [shareGroupIds, setShareGroupIds] = useState<string[]>([]);
  const [shareSinglePhone, setShareSinglePhone] = useState('');
  const [shareMessage, setShareMessage] = useState('');
  const [sharePublishBeforeSend, setSharePublishBeforeSend] = useState(true);
  const [shareSending, setShareSending] = useState(false);
  const [shareError, setShareError] = useState<string | null>(null);
  const [shareResults, setShareResults] = useState<{
    fonnteConfigured: boolean;
    sentCount: number;
    failedCount: number;
    items: QuizWaSendResultItem[];
  } | null>(null);

  // Results review state
  const [selectedAttempt, setSelectedAttempt] = useState<QuizAttemptRecord | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const loadWaGroups = useCallback(async () => {
    setWaGroupsLoading(true);
    try {
      const token = await user.getIdToken();
      const res = await fetch('/api/admin/wa-groups', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = (await res.json()) as { groups?: WaGroupRecord[] };
        setWaGroups(Array.isArray(data.groups) ? data.groups : []);
      }
    } catch {
      // Ignore if backend WA groups not loaded yet
    } finally {
      setWaGroupsLoading(false);
    }
  }, [user]);

  const handleSyncWaGroups = async () => {
    setWaGroupsSyncing(true);
    setWaGroupsNote(null);
    try {
      const token = await user.getIdToken();
      const res = await fetch('/api/admin/wa-groups/sync', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ triggerFetchGroup: true }),
      });
      const data = (await res.json()) as {
        ok?: boolean;
        detail?: string;
        groups?: WaGroupRecord[];
      };
      if (Array.isArray(data.groups)) {
        setWaGroups(data.groups);
      }
      setWaGroupsNote(
        data.detail ||
          (data.ok
            ? 'Daftar grup WhatsApp berhasil disinkronkan dari Fonnte.'
            : 'Sinkronisasi grup Fonnte belum berhasil.')
      );
    } catch (err) {
      setWaGroupsNote(
        err instanceof Error ? err.message : 'Gagal menyinkronkan daftar grup WhatsApp.'
      );
    } finally {
      setWaGroupsSyncing(false);
    }
  };

  const loadQuizzes = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { quizzes: fsQuizzes, attempts: fsAttempts, attemptsError } =
        await adminFetchQuizzesAndAttemptsFromFirestore();
      setQuizzes(fsQuizzes);
      setAllAttempts(fsAttempts);
      if (attemptsError) {
        setError(attemptsError);
      }
    } catch (err) {
      if (isFirestorePermissionDeniedError(err)) {
        setError(
          'Akses Firestore ditolak (permission-denied). Pastikan login sebagai admin resmi dan sudah mem-publish firestore.rules terbaru di Firebase Console (database ai-studio-8509be80-871b-4707-80a4-526f1d69f7ad).'
        );
      } else {
        setError(err instanceof Error ? err.message : 'Gagal memuat data kuis.');
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadQuizzes();
    void loadWaGroups();
    const unsubscribe = subscribeAdminQuizAttempts(
      (liveAttempts) => {
        setAllAttempts(liveAttempts);
      },
      (subErr) => {
        if (isFirestorePermissionDeniedError(subErr)) {
          setError(
            'Akses baca nilai siswa (quizAttempts) ditolak (permission-denied). Pastikan firestore.rules terbaru sudah di-publish.'
          );
        }
      }
    );
    return () => {
      unsubscribe();
    };
  }, [loadQuizzes, loadWaGroups]);

  const quizzesWithCounts = useMemo(
    () =>
      quizzes.map((q) => ({
        ...q,
        attemptCount: allAttempts.filter((a) => a.quizId === q.id).length,
      })),
    [quizzes, allAttempts]
  );

  const availableClasses = useMemo(() => {
    const map = new Map<string, string>();
    for (const att of allAttempts) {
      const clean = att.studentClass.trim();
      if (clean && !map.has(clean.toLowerCase())) {
        map.set(clean.toLowerCase(), clean);
      }
    }
    return Array.from(map.values()).sort((a, b) => a.localeCompare(b, 'id'));
  }, [allAttempts]);

  const filteredAttempts = useMemo(() => {
    const q = searchStudent.trim().toLowerCase();
    return allAttempts.filter((att) => {
      if (filterQuizId !== 'all' && att.quizId !== filterQuizId) return false;
      if (
        filterClass !== 'all' &&
        att.studentClass.trim().toLowerCase() !== filterClass.trim().toLowerCase()
      ) {
        return false;
      }
      if (q) {
        const hay = `${att.studentName} ${att.studentClass} ${att.quizTitle}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [allAttempts, filterClass, filterQuizId, searchStudent]);

  const averagePercentage = useMemo(() => {
    if (filteredAttempts.length === 0) return 0;
    const total = filteredAttempts.reduce((sum, item) => sum + (Number(item.percentage) || 0), 0);
    return Math.round(total / filteredAttempts.length);
  }, [filteredAttempts]);

  const sortedWaGroups = useMemo(
    () => [...waGroups].sort((a, b) => Number(b.pinned) - Number(a.pinned)),
    [waGroups]
  );

  const handleSaveQuiz = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingDraft) return;

    const trimmedPhone = editorSinglePhone.trim();
    if (trimmedPhone) {
      const check = isValidWaTarget(trimmedPhone);
      if (!check.valid || check.isGroupId) {
        setEditorErrors(['Format 1 nomor WhatsApp tujuan tidak valid (gunakan 08... atau 628...).']);
        return;
      }
    }

    setSaving(true);
    setEditorErrors([]);
    setBanner(null);
    setLastSavedQuiz(null);
    try {
      const saved = await adminSaveQuizToFirestore(editingDraft);
      if (!saved.ok || !saved.quiz) {
        setEditorErrors(saved.errors || ['Data kuis tidak valid.']);
        return;
      }

      let waSummary = '';
      if (
        saved.quiz.status === 'published' &&
        (editorGroupIds.length > 0 || trimmedPhone.length > 0)
      ) {
        try {
          const token = await user.getIdToken();
          const res = await fetch(`/api/admin/quizzes/${encodeURIComponent(saved.quiz.id)}/send-wa`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({
              title: saved.quiz.title,
              targetClass: saved.quiz.targetClass,
              questionCount: saved.quiz.questions.length,
              timeLimitMinutes: saved.quiz.timeLimitMinutes,
              groupIds: editorGroupIds,
              singlePhone: trimmedPhone || undefined,
            }),
          });
          const waData = (await res.json()) as {
            ok?: boolean;
            sentCount?: number;
            failedCount?: number;
            error?: string;
          };
          if (waData.ok) {
            waSummary = ` · Pengiriman WA: ${waData.sentCount ?? 0} berhasil, ${waData.failedCount ?? 0} gagal.`;
          } else {
            waSummary = ` · Catatan WA: ${waData.error || 'Pengiriman WA belum berhasil.'}`;
          }
        } catch {
          waSummary = ' · Catatan WA: Gagal menghubungi endpoint Fonnte.';
        }
      }

      const savedAsItem: AdminQuizItem = {
        ...saved.quiz,
        attemptCount:
          quizzes.find((q) => q.id === saved.quiz?.id)?.attemptCount ?? 0,
      };
      setEditingDraft(null);
      setEditorGroupIds([]);
      setEditorSinglePhone('');
      setLastSavedQuiz(savedAsItem);
      setBanner(
        `Kuis "${saved.quiz.title}" (${
          saved.quiz.status === 'published' ? 'Terbit & tampil di /kuis' : 'Draf'
        }) berhasil disimpan permanen ke Firestore${waSummary}`
      );
      await loadQuizzes();
    } catch (err) {
      if (isFirestorePermissionDeniedError(err)) {
        setEditorErrors([
          'Penyimpanan ke Firestore ditolak (permission-denied). Copy isi file firestore.rules terbaru lalu klik Publish di Firebase Console -> Firestore Database -> Rules.',
        ]);
      } else {
        setEditorErrors([err instanceof Error ? err.message : 'Gagal menyimpan kuis.']);
      }
    } finally {
      setSaving(false);
    }
  };

  const handleToggleQuizStatus = async (quiz: AdminQuizItem) => {
    if (togglingStatusQuizId) return;
    const nextStatus: QuizStatus = quiz.status === 'published' ? 'draft' : 'published';
    setTogglingStatusQuizId(quiz.id);
    setError(null);
    setBanner(null);
    try {
      await adminUpdateQuizStatusInFirestore(quiz.id, nextStatus);
      setBanner(
        nextStatus === 'published'
          ? `Kuis "${quiz.title}" telah diterbitkan dan sekarang tampil di halaman /kuis.`
          : `Kuis "${quiz.title}" diubah menjadi Draf (disembunyikan dari halaman /kuis).`
      );
      await loadQuizzes();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal memperbarui status kuis.');
    } finally {
      setTogglingStatusQuizId(null);
    }
  };

  const openShareQuizModal = (quiz: AdminQuizItem) => {
    const quizUrl = `${window.location.origin}/kuis/${quiz.id}`;
    setShareQuiz(quiz);
    setShareGroupIds([]);
    setShareSinglePhone('');
    setShareMessage(
      buildDefaultQuizWaMessage({
        title: quiz.title,
        targetClass: quiz.targetClass,
        questionCount: quiz.questions.length,
        timeLimitMinutes: quiz.timeLimitMinutes,
        quizUrl,
      })
    );
    setSharePublishBeforeSend(quiz.status !== 'published');
    setShareError(null);
    setShareResults(null);
    if (waGroups.length === 0) {
      void loadWaGroups();
    }
  };

  const handleSendQuizWa = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!shareQuiz || shareSending) return;
    setShareError(null);
    setShareResults(null);

    const trimmedPhone = shareSinglePhone.trim();
    if (trimmedPhone) {
      const check = isValidWaTarget(trimmedPhone);
      if (!check.valid || check.isGroupId) {
        setShareError('Nomor WhatsApp tidak valid. Masukkan 8–16 digit nomor pribadi (contoh: 082119770700).');
        return;
      }
    }

    if (shareGroupIds.length === 0 && !trimmedPhone) {
      setShareError('Centang minimal 1 grup WhatsApp atau isi 1 nomor WhatsApp tujuan.');
      return;
    }

    setShareSending(true);
    try {
      if (sharePublishBeforeSend && shareQuiz.status !== 'published') {
        await adminUpdateQuizStatusInFirestore(shareQuiz.id, 'published');
        await loadQuizzes();
      }

      const token = await user.getIdToken();
      const res = await fetch(`/api/admin/quizzes/${encodeURIComponent(shareQuiz.id)}/send-wa`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          title: shareQuiz.title,
          targetClass: shareQuiz.targetClass,
          questionCount: shareQuiz.questions.length,
          timeLimitMinutes: shareQuiz.timeLimitMinutes,
          groupIds: shareGroupIds,
          singlePhone: trimmedPhone || undefined,
          message: shareMessage.trim() || undefined,
        }),
      });
      const data = (await res.json()) as {
        ok?: boolean;
        error?: string;
        fonnteConfigured?: boolean;
        sentCount?: number;
        failedCount?: number;
        results?: QuizWaSendResultItem[];
      };

      if (!res.ok || !data.ok) {
        throw new Error(data.error || 'Gagal mengirim kuis ke WhatsApp.');
      }

      setShareResults({
        fonnteConfigured: Boolean(data.fonnteConfigured),
        sentCount: data.sentCount ?? 0,
        failedCount: data.failedCount ?? 0,
        items: Array.isArray(data.results) ? data.results : [],
      });
    } catch (err) {
      setShareError(err instanceof Error ? err.message : 'Gagal mengirim kuis ke WhatsApp.');
    } finally {
      setShareSending(false);
    }
  };

  const handleDeleteQuiz = async (quiz: AdminQuizItem) => {
    if (deletingQuizId) return;
    setDeletingQuizId(quiz.id);
    setBanner(null);
    setError(null);
    try {
      await adminDeleteQuizFromFirestore(quiz.id);
      if (filterQuizId === quiz.id) setFilterQuizId('all');
      if (selectedAttempt?.quizId === quiz.id) setSelectedAttempt(null);
      if (lastSavedQuiz?.id === quiz.id) setLastSavedQuiz(null);
      setBanner(`Kuis "${quiz.title}" telah dihapus permanen dari Firestore.`);
      await loadQuizzes();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal menghapus kuis.');
    } finally {
      setDeletingQuizId(null);
    }
  };

  const handleDeleteAttempt = async (att: QuizAttemptRecord) => {
    if (deletingAttemptId) return;
    setDeletingAttemptId(att.id);
    setError(null);
    try {
      await adminDeleteQuizAttemptFromFirestore(att.id);
      if (selectedAttempt?.id === att.id) setSelectedAttempt(null);
      setConfirmDeleteAttemptId(null);
      setBanner(`Data nilai "${att.studentName}" (${att.studentClass}) telah dihapus.`);
      await loadQuizzes();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal menghapus data nilai siswa.');
    } finally {
      setDeletingAttemptId(null);
    }
  };

  const handleOpenAttempts = (quizId: string) => {
    setFilterQuizId(quizId);
    setSelectedAttempt(null);
    const el = document.getElementById('rekap-nilai-kuis');
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  const triggerCsvDownload = (filename: string, csvContent: string) => {
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  const handleDownloadCsv = (quizId: string) => {
    const quiz = quizzes.find((q) => q.id === quizId);
    if (!quiz) {
      setError('Data kuis tidak ditemukan untuk ekspor CSV.');
      return;
    }
    const attempts = allAttempts.filter((a) => a.quizId === quizId);
    const safeSlug = quiz.id.replace(/[^a-zA-Z0-9_-]/g, '_');
    const csv = buildQuizAttemptsCsv(quiz, attempts);
    triggerCsvDownload(`hasil-${safeSlug}.csv`, csv);
  };

  const handleDownloadRecapCsv = () => {
    const csv = buildAllQuizAttemptsCsv(filteredAttempts);
    triggerCsvDownload('rekap-nilai-kuis-siswa.csv', csv);
  };

  const handleCopyLink = async (quizId: string) => {
    const link = `${window.location.origin}/kuis/${quizId}`;
    try {
      await navigator.clipboard.writeText(link);
      setCopiedId(quizId);
      setTimeout(() => setCopiedId(null), 2000);
    } catch {
      setBanner(`Tautan kuis siswa: ${link}`);
    }
  };

  const updateQuestion = (index: number, patch: Partial<QuizQuestion>) => {
    if (!editingDraft) return;
    const questions = [...(editingDraft.questions || [])];
    questions[index] = { ...questions[index], ...patch };
    setEditingDraft({ ...editingDraft, questions });
  };

  const changeQuestionType = (index: number, nextType: QuizQuestionType) => {
    if (!editingDraft) return;
    const questions = [...(editingDraft.questions || [])];
    const current = questions[index];
    if (nextType === 'true_false') {
      questions[index] = {
        ...current,
        type: 'true_false',
        options: [
          { id: 'true', text: 'Benar' },
          { id: 'false', text: 'Salah' },
        ],
        correctOptionId: 'true',
      };
    } else {
      questions[index] = {
        ...current,
        type: 'multiple_choice',
        options: [
          { id: 'a', text: current.options[0]?.text || '' },
          { id: 'b', text: current.options[1]?.text || '' },
          { id: 'c', text: current.options[2]?.text || '' },
          { id: 'd', text: current.options[3]?.text || '' },
        ],
        correctOptionId: 'a',
      };
    }
    setEditingDraft({ ...editingDraft, questions });
  };

  const moveQuestion = (index: number, delta: -1 | 1) => {
    if (!editingDraft) return;
    const questions = [...(editingDraft.questions || [])];
    const target = index + delta;
    if (target < 0 || target >= questions.length) return;
    const [moved] = questions.splice(index, 1);
    questions.splice(target, 0, moved);
    setEditingDraft({
      ...editingDraft,
      questions: questions.map((q, idx) => ({ ...q, order: idx + 1 })),
    });
  };

  const handleUploadQuestionImage = async (qIdx: number, questionId: string, file: File | null) => {
    if (!file) return;
    setQuestionImageError((prev) => ({ ...prev, [questionId]: '' }));
    setUploadingQuestionIdx(qIdx);
    try {
      const uploaded = await uploadImageToCloudinary(file);
      updateQuestion(qIdx, { imageUrl: uploaded.secureUrl });
      setUrlInputOpen((prev) => ({ ...prev, [questionId]: false }));
    } catch (err) {
      setQuestionImageError((prev) => ({
        ...prev,
        [questionId]: err instanceof Error ? err.message : 'Gagal mengunggah gambar soal.',
      }));
    } finally {
      setUploadingQuestionIdx(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="editorial-card rounded-2xl p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="font-display text-2xl font-bold text-[#121820]">
            Manajemen Kuis Online Siswa
          </h2>
          <p className="text-xs sm:text-sm text-[#3F4A59] mt-0.5">
            Buat soal pilihan ganda &amp; benar/salah, terbitkan ke halaman siswa, kirim ke grup WA pilihan &amp; nomor WA, serta ekspor rekap nilai CSV.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <button
            type="button"
            disabled={loading}
            onClick={() => void loadQuizzes()}
            className="inline-flex items-center justify-center gap-1.5 px-4 py-3 min-h-[44px] text-xs font-semibold text-[#121820] bg-[#EFECE4] hover:bg-[#DFDCD3] rounded-xl transition-colors cursor-pointer disabled:opacity-60"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>Muat Ulang</span>
          </button>
          <button
            type="button"
            onClick={() => {
              setEditorErrors([]);
              setQuestionImageError({});
              setUrlInputOpen({});
              setEditorGroupIds([]);
              setEditorSinglePhone('');
              setEditingDraft(createEmptyQuizDraft());
            }}
            className="inline-flex items-center justify-center gap-2 px-5 py-3 min-h-[44px] text-sm font-semibold text-white bg-[#BE123C] hover:bg-[#9F1239] rounded-xl transition-colors cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Buat Kuis Baru</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="editorial-card rounded-2xl p-4 sm:p-5">
          <p className="text-xs font-semibold text-[#626E7E] uppercase tracking-wider">Kuis Tersimpan</p>
          <p className="font-mono text-2xl font-bold text-[#121820] tabular-nums mt-1">
            {quizzes.length}
          </p>
        </div>
        <div className="editorial-card rounded-2xl p-4 sm:p-5">
          <p className="text-xs font-semibold text-[#626E7E] uppercase tracking-wider">Nilai Siswa Masuk</p>
          <p className="font-mono text-2xl font-bold text-[#121820] tabular-nums mt-1">
            {filteredAttempts.length}
          </p>
        </div>
        <div className="editorial-card rounded-2xl p-4 sm:p-5">
          <p className="text-xs font-semibold text-[#626E7E] uppercase tracking-wider">Rata-rata Nilai</p>
          <p className="font-mono text-2xl font-bold text-[#0F766E] tabular-nums mt-1">
            {filteredAttempts.length > 0 ? `${averagePercentage} / 100` : '—'}
          </p>
        </div>
      </div>

      {banner && (
        <div role="status" className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-sm text-emerald-900 flex flex-wrap items-center justify-between gap-3">
          <span>{banner}</span>
          {lastSavedQuiz && (
            <button
              type="button"
              onClick={() => openShareQuizModal(lastSavedQuiz)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-[#0F766E] hover:bg-[#115E59] rounded-xl cursor-pointer shrink-0"
            >
              <Send className="w-3.5 h-3.5" />
              <span>Kirim ke Grup WA / 1 Nomor</span>
            </button>
          )}
        </div>
      )}

      {error && (
        <div role="alert" className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-sm text-[#B91C1C]">
          {error}
        </div>
      )}

      {/* QUIZ EDITOR VIEW */}
      {editingDraft && (
        <form onSubmit={handleSaveQuiz} className="editorial-card rounded-2xl p-6 space-y-6">
          <div className="flex items-center justify-between gap-3 pb-4 border-b border-[#DFDCD3]">
            <h3 className="font-display text-2xl font-bold text-[#121820]">
              {editingDraft.id ? 'Edit Kuis Online' : 'Buat Kuis Online Baru'}
            </h3>
            <button
              type="button"
              onClick={() => setEditingDraft(null)}
              className="px-4 py-2 text-xs font-semibold text-[#3F4A59] bg-[#EFECE4] rounded-xl cursor-pointer"
            >
              Batal
            </button>
          </div>

          {editorErrors.length > 0 && (
            <div role="alert" className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-xs sm:text-sm text-[#B91C1C] space-y-1">
              {editorErrors.map((err, i) => (
                <p key={i}>• {err}</p>
              ))}
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-[#121820] mb-1">Judul Kuis *</label>
              <input
                type="text"
                required
                value={editingDraft.title || ''}
                onChange={(e) => setEditingDraft({ ...editingDraft, title: e.target.value })}
                placeholder="Contoh: Evaluasi Matematika Bab Pecahan"
                className="w-full px-3.5 py-2.5 min-h-[44px] text-sm bg-white border border-[#DFDCD3] rounded-xl"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-[#121820] mb-1">Target Kelas *</label>
              <input
                type="text"
                required
                value={editingDraft.targetClass || ''}
                onChange={(e) => setEditingDraft({ ...editingDraft, targetClass: e.target.value })}
                placeholder="Contoh: Kelas 4 – 5 SD"
                className="w-full px-3.5 py-2.5 min-h-[44px] text-sm bg-white border border-[#DFDCD3] rounded-xl"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-[#121820] mb-1">Deskripsi Singkat</label>
              <textarea
                rows={2}
                value={editingDraft.description || ''}
                onChange={(e) => setEditingDraft({ ...editingDraft, description: e.target.value })}
                className="w-full px-3.5 py-2.5 text-sm bg-white border border-[#DFDCD3] rounded-xl"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-[#121820] mb-1">Petunjuk Pengerjaan</label>
              <textarea
                rows={2}
                value={editingDraft.instructions || ''}
                onChange={(e) => setEditingDraft({ ...editingDraft, instructions: e.target.value })}
                className="w-full px-3.5 py-2.5 text-sm bg-white border border-[#DFDCD3] rounded-xl"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <div>
              <label className="block text-xs font-semibold text-[#121820] mb-1">Status Kuis</label>
              <select
                value={editingDraft.status || 'draft'}
                onChange={(e) => setEditingDraft({ ...editingDraft, status: e.target.value as QuizStatus })}
                className="w-full px-3 py-2.5 min-h-[44px] text-sm bg-white border border-[#DFDCD3] rounded-xl"
              >
                <option value="draft">Draf</option>
                <option value="published">Terbit (Aktif)</option>
                <option value="disabled">Dinonaktifkan</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-[#121820] mb-1">Waktu (Menit)</label>
              <input
                type="number"
                min={0}
                max={240}
                value={editingDraft.timeLimitMinutes ?? 15}
                onChange={(e) =>
                  setEditingDraft({ ...editingDraft, timeLimitMinutes: Number(e.target.value) || 0 })
                }
                className="w-full px-3 py-2.5 min-h-[44px] text-sm font-mono bg-white border border-[#DFDCD3] rounded-xl"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-[#121820] mb-1">Maks. Percobaan</label>
              <input
                type="number"
                min={0}
                max={50}
                value={editingDraft.maxAttempts ?? 2}
                onChange={(e) =>
                  setEditingDraft({ ...editingDraft, maxAttempts: Number(e.target.value) || 0 })
                }
                className="w-full px-3 py-2.5 min-h-[44px] text-sm font-mono bg-white border border-[#DFDCD3] rounded-xl"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-[#121820] mb-1">Jadwal Mulai (Opsional)</label>
              <input
                type="datetime-local"
                value={editingDraft.startAtIso ? editingDraft.startAtIso.slice(0, 16) : ''}
                onChange={(e) =>
                  setEditingDraft({
                    ...editingDraft,
                    startAtIso: e.target.value ? new Date(e.target.value).toISOString() : '',
                  })
                }
                className="w-full px-3 py-2.5 min-h-[44px] text-xs font-mono bg-white border border-[#DFDCD3] rounded-xl"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-[#121820] mb-1">Jadwal Selesai (Opsional)</label>
              <input
                type="datetime-local"
                value={editingDraft.endAtIso ? editingDraft.endAtIso.slice(0, 16) : ''}
                onChange={(e) =>
                  setEditingDraft({
                    ...editingDraft,
                    endAtIso: e.target.value ? new Date(e.target.value).toISOString() : '',
                  })
                }
                className="w-full px-3 py-2.5 min-h-[44px] text-xs font-mono bg-white border border-[#DFDCD3] rounded-xl"
              />
            </div>
          </div>

          {editingDraft.status === 'published' && (
            <div className="p-4 sm:p-5 rounded-xl editorial-card-subtle space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <Target className="w-4 h-4 text-[#BE123C]" />
                  <p className="text-xs sm:text-sm font-bold text-[#121820]">
                    Kirim Otomatis Saat Disimpan (Opsional — Grup WA Pilihan &amp; 1 Nomor)
                  </p>
                </div>
                <button
                  type="button"
                  disabled={waGroupsSyncing}
                  onClick={() => void handleSyncWaGroups()}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-[#121820] bg-white border border-[#DFDCD3] hover:border-[#121820] rounded-lg cursor-pointer disabled:opacity-60"
                >
                  <RefreshCw className={`w-3 h-3 ${waGroupsSyncing ? 'animate-spin' : ''}`} />
                  <span>Sync Grup Fonnte</span>
                </button>
              </div>

              {waGroupsNote && (
                <p className="text-xs text-[#3F4A59] bg-white border border-[#DFDCD3] rounded-lg px-3 py-2">
                  {waGroupsNote}
                </p>
              )}

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-semibold text-[#3F4A59]">
                      Pilih Grup WA (Centang dengan ikon scope)
                    </span>
                    {sortedWaGroups.length > 0 && (
                      <button
                        type="button"
                        onClick={() =>
                          setEditorGroupIds(
                            editorGroupIds.length === sortedWaGroups.length
                              ? []
                              : sortedWaGroups.map((g) => g.id)
                          )
                        }
                        className="text-xs font-semibold text-[#BE123C] cursor-pointer"
                      >
                        {editorGroupIds.length === sortedWaGroups.length ? 'Batal Semua' : 'Pilih Semua'}
                      </button>
                    )}
                  </div>
                  {waGroupsLoading ? (
                    <p className="text-xs text-[#626E7E]">Memuat daftar grup WhatsApp...</p>
                  ) : sortedWaGroups.length === 0 ? (
                    <p className="text-xs text-[#626E7E] bg-white border border-[#DFDCD3] rounded-xl p-3">
                      Belum ada daftar grup tersimpan. Klik <strong>Sync Grup Fonnte</strong> atau gunakan menu <strong>Kirim ke WA</strong> setelah kuis tersimpan.
                    </p>
                  ) : (
                    <div className="max-h-40 overflow-y-auto space-y-1.5 pr-1">
                      {sortedWaGroups.map((g) => {
                        const checked = editorGroupIds.includes(g.id);
                        return (
                          <label
                            key={g.id}
                            className={`flex items-center gap-2.5 p-2.5 rounded-xl border text-xs cursor-pointer transition-colors ${
                              checked
                                ? 'bg-[#121820] text-white border-[#121820]'
                                : 'bg-white text-[#121820] border-[#DFDCD3] hover:border-[#121820]'
                            }`}
                          >
                            <input
                              type="checkbox"
                              checked={checked}
                              onChange={() =>
                                setEditorGroupIds((prev) =>
                                  checked ? prev.filter((id) => id !== g.id) : [...prev, g.id]
                                )
                              }
                              className="sr-only"
                            />
                            <span
                              className={`w-6 h-6 rounded-lg flex items-center justify-center shrink-0 border ${
                                checked
                                  ? 'bg-[#BE123C] border-[#BE123C] text-white'
                                  : 'bg-[#F7F6F2] border-[#DFDCD3] text-[#626E7E]'
                              }`}
                            >
                              {checked ? <Check className="w-3.5 h-3.5" /> : <Target className="w-3.5 h-3.5" />}
                            </span>
                            <span className="font-semibold truncate flex-1">{g.name}</span>
                            {g.pinned && <Star className="w-3.5 h-3.5 text-amber-400 fill-current shrink-0" />}
                          </label>
                        );
                      })}
                    </div>
                  )}
                </div>

                <div className="space-y-2">
                  <label className="block text-xs font-semibold text-[#3F4A59]">
                    Kirim ke 1 Nomor WhatsApp (Opsional)
                  </label>
                  <input
                    type="tel"
                    value={editorSinglePhone}
                    onChange={(e) => setEditorSinglePhone(e.target.value)}
                    placeholder="Contoh: 082119770700 atau 6282119770700"
                    className="w-full px-3.5 py-2.5 min-h-[42px] text-xs font-mono bg-white border border-[#DFDCD3] rounded-xl"
                  />
                  <p className="text-[11px] text-[#626E7E]">
                    Anda juga dapat mengirim atau menyebarkan kuis ini kapan saja melalui tombol <strong>Kirim ke WA</strong> pada daftar kuis.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* QUESTIONS BUILDER */}
          <div className="space-y-4 pt-2 border-t border-[#DFDCD3]">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h4 className="text-sm font-bold text-[#121820]">
                Daftar Soal ({editingDraft.questions?.length || 0} Butir)
              </h4>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() =>
                    setEditingDraft({
                      ...editingDraft,
                      questions: [
                        ...(editingDraft.questions || []),
                        createEmptyQuestion((editingDraft.questions?.length || 0) + 1, 'multiple_choice'),
                      ],
                    })
                  }
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-[#121820] bg-[#EFECE4] hover:bg-[#DFDCD3] rounded-xl cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>+ Pilihan Ganda</span>
                </button>
                <button
                  type="button"
                  onClick={() =>
                    setEditingDraft({
                      ...editingDraft,
                      questions: [
                        ...(editingDraft.questions || []),
                        createEmptyQuestion((editingDraft.questions?.length || 0) + 1, 'true_false'),
                      ],
                    })
                  }
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-[#121820] bg-[#EFECE4] hover:bg-[#DFDCD3] rounded-xl cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>+ Benar / Salah</span>
                </button>
              </div>
            </div>

            <div className="space-y-4">
              {(editingDraft.questions || []).map((q, qIdx) => (
                <div key={q.id} className="p-4 sm:p-5 rounded-xl bg-[#F7F6F2] border border-[#DFDCD3] space-y-4">
                  <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-[#DFDCD3]">
                    <span className="font-mono text-xs font-bold text-[#BE123C]">
                      SOAL #{qIdx + 1}
                    </span>
                    <div className="flex items-center gap-2">
                      <select
                        value={q.type}
                        onChange={(e) => changeQuestionType(qIdx, e.target.value as QuizQuestionType)}
                        className="px-2.5 py-1.5 text-xs bg-white border border-[#DFDCD3] rounded-lg"
                      >
                        <option value="multiple_choice">Pilihan Ganda</option>
                        <option value="true_false">Benar / Salah</option>
                      </select>
                      <input
                        type="number"
                        min={1}
                        max={100}
                        value={q.points}
                        onChange={(e) => updateQuestion(qIdx, { points: Math.max(1, Number(e.target.value) || 10) })}
                        className="w-20 px-2.5 py-1.5 text-xs font-mono bg-white border border-[#DFDCD3] rounded-lg"
                        aria-label={`Poin soal ${qIdx + 1}`}
                      />
                      <button
                        type="button"
                        onClick={() => moveQuestion(qIdx, -1)}
                        disabled={qIdx === 0}
                        aria-label="Naikkan soal"
                        className="p-1.5 bg-white border border-[#DFDCD3] rounded-lg disabled:opacity-40 cursor-pointer"
                      >
                        <ArrowUp className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => moveQuestion(qIdx, 1)}
                        disabled={qIdx === (editingDraft.questions?.length || 1) - 1}
                        aria-label="Turunkan soal"
                        className="p-1.5 bg-white border border-[#DFDCD3] rounded-lg disabled:opacity-40 cursor-pointer"
                      >
                        <ArrowDown className="w-3.5 h-3.5" />
                      </button>
                      {(editingDraft.questions?.length || 0) > 1 && (
                        <button
                          type="button"
                          onClick={() =>
                            setEditingDraft({
                              ...editingDraft,
                              questions: (editingDraft.questions || []).filter((_, i) => i !== qIdx),
                            })
                          }
                          aria-label="Hapus soal"
                          className="p-1.5 text-[#B91C1C] bg-white border border-rose-200 rounded-lg cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-[#121820] mb-1">Pertanyaan *</label>
                    <textarea
                      rows={2}
                      required
                      value={q.prompt}
                      onChange={(e) => updateQuestion(qIdx, { prompt: e.target.value })}
                      placeholder="Tulis pertanyaan soal di sini..."
                      className="w-full px-3.5 py-2.5 text-sm bg-white border border-[#DFDCD3] rounded-xl"
                    />
                  </div>

                  {/* GOOGLE FORMS-STYLE QUESTION IMAGE ATTACHMENT */}
                  <div className="p-3.5 rounded-xl bg-white border border-[#DFDCD3] space-y-2.5">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#3F4A59]">
                        <ImageIcon className="w-3.5 h-3.5 text-[#BE123C]" />
                        <span>Gambar Pendukung Soal (Opsional)</span>
                      </span>
                      <div className="flex flex-wrap items-center gap-2">
                        <label className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-[#121820] bg-[#EFECE4] hover:bg-[#DFDCD3] rounded-lg cursor-pointer transition-colors">
                          <ImageIcon className="w-3.5 h-3.5" />
                          <span>
                            {uploadingQuestionIdx === qIdx
                              ? 'Mengunggah...'
                              : q.imageUrl
                              ? 'Ganti Gambar'
                              : 'Unggah Gambar'}
                          </span>
                          <input
                            type="file"
                            accept="image/jpeg,image/png,image/webp"
                            disabled={uploadingQuestionIdx === qIdx}
                            onChange={(e) => {
                              const file = e.target.files?.[0] || null;
                              e.target.value = '';
                              void handleUploadQuestionImage(qIdx, q.id, file);
                            }}
                            className="sr-only"
                          />
                        </label>
                        <button
                          type="button"
                          onClick={() =>
                            setUrlInputOpen((prev) => ({
                              ...prev,
                              [q.id]: !prev[q.id],
                            }))
                          }
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-[#3F4A59] bg-white border border-[#DFDCD3] hover:border-[#121820] rounded-lg cursor-pointer transition-colors"
                        >
                          <Link2 className="w-3.5 h-3.5" />
                          <span>{urlInputOpen[q.id] ? 'Tutup URL' : 'Tempel URL Gambar'}</span>
                        </button>
                        {q.imageUrl && (
                          <button
                            type="button"
                            onClick={() => {
                              updateQuestion(qIdx, { imageUrl: undefined });
                              setQuestionImageError((prev) => ({ ...prev, [q.id]: '' }));
                            }}
                            aria-label={`Hapus gambar soal ${qIdx + 1}`}
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold text-[#B91C1C] bg-rose-50 border border-rose-200 hover:bg-rose-100 rounded-lg cursor-pointer transition-colors"
                          >
                            <X className="w-3.5 h-3.5" />
                            <span>Hapus</span>
                          </button>
                        )}
                      </div>
                    </div>

                    {urlInputOpen[q.id] && (
                      <div className="space-y-1">
                        <input
                          type="url"
                          value={q.imageUrl || ''}
                          onChange={(e) => {
                            const val = e.target.value;
                            updateQuestion(qIdx, { imageUrl: val || undefined });
                            setQuestionImageError((prev) => ({ ...prev, [q.id]: '' }));
                          }}
                          placeholder="https://contoh.com/gambar-soal.jpg"
                          aria-label={`URL gambar soal ${qIdx + 1}`}
                          className="w-full px-3 py-2 text-xs font-mono bg-[#F7F6F2] border border-[#DFDCD3] rounded-lg"
                        />
                        <p className="text-[11px] text-[#626E7E]">
                          Format file yang didukung: JPG, PNG, WebP (maks. 5 MB) atau tempel tautan gambar https://.
                        </p>
                      </div>
                    )}

                    {questionImageError[q.id] && (
                      <p role="alert" className="text-xs text-[#B91C1C] font-medium">
                        {questionImageError[q.id]}
                      </p>
                    )}

                    {q.imageUrl && (
                      <div className="pt-1">
                        <img
                          src={q.imageUrl}
                          alt={`Pratinjau gambar soal ${qIdx + 1}`}
                          className="max-h-60 w-auto max-w-full rounded-lg border border-[#DFDCD3] object-contain bg-[#F7F6F2]"
                          referrerPolicy="no-referrer"
                        />
                      </div>
                    )}
                  </div>

                  <div className="space-y-2">
                    <p className="text-xs font-semibold text-[#121820]">
                      Pilihan Jawaban (Pilih tombol radio untuk Kunci Jawaban Benar)
                    </p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      {q.options.map((opt, optIdx) => (
                        <div key={opt.id} className="flex items-center gap-2">
                          <input
                            type="radio"
                            name={`correct-${q.id}`}
                            checked={q.correctOptionId === opt.id}
                            onChange={() => updateQuestion(qIdx, { correctOptionId: opt.id })}
                            className="w-4 h-4 accent-[#BE123C] cursor-pointer shrink-0"
                            aria-label={`Kunci jawaban opsi ${optIdx + 1}`}
                          />
                          <input
                            type="text"
                            required
                            value={opt.text}
                            readOnly={q.type === 'true_false'}
                            onChange={(e) => {
                              const nextOpts = [...q.options];
                              nextOpts[optIdx] = { ...opt, text: e.target.value };
                              updateQuestion(qIdx, { options: nextOpts });
                            }}
                            placeholder={`Pilihan ${String.fromCharCode(65 + optIdx)}`}
                            className="flex-1 px-3 py-2 text-sm bg-white border border-[#DFDCD3] rounded-xl"
                          />
                        </div>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-[#626E7E] mb-1">
                      Pembahasan Guru (Hanya terlihat di review Admin)
                    </label>
                    <input
                      type="text"
                      value={q.explanation || ''}
                      onChange={(e) => updateQuestion(qIdx, { explanation: e.target.value })}
                      placeholder="Penjelasan singkat jawaban benar"
                      className="w-full px-3.5 py-2 text-xs bg-white border border-[#DFDCD3] rounded-xl"
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-[#DFDCD3]">
            <button
              type="submit"
              disabled={saving}
              className="px-6 py-3 min-h-[46px] text-sm font-semibold text-white bg-[#121820] hover:bg-[#BE123C] rounded-xl transition-colors cursor-pointer disabled:opacity-60"
            >
              {saving ? 'Menyimpan Kuis...' : 'Simpan Kuis Online'}
            </button>
          </div>
        </form>
      )}

      {/* CONSOLIDATED STUDENT GRADE RECAP FOR ASSESSMENT */}
      <section id="rekap-nilai-kuis" className="editorial-card rounded-2xl p-6 space-y-5">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-[#DFDCD3]">
          <div>
            <p className="text-xs font-semibold text-[#BE123C] uppercase tracking-wider">
              Rekap Penilaian Siswa
            </p>
            <h3 className="font-display text-2xl font-bold text-[#121820]">
              Daftar Nilai, Nama Siswa &amp; Kelas
            </h3>
            <p className="text-xs text-[#626E7E] mt-0.5">
              Seluruh hasil pengerjaan kuis siswa tercatat otomatis di sini untuk keperluan rekap penilaian guru dan admin.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <button
              type="button"
              disabled={loading}
              onClick={() => void loadQuizzes()}
              className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2.5 min-h-[42px] text-xs font-semibold text-[#121820] bg-[#EFECE4] hover:bg-[#DFDCD3] rounded-xl cursor-pointer disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              <span>Muat Ulang Nilai</span>
            </button>
            <button
              type="button"
              disabled={filteredAttempts.length === 0}
              onClick={handleDownloadRecapCsv}
              className="inline-flex items-center justify-center gap-1.5 px-4 py-2.5 min-h-[42px] text-xs font-semibold text-white bg-[#0F766E] hover:bg-[#115E59] rounded-xl cursor-pointer disabled:opacity-50"
            >
              <Download className="w-4 h-4" />
              <span>Ekspor Rekap CSV / Excel</span>
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="relative">
            <Search className="w-4 h-4 text-[#626E7E] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="search"
              value={searchStudent}
              onChange={(e) => setSearchStudent(e.target.value)}
              placeholder="Cari nama siswa atau kelas..."
              aria-label="Cari nama siswa atau kelas"
              className="w-full pl-9 pr-3.5 py-2.5 min-h-[42px] text-xs sm:text-sm bg-white border border-[#DFDCD3] rounded-xl"
            />
          </div>
          <select
            value={filterQuizId}
            onChange={(e) => setFilterQuizId(e.target.value)}
            aria-label="Filter berdasarkan kuis"
            className="w-full px-3.5 py-2.5 min-h-[42px] text-xs sm:text-sm bg-white border border-[#DFDCD3] rounded-xl"
          >
            <option value="all">Semua Kuis ({allAttempts.length})</option>
            {quizzesWithCounts.map((q) => (
              <option key={q.id} value={q.id}>
                {q.title} ({q.attemptCount})
              </option>
            ))}
          </select>
          <select
            value={filterClass}
            onChange={(e) => setFilterClass(e.target.value)}
            aria-label="Filter berdasarkan kelas"
            className="w-full px-3.5 py-2.5 min-h-[42px] text-xs sm:text-sm bg-white border border-[#DFDCD3] rounded-xl"
          >
            <option value="all">Semua Kelas</option>
            {availableClasses.map((cls) => (
              <option key={cls} value={cls}>
                {cls}
              </option>
            ))}
          </select>
        </div>

        {loading ? (
          <p className="text-sm text-[#626E7E] py-2">Memuat rekap nilai siswa...</p>
        ) : filteredAttempts.length === 0 ? (
          <div className="p-6 rounded-xl bg-[#F7F6F2] border border-[#DFDCD3] text-center space-y-1.5">
            <p className="text-sm font-semibold text-[#121820]">
              {allAttempts.length === 0
                ? 'Belum Ada Nilai Siswa yang Masuk'
                : 'Tidak Ada Nilai yang Cocok dengan Filter'}
            </p>
            <p className="text-xs text-[#626E7E]">
              {allAttempts.length === 0
                ? 'Setelah kuis dibuat dan dikerjakan oleh siswa, nama siswa, kelas, serta nilai otomatis muncul pada tabel ini.'
                : 'Ubah kata kunci pencarian atau pilih filter kuis/kelas lainnya.'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs sm:text-sm border-collapse">
              <thead>
                <tr className="bg-[#EFECE4] text-[#3F4A59] border-b border-[#DFDCD3]">
                  <th className="py-2.5 px-3 font-semibold">Nama Siswa</th>
                  <th className="py-2.5 px-3 font-semibold">Kelas</th>
                  <th className="py-2.5 px-3 font-semibold">Nama Kuis</th>
                  <th className="py-2.5 px-3 font-semibold">Nilai</th>
                  <th className="py-2.5 px-3 font-semibold">Rincian Poin</th>
                  <th className="py-2.5 px-3 font-semibold">Waktu Selesai</th>
                  <th className="py-2.5 px-3 font-semibold">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#DFDCD3]">
                {filteredAttempts.map((att) => (
                  <tr key={att.id} className="hover:bg-[#F7F6F2]">
                    <td className="py-3 px-3">
                      <p className="font-semibold text-[#121820]">{att.studentName}</p>
                      {att.parentWhatsapp && (
                        <p className="text-[11px] font-mono text-[#626E7E] mt-0.5">
                          WA: {att.parentWhatsapp}
                        </p>
                      )}
                    </td>
                    <td className="py-3 px-3 text-[#3F4A59] font-medium whitespace-nowrap">
                      {att.studentClass}
                    </td>
                    <td className="py-3 px-3 text-[#121820] max-w-[220px]">
                      <span className="line-clamp-2">{att.quizTitle}</span>
                    </td>
                    <td className="py-3 px-3 whitespace-nowrap">
                      <span
                        className={`inline-flex items-center px-2.5 py-1 rounded-lg font-mono font-bold tabular-nums text-xs ${
                          att.percentage >= 75
                            ? 'bg-emerald-50 text-[#15803D] border border-emerald-200'
                            : att.percentage >= 50
                            ? 'bg-amber-50 text-[#B45309] border border-amber-200'
                            : 'bg-rose-50 text-[#B91C1C] border border-rose-200'
                        }`}
                      >
                        {att.percentage} / 100
                      </span>
                    </td>
                    <td className="py-3 px-3 font-mono text-xs tabular-nums text-[#3F4A59] whitespace-nowrap">
                      {att.score}/{att.maxScore} poin · {att.correctCount}B / {att.wrongCount}S
                    </td>
                    <td className="py-3 px-3 text-xs text-[#626E7E] whitespace-nowrap">
                      {formatJakartaDateTime(att.submittedAtIso)}
                    </td>
                    <td className="py-3 px-3 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => setSelectedAttempt(att)}
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold text-[#121820] bg-white border border-[#DFDCD3] hover:border-[#121820] rounded-lg cursor-pointer"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>Detail</span>
                        </button>
                        {confirmDeleteAttemptId === att.id ? (
                          <div className="inline-flex items-center gap-1">
                            <button
                              type="button"
                              disabled={deletingAttemptId === att.id}
                              onClick={() => handleDeleteAttempt(att)}
                              className="px-2 py-1 text-[11px] font-semibold text-white bg-[#B91C1C] rounded-md cursor-pointer disabled:opacity-50"
                            >
                              {deletingAttemptId === att.id ? '...' : 'Ya'}
                            </button>
                            <button
                              type="button"
                              onClick={() => setConfirmDeleteAttemptId(null)}
                              className="px-2 py-1 text-[11px] font-semibold text-[#3F4A59] bg-[#EFECE4] rounded-md cursor-pointer"
                            >
                              Batal
                            </button>
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={() => setConfirmDeleteAttemptId(att.id)}
                            aria-label={`Hapus nilai ${att.studentName}`}
                            className="p-1.5 text-[#B91C1C] bg-white border border-rose-200 hover:bg-rose-50 rounded-lg cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {selectedAttempt && (
          <div className="p-5 rounded-xl bg-[#F7F6F2] border border-[#DFDCD3] space-y-3">
            <div className="flex items-center justify-between gap-2">
              <p className="text-sm font-bold text-[#121820]">
                Lembar Jawaban: {selectedAttempt.studentName} ({selectedAttempt.studentClass}) — Nilai{' '}
                {selectedAttempt.percentage}/100
              </p>
              <button
                type="button"
                onClick={() => setSelectedAttempt(null)}
                className="text-xs font-semibold text-[#626E7E] hover:text-[#121820] cursor-pointer"
              >
                Tutup Detail
              </button>
            </div>
            <div className="space-y-2">
              {selectedAttempt.gradedDetails.map((d, idx) => {
                const matchedQuiz = quizzes.find((q) => q.id === selectedAttempt.quizId);
                const matchedQuestion = matchedQuiz?.questions.find((q) => q.id === d.questionId);
                const resolvedCorrectText =
                  d.correctOptionText ||
                  matchedQuestion?.options.find((o) => o.id === matchedQuestion.correctOptionId)?.text ||
                  matchedQuestion?.correctOptionId ||
                  '-';
                const resolvedExplanation = d.explanation || matchedQuestion?.explanation;
                return (
                  <div
                    key={d.questionId}
                    className={`p-3 rounded-xl border text-xs space-y-1 ${
                      d.isCorrect
                        ? 'bg-emerald-50/70 border-emerald-200'
                        : 'bg-rose-50/70 border-rose-200'
                    }`}
                  >
                    <p className="font-semibold text-[#121820]">
                      #{idx + 1}. {d.prompt}
                    </p>
                    {d.imageUrl && (
                      <img
                        src={d.imageUrl}
                        alt={`Gambar soal ${idx + 1}`}
                        className="max-h-36 w-auto max-w-full rounded-lg border border-[#DFDCD3] object-contain bg-white my-1.5"
                        referrerPolicy="no-referrer"
                      />
                    )}
                    <p>
                      Jawaban siswa: <strong>{d.selectedOptionText}</strong> · Kunci:{' '}
                      <strong>{resolvedCorrectText}</strong> ({d.earnedPoints}/{d.maxPoints} poin)
                    </p>
                    {resolvedExplanation && (
                      <p className="text-[#3F4A59]">
                        Pembahasan: {resolvedExplanation}
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </section>

      {/* QUIZZES LIST */}
      <div className="editorial-card rounded-2xl p-6 space-y-4">
        <h3 className="text-base font-bold text-[#121820]">Daftar Kuis ({quizzesWithCounts.length})</h3>
        {loading ? (
          <p className="text-sm text-[#626E7E]">Memuat daftar kuis...</p>
        ) : quizzesWithCounts.length === 0 ? (
          <p className="text-sm text-[#626E7E]">
            Belum ada kuis tersimpan. Klik tombol <strong>Buat Kuis Baru</strong> untuk menambahkan kuis Anda sendiri.
          </p>
        ) : (
          <div className="grid grid-cols-1 gap-4">
            {quizzesWithCounts.map((q) => (
              <article
                key={q.id}
                className="p-4 sm:p-5 rounded-xl bg-[#F7F6F2] border border-[#DFDCD3] flex flex-col lg:flex-row lg:items-center justify-between gap-4"
              >
                <div className="space-y-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2 text-xs">
                    <span
                      className={`font-semibold ${
                        q.status === 'published'
                          ? 'text-[#15803D]'
                          : q.status === 'draft'
                          ? 'text-[#B45309]'
                          : 'text-[#B91C1C]'
                      }`}
                    >
                      {q.status === 'published'
                        ? 'Terbit'
                        : q.status === 'draft'
                        ? 'Draf'
                        : 'Nonaktif'}
                    </span>
                    <span className="text-[#626E7E]">·</span>
                    <span className="text-[#3F4A59] font-medium">{q.targetClass}</span>
                    <span className="text-[#626E7E]">·</span>
                    <span className="font-mono text-[#626E7E] tabular-nums">
                      {q.questions.length} Soal · {q.timeLimitMinutes > 0 ? `${q.timeLimitMinutes} Menit` : 'Tanpa Batas'}
                    </span>
                  </div>
                  <h4 className="font-display text-xl font-bold text-[#121820]">{q.title}</h4>
                  <p className="text-xs text-[#3F4A59]">
                    Total Pengumpulan: <strong className="font-mono tabular-nums">{q.attemptCount}</strong> peserta
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => openShareQuizModal(q)}
                    className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-white bg-[#0F766E] hover:bg-[#115E59] rounded-xl cursor-pointer"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>Kirim ke WA</span>
                  </button>
                  <button
                    type="button"
                    disabled={togglingStatusQuizId === q.id}
                    onClick={() => void handleToggleQuizStatus(q)}
                    className={`inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-xl border cursor-pointer disabled:opacity-50 ${
                      q.status === 'published'
                        ? 'text-amber-800 bg-amber-50 border-amber-200 hover:bg-amber-100'
                        : 'text-[#15803D] bg-emerald-50 border-emerald-200 hover:bg-emerald-100'
                    }`}
                  >
                    <span>
                      {togglingStatusQuizId === q.id
                        ? '...'
                        : q.status === 'published'
                        ? 'Jadikan Draf'
                        : 'Terbitkan'}
                    </span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleCopyLink(q.id)}
                    className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-[#121820] bg-white border border-[#DFDCD3] hover:border-[#121820] rounded-xl cursor-pointer"
                  >
                    {copiedId === q.id ? <CheckCircle2 className="w-3.5 h-3.5 text-[#15803D]" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedId === q.id ? 'Tersalin' : 'Salin Link'}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleOpenAttempts(q.id)}
                    className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-[#121820] bg-white border border-[#DFDCD3] hover:border-[#121820] rounded-xl cursor-pointer"
                  >
                    <Users className="w-3.5 h-3.5" />
                    <span>Hasil ({q.attemptCount})</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDownloadCsv(q.id)}
                    className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-[#0F766E] bg-white border border-[#DFDCD3] hover:border-[#0F766E] rounded-xl cursor-pointer"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>CSV</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setEditorErrors([]);
                      setQuestionImageError({});
                      setUrlInputOpen({});
                      setEditorGroupIds([]);
                      setEditorSinglePhone('');
                      setEditingDraft(q);
                    }}
                    className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-white bg-[#121820] hover:bg-[#BE123C] rounded-xl cursor-pointer"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                    <span>Edit</span>
                  </button>
                  <button
                    type="button"
                    disabled={deletingQuizId === q.id}
                    onClick={() => handleDeleteQuiz(q)}
                    aria-label={`Hapus ${q.title}`}
                    className="inline-flex items-center gap-1 px-3 py-2 text-xs font-semibold text-[#B91C1C] bg-white border border-rose-200 hover:bg-rose-50 rounded-xl cursor-pointer disabled:opacity-50"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </article>
            ))}
          </div>
        )}
      </div>

      {/* SEND QUIZ TO WHATSAPP GROUPS (SCOPE CHECKBOXES) & SINGLE PHONE MODAL */}
      {shareQuiz && (
        <div
          className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
          aria-label="Kirim Kuis ke WhatsApp"
        >
          <form
            onSubmit={handleSendQuizWa}
            className="editorial-card rounded-2xl max-w-2xl w-full p-6 space-y-5 max-h-[92vh] overflow-y-auto shadow-2xl"
          >
            <div className="flex items-start justify-between gap-3 pb-4 border-b border-[#DFDCD3]">
              <div>
                <p className="text-xs font-semibold text-[#BE123C] uppercase tracking-wider flex items-center gap-1.5">
                  <Target className="w-3.5 h-3.5" />
                  <span>Distribusi Kuis Online via Fonnte</span>
                </p>
                <h3 className="font-display text-2xl font-bold text-[#121820] mt-0.5">
                  Kirim Kuis ke WhatsApp
                </h3>
                <p className="text-xs text-[#3F4A59] mt-0.5">
                  Kuis: <strong>{shareQuiz.title}</strong> ({shareQuiz.targetClass})
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShareQuiz(null)}
                aria-label="Tutup modal kirim kuis"
                className="p-2 rounded-xl bg-[#EFECE4] hover:bg-[#DFDCD3] text-[#121820] cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {shareQuiz.status !== 'published' && (
              <label className="flex items-start gap-2.5 p-3.5 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-950 cursor-pointer">
                <input
                  type="checkbox"
                  checked={sharePublishBeforeSend}
                  onChange={(e) => setSharePublishBeforeSend(e.target.checked)}
                  className="mt-0.5 accent-[#BE123C]"
                />
                <span>
                  Kuis ini masih berstatus <strong>{shareQuiz.status === 'draft' ? 'Draf' : 'Nonaktif'}</strong>. Terbitkan kuis otomatis saat mengirim agar tautan dapat langsung dibuka siswa di halaman <code className="font-mono">/kuis</code>.
                </span>
              </label>
            )}

            {shareError && (
              <div role="alert" className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-xs sm:text-sm text-[#B91C1C]">
                {shareError}
              </div>
            )}

            {/* 1. CHECKABLE WHATSAPP GROUPS WITH SCOPE ICON */}
            <div className="space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="inline-flex items-center gap-1.5 text-xs sm:text-sm font-bold text-[#121820]">
                  <Target className="w-4 h-4 text-[#BE123C]" />
                  <span>1. Pilih Grup WhatsApp (Centang Target Scope · {shareGroupIds.length} dipilih)</span>
                </span>
                <div className="flex items-center gap-2">
                  {sortedWaGroups.length > 0 && (
                    <button
                      type="button"
                      onClick={() =>
                        setShareGroupIds(
                          shareGroupIds.length === sortedWaGroups.length
                            ? []
                            : sortedWaGroups.map((g) => g.id)
                        )
                      }
                      className="text-xs font-semibold text-[#BE123C] cursor-pointer"
                    >
                      {shareGroupIds.length === sortedWaGroups.length ? 'Batal Semua' : 'Pilih Semua'}
                    </button>
                  )}
                  <button
                    type="button"
                    disabled={waGroupsSyncing}
                    onClick={() => void handleSyncWaGroups()}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-[#121820] bg-[#EFECE4] hover:bg-[#DFDCD3] rounded-lg cursor-pointer disabled:opacity-60"
                  >
                    <RefreshCw className={`w-3 h-3 ${waGroupsSyncing ? 'animate-spin' : ''}`} />
                    <span>Sync Grup Fonnte</span>
                  </button>
                </div>
              </div>

              {waGroupsNote && (
                <p className="text-xs text-[#3F4A59] bg-[#F7F6F2] border border-[#DFDCD3] rounded-xl px-3.5 py-2">
                  {waGroupsNote}
                </p>
              )}

              {waGroupsLoading ? (
                <p className="text-xs text-[#626E7E]">Memuat daftar grup WhatsApp tersimpan...</p>
              ) : sortedWaGroups.length === 0 ? (
                <div className="p-4 rounded-xl bg-[#F7F6F2] border border-[#DFDCD3] text-xs text-[#626E7E] space-y-1">
                  <p className="font-semibold text-[#121820]">Belum ada grup WhatsApp yang tersinkron.</p>
                  <p>
                    Klik tombol <strong>Sync Grup Fonnte</strong> di atas (pastikan <code className="font-mono">FONNTE_TOKEN</code> aktif di server), atau isi 1 nomor WhatsApp tujuan di bagian bawah.
                  </p>
                </div>
              ) : (
                <div className="max-h-56 overflow-y-auto space-y-2 pr-1">
                  {sortedWaGroups.map((g) => {
                    const checked = shareGroupIds.includes(g.id);
                    return (
                      <label
                        key={g.id}
                        className={`flex items-center gap-3 p-3 rounded-xl border transition-colors cursor-pointer ${
                          checked
                            ? 'bg-[#121820] text-white border-[#121820]'
                            : 'bg-[#F7F6F2] text-[#121820] border-[#DFDCD3] hover:border-[#121820]'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() =>
                            setShareGroupIds((prev) =>
                              checked ? prev.filter((id) => id !== g.id) : [...prev, g.id]
                            )
                          }
                          aria-label={`Pilih grup ${g.name}`}
                          className="sr-only"
                        />
                        <span
                          aria-hidden="true"
                          className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 border transition-colors ${
                            checked
                              ? 'bg-[#BE123C] border-[#BE123C] text-white'
                              : 'bg-white border-[#DFDCD3] text-[#626E7E]'
                          }`}
                        >
                          {checked ? <Check className="w-4 h-4" /> : <Target className="w-4 h-4" />}
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="text-xs sm:text-sm font-bold truncate">{g.name}</p>
                          <p
                            className={`text-[11px] font-mono truncate ${
                              checked ? 'text-slate-300' : 'text-[#626E7E]'
                            }`}
                          >
                            {g.id}
                          </p>
                        </div>
                        {g.pinned && (
                          <Star className="w-4 h-4 text-amber-400 fill-current shrink-0" />
                        )}
                      </label>
                    );
                  })}
                </div>
              )}
            </div>

            {/* 2. SEND TO 1 PHONE NUMBER */}
            <div className="space-y-2 pt-2 border-t border-[#DFDCD3]">
              <label
                htmlFor="quiz-share-single-phone"
                className="flex items-center gap-1.5 text-xs sm:text-sm font-bold text-[#121820]"
              >
                <Phone className="w-4 h-4 text-[#0F766E]" />
                <span>2. Kirim ke 1 Nomor WhatsApp (Opsional)</span>
              </label>
              <input
                id="quiz-share-single-phone"
                type="tel"
                value={shareSinglePhone}
                onChange={(e) => setShareSinglePhone(e.target.value)}
                placeholder="Contoh: 082119770700 atau 6282119770700"
                className="w-full px-3.5 py-2.5 min-h-[44px] text-sm font-mono bg-white border border-[#DFDCD3] rounded-xl focus:outline-none focus:border-[#121820]"
              />
              {shareSinglePhone.trim() && (() => {
                const check = isValidWaTarget(shareSinglePhone.trim());
                if (!check.valid || check.isGroupId) {
                  return (
                    <p className="text-[11px] text-[#B91C1C]">
                      Format nomor tidak valid (masukkan 8–16 digit nomor WhatsApp pribadi).
                    </p>
                  );
                }
                return (
                  <p className="text-[11px] text-[#15803D] font-mono">
                    Format valid · Target: {check.normalized}
                  </p>
                );
              })()}
            </div>

            {/* 3. MESSAGE PREVIEW & EDIT */}
            <div className="space-y-2 pt-2 border-t border-[#DFDCD3]">
              <label
                htmlFor="quiz-share-message"
                className="block text-xs sm:text-sm font-bold text-[#121820]"
              >
                3. Isi Pesan Undangan Kuis
              </label>
              <textarea
                id="quiz-share-message"
                rows={6}
                value={shareMessage}
                onChange={(e) => setShareMessage(e.target.value)}
                className="w-full px-3.5 py-2.5 text-xs sm:text-sm bg-white border border-[#DFDCD3] rounded-xl focus:outline-none focus:border-[#121820]"
              />
            </div>

            {shareResults && (
              <div className="p-4 rounded-xl bg-[#F7F6F2] border border-[#DFDCD3] space-y-2.5">
                <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                  <span className="font-bold text-[#121820]">Hasil Pengiriman WhatsApp</span>
                  <span className="font-mono font-bold">
                    <span className="text-[#15803D]">{shareResults.sentCount} Berhasil</span>
                    {' · '}
                    <span className="text-[#B91C1C]">{shareResults.failedCount} Gagal</span>
                  </span>
                </div>
                <div className="space-y-1.5">
                  {shareResults.items.map((item) => (
                    <div
                      key={item.target}
                      className={`p-2.5 rounded-lg border text-xs flex flex-col gap-0.5 ${
                        item.status === 'sent'
                          ? 'bg-emerald-50 border-emerald-200 text-emerald-950'
                          : 'bg-rose-50 border-rose-200 text-[#B91C1C]'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2 font-semibold">
                        <span>{item.label}</span>
                        <span className="uppercase font-mono">{item.status}</span>
                      </div>
                      <span className="text-[11px] opacity-90">{item.detail}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="flex flex-wrap items-center justify-end gap-3 pt-3 border-t border-[#DFDCD3]">
              <button
                type="button"
                onClick={() => setShareQuiz(null)}
                className="px-4 py-2.5 min-h-[42px] text-xs font-semibold text-[#3F4A59] bg-[#EFECE4] hover:bg-[#DFDCD3] rounded-xl cursor-pointer"
              >
                Tutup
              </button>
              <button
                type="submit"
                disabled={
                  shareSending ||
                  (shareGroupIds.length === 0 && !shareSinglePhone.trim())
                }
                className="inline-flex items-center gap-2 px-5 py-2.5 min-h-[44px] text-xs sm:text-sm font-semibold text-white bg-[#BE123C] hover:bg-[#9F1239] rounded-xl transition-colors cursor-pointer disabled:opacity-50"
              >
                <Send className="w-4 h-4" />
                <span>
                  {shareSending
                    ? 'Mengirim via Fonnte...'
                    : `Kirim Sekarang (${shareGroupIds.length + (shareSinglePhone.trim() ? 1 : 0)} Target)`}
                </span>
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
