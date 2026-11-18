import { Link } from 'react-router-dom';
import { BRAND_IDENTITY } from '../lib/domain';
import { useSiteData } from '../context/SiteDataContext';
import { GoogleOfficialIcon } from '../components/BrandIcons';
import {
  BranchesSection,
  ContactSection,
  PackagesSection,
  PhilosophySection,
  TeachersSection,
} from '../components/PublicSections';

export function HomePage() {
  const { data } = useSiteData();

  return (
    <div>
      {/* Hero / Perkenalan Singkat TOMOYO */}
      <section className="py-10 sm:py-16 lg:py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="ios-glass-strong rounded-3xl px-6 py-10 sm:px-12 sm:py-14 max-w-4xl mx-auto text-center space-y-5">
            <p className="text-xs sm:text-sm font-semibold tracking-widest text-rose-700 uppercase">
              {BRAND_IDENTITY.tagline}
            </p>

            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-slate-900 leading-[1.08]">
              TOMOYO EDUCATION
            </h1>

            <p className="text-lg sm:text-2xl font-bold text-rose-700 tracking-tight">
              PRIVAT &amp; BIMBEL No.1 Di Indramayu!
            </p>

            <p className="text-base sm:text-lg text-slate-700 leading-relaxed max-w-2xl mx-auto">
              {BRAND_IDENTITY.meaning} Pendampingan belajar untuk siswa TK hingga Kelas 6 SD di cabang Indramayu Kota dan Kecamatan Terisi.
            </p>

            <div className="flex flex-wrap items-center justify-center gap-3.5 pt-2">
              <Link
                to="/daftar"
                className="inline-flex items-center justify-center gap-2.5 px-6 py-3.5 min-h-[50px] text-sm sm:text-base font-bold text-white bg-rose-700 hover:bg-rose-800 rounded-2xl shadow-md transition-all whitespace-nowrap"
              >
                <span className="w-6 h-6 rounded-full bg-white flex items-center justify-center shrink-0">
                  <GoogleOfficialIcon className="w-4 h-4" />
                </span>
                <span>Daftar Sekarang</span>
              </Link>
              <a
                href="#program-belajar"
                className="inline-flex items-center justify-center px-6 py-3.5 min-h-[50px] text-sm sm:text-base font-semibold text-slate-800 ios-glass hover:bg-white/95 rounded-2xl transition-all whitespace-nowrap"
              >
                Lihat Paket Belajar
              </a>
            </div>

            <div className="pt-5 border-t border-slate-200/70 flex flex-wrap items-center justify-center gap-x-5 gap-y-1.5 text-xs sm:text-sm text-slate-600">
              <span>Indramayu Kota (Pusat)</span>
              <span className="hidden sm:inline text-slate-300" aria-hidden="true">|</span>
              <span>Kecamatan Terisi (Cabang)</span>
              <span className="hidden sm:inline text-slate-300" aria-hidden="true">|</span>
              <span>Pendaftaran Online Orang Tua</span>
            </div>
          </div>
        </div>
      </section>

      {/* Paket belajar tepat setelah hero/perkenalan singkat */}
      <PackagesSection packages={data.packages} showAllLink />

      {/* Filosofi TOMOYO */}
      <PhilosophySection about={data.about} />

      {/* Ringkasan Guru/Pengajar */}
      <TeachersSection teachers={data.teachers} compact />

      {/* Cabang/Lokasi */}
      <BranchesSection branches={data.branches} />

      {/* Kontak dan Ajakan Mendaftar */}
      <ContactSection contact={data.contact} />
    </div>
  );
}
