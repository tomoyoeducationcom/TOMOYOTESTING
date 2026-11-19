import React from 'react';

/**
 * Subtle Batik Paoman-inspired geometric divider motif (coastal wave dots & mango-petal rhythm).
 * Rendered sparingly as an architectural hairline transition between editorial bands.
 */
export function BatikPaomanDivider({
  tone = 'light',
  className = '',
}: {
  tone?: 'light' | 'dark';
  className?: string;
}) {
  const strokeColor = tone === 'dark' ? 'rgba(229, 226, 217, 0.22)' : 'rgba(20, 26, 35, 0.14)';
  const accentColor = tone === 'dark' ? 'rgba(245, 196, 120, 0.55)' : 'rgba(166, 27, 56, 0.35)';

  return (
    <div
      aria-hidden="true"
      className={`w-full overflow-hidden flex items-center justify-center py-2 ${className}`}
    >
      <svg
        viewBox="0 0 1200 22"
        className="w-full max-w-6xl h-[18px]"
        fill="none"
        preserveAspectRatio="xMidYMid slice"
      >
        <line x1="0" y1="11" x2="544" y2="11" stroke={strokeColor} strokeWidth="1" />
        <line x1="656" y1="11" x2="1200" y2="11" stroke={strokeColor} strokeWidth="1" />
        {/* Stylized Batik Paoman diamond & coastal pearl motif */}
        <path
          d="M562 11 L572 4 L582 11 L572 18 Z"
          stroke={strokeColor}
          strokeWidth="1.2"
        />
        <circle cx="554" cy="11" r="1.8" fill={accentColor} />
        <path
          d="M590 11 C595 3, 605 3, 610 11 C605 19, 595 19, 590 11 Z"
          stroke={accentColor}
          strokeWidth="1.35"
        />
        <circle cx="600" cy="11" r="2.2" fill={accentColor} />
        <path
          d="M618 11 L628 4 L638 11 L628 18 Z"
          stroke={strokeColor}
          strokeWidth="1.2"
        />
        <circle cx="646" cy="11" r="1.8" fill={accentColor} />
      </svg>
    </div>
  );
}

/**
 * Subtle geometric emblem referencing Indramayu's coastal horizon and mango-leaf geometry.
 */
export function IndramayuHorizonCrest({ className = 'w-6 h-6' }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 32 32"
      fill="none"
      className={className}
      aria-hidden="true"
    >
      <path
        d="M16 4C11 9.5 9.5 15 12.2 19.5C14.1 22.6 18 22.6 19.8 19.5C22.5 15 21 9.5 16 4Z"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinejoin="round"
      />
      <path d="M5 24.5C9.5 22.5 22.5 22.5 27 24.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <path d="M8.5 28C12 26.8 20 26.8 23.5 28" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" opacity="0.65" />
    </svg>
  );
}

/**
 * Full-bleed photographic editorial header for secondary routes.
 * Typography sits directly over a measured dark gradient scrim (never inside a detached white card).
 */
export function PagePhotoHero({
  imageSrc,
  imageAlt,
  eyebrow,
  title,
  description,
  children,
}: {
  imageSrc: string;
  imageAlt: string;
  eyebrow: string;
  title: string;
  description: string;
  children?: React.ReactNode;
}) {
  return (
    <section className="relative overflow-hidden bg-[#141A23] text-white border-b border-[#E5E2D9]">
      <img
        src={imageSrc}
        alt={imageAlt}
        className="absolute inset-0 w-full h-full object-cover object-center"
        referrerPolicy="no-referrer"
      />
      <div className="subhero-scrim absolute inset-0" aria-hidden="true" />
      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-14 sm:py-20 lg:py-24">
        <div className="max-w-3xl space-y-3.5">
          <p className="text-xs font-semibold tracking-[0.16em] uppercase text-[#FDE68A]">
            {eyebrow}
          </p>
          <h1 className="font-display text-3xl sm:text-5xl lg:text-[3.25rem] font-bold tracking-tight leading-[1.08] text-white">
            {title}
          </h1>
          <p className="text-sm sm:text-base lg:text-lg text-slate-100/90 leading-relaxed max-w-2xl">
            {description}
          </p>
          {children && <div className="pt-2">{children}</div>}
        </div>
      </div>
    </section>
  );
}
