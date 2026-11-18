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

const TOP_NAV_LINKS = [
  { to: '/', label: 'Beranda' },
  { to: '/program', label: 'Program' },
  { to: '/guru', label: 'Guru' },
  { to: '/cabang', label: 'Cabang' },
  { to: '/kontak', label: 'Kontak' },
];

const DRAWER_NAV_LINKS = [
  { to: '/', label: 'Beranda' },
  { to: '/tentang', label: 'Tentang & Filosofi' },
  { to: '/founder', label: 'Profil Founder & CEO' },
  { to: '/program', label: 'Program & Paket Belajar' },
  { to: '/guru', label: 'Daftar Guru' },
  { to: '/galeri', label: 'Galeri Kegiatan' },
  { to: '/pengumuman', label: 'Pengumuman' },
  { to: '/jadwal', label: 'Jadwal Belajar' },
  { to: '/cabang', label: 'Cabang & Lokasi' },
  { to: '/kontak', label: 'Kontak Resmi' },
  { to: '/daftar', label: 'Pendaftaran Siswa' },
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
    <div className="min-h-screen flex flex-col text-slate-900">
      <header className="sticky top-0 z-40 ios-glass-header no-print">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 sm:h-[72px] flex items-center justify-between gap-4 lg:gap-8">
          {/* Zone 1: Hamburger button + Original TOMOYO Logo directly beside it */}
          <div className="flex items-center gap-2.5 sm:gap-3 min-w-0 shrink-0">
            <button
              type="button"
              onClick={() => setDrawerOpen((prev) => !prev)}
              aria-label={drawerOpen ? 'Tutup menu navigasi' : 'Buka menu navigasi'}
              aria-expanded={drawerOpen}
              aria-controls="tomoyo-nav-drawer"
              className="inline-flex items-center justify-center w-11 h-11 rounded-xl ios-glass-subtle text-slate-800 hover:bg-white/90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-rose-700 transition-colors cursor-pointer shrink-0"
            >
              {drawerOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>

            <Link
              to="/"
              aria-label="TOMOYO PRIVAT & BIMBEL EDUCATION — Beranda"
              className="inline-flex items-center shrink-0 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-rose-700 rounded-lg overflow-hidden"
            >
              <img
                src={BRAND_IDENTITY.headerLogoPath}
                alt="TOMOYO PRIVAT & BIMBEL EDUCATION"
                className="h-10 sm:h-12 w-auto max-w-[190px] sm:max-w-none object-contain rounded-lg"
                referrerPolicy="no-referrer"
              />
            </Link>
          </div>

          {/* Zone 2: Clean single-line public text navigation links */}
          <nav
            aria-label="Navigasi utama"
            className="hidden lg:flex items-center gap-6 text-sm font-medium text-slate-700"
          >
            {TOP_NAV_LINKS.map((item) => {
              const active = pathname === item.to;
              return (
                <Link
                  key={item.to}
                  to={item.to}
                  className={`py-1 whitespace-nowrap shrink-0 border-b-2 transition-colors ${
                    active
                      ? 'text-rose-700 border-rose-700 font-semibold'
                      : 'border-transparent hover:text-slate-950 hover:border-slate-300'
                  }`}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>

          {/* Zone 3: 1 Primary CTA with Google logo when registering */}
          <div className="flex items-center shrink-0">
            {user ? (
              <Link
                to="/dashboard"
                className="inline-flex items-center justify-center px-3.5 sm:px-4 py-2.5 min-h-[42px] text-xs sm:text-sm font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-xl shadow-sm transition-colors whitespace-nowrap shrink-0"
              >
                <span className="sm:hidden">Dashboard</span>
                <span className="hidden sm:inline">Dashboard Orang Tua</span>
              </Link>
            ) : (
              <Link
                to="/daftar"
                className="inline-flex items-center justify-center gap-2 px-3.5 sm:px-4 py-2 min-h-[42px] text-xs sm:text-sm font-semibold text-white bg-rose-700 hover:bg-rose-800 rounded-xl shadow-sm transition-colors whitespace-nowrap shrink-0"
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

      {/* Working Hamburger Navigation Drawer */}
      {drawerOpen && (
        <div className="fixed inset-0 z-50 flex no-print" role="dialog" aria-modal="true" aria-label="Menu navigasi TOMOYO">
          <div
            className="fixed inset-0 bg-slate-900/35 backdrop-blur-xs"
            onClick={() => setDrawerOpen(false)}
          />
          <aside
            id="tomoyo-nav-drawer"
            className="relative z-10 w-80 max-w-[85vw] ios-glass-strong h-full flex flex-col overflow-y-auto"
          >
            <div className="px-5 py-4 border-b border-slate-200/70 flex items-center justify-between gap-3">
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
                className="inline-flex items-center justify-center w-10 h-10 rounded-xl text-slate-600 hover:bg-white/70 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <nav aria-label="Semua halaman publik" className="p-4 flex-1 space-y-1">
              {DRAWER_NAV_LINKS.map((item) => {
                const active = pathname === item.to;
                return (
                  <Link
                    key={item.to}
                    to={item.to}
                    className={`flex items-center px-3.5 py-2.5 min-h-[44px] rounded-xl text-sm font-medium transition-colors ${
                      active
                        ? 'bg-rose-50/90 text-rose-800 font-semibold border border-rose-200/70'
                        : 'text-slate-700 hover:bg-white/70 hover:text-slate-950'
                    }`}
                  >
                    {item.label}
                  </Link>
                );
              })}
            </nav>

            <div className="p-4 border-t border-slate-200/70 space-y-2.5 bg-white/40">
              {user ? (
                <Link
                  to="/dashboard"
                  className="flex items-center justify-center w-full px-4 py-3 min-h-[44px] text-sm font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-xl transition-colors"
                >
                  Buka Dashboard Orang Tua
                </Link>
              ) : (
                <>
                  <Link
                    to="/daftar"
                    className="flex items-center justify-center gap-2.5 w-full px-4 py-3 min-h-[44px] text-sm font-semibold text-white bg-rose-700 hover:bg-rose-800 rounded-xl transition-colors"
                  >
                    <span className="w-5 h-5 rounded-full bg-white flex items-center justify-center shrink-0">
                      <GoogleOfficialIcon className="w-3.5 h-3.5" />
                    </span>
                    <span>Daftar Siswa Baru</span>
                  </Link>
                  <Link
                    to="/masuk"
                    className="flex items-center justify-center gap-2 w-full px-4 py-3 min-h-[44px] text-sm font-semibold text-slate-800 ios-glass hover:bg-white/90 rounded-xl transition-colors"
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

      <footer className="bg-slate-900/95 backdrop-blur-xl text-slate-200 border-t border-slate-800 no-print">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 lg:py-16">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-10">
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <img
                  src={BRAND_IDENTITY.emblemLogoPath}
                  alt="Emblem TOMOYO PRIVAT & BIMBEL EDUCATION"
                  className="w-12 h-12 rounded-xl bg-white p-1 object-contain shrink-0"
                  referrerPolicy="no-referrer"
                />
                <div>
                  <p className="font-bold text-white text-sm leading-snug">
                    {BRAND_IDENTITY.officialName}
                  </p>
                  <p className="text-xs text-slate-400 tracking-wide">
                    {BRAND_IDENTITY.tagline}
                  </p>
                </div>
              </div>
              <p className="text-sm text-slate-300 leading-relaxed">
                {BRAND_IDENTITY.meaning}
              </p>
            </div>

            <div className="space-y-3">
              <h2 className="text-sm font-semibold text-white">Halaman Informasi</h2>
              <ul className="space-y-2 text-sm text-slate-300">
                <li><Link to="/tentang" className="hover:text-white transition-colors">Tentang &amp; Filosofi</Link></li>
                <li><Link to="/founder" className="hover:text-white transition-colors">Profil Founder &amp; CEO</Link></li>
                <li><Link to="/program" className="hover:text-white transition-colors">Program &amp; Paket Belajar</Link></li>
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
    </div>
  );
}
