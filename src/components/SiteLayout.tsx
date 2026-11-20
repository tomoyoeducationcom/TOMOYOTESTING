import React, { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Mail, Menu, X } from 'lucide-react';
import { BRAND_IDENTITY } from '../lib/domain';
import { useAuth } from '../context/AuthContext';
import { useSiteData } from '../context/SiteDataContext';
import {
  FacebookBrandIcon,
  GoogleOfficialIcon,
  InstagramBrandIcon,
  WhatsAppBrandIcon,
} from './BrandIcons';
import {
  BatikPaomanDivider,
  BatikPaomanFloating,
  GeometricMeshBackdrop,
  IndramayuHorizonCrest,
} from './IndramayuMotifs';
import { TomoyoAssistantWidget } from './TomoyoAssistantWidget';

const TOP_NAV_LINKS = [
  { to: '/', label: 'Beranda' },
  { to: '/program', label: 'Program' },
  { to: '/kuis', label: 'Kuis' },
  { to: '/guru', label: 'Guru' },
  { to: '/cabang', label: 'Cabang' },
  { to: '/kontak', label: 'Kontak' },
  { to: '/download-apk', label: 'Download APK' },
];

const DRAWER_NAV_LINKS = [
  { to: '/', label: 'Beranda' },
  { to: '/tentang', label: 'Tentang & Filosofi' },
  { to: '/founder', label: 'Profil Founder & CEO' },
  { to: '/program', label: 'Program & Paket Belajar' },
  { to: '/kuis', label: 'Kuis Online Siswa' },
  { to: '/guru', label: 'Daftar Guru' },
  { to: '/galeri', label: 'Galeri Kegiatan' },
  { to: '/pengumuman', label: 'Pengumuman' },
  { to: '/jadwal', label: 'Jadwal Belajar' },
  { to: '/cabang', label: 'Cabang & Lokasi' },
  { to: '/kontak', label: 'Kontak Resmi' },
  { to: '/daftar', label: 'Pendaftaran Siswa' },
  { to: '/download-apk', label: 'Download APK Android' },
  { to: '/peta-situs', label: 'Peta Situs' },
];

export function SiteLayout({ children }: { children: React.ReactNode }) {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const { pathname } = useLocation();
  const { user } = useAuth();
  const { data } = useSiteData();
  const contact = data.contact;

  useEffect(() => {
    setDrawerOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!drawerOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setDrawerOpen(false);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [drawerOpen]);

  return (
    <div className="min-h-screen flex flex-col bg-[#FAF9F5] text-[#141A23]">
      <header className="sticky top-0 z-40 editorial-header no-print">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 sm:h-[72px] flex items-center justify-between gap-4 lg:gap-8">
          {/* Zone 1: Hamburger button + Official TOMOYO Logo */}
          <div className="flex items-center gap-2.5 sm:gap-3 min-w-0 shrink-0">
            <button
              type="button"
              onClick={() => setDrawerOpen((prev) => !prev)}
              aria-label={drawerOpen ? 'Tutup menu navigasi' : 'Buka menu navigasi'}
              aria-expanded={drawerOpen}
              aria-controls="tomoyo-nav-drawer"
              className="inline-flex items-center justify-center w-10 h-10 rounded-lg bg-white border border-[#E5E2D9] text-[#141A23] hover:border-[#141A23] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#A61B38] transition-colors cursor-pointer shrink-0"
            >
              {drawerOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>

            <Link
              to="/"
              aria-label="TOMOYO PRIVAT & BIMBEL EDUCATION — Beranda"
              className="inline-flex items-center shrink-0 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#A61B38] rounded-md overflow-hidden"
            >
              <img
                src={BRAND_IDENTITY.headerLogoPath}
                alt="TOMOYO PRIVAT & BIMBEL EDUCATION"
                className="h-10 sm:h-11 w-auto max-w-[180px] sm:max-w-none object-contain rounded-md"
                referrerPolicy="no-referrer"
              />
            </Link>
          </div>

          {/* Zone 2: Clean single-line public text navigation links */}
          <nav
            aria-label="Navigasi utama"
            className="hidden lg:flex items-center gap-4 xl:gap-6 text-sm font-medium text-[#3E4856]"
          >
            {TOP_NAV_LINKS.map((item) => {
              const active =
                item.to === '/'
                  ? pathname === '/'
                  : pathname === item.to || pathname.startsWith(`${item.to}/`);
              return (
                <Link
                  key={item.to}
                  to={item.to}
                  className={`py-1.5 whitespace-nowrap shrink-0 border-b-2 transition-colors ${
                    active
                      ? 'text-[#A61B38] border-[#A61B38] font-semibold'
                      : 'border-transparent hover:text-[#141A23] hover:border-[#E5E2D9]'
                  }`}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>

          {/* Zone 3: 1 Primary CTA */}
          <div className="flex items-center shrink-0">
            {user ? (
              <Link
                to="/dashboard"
                className="inline-flex items-center justify-center px-4 py-2 min-h-[42px] text-xs sm:text-sm font-semibold text-white bg-[#141A23] hover:bg-[#232D3B] rounded-lg transition-colors whitespace-nowrap shrink-0"
              >
                <span className="sm:hidden">Dashboard</span>
                <span className="hidden sm:inline">Dashboard Orang Tua</span>
              </Link>
            ) : (
              <Link
                to="/daftar"
                className="inline-flex items-center justify-center gap-2 px-4 py-2 min-h-[42px] text-xs sm:text-sm font-semibold text-white bg-[#A61B38] hover:bg-[#88132B] rounded-lg transition-colors whitespace-nowrap shrink-0"
              >
                <span className="w-5 h-5 rounded-full bg-white flex items-center justify-center shrink-0">
                  <GoogleOfficialIcon className="w-3.5 h-3.5" />
                </span>
                <span className="sm:hidden">Daftar</span>
                <span className="hidden sm:inline">Daftar Sekarang</span>
              </Link>
            )}
          </div>
        </div>
      </header>

      {/* Navigation Drawer */}
      {drawerOpen && (
        <div
          className="fixed inset-0 z-50 flex no-print"
          role="dialog"
          aria-modal="true"
          aria-label="Menu navigasi TOMOYO"
        >
          <div
            className="fixed inset-0 bg-[#141A23]/50 backdrop-blur-xs"
            onClick={() => setDrawerOpen(false)}
          />
          <aside
            id="tomoyo-nav-drawer"
            className="relative z-10 w-80 max-w-[85vw] bg-[#FAF9F5] border-r border-[#E5E2D9] h-full flex flex-col overflow-y-auto shadow-2xl"
          >
            <div className="px-5 py-4 border-b border-[#E5E2D9] bg-white flex items-center justify-between gap-3">
              <img
                src={BRAND_IDENTITY.headerLogoPath}
                alt="TOMOYO PRIVAT & BIMBEL EDUCATION"
                className="h-9 w-auto object-contain rounded"
                referrerPolicy="no-referrer"
              />
              <button
                type="button"
                onClick={() => setDrawerOpen(false)}
                aria-label="Tutup menu"
                className="inline-flex items-center justify-center w-10 h-10 rounded-lg text-[#3E4856] hover:bg-[#F2EFE9] cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <nav aria-label="Semua halaman publik" className="p-4 flex-1 space-y-1">
              {DRAWER_NAV_LINKS.map((item) => {
                const active =
                  item.to === '/'
                    ? pathname === '/'
                    : pathname === item.to || pathname.startsWith(`${item.to}/`);
                return (
                  <Link
                    key={item.to}
                    to={item.to}
                    className={`flex items-center px-3.5 py-2.5 min-h-[42px] rounded-lg text-sm font-medium transition-colors ${
                      active
                        ? 'bg-white text-[#A61B38] font-semibold border border-[#E5E2D9]'
                        : 'text-[#3E4856] hover:bg-white hover:text-[#141A23]'
                    }`}
                  >
                    {item.label}
                  </Link>
                );
              })}
            </nav>

            <div className="p-4 border-t border-[#E5E2D9] space-y-2.5 bg-white">
              {user ? (
                <Link
                  to="/dashboard"
                  className="flex items-center justify-center w-full px-4 py-2.5 min-h-[44px] text-sm font-semibold text-white bg-[#141A23] hover:bg-[#232D3B] rounded-lg transition-colors"
                >
                  Buka Dashboard Orang Tua
                </Link>
              ) : (
                <>
                  <Link
                    to="/daftar"
                    className="flex items-center justify-center gap-2.5 w-full px-4 py-2.5 min-h-[44px] text-sm font-semibold text-white bg-[#A61B38] hover:bg-[#88132B] rounded-lg transition-colors"
                  >
                    <span className="w-5 h-5 rounded-full bg-white flex items-center justify-center shrink-0">
                      <GoogleOfficialIcon className="w-3.5 h-3.5" />
                    </span>
                    <span>Daftar Siswa Baru</span>
                  </Link>
                  <Link
                    to="/masuk"
                    className="flex items-center justify-center gap-2 w-full px-4 py-2.5 min-h-[44px] text-sm font-semibold text-[#141A23] bg-[#FAF9F5] border border-[#E5E2D9] hover:border-[#141A23] rounded-lg transition-colors"
                  >
                    <GoogleOfficialIcon className="w-4 h-4 shrink-0" />
                    <span>Masuk Orang Tua</span>
                  </Link>
                </>
              )}
            </div>
          </aside>
        </div>
      )}

      <main className="flex-1">{children}</main>

      <footer className="relative overflow-hidden bg-[#141A23] text-slate-200 border-t border-slate-800 no-print">
        <GeometricMeshBackdrop
          tone="dark"
          className="inset-x-0 bottom-0 h-44 sm:h-52 opacity-[0.11]"
        />
        <BatikPaomanFloating
          tone="light"
          tiltDeg={-16}
          animation="slow"
          className="hidden md:block absolute -bottom-12 left-4 lg:left-10"
          imgClassName="w-28 lg:w-32 opacity-[0.2]"
        />
        <BatikPaomanFloating
          tone="light"
          tiltDeg={22}
          flipX
          animation="reverse"
          className="hidden md:block absolute -top-8 right-6 lg:right-14"
          imgClassName="w-24 lg:w-32 opacity-[0.2]"
        />
        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6">
          <BatikPaomanDivider tone="dark" />
        </div>
        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 lg:py-14">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-10">
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <img
                  src={BRAND_IDENTITY.emblemLogoPath}
                  alt="Emblem TOMOYO PRIVAT & BIMBEL EDUCATION"
                  className="w-12 h-12 rounded-lg bg-white p-1 object-contain shrink-0"
                  referrerPolicy="no-referrer"
                />
                <div>
                  <p className="font-bold text-white text-sm leading-snug">
                    {BRAND_IDENTITY.officialName}
                  </p>
                  <p className="text-xs text-[#FDE68A] tracking-wide">
                    {BRAND_IDENTITY.tagline}
                  </p>
                </div>
              </div>
              <p className="text-sm text-slate-300 leading-relaxed">
                {BRAND_IDENTITY.meaning}
              </p>
              <div className="inline-flex items-center gap-2 text-xs text-slate-400 pt-1">
                <IndramayuHorizonCrest className="w-5 h-5 text-[#FDE68A]" />
                <span>Kabupaten Indramayu · Jawa Barat</span>
              </div>
            </div>

            <div className="space-y-3">
              <h2 className="text-sm font-semibold text-white">Halaman Informasi</h2>
              <ul className="space-y-2 text-sm text-slate-300">
                <li><Link to="/tentang" className="hover:text-white transition-colors">Tentang &amp; Filosofi</Link></li>
                <li><Link to="/founder" className="hover:text-white transition-colors">Profil Founder &amp; CEO</Link></li>
                <li><Link to="/program" className="hover:text-white transition-colors">Program &amp; Paket Belajar</Link></li>
                <li><Link to="/kuis" className="hover:text-white transition-colors">Kuis Online Siswa</Link></li>
                <li><Link to="/guru" className="hover:text-white transition-colors">Daftar Guru</Link></li>
                <li><Link to="/jadwal" className="hover:text-white transition-colors">Jadwal Belajar</Link></li>
                <li><Link to="/galeri" className="hover:text-white transition-colors">Galeri Kegiatan</Link></li>
              </ul>
            </div>

            <div className="space-y-3">
              <h2 className="text-sm font-semibold text-white">Layanan &amp; Pendaftaran</h2>
              <ul className="space-y-2 text-sm text-slate-300">
                <li><Link to="/pengumuman" className="hover:text-white transition-colors">Pengumuman Resmi</Link></li>
                <li><Link to="/cabang" className="hover:text-white transition-colors">Cabang &amp; Lokasi</Link></li>
                <li><Link to="/daftar" className="hover:text-white transition-colors">Pendaftaran Siswa</Link></li>
                <li><Link to="/download-apk" className="hover:text-white transition-colors">Download APK Android</Link></li>
                <li><Link to="/masuk" className="hover:text-white transition-colors">Masuk Orang Tua</Link></li>
                <li><Link to="/peta-situs" className="hover:text-white transition-colors">Peta Situs</Link></li>
              </ul>
            </div>

            <div className="space-y-3">
              <h2 className="text-sm font-semibold text-white">Kontak Resmi</h2>
              <div className="space-y-2.5 text-sm text-slate-300">
                <a
                  href={`mailto:${contact.email || 'tomoyoeducation.com@gmail.com'}`}
                  className="flex items-center gap-2.5 hover:text-white transition-colors break-all"
                >
                  <Mail className="w-4 h-4 shrink-0 text-slate-400" />
                  <span>{contact.email || 'tomoyoeducation.com@gmail.com'}</span>
                </a>
                <a
                  href={contact.whatsappUrl || 'https://wa.me/6282119770700'}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2.5 hover:text-white transition-colors"
                >
                  <WhatsAppBrandIcon className="w-4 h-4 shrink-0 text-emerald-400" />
                  <span>WhatsApp: {contact.whatsappDisplay || '0821-1977-0700'}</span>
                </a>
                <div className="flex items-center gap-3 pt-2">
                  <a
                    href={contact.instagramUrl || 'https://www.instagram.com/tomoyoeducation?bqrl=cHJsb3RnY3g1c3g2'}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label="Instagram Resmi TOMOYO Education"
                    className="inline-flex items-center justify-center w-10 h-10 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 transition-colors"
                  >
                    <InstagramBrandIcon className="w-5 h-5" />
                  </a>
                  <a
                    href={contact.facebookUrl || 'https://www.facebook.com/share/1CSomr9gXK/'}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label="Facebook Resmi TOMOYO Education"
                    className="inline-flex items-center justify-center w-10 h-10 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 transition-colors"
                  >
                    <FacebookBrandIcon className="w-5 h-5" />
                  </a>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-10 pt-6 border-t border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-400 text-center sm:text-left">
            <p>© {new Date().getFullYear()} {BRAND_IDENTITY.officialName}. Seluruh hak cipta dilindungi.</p>
            <p>Indramayu Kota (Pusat) &amp; Kecamatan Terisi (Cabang)</p>
          </div>
        </div>
      </footer>

      <TomoyoAssistantWidget />
    </div>
  );
}
