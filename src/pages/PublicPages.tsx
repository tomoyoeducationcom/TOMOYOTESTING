import { Link } from 'react-router-dom';
import { Calendar, Clock, Image as ImageIcon, Megaphone, ArrowRight } from 'lucide-react';
import { useSiteData } from '../context/SiteDataContext';
import { useAuth } from '../context/AuthContext';
import { PUBLIC_INDEXABLE_ROUTES } from '../lib/seo';
import { GoogleOfficialIcon } from '../components/BrandIcons';
import {
  BranchesSection,
  ContactSection,
  FounderSection,
  PackagesSection,
  PhilosophySection,
  TeachersSection,
} from '../components/PublicSections';

function PageHeader({
  eyebrow,
  title,
  description,
}: {
  eyebrow: string;
  title: string;
  description: string;
}) {
  return (
    <section className="ios-glass-subtle border-b border-white/80 py-10 sm:py-14">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 space-y-2.5 text-center">
        <p className="text-xs font-semibold tracking-wider text-rose-700 uppercase">{eyebrow}</p>
        <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-slate-900">
          {title}
        </h1>
        <p className="text-sm sm:text-base text-slate-600 leading-relaxed">{description}</p>
      </div>
    </section>
  );
}

export function AboutPage() {
  const { data } = useSiteData();
  return (
    <div>
      <PageHeader
        eyebrow="Tentang Lembaga"
        title="Profil & Filosofi TOMOYO Education"
        description="Mengenal makna, nilai pendidikan, dan visi misi TOMOYO PRIVAT & BIMBEL EDUCATION."
      />
      <PhilosophySection about={data.about} />
      <section className="py-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="ios-glass-strong rounded-3xl p-6 sm:p-8 flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-center sm:text-left">
            <div>
              <h2 className="text-lg font-bold text-slate-900">Profil Pimpinan Lembaga</h2>
              <p className="text-sm text-slate-600">
                Kenali Founder &amp; CEO TOMOYO PRIVAT &amp; BIMBEL EDUCATION di halaman khusus.
              </p>
            </div>
            <Link
              to="/founder"
              className="inline-flex items-center justify-center gap-2 px-5 py-2.5 min-h-[44px] text-sm font-semibold text-white bg-slate-900 hover:bg-rose-700 rounded-2xl transition-colors whitespace-nowrap shrink-0"
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
      <PageHeader
        eyebrow="Pimpinan Lembaga"
        title="Profil Founder & CEO"
        description="Profil resmi Founder & CEO TOMOYO PRIVAT & BIMBEL EDUCATION."
      />
      <FounderSection founder={data.founder} />
    </div>
  );
}

export function ProgramsPage() {
  const { data } = useSiteData();
  return (
    <div>
      <PageHeader
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
      <PageHeader
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
      <PageHeader
        eyebrow="Dokumentasi"
        title="Galeri Kegiatan"
        description="Dokumentasi aktivitas belajar mengajar dan kegiatan siswa TOMOYO Education."
      />
      <section className="py-12 sm:py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {loading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-64 ios-glass animate-pulse rounded-3xl" />
              ))}
            </div>
          ) : data.gallery.length === 0 ? (
            <div className="ios-glass-strong rounded-3xl p-10 text-center max-w-xl mx-auto space-y-3">
              <ImageIcon className="w-10 h-10 text-slate-400 mx-auto" />
              <h2 className="text-lg font-bold text-slate-900">Belum Ada Foto Galeri</h2>
              <p className="text-sm text-slate-600 leading-relaxed">
                Dokumentasi foto kegiatan akan tampil di halaman ini setelah dipublikasikan oleh pengelola lembaga.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {data.gallery.map((item) => (
                <article
                  key={item.id}
                  className="ios-glass rounded-3xl overflow-hidden flex flex-col"
                >
                  <div className="aspect-[4/3] bg-slate-100 overflow-hidden">
                    <img
                      src={item.imageUrl}
                      alt={item.title}
                      className="w-full h-full object-cover"
                      referrerPolicy="no-referrer"
                    />
                  </div>
                  <div className="p-5 space-y-1.5 text-center">
                    {item.category && (
                      <p className="text-xs font-medium text-rose-700">{item.category}</p>
                    )}
                    <h2 className="text-base font-bold text-slate-900">{item.title}</h2>
                    {item.caption && (
                      <p className="text-sm text-slate-600 leading-relaxed">{item.caption}</p>
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
      <PageHeader
        eyebrow="Informasi Resmi"
        title="Pengumuman"
        description="Pengumuman terbaru untuk orang tua dan peserta didik TOMOYO Education."
      />
      <section className="py-12 sm:py-16">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          {loading ? (
            <div className="space-y-4">
              {[1, 2].map((i) => (
                <div key={i} className="h-32 ios-glass animate-pulse rounded-3xl" />
              ))}
            </div>
          ) : data.announcements.length === 0 ? (
            <div className="ios-glass-strong rounded-3xl p-10 text-center space-y-3">
              <Megaphone className="w-10 h-10 text-slate-400 mx-auto" />
              <h2 className="text-lg font-bold text-slate-900">Belum Ada Pengumuman</h2>
              <p className="text-sm text-slate-600 leading-relaxed">
                Informasi dan pengumuman resmi akan ditampilkan di sini ketika pengelola menerbitkannya.
              </p>
            </div>
          ) : (
            <div className="space-y-6">
              {data.announcements.map((item) => (
                <article
                  key={item.id}
                  className="ios-glass rounded-3xl overflow-hidden"
                >
                  {item.imageUrl && (
                    <div className="aspect-[16/9] max-h-80 w-full bg-slate-100 overflow-hidden">
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
                      <p className="text-xs font-medium text-slate-500 flex items-center gap-1.5">
                        <Calendar className="w-3.5 h-3.5" />
                        <span>{item.dateLabel}</span>
                      </p>
                    )}
                    <h2 className="text-xl font-bold text-slate-900">{item.title}</h2>
                    <p className="text-sm sm:text-base text-slate-700 leading-relaxed whitespace-pre-line">
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
      <PageHeader
        eyebrow="Waktu Pembelajaran"
        title="Jadwal Belajar"
        description="Informasi jadwal kelas dan sesi bimbingan belajar yang dikelola resmi oleh TOMOYO Education."
      />
      <section className="py-12 sm:py-16">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          {loading ? (
            <div className="space-y-4">
              {[1, 2].map((i) => (
                <div key={i} className="h-24 ios-glass animate-pulse rounded-3xl" />
              ))}
            </div>
          ) : data.schedules.length === 0 ? (
            <div className="ios-glass-strong rounded-3xl p-10 text-center max-w-xl mx-auto space-y-3">
              <Clock className="w-10 h-10 text-slate-400 mx-auto" />
              <h2 className="text-lg font-bold text-slate-900">Jadwal Belum Dipublikasikan</h2>
              <p className="text-sm text-slate-600 leading-relaxed">
                Jadwal resmi per paket dan cabang akan ditampilkan di sini setelah diisi melalui CMS pengelola. Untuk koordinasi waktu belajar, silakan hubungi WhatsApp resmi kami.
              </p>
              <a
                href={data.contact.whatsappUrl || 'https://wa.me/6282119770700'}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center px-5 py-2.5 text-sm font-semibold text-white bg-emerald-700 hover:bg-emerald-800 rounded-2xl transition-colors"
              >
                Tanya Jadwal via WhatsApp
              </a>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {data.schedules.map((item) => (
                <article
                  key={item.id}
                  className="ios-glass rounded-3xl p-6 space-y-2 text-center"
                >
                  <div className="flex flex-wrap items-center justify-center gap-2 text-xs font-semibold text-rose-700">
                    {item.branchId && <span>{item.branchId === 'terisi' ? 'Cabang Terisi' : 'Indramayu Kota (Pusat)'}</span>}
                    {item.branchId && item.packageId && <span aria-hidden="true">·</span>}
                    {item.packageId && <span>{item.packageId.toUpperCase()}</span>}
                  </div>
                  <h2 className="text-lg font-bold text-slate-900">{item.title}</h2>
                  <p className="text-sm font-semibold text-slate-800 flex items-center justify-center gap-2">
                    <Clock className="w-4 h-4 text-slate-500 shrink-0" />
                    <span>{item.dayTime}</span>
                  </p>
                  {item.notes && (
                    <p className="text-sm text-slate-600 leading-relaxed pt-1">{item.notes}</p>
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
      <PageHeader
        eyebrow="Lokasi Belajar"
        title="Cabang & Lokasi TOMOYO Education"
        description="Dua lokasi resmi TOMOYO Education di Kabupaten Indramayu."
      />
      <BranchesSection branches={data.branches} />
    </div>
  );
}

export function ContactPage() {
  const { data } = useSiteData();
  return (
    <div>
      <PageHeader
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
      <PageHeader
        eyebrow="Pendaftaran Siswa Baru"
        title="Alur Pendaftaran TOMOYO Education"
        description="Orang tua wajib masuk menggunakan akun Google terlebih dahulu sebelum mengisi formulir pendaftaran anak."
      />
      <section className="py-12 sm:py-16">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 space-y-10">
          <div className="ios-glass-strong rounded-3xl p-6 sm:p-8 max-w-3xl mx-auto space-y-6">
            <h2 className="text-xl font-bold text-slate-900 text-center">Langkah Pendaftaran Online</h2>
            <ol className="space-y-4 text-sm sm:text-base text-slate-700">
              <li className="flex items-start gap-3">
                <span className="w-7 h-7 rounded-full bg-rose-700 text-white text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">
                  1
                </span>
                <div>
                  <p className="font-semibold text-slate-900">Masuk dengan Akun Google Orang Tua</p>
                  <p className="text-sm text-slate-600">
                    Autentikasi menggunakan Google Sign-In untuk menjaga keamanan data keluarga Anda.
                  </p>
                </div>
              </li>
              <li className="flex items-start gap-3">
                <span className="w-7 h-7 rounded-full bg-slate-900 text-white text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">
                  2
                </span>
                <div>
                  <p className="font-semibold text-slate-900">Daftarkan Satu atau Beberapa Anak + Foto Anak</p>
                  <p className="text-sm text-slate-600">
                    Lengkapi biodata siswa, unggah foto anak ukuran bebas, lalu pilih paket resmi dan lokasi cabang.
                  </p>
                </div>
              </li>
              <li className="flex items-start gap-3">
                <span className="w-7 h-7 rounded-full bg-emerald-700 text-white text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">
                  3
                </span>
                <div>
                  <p className="font-semibold text-slate-900">Verifikasi Admin &amp; Pantau Status</p>
                  <p className="text-sm text-slate-600">
                    Pendaftaran masuk dengan status Menunggu Persetujuan dan langsung diberitahukan ke admin melalui WhatsApp.
                  </p>
                </div>
              </li>
            </ol>

            <div className="pt-4 border-t border-slate-200/70 flex flex-wrap items-center justify-center gap-3">
              {loading ? (
                <span className="text-sm text-slate-500">Memeriksa sesi login...</span>
              ) : user ? (
                <Link
                  to="/dashboard"
                  className="inline-flex items-center justify-center gap-2 px-6 py-3 min-h-[48px] text-sm font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-2xl transition-colors"
                >
                  <span>Lanjut ke Dashboard Pendaftaran</span>
                  <ArrowRight className="w-4 h-4" />
                </Link>
              ) : (
                <Link
                  to="/masuk?next=/dashboard"
                  className="inline-flex items-center justify-center gap-2.5 px-6 py-3 min-h-[48px] text-sm font-bold text-white bg-rose-700 hover:bg-rose-800 rounded-2xl shadow-md transition-colors"
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
      <PageHeader
        eyebrow="Navigasi"
        title="Peta Situs"
        description="Daftar seluruh halaman publik yang dapat diakses pada website TOMOYO PRIVAT & BIMBEL EDUCATION."
      />
      <section className="py-12 sm:py-16">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="ios-glass-strong rounded-3xl p-6 sm:p-8">
            <ul className="divide-y divide-slate-200/70">
              {PUBLIC_INDEXABLE_ROUTES.map((route) => (
                <li key={route.path} className="py-4 first:pt-0 last:pb-0">
                  <Link
                    to={route.path}
                    className="group flex flex-col sm:flex-row sm:items-center justify-between gap-1"
                  >
                    <span className="text-base font-bold text-slate-900 group-hover:text-rose-700 transition-colors">
                      {route.label}
                    </span>
                    <span className="text-xs font-mono text-slate-500">{route.path}</span>
                  </Link>
                  <p className="text-sm text-slate-600 mt-1">{route.description}</p>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>
    </div>
  );
}
