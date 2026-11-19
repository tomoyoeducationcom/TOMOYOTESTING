import { Link } from 'react-router-dom';
import { ArrowRight, BookOpen, ExternalLink, Mail, MapPin } from 'lucide-react';
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
    <section id="program-belajar" className="py-14 sm:py-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-10 pb-6 border-b border-[#DFDCD3]">
          <div className="max-w-2xl space-y-2">
            <p className="text-xs font-semibold tracking-[0.14em] text-[#BE123C] uppercase">
              Kurikulum &amp; Program Resmi
            </p>
            <Heading className="font-display text-3xl sm:text-4xl font-bold tracking-tight text-[#121820]">
              Tiga Paket Belajar TOMOYO Education
            </Heading>
            <p className="text-sm sm:text-base text-[#3F4A59] leading-relaxed">
              Struktur bimbingan terarah sesuai jenjang pendidikan anak di Indramayu Kota (Pusat) dan Kecamatan Terisi (Cabang).
            </p>
          </div>
          {showAllLink && (
            <Link
              to="/program"
              className="inline-flex items-center gap-1.5 text-sm font-semibold text-[#BE123C] hover:text-[#9F1239] transition-colors whitespace-nowrap shrink-0"
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
                className="editorial-card rounded-2xl p-6 sm:p-7 flex flex-col justify-between transition-transform duration-200 hover:-translate-y-0.5"
              >
                <div className="space-y-5">
                  <div className="flex items-center justify-between gap-3 border-b border-[#DFDCD3] pb-3.5 text-xs">
                    <span className="font-mono font-semibold text-[#626E7E] tabular-nums">
                      PAKET 0{idx + 1}
                    </span>
                    <span className="font-semibold text-[#0F766E]">
                      {pkg.slug === 'paket-1'
                        ? 'CALISTUNG'
                        : pkg.slug === 'paket-3'
                        ? 'Persiapan TKA'
                        : 'Pendampingan Mapel'}
                    </span>
                  </div>

                  <div className="space-y-1">
                    <h3 className="font-display text-2xl font-bold text-[#121820] leading-snug">
                      {pkg.title}
                    </h3>
                    <p className="text-sm font-medium text-[#BE123C]">
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
                    <div className="editorial-card-subtle rounded-xl p-4 space-y-2.5 text-xs">
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-semibold text-[#3F4A59]">Pusat (Indramayu Kota)</span>
                        <span className="font-mono font-bold text-[#121820] tabular-nums">
                          {pricePusat !== null ? formatRupiah(pricePusat) : 'Belum diatur admin'}
                        </span>
                      </div>
                      {notePusat && (
                        <p className="text-[11px] text-[#626E7E] text-right">{notePusat}</p>
                      )}
                      <div className="flex items-center justify-between gap-2 pt-2.5 border-t border-[#DFDCD3]">
                        <span className="font-semibold text-[#3F4A59]">Cabang (Terisi)</span>
                        <span className="font-mono font-bold text-[#121820] tabular-nums">
                          {priceCabang !== null ? formatRupiah(priceCabang) : 'Belum diatur admin'}
                        </span>
                      </div>
                      {noteCabang && (
                        <p className="text-[11px] text-[#626E7E] text-right">{noteCabang}</p>
                      )}
                    </div>
                  ) : pkg.priceLabel && pkg.priceLabel.trim() !== '' ? (
                    <div className="editorial-card-subtle rounded-xl px-4 py-3 space-y-0.5">
                      <p className="text-lg font-bold text-[#121820] font-mono tabular-nums">
                        {pkg.priceLabel}
                      </p>
                      {pkg.priceNote && pkg.priceNote.trim() !== '' && (
                        <p className="text-xs text-[#626E7E]">{pkg.priceNote}</p>
                      )}
                    </div>
                  ) : (
                    <div className="editorial-card-subtle rounded-xl px-4 py-3">
                      <p className="text-xs font-medium text-[#626E7E]">
                        Tarif resmi Pusat &amp; Cabang diperbarui langsung melalui CMS pengelola.
                      </p>
                    </div>
                  )}

                  <div className="space-y-2.5">
                    <p className="text-xs font-semibold text-[#626E7E] uppercase tracking-wider">
                      Fokus Pembelajaran
                    </p>
                    <ul className="space-y-2">
                      {pkg.subjects.map((subj) => (
                        <li
                          key={subj}
                          className="flex items-start gap-2.5 text-sm text-[#121820]"
                        >
                          <BookOpen className="w-4 h-4 text-[#BE123C] mt-0.5 shrink-0" />
                          <span>{subj}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  {pkg.description && (
                    <p className="text-sm text-[#3F4A59] leading-relaxed pt-3 border-t border-[#DFDCD3]">
                      {pkg.description}
                    </p>
                  )}
                </div>

                <div className="mt-6 pt-4 border-t border-[#DFDCD3]">
                  <Link
                    to={`/daftar?paket=${pkg.slug}`}
                    className="inline-flex items-center justify-center gap-2.5 w-full px-4 py-3 min-h-[46px] text-sm font-semibold text-white bg-[#121820] hover:bg-[#BE123C] rounded-xl transition-colors whitespace-nowrap"
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
    <section className="py-14 sm:py-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-start">
          <div className="lg:col-span-5 space-y-5">
            <div className="space-y-2">
              <p className="text-xs font-semibold tracking-[0.14em] text-[#BE123C] uppercase">
                Filosofi Pendidikan
              </p>
              <h2 className="font-display text-3xl sm:text-4xl font-bold tracking-tight text-[#121820]">
                Makna Nama TOMOYO
              </h2>
            </div>

            <blockquote className="text-lg sm:text-xl font-semibold text-[#121820] leading-relaxed editorial-card rounded-2xl p-6">
              “{about.subtitle || BRAND_IDENTITY.meaning}”
            </blockquote>

            <p className="text-sm text-[#3F4A59] leading-relaxed editorial-card-subtle rounded-2xl p-5">
              {about.body || BRAND_IDENTITY.philosophyNote}
            </p>

            {(about.vision || about.mission) && (
              <div className="space-y-4 pt-1">
                {about.vision && (
                  <div className="editorial-card rounded-2xl p-5">
                    <h3 className="text-sm font-bold text-[#121820] mb-1.5">Visi</h3>
                    <p className="text-sm text-[#3F4A59] leading-relaxed whitespace-pre-line">
                      {about.vision}
                    </p>
                  </div>
                )}
                {about.mission && (
                  <div className="editorial-card rounded-2xl p-5">
                    <h3 className="text-sm font-bold text-[#121820] mb-1.5">Misi</h3>
                    <p className="text-sm text-[#3F4A59] leading-relaxed whitespace-pre-line">
                      {about.mission}
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="lg:col-span-7 grid grid-cols-1 sm:grid-cols-2 gap-4">
            {TOMOYO_PHILOSOPHY.map((item, idx) => (
              <div
                key={`${item.letter}-${idx}`}
                className="editorial-card rounded-2xl p-5 flex items-start gap-4"
              >
                <span className="w-11 h-11 rounded-xl bg-[#121820] text-[#D9F99D] font-display font-bold text-2xl flex items-center justify-center shrink-0">
                  {item.letter}
                </span>
                <div>
                  <h3 className="text-base font-bold text-[#121820]">{item.word}</h3>
                  <p className="text-sm text-[#3F4A59] mt-0.5 leading-relaxed">{item.meaning}</p>
                </div>
              </div>
            ))}
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
    <section className="py-14 sm:py-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="editorial-card rounded-2xl p-6 sm:p-10 grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center">
          <div className="lg:col-span-5 flex justify-center">
            <div className="w-full max-w-sm bg-[#EFECE4] border border-[#DFDCD3] rounded-2xl p-2">
              <div className="aspect-[858/1280] w-full relative rounded-xl overflow-hidden">
                <img
                  src={photoSrc}
                  alt={`${name} — ${role} TOMOYO PRIVAT & BIMBEL EDUCATION`}
                  className="w-full h-full object-cover object-top"
                  referrerPolicy="no-referrer"
                />
              </div>
            </div>
          </div>

          <div className="lg:col-span-7 space-y-4">
            <p className="text-xs font-semibold tracking-[0.14em] text-[#BE123C] uppercase">
              Pimpinan Lembaga
            </p>
            <h2 className="font-display text-3xl sm:text-4xl font-bold tracking-tight text-[#121820]">
              {name}
            </h2>
            <p className="text-sm font-semibold text-[#0F766E]">{role}</p>
            <p className="text-sm sm:text-base text-[#3F4A59] leading-relaxed">
              {BRAND_IDENTITY.officialName} hadir sebagai pendamping belajar bagi siswa tingkat TK hingga Kelas 6 SD untuk membangun kemandirian, kepercayaan diri, dan kesiapan akademik yang kuat.
            </p>
            {founder.founderBio && (
              <p className="text-sm sm:text-base text-[#121820] leading-relaxed whitespace-pre-line pt-4 border-t border-[#DFDCD3]">
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
    <section className="py-14 sm:py-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-10 pb-6 border-b border-[#DFDCD3]">
          <div className="max-w-2xl space-y-2">
            <p className="text-xs font-semibold tracking-[0.14em] text-[#BE123C] uppercase">
              Tenaga Pendidik
            </p>
            <h2 className="font-display text-3xl sm:text-4xl font-bold tracking-tight text-[#121820]">
              Daftar Guru &amp; Pengajar Resmi
            </h2>
            <p className="text-sm sm:text-base text-[#3F4A59] leading-relaxed">
              Tim pengajar resmi {BRAND_IDENTITY.officialName}.
            </p>
          </div>
          {compact && (
            <Link
              to="/guru"
              className="inline-flex items-center gap-1.5 text-sm font-semibold text-[#BE123C] hover:text-[#9F1239] transition-colors whitespace-nowrap shrink-0"
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
              className="editorial-card rounded-2xl p-5 flex items-center gap-4"
            >
              {teacher.photoUrl ? (
                <img
                  src={teacher.photoUrl}
                  alt={teacher.name}
                  className="w-14 h-14 rounded-xl object-cover object-top border border-[#DFDCD3] shrink-0"
                  referrerPolicy="no-referrer"
                />
              ) : (
                <div className="w-12 h-12 rounded-xl bg-[#EFECE4] border border-[#DFDCD3] text-[#121820] font-mono text-sm font-bold flex items-center justify-center shrink-0 tabular-nums">
                  {String(idx + 1).padStart(2, '0')}
                </div>
              )}
              <div className="min-w-0">
                <h3 className="text-sm sm:text-base font-bold text-[#121820] leading-snug break-words">
                  {teacher.name}
                </h3>
                {teacher.description && (
                  <p className="mt-1 text-xs sm:text-sm text-[#3F4A59] leading-relaxed">
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
    <section className="py-14 sm:py-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="max-w-2xl space-y-2 mb-10 pb-6 border-b border-[#DFDCD3]">
          <p className="text-xs font-semibold tracking-[0.14em] text-[#BE123C] uppercase">
            Lokasi Belajar di Indramayu
          </p>
          <h2 className="font-display text-3xl sm:text-4xl font-bold tracking-tight text-[#121820]">
            Cabang Resmi TOMOYO Education
          </h2>
          <p className="text-sm sm:text-base text-[#3F4A59] leading-relaxed">
            Pratinjau peta sesuai titik koordinat masing-masing cabang. Klik tombol di bawah peta untuk membuka rute Google Maps.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {branches.map((branch) => (
            <article
              key={branch.id}
              className="editorial-card rounded-2xl p-6 sm:p-7 flex flex-col justify-between gap-5"
            >
              <div className="space-y-1.5">
                <div className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#0F766E]">
                  <MapPin className="w-4 h-4 shrink-0" />
                  <span>{branch.roleLabel} · Kabupaten Indramayu</span>
                </div>
                <h3 className="font-display text-2xl font-bold text-[#121820] leading-snug">
                  {branch.name}
                </h3>
              </div>

              <BranchMapPreview branch={branch} />

              <div className="pt-1">
                <a
                  href={branch.mapsUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center justify-center gap-2 px-5 py-3 min-h-[44px] text-sm font-semibold text-white bg-[#121820] hover:bg-[#BE123C] rounded-xl transition-colors whitespace-nowrap"
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
    <section className="py-14 sm:py-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="editorial-card rounded-2xl p-6 sm:p-10 grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
          <div className="lg:col-span-7 space-y-4">
            <p className="text-xs font-semibold tracking-[0.14em] text-[#BE123C] uppercase">
              Pendaftaran &amp; Informasi
            </p>
            <h2 className="font-display text-3xl sm:text-4xl font-bold tracking-tight text-[#121820]">
              Siap Mendaftarkan Putra-Putri Anda?
            </h2>
            <p className="text-sm sm:text-base text-[#3F4A59] leading-relaxed max-w-xl">
              Orang tua dapat masuk menggunakan akun Google untuk mengisi formulir pendaftaran satu atau beberapa anak sekaligus serta memantau status persetujuan secara langsung.
            </p>
            <div className="flex flex-wrap items-center gap-3 pt-2">
              <Link
                to="/daftar"
                className="inline-flex items-center justify-center gap-2.5 px-6 py-3 min-h-[48px] text-sm font-semibold text-white bg-[#BE123C] hover:bg-[#9F1239] rounded-xl transition-colors whitespace-nowrap"
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
                className="inline-flex items-center justify-center gap-2 px-5 py-3 min-h-[48px] text-sm font-semibold text-[#0F766E] bg-[#EFECE4] border border-[#DFDCD3] hover:border-[#0F766E] rounded-xl transition-colors whitespace-nowrap"
              >
                <WhatsAppBrandIcon className="w-4 h-4" />
                <span>Chat WhatsApp {waDisplay}</span>
              </a>
            </div>
          </div>

          <div className="lg:col-span-5 grid grid-cols-1 gap-3 border-t lg:border-t-0 lg:border-l border-[#DFDCD3] pt-6 lg:pt-0 lg:pl-8">
            <a
              href={`mailto:${email}`}
              className="flex items-center gap-3 p-3.5 rounded-xl editorial-card-subtle hover:border-[#121820] transition-colors"
            >
              <Mail className="w-5 h-5 text-[#121820] shrink-0" />
              <div className="min-w-0">
                <p className="text-xs font-medium text-[#626E7E]">Email Resmi</p>
                <p className="text-sm font-semibold text-[#121820] truncate">{email}</p>
              </div>
            </a>

            <a
              href={waUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-3 p-3.5 rounded-xl editorial-card-subtle hover:border-[#0F766E] transition-colors"
            >
              <WhatsAppBrandIcon className="w-5 h-5 text-emerald-600 shrink-0" />
              <div className="min-w-0">
                <p className="text-xs font-medium text-[#626E7E]">WhatsApp Resmi</p>
                <p className="text-sm font-semibold text-[#121820] font-mono tabular-nums">{waDisplay}</p>
              </div>
            </a>

            <div className="grid grid-cols-2 gap-3">
              <a
                href={igUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-2 p-3.5 min-h-[48px] rounded-xl editorial-card-subtle hover:border-[#121820] text-sm font-semibold text-[#121820] transition-colors"
              >
                <InstagramBrandIcon className="w-4 h-4 text-[#BE123C] shrink-0" />
                <span>Instagram</span>
              </a>
              <a
                href={fbUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-2 p-3.5 min-h-[48px] rounded-xl editorial-card-subtle hover:border-[#121820] text-sm font-semibold text-[#121820] transition-colors"
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
