import React, { useEffect, useState } from 'react';
import { Edit3, Plus, Save, Trash2, Upload } from 'lucide-react';
import {
  AnnouncementItem,
  BranchLocation,
  GalleryItem,
  LearningPackage,
  ScheduleItem,
  SiteContentSection,
  TeacherProfile,
  getPackagePriceDisplayForBranch,
  getPackagePriceForBranch,
  parseRupiahAmount,
} from '../lib/domain';
import { uploadImageToCloudinary } from '../lib/cloudinary';
import {
  adminCreateAnnouncement,
  adminCreateGalleryItem,
  adminCreateSchedule,
  adminDeleteDoc,
  adminSaveBranch,
  adminSavePackage,
  adminSaveSiteContent,
  adminSaveTeacher,
  adminUpdateAnnouncement,
  adminUpdateGalleryItem,
  adminUpdateSchedule,
} from '../lib/firestoreService';

export function AdminCmsPanel({
  packages,
  branches,
  teachers,
  about,
  founder,
  contact,
  gallery,
  announcements,
  schedules,
  onSaved,
}: {
  packages: LearningPackage[];
  branches: BranchLocation[];
  teachers: TeacherProfile[];
  about: SiteContentSection;
  founder: SiteContentSection;
  contact: SiteContentSection;
  gallery: GalleryItem[];
  announcements: AnnouncementItem[];
  schedules: ScheduleItem[];
  onSaved: () => Promise<void>;
}) {
  const [subTab, setSubTab] = useState<
    'packages' | 'about' | 'teachers' | 'branches' | 'gallery' | 'announcements' | 'schedules' | 'contact'
  >('packages');
  const [statusMsg, setStatusMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  // Editable states synced cleanly with props
  const [pkgList, setPkgList] = useState<LearningPackage[]>(packages);
  const [branchList, setBranchList] = useState<BranchLocation[]>(branches);
  const [teacherList, setTeacherList] = useState<TeacherProfile[]>(teachers);
  const [aboutForm, setAboutForm] = useState<SiteContentSection>(about);
  const [founderForm, setFounderForm] = useState<SiteContentSection>(founder);
  const [contactForm, setContactForm] = useState<SiteContentSection>(contact);

  useEffect(() => setPkgList(packages), [packages]);
  useEffect(() => setBranchList(branches), [branches]);
  useEffect(() => setTeacherList(teachers), [teachers]);
  useEffect(() => setAboutForm(about), [about]);
  useEffect(() => setFounderForm(founder), [founder]);
  useEffect(() => setContactForm(contact), [contact]);

  // New Teacher
  const [newTeacherName, setNewTeacherName] = useState('');
  const [newTeacherDesc, setNewTeacherDesc] = useState('');
  const [newTeacherPhoto, setNewTeacherPhoto] = useState('');

  // New Gallery & inline edit
  const [newGalleryTitle, setNewGalleryTitle] = useState('');
  const [newGalleryCaption, setNewGalleryCaption] = useState('');
  const [newGalleryCategory, setNewGalleryCategory] = useState('');
  const [newGalleryImageUrl, setNewGalleryImageUrl] = useState('');
  const [editingGallery, setEditingGallery] = useState<GalleryItem | null>(null);

  // New Announcement & inline edit
  const [newAnnTitle, setNewAnnTitle] = useState('');
  const [newAnnContent, setNewAnnContent] = useState('');
  const [newAnnDate, setNewAnnDate] = useState('');
  const [newAnnImageUrl, setNewAnnImageUrl] = useState('');
  const [editingAnn, setEditingAnn] = useState<AnnouncementItem | null>(null);

  // New Schedule & inline edit
  const [newSchTitle, setNewSchTitle] = useState('');
  const [newSchDayTime, setNewSchDayTime] = useState('');
  const [newSchPkg, setNewSchPkg] = useState('paket-1');
  const [newSchBranch, setNewSchBranch] = useState('indramayu-kota');
  const [newSchNotes, setNewSchNotes] = useState('');
  const [editingSch, setEditingSch] = useState<ScheduleItem | null>(null);

  const handleCloudinaryUpload = async (
    file: File | undefined,
    onUrl: (url: string) => void
  ) => {
    if (!file) return;
    setBusy(true);
    setStatusMsg('Mengunggah gambar ke Cloudinary (preset tomoyo)...');
    try {
      const res = await uploadImageToCloudinary(file);
      onUrl(res.secureUrl);
      setStatusMsg('Gambar berhasil diunggah ke Cloudinary.');
    } catch (err) {
      setStatusMsg(err instanceof Error ? err.message : 'Gagal upload ke Cloudinary.');
    } finally {
      setBusy(false);
    }
  };

  const handleSavePackages = async () => {
    setBusy(true);
    setStatusMsg(null);
    try {
      for (const pkg of pkgList) {
        await adminSavePackage(pkg);
      }
      await onSaved();
      setStatusMsg('Paket pembelajaran dan harga berhasil disimpan ke Firestore.');
    } catch (err) {
      setStatusMsg(err instanceof Error ? err.message : 'Gagal menyimpan paket.');
    } finally {
      setBusy(false);
    }
  };

  const handleSaveTeachers = async () => {
    setBusy(true);
    setStatusMsg(null);
    try {
      for (const teacher of teacherList) {
        await adminSaveTeacher(teacher);
      }
      await onSaved();
      setStatusMsg('Data guru berhasil disimpan ke Firestore.');
    } catch (err) {
      setStatusMsg(err instanceof Error ? err.message : 'Gagal menyimpan guru.');
    } finally {
      setBusy(false);
    }
  };

  const handleAddTeacher = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTeacherName.trim()) return;
    setBusy(true);
    setStatusMsg(null);
    try {
      const nextOrder =
        teacherList.reduce((max, t) => Math.max(max, t.order || 0), 0) + 1;
      const id = `guru-${Date.now()}`;
      await adminSaveTeacher({
        id,
        order: nextOrder,
        name: newTeacherName.trim(),
        description: newTeacherDesc.trim() || undefined,
        photoUrl: newTeacherPhoto.trim() || undefined,
        isPublished: true,
      });
      setNewTeacherName('');
      setNewTeacherDesc('');
      setNewTeacherPhoto('');
      await onSaved();
      setStatusMsg('Guru baru berhasil ditambahkan.');
    } catch (err) {
      setStatusMsg(err instanceof Error ? err.message : 'Gagal menambah guru.');
    } finally {
      setBusy(false);
    }
  };

  const handleSaveBranches = async () => {
    setBusy(true);
    setStatusMsg(null);
    try {
      for (const branch of branchList) {
        await adminSaveBranch(branch);
      }
      await onSaved();
      setStatusMsg('Data cabang, koordinat peta, dan tautan Google Maps berhasil disimpan.');
    } catch (err) {
      setStatusMsg(err instanceof Error ? err.message : 'Gagal menyimpan cabang.');
    } finally {
      setBusy(false);
    }
  };

  const handleSaveAboutFounder = async () => {
    setBusy(true);
    setStatusMsg(null);
    try {
      await adminSaveSiteContent('about', aboutForm);
      await adminSaveSiteContent('founder', founderForm);
      await onSaved();
      setStatusMsg('Konten Tentang, Visi/Misi, dan Profil Founder berhasil disimpan.');
    } catch (err) {
      setStatusMsg(err instanceof Error ? err.message : 'Gagal menyimpan konten.');
    } finally {
      setBusy(false);
    }
  };

  const handleSaveContact = async () => {
    setBusy(true);
    setStatusMsg(null);
    try {
      await adminSaveSiteContent('contact', contactForm);
      await onSaved();
      setStatusMsg('Informasi kontak dan media sosial berhasil disimpan.');
    } catch (err) {
      setStatusMsg(err instanceof Error ? err.message : 'Gagal menyimpan kontak.');
    } finally {
      setBusy(false);
    }
  };

  const handleAddGallery = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newGalleryTitle.trim() || !newGalleryImageUrl.trim()) {
      setStatusMsg('Judul dan gambar galeri wajib diisi.');
      return;
    }
    setBusy(true);
    try {
      await adminCreateGalleryItem({
        title: newGalleryTitle,
        caption: newGalleryCaption,
        category: newGalleryCategory,
        imageUrl: newGalleryImageUrl,
        isPublished: true,
      });
      setNewGalleryTitle('');
      setNewGalleryCaption('');
      setNewGalleryCategory('');
      setNewGalleryImageUrl('');
      await onSaved();
      setStatusMsg('Foto galeri berhasil ditambahkan.');
    } finally {
      setBusy(false);
    }
  };

  const handleSaveEditGallery = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingGallery) return;
    setBusy(true);
    try {
      await adminUpdateGalleryItem(editingGallery.id, {
        title: editingGallery.title,
        caption: editingGallery.caption || '',
        category: editingGallery.category || '',
        imageUrl: editingGallery.imageUrl,
      });
      setEditingGallery(null);
      await onSaved();
      setStatusMsg('Foto galeri berhasil diperbarui.');
    } finally {
      setBusy(false);
    }
  };

  const handleAddAnnouncement = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAnnTitle.trim() || !newAnnContent.trim()) return;
    setBusy(true);
    try {
      await adminCreateAnnouncement({
        title: newAnnTitle,
        content: newAnnContent,
        dateLabel: newAnnDate,
        imageUrl: newAnnImageUrl,
        isPublished: true,
      });
      setNewAnnTitle('');
      setNewAnnContent('');
      setNewAnnDate('');
      setNewAnnImageUrl('');
      await onSaved();
      setStatusMsg('Pengumuman berhasil diterbitkan.');
    } finally {
      setBusy(false);
    }
  };

  const handleSaveEditAnnouncement = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingAnn) return;
    setBusy(true);
    try {
      await adminUpdateAnnouncement(editingAnn.id, {
        title: editingAnn.title,
        content: editingAnn.content,
        dateLabel: editingAnn.dateLabel || '',
        imageUrl: editingAnn.imageUrl || '',
      });
      setEditingAnn(null);
      await onSaved();
      setStatusMsg('Pengumuman berhasil diperbarui.');
    } finally {
      setBusy(false);
    }
  };

  const handleAddSchedule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSchTitle.trim() || !newSchDayTime.trim()) return;
    setBusy(true);
    try {
      await adminCreateSchedule({
        title: newSchTitle,
        dayTime: newSchDayTime,
        packageId: newSchPkg,
        branchId: newSchBranch,
        notes: newSchNotes,
        isPublished: true,
      });
      setNewSchTitle('');
      setNewSchDayTime('');
      setNewSchNotes('');
      await onSaved();
      setStatusMsg('Jadwal belajar berhasil ditambahkan.');
    } finally {
      setBusy(false);
    }
  };

  const handleSaveEditSchedule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingSch) return;
    setBusy(true);
    try {
      await adminUpdateSchedule(editingSch.id, {
        title: editingSch.title,
        dayTime: editingSch.dayTime,
        packageId: editingSch.packageId || '',
        branchId: editingSch.branchId || '',
        notes: editingSch.notes || '',
      });
      setEditingSch(null);
      await onSaved();
      setStatusMsg('Jadwal belajar berhasil diperbarui.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Sub-navigation */}
      <div className="flex flex-wrap gap-2 p-2 ios-glass-subtle rounded-2xl">
        {[
          { id: 'packages', label: 'Paket & Harga' },
          { id: 'about', label: 'Tentang & Founder' },
          { id: 'teachers', label: 'Guru' },
          { id: 'branches', label: 'Cabang & Koordinat' },
          { id: 'gallery', label: 'Galeri' },
          { id: 'announcements', label: 'Pengumuman' },
          { id: 'schedules', label: 'Jadwal' },
          { id: 'contact', label: 'Kontak' },
        ].map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setSubTab(tab.id as typeof subTab)}
            className={`px-3.5 py-2 text-xs font-semibold rounded-xl transition-colors cursor-pointer whitespace-nowrap ${
              subTab === tab.id
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {statusMsg && (
        <div role="status" className="p-3.5 rounded-2xl bg-slate-900 text-white text-sm">
          {statusMsg}
        </div>
      )}

      {/* 3 Packages + Per-Branch Real-Time Price Editor */}
      {subTab === 'packages' && (
        <div className="space-y-4">
          <div className="ios-glass-subtle rounded-2xl p-4 text-xs sm:text-sm text-slate-700">
            Atur harga terpisah untuk <strong>Pusat (Indramayu Kota)</strong> dan{' '}
            <strong>Cabang (Kecamatan Terisi)</strong>. Saat disimpan, harga akan langsung tampil secara real-time di Dashboard Orang Tua, Halaman Program, dan formulir Pendaftaran Offline. Jika suatu harga dikosongkan, sistem tidak akan menampilkan harga simulasi/dummy.
          </div>

          {pkgList.map((pkg, idx) => {
            const pPusatDisplay = getPackagePriceDisplayForBranch(pkg, 'indramayu-kota');
            const pCabangDisplay = getPackagePriceDisplayForBranch(pkg, 'terisi');
            const explicitPusat = parseRupiahAmount(pkg.pricePusat);
            const explicitCabang = parseRupiahAmount(pkg.priceCabang);
            const hasLegacyGeneralPrice =
              explicitPusat === null &&
              explicitCabang === null &&
              Boolean(pkg.priceLabel && pkg.priceLabel.trim());

            return (
              <div key={pkg.id} className="ios-glass rounded-2xl p-5 space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-xs font-bold text-rose-700 uppercase">{pkg.slug}</p>
                  <div className="flex flex-wrap gap-2 text-[11px] font-mono">
                    <span className="px-2.5 py-1 rounded-lg bg-white/80 border border-slate-200 text-slate-800">
                      Pusat: {pPusatDisplay || 'Belum diatur'}
                    </span>
                    <span className="px-2.5 py-1 rounded-lg bg-white/80 border border-slate-200 text-slate-800">
                      Cabang Terisi: {pCabangDisplay || 'Belum diatur'}
                    </span>
                  </div>
                </div>

                {hasLegacyGeneralPrice && (
                  <div className="p-3 rounded-xl bg-amber-50/90 border border-amber-200 text-xs text-amber-950 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div>
                      <p className="font-bold">
                        Tarif Umum Tersimpan: {pkg.priceLabel}
                        {pkg.priceNote ? ` (${pkg.priceNote})` : ''}
                      </p>
                      <p className="text-[11px] text-amber-900">
                        Berlaku otomatis untuk Pusat &amp; Cabang sampai Anda mengatur tarif terpisah di bawah.
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-2 shrink-0">
                      {getPackagePriceForBranch(pkg, 'indramayu-kota') !== null && (
                        <button
                          type="button"
                          onClick={() => {
                            const num = getPackagePriceForBranch(pkg, 'indramayu-kota')!;
                            setPkgList((prev) =>
                              prev.map((item, i) =>
                                i === idx
                                  ? {
                                      ...item,
                                      pricePusat: num,
                                      priceCabang: num,
                                      pricePusatNote: item.pricePusatNote || item.priceNote || '',
                                      priceCabangNote: item.priceCabangNote || item.priceNote || '',
                                      priceLabel: undefined,
                                      priceNote: undefined,
                                    }
                                  : item
                              )
                            );
                          }}
                          className="px-2.5 py-1.5 text-[11px] font-bold bg-slate-900 text-white rounded-lg cursor-pointer"
                        >
                          Salin ke Pusat &amp; Cabang
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() =>
                          setPkgList((prev) =>
                            prev.map((item, i) =>
                              i === idx ? { ...item, priceLabel: undefined, priceNote: undefined } : item
                            )
                          )
                        }
                        className="px-2.5 py-1.5 text-[11px] font-semibold text-rose-700 bg-white border border-rose-200 rounded-lg cursor-pointer"
                      >
                        Hapus Tarif
                      </button>
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Judul Paket</label>
                    <input
                      type="text"
                      value={pkg.title}
                      onChange={(e) =>
                        setPkgList((prev) =>
                          prev.map((item, i) => (i === idx ? { ...item, title: e.target.value } : item))
                        )
                      }
                      className="w-full px-3 py-2 text-sm bg-white/85 border border-slate-300/80 rounded-xl"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Jenjang / Subjudul</label>
                    <input
                      type="text"
                      value={pkg.levelRange}
                      onChange={(e) =>
                        setPkgList((prev) =>
                          prev.map((item, i) =>
                            i === idx ? { ...item, levelRange: e.target.value } : item
                          )
                        )
                      }
                      className="w-full px-3 py-2 text-sm bg-white/85 border border-slate-300/80 rounded-xl"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Tipe Program</label>
                    <input
                      type="text"
                      value={pkg.programType}
                      onChange={(e) =>
                        setPkgList((prev) =>
                          prev.map((item, i) =>
                            i === idx ? { ...item, programType: e.target.value } : item
                          )
                        )
                      }
                      className="w-full px-3 py-2 text-sm bg-white/85 border border-slate-300/80 rounded-xl"
                    />
                  </div>
                </div>

                {/* Per-Branch Pricing Matrix */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 rounded-2xl bg-white/65 border border-slate-200/80">
                  <div className="space-y-2.5">
                    <div className="flex items-center justify-between gap-2">
                      <label className="text-xs font-bold text-slate-900">
                        Harga Cabang Pusat — Indramayu Kota (Rp)
                      </label>
                      {explicitPusat !== null && (
                        <button
                          type="button"
                          onClick={() =>
                            setPkgList((prev) =>
                              prev.map((item, i) =>
                                i === idx
                                  ? {
                                      ...item,
                                      pricePusat: undefined,
                                      priceLabel: undefined,
                                    }
                                  : item
                              )
                            )
                          }
                          className="text-[11px] font-semibold text-rose-700 hover:underline cursor-pointer"
                        >
                          Kosongkan
                        </button>
                      )}
                    </div>
                    <input
                      type="number"
                      min="0"
                      step="1000"
                      placeholder="Kosongkan jika belum diatur"
                      value={typeof pkg.pricePusat === 'number' ? pkg.pricePusat : ''}
                      onChange={(e) => {
                        const val = e.target.value === '' ? undefined : Math.max(0, Number(e.target.value));
                        setPkgList((prev) =>
                          prev.map((item, i) =>
                            i === idx ? { ...item, pricePusat: val } : item
                          )
                        );
                      }}
                      className="w-full px-3 py-2 text-sm font-mono bg-white border border-slate-300 rounded-xl"
                    />
                    <input
                      type="text"
                      placeholder="Keterangan harga Pusat (opsional, mis. 8x pertemuan)"
                      value={pkg.pricePusatNote || ''}
                      onChange={(e) =>
                        setPkgList((prev) =>
                          prev.map((item, i) =>
                            i === idx ? { ...item, pricePusatNote: e.target.value } : item
                          )
                        )
                      }
                      className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-xl"
                    />
                  </div>

                  <div className="space-y-2.5">
                    <div className="flex items-center justify-between gap-2">
                      <label className="text-xs font-bold text-slate-900">
                        Harga Cabang Kecamatan Terisi (Rp)
                      </label>
                      {explicitCabang !== null && (
                        <button
                          type="button"
                          onClick={() =>
                            setPkgList((prev) =>
                              prev.map((item, i) =>
                                i === idx
                                  ? {
                                      ...item,
                                      priceCabang: undefined,
                                      priceLabel: undefined,
                                    }
                                  : item
                              )
                            )
                          }
                          className="text-[11px] font-semibold text-rose-700 hover:underline cursor-pointer"
                        >
                          Kosongkan
                        </button>
                      )}
                    </div>
                    <input
                      type="number"
                      min="0"
                      step="1000"
                      placeholder="Kosongkan jika belum diatur"
                      value={typeof pkg.priceCabang === 'number' ? pkg.priceCabang : ''}
                      onChange={(e) => {
                        const val = e.target.value === '' ? undefined : Math.max(0, Number(e.target.value));
                        setPkgList((prev) =>
                          prev.map((item, i) =>
                            i === idx ? { ...item, priceCabang: val } : item
                          )
                        );
                      }}
                      className="w-full px-3 py-2 text-sm font-mono bg-white border border-slate-300 rounded-xl"
                    />
                    <input
                      type="text"
                      placeholder="Keterangan harga Cabang Terisi (opsional)"
                      value={pkg.priceCabangNote || ''}
                      onChange={(e) =>
                        setPkgList((prev) =>
                          prev.map((item, i) =>
                            i === idx ? { ...item, priceCabangNote: e.target.value } : item
                          )
                        )
                      }
                      className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-xl"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Mata Pelajaran (pisahkan dengan koma)
                  </label>
                  <input
                    type="text"
                    value={pkg.subjects.join(', ')}
                    onChange={(e) =>
                      setPkgList((prev) =>
                        prev.map((item, i) =>
                          i === idx
                            ? {
                                ...item,
                                subjects: e.target.value.split(',').map((s) => s.trim()),
                              }
                            : item
                        )
                      )
                    }
                    className="w-full px-3 py-2 text-sm bg-white/85 border border-slate-300/80 rounded-xl"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Deskripsi Tambahan (Opsional)
                  </label>
                  <textarea
                    rows={2}
                    value={pkg.description || ''}
                    onChange={(e) =>
                      setPkgList((prev) =>
                        prev.map((item, i) =>
                          i === idx ? { ...item, description: e.target.value } : item
                        )
                      )
                    }
                    className="w-full px-3 py-2 text-sm bg-white/85 border border-slate-300/80 rounded-xl"
                  />
                </div>
              </div>
            );
          })}
          <button
            type="button"
            disabled={busy}
            onClick={handleSavePackages}
            className="px-5 py-2.5 min-h-[44px] text-sm font-semibold text-white bg-slate-900 hover:bg-rose-700 rounded-xl cursor-pointer"
          >
            {busy ? 'Menyimpan...' : 'Simpan Perubahan Paket & Harga'}
          </button>
        </div>
      )}

      {/* About & Founder */}
      {subTab === 'about' && (
        <div className="ios-glass rounded-2xl p-6 space-y-5">
          <h3 className="text-base font-bold text-slate-900">Tentang, Filosofi &amp; Visi Misi</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Makna Brand</label>
              <textarea
                rows={2}
                value={aboutForm.subtitle || ''}
                onChange={(e) => setAboutForm({ ...aboutForm, subtitle: e.target.value })}
                className="w-full px-3 py-2 text-sm bg-white/85 border border-slate-300/80 rounded-xl"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Catatan Filosofi</label>
              <textarea
                rows={2}
                value={aboutForm.body || ''}
                onChange={(e) => setAboutForm({ ...aboutForm, body: e.target.value })}
                className="w-full px-3 py-2 text-sm bg-white/85 border border-slate-300/80 rounded-xl"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Visi Lembaga</label>
              <textarea
                rows={3}
                value={aboutForm.vision || ''}
                onChange={(e) => setAboutForm({ ...aboutForm, vision: e.target.value })}
                placeholder="Isi visi lembaga bila tersedia"
                className="w-full px-3 py-2 text-sm bg-white/85 border border-slate-300/80 rounded-xl"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Misi Lembaga</label>
              <textarea
                rows={3}
                value={aboutForm.mission || ''}
                onChange={(e) => setAboutForm({ ...aboutForm, mission: e.target.value })}
                placeholder="Isi misi lembaga bila tersedia"
                className="w-full px-3 py-2 text-sm bg-white/85 border border-slate-300/80 rounded-xl"
              />
            </div>
          </div>

          <div className="pt-4 border-t border-slate-200/70 space-y-4">
            <h3 className="text-base font-bold text-slate-900">Profil Founder / CEO</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Nama Founder / CEO</label>
                <input
                  type="text"
                  value={founderForm.founderName || ''}
                  onChange={(e) => setFounderForm({ ...founderForm, founderName: e.target.value })}
                  className="w-full px-3 py-2 text-sm bg-white/85 border border-slate-300/80 rounded-xl"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Jabatan</label>
                <input
                  type="text"
                  value={founderForm.founderRole || ''}
                  onChange={(e) => setFounderForm({ ...founderForm, founderRole: e.target.value })}
                  className="w-full px-3 py-2 text-sm bg-white/85 border border-slate-300/80 rounded-xl"
                />
              </div>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Foto Founder (URL atau Upload Cloudinary)</label>
              <div className="flex flex-wrap items-center gap-3">
                <input
                  type="text"
                  value={founderForm.founderPhotoUrl || ''}
                  onChange={(e) => setFounderForm({ ...founderForm, founderPhotoUrl: e.target.value })}
                  className="flex-1 min-w-[220px] px-3 py-2 text-sm bg-white/85 border border-slate-300/80 rounded-xl"
                />
                <label className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold bg-white/85 hover:bg-white border border-slate-300 rounded-xl cursor-pointer">
                  <Upload className="w-4 h-4" />
                  <span>Upload Foto</span>
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    className="hidden"
                    onChange={(e) =>
                      handleCloudinaryUpload(e.target.files?.[0], (url) =>
                        setFounderForm({ ...founderForm, founderPhotoUrl: url })
                      )
                    }
                  />
                </label>
              </div>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Sambutan / Bio Founder (Opsional)</label>
              <textarea
                rows={3}
                value={founderForm.founderBio || ''}
                onChange={(e) => setFounderForm({ ...founderForm, founderBio: e.target.value })}
                className="w-full px-3 py-2 text-sm bg-white/85 border border-slate-300/80 rounded-xl"
              />
            </div>
          </div>

          <button
            type="button"
            disabled={busy}
            onClick={handleSaveAboutFounder}
            className="px-5 py-2.5 min-h-[44px] text-sm font-semibold text-white bg-slate-900 hover:bg-rose-700 rounded-xl cursor-pointer"
          >
            {busy ? 'Menyimpan...' : 'Simpan Konten Tentang & Founder'}
          </button>
        </div>
      )}

      {/* Teachers Editor + Add/Delete */}
      {subTab === 'teachers' && (
        <div className="space-y-6">
          <form onSubmit={handleAddTeacher} className="ios-glass rounded-2xl p-5 space-y-3">
            <h3 className="text-base font-bold text-slate-900">Tambah Guru Baru</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <input
                type="text"
                required
                placeholder="Nama lengkap & gelar guru"
                value={newTeacherName}
                onChange={(e) => setNewTeacherName(e.target.value)}
                className="px-3 py-2 text-sm bg-white/85 border border-slate-300/80 rounded-xl"
              />
              <input
                type="text"
                placeholder="Deskripsi / bidang studi (opsional)"
                value={newTeacherDesc}
                onChange={(e) => setNewTeacherDesc(e.target.value)}
                className="px-3 py-2 text-sm bg-white/85 border border-slate-300/80 rounded-xl"
              />
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <input
                type="text"
                placeholder="URL foto guru (opsional)"
                value={newTeacherPhoto}
                onChange={(e) => setNewTeacherPhoto(e.target.value)}
                className="flex-1 min-w-[200px] px-3 py-2 text-xs bg-white/85 border border-slate-300/80 rounded-xl"
              />
              <label className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-semibold bg-white/85 hover:bg-white border border-slate-300 rounded-xl cursor-pointer">
                <Upload className="w-3.5 h-3.5" />
                <span>Upload Foto Guru</span>
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  className="hidden"
                  onChange={(e) =>
                    handleCloudinaryUpload(e.target.files?.[0], (url) => setNewTeacherPhoto(url))
                  }
                />
              </label>
              <button
                type="submit"
                disabled={busy}
                className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-rose-700 hover:bg-rose-800 rounded-xl cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Tambah Guru</span>
              </button>
            </div>
          </form>

          <div className="space-y-4">
            {teacherList.map((teacher, idx) => (
              <div key={teacher.id} className="ios-glass rounded-2xl p-5 space-y-3">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-bold text-slate-500">Guru #{idx + 1}</span>
                  <button
                    type="button"
                    onClick={async () => {
                      await adminDeleteDoc('teachers', teacher.id);
                      await onSaved();
                    }}
                    aria-label={`Hapus ${teacher.name}`}
                    className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-rose-700 hover:bg-rose-50 rounded-lg cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Hapus</span>
                  </button>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Nama Guru
                    </label>
                    <input
                      type="text"
                      value={teacher.name}
                      onChange={(e) =>
                        setTeacherList((prev) =>
                          prev.map((item, i) => (i === idx ? { ...item, name: e.target.value } : item))
                        )
                      }
                      className="w-full px-3 py-2 text-sm bg-white/85 border border-slate-300/80 rounded-xl"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Deskripsi Guru (Opsional)
                    </label>
                    <input
                      type="text"
                      value={teacher.description || ''}
                      placeholder="Kosongkan jika hanya menampilkan nama"
                      onChange={(e) =>
                        setTeacherList((prev) =>
                          prev.map((item, i) =>
                            i === idx ? { ...item, description: e.target.value } : item
                          )
                        )
                      }
                      className="w-full px-3 py-2 text-sm bg-white/85 border border-slate-300/80 rounded-xl"
                    />
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-3">
                  <input
                    type="text"
                    value={teacher.photoUrl || ''}
                    placeholder="URL foto guru (opsional, hanya jika diunggah)"
                    onChange={(e) =>
                      setTeacherList((prev) =>
                        prev.map((item, i) =>
                          i === idx ? { ...item, photoUrl: e.target.value } : item
                        )
                      )
                    }
                    className="flex-1 min-w-[200px] px-3 py-2 text-xs bg-white/85 border border-slate-300/80 rounded-xl"
                  />
                  <label className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-semibold bg-white/85 hover:bg-white border border-slate-300 rounded-xl cursor-pointer">
                    <Upload className="w-3.5 h-3.5" />
                    <span>Upload Foto Guru</span>
                    <input
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      className="hidden"
                      onChange={(e) =>
                        handleCloudinaryUpload(e.target.files?.[0], (url) =>
                          setTeacherList((prev) =>
                            prev.map((item, i) => (i === idx ? { ...item, photoUrl: url } : item))
                          )
                        )
                      }
                    />
                  </label>
                </div>
              </div>
            ))}
            <button
              type="button"
              disabled={busy}
              onClick={handleSaveTeachers}
              className="px-5 py-2.5 min-h-[44px] text-sm font-semibold text-white bg-slate-900 hover:bg-rose-700 rounded-xl cursor-pointer"
            >
              {busy ? 'Menyimpan...' : 'Simpan Semua Perubahan Guru'}
            </button>
          </div>
        </div>
      )}

      {/* Branches + Coordinates Editor */}
      {subTab === 'branches' && (
        <div className="space-y-4">
          {branchList.map((branch, idx) => (
            <div key={branch.id} className="ios-glass rounded-2xl p-5 space-y-3">
              <p className="text-xs font-bold text-rose-700 uppercase">{branch.roleLabel}</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Nama Cabang</label>
                  <input
                    type="text"
                    value={branch.name}
                    onChange={(e) =>
                      setBranchList((prev) =>
                        prev.map((item, i) => (i === idx ? { ...item, name: e.target.value } : item))
                      )
                    }
                    className="w-full px-3 py-2 text-sm bg-white/85 border border-slate-300/80 rounded-xl"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Tautan Google Maps</label>
                  <input
                    type="url"
                    value={branch.mapsUrl}
                    onChange={(e) =>
                      setBranchList((prev) =>
                        prev.map((item, i) =>
                          i === idx ? { ...item, mapsUrl: e.target.value } : item
                        )
                      )
                    }
                    className="w-full px-3 py-2 text-sm bg-white/85 border border-slate-300/80 rounded-xl"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Latitude (Titik Koordinat Peta)</label>
                  <input
                    type="number"
                    step="0.000001"
                    value={branch.latitude ?? ''}
                    onChange={(e) => {
                      const val = e.target.value === '' ? undefined : Number(e.target.value);
                      setBranchList((prev) =>
                        prev.map((item, i) => (i === idx ? { ...item, latitude: val } : item))
                      );
                    }}
                    className="w-full px-3 py-2 text-sm font-mono bg-white/85 border border-slate-300/80 rounded-xl"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Longitude (Titik Koordinat Peta)</label>
                  <input
                    type="number"
                    step="0.000001"
                    value={branch.longitude ?? ''}
                    onChange={(e) => {
                      const val = e.target.value === '' ? undefined : Number(e.target.value);
                      setBranchList((prev) =>
                        prev.map((item, i) => (i === idx ? { ...item, longitude: val } : item))
                      );
                    }}
                    className="w-full px-3 py-2 text-sm font-mono bg-white/85 border border-slate-300/80 rounded-xl"
                  />
                </div>
              </div>
            </div>
          ))}
          <button
            type="button"
            disabled={busy}
            onClick={handleSaveBranches}
            className="px-5 py-2.5 min-h-[44px] text-sm font-semibold text-white bg-slate-900 hover:bg-rose-700 rounded-xl cursor-pointer"
          >
            {busy ? 'Menyimpan...' : 'Simpan Cabang & Koordinat Maps'}
          </button>
        </div>
      )}

      {/* Gallery Editor (Add + Edit + Delete) */}
      {subTab === 'gallery' && (
        <div className="space-y-6">
          <form onSubmit={handleAddGallery} className="ios-glass rounded-2xl p-5 space-y-4">
            <h3 className="text-base font-bold text-slate-900">Tambah Foto Galeri</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <input
                type="text"
                required
                placeholder="Judul foto kegiatan"
                value={newGalleryTitle}
                onChange={(e) => setNewGalleryTitle(e.target.value)}
                className="px-3 py-2 text-sm bg-white/85 border border-slate-300/80 rounded-xl"
              />
              <input
                type="text"
                placeholder="Kategori (opsional)"
                value={newGalleryCategory}
                onChange={(e) => setNewGalleryCategory(e.target.value)}
                className="px-3 py-2 text-sm bg-white/85 border border-slate-300/80 rounded-xl"
              />
            </div>
            <input
              type="text"
              placeholder="Keterangan singkat (opsional)"
              value={newGalleryCaption}
              onChange={(e) => setNewGalleryCaption(e.target.value)}
              className="w-full px-3 py-2 text-sm bg-white/85 border border-slate-300/80 rounded-xl"
            />
            <div className="flex flex-wrap items-center gap-3">
              <input
                type="url"
                required
                placeholder="URL gambar (upload ke Cloudinary di sebelah)"
                value={newGalleryImageUrl}
                onChange={(e) => setNewGalleryImageUrl(e.target.value)}
                className="flex-1 min-w-[220px] px-3 py-2 text-sm bg-white/85 border border-slate-300/80 rounded-xl"
              />
              <label className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold bg-white/85 hover:bg-white border border-slate-300 rounded-xl cursor-pointer">
                <Upload className="w-4 h-4" />
                <span>Upload Cloudinary</span>
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  className="hidden"
                  onChange={(e) =>
                    handleCloudinaryUpload(e.target.files?.[0], (url) =>
                      setNewGalleryImageUrl(url)
                    )
                  }
                />
              </label>
            </div>
            <button
              type="submit"
              disabled={busy}
              className="px-5 py-2.5 text-sm font-semibold text-white bg-slate-900 hover:bg-rose-700 rounded-xl cursor-pointer"
            >
              Terbitkan ke Galeri
            </button>
          </form>

          {editingGallery && (
            <form onSubmit={handleSaveEditGallery} className="ios-glass-strong rounded-2xl p-5 space-y-3 border-2 border-rose-300">
              <h4 className="text-sm font-bold text-slate-900">Edit Item Galeri</h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <input
                  type="text"
                  required
                  value={editingGallery.title}
                  onChange={(e) => setEditingGallery({ ...editingGallery, title: e.target.value })}
                  className="px-3 py-2 text-sm bg-white border border-slate-300 rounded-xl"
                />
                <input
                  type="text"
                  placeholder="Kategori"
                  value={editingGallery.category || ''}
                  onChange={(e) => setEditingGallery({ ...editingGallery, category: e.target.value })}
                  className="px-3 py-2 text-sm bg-white border border-slate-300 rounded-xl"
                />
              </div>
              <input
                type="text"
                placeholder="Keterangan"
                value={editingGallery.caption || ''}
                onChange={(e) => setEditingGallery({ ...editingGallery, caption: e.target.value })}
                className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-xl"
              />
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setEditingGallery(null)}
                  className="px-3.5 py-2 text-xs font-semibold bg-slate-100 rounded-xl cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={busy}
                  className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-slate-900 rounded-xl cursor-pointer"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>Simpan Perubahan</span>
                </button>
              </div>
            </form>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {gallery.map((item) => (
              <div key={item.id} className="ios-glass rounded-2xl overflow-hidden">
                <img
                  src={item.imageUrl}
                  alt={item.title}
                  className="w-full h-40 object-cover"
                  referrerPolicy="no-referrer"
                />
                <div className="p-4 flex items-center justify-between gap-2">
                  <p className="text-sm font-bold text-slate-900 truncate">{item.title}</p>
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      type="button"
                      onClick={() => setEditingGallery(item)}
                      aria-label={`Edit ${item.title}`}
                      className="p-2 text-slate-700 hover:bg-white rounded-lg cursor-pointer"
                    >
                      <Edit3 className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={async () => {
                        await adminDeleteDoc('gallery', item.id);
                        await onSaved();
                      }}
                      aria-label={`Hapus ${item.title}`}
                      className="p-2 text-rose-700 hover:bg-rose-50 rounded-lg cursor-pointer"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Announcements Editor (Add + Edit + Delete) */}
      {subTab === 'announcements' && (
        <div className="space-y-6">
          <form onSubmit={handleAddAnnouncement} className="ios-glass rounded-2xl p-5 space-y-3">
            <h3 className="text-base font-bold text-slate-900">Buat Pengumuman Baru</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <input
                type="text"
                required
                placeholder="Judul pengumuman"
                value={newAnnTitle}
                onChange={(e) => setNewAnnTitle(e.target.value)}
                className="px-3 py-2 text-sm bg-white/85 border border-slate-300/80 rounded-xl"
              />
              <input
                type="text"
                placeholder="Tanggal / Periode (mis. November 2026)"
                value={newAnnDate}
                onChange={(e) => setNewAnnDate(e.target.value)}
                className="px-3 py-2 text-sm bg-white/85 border border-slate-300/80 rounded-xl"
              />
            </div>
            <textarea
              rows={3}
              required
              placeholder="Isi pengumuman"
              value={newAnnContent}
              onChange={(e) => setNewAnnContent(e.target.value)}
              className="w-full px-3 py-2 text-sm bg-white/85 border border-slate-300/80 rounded-xl"
            />
            <div className="flex flex-wrap items-center gap-3">
              <input
                type="url"
                placeholder="URL gambar pengumuman (opsional)"
                value={newAnnImageUrl}
                onChange={(e) => setNewAnnImageUrl(e.target.value)}
                className="flex-1 min-w-[220px] px-3 py-2 text-sm bg-white/85 border border-slate-300/80 rounded-xl"
              />
              <label className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold bg-white/85 hover:bg-white border border-slate-300 rounded-xl cursor-pointer">
                <Upload className="w-4 h-4" />
                <span>Upload Gambar</span>
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  className="hidden"
                  onChange={(e) =>
                    handleCloudinaryUpload(e.target.files?.[0], (url) => setNewAnnImageUrl(url))
                  }
                />
              </label>
            </div>
            <button
              type="submit"
              disabled={busy}
              className="px-5 py-2.5 text-sm font-semibold text-white bg-slate-900 hover:bg-rose-700 rounded-xl cursor-pointer"
            >
              Terbitkan Pengumuman
            </button>
          </form>

          {editingAnn && (
            <form onSubmit={handleSaveEditAnnouncement} className="ios-glass-strong rounded-2xl p-5 space-y-3 border-2 border-rose-300">
              <h4 className="text-sm font-bold text-slate-900">Edit Pengumuman</h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <input
                  type="text"
                  required
                  value={editingAnn.title}
                  onChange={(e) => setEditingAnn({ ...editingAnn, title: e.target.value })}
                  className="px-3 py-2 text-sm bg-white border border-slate-300 rounded-xl"
                />
                <input
                  type="text"
                  placeholder="Tanggal / Periode"
                  value={editingAnn.dateLabel || ''}
                  onChange={(e) => setEditingAnn({ ...editingAnn, dateLabel: e.target.value })}
                  className="px-3 py-2 text-sm bg-white border border-slate-300 rounded-xl"
                />
              </div>
              <textarea
                rows={3}
                required
                value={editingAnn.content}
                onChange={(e) => setEditingAnn({ ...editingAnn, content: e.target.value })}
                className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-xl"
              />
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setEditingAnn(null)}
                  className="px-3.5 py-2 text-xs font-semibold bg-slate-100 rounded-xl cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={busy}
                  className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-slate-900 rounded-xl cursor-pointer"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>Simpan Pengumuman</span>
                </button>
              </div>
            </form>
          )}

          <div className="space-y-3">
            {announcements.map((item) => (
              <div
                key={item.id}
                className="ios-glass rounded-2xl p-4 flex items-start justify-between gap-4"
              >
                <div>
                  <h4 className="text-sm font-bold text-slate-900">{item.title}</h4>
                  <p className="text-xs text-slate-600 mt-1 line-clamp-2">{item.content}</p>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <button
                    type="button"
                    onClick={() => setEditingAnn(item)}
                    aria-label={`Edit pengumuman ${item.title}`}
                    className="p-2 text-slate-700 hover:bg-white rounded-lg cursor-pointer"
                  >
                    <Edit3 className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={async () => {
                      await adminDeleteDoc('announcements', item.id);
                      await onSaved();
                    }}
                    aria-label={`Hapus pengumuman ${item.title}`}
                    className="p-2 text-rose-700 hover:bg-rose-50 rounded-lg cursor-pointer"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Schedules Editor (Add + Edit + Delete) */}
      {subTab === 'schedules' && (
        <div className="space-y-6">
          <form onSubmit={handleAddSchedule} className="ios-glass rounded-2xl p-5 space-y-3">
            <h3 className="text-base font-bold text-slate-900">Tambah Jadwal Belajar</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <input
                type="text"
                required
                placeholder="Nama kelas / sesi jadwal"
                value={newSchTitle}
                onChange={(e) => setNewSchTitle(e.target.value)}
                className="px-3 py-2 text-sm bg-white/85 border border-slate-300/80 rounded-xl"
              />
              <input
                type="text"
                required
                placeholder="Hari & Jam (mis. Senin & Rabu, 15.00–16.30)"
                value={newSchDayTime}
                onChange={(e) => setNewSchDayTime(e.target.value)}
                className="px-3 py-2 text-sm bg-white/85 border border-slate-300/80 rounded-xl"
              />
              <select
                value={newSchPkg}
                onChange={(e) => setNewSchPkg(e.target.value)}
                className="px-3 py-2 text-sm bg-white/85 border border-slate-300/80 rounded-xl"
              >
                <option value="paket-1">PAKET 1: TK – Kelas 1</option>
                <option value="paket-2">PAKET 2: Kelas 2 – Kelas 5</option>
                <option value="paket-3">PAKET 3: Kelas 6</option>
              </select>
              <select
                value={newSchBranch}
                onChange={(e) => setNewSchBranch(e.target.value)}
                className="px-3 py-2 text-sm bg-white/85 border border-slate-300/80 rounded-xl"
              >
                <option value="indramayu-kota">Indramayu Kota (Pusat)</option>
                <option value="terisi">Kecamatan Terisi (Cabang)</option>
              </select>
            </div>
            <input
              type="text"
              placeholder="Catatan jadwal (opsional)"
              value={newSchNotes}
              onChange={(e) => setNewSchNotes(e.target.value)}
              className="w-full px-3 py-2 text-sm bg-white/85 border border-slate-300/80 rounded-xl"
            />
            <button
              type="submit"
              disabled={busy}
              className="px-5 py-2.5 text-sm font-semibold text-white bg-slate-900 hover:bg-rose-700 rounded-xl cursor-pointer"
            >
              Simpan Jadwal
            </button>
          </form>

          {editingSch && (
            <form onSubmit={handleSaveEditSchedule} className="ios-glass-strong rounded-2xl p-5 space-y-3 border-2 border-rose-300">
              <h4 className="text-sm font-bold text-slate-900">Edit Jadwal Belajar</h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <input
                  type="text"
                  required
                  value={editingSch.title}
                  onChange={(e) => setEditingSch({ ...editingSch, title: e.target.value })}
                  className="px-3 py-2 text-sm bg-white border border-slate-300 rounded-xl"
                />
                <input
                  type="text"
                  required
                  value={editingSch.dayTime}
                  onChange={(e) => setEditingSch({ ...editingSch, dayTime: e.target.value })}
                  className="px-3 py-2 text-sm bg-white border border-slate-300 rounded-xl"
                />
                <select
                  value={editingSch.packageId || 'paket-1'}
                  onChange={(e) => setEditingSch({ ...editingSch, packageId: e.target.value })}
                  className="px-3 py-2 text-sm bg-white border border-slate-300 rounded-xl"
                >
                  <option value="paket-1">PAKET 1: TK – Kelas 1</option>
                  <option value="paket-2">PAKET 2: Kelas 2 – Kelas 5</option>
                  <option value="paket-3">PAKET 3: Kelas 6</option>
                </select>
                <select
                  value={editingSch.branchId || 'indramayu-kota'}
                  onChange={(e) => setEditingSch({ ...editingSch, branchId: e.target.value })}
                  className="px-3 py-2 text-sm bg-white border border-slate-300 rounded-xl"
                >
                  <option value="indramayu-kota">Indramayu Kota (Pusat)</option>
                  <option value="terisi">Kecamatan Terisi (Cabang)</option>
                </select>
              </div>
              <input
                type="text"
                placeholder="Catatan jadwal"
                value={editingSch.notes || ''}
                onChange={(e) => setEditingSch({ ...editingSch, notes: e.target.value })}
                className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-xl"
              />
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setEditingSch(null)}
                  className="px-3.5 py-2 text-xs font-semibold bg-slate-100 rounded-xl cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={busy}
                  className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-slate-900 rounded-xl cursor-pointer"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>Simpan Jadwal</span>
                </button>
              </div>
            </form>
          )}

          <div className="space-y-3">
            {schedules.map((sch) => (
              <div
                key={sch.id}
                className="ios-glass rounded-2xl p-4 flex items-center justify-between gap-4"
              >
                <div>
                  <p className="text-sm font-bold text-slate-900">{sch.title}</p>
                  <p className="text-xs text-slate-600">{sch.dayTime}</p>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <button
                    type="button"
                    onClick={() => setEditingSch(sch)}
                    aria-label={`Edit jadwal ${sch.title}`}
                    className="p-2 text-slate-700 hover:bg-white rounded-lg cursor-pointer"
                  >
                    <Edit3 className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={async () => {
                      await adminDeleteDoc('schedules', sch.id);
                      await onSaved();
                    }}
                    aria-label={`Hapus jadwal ${sch.title}`}
                    className="p-2 text-rose-700 hover:bg-rose-50 rounded-lg cursor-pointer"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Contact Editor */}
      {subTab === 'contact' && (
        <div className="ios-glass rounded-2xl p-6 space-y-4">
          <h3 className="text-base font-bold text-slate-900">Kontak Resmi &amp; Media Sosial</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Email Resmi</label>
              <input
                type="email"
                value={contactForm.email || ''}
                onChange={(e) => setContactForm({ ...contactForm, email: e.target.value })}
                className="w-full px-3 py-2 text-sm bg-white/85 border border-slate-300/80 rounded-xl"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Nomor WhatsApp (Tampilan)</label>
              <input
                type="text"
                value={contactForm.whatsappDisplay || ''}
                onChange={(e) => setContactForm({ ...contactForm, whatsappDisplay: e.target.value })}
                className="w-full px-3 py-2 text-sm bg-white/85 border border-slate-300/80 rounded-xl"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Tautan WhatsApp</label>
              <input
                type="url"
                value={contactForm.whatsappUrl || ''}
                onChange={(e) => setContactForm({ ...contactForm, whatsappUrl: e.target.value })}
                className="w-full px-3 py-2 text-sm bg-white/85 border border-slate-300/80 rounded-xl"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Tautan Instagram</label>
              <input
                type="url"
                value={contactForm.instagramUrl || ''}
                onChange={(e) => setContactForm({ ...contactForm, instagramUrl: e.target.value })}
                className="w-full px-3 py-2 text-sm bg-white/85 border border-slate-300/80 rounded-xl"
              />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-slate-700 mb-1">Tautan Facebook</label>
              <input
                type="url"
                value={contactForm.facebookUrl || ''}
                onChange={(e) => setContactForm({ ...contactForm, facebookUrl: e.target.value })}
                className="w-full px-3 py-2 text-sm bg-white/85 border border-slate-300/80 rounded-xl"
              />
            </div>
          </div>
          <button
            type="button"
            disabled={busy}
            onClick={handleSaveContact}
            className="px-5 py-2.5 min-h-[44px] text-sm font-semibold text-white bg-slate-900 hover:bg-rose-700 rounded-xl cursor-pointer"
          >
            {busy ? 'Menyimpan...' : 'Simpan Kontak Resmi'}
          </button>
        </div>
      )}
    </div>
  );
}
