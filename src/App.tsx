import { useEffect, useState } from 'react';
import { BrowserRouter, Link, Route, Routes } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { SiteDataProvider } from './context/SiteDataContext';
import { ErrorBoundary } from './components/ErrorBoundary';
import { SeoHead } from './components/SeoHead';
import { SiteLayout } from './components/SiteLayout';
import { HomePage } from './pages/HomePage';
import {
  AboutPage,
  AnnouncementsPage,
  BranchesPage,
  ContactPage,
  FounderPage,
  GalleryPage,
  ProgramsPage,
  RegisterEntryPage,
  SchedulesPage,
  SitemapHtmlPage,
  TeachersPage,
} from './pages/PublicPages';
import { LoginPage } from './pages/LoginPage';
import { ParentDashboardPage } from './pages/ParentDashboardPage';
import { AdminDashboardPage } from './pages/AdminDashboardPage';

function NotFoundPage() {
  return (
    <section className="py-20">
      <div className="max-w-lg mx-auto px-4">
        <div className="ios-glass-strong rounded-3xl p-8 text-center space-y-4">
          <p className="text-xs font-mono font-semibold text-rose-700">404</p>
          <h1 className="text-2xl font-bold text-slate-900">Halaman Tidak Ditemukan</h1>
          <p className="text-sm text-slate-600">
            Alamat halaman yang Anda buka tidak tersedia. Silakan kembali ke beranda atau lihat peta situs.
          </p>
          <div className="flex justify-center gap-3 pt-2">
            <Link
              to="/"
              className="px-5 py-2.5 text-sm font-semibold text-white bg-rose-700 hover:bg-rose-800 rounded-xl transition-colors"
            >
              Kembali ke Beranda
            </Link>
            <Link
              to="/peta-situs"
              className="px-5 py-2.5 text-sm font-semibold text-slate-800 ios-glass hover:bg-white/90 rounded-xl transition-colors"
            >
              Peta Situs
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}

export default function App() {
  const [mapsQuotaExceeded, setMapsQuotaExceeded] = useState(false);

  useEffect(() => {
    const handleQuota = () => setMapsQuotaExceeded(true);
    window.addEventListener('gmp-quota-exceeded', handleQuota);
    return () => window.removeEventListener('gmp-quota-exceeded', handleQuota);
  }, []);

  return (
    <ErrorBoundary>
      <AuthProvider>
        <SiteDataProvider>
          <BrowserRouter>
            <SeoHead />
            {mapsQuotaExceeded && (
              <div className="bg-amber-50 border-b border-amber-200 text-amber-900 px-4 py-2.5 text-xs md:text-sm text-center sticky top-0 z-50 shadow-sm no-print">
                <span>
                  Google Maps Platform quota reached. If you are the app owner, visit{' '}
                  <a
                    href="https://developers.google.com/maps/ai/ai-studio?utm_campaign=gmp_mcp_codeassist_v1_aistudio#quota_exceeded_errors"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="underline font-semibold text-amber-950 hover:text-amber-800"
                  >
                    maps developer site
                  </a>{' '}
                  for instructions to update your account.
                </span>
              </div>
            )}
            <Routes>
              {/* Hidden Admin Route (no public links, noindex) */}
              <Route path="/admintomoyo" element={<AdminDashboardPage />} />

              {/* Public & Parent Routes wrapped in SiteLayout */}
              <Route
                path="/*"
                element={
                  <SiteLayout>
                    <Routes>
                      <Route path="/" element={<HomePage />} />
                      <Route path="/tentang" element={<AboutPage />} />
                      <Route path="/founder" element={<FounderPage />} />
                      <Route path="/program" element={<ProgramsPage />} />
                      <Route path="/guru" element={<TeachersPage />} />
                      <Route path="/galeri" element={<GalleryPage />} />
                      <Route path="/pengumuman" element={<AnnouncementsPage />} />
                      <Route path="/jadwal" element={<SchedulesPage />} />
                      <Route path="/cabang" element={<BranchesPage />} />
                      <Route path="/kontak" element={<ContactPage />} />
                      <Route path="/daftar" element={<RegisterEntryPage />} />
                      <Route path="/peta-situs" element={<SitemapHtmlPage />} />
                      <Route path="/masuk" element={<LoginPage />} />
                      <Route path="/dashboard" element={<ParentDashboardPage />} />
                      <Route path="*" element={<NotFoundPage />} />
                    </Routes>
                  </SiteLayout>
                }
              />
            </Routes>
          </BrowserRouter>
        </SiteDataProvider>
      </AuthProvider>
    </ErrorBoundary>
  );
}
