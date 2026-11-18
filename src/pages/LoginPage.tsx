import { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ShieldCheck } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { BRAND_IDENTITY } from '../lib/domain';
import { GoogleSignInButton } from '../components/GoogleSignInButton';

export function LoginPage() {
  const { user, loading, authError } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const nextPath = searchParams.get('next') || '/dashboard';

  useEffect(() => {
    if (!loading && user && user.emailVerified) {
      navigate(nextPath.startsWith('/') ? nextPath : '/dashboard', { replace: true });
    }
  }, [user, loading, navigate, nextPath]);

  return (
    <section className="py-12 sm:py-20">
      <div className="max-w-md mx-auto px-4 sm:px-6">
        <div className="ios-glass-strong rounded-3xl p-6 sm:p-8 space-y-6">
          <div className="flex flex-col items-center text-center gap-3">
            <img
              src={BRAND_IDENTITY.emblemLogoPath}
              alt="TOMOYO Education"
              className="w-16 h-16 object-contain rounded-2xl bg-white p-1.5 shadow-sm shrink-0"
              referrerPolicy="no-referrer"
            />
            <div>
              <h1 className="text-xl font-extrabold text-slate-900">Masuk Akun Orang Tua</h1>
              <p className="text-xs font-medium text-slate-600 mt-0.5">
                {BRAND_IDENTITY.officialName}
              </p>
            </div>
          </div>

          <p className="text-sm text-slate-600 leading-relaxed text-center">
            Pendaftaran dan pengelolaan data anak menggunakan akun Google resmi Anda. Tidak perlu membuat kata sandi baru.
          </p>

          {authError && (
            <div
              role="alert"
              className="p-3.5 rounded-2xl bg-rose-50/90 border border-rose-200 text-sm text-rose-800 text-center"
            >
              {authError}
            </div>
          )}

          {loading ? (
            <div className="py-4 text-center text-sm text-slate-500">
              Memeriksa status autentikasi...
            </div>
          ) : (
            <GoogleSignInButton
              label="Lanjutkan dengan Google"
              className="w-full rounded-2xl shadow-sm"
              onSuccess={() =>
                navigate(nextPath.startsWith('/') ? nextPath : '/dashboard', { replace: true })
              }
            />
          )}

          <div className="pt-4 border-t border-slate-200/70 flex items-start gap-2.5 text-xs text-slate-500">
            <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
            <span>
              Autentikasi dilindungi oleh Firebase Authentication. Hanya akun Google dengan email terverifikasi yang dapat mendaftarkan siswa.
            </span>
          </div>
        </div>
      </div>
    </section>
  );
}
