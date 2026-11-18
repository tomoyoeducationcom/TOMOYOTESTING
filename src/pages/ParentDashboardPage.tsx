import React, { useCallback, useEffect, useState } from 'react';
import { Link, Navigate, useSearchParams } from 'react-router-dom';
import {
  Camera,
  CheckCircle2,
  Clock,
  Edit3,
  LogOut,
  Plus,
  Trash2,
  Upload,
  User,
  XCircle,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useSiteData } from '../context/SiteDataContext';
import {
  BRAND_IDENTITY,
  BranchId,
  ChildGender,
  ChildRegistrationDraft,
  PackageId,
  PaymentRecord,
  StudentRecord,
  formatJakartaDateTime,
  formatRupiah,
  getAcademicStatusLabel,
  getPackagePriceDisplayForBranch,
  getPackagePriceForBranch,
  getPackagePriceNoteForBranch,
  getPaymentStatusLabel,
  getStatusLabel,
  validateMultiChildSubmission,
} from '../lib/domain';
import { uploadImageToCloudinary } from '../lib/cloudinary';
import {
  fetchParentPayments,
  fetchParentProfile,
  fetchParentStudents,
  submitMultiChildRegistration,
  updatePendingChildByParent,
  upsertParentProfile,
} from '../lib/firestoreService';

function createEmptyChild(defaultPackage: PackageId = 'paket-1'): ChildRegistrationDraft {
  return {
    childName: '',
    childPhotoUrl: '',
    childGender: 'Laki-laki',
    gradeLevel: '',
    packageId: defaultPackage,
    branchId: 'indramayu-kota',
    notes: '',
  };
}

export function ParentDashboardPage() {
  const { user, loading: authLoading, logout } = useAuth();
  const { data: siteData, loading: siteLoading } = useSiteData();
  const [searchParams] = useSearchParams();
  const initialPaketParam = searchParams.get('paket');
  const defaultPackage: PackageId =
    initialPaketParam === 'paket-1' ||
    initialPaketParam === 'paket-2' ||
    initialPaketParam === 'paket-3'
      ? initialPaketParam
      : 'paket-1';

  const [students, setStudents] = useState<StudentRecord[]>([]);
  const [payments, setPayments] = useState<PaymentRecord[]>([]);
  const [dataLoading, setDataLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  // Parent Profile Form
  const [parentName, setParentName] = useState('');
  const [parentPhone, setParentPhone] = useState('');
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileMsg, setProfileMsg] = useState<string | null>(null);

  // Multi-child Registration Form
  const [childrenDrafts, setChildrenDrafts] = useState<ChildRegistrationDraft[]>([
    createEmptyChild(defaultPackage),
  ]);
  const [uploadingIndex, setUploadingIndex] = useState<number | null>(null);
  const [uploadErrors, setUploadErrors] = useState<Record<number, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [formErrors, setFormErrors] = useState<string[]>([]);
  const [submitBanner, setSubmitBanner] = useState<{
    type: 'success' | 'warning';
    text: string;
  } | null>(null);

  // Pending edit state
  const [editingStudent, setEditingStudent] = useState<StudentRecord | null>(null);
  const [editPhotoUploading, setEditPhotoUploading] = useState(false);
  const [editSaving, setEditSaving] = useState(false);

  const loadParentData = useCallback(async () => {
    if (!user) return;
    setDataLoading(true);
    setLoadError(null);
    try {
      const [profile, studentList, paymentList] = await Promise.all([
        fetchParentProfile(user.uid),
        fetchParentStudents(user.uid),
        fetchParentPayments(user.uid),
      ]);
      setParentName(
        (profile?.displayName as string) || user.displayName || user.email?.split('@')[0] || ''
      );
      setParentPhone((profile?.phone as string) || '');
      setStudents(studentList);
      setPayments(paymentList);
    } catch (err) {
      setLoadError(
        err instanceof Error ? err.message : 'Gagal memuat data dashboard orang tua.'
      );
    } finally {
      setDataLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (user && user.emailVerified) {
      loadParentData();
    }
  }, [user, loadParentData]);

  if (authLoading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center p-6 text-sm text-slate-600">
        Memeriksa sesi akun orang tua...
      </div>
    );
  }

  if (!user || !user.emailVerified) {
    return <Navigate to="/masuk?next=/dashboard" replace />;
  }

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setProfileMsg(null);
    if (parentName.trim().length < 2) {
      setProfileMsg('Nama orang tua minimal 2 karakter.');
      return;
    }
    setProfileSaving(true);
    try {
      await upsertParentProfile({
        uid: user.uid,
        displayName: parentName.trim(),
        email: user.email || '',
        phone: parentPhone.trim(),
        photoURL: user.photoURL || undefined,
      });
      setProfileMsg('Profil orang tua berhasil diperbarui.');
    } catch (err) {
      setProfileMsg(err instanceof Error ? err.message : 'Gagal menyimpan profil.');
    } finally {
      setProfileSaving(false);
    }
  };

  const updateChildRow = (
    index: number,
    patch: Partial<ChildRegistrationDraft>
  ) => {
    setChildrenDrafts((prev) =>
      prev.map((row, idx) => (idx === index ? { ...row, ...patch } : row))
    );
  };

  const handleChildPhotoUpload = async (index: number, file: File | undefined) => {
    if (!file) return;
    setUploadErrors((prev) => {
      const next = { ...prev };
      delete next[index];
      return next;
    });
    setUploadingIndex(index);
    try {
      const res = await uploadImageToCloudinary(file);
      updateChildRow(index, { childPhotoUrl: res.secureUrl });
    } catch (err) {
      setUploadErrors((prev) => ({
        ...prev,
        [index]: err instanceof Error ? err.message : 'Gagal mengunggah foto ke Cloudinary.',
      }));
    } finally {
      setUploadingIndex(null);
    }
  };

  const handleEditPhotoUpload = async (file: File | undefined) => {
    if (!file || !editingStudent) return;
    setEditPhotoUploading(true);
    try {
      const res = await uploadImageToCloudinary(file);
      setEditingStudent({ ...editingStudent, childPhotoUrl: res.secureUrl });
    } finally {
      setEditPhotoUploading(false);
    }
  };

  const handleAddChildRow = () => {
    if (childrenDrafts.length >= 10) return;
    setChildrenDrafts((prev) => [...prev, createEmptyChild(defaultPackage)]);
  };

  const handleRemoveChildRow = (index: number) => {
    if (childrenDrafts.length <= 1) return;
    setChildrenDrafts((prev) => prev.filter((_, idx) => idx !== index));
  };

  const handleSubmitRegistration = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormErrors([]);
    setSubmitBanner(null);

    const check = validateMultiChildSubmission({
      parentName,
      parentPhone,
      children: childrenDrafts,
    });

    if (!check.valid) {
      setFormErrors(check.errors);
      return;
    }

    setSubmitting(true);
    try {
      const idToken = await user.getIdToken();
      const result = await submitMultiChildRegistration({
        uid: user.uid,
        idToken,
        parentName,
        parentEmail: user.email || '',
        parentPhone,
        photoURL: user.photoURL || undefined,
        children: childrenDrafts,
        packages: siteData.packages,
        branches: siteData.branches,
      });

      const anySent = result.notificationResults.some((r) => r.status === 'sent');
      const anyUnconfigured = result.notificationResults.some(
        (r) => r.status === 'unconfigured'
      );

      setSubmitBanner({
        type: anySent ? 'success' : 'warning',
        text: anySent
          ? `Pendaftaran untuk ${result.createdIds.length} anak berhasil disimpan dengan status Menunggu Persetujuan, dan notifikasi WhatsApp telah dikirim ke admin (beserta jadwal jatuh tempo 1 bulan berikutnya).`
          : anyUnconfigured
          ? `Pendaftaran untuk ${result.createdIds.length} anak berhasil disimpan dengan status Menunggu Persetujuan. Catatan: Notifikasi WhatsApp otomatis menunggu konfigurasi FONNTE_TOKEN pada backend.`
          : `Pendaftaran untuk ${result.createdIds.length} anak berhasil disimpan dengan status Menunggu Persetujuan.`,
      });

      setChildrenDrafts([createEmptyChild(defaultPackage)]);
      await loadParentData();
    } catch (err) {
      setFormErrors([
        err instanceof Error ? err.message : 'Gagal mengirim formulir pendaftaran.',
      ]);
    } finally {
      setSubmitting(false);
    }
  };

  const handleSavePendingEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingStudent) return;
    const pkg =
      siteData.packages.find((p) => p.slug === editingStudent.packageId) ||
      siteData.packages[0];
    const branch =
      siteData.branches.find((b) => b.slug === editingStudent.branchId) ||
      siteData.branches[0];
    const configuredPrice = getPackagePriceForBranch(pkg, editingStudent.branchId);

    setEditSaving(true);
    try {
      await updatePendingChildByParent(editingStudent.id, {
        childName: editingStudent.childName,
        childPhotoUrl: editingStudent.childPhotoUrl,
        childGender: editingStudent.childGender || 'Laki-laki',
        gradeLevel: editingStudent.gradeLevel,
        packageId: editingStudent.packageId,
        packageName: `${pkg.title} (${pkg.programType})`,
        branchId: editingStudent.branchId,
        branchName: branch.name,
        billingAmount: configuredPrice,
        parentPhone: editingStudent.parentPhone,
        notes: editingStudent.notes,
      });
      setEditingStudent(null);
      await loadParentData();
    } finally {
      setEditSaving(false);
    }
  };

  const pendingCount = students.filter((s) => s.status === 'pending').length;
  const approvedCount = students.filter((s) => s.status === 'approved').length;

  return (
    <div className="py-8 sm:py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
        {/* Top Bar Summary */}
        <div className="ios-glass-strong rounded-3xl p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4 min-w-0">
            {user.photoURL ? (
              <img
                src={user.photoURL}
                alt={parentName || 'Foto Profil Orang Tua'}
                className="w-14 h-14 rounded-full object-cover border-2 border-white shadow-sm shrink-0"
                referrerPolicy="no-referrer"
              />
            ) : (
              <div className="w-14 h-14 rounded-full ios-glass-subtle flex items-center justify-center shrink-0">
                <User className="w-6 h-6 text-slate-500" />
              </div>
            )}
            <div className="min-w-0">
              <p className="text-xs font-semibold text-rose-700 uppercase tracking-wider">
                Dashboard Orang Tua
              </p>
              <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 truncate">
                {parentName || user.displayName || 'Orang Tua Siswa'}
              </h1>
              <p className="text-xs sm:text-sm text-slate-600 truncate">{user.email}</p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3 shrink-0">
            <Link
              to="/program"
              className="px-4 py-2.5 min-h-[44px] inline-flex items-center text-sm font-semibold text-slate-700 ios-glass-subtle hover:bg-white/90 rounded-xl transition-colors"
            >
              Lihat Paket
            </Link>
            <button
              type="button"
              onClick={() => logout()}
              className="inline-flex items-center gap-2 px-4 py-2.5 min-h-[44px] text-sm font-semibold text-slate-800 ios-glass hover:bg-white/95 rounded-xl transition-colors cursor-pointer"
            >
              <LogOut className="w-4 h-4" />
              <span>Keluar</span>
            </button>
          </div>
        </div>

        {/* Summary Numbers */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="ios-glass rounded-2xl p-5 text-center sm:text-left">
            <p className="text-xs font-medium text-slate-500">Total Anak Terdaftar</p>
            <p className="mt-1 text-2xl font-extrabold text-slate-900 tabular-nums">
              {students.length}
            </p>
          </div>
          <div className="ios-glass rounded-2xl p-5 text-center sm:text-left">
            <p className="text-xs font-medium text-slate-500">Menunggu Persetujuan</p>
            <p className="mt-1 text-2xl font-extrabold text-amber-700 tabular-nums">
              {pendingCount}
            </p>
          </div>
          <div className="ios-glass rounded-2xl p-5 text-center sm:text-left">
            <p className="text-xs font-medium text-slate-500">Disetujui</p>
            <p className="mt-1 text-2xl font-extrabold text-emerald-700 tabular-nums">
              {approvedCount}
            </p>
          </div>
        </div>

        {loadError && (
          <div role="alert" className="p-4 rounded-2xl bg-rose-50/90 border border-rose-200 text-sm text-rose-800">
            {loadError}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Left Column: Multi-Child Registration Form */}
          <div className="lg:col-span-7 space-y-6">
            <section className="ios-glass-strong rounded-3xl p-6 sm:p-8 space-y-6">
              <div className="text-center sm:text-left">
                <h2 className="text-xl font-extrabold text-slate-900">
                  Formulir Pendaftaran Siswa
                </h2>
                <p className="text-sm text-slate-600 mt-1">
                  Pilih paket belajar dan cabang untuk melihat tarif real-time resmi yang diatur admin. Foto anak (ukuran bebas) wajib diunggah.
                </p>
              </div>

              {submitBanner && (
                <div
                  role="status"
                  className={`p-4 rounded-2xl border text-sm leading-relaxed ${
                    submitBanner.type === 'success'
                      ? 'bg-emerald-50/90 border-emerald-200 text-emerald-900'
                      : 'bg-amber-50/90 border-amber-200 text-amber-900'
                  }`}
                >
                  {submitBanner.text}
                </div>
              )}

              {formErrors.length > 0 && (
                <div
                  role="alert"
                  className="p-4 rounded-2xl bg-rose-50/90 border border-rose-200 text-sm text-rose-800 space-y-1"
                >
                  {formErrors.map((err, i) => (
                    <p key={i}>• {err}</p>
                  ))}
                </div>
              )}

              <form onSubmit={handleSubmitRegistration} className="space-y-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pb-6 border-b border-slate-200/70">
                  <div>
                    <label htmlFor="reg-parent-name" className="block text-xs font-semibold text-slate-700 mb-1.5">
                      Nama Orang Tua / Wali *
                    </label>
                    <input
                      id="reg-parent-name"
                      type="text"
                      required
                      value={parentName}
                      onChange={(e) => setParentName(e.target.value)}
                      placeholder="Nama lengkap orang tua"
                      className="w-full px-3.5 py-2.5 min-h-[44px] text-sm bg-white/85 border border-slate-300/80 rounded-xl focus:outline-none focus:border-slate-900"
                    />
                  </div>
                  <div>
                    <label htmlFor="reg-parent-phone" className="block text-xs font-semibold text-slate-700 mb-1.5">
                      Nomor WhatsApp / Telepon Aktif *
                    </label>
                    <input
                      id="reg-parent-phone"
                      type="tel"
                      required
                      value={parentPhone}
                      onChange={(e) => setParentPhone(e.target.value)}
                      placeholder="Contoh: 082119770700"
                      className="w-full px-3.5 py-2.5 min-h-[44px] text-sm bg-white/85 border border-slate-300/80 rounded-xl focus:outline-none focus:border-slate-900"
                    />
                  </div>
                </div>

                <div className="space-y-5">
                  {childrenDrafts.map((child, idx) => {
                    const selectedPkg = siteData.packages.find((p) => p.slug === child.packageId);
                    const selectedBranch = siteData.branches.find((b) => b.slug === child.branchId);
                    const livePriceDisplay = getPackagePriceDisplayForBranch(
                      selectedPkg,
                      child.branchId
                    );
                    const livePriceNote = getPackagePriceNoteForBranch(selectedPkg, child.branchId);

                    return (
                      <div
                        key={idx}
                        className="p-5 ios-glass-subtle rounded-2xl space-y-4"
                      >
                        <div className="flex items-center justify-between gap-3">
                          <h3 className="text-sm font-bold text-slate-900">
                            Data Anak ke-{idx + 1}
                          </h3>
                          {childrenDrafts.length > 1 && (
                            <button
                              type="button"
                              onClick={() => handleRemoveChildRow(idx)}
                              aria-label={`Hapus data anak ke-${idx + 1}`}
                              className="inline-flex items-center gap-1 text-xs font-semibold text-rose-700 hover:text-rose-800 cursor-pointer"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                              <span>Hapus</span>
                            </button>
                          )}
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                          <div>
                            <label
                              htmlFor={`child-name-${idx}`}
                              className="block text-xs font-semibold text-slate-700 mb-1.5"
                            >
                              Nama Lengkap Anak *
                            </label>
                            <input
                              id={`child-name-${idx}`}
                              type="text"
                              required
                              value={child.childName}
                              onChange={(e) =>
                                updateChildRow(idx, { childName: e.target.value })
                              }
                              placeholder="Nama lengkap siswa"
                              className="w-full px-3.5 py-2.5 min-h-[44px] text-sm bg-white/85 border border-slate-300/80 rounded-xl focus:outline-none focus:border-slate-900"
                            />
                          </div>

                          <div>
                            <label
                              htmlFor={`child-gender-${idx}`}
                              className="block text-xs font-semibold text-slate-700 mb-1.5"
                            >
                              Jenis Kelamin *
                            </label>
                            <select
                              id={`child-gender-${idx}`}
                              value={child.childGender}
                              onChange={(e) =>
                                updateChildRow(idx, {
                                  childGender: e.target.value as ChildGender,
                                })
                              }
                              className="w-full px-3.5 py-2.5 min-h-[44px] text-sm bg-white/85 border border-slate-300/80 rounded-xl focus:outline-none focus:border-slate-900"
                            >
                              <option value="Laki-laki">Laki-laki</option>
                              <option value="Perempuan">Perempuan</option>
                            </select>
                          </div>

                          <div>
                            <label
                              htmlFor={`child-grade-${idx}`}
                              className="block text-xs font-semibold text-slate-700 mb-1.5"
                            >
                              Kelas / Tingkat *
                            </label>
                            <input
                              id={`child-grade-${idx}`}
                              type="text"
                              required
                              value={child.gradeLevel}
                              onChange={(e) =>
                                updateChildRow(idx, { gradeLevel: e.target.value })
                              }
                              placeholder="Contoh: TK B / Kelas 3 SD"
                              className="w-full px-3.5 py-2.5 min-h-[44px] text-sm bg-white/85 border border-slate-300/80 rounded-xl focus:outline-none focus:border-slate-900"
                            />
                          </div>
                        </div>

                        {/* Foto Anak (Ukuran Bebas) via Cloudinary */}
                        <div className="p-4 rounded-2xl bg-white/75 border border-slate-200/80 space-y-3">
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <div>
                              <p className="text-xs font-semibold text-slate-800">
                                Foto Anak (Ukuran Bebas) *
                              </p>
                              <p className="text-[11px] text-slate-500">
                                Format JPG, PNG, atau WebP (maks. 5 MB), diunggah otomatis ke Cloudinary.
                              </p>
                            </div>
                            <label className="inline-flex items-center gap-2 px-4 py-2 min-h-[40px] text-xs font-semibold text-white bg-slate-900 hover:bg-rose-700 rounded-xl cursor-pointer transition-colors">
                              <Upload className="w-3.5 h-3.5" />
                              <span>
                                {uploadingIndex === idx
                                  ? 'Mengunggah...'
                                  : child.childPhotoUrl
                                  ? 'Ganti Foto Anak'
                                  : 'Unggah Foto Anak'}
                              </span>
                              <input
                                id={`child-photo-${idx}`}
                                type="file"
                                accept="image/jpeg,image/png,image/webp"
                                className="hidden"
                                disabled={uploadingIndex === idx}
                                onChange={(e) => {
                                  handleChildPhotoUpload(idx, e.target.files?.[0]);
                                  e.target.value = '';
                                }}
                              />
                            </label>
                          </div>

                          {uploadErrors[idx] && (
                            <p role="alert" className="text-xs font-medium text-rose-700">
                              {uploadErrors[idx]}
                            </p>
                          )}

                          {child.childPhotoUrl ? (
                            <div className="rounded-xl bg-slate-100/70 p-2 text-center space-y-1.5">
                              <img
                                src={child.childPhotoUrl}
                                alt={`Pratinjau foto ${child.childName || `anak ke-${idx + 1}`}`}
                                className="max-h-52 w-auto mx-auto object-contain rounded-lg shadow-xs"
                                referrerPolicy="no-referrer"
                              />
                              <p className="text-[11px] font-medium text-emerald-700">
                                Foto anak berhasil diunggah ke Cloudinary
                              </p>
                            </div>
                          ) : (
                            <div className="py-4 text-center border border-dashed border-slate-300 rounded-xl text-xs text-slate-500 flex flex-col items-center gap-1.5">
                              <Camera className="w-5 h-5 text-slate-400" />
                              <span>Belum ada foto anak diunggah</span>
                            </div>
                          )}
                        </div>

                        {/* Pilihan Cabang & Paket dengan Harga Real-Time */}
                        <div className="space-y-3">
                          <div>
                            <label
                              htmlFor={`child-branch-${idx}`}
                              className="block text-xs font-semibold text-slate-700 mb-1.5"
                            >
                              Pilih Cabang (Pusat &amp; Cabang memiliki tarif masing-masing) *
                            </label>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                              {siteData.branches.map((branch) => {
                                const active = child.branchId === branch.slug;
                                return (
                                  <button
                                    key={branch.id}
                                    type="button"
                                    onClick={() =>
                                      updateChildRow(idx, { branchId: branch.slug as BranchId })
                                    }
                                    className={`text-left p-3 rounded-xl border transition-all cursor-pointer ${
                                      active
                                        ? 'bg-slate-900 text-white border-slate-900 shadow-sm'
                                        : 'bg-white/85 text-slate-800 border-slate-300/80 hover:bg-white'
                                    }`}
                                  >
                                    <p className={`text-[11px] font-bold uppercase ${active ? 'text-rose-300' : 'text-rose-700'}`}>
                                      {branch.roleLabel}
                                    </p>
                                    <p className="text-xs font-bold mt-0.5 leading-snug">
                                      {branch.name}
                                    </p>
                                  </button>
                                );
                              })}
                            </div>
                          </div>

                          <div>
                            <label
                              htmlFor={`child-package-${idx}`}
                              className="block text-xs font-semibold text-slate-700 mb-1.5"
                            >
                              Pilih Paket Belajar Resmi *
                            </label>
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                              {siteData.packages.map((pkg) => {
                                const active = child.packageId === pkg.slug;
                                const branchPriceDisplay = getPackagePriceDisplayForBranch(
                                  pkg,
                                  child.branchId
                                );
                                return (
                                  <button
                                    key={pkg.id}
                                    type="button"
                                    onClick={() =>
                                      updateChildRow(idx, { packageId: pkg.slug as PackageId })
                                    }
                                    className={`text-left p-3 rounded-xl border transition-all cursor-pointer flex flex-col justify-between gap-2 ${
                                      active
                                        ? 'bg-rose-700 text-white border-rose-700 shadow-sm'
                                        : 'bg-white/85 text-slate-900 border-slate-300/80 hover:bg-white'
                                    }`}
                                  >
                                    <div>
                                      <p className="text-xs font-extrabold leading-snug">{pkg.title}</p>
                                      <p className={`text-[11px] mt-0.5 ${active ? 'text-rose-100' : 'text-slate-600'}`}>
                                        {pkg.programType}
                                      </p>
                                    </div>
                                    <p
                                      className={`text-xs font-mono font-bold pt-1.5 border-t ${
                                        active
                                          ? 'border-white/25 text-white'
                                          : 'border-slate-200 text-slate-900'
                                      }`}
                                    >
                                      {branchPriceDisplay
                                        ? branchPriceDisplay
                                        : siteLoading
                                        ? 'Memuat tarif...'
                                        : 'Harga belum diatur'}
                                    </p>
                                  </button>
                                );
                              })}
                            </div>
                          </div>

                          {/* Kotak Informasi Harga Real-Time */}
                          <div className="p-4 rounded-2xl bg-white/90 border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                            <div>
                              <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                                Harga Paket Real-Time ({selectedBranch?.roleLabel || child.branchId})
                              </p>
                              <p className="text-xs font-semibold text-slate-800 mt-0.5">
                                {selectedPkg?.title} — {selectedBranch?.name}
                              </p>
                              {livePriceNote && (
                                <p className="text-[11px] text-slate-600 mt-0.5">{livePriceNote}</p>
                              )}
                            </div>
                            <div className="sm:text-right">
                              {livePriceDisplay ? (
                                <p className="text-lg font-extrabold font-mono text-emerald-700 tabular-nums">
                                  {livePriceDisplay}
                                </p>
                              ) : siteLoading ? (
                                <p className="text-xs font-medium text-slate-500">
                                  Memuat tarif resmi...
                                </p>
                              ) : (
                                <p className="text-xs font-semibold text-amber-800 bg-amber-50 border border-amber-200 rounded-lg px-2.5 py-1">
                                  Harga belum diatur oleh admin
                                </p>
                              )}
                            </div>
                          </div>
                        </div>

                      <div>
                        <label
                          htmlFor={`child-notes-${idx}`}
                          className="block text-xs font-semibold text-slate-700 mb-1.5"
                        >
                          Catatan Tambahan (Opsional)
                        </label>
                        <input
                          id={`child-notes-${idx}`}
                          type="text"
                          value={child.notes || ''}
                          onChange={(e) => updateChildRow(idx, { notes: e.target.value })}
                          placeholder="Preferensi waktu atau catatan belajar khusus"
                          className="w-full px-3.5 py-2.5 min-h-[44px] text-sm bg-white/85 border border-slate-300/80 rounded-xl focus:outline-none focus:border-slate-900"
                        />
                      </div>
                    </div>
                    );
                  })}
                </div>

                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2">
                  <button
                    type="button"
                    onClick={handleAddChildRow}
                    disabled={childrenDrafts.length >= 10}
                    className="inline-flex items-center justify-center gap-2 px-4 py-2.5 min-h-[44px] text-sm font-semibold text-slate-800 ios-glass hover:bg-white/95 rounded-xl transition-colors cursor-pointer disabled:opacity-50"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Tambah Anak Lainnya</span>
                  </button>

                  <button
                    type="submit"
                    disabled={submitting || uploadingIndex !== null}
                    className="inline-flex items-center justify-center px-6 py-3 min-h-[48px] text-sm font-bold text-white bg-rose-700 hover:bg-rose-800 rounded-2xl shadow-md transition-colors cursor-pointer disabled:opacity-60"
                  >
                    {submitting
                      ? 'Mengirim Pendaftaran...'
                      : `Kirim Pendaftaran (${childrenDrafts.length} Anak)`}
                  </button>
                </div>
              </form>
            </section>
          </div>

          {/* Right Column: Registered Children Statuses & Parent Profile */}
          <div className="lg:col-span-5 space-y-6">
            <section className="ios-glass-strong rounded-3xl p-6 space-y-4">
              <h2 className="text-lg font-extrabold text-slate-900 text-center sm:text-left">
                Daftar Anak &amp; Status Persetujuan
              </h2>

              {dataLoading ? (
                <div className="space-y-3">
                  {[1, 2].map((i) => (
                    <div key={i} className="h-24 ios-glass-subtle animate-pulse rounded-2xl" />
                  ))}
                </div>
              ) : students.length === 0 ? (
                <div className="p-6 ios-glass-subtle rounded-2xl text-center space-y-2">
                  <p className="text-sm font-semibold text-slate-800">
                    Belum Ada Anak Terdaftar
                  </p>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    Gunakan formulir di samping untuk mendaftarkan anak pertama Anda di {BRAND_IDENTITY.shortName}.
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {students.map((student) => (
                    <article
                      key={student.id}
                      className="p-4 ios-glass-subtle rounded-2xl space-y-3"
                    >
                      <div className="flex items-start gap-3 justify-between">
                        <div className="flex items-start gap-3 min-w-0">
                          {student.childPhotoUrl ? (
                            <img
                              src={student.childPhotoUrl}
                              alt={`Foto ${student.childName}`}
                              className="w-14 h-14 rounded-xl object-cover border border-white shadow-xs shrink-0"
                              referrerPolicy="no-referrer"
                            />
                          ) : (
                            <div className="w-14 h-14 rounded-xl bg-white/70 border border-slate-200 flex items-center justify-center shrink-0">
                              <User className="w-6 h-6 text-slate-400" />
                            </div>
                          )}
                          <div className="min-w-0">
                            <h3 className="text-base font-bold text-slate-900 truncate">
                              {student.childName}
                            </h3>
                            <p className="text-xs text-slate-600">{student.gradeLevel}</p>
                          </div>
                        </div>

                        <span
                          className={`inline-flex items-center gap-1 text-xs font-semibold shrink-0 ${
                            student.status === 'approved'
                              ? 'text-emerald-700'
                              : student.status === 'rejected'
                              ? 'text-rose-700'
                              : 'text-amber-700'
                          }`}
                        >
                          {student.status === 'approved' ? (
                            <CheckCircle2 className="w-4 h-4" />
                          ) : student.status === 'rejected' ? (
                            <XCircle className="w-4 h-4" />
                          ) : (
                            <Clock className="w-4 h-4" />
                          )}
                          <span>{getStatusLabel(student.status)}</span>
                        </span>
                      </div>

                      <div className="text-xs text-slate-700 space-y-1 pt-2 border-t border-slate-200/70">
                        {student.childGender && (
                          <p>
                            <span className="font-semibold">Jenis Kelamin:</span>{' '}
                            {student.childGender}
                          </p>
                        )}
                        <p>
                          <span className="font-semibold">Paket:</span> {student.packageName}
                        </p>
                        <p>
                          <span className="font-semibold">Cabang:</span> {student.branchName}
                        </p>
                        {typeof student.billingAmount === 'number' && (
                          <p>
                            <span className="font-semibold">Tarif Paket:</span>{' '}
                            <span className="font-mono font-bold text-emerald-700">
                              {formatRupiah(student.billingAmount)}
                            </span>
                            {student.initialPaymentStatus
                              ? ` (${getPaymentStatusLabel(student.initialPaymentStatus)})`
                              : ''}
                          </p>
                        )}
                        {student.nextDueAtIso && (
                          <p>
                            <span className="font-semibold">Jadwal Jatuh Tempo:</span>{' '}
                            {formatJakartaDateTime(student.nextDueAtIso)}
                          </p>
                        )}
                        <p>
                          <span className="font-semibold">Status Belajar:</span>{' '}
                          {getAcademicStatusLabel(student.academicStatus)}
                        </p>
                        {student.adminNotes && (
                          <p className="text-slate-800 bg-white/80 border border-slate-200 rounded-xl p-2 mt-1.5">
                            <span className="font-semibold">Catatan Admin:</span>{' '}
                            {student.adminNotes}
                          </p>
                        )}
                      </div>

                      {student.status === 'pending' && (
                        <div className="pt-1">
                          <button
                            type="button"
                            onClick={() => setEditingStudent(student)}
                            className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-800 hover:text-rose-700 cursor-pointer"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                            <span>Ubah Data (Selama Menunggu)</span>
                          </button>
                        </div>
                      )}
                    </article>
                  ))}
                </div>
              )}
            </section>

            {/* Profile Settings */}
            <section className="ios-glass-strong rounded-3xl p-6 space-y-4">
              <h2 className="text-lg font-extrabold text-slate-900 text-center sm:text-left">
                Pengaturan Profil Orang Tua
              </h2>
              <form onSubmit={handleSaveProfile} className="space-y-3">
                <div>
                  <label htmlFor="profile-name" className="block text-xs font-semibold text-slate-700 mb-1">
                    Nama Orang Tua
                  </label>
                  <input
                    id="profile-name"
                    type="text"
                    value={parentName}
                    onChange={(e) => setParentName(e.target.value)}
                    className="w-full px-3.5 py-2.5 min-h-[44px] text-sm bg-white/85 border border-slate-300/80 rounded-xl"
                  />
                </div>
                <div>
                  <label htmlFor="profile-phone" className="block text-xs font-semibold text-slate-700 mb-1">
                    Nomor WhatsApp
                  </label>
                  <input
                    id="profile-phone"
                    type="tel"
                    value={parentPhone}
                    onChange={(e) => setParentPhone(e.target.value)}
                    className="w-full px-3.5 py-2.5 min-h-[44px] text-sm bg-white/85 border border-slate-300/80 rounded-xl"
                  />
                </div>
                {profileMsg && (
                  <p className="text-xs font-medium text-emerald-700">{profileMsg}</p>
                )}
                <button
                  type="submit"
                  disabled={profileSaving}
                  className="w-full px-4 py-2.5 min-h-[44px] text-sm font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
                >
                  {profileSaving ? 'Menyimpan...' : 'Simpan Profil'}
                </button>
              </form>
            </section>

            {/* Payments History if recorded by admin */}
            {payments.length > 0 && (
              <section className="ios-glass-strong rounded-3xl p-6 space-y-3">
                <h2 className="text-lg font-extrabold text-slate-900">Catatan Pembayaran</h2>
                <div className="space-y-2.5">
                  {payments.map((pay) => (
                    <div
                      key={pay.id}
                      className="p-3.5 rounded-2xl ios-glass-subtle text-xs space-y-1"
                    >
                      <div className="flex justify-between font-bold text-slate-900">
                        <span>{pay.childName}</span>
                        <span className="font-mono tabular-nums">
                          Rp {pay.amount.toLocaleString('id-ID')}
                        </span>
                      </div>
                      <p className="text-slate-600">
                        {pay.periodLabel} · {pay.method} · Status:{' '}
                        <span className="font-semibold uppercase">{pay.status}</span>
                      </p>
                    </div>
                  ))}
                </div>
              </section>
            )}
          </div>
        </div>
      </div>

      {/* Modal Edit Pending Child */}
      {editingStudent && (
        <div
          className="fixed inset-0 z-50 bg-slate-900/45 backdrop-blur-xs flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
          aria-label="Edit Data Anak"
        >
          <div className="ios-glass-strong rounded-3xl max-w-md w-full p-6 space-y-4 max-h-[90vh] overflow-y-auto">
            <h2 className="text-lg font-bold text-slate-900">Ubah Data Pendaftaran</h2>
            <form onSubmit={handleSavePendingEdit} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Nama Anak
                </label>
                <input
                  type="text"
                  required
                  value={editingStudent.childName}
                  onChange={(e) =>
                    setEditingStudent({ ...editingStudent, childName: e.target.value })
                  }
                  className="w-full px-3.5 py-2 min-h-[44px] text-sm bg-white border border-slate-300 rounded-xl"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Foto Anak (Ukuran Bebas)
                </label>
                <div className="p-3 bg-white/80 border border-slate-200 rounded-xl space-y-2 text-center">
                  {editingStudent.childPhotoUrl && (
                    <img
                      src={editingStudent.childPhotoUrl}
                      alt={editingStudent.childName}
                      className="max-h-40 w-auto mx-auto object-contain rounded-lg"
                      referrerPolicy="no-referrer"
                    />
                  )}
                  <label className="inline-flex items-center gap-2 px-3 py-2 text-xs font-semibold bg-slate-900 text-white rounded-lg cursor-pointer">
                    <Upload className="w-3.5 h-3.5" />
                    <span>{editPhotoUploading ? 'Mengunggah...' : 'Ganti Foto Anak'}</span>
                    <input
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      className="hidden"
                      onChange={(e) => handleEditPhotoUpload(e.target.files?.[0])}
                    />
                  </label>
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Jenis Kelamin
                  </label>
                  <select
                    value={editingStudent.childGender || 'Laki-laki'}
                    onChange={(e) =>
                      setEditingStudent({
                        ...editingStudent,
                        childGender: e.target.value as ChildGender,
                      })
                    }
                    className="w-full px-3.5 py-2 min-h-[44px] text-sm bg-white border border-slate-300 rounded-xl"
                  >
                    <option value="Laki-laki">Laki-laki</option>
                    <option value="Perempuan">Perempuan</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Kelas / Tingkat
                  </label>
                  <input
                    type="text"
                    required
                    value={editingStudent.gradeLevel}
                    onChange={(e) =>
                      setEditingStudent({ ...editingStudent, gradeLevel: e.target.value })
                    }
                    className="w-full px-3.5 py-2 min-h-[44px] text-sm bg-white border border-slate-300 rounded-xl"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Paket Belajar
                </label>
                <select
                  value={editingStudent.packageId}
                  onChange={(e) =>
                    setEditingStudent({
                      ...editingStudent,
                      packageId: e.target.value as PackageId,
                    })
                  }
                  className="w-full px-3.5 py-2 min-h-[44px] text-sm bg-white border border-slate-300 rounded-xl"
                >
                  {siteData.packages.map((pkg) => (
                    <option key={pkg.id} value={pkg.slug}>
                      {pkg.title}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Cabang
                </label>
                <select
                  value={editingStudent.branchId}
                  onChange={(e) =>
                    setEditingStudent({
                      ...editingStudent,
                      branchId: e.target.value as BranchId,
                    })
                  }
                  className="w-full px-3.5 py-2 min-h-[44px] text-sm bg-white border border-slate-300 rounded-xl"
                >
                  {siteData.branches.map((b) => (
                    <option key={b.id} value={b.slug}>
                      {b.name}
                    </option>
                  ))}
                </select>
              </div>
              {(() => {
                const editPkg = siteData.packages.find((p) => p.slug === editingStudent.packageId);
                const liveEditPriceDisplay = getPackagePriceDisplayForBranch(
                  editPkg,
                  editingStudent.branchId
                );
                return (
                  <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs flex items-center justify-between gap-2">
                    <span className="font-semibold text-slate-600">Tarif Real-Time:</span>
                    <span className="font-mono font-bold text-slate-900">
                      {liveEditPriceDisplay || 'Belum diatur oleh admin'}
                    </span>
                  </div>
                );
              })()}
              <div className="flex justify-end gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setEditingStudent(null)}
                  className="px-4 py-2 text-sm font-semibold text-slate-700 bg-slate-100 rounded-xl cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={editSaving || editPhotoUploading}
                  className="px-4 py-2 text-sm font-semibold text-white bg-slate-900 rounded-xl cursor-pointer"
                >
                  {editSaving ? 'Menyimpan...' : 'Simpan Perubahan'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
