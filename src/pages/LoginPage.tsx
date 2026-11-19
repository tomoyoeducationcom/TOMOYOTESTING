import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Check, Copy, ShieldCheck } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { BRAND_IDENTITY } from '../lib/domain';
import { GoogleSignInButton } from '../components/GoogleSignInButton';

export function LoginPage() {
  const { user, loading, authError, unauthorizedDomain } = useAuth();
  const [copiedDomain, setCopiedDomain] = useState(false);
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const nextPath = searchParams.get('next') || '/dashboard';

  useEffect(() => {
    if (!loading && user && user.emailVerified) {
      navigate(nextPath.startsWith('/') ? nextPath : '/dashboard', { replace: true });
    }
  }, [user, loading, navigate, nextPath]);

  const handleCopyDomain = async () => {
    if (!unauthorizedDomain || typeof navigator === 'undefined' || !navigator.clipboard) {
      return;
    }
    try {
      await navigator.clipboard.writeText(unauthorizedDomain);
      setCopiedDomain(true);
      setTimeout(() => setCopiedDomain(false), 2000);
    } catch {
      // Clipboard blocked in restricted frame
    }
  };

  return (
    <section className="py-14 sm:py-20">
      <div className="max-w-md mx-auto px-4 sm:px-6">
        <div className="editorial-card rounded-2xl p-6 sm:p-8 space-y-6">
          <div className="flex flex-col items-center text-center gap-3">
            <img
              src={BRAND_IDENTITY.emblemLogoPath}
              alt="TOMOYO Education"
              className="w-16 h-16 object-contain rounded-xl bg-white border border-[#E5E2D9] p-1.5 shrink-0"
              referrerPolicy="no-referrer"
            />
            <div>
              <h1 className="font-display text-2xl sm:text-3xl font-bold text-[#141A23]">
                Masuk Akun Orang Tua
              </h1>
              <p className="text-xs font-medium text-[#626E7E] mt-0.5">
                {BRAND_IDENTITY.officialName}
              </p>
            </div>
          </div>

          <p className="text-sm text-[#3E4856] leading-relaxed text-center">
            Pendaftaran dan pengelolaan data anak menggunakan akun Google resmi Anda. Tidak perlu membuat kata sandi baru.
          </p>

          {authError && (
            <div
              role="alert"
              className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-sm text-rose-900 space-y-2.5"
            >
              <p className="font-medium text-center">{authError}</p>
              {unauthorizedDomain && (
                <div className="pt-2 border-t border-rose-200/80 text-xs text-rose-800 space-y-2">
                  <p className="leading-relaxed">
                    Domain preview ini perlu didaftarkan di{' '}
                    <strong>Firebase Console → Authentication → Settings → Authorized domains</strong>{' '}
                    pada project <code className="font-mono font-semibold">tomoyoindramayu</code>:
                  </p>
                  <div className="flex items-center justify-between gap-2 bg-white border border-rose-200 rounded-lg px-2.5 py-1.5">
                    <code className="font-mono text-[11px] text-[#141A23] break-all">
                      {unauthorizedDomain}
                    </code>
                    <button
                      type="button"
                      onClick={handleCopyDomain}
                      className="inline-flex items-center gap-1 px-2 py-1 text-[11px] font-semibold text-[#141A23] bg-[#F7F6F2] hover:bg-[#ECEAE3] border border-[#E5E2D9] rounded-md shrink-0 cursor-pointer"
                    >
                      {copiedDomain ? <Check className="w-3 h-3 text-emerald-700" /> : <Copy className="w-3 h-3" />}
                      <span>{copiedDomain ? 'Tersalin' : 'Salin'}</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {loading ? (
            <div className="py-4 text-center text-sm text-[#626E7E]">
              Memeriksa status autentikasi...
            </div>
          ) : (
            <GoogleSignInButton
              label="Lanjutkan dengan Google"
              className="w-full rounded-xl shadow-xs"
              onSuccess={() =>
                navigate(nextPath.startsWith('/') ? nextPath : '/dashboard', { replace: true })
              }
            />
          )}

          <div className="pt-4 border-t border-[#E5E2D9] flex items-start gap-2.5 text-xs text-[#626E7E]">
            <ShieldCheck className="w-4 h-4 text-[#0F6E66] shrink-0 mt-0.5" />
            <span>
              Autentikasi dilindungi oleh Firebase Authentication. Hanya akun Google dengan email terverifikasi yang dapat mendaftarkan siswa.
            </span>
          </div>
        </div>
      </div>
    </section>
  );
}
