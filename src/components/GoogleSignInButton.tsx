import { useState } from 'react';
import { GoogleOfficialIcon } from './BrandIcons';
import { useAuth } from '../context/AuthContext';

export function GoogleSignInButton({
  label = 'Masuk dengan Google',
  onSuccess,
  className = '',
}: {
  label?: string;
  onSuccess?: () => void;
  className?: string;
}) {
  const { signInWithGoogle } = useAuth();
  const [submitting, setSubmitting] = useState(false);

  const handleClick = async () => {
    setSubmitting(true);
    try {
      const user = await signInWithGoogle();
      if (user && onSuccess) {
        onSuccess();
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={submitting}
      className={`inline-flex items-center justify-center gap-3 px-5 py-3 min-h-[48px] bg-white text-slate-900 font-semibold text-sm border border-slate-300 rounded-lg hover:bg-slate-50 active:bg-slate-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-900 transition-colors disabled:opacity-60 cursor-pointer whitespace-nowrap ${className}`}
    >
      <GoogleOfficialIcon className="w-5 h-5 shrink-0" />
      <span>{submitting ? 'Memproses Google Sign-In...' : label}</span>
    </button>
  );
}
