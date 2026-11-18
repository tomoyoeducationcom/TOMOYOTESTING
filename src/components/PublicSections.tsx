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
    <section id="program-belajar" className="py-14 sm:py-18">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="max-w-2xl mx-auto text-center space-y-2.5 mb-10">
          <p className="text-xs font-semibold tracking-wider text-rose-700 uppercase">
            Program Resmi
          </p>
          <Heading className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900">
            Tiga Paket Belajar TOMOYO Education
          </Heading>
          <p className="text-sm sm:text-base text-slate-600 leading-relaxed">
            Struktur bimbingan yang terarah sesuai jenjang pendidikan anak, tersedia untuk cabang Indramayu Kota dan Kecamatan Terisi.
          </p>
          {showAllLink && (
            <div className="pt-1">
              <Link
                to="/program"
                className="inline-flex items-center justify-center gap-1.5 text-sm font-semibold text-rose-700 hover:text-rose-800 transition-colors whitespace-nowrap"
              >
                <span>Lihat Detail Program</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          )}
        </div>

        {/* 3 Paket Sejajar Horizontal (3 kolom di layar md ke atas) */}
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
                key={pkg.id}
                className="ios-glass rounded-3xl p-6 sm:p-7 flex flex-col justify-between transition-all duration-200 hover:-translate-y-0.5 hover:shadow-xl"
              >
                <div className="space-y-4">
                  <div className="flex items-center justify-between gap-3 border-b border-slate-200/70 pb-3.5">
                    <span className="font-mono text-xs font-semibold text-slate-500 tabular-nums">
                      0{idx + 1}
                    </span>
                    <span className="text-xs font-semibold text-emerald-700">
                      {pkg.slug === 'paket-1'
                        ? 'CALISTUNG'
                        : pkg.slug === 'paket-3'
                        ? 'Persiapan TKA'
                        : 'Pendampingan Mapel'}
                    </span>
                  </div>

                  <div className="text-center space-y-1.5">
                    <h3 className="text-xl font-extrabold text-slate-900 leading-snug">
                      {pkg.title}
                    </h3>
                    <p className="text-sm font-semibold text-rose-700">
                      {pkg.levelRange === pkg.title.replace(/^PAKET \d+:\s*/, '')
                        ? pkg.programType
                        : `${pkg.levelRange} · ${pkg.programType}`}
                    </p>
                  </div>

                  {hasBranchPrices ? (
                    <div className="ios-glass-subtle rounded-2xl p-3.5 space-y-2 text-xs">
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-semibold text-slate-600">Pusat (Indramayu Kota)</span>
                        <span className="font-mono font-extrabold text-slate-900 tabular-nums">
                          {pricePusat !== null ? formatRupiah(pricePusat) : 'Belum diatur admin'}
                        </span>
                      </div>
                      {notePusat && (
                        <p className="text-[11px] text-slate-500 text-right">{notePusat}</p>
                      )}
                      <div className="flex items-center justify-between gap-2 pt-2 border-t border-slate-200/60">
                        <span className="font-semibold text-slate-600">Cabang (Terisi)</span>
                        <span className="font-mono font-extrabold text-slate-900 tabular-nums">
                          {priceCabang !== null ? formatRupiah(priceCabang) : 'Belum diatur admin'}
                        </span>
                      </div>
                      {noteCabang && (
                        <p className="text-[11px] text-slate-500 text-right">{noteCabang}</p>
                      )}
                    </div>
                  ) : pkg.priceLabel && pkg.priceLabel.trim() !== '' ? (
                    <div className="ios-glass-subtle rounded-2xl px-4 py-3 text-center space-y-0.5">
                      <p className="text-lg font-extrabold text-slate-900 font-mono tabular-nums">
                        {pkg.priceLabel}
                      </p>
                      {pkg.priceNote && pkg.priceNote.trim() !== '' && (
                        <p className="text-xs text-slate-600">{pkg.priceNote}</p>
                      )}
                    </div>
                  ) : (
                    <div className="ios-glass-subtle rounded-2xl px-4 py-2.5 text-center">
                      <p className="text-xs font-medium text-slate-500">
                        Tarif resmi Pusat &amp; Cabang belum diatur oleh admin
                      </p>
                    </div>
                  )}

                  <div className="space-y-2.5 pt-1">
                    <p className="text-xs font-semibold text-slate-500 text-center uppercase tracking-wider">
                      Fokus Pembelajaran
                    </p>
                    <ul className="space-y-2">
                      {pkg.subjects.map((subj) => (
                      <li
                        key={subj}
                        className="flex items-start gap-2.5 text-sm text-slate-800"
                      >
                        <BookOpen className="w-4 h-4 text-rose-700 mt-0.5 shrink-0" />
                        <span>{subj}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {pkg.description && (
                  <p className="text-sm text-slate-600 leading-relaxed pt-3 border-t border-slate-200/70 text-center">
                    {pkg.description}
                  </p>
                )}
              </div>

              <div className="mt-6 pt-4 border-t border-slate-200/70">
                  <Link
                    to={`/daftar?paket=${pkg.slug}`}
                    className="inline-flex items-center justify-center gap-2.5 w-full px-4 py-3 min-h-[48px] text-sm font-bold text-white bg-slate-900 hover:bg-rose-700 rounded-2xl shadow-md transition-colors whitespace-nowrap"
                  >
                    <span className="w-5 h-5 rounded-full bg-white flex items-center justify-center shrink-0">
                      <GoogleOfficialIcon className="w-3.5 h-3.5" />
                    </span>
                    <span>DAFTAR SEKARANG</span>
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
    <section className="py-14 sm:py-18">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="max-w-2xl mx-auto text-center space-y-2.5 mb-10">
          <p className="text-xs font-semibold tracking-wider text-rose-700 uppercase">
            Filosofi Brand
          </p>
          <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900">
            Makna Nama TOMOYO
          </h2>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          <div className="lg:col-span-5 space-y-4">
            <blockquote className="text-lg sm:text-xl font-semibold text-slate-900 leading-relaxed ios-glass-strong rounded-3xl p-6 text-center">
              “{about.subtitle || BRAND_IDENTITY.meaning}”
            </blockquote>
            <p className="text-sm text-slate-600 leading-relaxed ios-glass-subtle rounded-2xl p-5 text-center">
              {about.body || BRAND_IDENTITY.philosophyNote}
            </p>
            {(about.vision || about.mission) && (
              <div className="space-y-4 pt-1">
                {about.vision && (
                  <div className="ios-glass rounded-2xl p-5 text-center">
                    <h3 className="text-sm font-bold text-slate-900 mb-1.5">Visi</h3>
                    <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-line">
                      {about.vision}
                    </p>
                  </div>
                )}
                {about.mission && (
                  <div className="ios-glass rounded-2xl p-5 text-center">
                    <h3 className="text-sm font-bold text-slate-900 mb-1.5">Misi</h3>
                    <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-line">
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
                className="ios-glass rounded-2xl p-5 flex items-start gap-4"
              >
                <span className="w-11 h-11 rounded-xl bg-rose-700 text-white font-extrabold text-xl flex items-center justify-center shrink-0 shadow-sm">
                  {item.letter}
                </span>
                <div>
                  <h3 className="text-base font-bold text-slate-900">{item.word}</h3>
                  <p className="text-sm text-slate-600 mt-0.5 leading-relaxed">{item.meaning}</p>
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
    <section className="py-14 sm:py-18">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="ios-glass-strong rounded-3xl p-6 sm:p-10 grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center">
          <div className="lg:col-span-5 flex justify-center">
            <div className="w-full max-w-sm ios-glass rounded-2xl overflow-hidden p-2">
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

          <div className="lg:col-span-7 space-y-4 text-center lg:text-left">
            <p className="text-xs font-semibold tracking-wider text-rose-700 uppercase">
              Pimpinan Lembaga
            </p>
            <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900">
              {name}
            </h2>
            <p className="text-base font-semibold text-emerald-700">{role}</p>
            <p className="text-sm sm:text-base text-slate-600 leading-relaxed">
              {BRAND_IDENTITY.officialName} hadir sebagai pendamping belajar bagi siswa tingkat TK hingga Kelas 6 SD untuk membangun kemandirian, kepercayaan diri, dan kesiapan akademik yang kuat.
            </p>
            {founder.founderBio && (
              <p className="text-sm sm:text-base text-slate-700 leading-relaxed whitespace-pre-line pt-3 border-t border-slate-200/70">
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
    <section className="py-14 sm:py-18">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="max-w-2xl mx-auto text-center space-y-2.5 mb-10">
          <p className="text-xs font-semibold tracking-wider text-rose-700 uppercase">
            Tenaga Pendidik
          </p>
          <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900">
            Daftar Guru &amp; Pengajar Resmi
          </h2>
          <p className="text-sm sm:text-base text-slate-600 leading-relaxed">
            Tim pengajar resmi {BRAND_IDENTITY.officialName}.
          </p>
          {compact && (
            <div className="pt-1">
              <Link
                to="/guru"
                className="inline-flex items-center justify-center gap-1.5 text-sm font-semibold text-rose-700 hover:text-rose-800 transition-colors whitespace-nowrap"
              >
                <span>Lihat Halaman Guru</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {teachers.map((teacher, idx) => (
            <article
              key={teacher.id}
              className="ios-glass rounded-2xl p-5 flex items-center gap-4"
            >
              {teacher.photoUrl ? (
                <img
                  src={teacher.photoUrl}
                  alt={teacher.name}
                  className="w-14 h-14 rounded-xl object-cover object-top border border-white shrink-0 shadow-sm"
                  referrerPolicy="no-referrer"
                />
              ) : (
                <div className="w-12 h-12 rounded-xl ios-glass-subtle text-slate-700 font-mono text-sm font-bold flex items-center justify-center shrink-0 tabular-nums">
                  {String(idx + 1).padStart(2, '0')}
                </div>
              )}
              <div className="min-w-0">
                <h3 className="text-sm sm:text-base font-bold text-slate-900 leading-snug break-words">
                  {teacher.name}
                </h3>
                {teacher.description && (
                  <p className="mt-1 text-xs sm:text-sm text-slate-600 leading-relaxed">
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
    <section className="py-14 sm:py-18">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="max-w-2xl mx-auto text-center space-y-2.5 mb-10">
          <p className="text-xs font-semibold tracking-wider text-rose-700 uppercase">
            Lokasi Belajar
          </p>
          <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900">
            Cabang Resmi TOMOYO Education
          </h2>
          <p className="text-sm sm:text-base text-slate-600 leading-relaxed">
            Pratinjau peta sesuai titik koordinat masing-masing cabang. Klik Lihat Lokasi untuk membuka rute lengkap di Google Maps.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {branches.map((branch) => (
            <article
              key={branch.id}
              className="ios-glass-strong rounded-3xl p-6 sm:p-7 flex flex-col justify-between gap-5"
            >
              <div className="space-y-2 text-center">
                <div className="inline-flex items-center justify-center gap-1.5 text-xs font-semibold text-emerald-700">
                  <MapPin className="w-4 h-4 shrink-0" />
                  <span>{branch.roleLabel}</span>
                </div>
                <h3 className="text-lg sm:text-xl font-extrabold text-slate-900 leading-snug">
                  {branch.name}
                </h3>
              </div>

              <BranchMapPreview branch={branch} />

              <div className="text-center pt-1">
                <a
                  href={branch.mapsUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center justify-center gap-2 px-6 py-3 min-h-[44px] text-sm font-semibold text-white bg-slate-900 hover:bg-rose-700 rounded-2xl shadow-sm transition-colors whitespace-nowrap"
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
    <section className="py-14 sm:py-18">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="ios-glass-strong rounded-3xl p-6 sm:p-10 grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
          <div className="lg:col-span-7 space-y-4 text-center lg:text-left">
            <p className="text-xs font-semibold tracking-wider text-rose-700 uppercase">
              Pendaftaran &amp; Informasi
            </p>
            <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900">
              Siap Mendaftarkan Putra-Putri Anda?
            </h2>
            <p className="text-sm sm:text-base text-slate-600 leading-relaxed max-w-xl mx-auto lg:mx-0">
              Orang tua dapat masuk menggunakan akun Google untuk mengisi formulir pendaftaran satu atau beberapa anak sekaligus serta memantau status persetujuan secara langsung.
            </p>
            <div className="flex flex-wrap items-center justify-center lg:justify-start gap-3 pt-2">
              <Link
                to="/daftar"
                className="inline-flex items-center justify-center gap-2.5 px-6 py-3 min-h-[48px] text-sm font-bold text-white bg-rose-700 hover:bg-rose-800 rounded-2xl shadow-md transition-colors whitespace-nowrap"
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
                className="inline-flex items-center justify-center gap-2 px-5 py-3 min-h-[48px] text-sm font-semibold text-emerald-800 bg-emerald-50/85 border border-emerald-200 hover:bg-emerald-100 rounded-2xl transition-colors whitespace-nowrap"
              >
                <WhatsAppBrandIcon className="w-4 h-4" />
                <span>Chat WhatsApp {waDisplay}</span>
              </a>
            </div>
          </div>

          <div className="lg:col-span-5 grid grid-cols-1 gap-3 border-t lg:border-t-0 lg:border-l border-slate-200/70 pt-6 lg:pt-0 lg:pl-8">
            <a
              href={`mailto:${email}`}
              className="flex items-center gap-3 p-3.5 rounded-2xl ios-glass-subtle hover:bg-white/90 transition-colors"
            >
              <Mail className="w-5 h-5 text-slate-700 shrink-0" />
              <div className="min-w-0">
                <p className="text-xs font-medium text-slate-500">Email Resmi</p>
                <p className="text-sm font-semibold text-slate-900 truncate">{email}</p>
              </div>
            </a>

            <a
              href={waUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-3 p-3.5 rounded-2xl ios-glass-subtle hover:bg-white/90 transition-colors"
            >
              <WhatsAppBrandIcon className="w-5 h-5 text-emerald-600 shrink-0" />
              <div className="min-w-0">
                <p className="text-xs font-medium text-slate-500">WhatsApp Resmi</p>
                <p className="text-sm font-semibold text-slate-900">{waDisplay}</p>
              </div>
            </a>

            <div className="grid grid-cols-2 gap-3">
              <a
                href={igUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-2 p-3.5 min-h-[48px] rounded-2xl ios-glass-subtle hover:bg-white/90 text-sm font-semibold text-slate-800 transition-colors"
              >
                <InstagramBrandIcon className="w-4 h-4 text-rose-600 shrink-0" />
                <span>Instagram</span>
              </a>
              <a
                href={fbUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-2 p-3.5 min-h-[48px] rounded-2xl ios-glass-subtle hover:bg-white/90 text-sm font-semibold text-slate-800 transition-colors"
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
