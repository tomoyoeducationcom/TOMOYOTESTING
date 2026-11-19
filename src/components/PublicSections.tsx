import { Link } from 'react-router-dom';
import { ArrowRight, ExternalLink, Mail, MapPin } from 'lucide-react';
import {
  BRAND_IDENTITY,
  BranchLocation,
  LearningPackage,
  SiteContentSection,
  TOMOYO_PHILOSOPHY,
  TeacherProfile,
  formatRupiah,
  getPackagePriceForBranch,
  getPackagePriceNoteForBranch,
  parseRupiahAmount,
} from '../lib/domain';
import {
  FacebookBrandIcon,
  GoogleOfficialIcon,
  InstagramBrandIcon,
  WhatsAppBrandIcon,
} from './BrandIcons';
import { BranchMapPreview } from './BranchMapPreview';
import { BatikPaomanFloating, GeometricMeshBackdrop } from './IndramayuMotifs';

export function PackagesSection({
  packages,
  headingTag = 'h2',
  showAllLink = false,
}: {
  packages: LearningPackage[];
  headingTag?: 'h1' | 'h2';
  showAllLink?: boolean;
}) {
  const Heading = headingTag;
  return (
    <section id="program-belajar" className="relative overflow-hidden py-14 sm:py-20">
      <GeometricMeshBackdrop
        tone="light"
        className="inset-x-0 bottom-0 h-44 sm:h-56 opacity-[0.22]"
      />
      <BatikPaomanFloating
        tone="indigo"
        tiltDeg={-15}
        animation="slow"
        className="absolute top-4 -right-6 sm:top-6 sm:-right-8 lg:right-4"
        imgClassName="w-20 sm:w-24 lg:w-32 opacity-[0.13] sm:opacity-[0.16]"
      />
      <BatikPaomanFloating
        tone="indigo"
        tiltDeg={18}
        flipX
        animation="reverse"
        className="hidden lg:block absolute bottom-6 -left-10 xl:left-2"
        imgClassName="w-24 xl:w-28 opacity-[0.14]"
      />
      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-10 pb-6 border-b border-[#E5E2D9]">
          <div className="max-w-2xl space-y-2">
            <p className="text-xs font-semibold tracking-[0.14em] text-[#A61B38] uppercase">
              Kurikulum &amp; Program Resmi
            </p>
            <Heading className="font-display text-3xl sm:text-4xl font-bold tracking-tight text-[#141A23]">
              Tiga Paket Belajar TOMOYO Education
            </Heading>
            <p className="text-sm sm:text-base text-[#3E4856] leading-relaxed">
              Struktur bimbingan terarah sesuai jenjang pendidikan anak di Indramayu Kota (Pusat) dan Kecamatan Terisi (Cabang).
            </p>
          </div>
          {showAllLink && (
            <Link
              to="/program"
              className="inline-flex items-center gap-1.5 text-sm font-semibold text-[#A61B38] hover:text-[#88132B] transition-colors whitespace-nowrap shrink-0"
            >
              <span>Lihat Detail Program</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-stretch">
          {packages.map((pkg, idx) => {
            const explicitPusat = parseRupiahAmount(pkg.pricePusat);
            const explicitCabang = parseRupiahAmount(pkg.priceCabang);
            const hasBranchPrices = explicitPusat !== null || explicitCabang !== null;
            const pricePusat = getPackagePriceForBranch(pkg, 'indramayu-kota');
            const priceCabang = getPackagePriceForBranch(pkg, 'terisi');
            const notePusat = getPackagePriceNoteForBranch(pkg, 'indramayu-kota');
            const noteCabang = getPackagePriceNoteForBranch(pkg, 'terisi');

            return (
              <article
                id={`paket-${idx + 1}`}
                key={pkg.id}
                className="editorial-card rounded-xl p-6 sm:p-7 flex flex-col justify-between transition-colors duration-200 hover:border-[#141A23]/40"
              >
                <div className="space-y-5">
                  <div className="flex items-center justify-between gap-3 border-b border-[#E5E2D9] pb-3.5 text-xs">
                    <span className="font-mono font-semibold text-[#646F7E] tabular-nums">
                      0{idx + 1} · PAKET BELAJAR
                    </span>
                    <span className="font-semibold text-[#0F6E66]">
                      {pkg.slug === 'paket-1'
                        ? 'CALISTUNG'
                        : pkg.slug === 'paket-3'
                        ? 'Persiapan TKA'
                        : 'Pendampingan Mapel'}
                    </span>
                  </div>

                  <div className="space-y-1.5">
                    <h3 className="font-display text-2xl font-bold text-[#141A23] leading-snug">
                      {pkg.title}
                    </h3>
                    <p className="text-sm font-medium text-[#A61B38]">
                      {(() => {
                        const cleanTitleRange = pkg.title.replace(/^PAKET \d+:\s*/i, '').trim().toLowerCase();
                        const lr = pkg.levelRange.trim();
                        const pt = pkg.programType.trim();
                        if (lr.toLowerCase() === cleanTitleRange) return pt;
                        if (lr.toLowerCase().includes(pt.toLowerCase()) || pt.toLowerCase().includes(lr.toLowerCase())) {
                          return lr.length >= pt.length ? lr : pt;
                        }
                        return `${lr} · ${pt}`;
                      })()}
                    </p>
                  </div>

                  {hasBranchPrices ? (
                    <div className="border-t border-b border-[#E5E2D9] py-3.5 space-y-2.5 text-xs">
                      <div className="flex items-baseline justify-between gap-2">
                        <span className="font-semibold text-[#3E4856]">Pusat (Indramayu Kota)</span>
                        <span className="font-mono font-bold text-sm text-[#141A23] tabular-nums">
                          {pricePusat !== null ? formatRupiah(pricePusat) : 'Belum diatur admin'}
                        </span>
                      </div>
                      {notePusat && (
                        <p className="text-[11px] text-[#646F7E] text-right">{notePusat}</p>
                      )}
                      <div className="flex items-baseline justify-between gap-2 pt-2.5 border-t border-[#E5E2D9]/70">
                        <span className="font-semibold text-[#3E4856]">Cabang (Terisi)</span>
                        <span className="font-mono font-bold text-sm text-[#141A23] tabular-nums">
                          {priceCabang !== null ? formatRupiah(priceCabang) : 'Belum diatur admin'}
                        </span>
                      </div>
                      {noteCabang && (
                        <p className="text-[11px] text-[#646F7E] text-right">{noteCabang}</p>
                      )}
                    </div>
                  ) : pkg.priceLabel && pkg.priceLabel.trim() !== '' ? (
                    <div className="border-t border-b border-[#E5E2D9] py-3 space-y-0.5">
                      <p className="text-lg font-bold text-[#141A23] font-mono tabular-nums">
                        {pkg.priceLabel}
                      </p>
                      {pkg.priceNote && pkg.priceNote.trim() !== '' && (
                        <p className="text-xs text-[#646F7E]">{pkg.priceNote}</p>
                      )}
                    </div>
                  ) : (
                    <div className="border-t border-b border-[#E5E2D9] py-3">
                      <p className="text-xs text-[#646F7E]">
                        Tarif resmi Pusat &amp; Cabang diperbarui melalui CMS pengelola.
                      </p>
                    </div>
                  )}

                  <div className="space-y-2.5">
                    <p className="text-xs font-semibold text-[#646F7E] uppercase tracking-wider">
                      Fokus Pembelajaran
                    </p>
                    <ul className="space-y-2">
                      {pkg.subjects.map((subj) => (
                        <li
                          key={subj}
                          className="flex items-start gap-2.5 text-sm text-[#141A23]"
                        >
                          <span aria-hidden="true" className="text-[#A61B38] font-bold leading-5 shrink-0">
                            —
                          </span>
                          <span>{subj}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  {pkg.description && (
                    <p className="text-sm text-[#3E4856] leading-relaxed pt-3 border-t border-[#E5E2D9]">
                      {pkg.description}
                    </p>
                  )}
                </div>

                <div className="mt-6 pt-4 border-t border-[#E5E2D9]">
                  <Link
                    to={`/daftar?paket=${pkg.slug}`}
                    className="inline-flex items-center justify-center gap-2.5 w-full px-4 py-3 min-h-[46px] text-sm font-semibold text-white bg-[#141A23] hover:bg-[#A61B38] rounded-lg transition-colors whitespace-nowrap"
                  >
                    <span className="w-5 h-5 rounded-full bg-white flex items-center justify-center shrink-0">
                      <GoogleOfficialIcon className="w-3.5 h-3.5" />
                    </span>
                    <span>Daftar Paket Ini</span>
                  </Link>
                </div>
              </article>
            );
          })}
        </div>
      </div>
    </section>
  );
}

export function PhilosophySection({ about }: { about: SiteContentSection }) {
  return (
    <section className="relative overflow-hidden py-14 sm:py-20">
      <BatikPaomanFloating
        tone="indigo"
        tiltDeg={14}
        animation="reverse"
        className="hidden md:block absolute top-10 -left-8 lg:left-2"
        imgClassName="w-24 lg:w-32 opacity-[0.15]"
      />
      <BatikPaomanFloating
        tone="indigo"
        tiltDeg={-22}
        flipX
        animation="slow"
        className="hidden sm:block absolute -bottom-10 right-2 lg:right-12"
        imgClassName="w-24 lg:w-32 opacity-[0.15]"
      />
      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-14 items-start">
          <div className="lg:col-span-5 space-y-6">
            <div className="space-y-2">
              <p className="text-xs font-semibold tracking-[0.14em] text-[#A61B38] uppercase">
                Filosofi Pendidikan
              </p>
              <h2 className="font-display text-3xl sm:text-4xl font-bold tracking-tight text-[#141A23]">
                Makna Nama TOMOYO
              </h2>
            </div>

            <blockquote className="font-display text-xl sm:text-2xl font-semibold text-[#141A23] leading-snug border-t border-b border-[#E5E2D9] py-5">
              “{about.subtitle || BRAND_IDENTITY.meaning}”
            </blockquote>

            <p className="text-sm sm:text-base text-[#3E4856] leading-relaxed">
              {about.body || BRAND_IDENTITY.philosophyNote}
            </p>

            {(about.vision || about.mission) && (
              <div className="space-y-5 pt-2 border-t border-[#E5E2D9]">
                {about.vision && (
                  <div className="pt-2">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-[#A61B38] mb-1.5">
                      Visi Lembaga
                    </h3>
                    <p className="text-sm text-[#3E4856] leading-relaxed whitespace-pre-line">
                      {about.vision}
                    </p>
                  </div>
                )}
                {about.mission && (
                  <div className="pt-2 border-t border-[#E5E2D9]/70">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-[#A61B38] mb-1.5">
                      Misi Lembaga
                    </h3>
                    <p className="text-sm text-[#3E4856] leading-relaxed whitespace-pre-line">
                      {about.mission}
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* 2-Column Clean Typographic Acrostic Directory (No Neon Letter Boxes) */}
          <div className="lg:col-span-7 editorial-card rounded-xl p-6 sm:p-8">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-2">
              {TOMOYO_PHILOSOPHY.map((item, idx) => (
                <div
                  key={`${item.letter}-${idx}`}
                  className="py-4 border-b border-[#E5E2D9] last:border-b-0 sm:[&:nth-last-child(-n+2)]:border-b-0 flex items-baseline gap-4"
                >
                  <span className="font-display text-3xl font-bold text-[#A61B38] w-8 shrink-0">
                    {item.letter}
                  </span>
                  <div>
                    <h3 className="text-base font-bold text-[#141A23]">{item.word}</h3>
                    <p className="text-sm text-[#3E4856] mt-0.5 leading-relaxed">{item.meaning}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

export function FounderSection({ founder }: { founder: SiteContentSection }) {
  const photoSrc = founder.founderPhotoUrl || BRAND_IDENTITY.founderPhotoPath;
  const name = founder.founderName || BRAND_IDENTITY.founderName;
  const role = founder.founderRole || BRAND_IDENTITY.founderRole;

  return (
    <section className="relative overflow-hidden py-14 sm:py-20">
      <BatikPaomanFloating
        tone="indigo"
        tiltDeg={-18}
        animation="slow"
        className="hidden sm:block absolute top-4 right-2 lg:right-10"
        imgClassName="w-24 lg:w-32 opacity-[0.17]"
      />
      <BatikPaomanFloating
        tone="indigo"
        tiltDeg={24}
        flipX
        animation="reverse"
        className="hidden lg:block absolute bottom-4 left-2"
        imgClassName="w-24 opacity-[0.13]"
      />
      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="editorial-card rounded-xl p-6 sm:p-10 grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center">
          <div className="lg:col-span-5 flex justify-center">
            <div className="aspect-[858/1280] w-full max-w-sm rounded-lg overflow-hidden border border-[#E5E2D9] bg-[#F2EFE9]">
              <img
                src={photoSrc}
                alt={`${name} — ${role} TOMOYO PRIVAT & BIMBEL EDUCATION`}
                className="w-full h-full object-cover object-top"
                referrerPolicy="no-referrer"
              />
            </div>
          </div>

          <div className="lg:col-span-7 space-y-4">
            <p className="text-xs font-semibold tracking-[0.14em] text-[#A61B38] uppercase">
              Pimpinan Lembaga
            </p>
            <h2 className="font-display text-3xl sm:text-4xl font-bold tracking-tight text-[#141A23]">
              {name}
            </h2>
            <p className="text-sm font-semibold text-[#0F6E66]">{role}</p>
            <p className="text-sm sm:text-base text-[#3E4856] leading-relaxed">
              {BRAND_IDENTITY.officialName} hadir sebagai pendamping belajar bagi siswa tingkat TK hingga Kelas 6 SD untuk membangun kemandirian, kepercayaan diri, dan kesiapan akademik yang kuat.
            </p>
            {founder.founderBio && (
              <p className="text-sm sm:text-base text-[#141A23] leading-relaxed whitespace-pre-line pt-4 border-t border-[#E5E2D9]">
                {founder.founderBio}
              </p>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}

export function TeachersSection({
  teachers,
  compact = false,
}: {
  teachers: TeacherProfile[];
  compact?: boolean;
}) {
  return (
    <section className="relative overflow-hidden py-14 sm:py-20">
      <BatikPaomanFloating
        tone="indigo"
        tiltDeg={16}
        flipX
        animation="slow"
        className="hidden sm:block absolute top-8 right-4 lg:right-12"
        imgClassName="w-24 lg:w-32 opacity-[0.15]"
      />
      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-10 pb-6 border-b border-[#E5E2D9]">
          <div className="max-w-2xl space-y-2">
            <p className="text-xs font-semibold tracking-[0.14em] text-[#A61B38] uppercase">
              Tenaga Pendidik
            </p>
            <h2 className="font-display text-3xl sm:text-4xl font-bold tracking-tight text-[#141A23]">
              Daftar Guru &amp; Pengajar Resmi
            </h2>
            <p className="text-sm sm:text-base text-[#3E4856] leading-relaxed">
              Tim pengajar resmi {BRAND_IDENTITY.officialName}.
            </p>
          </div>
          {compact && (
            <Link
              to="/guru"
              className="inline-flex items-center gap-1.5 text-sm font-semibold text-[#A61B38] hover:text-[#88132B] transition-colors whitespace-nowrap shrink-0"
            >
              <span>Lihat Halaman Guru</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {teachers.map((teacher, idx) => (
            <article
              key={teacher.id}
              className="editorial-card rounded-xl p-5 flex items-center gap-4 hover:border-[#141A23]/40 transition-colors"
            >
              {teacher.photoUrl ? (
                <img
                  src={teacher.photoUrl}
                  alt={teacher.name}
                  className="w-14 h-14 rounded-lg object-cover object-top border border-[#E5E2D9] shrink-0"
                  referrerPolicy="no-referrer"
                />
              ) : (
                <div className="w-11 h-11 rounded-lg bg-[#F2EFE9] border border-[#E5E2D9] text-[#A61B38] font-mono text-sm font-bold flex items-center justify-center shrink-0 tabular-nums">
                  {String(idx + 1).padStart(2, '0')}
                </div>
              )}
              <div className="min-w-0">
                <h3 className="text-sm sm:text-base font-bold text-[#141A23] leading-snug break-words">
                  {teacher.name}
                </h3>
                {teacher.description && (
                  <p className="mt-1 text-xs sm:text-sm text-[#3E4856] leading-relaxed">
                    {teacher.description}
                  </p>
                )}
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

export function BranchesSection({ branches }: { branches: BranchLocation[] }) {
  return (
    <section className="relative overflow-hidden py-14 sm:py-20">
      <GeometricMeshBackdrop
        tone="light"
        className="inset-x-0 bottom-0 h-44 sm:h-52 opacity-[0.2]"
      />
      <BatikPaomanFloating
        tone="indigo"
        tiltDeg={-14}
        animation="reverse"
        className="hidden md:block absolute top-6 right-4 lg:right-14"
        imgClassName="w-24 lg:w-32 opacity-[0.16]"
      />
      <BatikPaomanFloating
        tone="indigo"
        tiltDeg={20}
        flipX
        animation="slow"
        className="hidden lg:block absolute bottom-6 left-2"
        imgClassName="w-24 opacity-[0.14]"
      />
      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="max-w-2xl space-y-2 mb-10 pb-6 border-b border-[#E5E2D9]">
          <p className="text-xs font-semibold tracking-[0.14em] text-[#A61B38] uppercase">
            Lokasi Belajar di Indramayu
          </p>
          <h2 className="font-display text-3xl sm:text-4xl font-bold tracking-tight text-[#141A23]">
            Cabang Resmi TOMOYO Education
          </h2>
          <p className="text-sm sm:text-base text-[#3E4856] leading-relaxed">
            Pratinjau peta sesuai titik koordinat masing-masing cabang. Klik tombol di bawah peta untuk membuka rute Google Maps.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {branches.map((branch) => (
            <article
              key={branch.id}
              className="editorial-card rounded-xl p-6 sm:p-7 flex flex-col justify-between gap-5"
            >
              <div className="space-y-1.5">
                <div className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#0F6E66]">
                  <MapPin className="w-4 h-4 shrink-0" />
                  <span>{branch.roleLabel} · Kabupaten Indramayu</span>
                </div>
                <h3 className="font-display text-2xl font-bold text-[#141A23] leading-snug">
                  {branch.name}
                </h3>
              </div>

              <BranchMapPreview branch={branch} />

              <div className="pt-1">
                <a
                  href={branch.mapsUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center justify-center gap-2 px-5 py-3 min-h-[44px] text-sm font-semibold text-white bg-[#141A23] hover:bg-[#A61B38] rounded-lg transition-colors whitespace-nowrap"
                >
                  <span>Lihat Lokasi di Google Maps</span>
                  <ExternalLink className="w-4 h-4" />
                </a>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

export function ContactSection({ contact }: { contact: SiteContentSection }) {
  const email = contact.email || 'tomoyoeducation.com@gmail.com';
  const waDisplay = contact.whatsappDisplay || '0821-1977-0700';
  const waUrl = contact.whatsappUrl || 'https://wa.me/6282119770700';
  const igUrl =
    contact.instagramUrl || 'https://www.instagram.com/tomoyoeducation?bqrl=cHJsb3RnY3g1c3g2';
  const fbUrl = contact.facebookUrl || 'https://www.facebook.com/share/1CSomr9gXK/';

  return (
    <section className="relative overflow-hidden py-14 sm:py-20">
      <GeometricMeshBackdrop
        tone="light"
        className="inset-x-0 bottom-0 h-44 sm:h-52 opacity-[0.22]"
      />
      <BatikPaomanFloating
        tone="indigo"
        tiltDeg={-19}
        animation="slow"
        className="hidden sm:block absolute top-4 left-2 lg:left-10"
        imgClassName="w-24 lg:w-28 opacity-[0.15]"
      />
      <BatikPaomanFloating
        tone="indigo"
        tiltDeg={16}
        flipX
        animation="reverse"
        className="hidden sm:block absolute bottom-4 right-2 lg:right-10"
        imgClassName="w-24 lg:w-32 opacity-[0.17]"
      />
      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="editorial-card rounded-xl p-6 sm:p-10 grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
          <div className="lg:col-span-7 space-y-4">
            <p className="text-xs font-semibold tracking-[0.14em] text-[#A61B38] uppercase">
              Pendaftaran &amp; Informasi
            </p>
            <h2 className="font-display text-3xl sm:text-4xl font-bold tracking-tight text-[#141A23]">
              Siap Mendaftarkan Putra-Putri Anda?
            </h2>
            <p className="text-sm sm:text-base text-[#3E4856] leading-relaxed max-w-xl">
              Orang tua dapat masuk menggunakan akun Google untuk mengisi formulir pendaftaran satu atau beberapa anak sekaligus serta memantau status persetujuan secara langsung.
            </p>
            <div className="flex flex-wrap items-center gap-3 pt-2">
              <Link
                to="/daftar"
                className="inline-flex items-center justify-center gap-2.5 px-6 py-3 min-h-[46px] text-sm font-semibold text-white bg-[#A61B38] hover:bg-[#88132B] rounded-lg transition-colors whitespace-nowrap"
              >
                <span className="w-5 h-5 rounded-full bg-white flex items-center justify-center shrink-0">
                  <GoogleOfficialIcon className="w-3.5 h-3.5" />
                </span>
                <span>Mulai Pendaftaran</span>
              </Link>
              <a
                href={waUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center gap-2 px-5 py-3 min-h-[46px] text-sm font-semibold text-[#0F6E66] bg-[#FAF9F5] border border-[#E5E2D9] hover:border-[#0F6E66] rounded-lg transition-colors whitespace-nowrap"
              >
                <WhatsAppBrandIcon className="w-4 h-4" />
                <span>Chat WhatsApp {waDisplay}</span>
              </a>
            </div>
          </div>

          <div className="lg:col-span-5 divide-y divide-[#E5E2D9] border-t lg:border-t-0 lg:border-l border-[#E5E2D9] pt-6 lg:pt-0 lg:pl-8">
            <a
              href={`mailto:${email}`}
              className="flex items-center gap-3 py-3.5 first:pt-0 group"
            >
              <Mail className="w-5 h-5 text-[#141A23] group-hover:text-[#A61B38] shrink-0 transition-colors" />
              <div className="min-w-0">
                <p className="text-xs font-medium text-[#646F7E]">Email Resmi</p>
                <p className="text-sm font-semibold text-[#141A23] group-hover:text-[#A61B38] truncate transition-colors">
                  {email}
                </p>
              </div>
            </a>

            <a
              href={waUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-3 py-3.5 group"
            >
              <WhatsAppBrandIcon className="w-5 h-5 text-emerald-600 shrink-0" />
              <div className="min-w-0">
                <p className="text-xs font-medium text-[#646F7E]">WhatsApp Resmi</p>
                <p className="text-sm font-semibold text-[#141A23] group-hover:text-[#0F6E66] font-mono tabular-nums transition-colors">
                  {waDisplay}
                </p>
              </div>
            </a>

            <div className="pt-4 flex flex-wrap items-center gap-3">
              <a
                href={igUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-4 py-2.5 min-h-[42px] rounded-lg bg-[#FAF9F5] border border-[#E5E2D9] hover:border-[#141A23] text-sm font-semibold text-[#141A23] transition-colors"
              >
                <InstagramBrandIcon className="w-4 h-4 text-[#A61B38] shrink-0" />
                <span>Instagram</span>
              </a>
              <a
                href={fbUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-4 py-2.5 min-h-[42px] rounded-lg bg-[#FAF9F5] border border-[#E5E2D9] hover:border-[#141A23] text-sm font-semibold text-[#141A23] transition-colors"
              >
                <FacebookBrandIcon className="w-4 h-4 text-blue-600 shrink-0" />
                <span>Facebook</span>
              </a>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
