import { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowRight,
  CheckCircle2,
  Download,
  FileCheck2,
  ShieldCheck,
  Smartphone,
} from 'lucide-react';
import { BRAND_IDENTITY } from '../lib/domain';
import {
  TOMOYO_APK_BANNER_PNG,
  TOMOYO_APK_BANNER_WEBP,
  TOMOYO_APK_INSTALL_STEPS,
  TOMOYO_APK_SEO,
  TOMOYO_APK_SPEC_ITEMS,
} from '../lib/apkDownload';
import { useSiteData } from '../context/SiteDataContext';
import { ApkDownloadModal } from '../components/ApkDownloadModal';
import { WhatsAppBrandIcon } from '../components/BrandIcons';
import {
  BatikPaomanDivider,
  BatikPaomanFloating,
  GeometricMeshBackdrop,
  PagePhotoHero,
} from '../components/IndramayuMotifs';
import heroStudentStudy from '../assets/images/hero_student_study_1795063097881.jpg';

export function DownloadApkPage() {
  const [modalOpen, setModalOpen] = useState(false);
  const { data } = useSiteData();
  const waUrl = data.contact.whatsappUrl || 'https://wa.me/6282119770700';
  const waDisplay = data.contact.whatsappDisplay || '0821-1977-0700';

  return (
    <div>
      {/* Editorial Hero — Strictly one H1 for SEO */}
      <PagePhotoHero
        imageSrc={heroStudentStudy}
        imageAlt="Meja belajar siswa TOMOYO EDUCATION untuk akses layanan pembelajaran Android"
        eyebrow="Aplikasi Resmi Android · TOMOYO EDUCATION"
        title="Download Aplikasi TOMOYO EDUCATION"
        description="Aplikasi resmi TOMOYO PRIVAT & BIMBEL EDUCATION untuk perangkat Android. Nikmati kemudahan mengakses informasi layanan pendidikan, program privat, jadwal bimbingan belajar, kuis online, dan pendaftaran siswa melalui smartphone Anda."
      >
        <div className="flex flex-wrap items-center gap-4 pt-2">
          <button
            type="button"
            onClick={() => setModalOpen(true)}
            className="inline-flex items-center justify-center gap-2.5 px-6 py-3.5 min-h-[48px] text-sm sm:text-base font-semibold text-white bg-[#A61B38] hover:bg-[#88132B] rounded-lg shadow-lg transition-colors whitespace-nowrap cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#FDE68A]"
          >
            <Download className="w-5 h-5 shrink-0" />
            <span>Download APK</span>
          </button>
          <a
            href="#panduan-instalasi"
            className="inline-flex items-center gap-2 px-2 py-2.5 min-h-[44px] text-sm sm:text-base font-semibold text-white/95 hover:text-[#FDE68A] border-b border-white/45 hover:border-[#FDE68A] transition-colors whitespace-nowrap"
          >
            <span>Panduan Instalasi Android</span>
            <ArrowRight className="w-4 h-4 shrink-0" />
          </a>
        </div>
      </PagePhotoHero>

      {/* Main Clickable Official Banner Section */}
      <section className="relative overflow-hidden py-12 sm:py-16">
        <GeometricMeshBackdrop
          tone="light"
          className="inset-x-0 bottom-0 h-44 sm:h-52 opacity-[0.18]"
        />
        <BatikPaomanFloating
          tone="indigo"
          tiltDeg={-14}
          animation="slow"
          className="hidden lg:block absolute top-8 right-6"
          imgClassName="w-24 opacity-[0.14]"
        />

        <div className="relative z-10 max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 pb-5 border-b border-[#E5E2D9]">
            <div className="max-w-2xl space-y-2">
              <p className="text-xs font-semibold tracking-[0.14em] text-[#A61B38] uppercase">
                Download APK TOMOYO
              </p>
              <h2 className="font-display text-2xl sm:text-4xl font-bold tracking-tight text-[#141A23]">
                Akses Layanan Privat &amp; Bimbel dalam Genggaman
              </h2>
              <p className="text-sm sm:text-base text-[#3E4856] leading-relaxed">
                Klik banner resmi aplikasi Android TOMOYO EDUCATION di bawah ini untuk membuka jendela unduhan APK secara langsung.
              </p>
            </div>
            <div className="text-xs sm:text-sm text-[#3E4856] flex items-center gap-2 shrink-0">
              <Smartphone className="w-4 h-4 text-[#0F6E66] shrink-0" />
              <span>Tersedia untuk Android</span>
              <span aria-hidden="true">·</span>
              <span className="font-semibold text-[#141A23]">Format APK Resmi</span>
            </div>
          </div>

          {/* Clickable Official Banner (Dark #141A23 frame preserves white "TOMOYO PARENT" text, yellow "APK", pill button, and panda mascot intact) */}
          <div className="rounded-2xl bg-[#141A23] border border-[#242D3C] p-4 sm:p-6 lg:p-8 shadow-md">
            <button
              type="button"
              onClick={() => setModalOpen(true)}
              aria-label="Klik untuk membuka pop-up Download Aplikasi TOMOYO EDUCATION APK Android"
              data-testid="apk-banner-trigger"
              className="group block w-full rounded-xl overflow-hidden focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#FDE68A] transition-transform duration-200 hover:scale-[1.008] active:scale-[0.996] cursor-pointer"
            >
              <picture>
                <source srcSet={TOMOYO_APK_BANNER_WEBP} type="image/webp" />
                <img
                  src={TOMOYO_APK_BANNER_PNG}
                  alt={TOMOYO_APK_SEO.bannerAlt}
                  width={3264}
                  height={689}
                  className="w-full h-auto object-contain block"
                  referrerPolicy="no-referrer"
                />
              </picture>
            </button>

            <div className="mt-5 pt-4 border-t border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-2.5 text-xs sm:text-sm text-slate-200">
                <ShieldCheck className="w-4 h-4 text-[#FDE68A] shrink-0" />
                <span>
                  Klik banner di atas atau tombol Download APK untuk mengunduh file APK resmi TOMOYO EDUCATION.
                </span>
              </div>
              <button
                type="button"
                onClick={() => setModalOpen(true)}
                className="inline-flex items-center justify-center gap-2 px-5 py-2.5 min-h-[44px] text-sm font-semibold text-white bg-[#A61B38] hover:bg-[#88132B] rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
              >
                <Download className="w-4 h-4 shrink-0" />
                <span>Download APK</span>
              </button>
            </div>
          </div>

          {/* App Specification & Official Verification Strip */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
            <article className="lg:col-span-7 editorial-card rounded-2xl p-6 sm:p-8 space-y-5">
              <div className="space-y-1.5">
                <p className="text-xs font-semibold tracking-[0.14em] text-[#0F6E66] uppercase">
                  Keaslian &amp; Dukungan Perangkat
                </p>
                <h2 className="font-display text-2xl sm:text-3xl font-bold text-[#141A23]">
                  Aplikasi Resmi {BRAND_IDENTITY.shortName} untuk Android
                </h2>
              </div>

              <p className="text-sm sm:text-base text-[#3E4856] leading-relaxed">
                Aplikasi <strong>TOMOYO EDUCATION</strong> (TOMOYO Parent) merupakan aplikasi resmi yang diterbitkan oleh <strong>{BRAND_IDENTITY.officialName}</strong> guna mempermudah orang tua dan siswa di Indramayu mengakses layanan privat dan bimbingan belajar langsung dari perangkat smartphone Android.
              </p>

              <ul className="space-y-3 pt-1">
                <li className="flex items-start gap-3 text-sm sm:text-base text-[#141A23]">
                  <CheckCircle2 className="w-5 h-5 text-[#0F6E66] shrink-0 mt-0.5" />
                  <span>
                    <strong>Tersedia Khusus untuk Android:</strong> Dirancang untuk smartphone Android dalam format installer APK resmi.
                  </span>
                </li>
                <li className="flex items-start gap-3 text-sm sm:text-base text-[#141A23]">
                  <CheckCircle2 className="w-5 h-5 text-[#0F6E66] shrink-0 mt-0.5" />
                  <span>
                    <strong>Aplikasi Privat &amp; Bimbel TOMOYO:</strong> Terhubung dengan informasi program belajar, jadwal kelas, kuis online, pengumuman, dan layanan pendaftaran orang tua.
                  </span>
                </li>
                <li className="flex items-start gap-3 text-sm sm:text-base text-[#141A23]">
                  <CheckCircle2 className="w-5 h-5 text-[#0F6E66] shrink-0 mt-0.5" />
                  <span>
                    <strong>Tautan Unduhan Terverifikasi:</strong> File APK hanya dibagikan melalui saluran resmi website TOMOYO EDUCATION dan Google Drive resmi lembaga.
                  </span>
                </li>
              </ul>
            </article>

            <aside className="lg:col-span-5 editorial-card rounded-2xl p-6 sm:p-8 flex flex-col justify-between gap-6">
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <img
                    src={BRAND_IDENTITY.emblemLogoPath}
                    alt="Emblem Resmi TOMOYO EDUCATION"
                    loading="lazy"
                    decoding="async"
                    className="w-12 h-12 rounded-xl border border-[#E5E2D9] bg-white p-1 object-contain shrink-0"
                    referrerPolicy="no-referrer"
                  />
                  <div>
                    <h3 className="font-display text-xl font-bold text-[#141A23]">
                      Informasi Paket Aplikasi
                    </h3>
                    <p className="text-xs text-[#646F7E]">TOMOYO Education Android</p>
                  </div>
                </div>

                <dl className="divide-y divide-[#E5E2D9] text-sm">
                  {TOMOYO_APK_SPEC_ITEMS.map((spec) => (
                    <div key={spec.label} className="py-3 flex items-baseline justify-between gap-4">
                      <dt className="text-[#646F7E] font-medium">{spec.label}</dt>
                      <dd className="text-[#141A23] font-semibold text-right">{spec.value}</dd>
                    </div>
                  ))}
                </dl>
              </div>

              <button
                type="button"
                onClick={() => setModalOpen(true)}
                className="inline-flex items-center justify-center gap-2.5 w-full px-5 py-3 min-h-[46px] text-sm font-semibold text-white bg-[#141A23] hover:bg-[#A61B38] rounded-xl transition-colors cursor-pointer"
              >
                <FileCheck2 className="w-4 h-4 shrink-0" />
                <span>Buka Pop-Up Download APK</span>
              </button>
            </aside>
          </div>
        </div>
      </section>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <BatikPaomanDivider />
      </div>

      {/* Installation Guide Section */}
      <section id="panduan-instalasi" className="py-12 sm:py-16">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
          <div className="max-w-2xl space-y-2 pb-5 border-b border-[#E5E2D9]">
            <p className="text-xs font-semibold tracking-[0.14em] text-[#A61B38] uppercase">
              Panduan Pemasangan
            </p>
            <h2 className="font-display text-2xl sm:text-4xl font-bold tracking-tight text-[#141A23]">
              Cara Instal APK TOMOYO EDUCATION di Android
            </h2>
            <p className="text-sm sm:text-base text-[#3E4856] leading-relaxed">
              Ikuti empat langkah sederhana berikut untuk mengunduh dan memasang aplikasi TOMOYO EDUCATION pada smartphone Android Anda.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {TOMOYO_APK_INSTALL_STEPS.map((step) => (
              <article
                key={step.stepNumber}
                className="editorial-card rounded-2xl p-6 space-y-2.5"
              >
                <div className="flex items-center gap-3">
                  <span className="font-mono text-sm font-bold text-[#A61B38] tabular-nums">
                    LANGKAH {step.stepNumber}
                  </span>
                </div>
                <h3 className="font-display text-xl font-bold text-[#141A23]">
                  {step.title}
                </h3>
                <p className="text-sm text-[#3E4856] leading-relaxed">
                  {step.description}
                </p>
              </article>
            ))}
          </div>

          {/* Support & Internal Links Card */}
          <div className="editorial-card-subtle rounded-2xl p-6 sm:p-8 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
            <div className="space-y-1.5 max-w-2xl">
              <h3 className="font-display text-xl sm:text-2xl font-bold text-[#141A23]">
                Butuh Bantuan Instalasi atau Informasi Layanan?
              </h3>
              <p className="text-sm text-[#3E4856] leading-relaxed">
                Jika Anda mengalami kendala saat mengunduh atau memasang aplikasi Android TOMOYO EDUCATION, hubungi admin resmi kami atau jelajahi layanan website terlebih dahulu.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-3 shrink-0">
              <a
                href={waUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center gap-2 px-5 py-2.5 min-h-[44px] text-sm font-semibold text-white bg-[#0F6E66] hover:bg-[#115E59] rounded-xl transition-colors whitespace-nowrap"
              >
                <WhatsAppBrandIcon className="w-4 h-4 shrink-0" />
                <span>WhatsApp {waDisplay}</span>
              </a>
              <Link
                to="/program"
                className="inline-flex items-center justify-center gap-1.5 px-4 py-2.5 min-h-[44px] text-sm font-semibold text-[#141A23] bg-white border border-[#E5E2D9] hover:border-[#141A23] rounded-xl transition-colors whitespace-nowrap"
              >
                <span>Program Belajar</span>
                <ArrowRight className="w-4 h-4 shrink-0" />
              </Link>
              <Link
                to="/daftar"
                className="inline-flex items-center justify-center gap-1.5 px-4 py-2.5 min-h-[44px] text-sm font-semibold text-[#A61B38] bg-white border border-[#E5E2D9] hover:border-[#A61B38] rounded-xl transition-colors whitespace-nowrap"
              >
                <span>Daftar Siswa</span>
              </Link>
            </div>
          </div>
        </div>
      </section>

      <ApkDownloadModal open={modalOpen} onClose={() => setModalOpen(false)} />
    </div>
  );
}
