import { Link } from 'react-router-dom';
import { ArrowRight, BookOpen } from 'lucide-react';
import { BRAND_IDENTITY } from '../lib/domain';
import { useSiteData } from '../context/SiteDataContext';
import { GoogleOfficialIcon } from '../components/BrandIcons';
import { BatikPaomanDivider } from '../components/IndramayuMotifs';
import {
  BranchesSection,
  ContactSection,
  PackagesSection,
  PhilosophySection,
  TeachersSection,
} from '../components/PublicSections';

const HERO_INDRAMAYU_ALUN_ALUN = '/assets/aistudio/WhatsApp_Image_2026-11-19_at_11.24.52_af9d5f53.jpeg';

export function HomePage() {
  const { data } = useSiteData();

  return (
    <div>
      {/* Full-bleed Editorial Hero over Authentic Aerial Alun-Alun Indramayu Photography */}
      <section className="relative overflow-hidden bg-[#121820] text-white">
        <img
          src={HERO_INDRAMAYU_ALUN_ALUN}
          alt="Pemandangan udara Alun-Alun Indramayu dan Gunung Ciremai di kejauhan"
          className="absolute inset-0 w-full h-full object-cover object-center"
          referrerPolicy="no-referrer"
        />
        <div className="hero-scrim absolute inset-0" aria-hidden="true" />

        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-12 pb-14 sm:pt-16 sm:pb-20 lg:pt-20 lg:pb-24 space-y-10 lg:space-y-12">
          {/* Typography positioned directly over scrimmed photograph */}
          <div className="max-w-3xl space-y-4">
            <p className="text-xs sm:text-sm font-semibold tracking-[0.18em] uppercase text-slate-200">
              {BRAND_IDENTITY.tagline} · INDRAMAYU KOTA &amp; TERISI
            </p>

            <h1 className="font-display font-extrabold tracking-tight leading-[0.98]">
              <span className="block text-5xl sm:text-6xl lg:text-[4.75rem] text-white drop-shadow-sm">
                TOMOYO EDUCATION
              </span>
              <span className="block text-3xl sm:text-5xl lg:text-[3.5rem] text-[#D9F99D] mt-1">
                PRIVAT &amp; BIMBEL
              </span>
            </h1>

            <p className="text-base sm:text-lg text-slate-100/95 leading-relaxed max-w-2xl">
              {BRAND_IDENTITY.meaning} Pendampingan belajar terarah untuk siswa TK hingga Kelas 6 SD di Kabupaten Indramayu.
            </p>

            <div className="flex flex-wrap items-center gap-3 pt-2">
              <Link
                to="/daftar"
                className="inline-flex items-center justify-center gap-2.5 px-6 py-3.5 min-h-[48px] text-sm sm:text-base font-bold text-white bg-[#BE123C] hover:bg-[#9F1239] rounded-xl shadow-lg transition-colors whitespace-nowrap"
              >
                <span className="w-5 h-5 rounded-full bg-white flex items-center justify-center shrink-0">
                  <GoogleOfficialIcon className="w-3.5 h-3.5" />
                </span>
                <span>Daftar Sekarang</span>
              </Link>
              <a
                href="#program-belajar"
                className="inline-flex items-center justify-center gap-2 px-5 py-3.5 min-h-[48px] text-sm sm:text-base font-semibold text-white bg-white/15 hover:bg-white/25 border border-white/35 backdrop-blur-xs rounded-xl transition-colors whitespace-nowrap"
              >
                <span>Lihat Paket Belajar</span>
              </a>
              <Link
                to="/kuis"
                className="inline-flex items-center justify-center gap-2 px-5 py-3.5 min-h-[48px] text-sm sm:text-base font-semibold text-[#D9F99D] bg-[#121820]/70 hover:bg-[#121820]/90 border border-[#D9F99D]/45 rounded-xl backdrop-blur-xs transition-colors whitespace-nowrap"
              >
                <BookOpen className="w-4 h-4 shrink-0" />
                <span>Portal Kuis Online</span>
                <ArrowRight className="w-4 h-4 shrink-0" />
              </Link>
            </div>
          </div>

          {/* Integrated 3-Package Quick Strip over the lower photographic landscape */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 lg:gap-6">
            {data.packages.map((pkg, idx) => (
              <Link
                key={pkg.id}
                to={`/program#paket-${idx + 1}`}
                className="hero-package-panel rounded-2xl p-5 sm:p-6 flex flex-col justify-between gap-4 text-left group"
              >
                <div className="space-y-2">
                  <div className="flex items-center justify-between gap-2 text-xs font-mono text-[#D9F99D]">
                    <span>PAKET 0{idx + 1}</span>
                    <span className="text-slate-200 font-sans font-semibold">{pkg.levelRange}</span>
                  </div>
                  <h2 className="font-display text-2xl sm:text-[1.7rem] font-bold tracking-tight text-white leading-tight">
                    {pkg.title.replace(/^PAKET \d+:\s*/i, '')}
                  </h2>
                  <p className="text-xs sm:text-sm text-slate-200/95 leading-relaxed">
                    {pkg.subjects.join(' · ')}
                  </p>
                </div>
                <div className="pt-2 border-t border-white/15 flex items-center justify-between text-xs font-semibold text-[#D9F99D] group-hover:text-white transition-colors">
                  <span>Lihat rincian biaya &amp; fokus</span>
                  <ArrowRight className="w-4 h-4 shrink-0" />
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Paket belajar lengkap */}
      <PackagesSection packages={data.packages} showAllLink />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <BatikPaomanDivider />
      </div>

      {/* Filosofi TOMOYO */}
      <PhilosophySection about={data.about} />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <BatikPaomanDivider />
      </div>

      {/* Ringkasan Guru/Pengajar */}
      <TeachersSection teachers={data.teachers} compact />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <BatikPaomanDivider />
      </div>

      {/* Cabang/Lokasi */}
      <BranchesSection branches={data.branches} />

      {/* Kontak dan Ajakan Mendaftar */}
      <ContactSection contact={data.contact} />
    </div>
  );
}
