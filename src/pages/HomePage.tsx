import { Link } from 'react-router-dom';
import { ArrowRight, Download, Smartphone } from 'lucide-react';
import { BRAND_IDENTITY } from '../lib/domain';
import {
  TOMOYO_APK_BANNER_PNG,
  TOMOYO_APK_BANNER_WEBP,
  TOMOYO_APK_SEO,
} from '../lib/apkDownload';
import { useSiteData } from '../context/SiteDataContext';
import { GoogleOfficialIcon } from '../components/BrandIcons';
import {
  BatikPaomanDivider,
  BatikPaomanFloating,
  GeometricMeshBackdrop,
} from '../components/IndramayuMotifs';
import {
  BranchesSection,
  ContactSection,
  PackagesSection,
  PhilosophySection,
  TeachersSection,
} from '../components/PublicSections';

const HERO_LEARNING_SESSION =
  '/assets/aistudio/WhatsApp_Image_2026-11-19_at_11.24.52_af9d5f53.jpeg_a5cb9e21.jpeg';

export function HomePage() {
  const { data } = useSiteData();

  return (
    <div>
      {/* Editorial Full-Bleed Hero over Tutor & Students Learning Session Photography */}
      <section className="relative overflow-hidden bg-[#141A23] text-white min-h-[540px] sm:min-h-[600px] lg:min-h-[640px] flex flex-col justify-between">
        <img
          src={HERO_LEARNING_SESSION}
          alt="Pendampingan belajar privat dan bimbingan belajar siswa bersama pengajar TOMOYO Education"
          className="absolute inset-0 w-full h-full object-cover object-[58%_22%]"
          referrerPolicy="no-referrer"
        />
        <div className="hero-scrim absolute inset-0" aria-hidden="true" />
        <GeometricMeshBackdrop
          tone="dark"
          className="absolute inset-x-0 bottom-0 h-44 sm:h-56 opacity-[0.16]"
        />
        <BatikPaomanFloating
          tone="light"
          tiltDeg={-13}
          animation="slow"
          className="hidden sm:block absolute top-10 right-8 lg:right-20"
          imgClassName="w-28 lg:w-36 opacity-[0.4]"
        />
        <BatikPaomanFloating
          tone="light"
          tiltDeg={19}
          flipX
          animation="reverse"
          className="hidden lg:block absolute bottom-20 right-48"
          imgClassName="w-20 lg:w-24 opacity-[0.28]"
        />

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

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <BatikPaomanDivider />
      </div>

      {/* Internal Link & Banner Promo Aplikasi Android TOMOYO EDUCATION */}
      <section className="py-12 sm:py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="rounded-2xl bg-[#141A23] border border-[#242D3C] p-6 sm:p-8 lg:p-10 text-white space-y-6">
            <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4">
              <div className="max-w-2xl space-y-2">
                <p className="text-xs font-semibold tracking-[0.14em] uppercase text-[#FDE68A] inline-flex items-center gap-2">
                  <Smartphone className="w-4 h-4 shrink-0" />
                  <span>Aplikasi Resmi Android · TOMOYO EDUCATION</span>
                </p>
                <h2 className="font-display text-2xl sm:text-3xl font-bold tracking-tight text-white">
                  Akses Layanan TOMOYO Lebih Praktis via Aplikasi Android
                </h2>
                <p className="text-sm sm:text-base text-slate-300 leading-relaxed">
                  Unduh APK resmi TOMOYO EDUCATION untuk smartphone Android agar informasi program privat, bimbel, jadwal belajar, dan layanan orang tua selalu mudah diakses.
                </p>
              </div>
              <Link
                to="/download-apk"
                className="inline-flex items-center justify-center gap-2 px-5 py-3 min-h-[46px] text-sm font-semibold text-white bg-[#A61B38] hover:bg-[#88132B] rounded-xl transition-colors whitespace-nowrap shrink-0"
              >
                <Download className="w-4 h-4 shrink-0" />
                <span>Download APK TOMOYO</span>
                <ArrowRight className="w-4 h-4 shrink-0" />
              </Link>
            </div>

            <Link
              to="/download-apk"
              aria-label="Buka halaman Download APK TOMOYO EDUCATION untuk Android"
              className="block rounded-xl border border-slate-800 bg-[#0F141C] p-3 sm:p-5 hover:border-[#FDE68A]/60 transition-colors"
            >
              <picture>
                <source srcSet={TOMOYO_APK_BANNER_WEBP} type="image/webp" />
                <img
                  src={TOMOYO_APK_BANNER_PNG}
                  alt={TOMOYO_APK_SEO.bannerAlt}
                  width={3264}
                  height={689}
                  loading="lazy"
                  decoding="async"
                  className="w-full h-auto object-contain block"
                  referrerPolicy="no-referrer"
                />
              </picture>
            </Link>
          </div>
        </div>
      </section>

      {/* Kontak dan Ajakan Mendaftar */}
      <ContactSection contact={data.contact} />
    </div>
  );
}
