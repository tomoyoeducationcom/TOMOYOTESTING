import React, { useCallback, useEffect, useMemo, useState } from 'react';
import type { User } from 'firebase/auth';
import {
  ArrowDown,
  ArrowUp,
  CheckCircle2,
  Copy,
  Download,
  Edit3,
  Eye,
  Image as ImageIcon,
  Link2,
  Plus,
  Search,
  Trash2,
  Users,
  X,
} from 'lucide-react';
import { uploadImageToCloudinary } from '../lib/cloudinary';
import type {
  QuizAttemptRecord,
  QuizDefinition,
  QuizQuestion,
  QuizQuestionType,
  QuizStatus,
} from '../lib/quizAndWaDomain';
import { formatJakartaDateTime } from '../lib/domain';

interface AdminQuizItem extends QuizDefinition {
  attemptCount: number;
}

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
    status: 'draft',
    timeLimitMinutes: 15,
    maxAttempts: 2,
    startAtIso: '',
    endAtIso: '',
    questions: [createEmptyQuestion(1, 'multiple_choice')],
  };
}

export function AdminQuizPanel({ user }: { user: User }) {
  const [quizzes, setQuizzes] = useState<AdminQuizItem[]>([]);
  const [allAttempts, setAllAttempts] = useState<QuizAttemptRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [banner, setBanner] = useState<string | null>(null);
  const [deletingQuizId, setDeletingQuizId] = useState<string | null>(null);
  const [confirmDeleteAttemptId, setConfirmDeleteAttemptId] = useState<string | null>(null);
  const [deletingAttemptId, setDeletingAttemptId] = useState<string | null>(null);

  // Recap filter state
  const [filterQuizId, setFilterQuizId] = useState<string>('all');
  const [filterClass, setFilterClass] = useState<string>('all');
  const [searchStudent, setSearchStudent] = useState<string>('');

  // Editor state
  const [editingDraft, setEditingDraft] = useState<Partial<QuizDefinition> | null>(null);
  const [saving, setSaving] = useState(false);
  const [editorErrors, setEditorErrors] = useState<string[]>([]);
  const [notifyTarget, setNotifyTarget] = useState('');
  const [uploadingQuestionIdx, setUploadingQuestionIdx] = useState<number | null>(null);
  const [questionImageError, setQuestionImageError] = useState<Record<string, string>>({});
  const [urlInputOpen, setUrlInputOpen] = useState<Record<string, boolean>>({});

  // Results review state
  const [selectedAttempt, setSelectedAttempt] = useState<QuizAttemptRecord | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const loadQuizzes = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const token = await user.getIdToken();
      const [quizRes, attemptsRes] = await Promise.all([
        fetch('/api/admin/quizzes', {
          cache: 'no-store',
          headers: { Authorization: `Bearer ${token}` },
        }),
        fetch('/api/admin/quiz-attempts', {
          cache: 'no-store',
          headers: { Authorization: `Bearer ${token}` },
        }),
      ]);
      const quizData = await quizRes.json();
      if (!quizRes.ok) throw new Error(quizData?.error || 'Gagal memuat data kuis.');
      const attemptsData = attemptsRes.ok ? await attemptsRes.json() : { attempts: [] };
      setQuizzes(Array.isArray(quizData.quizzes) ? quizData.quizzes : []);
      setAllAttempts(Array.isArray(attemptsData.attempts) ? attemptsData.attempts : []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal memuat data kuis.');
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    loadQuizzes();
  }, [loadQuizzes]);

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

  const handleSaveQuiz = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingDraft) return;
    setSaving(true);
    setEditorErrors([]);
    setBanner(null);
    try {
      const token = await user.getIdToken();
      const res = await fetch('/api/admin/quizzes', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          ...editingDraft,
          notifyTarget: notifyTarget.trim() || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        setEditorErrors(Array.isArray(data.errors) ? data.errors : [data.error || 'Gagal menyimpan kuis.']);
        return;
      }
      setEditingDraft(null);
      setNotifyTarget('');
      setBanner(`Kuis "${data.quiz.title}" berhasil disimpan.`);
      await loadQuizzes();
    } catch (err) {
      setEditorErrors([err instanceof Error ? err.message : 'Gagal menyimpan kuis.']);
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteQuiz = async (quiz: AdminQuizItem) => {
    if (deletingQuizId) return;
    setDeletingQuizId(quiz.id);
    setBanner(null);
    setError(null);
    try {
      const token = await user.getIdToken();
      const res = await fetch(`/api/admin/quizzes/${encodeURIComponent(quiz.id)}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('Gagal menghapus kuis.');
      if (filterQuizId === quiz.id) setFilterQuizId('all');
      if (selectedAttempt?.quizId === quiz.id) setSelectedAttempt(null);
      setBanner(`Kuis "${quiz.title}" telah dihapus.`);
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
      const token = await user.getIdToken();
      const res = await fetch(`/api/admin/quiz-attempts/${encodeURIComponent(att.id)}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('Gagal menghapus data nilai siswa.');
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

  const handleDownloadCsv = async (quizId: string) => {
    try {
      const token = await user.getIdToken();
      const res = await fetch(`/api/admin/quizzes/${encodeURIComponent(quizId)}/export`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('Gagal mengekspor CSV.');
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `hasil-${quizId}.csv`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal mengekspor CSV.');
    }
  };

  const handleDownloadRecapCsv = async () => {
    try {
      const token = await user.getIdToken();
      const params = new URLSearchParams();
      if (filterQuizId !== 'all') params.set('quizId', filterQuizId);
      if (filterClass !== 'all') params.set('studentClass', filterClass);
      if (searchStudent.trim()) params.set('search', searchStudent.trim());
      const res = await fetch(`/api/admin/quiz-attempts/export?${params.toString()}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('Gagal mengekspor rekap nilai CSV.');
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'rekap-nilai-kuis-siswa.csv';
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal mengekspor rekap nilai CSV.');
    }
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
            Buat soal pilihan ganda &amp; benar/salah, atur jadwal dan durasi, pantau hasil peserta, serta ekspor rekap CSV.
          </p>
        </div>
        <button
          type="button"
          onClick={() => {
            setEditorErrors([]);
            setQuestionImageError({});
            setUrlInputOpen({});
            setEditingDraft(createEmptyQuizDraft());
          }}
          className="inline-flex items-center justify-center gap-2 px-5 py-3 min-h-[44px] text-sm font-semibold text-white bg-[#BE123C] hover:bg-[#9F1239] rounded-xl transition-colors cursor-pointer shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span>Buat Kuis Baru</span>
        </button>
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
        <div role="status" className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-sm text-emerald-900">
          {banner}
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
            <div className="p-4 rounded-xl editorial-card-subtle space-y-2">
              <label className="block text-xs font-semibold text-[#121820]">
                Target Notifikasi Otomatis Saat Terbit (Opsional — Grup ID `...@g.us` atau Nomor WA)
              </label>
              <input
                type="text"
                value={notifyTarget}
                onChange={(e) => setNotifyTarget(e.target.value)}
                placeholder="Kosongkan jika tidak ingin mengirim otomatis sekarang"
                className="w-full px-3.5 py-2.5 min-h-[42px] text-xs font-mono bg-white border border-[#DFDCD3] rounded-xl"
              />
              <p className="text-[11px] text-[#626E7E]">
                Notifikasi otomatis hanya dikirim jika fitur otomatis Kuis Online diaktifkan di menu WhatsApp Center → Pengaturan.
              </p>
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
          <button
            type="button"
            disabled={filteredAttempts.length === 0}
            onClick={handleDownloadRecapCsv}
            className="inline-flex items-center justify-center gap-1.5 px-4 py-2.5 min-h-[42px] text-xs font-semibold text-white bg-[#0F766E] hover:bg-[#115E59] rounded-xl cursor-pointer disabled:opacity-50 shrink-0"
          >
            <Download className="w-4 h-4" />
            <span>Ekspor Rekap CSV / Excel</span>
          </button>
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
            {quizzes.map((q) => (
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
              {selectedAttempt.gradedDetails.map((d, idx) => (
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
                    <strong>{d.correctOptionText}</strong> ({d.earnedPoints}/{d.maxPoints} poin)
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}
      </section>

      {/* QUIZZES LIST */}
      <div className="editorial-card rounded-2xl p-6 space-y-4">
        <h3 className="text-base font-bold text-[#121820]">Daftar Kuis ({quizzes.length})</h3>
        {loading ? (
          <p className="text-sm text-[#626E7E]">Memuat daftar kuis...</p>
        ) : quizzes.length === 0 ? (
          <p className="text-sm text-[#626E7E]">
            Belum ada kuis tersimpan. Klik tombol <strong>Buat Kuis Baru</strong> untuk menambahkan kuis Anda sendiri.
          </p>
        ) : (
          <div className="grid grid-cols-1 gap-4">
            {quizzes.map((q) => (
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
    </div>
  );
}
