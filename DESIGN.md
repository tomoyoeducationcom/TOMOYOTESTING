# DESIGN SYSTEM — TOMOYO PRIVAT & BIMBEL EDUCATION

> **Aesthetic Direction**: **Premium Editorial Education + Local Indramayu Cultural Identity + Cinematic Photography**  
> **Mode**: **ANTI-SLOP DURING** — Craftsmanship, legibility, and cultural groundedness across every viewport.

---

## 1. Brand Personality & Art Direction

**TOMOYO PRIVAT & BIMBEL EDUCATION** (*Learn · Grow · Succeed*) is an official tutoring and private education institution serving Indramayu Kota (Pusat) and Kecamatan Terisi (Cabang) for Kindergarten (TK) through Grade 6 Elementary (SD).

- **Tone**: Authoritative yet warm, calm, grounded in Indramayu coastal-agrarian heritage, trustworthy for parents, encouraging and clear for young students.
- **Visual Anchor**: Full-bleed photography with typography set directly over measured dark gradient scrims—eliminating heavy floating glass boxes over hero photos. Content below the fold breathes on a clean warm-ivory editorial paper canvas separated by subtle hairline dividers (`1px solid`), crisp elevation, and purposeful Indramayu cultural accents.
- **Reference Alignment**:
  - Homepage Hero pairs the authentic aerial photograph of Alun-Alun Indramayu & Gunung Ciremai (`/assets/aistudio/WhatsApp_Image_2026-11-19_at_11.24.52_af9d5f53.jpeg`) with commanding condensed display typography (`TOMOYO EDUCATION` / `PRIVAT & BIMBEL`), direct action CTAs, and an integrated 3-package quick-preview strip (`PAKET 1`, `PAKET 2`, `PAKET 3`) layered with readable contrast directly over the lower landscape canvas.

---

## 2. Color System & 60-30-10 Rationale

Strictly tinted neutral surfaces paired with disciplined crimson-terracotta (TOMOYO identity) and deep coastal pine/emerald accents—never raw saturated neon or generic blue-purple gradients.

| Role | Token | Hex | Usage |
| :--- | :--- | :--- | :--- |
| **60% Dominant Canvas** | `--surface-canvas` | `#F7F6F2` | Warm coastal limestone paper canvas for editorial sections |
| **Surface Elevated** | `--surface-elevated` | `#FFFFFF` | Clean data cards, quiz question stage, admin tables |
| **Surface Subtle** | `--surface-subtle` | `#EFECE4` | Secondary bands, muted callout panels, table headers |
| **30% Structural Ink & Borders** | `--ink-primary` | `#121820` | Primary headlines, dark editorial footer & hero scrims |
| | `--ink-secondary` | `#3F4A59` | Body copy (contrast $\ge 7.5:1$ on `#F7F6F2`) |
| | `--ink-muted` | `#626E7E` | Metadata captions with typographic `·` separators ($\ge 4.7:1$) |
| | `--border-hairline` | `#DFDCD3` | 1px structural borders and table dividers |
| **10% Brand & Action Accents** | `--brand-crimson` | `#BE123C` | Primary CTA buttons, active focus states, editorial emphasis |
| | `--brand-crimson-hover` | `#9F1239` | Primary CTA hover |
| | `--accent-olive` | `#D9F99D` / `#4D7C0F` | Hero sub-display accent on dark scrim (`#D9F99D` Lime-Gold $\ge 11:1$ on `#0F172A`/scrim) & secondary olive tag ink on light |
| | `--accent-coastal` | `#0F766E` | Branch & WhatsApp operational success accents (paired with text labels) |
| **Semantic Feedback** | `--status-success` | `#15803D` | Approved / Sent / Correct (always paired with explicit text/icon) |
| | `--status-warning` | `#B45309` | Pending / Due / Retry (always paired with explicit text/icon) |
| | `--status-danger` | `#B91C1C` | Error / Rejected / Failed (always paired with explicit text/icon) |

---

## 3. Typography & Hierarchy (2+1 System)

Loaded from Google Fonts in `index.html`:
1. **Display (`--font-display`)**: `'Barlow Condensed', sans-serif` (weights 600, 700, 800)  
   Used for monumental Hero titles, Page Hero headers, and Package/Chapter indices with crisp tight leading (`0.98`–`1.08`).
2. **Body & UI (`--font-sans`)**: `'Plus Jakarta Sans', sans-serif` (weights 400, 500, 600, 700)  
   Used for all prose, navigation, buttons, forms, quiz questions, and admin workflows.
3. **Tabular Data (`--font-mono`)**: `'JetBrains Mono', monospace` (weights 500, 600) with `font-variant-numeric: tabular-nums`  
   Strictly applied to tuition prices (`Rp`), dates/times, quiz countdown timers, scores, percentages, queue counts, and WhatsApp phone numbers.

### Type Scale
- **Home Hero Display (`h1`)**: `clamp(2.5rem, 6vw, 4.75rem)` (`40px`–`76px`), `font-display font-extrabold tracking-tight`, `text-wrap: balance`.
- **Page Header Display (`h1`)**: `clamp(2rem, 4vw, 3.25rem)`, `font-display font-bold`.
- **Section Heading (`h2`)**: `clamp(1.625rem, 2.8vw, 2.35rem)`, `font-display font-bold tracking-tight`.
- **Card Heading (`h3`)**: `1.125rem`–`1.25rem`, `font-sans font-bold`.
- **Body Prose**: `0.9375rem`–`1.0625rem` (`15px`–`17px`), `leading-relaxed` (`1.6`–`1.7`), max measure `65ch`.
- **Metadata / Captions**: `0.75rem`–`0.8125rem` (`12px`–`13px`), unboxed inline text separated by `·` or `/`.

---

## 4. Indramayu Local Cultural Identity Rules

Applied subtly and meaningfully—never cluttering forms, quiz UI, or data tables:
1. **Authentic Regional Photography**:
   - Homepage Hero features the authentic aerial vista of Alun-Alun Indramayu with Pendopo and Gunung Ciremai horizon.
   - Secondary pages use context-appropriate photography (coastal Indramayu rice fields at sunrise, Indonesian elementary study environments, classroom reading desks) so no two primary flows repeat the same header background.
2. **Batik Paoman Minimalist Border Motif**:
   - A bespoke, understated inline SVG divider pattern inspired by Indramayu *Batik Paoman* geometric flora & coastal wave dots (`stroke` / `fill` at `12%–18%` opacity, max height `20px`–`28px`), used strictly as editorial section transitions and hero footer trim.
3. **Tugu Mangga / Coastal Horizon Emblem Accent**:
   - Subtle geometric arch/mango-leaf silhouette watermark ONLY inside structural emblem slots or footer crests—never invented fake landmarks or cartoonish icons.

---

## 5. Photography Overlays, Scrims & WCAG AA Contrast

- Every full-bleed photographic hero applies a multi-stop dark scrim (`linear-gradient(180deg, rgba(12,18,28,0.68) 0%, rgba(12,18,28,0.48) 42%, rgba(12,18,28,0.82) 100%)`) to ensure bright sky/rooftops never drop headline contrast below **4.5:1** (`#FFFFFF` & `#D9F99D` on scrim).
- Text sits **directly** on the scrimmed photo rather than inside opaque detached white cards, preserving depth and spatial openness.
- Hero quick-preview package panels (`PAKET 1`, `PAKET 2`, `PAKET 3`) over the photo use translucent dark-emerald/olive tinted backdrops (`rgba(20, 35, 24, 0.72)` with crisp `1px solid rgba(217, 249, 157, 0.35)` hairlines and subtle blur) so photography shows through while maintaining high-contrast white/lime-gold typography.

---

## 6. Layout Architecture, Top Bar Contract & Component System

### Top Navigation Bar (Strict 3-Zone Contract)
`[Hamburger + Official TOMOYO Logo] — [5-6 Single-Line Nav Links: Beranda, Program, Kuis, Guru, Cabang, Kontak] — [1 Primary Action CTA]`
- Every top-bar item enforces `whitespace-nowrap shrink-0`.
- Drawer menu holds secondary editorial links (`/tentang`, `/founder`, `/galeri`, `/pengumuman`, `/jadwal`, `/daftar`, `/peta-situs`).
- Mobile sticky header height stays well under `15%` of mobile viewport height (`64px` on `844px` = `7.5%`).

### Zero-Pill & Anti-Slop Surface Rules
- **No pervasive iOS glass cards everywhere**: Replace generic `ios-glass` boxes with editorial surfaces (`bg-white border border-[#DFDCD3]`) separated by generous `2rem`–`3.5rem` vertical rhythm and hairline dividers.
- **No static pill badges**: Dates, class grades, categories, and statuses render as quiet typographic lines with `·` separators (interactive filter buttons remain real `<button>` elements).
- **No thick left borders (`border-l-4`)**, **no `//` pseudo-code prefixes**, **no decorative pulsing dots**, **no ghost watermark text**, **no fake stats or testimonials**.
- **Single-Elevation Depth**: Flat surface + hairline border OR soft lift on interactive hover; never nested bordered boxes inside bordered boxes.

### Buttons & Controls
- **Primary Button**: `bg-[#BE123C] hover:bg-[#9F1239] text-white font-semibold rounded-xl px-5 py-3 min-h-[44px]` (`padding-x ≈ 2 × padding-y`).
- **Secondary Editorial Button**: `bg-[#121820] hover:bg-[#1E293B] text-white` or `bg-white border border-[#DFDCD3] hover:border-[#121820] text-[#121820]`.
- **Photo Overlay Ghost CTA**: `bg-white/15 hover:bg-white/25 text-white border border-white/40 backdrop-blur-sm`.
- Visible `focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#BE123C]` on every interactive control.

---

## 7. Dedicated Product Surfaces

1. **Public Online Quiz (`/kuis` & `/kuis/:quizId`)**:
   - No login required; distraction-free warm-ivory study sheet aesthetic.
   - Pre-quiz identification form (`Nama lengkap`, `Kelas`, optional `No. WA Orang Tua`) + instruction sheet + attempt check before starting.
   - Live tabular countdown timer (when configured), clear radio/button answer options ($\ge 48\text{px}$ tap height for Android touch ergonomics), sticky bottom progress/submit bar on mobile, and clean score summary card upon submission (never exposing hidden future keys).
2. **Admin Dashboard (`/admintomoyo`)**:
   - High-clarity operational workspace (`#F7F6F2` main canvas + `#121820` crisp left rail sidebar).
   - Tabs: `Ringkasan`, `Siswa & Pendaftaran`, `Pendaftaran Offline`, `Kuis Online`, `WhatsApp Group`, `WhatsApp Center`, `WhatsApp Fonnte`, `CMS Website`, `Pembayaran`, `Laporan & Ekspor PDF`.
   - Tabular figures (`tabular-nums`), horizontal-scroll safe responsive tables on narrow viewports, zero horizontal page overflow.

---

## 8. Accessibility, Mobile Ergonomics & Motion

- **Target Mobile Baseline**: `390px` width (Android smartphones) — zero horizontal overflow (`scrollWidth <= innerWidth`), touch targets $\ge 44\text{px}$, stacked readable forms, `text-base` (16px) inputs to prevent accidental mobile zoom.
- **Motion Budget**: Subtle compositor-only transitions (`transform`, `opacity`) $\le 200\text{ms}$ using `cubic-bezier(0.16, 1, 0.3, 1)`. Honors `@media (prefers-reduced-motion: reduce)` globally by disabling non-essential transitions and smooth scroll.
- **Zero-Broken-Image Policy**: Every `<img>` uses `referrerPolicy="no-referrer"`, explicit `alt` text, and a styled fallback container.
