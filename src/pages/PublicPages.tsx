import { Link } from 'react-router-dom';
import { Calendar, Clock, Image as ImageIcon, Megaphone, ArrowRight } from 'lucide-react';
import { useSiteData } from '../context/SiteDataContext';
import { useAuth } from '../context/AuthContext';
import { PUBLIC_INDEXABLE_ROUTES } from '../lib/seo';
import { GoogleOfficialIcon } from '../components/BrandIcons';
import { PagePhotoHero } from '../components/IndramayuMotifs';
import heroProgramClassroom from '../assets/images/hero_program_classroom_1795063098068.jpg';
import heroIndramayuCoast from '../assets/images/hero_indramayu_coast_1795063097696.jpg';
import heroStudentStudy from '../assets/images/hero_student_study_1795063097881.jpg';
import {
  BranchesSection,
  ContactSection,
  FounderSection,
  PackagesSection,
  PhilosophySection,
  TeachersSection,
} from '../components/PublicSections';

const HERO_INDRAMAYU_ALUN_ALUN = '/assets/aistudio/WhatsApp_Image_2026-11-19_at_11.24.52_af9d5f53.jpeg';

export function AboutPage() {
  const { data } = useSiteData();
  return (
    <div>
      <PagePhotoHero
        imageSrc={heroIndramayuCoast}
        imageAlt="Panorama persawahan dan ufuk pesisir Indramayu di pagi hari"
        eyebrow="Tentang Lembaga · Indramayu"
        title="Profil & Filosofi TOMOYO Education"
        description="Mengenal makna, nilai pendidikan, dan akar budaya belajar TOMOYO PRIVAT & BIMBEL EDUCATION."
      />
      <PhilosophySection about={data.about} />
      <section className="pb-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="editorial-card rounded-2xl p-6 sm:p-8 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="font-display text-2xl font-bold text-[#141A23]">Profil Pimpinan Lembaga</h2>
              <p className="text-sm text-[#3E4856]">
                Kenali Founder &amp; CEO TOMOYO PRIVAT &amp; BIMBEL EDUCATION pada halaman khusus pimpinan.
              </p>
            </div>
            <Link
              to="/founder"
              className="inline-flex items-center justify-center gap-2 px-5 py-2.5 min-h-[44px] text-sm font-semibold text-white bg-[#141A23] hover:bg-[#A61B38] rounded-xl transition-colors whitespace-nowrap shrink-0"
            >
              <span>Lihat Profil Founder</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}

export function FounderPage() {
  const { data } = useSiteData();
  return (
    <div>
      <PagePhotoHero
        imageSrc={heroStudentStudy}
        imageAlt="Meja belajar siswa dengan buku catatan dan lampu belajar hangat"
        eyebrow="Pimpinan Lembaga"
        title="Profil Founder & CEO"
        description="Profil resmi pendiri dan pimpinan TOMOYO PRIVAT & BIMBEL EDUCATION."
      />
      <FounderSection founder={data.founder} />
    </div>
  );
}

export function ProgramsPage() {
  const { data } = useSiteData();
  return (
    <div>
      <PagePhotoHero
        imageSrc={heroProgramClassroom}
        imageAlt="Suasana belajar interaktif siswa sekolah dasar di ruang kelas terang"
        eyebrow="Kurikulum & Paket"
        title="Program & Paket Belajar"
        description="Tiga paket pembelajaran resmi yang dirancang sesuai jenjang kelas siswa TK hingga Kelas 6 SD."
      />
      <PackagesSection packages={data.packages} />
      <ContactSection contact={data.contact} />
    </div>
  );
}

export function TeachersPage() {
  const { data } = useSiteData();
  return (
    <div>
      <PagePhotoHero
        imageSrc={heroProgramClassroom}
        imageAlt="Ruang belajar resmi TOMOYO Education yang kondusif"
        eyebrow="Tim Pendidik"
        title="Daftar Guru & Pengajar"
        description="Para pengajar resmi yang mendampingi proses belajar siswa di TOMOYO PRIVAT & BIMBEL EDUCATION."
      />
      <TeachersSection teachers={data.teachers} />
    </div>
  );
}

export function GalleryPage() {
  const { data, loading } = useSiteData();
  return (
    <div>
      <PagePhotoHero
        imageSrc={heroIndramayuCoast}
        imageAlt="Lanskap pagi Indramayu sebagai latar dokumentasi kegiatan"
        eyebrow="Dokumentasi"
        title="Galeri Kegiatan"
        description="Dokumentasi aktivitas belajar mengajar dan kegiatan siswa TOMOYO Education."
      />
      <section className="py-12 sm:py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {loading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-64 editorial-card animate-pulse rounded-2xl" />
              ))}
            </div>
          ) : data.gallery.length === 0 ? (
            <div className="editorial-card rounded-2xl p-10 text-center max-w-xl mx-auto space-y-3">
              <ImageIcon className="w-10 h-10 text-[#626E7E] mx-auto" />
              <h2 className="font-display text-2xl font-bold text-[#141A23]">Belum Ada Foto Galeri</h2>
              <p className="text-sm text-[#3E4856] leading-relaxed">
                Dokumentasi foto kegiatan akan tampil di halaman ini setelah dipublikasikan oleh pengelola lembaga.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {data.gallery.map((item) => (
                <article
                  key={item.id}
                  className="editorial-card rounded-2xl overflow-hidden flex flex-col"
                >
                  <div className="aspect-[4/3] bg-[#F2EFE9] overflow-hidden">
                    <img
                      src={item.imageUrl}
                      alt={item.title}
                      className="w-full h-full object-cover"
                      referrerPolicy="no-referrer"
                    />
                  </div>
                  <div className="p-5 space-y-1.5">
                    {item.category && (
                      <p className="text-xs font-semibold text-[#A61B38]">{item.category}</p>
                    )}
                    <h2 className="text-base font-bold text-[#141A23]">{item.title}</h2>
                    {item.caption && (
                      <p className="text-sm text-[#3E4856] leading-relaxed">{item.caption}</p>
                    )}
                  </div>
                </article>
              ))}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}

export function AnnouncementsPage() {
  const { data, loading } = useSiteData();
  return (
    <div>
      <PagePhotoHero
        imageSrc={heroStudentStudy}
        imageAlt="Meja belajar dan catatan informasi resmi lembaga"
        eyebrow="Informasi Resmi"
        title="Pengumuman"
        description="Pengumuman terbaru untuk orang tua dan peserta didik TOMOYO Education."
      />
      <section className="py-12 sm:py-16">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          {loading ? (
            <div className="space-y-4">
              {[1, 2].map((i) => (
                <div key={i} className="h-32 editorial-card animate-pulse rounded-2xl" />
              ))}
            </div>
          ) : data.announcements.length === 0 ? (
            <div className="editorial-card rounded-2xl p-10 text-center space-y-3">
              <Megaphone className="w-10 h-10 text-[#626E7E] mx-auto" />
              <h2 className="font-display text-2xl font-bold text-[#141A23]">Belum Ada Pengumuman</h2>
              <p className="text-sm text-[#3E4856] leading-relaxed">
                Informasi dan pengumuman resmi akan ditampilkan di sini ketika pengelola menerbitkannya.
              </p>
            </div>
          ) : (
            <div className="space-y-6">
              {data.announcements.map((item) => (
                <article
                  key={item.id}
                  className="editorial-card rounded-2xl overflow-hidden"
                >
                  {item.imageUrl && (
                    <div className="aspect-[16/9] max-h-80 w-full bg-[#F2EFE9] overflow-hidden">
                      <img
                        src={item.imageUrl}
                        alt={item.title}
                        className="w-full h-full object-cover"
                        referrerPolicy="no-referrer"
                      />
                    </div>
                  )}
                  <div className="p-6 space-y-2">
                    {item.dateLabel && (
                      <p className="text-xs font-medium text-[#626E7E] flex items-center gap-1.5">
                        <Calendar className="w-3.5 h-3.5" />
                        <span>{item.dateLabel}</span>
                      </p>
                    )}
                    <h2 className="font-display text-2xl font-bold text-[#141A23]">{item.title}</h2>
                    <p className="text-sm sm:text-base text-[#3E4856] leading-relaxed whitespace-pre-line">
                      {item.content}
                    </p>
                  </div>
                </article>
              ))}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}

export function SchedulesPage() {
  const { data, loading } = useSiteData();
  return (
    <div>
      <PagePhotoHero
        imageSrc={heroProgramClassroom}
        imageAlt="Suasana pembelajaran terjadwal di kelas TOMOYO"
        eyebrow="Waktu Pembelajaran"
        title="Jadwal Belajar"
        description="Informasi jadwal kelas dan sesi bimbingan belajar yang dikelola resmi oleh TOMOYO Education."
      />
      <section className="py-12 sm:py-16">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          {loading ? (
            <div className="space-y-4">
              {[1, 2].map((i) => (
                <div key={i} className="h-24 editorial-card animate-pulse rounded-2xl" />
              ))}
            </div>
          ) : data.schedules.length === 0 ? (
            <div className="editorial-card rounded-2xl p-10 text-center max-w-xl mx-auto space-y-3">
              <Clock className="w-10 h-10 text-[#626E7E] mx-auto" />
              <h2 className="font-display text-2xl font-bold text-[#141A23]">Jadwal Belum Dipublikasikan</h2>
              <p className="text-sm text-[#3E4856] leading-relaxed">
                Jadwal resmi per paket dan cabang akan ditampilkan di sini setelah diisi melalui CMS pengelola. Untuk koordinasi waktu belajar, silakan hubungi WhatsApp resmi kami.
              </p>
              <a
                href={data.contact.whatsappUrl || 'https://wa.me/6282119770700'}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center px-5 py-2.5 min-h-[44px] text-sm font-semibold text-white bg-[#0F6E66] hover:bg-[#115E59] rounded-xl transition-colors"
              >
                Tanya Jadwal via WhatsApp
              </a>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {data.schedules.map((item) => (
                <article
                  key={item.id}
                  className="editorial-card rounded-2xl p-6 space-y-2"
                >
                  <div className="flex flex-wrap items-center gap-2 text-xs font-semibold text-[#A61B38]">
                    {item.branchId && (
                      <span>{item.branchId === 'terisi' ? 'Cabang Terisi' : 'Indramayu Kota (Pusat)'}</span>
                    )}
                    {item.branchId && item.packageId && <span aria-hidden="true">·</span>}
                    {item.packageId && <span>{item.packageId.toUpperCase()}</span>}
                  </div>
                  <h2 className="font-display text-2xl font-bold text-[#141A23]">{item.title}</h2>
                  <p className="text-sm font-semibold text-[#141A23] flex items-center gap-2">
                    <Clock className="w-4 h-4 text-[#626E7E] shrink-0" />
                    <span>{item.dayTime}</span>
                  </p>
                  {item.notes && (
                    <p className="text-sm text-[#3E4856] leading-relaxed pt-1">{item.notes}</p>
                  )}
                </article>
              ))}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}

export function BranchesPage() {
  const { data } = useSiteData();
  return (
    <div>
      <PagePhotoHero
        imageSrc={HERO_INDRAMAYU_ALUN_ALUN}
        imageAlt="Pemandangan Alun-Alun Indramayu dan wilayah Kabupaten Indramayu"
        eyebrow="Lokasi Belajar Resmi"
        title="Cabang & Lokasi TOMOYO Education"
        description="Dua lokasi resmi TOMOYO Education melayani keluarga di Indramayu Kota (Pusat) dan Kecamatan Terisi (Cabang)."
      />
      <BranchesSection branches={data.branches} />
    </div>
  );
}

export function ContactPage() {
  const { data } = useSiteData();
  return (
    <div>
      <PagePhotoHero
        imageSrc={heroStudentStudy}
        imageAlt="Meja konsultasi dan studi resmi TOMOYO Education"
        eyebrow="Hubungi Kami"
        title="Kontak Resmi & Media Sosial"
        description="Saluran komunikasi resmi TOMOYO PRIVAT & BIMBEL EDUCATION untuk informasi pendaftaran dan konsultasi orang tua."
      />
      <ContactSection contact={data.contact} />
    </div>
  );
}

export function RegisterEntryPage() {
  const { user, loading } = useAuth();
  const { data } = useSiteData();

  return (
    <div>
      <PagePhotoHero
        imageSrc={heroProgramClassroom}
        imageAlt="Ruang belajar siswa TOMOYO Education"
        eyebrow="Pendaftaran Siswa Baru"
        title="Alur Pendaftaran TOMOYO Education"
        description="Orang tua masuk menggunakan akun Google terlebih dahulu sebelum mengisi formulir pendaftaran satu atau beberapa anak sekaligus."
      />
      <section className="py-12 sm:py-16">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 space-y-10">
          <div className="editorial-card rounded-2xl p-6 sm:p-8 max-w-3xl mx-auto space-y-6">
            <h2 className="font-display text-2xl sm:text-3xl font-bold text-[#141A23]">
              Langkah Pendaftaran Online
            </h2>
            <ol className="space-y-4 text-sm sm:text-base text-[#3E4856]">
              <li className="flex items-start gap-3">
                <span className="w-7 h-7 rounded-lg bg-[#A61B38] text-white text-xs font-mono font-bold flex items-center justify-center shrink-0 mt-0.5">
                  1
                </span>
                <div>
                  <p className="font-semibold text-[#141A23]">Masuk dengan Akun Google Orang Tua</p>
                  <p className="text-sm text-[#3E4856]">
                    Autentikasi menggunakan Google Sign-In untuk menjaga keamanan data keluarga Anda.
                  </p>
                </div>
              </li>
              <li className="flex items-start gap-3">
                <span className="w-7 h-7 rounded-lg bg-[#141A23] text-white text-xs font-mono font-bold flex items-center justify-center shrink-0 mt-0.5">
                  2
                </span>
                <div>
                  <p className="font-semibold text-[#141A23]">Daftarkan Satu atau Beberapa Anak + Foto Anak</p>
                  <p className="text-sm text-[#3E4856]">
                    Lengkapi biodata siswa, unggah foto anak ukuran bebas, lalu pilih paket resmi dan lokasi cabang.
                  </p>
                </div>
              </li>
              <li className="flex items-start gap-3">
                <span className="w-7 h-7 rounded-lg bg-[#0F6E66] text-white text-xs font-mono font-bold flex items-center justify-center shrink-0 mt-0.5">
                  3
                </span>
                <div>
                  <p className="font-semibold text-[#141A23]">Verifikasi Admin &amp; Pantau Status</p>
                  <p className="text-sm text-[#3E4856]">
                    Pendaftaran masuk dengan status Menunggu Persetujuan dan langsung diberitahukan ke admin melalui WhatsApp.
                  </p>
                </div>
              </li>
            </ol>

            <div className="pt-4 border-t border-[#E5E2D9] flex flex-wrap items-center gap-3">
              {loading ? (
                <span className="text-sm text-[#626E7E]">Memeriksa sesi login...</span>
              ) : user ? (
                <Link
                  to="/dashboard"
                  className="inline-flex items-center justify-center gap-2 px-6 py-3 min-h-[48px] text-sm font-semibold text-white bg-[#141A23] hover:bg-[#1E293B] rounded-xl transition-colors"
                >
                  <span>Lanjut ke Dashboard Pendaftaran</span>
                  <ArrowRight className="w-4 h-4" />
                </Link>
              ) : (
                <Link
                  to="/masuk?next=/dashboard"
                  className="inline-flex items-center justify-center gap-2.5 px-6 py-3 min-h-[48px] text-sm font-semibold text-white bg-[#A61B38] hover:bg-[#88132B] rounded-xl transition-colors"
                >
                  <span className="w-6 h-6 rounded-full bg-white flex items-center justify-center shrink-0">
                    <GoogleOfficialIcon className="w-4 h-4" />
                  </span>
                  <span>Masuk dengan Google untuk Daftar</span>
                </Link>
              )}
            </div>
          </div>

          <PackagesSection packages={data.packages} />
        </div>
      </section>
    </div>
  );
}

export function SitemapHtmlPage() {
  return (
    <div>
      <PagePhotoHero
        imageSrc={heroIndramayuCoast}
        imageAlt="Ufuk Indramayu pada peta situs TOMOYO Education"
        eyebrow="Navigasi"
        title="Peta Situs"
        description="Daftar seluruh halaman publik yang dapat diakses pada website TOMOYO PRIVAT & BIMBEL EDUCATION."
      />
      <section className="py-12 sm:py-16">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="editorial-card rounded-2xl p-6 sm:p-8">
            <ul className="divide-y divide-[#E5E2D9]">
              {PUBLIC_INDEXABLE_ROUTES.map((route) => (
                <li key={route.path} className="py-4 first:pt-0 last:pb-0">
                  <Link
                    to={route.path}
                    className="group flex flex-col sm:flex-row sm:items-center justify-between gap-1"
                  >
                    <span className="text-base font-bold text-[#141A23] group-hover:text-[#A61B38] transition-colors">
                      {route.label}
                    </span>
                    <span className="text-xs font-mono text-[#626E7E]">{route.path}</span>
                  </Link>
                  <p className="text-sm text-[#3E4856] mt-1">{route.description}</p>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>
    </div>
  );
}
