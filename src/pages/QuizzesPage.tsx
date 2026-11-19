import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  BookOpen,
  CheckCircle2,
  Clock,
  Play,
  RotateCcw,
  Send,
} from 'lucide-react';
import { PagePhotoHero } from '../components/IndramayuMotifs';
import heroStudentStudy from '../assets/images/hero_student_study_1795063097881.jpg';
import { normalizeParticipantIdentity, type StudentSafeQuiz } from '../lib/quizAndWaDomain';
import {
  fetchPublishedQuizByIdFromFirestore,
  fetchPublishedQuizzesFromFirestore,
  isFirestorePermissionDeniedError,
  saveStudentQuizAttemptToFirestore,
  type PublicQuizListItem,
} from '../lib/quizFirestore';

const LOCAL_ATTEMPT_COUNTS_KEY = 'tomoyo_quiz_attempts_v1';

function getLocalAttemptKey(quizId: string, studentName: string, studentClass: string): string {
  return `${quizId}::${normalizeParticipantIdentity(studentName)}::${normalizeParticipantIdentity(studentClass)}`;
}

function getLocalAttemptCount(quizId: string, studentName: string, studentClass: string): number {
  try {
    const raw = window.localStorage.getItem(LOCAL_ATTEMPT_COUNTS_KEY);
    if (!raw) return 0;
    const map = JSON.parse(raw) as Record<string, number>;
    return Number(map[getLocalAttemptKey(quizId, studentName, studentClass)]) || 0;
  } catch {
    return 0;
  }
}

function incrementLocalAttemptCount(quizId: string, studentName: string, studentClass: string) {
  try {
    const raw = window.localStorage.getItem(LOCAL_ATTEMPT_COUNTS_KEY);
    const map = raw ? (JSON.parse(raw) as Record<string, number>) : {};
    const key = getLocalAttemptKey(quizId, studentName, studentClass);
    map[key] = (Number(map[key]) || 0) + 1;
    window.localStorage.setItem(LOCAL_ATTEMPT_COUNTS_KEY, JSON.stringify(map));
  } catch {
    // ignore storage errors
  }
}

interface QuizSubmissionResult {
  attemptId: string;
  quizTitle: string;
  studentName: string;
  studentClass: string;
  score: number;
  maxScore: number;
  percentage: number;
  correctCount: number;
  wrongCount: number;
  unansweredCount: number;
  durationSeconds: number;
  submittedAtIso: string;
}

function formatCountdown(secondsLeft: number): string {
  const safe = Math.max(0, Math.floor(secondsLeft));
  const mins = Math.floor(safe / 60);
  const secs = safe % 60;
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}

export function QuizzesPage() {
  const { quizId } = useParams<{ quizId?: string }>();
  if (quizId) {
    return <SingleQuizRunnerPage quizId={quizId} />;
  }
  return <QuizDirectoryPage />;
}

function QuizDirectoryPage() {
  const [quizzes, setQuizzes] = useState<PublicQuizListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadPublishedQuizzes = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const list = await fetchPublishedQuizzesFromFirestore();
      if (list.length > 0) {
        setQuizzes(list);
        return;
      }
      // Cross-check backend REST Firestore query in case client network/cache lag occurs
      try {
        const res = await fetch('/api/quizzes', { cache: 'no-store' });
        if (res.ok) {
          const data = (await res.json()) as { quizzes?: PublicQuizListItem[] };
          if (Array.isArray(data.quizzes) && data.quizzes.length > 0) {
            setQuizzes(data.quizzes);
            return;
          }
        }
      } catch {
        // Ignore fallback failure when Firestore returned empty cleanly
      }
      setQuizzes([]);
    } catch (err) {
      if (isFirestorePermissionDeniedError(err)) {
        setError(
          'Kuis belum dapat dimuat karena aturan Firestore belum diperbarui. Silakan hubungi admin TOMOYO Education.'
        );
      } else {
        try {
          const res = await fetch('/api/quizzes', { cache: 'no-store' });
          if (res.ok) {
            const data = (await res.json()) as { quizzes?: PublicQuizListItem[] };
            setQuizzes(Array.isArray(data.quizzes) ? data.quizzes : []);
            return;
          }
        } catch {
          // ignore
        }
        setError(err instanceof Error ? err.message : 'Gagal memuat daftar kuis.');
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadPublishedQuizzes();
  }, [loadPublishedQuizzes]);

  return (
    <div>
      <PagePhotoHero
        imageSrc={heroStudentStudy}
        imageAlt="Meja belajar dengan buku latihan dan lampu belajar hangat"
        eyebrow="Evaluasi Mandiri · Tanpa Login"
        title="Portal Kuis Online TOMOYO"
        description="Latihan soal terstruktur untuk mengasah pemahaman siswa TK hingga Kelas 6 SD. Pilih kuis yang aktif, isi nama lengkap dan kelas, lalu kerjakan secara langsung."
      />

      <section className="py-12 sm:py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {[1, 2].map((i) => (
                <div key={i} className="h-56 editorial-card animate-pulse rounded-2xl" />
              ))}
            </div>
          ) : error ? (
            <div
              role="alert"
              className="editorial-card rounded-2xl p-8 text-center max-w-xl mx-auto space-y-3"
            >
              <AlertCircle className="w-8 h-8 text-[#B91C1C] mx-auto" />
              <p className="text-sm font-semibold text-[#141A23]">{error}</p>
              <button
                type="button"
                onClick={() => void loadPublishedQuizzes()}
                className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-[#141A23] bg-[#F2EFE9] hover:bg-[#E5E2D9] rounded-xl cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Coba Muat Ulang</span>
              </button>
            </div>
          ) : quizzes.length === 0 ? (
            <div className="editorial-card rounded-2xl p-10 text-center max-w-xl mx-auto space-y-4">
              <BookOpen className="w-10 h-10 text-[#626E7E] mx-auto" />
              <h2 className="font-display text-2xl font-bold text-[#141A23]">
                Belum Ada Kuis Aktif
              </h2>
              <p className="text-sm text-[#3E4856] leading-relaxed">
                Daftar kuis latihan online akan tampil di halaman ini setelah diterbitkan oleh pengelola TOMOYO Education.
              </p>
              <button
                type="button"
                onClick={() => void loadPublishedQuizzes()}
                className="inline-flex items-center gap-2 px-4 py-2.5 text-xs font-semibold text-[#141A23] bg-[#F2EFE9] hover:bg-[#E5E2D9] rounded-xl cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Muat Ulang Daftar Kuis</span>
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {quizzes.map((quiz) => {
                const avail = quiz.availability;
                return (
                  <article
                    key={quiz.id}
                    className="editorial-card rounded-2xl p-6 sm:p-7 flex flex-col justify-between gap-6"
                  >
                    <div className="space-y-4">
                      <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-[#E5E2D9] text-xs">
                        <span className="font-semibold text-[#A61B38]">{quiz.targetClass}</span>
                        <span
                          className={`font-semibold ${
                            avail.available ? 'text-[#15803D]' : 'text-[#B45309]'
                          }`}
                        >
                          {avail.available
                            ? 'Aktif Dikerjakan'
                            : avail.state === 'upcoming'
                            ? 'Belum Dimulai'
                            : 'Waktu Berakhir'}
                        </span>
                      </div>

                      <div className="space-y-2">
                        <h2 className="font-display text-2xl sm:text-3xl font-bold text-[#141A23] leading-tight">
                          {quiz.title}
                        </h2>
                        <p className="text-sm text-[#3E4856] leading-relaxed">{quiz.description}</p>
                      </div>

                      <div className="editorial-card-subtle rounded-xl p-4 grid grid-cols-3 gap-3 text-xs">
                        <div>
                          <p className="text-[#626E7E]">Jumlah Soal</p>
                          <p className="font-mono font-bold text-sm text-[#141A23] tabular-nums mt-0.5">
                            {quiz.questionCount} Butir
                          </p>
                        </div>
                        <div>
                          <p className="text-[#626E7E]">Batas Waktu</p>
                          <p className="font-mono font-bold text-sm text-[#141A23] tabular-nums mt-0.5">
                            {quiz.timeLimitMinutes > 0 ? `${quiz.timeLimitMinutes} Menit` : 'Bebas'}
                          </p>
                        </div>
                        <div>
                          <p className="text-[#626E7E]">Percobaan</p>
                          <p className="font-mono font-bold text-sm text-[#141A23] tabular-nums mt-0.5">
                            {quiz.maxAttempts > 0 ? `Maks. ${quiz.maxAttempts}x` : 'Bebas'}
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center justify-between gap-3 pt-2">
                      <span className="text-xs text-[#626E7E] font-mono tabular-nums">
                        Total Nilai Maks. {quiz.totalPoints}
                      </span>
                      <Link
                        to={`/kuis/${quiz.id}`}
                        className="inline-flex items-center justify-center gap-2 px-5 py-3 min-h-[44px] text-sm font-semibold text-white bg-[#A61B38] hover:bg-[#88132B] rounded-xl transition-colors whitespace-nowrap"
                      >
                        <span>{avail.available ? 'Kerjakan Kuis' : 'Lihat Detail Kuis'}</span>
                        <ArrowRight className="w-4 h-4 shrink-0" />
                      </Link>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}

function SingleQuizRunnerPage({ quizId }: { quizId: string }) {
  const navigate = useNavigate();
  const [quiz, setQuiz] = useState<StudentSafeQuiz | null>(null);
  const [availability, setAvailability] = useState<{
    available: boolean;
    state: string;
    reason?: string;
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  // Stage state
  const [stage, setStage] = useState<'entry' | 'running' | 'result'>('entry');
  const [studentName, setStudentName] = useState('');
  const [studentClass, setStudentClass] = useState('');
  const [parentWhatsapp, setParentWhatsapp] = useState('');
  const [startError, setStartError] = useState<string | null>(null);
  const [starting, setStarting] = useState(false);

  // Running quiz session
  const [sessionToken, setSessionToken] = useState<string | null>(null);
  const [deadlineIso, setDeadlineIso] = useState<string | undefined>(undefined);
  const [secondsLeft, setSecondsLeft] = useState<number | null>(null);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [saveWarning, setSaveWarning] = useState<string | null>(null);
  const [confirmUnanswered, setConfirmUnanswered] = useState(false);
  const [result, setResult] = useState<QuizSubmissionResult | null>(null);

  const answersRef = useRef(answers);
  answersRef.current = answers;
  const submittedAutoRef = useRef(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setLoadError(null);
      try {
        const data = await fetchPublishedQuizByIdFromFirestore(quizId);
        if (!data.quiz) {
          throw new Error('Kuis tidak ditemukan atau belum diterbitkan.');
        }
        if (!cancelled) {
          setQuiz(data.quiz);
          setAvailability(data.availability);
        }
      } catch (err) {
        if (!cancelled) {
          setLoadError(err instanceof Error ? err.message : 'Gagal memuat kuis.');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [quizId]);

  const submitAnswersNow = useCallback(async () => {
    if (!quiz || !sessionToken || submitting) return;
    setSubmitting(true);
    setSubmitError(null);
    setSaveWarning(null);
    try {
      const res = await fetch(`/api/quizzes/${encodeURIComponent(quiz.id)}/submit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionToken,
          studentName: studentName.trim(),
          studentClass: studentClass.trim(),
          parentWhatsapp: parentWhatsapp.trim() || undefined,
          answers: answersRef.current,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        throw new Error(data?.error || 'Gagal mengirim jawaban kuis.');
      }

      if (data.attemptRecord) {
        try {
          await saveStudentQuizAttemptToFirestore(data.attemptRecord);
        } catch {
          setSaveWarning(
            'Nilai sudah dihitung, namun arsip nilai ke rekap admin belum tersimpan otomatis. Hubungi admin bila nilai belum muncul di rekap.'
          );
        }
      }

      incrementLocalAttemptCount(quiz.id, studentName.trim(), studentClass.trim());
      setResult(data.result);
      setStage('result');
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : 'Terjadi kesalahan saat mengirim jawaban.');
    } finally {
      setSubmitting(false);
      setConfirmUnanswered(false);
    }
  }, [parentWhatsapp, quiz, sessionToken, studentClass, studentName, submitting]);

  useEffect(() => {
    if (stage !== 'running' || !deadlineIso) {
      setSecondsLeft(null);
      return;
    }
    const deadlineMs = new Date(deadlineIso).getTime();
    if (Number.isNaN(deadlineMs)) return;

    const tick = () => {
      const remaining = Math.max(0, Math.ceil((deadlineMs - Date.now()) / 1000));
      setSecondsLeft(remaining);
      if (remaining <= 0 && !submittedAutoRef.current) {
        submittedAutoRef.current = true;
        submitAnswersNow();
      }
    };

    tick();
    const timerId = window.setInterval(tick, 1000);
    return () => window.clearInterval(timerId);
  }, [deadlineIso, stage, submitAnswersNow]);

  const answeredCount = useMemo(() => {
    if (!quiz) return 0;
    return quiz.questions.filter((q) => Boolean(answers[q.id])).length;
  }, [answers, quiz]);

  const handleStartQuiz = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!quiz) return;
    setStartError(null);

    if (
      quiz.maxAttempts > 0 &&
      getLocalAttemptCount(quiz.id, studentName.trim(), studentClass.trim()) >= quiz.maxAttempts
    ) {
      setStartError(
        `Batas maksimal pengerjaan (${quiz.maxAttempts} kali) untuk ${studentName.trim()} (${studentClass.trim()}) telah tercapai.`
      );
      return;
    }

    setStarting(true);
    submittedAutoRef.current = false;
    try {
      const res = await fetch(`/api/quizzes/${encodeURIComponent(quiz.id)}/start`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          studentName: studentName.trim(),
          studentClass: studentClass.trim(),
          parentWhatsapp: parentWhatsapp.trim() || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        throw new Error(data?.error || 'Gagal memulai sesi kuis.');
      }
      setQuiz(data.quiz);
      setSessionToken(data.sessionToken);
      setDeadlineIso(data.deadlineIso);
      setAnswers({});
      setConfirmUnanswered(false);
      setSubmitError(null);
      setSaveWarning(null);
      setStage('running');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (err) {
      setStartError(err instanceof Error ? err.message : 'Gagal memulai kuis.');
    } finally {
      setStarting(false);
    }
  };

  const handleRequestSubmit = () => {
    if (!quiz) return;
    if (answeredCount < quiz.questions.length && !confirmUnanswered) {
      setConfirmUnanswered(true);
      return;
    }
    submitAnswersNow();
  };

  if (loading) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-16 text-center text-sm text-[#626E7E]">
        Memuat lembar kuis online...
      </div>
    );
  }

  if (loadError || !quiz) {
    return (
      <section className="py-16">
        <div className="max-w-lg mx-auto px-4">
          <div className="editorial-card rounded-2xl p-8 text-center space-y-4">
            <AlertCircle className="w-10 h-10 text-[#B91C1C] mx-auto" />
            <h1 className="font-display text-2xl font-bold text-[#141A23]">Kuis Tidak Tersedia</h1>
            <p className="text-sm text-[#3E4856]">{loadError || 'Kuis tidak ditemukan.'}</p>
            <Link
              to="/kuis"
              className="inline-flex items-center gap-2 px-5 py-2.5 min-h-[44px] text-sm font-semibold text-white bg-[#141A23] hover:bg-[#A61B38] rounded-xl transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Kembali ke Daftar Kuis</span>
            </Link>
          </div>
        </div>
      </section>
    );
  }

  return (
    <div className="py-8 sm:py-12">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 space-y-6">
        <div className="flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={() => navigate('/kuis')}
            className="inline-flex items-center gap-1.5 text-sm font-semibold text-[#3E4856] hover:text-[#141A23] cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Semua Kuis Online</span>
          </button>
          <span className="text-xs font-semibold text-[#A61B38]">{quiz.targetClass}</span>
        </div>

        {/* STAGE 1: STUDENT ENTRY & INSTRUCTIONS */}
        {stage === 'entry' && (
          <div className="editorial-card rounded-2xl p-6 sm:p-8 space-y-6">
            <div className="space-y-2 border-b border-[#E5E2D9] pb-5">
              <p className="text-xs font-semibold tracking-wider text-[#A61B38] uppercase">
                Lembar Identitas Siswa
              </p>
              <h1 className="font-display text-3xl sm:text-4xl font-bold text-[#141A23] leading-tight">
                {quiz.title}
              </h1>
              <p className="text-sm sm:text-base text-[#3E4856] leading-relaxed">{quiz.description}</p>
            </div>

            <div className="editorial-card-subtle rounded-xl p-4 grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
              <div>
                <p className="text-[#626E7E]">Jumlah Soal</p>
                <p className="font-mono font-bold text-sm text-[#141A23] tabular-nums mt-0.5">
                  {quiz.questionCount} Soal
                </p>
              </div>
              <div>
                <p className="text-[#626E7E]">Durasi</p>
                <p className="font-mono font-bold text-sm text-[#141A23] tabular-nums mt-0.5">
                  {quiz.timeLimitMinutes > 0 ? `${quiz.timeLimitMinutes} Menit` : 'Tanpa Batas'}
                </p>
              </div>
              <div>
                <p className="text-[#626E7E]">Skor Maksimal</p>
                <p className="font-mono font-bold text-sm text-[#141A23] tabular-nums mt-0.5">
                  {quiz.totalPoints} Poin
                </p>
              </div>
              <div>
                <p className="text-[#626E7E]">Batas Percobaan</p>
                <p className="font-mono font-bold text-sm text-[#141A23] tabular-nums mt-0.5">
                  {quiz.maxAttempts > 0 ? `${quiz.maxAttempts} Kali` : 'Bebas'}
                </p>
              </div>
            </div>

            {quiz.instructions && (
              <div className="bg-[#F2EFE9] border border-[#E5E2D9] rounded-xl p-4 space-y-1.5">
                <p className="text-xs font-bold text-[#141A23] uppercase tracking-wider">
                  Petunjuk Pengerjaan
                </p>
                <p className="text-sm text-[#3E4856] leading-relaxed whitespace-pre-line">
                  {quiz.instructions}
                </p>
              </div>
            )}

            {availability && !availability.available ? (
              <div
                role="alert"
                className="p-4 rounded-xl bg-amber-50 border border-amber-200 text-sm text-amber-900"
              >
                {availability.reason || 'Kuis ini belum dapat dikerjakan saat ini.'}
              </div>
            ) : (
              <form onSubmit={handleStartQuiz} className="space-y-4">
                {startError && (
                  <div
                    role="alert"
                    className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-sm text-[#B91C1C]"
                  >
                    {startError}
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="quiz-student-name" className="block text-xs font-semibold text-[#141A23] mb-1.5">
                      Nama Lengkap Siswa *
                    </label>
                    <input
                      id="quiz-student-name"
                      type="text"
                      required
                      value={studentName}
                      onChange={(e) => setStudentName(e.target.value)}
                      placeholder="Contoh: Aisyah Putri"
                      className="w-full px-3.5 py-2.5 min-h-[46px] text-base sm:text-sm bg-white border border-[#E5E2D9] rounded-xl focus:outline-none focus:border-[#141A23]"
                    />
                  </div>
                  <div>
                    <label htmlFor="quiz-student-class" className="block text-xs font-semibold text-[#141A23] mb-1.5">
                      Kelas *
                    </label>
                    <input
                      id="quiz-student-class"
                      type="text"
                      required
                      value={studentClass}
                      onChange={(e) => setStudentClass(e.target.value)}
                      placeholder="Contoh: Kelas 6 SD"
                      className="w-full px-3.5 py-2.5 min-h-[46px] text-base sm:text-sm bg-white border border-[#E5E2D9] rounded-xl focus:outline-none focus:border-[#141A23]"
                    />
                  </div>
                </div>

                <div>
                  <label htmlFor="quiz-parent-wa" className="block text-xs font-semibold text-[#141A23] mb-1.5">
                    Nomor WhatsApp Orang Tua (Opsional)
                  </label>
                  <input
                    id="quiz-parent-wa"
                    type="tel"
                    value={parentWhatsapp}
                    onChange={(e) => setParentWhatsapp(e.target.value)}
                    placeholder="Contoh: 082119770700"
                    className="w-full px-3.5 py-2.5 min-h-[46px] text-base sm:text-sm bg-white border border-[#E5E2D9] rounded-xl focus:outline-none focus:border-[#141A23]"
                  />
                </div>

                <button
                  type="submit"
                  disabled={starting}
                  className="inline-flex items-center justify-center gap-2 w-full sm:w-auto px-6 py-3.5 min-h-[48px] text-sm font-semibold text-white bg-[#A61B38] hover:bg-[#88132B] rounded-xl transition-colors cursor-pointer disabled:opacity-60"
                >
                  <Play className="w-4 h-4 shrink-0" />
                  <span>{starting ? 'Mempersiapkan Soal...' : 'Mulai Kerjakan Kuis'}</span>
                </button>
              </form>
            )}
          </div>
        )}

        {/* STAGE 2: ACTIVE DISTRACTION-FREE QUIZ RUNNER */}
        {stage === 'running' && (
          <div className="space-y-6">
            <div className="sticky top-[68px] sm:top-[76px] z-30 editorial-card rounded-2xl p-4 sm:px-6 flex flex-wrap items-center justify-between gap-3 shadow-md">
              <div className="min-w-0">
                <p className="text-xs font-semibold text-[#626E7E] truncate">
                  {studentName} · {studentClass}
                </p>
                <p className="text-sm font-bold text-[#141A23] truncate">{quiz.title}</p>
              </div>

              <div className="flex items-center gap-4 shrink-0">
                <div className="text-right text-xs">
                  <p className="text-[#626E7E]">Terjawab</p>
                  <p className="font-mono font-bold text-[#141A23] tabular-nums">
                    {answeredCount}/{quiz.questions.length}
                  </p>
                </div>

                {secondsLeft !== null && (
                  <div
                    className={`px-3 py-1.5 rounded-xl border font-mono font-bold text-sm tabular-nums flex items-center gap-1.5 ${
                      secondsLeft <= 60
                        ? 'bg-rose-50 border-rose-300 text-[#B91C1C]'
                        : 'bg-[#F2EFE9] border-[#E5E2D9] text-[#141A23]'
                    }`}
                  >
                    <Clock className="w-4 h-4 shrink-0" />
                    <span>{formatCountdown(secondsLeft)}</span>
                  </div>
                )}
              </div>
            </div>

            {submitError && (
              <div
                role="alert"
                className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-sm text-[#B91C1C]"
              >
                {submitError}
              </div>
            )}

            <div className="space-y-5">
              {quiz.questions.map((q, qIdx) => {
                const selectedOptId = answers[q.id] || '';
                return (
                  <article
                    key={q.id}
                    id={`question-${q.id}`}
                    className="editorial-card rounded-2xl p-5 sm:p-7 space-y-4"
                  >
                    <div className="flex items-center justify-between gap-2 text-xs">
                      <span className="font-mono font-bold text-[#A61B38] tabular-nums">
                        SOAL {String(qIdx + 1).padStart(2, '0')}
                      </span>
                      <span className="font-mono text-[#626E7E] tabular-nums">
                        {q.points} Poin
                      </span>
                    </div>

                    <h2 className="text-base sm:text-lg font-semibold text-[#141A23] leading-relaxed">
                      {q.prompt}
                    </h2>

                    {q.imageUrl && (
                      <div className="rounded-xl border border-[#E5E2D9] bg-[#FAF9F5] p-2 sm:p-3 flex justify-center">
                        <img
                          src={q.imageUrl}
                          alt={`Gambar ilustrasi soal ${qIdx + 1}`}
                          className="max-h-72 sm:max-h-80 w-auto max-w-full rounded-lg object-contain"
                          loading="lazy"
                          referrerPolicy="no-referrer"
                        />
                      </div>
                    )}

                    <div className="space-y-2.5 pt-1" role="radiogroup" aria-label={`Pilihan soal ${qIdx + 1}`}>
                      {q.options.map((opt, optIdx) => {
                        const letter =
                          q.type === 'true_false'
                            ? optIdx === 0
                              ? 'B'
                              : 'S'
                            : String.fromCharCode(65 + optIdx);
                        const isSelected = selectedOptId === opt.id;
                        return (
                          <button
                            key={opt.id}
                            type="button"
                            role="radio"
                            aria-checked={isSelected}
                            onClick={() => {
                              setConfirmUnanswered(false);
                              setAnswers((prev) => ({ ...prev, [q.id]: opt.id }));
                            }}
                            className={`w-full text-left px-4 py-3.5 min-h-[50px] rounded-xl border transition-colors flex items-center gap-3.5 cursor-pointer ${
                              isSelected
                                ? 'bg-[#141A23] text-white border-[#141A23]'
                                : 'bg-white text-[#141A23] border-[#E5E2D9] hover:border-[#141A23]'
                            }`}
                          >
                            <span
                              className={`w-8 h-8 rounded-lg font-mono text-xs font-bold flex items-center justify-center shrink-0 ${
                                isSelected
                                  ? 'bg-[#A61B38] text-white'
                                  : 'bg-[#F2EFE9] text-[#141A23]'
                              }`}
                            >
                              {letter}
                            </span>
                            <span className="text-sm sm:text-base leading-snug">{opt.text}</span>
                          </button>
                        );
                      })}
                    </div>
                  </article>
                );
              })}
            </div>

            <div className="editorial-card rounded-2xl p-5 sm:p-6 space-y-4">
              {confirmUnanswered && (
                <div
                  role="status"
                  className="p-3.5 rounded-xl bg-amber-50 border border-amber-200 text-xs sm:text-sm text-amber-900"
                >
                  Masih ada {quiz.questions.length - answeredCount} soal yang belum dijawab. Tekan tombol Kirim Jawaban sekali lagi untuk mengirim sekarang.
                </div>
              )}

              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <p className="text-xs text-[#626E7E]">
                  Progress terjawab:{' '}
                  <span className="font-mono font-bold text-[#141A23] tabular-nums">
                    {answeredCount} dari {quiz.questions.length} soal
                  </span>
                </p>

                <button
                  type="button"
                  disabled={submitting}
                  onClick={handleRequestSubmit}
                  className="inline-flex items-center justify-center gap-2 px-6 py-3.5 min-h-[48px] text-sm font-semibold text-white bg-[#A61B38] hover:bg-[#88132B] rounded-xl transition-colors cursor-pointer disabled:opacity-60"
                >
                  <Send className="w-4 h-4 shrink-0" />
                  <span>
                    {submitting
                      ? 'Menilai Jawaban...'
                      : confirmUnanswered
                      ? 'Ya, Kirim Jawaban Sekarang'
                      : 'Kirim Jawaban Kuis'}
                  </span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* STAGE 3: QUIZ RESULT SUMMARY (NO ANSWER KEYS EXPOSED) */}
        {stage === 'result' && result && (
          <div className="editorial-card rounded-2xl p-6 sm:p-8 space-y-6">
            <div className="flex items-start gap-4 border-b border-[#E5E2D9] pb-5">
              <div className="w-12 h-12 rounded-xl bg-[#F2EFE9] border border-[#E5E2D9] flex items-center justify-center shrink-0">
                <CheckCircle2 className="w-6 h-6 text-[#15803D]" />
              </div>
              <div className="space-y-1">
                <p className="text-xs font-semibold tracking-wider text-[#15803D] uppercase">
                  Jawaban Berhasil Dikirim &amp; Dinilai
                </p>
                <h1 className="font-display text-3xl font-bold text-[#141A23]">
                  {result.quizTitle}
                </h1>
                <p className="text-sm text-[#3E4856]">
                  Peserta: <span className="font-semibold text-[#141A23]">{result.studentName}</span> · {result.studentClass}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div className="editorial-card-subtle rounded-xl p-4">
                <p className="text-xs text-[#626E7E]">Skor Akhir</p>
                <p className="font-mono text-2xl font-bold text-[#141A23] tabular-nums mt-1">
                  {result.score} <span className="text-sm font-normal text-[#626E7E]">/ {result.maxScore}</span>
                </p>
              </div>
              <div className="editorial-card-subtle rounded-xl p-4">
                <p className="text-xs text-[#626E7E]">Persentase</p>
                <p className="font-mono text-2xl font-bold text-[#A61B38] tabular-nums mt-1">
                  {result.percentage}%
                </p>
              </div>
              <div className="editorial-card-subtle rounded-xl p-4">
                <p className="text-xs text-[#626E7E]">Benar / Salah</p>
                <p className="font-mono text-xl font-bold text-[#141A23] tabular-nums mt-1">
                  <span className="text-[#15803D]">{result.correctCount}</span> /{' '}
                  <span className="text-[#B91C1C]">{result.wrongCount}</span>
                </p>
              </div>
              <div className="editorial-card-subtle rounded-xl p-4">
                <p className="text-xs text-[#626E7E]">Durasi</p>
                <p className="font-mono text-xl font-bold text-[#141A23] tabular-nums mt-1">
                  {formatCountdown(result.durationSeconds)}
                </p>
              </div>
            </div>

            {saveWarning && (
              <div role="alert" className="p-3.5 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-900">
                {saveWarning}
              </div>
            )}

            <p className="text-xs text-[#626E7E] leading-relaxed">
              Hasil pengerjaan Anda telah tercatat otomatis oleh sistem penilaian TOMOYO Education untuk ditinjau oleh guru pembimbing.
            </p>

            <div className="flex flex-wrap items-center gap-3 pt-2">
              <Link
                to="/kuis"
                className="inline-flex items-center justify-center gap-2 px-5 py-3 min-h-[44px] text-sm font-semibold text-white bg-[#141A23] hover:bg-[#A61B38] rounded-xl transition-colors"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Daftar Kuis Lainnya</span>
              </Link>
              <button
                type="button"
                onClick={() => {
                  setStage('entry');
                  setResult(null);
                  setSessionToken(null);
                  setAnswers({});
                  setStartError(null);
                }}
                className="inline-flex items-center justify-center gap-2 px-5 py-3 min-h-[44px] text-sm font-semibold text-[#141A23] bg-white border border-[#E5E2D9] hover:border-[#141A23] rounded-xl transition-colors cursor-pointer"
              >
                <RotateCcw className="w-4 h-4" />
                <span>Kerjakan Ulang</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
