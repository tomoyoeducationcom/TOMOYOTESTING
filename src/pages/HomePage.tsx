import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
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
      {/* Editorial Full-Bleed Hero over Aerial Alun-Alun Indramayu Photography */}
      <section className="relative overflow-hidden bg-[#141A23] text-white min-h-[540px] sm:min-h-[600px] lg:min-h-[640px] flex flex-col justify-between">
        <img
          src={HERO_INDRAMAYU_ALUN_ALUN}
          alt="Pemandangan udara Alun-Alun Indramayu dan Gunung Ciremai di kejauhan"
          className="absolute inset-0 w-full h-full object-cover object-center"
          referrerPolicy="no-referrer"
        />
        <div className="hero-scrim absolute inset-0" aria-hidden="true" />

        <div className="relative z-10 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 pt-16 pb-10 sm:pt-24 sm:pb-12 lg:pt-28 lg:pb-14 flex-1 flex flex-col justify-between gap-12">
          {/* Editorial Focal Block — sits directly over photography with directional dark scrim */}
          <div className="max-w-2xl space-y-5">
            <p className="text-xs font-semibold tracking-[0.18em] uppercase text-[#FDE68A]">
              {BRAND_IDENTITY.tagline} · KABUPATEN INDRAMAYU
            </p>

            <h1 className="font-display font-bold tracking-tight leading-[1.06] text-4xl sm:text-5xl lg:text-[3.75rem] text-white">
              Pendampingan Belajar Terarah untuk Generasi Cerdas Indramayu
            </h1>

            <p className="text-base sm:text-lg text-slate-100/90 leading-relaxed max-w-xl">
              {BRAND_IDENTITY.officialName} membimbing siswa tingkat TK hingga Kelas 6 SD dengan pendekatan privat dan kelompok kecil yang hangat, disiplin, dan terukur.
            </p>

            <div className="flex flex-wrap items-center gap-4 pt-2">
              <Link
                to="/daftar"
                className="inline-flex items-center justify-center gap-2.5 px-6 py-3.5 min-h-[48px] text-sm sm:text-base font-semibold text-white bg-[#A61B38] hover:bg-[#88132B] rounded-lg shadow-lg transition-colors whitespace-nowrap"
              >
                <span className="w-5 h-5 rounded-full bg-white flex items-center justify-center shrink-0">
                  <GoogleOfficialIcon className="w-3.5 h-3.5" />
                </span>
                <span>Daftar Sekarang</span>
              </Link>
              <a
                href="#program-belajar"
                className="inline-flex items-center gap-2 px-2 py-2.5 min-h-[44px] text-sm sm:text-base font-semibold text-white/95 hover:text-[#FDE68A] border-b border-white/45 hover:border-[#FDE68A] transition-colors whitespace-nowrap"
              >
                <span>Lihat Paket Belajar</span>
                <ArrowRight className="w-4 h-4 shrink-0" />
              </a>
            </div>
          </div>

          {/* Grounded Architectural Fact Strip at Base of Hero (No Heavy Translucent Cards) */}
          <div className="border-t border-white/25 pt-5 grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 text-sm">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-300">
                Jenjang Bimbingan
              </p>
              <p className="font-semibold text-white mt-0.5">TK – Kelas 6 SD</p>
            </div>
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-300">
                Kantor Pusat
              </p>
              <p className="font-semibold text-white mt-0.5">Indramayu Kota</p>
            </div>
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-300">
                Kantor Cabang
              </p>
              <p className="font-semibold text-white mt-0.5">Kecamatan Terisi</p>
            </div>
            <div className="flex items-end lg:justify-end">
              <Link
                to="/kuis"
                className="inline-flex items-center gap-1.5 text-sm font-semibold text-[#FDE68A] hover:text-white transition-colors"
              >
                <span>Portal Kuis Online Siswa</span>
                <ArrowRight className="w-4 h-4 shrink-0" />
              </Link>
            </div>
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
