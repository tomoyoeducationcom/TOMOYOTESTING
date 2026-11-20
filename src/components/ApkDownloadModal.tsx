import { useEffect } from 'react';
import { Download, ShieldCheck, Smartphone, X } from 'lucide-react';
import { BRAND_IDENTITY } from '../lib/domain';
import { TOMOYO_APK_DOWNLOAD_URL } from '../lib/apkDownload';

export function ApkDownloadModal({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    return () => {
      window.removeEventListener('keydown', onKeyDown);
      document.body.style.overflow = prevOverflow;
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center p-4 sm:p-6 no-print"
      role="dialog"
      aria-modal="true"
      aria-labelledby="apk-download-modal-title"
      data-testid="apk-download-modal"
    >
      {/* Backdrop — clicking outside closes modal */}
      <div
        className="fixed inset-0 bg-[#141A23]/70 transition-opacity"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Modal Panel */}
      <div className="relative z-10 w-full max-w-lg rounded-2xl bg-[#FAF9F5] border border-[#E5E2D9] shadow-2xl overflow-hidden">
        {/* Top Brand Bar */}
        <div className="bg-[#141A23] px-5 py-4 sm:px-6 flex items-center justify-between gap-4 border-b border-slate-800">
          <div className="flex items-center gap-3 min-w-0">
            <img
              src={BRAND_IDENTITY.emblemLogoPath}
              alt="Logo TOMOYO EDUCATION"
              className="w-11 h-11 rounded-lg bg-white p-1 object-contain shrink-0"
              referrerPolicy="no-referrer"
            />
            <div className="min-w-0">
              <p className="text-xs font-semibold tracking-[0.12em] uppercase text-[#FDE68A] truncate">
                {BRAND_IDENTITY.shortName}
              </p>
              <p className="text-xs text-slate-300 truncate">
                Aplikasi Resmi Android
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Tutup pop-up download"
            className="inline-flex items-center justify-center w-11 h-11 rounded-lg bg-white/10 hover:bg-white/20 text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#FDE68A] transition-colors cursor-pointer shrink-0"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 sm:p-7 space-y-5">
          <div className="space-y-2.5">
            <h2
              id="apk-download-modal-title"
              className="font-display text-2xl sm:text-[1.7rem] font-bold tracking-tight text-[#141A23] leading-snug"
            >
              Download Aplikasi TOMOYO EDUCATION
            </h2>
            <p className="text-sm sm:text-base text-[#3E4856] leading-relaxed">
              Nikmati kemudahan belajar dan akses layanan TOMOYO melalui aplikasi Android.
            </p>
          </div>

          {/* File Format & Authenticity Metadata (Clean unboxed / subtle editorial surface) */}
          <div className="rounded-xl bg-white border border-[#E5E2D9] p-4 grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
            <div className="flex items-center gap-3">
              <Smartphone className="w-5 h-5 text-[#A61B38] shrink-0" />
              <div>
                <p className="text-xs font-medium text-[#646F7E]">Format File</p>
                <p className="font-semibold text-[#141A23]">APK Android</p>
              </div>
            </div>
            <div className="flex items-center gap-3 sm:border-l sm:border-[#E5E2D9] sm:pl-4">
              <ShieldCheck className="w-5 h-5 text-[#0F6E66] shrink-0" />
              <div>
                <p className="text-xs font-medium text-[#646F7E]">Sumber Unduhan</p>
                <p className="font-semibold text-[#141A23]">Resmi TOMOYO EDUCATION</p>
              </div>
            </div>
          </div>

          <div className="space-y-3 pt-1">
            <a
              href={TOMOYO_APK_DOWNLOAD_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center gap-2.5 w-full px-6 py-3.5 min-h-[48px] text-sm sm:text-base font-bold text-white bg-[#A61B38] hover:bg-[#88132B] rounded-xl shadow-sm transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#A61B38]"
            >
              <Download className="w-5 h-5 shrink-0" />
              <span>DOWNLOAD APK SEKARANG</span>
            </a>

            <button
              type="button"
              onClick={onClose}
              className="inline-flex items-center justify-center w-full px-4 py-2.5 min-h-[44px] text-sm font-medium text-[#3E4856] hover:text-[#141A23] bg-[#F2EFE9] hover:bg-[#E8E4DA] rounded-xl transition-colors cursor-pointer"
            >
              Tutup
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
