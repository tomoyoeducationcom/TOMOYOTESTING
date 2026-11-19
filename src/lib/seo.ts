export interface RouteSeoMeta {
  path: string;
  title: string;
  description: string;
  indexable: boolean;
  label: string;
}

export const PUBLIC_INDEXABLE_ROUTES: RouteSeoMeta[] = [
  {
    path: '/',
    label: 'Beranda',
    title: 'TOMOYO PRIVAT & BIMBEL EDUCATION — Learn, Grow, Succeed',
    description:
      'Tempat tumbuhnya generasi cerdas, mandiri, berprestasi, dan siap meraih masa depan. Program Calistung, Mata Pelajaran SD, dan Persiapan TKA di Indramayu.',
    indexable: true,
  },
  {
    path: '/tentang',
    label: 'Tentang Kami',
    title: 'Tentang & Filosofi — TOMOYO PRIVAT & BIMBEL EDUCATION',
    description:
      'Mengenal profil lembaga, filosofi brand TOMOYO, dan visi misi pendidikan di Indramayu.',
    indexable: true,
  },
  {
    path: '/founder',
    label: 'Founder & CEO',
    title: 'Founder & CEO — TOMOYO PRIVAT & BIMBEL EDUCATION',
    description:
      'Profil resmi Founder & CEO TOMOYO PRIVAT & BIMBEL EDUCATION, JALALUDIN NUROHMAN,S.I.Kom.,S.Pd.,Gr.',
    indexable: true,
  },
  {
    path: '/program',
    label: 'Program Belajar',
    title: 'Program & Paket Belajar — TOMOYO PRIVAT & BIMBEL EDUCATION',
    description:
      'Tiga paket belajar resmi TOMOYO: Paket 1 TK–Kelas 1 (CALISTUNG), Paket 2 Kelas 2–5, dan Paket 3 Kelas 6 (Persiapan TKA).',
    indexable: true,
  },
  {
    path: '/kuis',
    label: 'Kuis Online',
    title: 'Kuis Online Siswa — TOMOYO PRIVAT & BIMBEL EDUCATION',
    description:
      'Latihan soal dan evaluasi belajar interaktif tanpa login untuk siswa TK hingga Kelas 6 SD TOMOYO Education.',
    indexable: true,
  },
  {
    path: '/guru',
    label: 'Guru & Pengajar',
    title: 'Daftar Guru & Pengajar — TOMOYO PRIVAT & BIMBEL EDUCATION',
    description:
      'Daftar tenaga pengajar resmi di TOMOYO PRIVAT & BIMBEL EDUCATION Indramayu Kota dan Terisi.',
    indexable: true,
  },
  {
    path: '/galeri',
    label: 'Galeri Kegiatan',
    title: 'Galeri Kegiatan — TOMOYO PRIVAT & BIMBEL EDUCATION',
    description:
      'Dokumentasi kegiatan belajar mengajar dan aktivitas siswa di TOMOYO PRIVAT & BIMBEL EDUCATION.',
    indexable: true,
  },
  {
    path: '/pengumuman',
    label: 'Pengumuman',
    title: 'Pengumuman Resmi — TOMOYO PRIVAT & BIMBEL EDUCATION',
    description:
      'Informasi dan pengumuman terbaru dari TOMOYO PRIVAT & BIMBEL EDUCATION untuk orang tua dan siswa.',
    indexable: true,
  },
  {
    path: '/jadwal',
    label: 'Jadwal Belajar',
    title: 'Jadwal Belajar — TOMOYO PRIVAT & BIMBEL EDUCATION',
    description:
      'Informasi jadwal belajar resmi TOMOYO PRIVAT & BIMBEL EDUCATION cabang Indramayu Kota dan Kecamatan Terisi.',
    indexable: true,
  },
  {
    path: '/cabang',
    label: 'Cabang & Lokasi',
    title: 'Cabang & Lokasi — TOMOYO PRIVAT & BIMBEL EDUCATION',
    description:
      'Lokasi resmi TOMOYO EDUCATION Indramayu Kota (Pusat) dan Kecamatan Terisi (Cabang) lengkap dengan tautan Google Maps.',
    indexable: true,
  },
  {
    path: '/kontak',
    label: 'Kontak Resmi',
    title: 'Kontak Resmi — TOMOYO PRIVAT & BIMBEL EDUCATION',
    description:
      'Hubungi TOMOYO PRIVAT & BIMBEL EDUCATION melalui WhatsApp 0821-1977-0700, email, Instagram, dan Facebook resmi.',
    indexable: true,
  },
  {
    path: '/daftar',
    label: 'Pendaftaran Siswa',
    title: 'Pendaftaran Siswa — TOMOYO PRIVAT & BIMBEL EDUCATION',
    description:
      'Alur pendaftaran siswa baru TOMOYO PRIVAT & BIMBEL EDUCATION untuk satu atau beberapa anak melalui akun Google orang tua.',
    indexable: true,
  },
  {
    path: '/peta-situs',
    label: 'Peta Situs',
    title: 'Peta Situs — TOMOYO PRIVAT & BIMBEL EDUCATION',
    description:
      'Daftar lengkap halaman publik yang tersedia di situs resmi TOMOYO PRIVAT & BIMBEL EDUCATION.',
    indexable: true,
  },
];

export const NOINDEX_ROUTES: RouteSeoMeta[] = [
  {
    path: '/masuk',
    label: 'Masuk Orang Tua',
    title: 'Masuk Orang Tua — TOMOYO PRIVAT & BIMBEL EDUCATION',
    description: 'Halaman autentikasi Google Sign-In khusus orang tua siswa TOMOYO.',
    indexable: false,
  },
  {
    path: '/dashboard',
    label: 'Dashboard Orang Tua',
    title: 'Dashboard Orang Tua — TOMOYO PRIVAT & BIMBEL EDUCATION',
    description: 'Portal orang tua untuk pendaftaran dan pemantauan status siswa TOMOYO.',
    indexable: false,
  },
  {
    path: '/admintomoyo',
    label: 'Admin Dashboard',
    title: 'Panel Administrasi — TOMOYO PRIVAT & BIMBEL EDUCATION',
    description: 'Panel administrasi internal TOMOYO PRIVAT & BIMBEL EDUCATION.',
    indexable: false,
  },
];

export function normalizePathname(pathname: string): string {
  const clean = pathname.split('?')[0].split('#')[0] || '/';
  if (clean.length > 1 && clean.endsWith('/')) {
    return clean.slice(0, -1);
  }
  return clean;
}

export function getSeoForPath(pathname: string): RouteSeoMeta {
  const normalized = normalizePathname(pathname);
  const noindexMatch = NOINDEX_ROUTES.find(
    (r) => normalized === r.path || normalized.startsWith(`${r.path}/`)
  );
  if (noindexMatch) return noindexMatch;

  if (normalized.startsWith('/kuis/')) {
    return PUBLIC_INDEXABLE_ROUTES.find((r) => r.path === '/kuis') || PUBLIC_INDEXABLE_ROUTES[0];
  }

  const publicMatch = PUBLIC_INDEXABLE_ROUTES.find((r) => r.path === normalized);
  if (publicMatch) return publicMatch;

  return PUBLIC_INDEXABLE_ROUTES[0];
}

export function generateSitemapXml(baseUrl: string): string {
  const cleanBase = baseUrl.replace(/\/+$/, '');
  const urls = PUBLIC_INDEXABLE_ROUTES.map((route) => {
    const loc = route.path === '/' ? `${cleanBase}/` : `${cleanBase}${route.path}`;
    const priority = route.path === '/' ? '1.0' : '0.8';
    return [
      '  <url>',
      `    <loc>${escapeXml(loc)}</loc>`,
      `    <changefreq>weekly</changefreq>`,
      `    <priority>${priority}</priority>`,
      '  </url>',
    ].join('\n');
  }).join('\n');

  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    urls,
    '</urlset>',
  ].join('\n');
}

export function generateRobotsTxt(baseUrl: string): string {
  const cleanBase = baseUrl.replace(/\/+$/, '');
  return [
    'User-agent: *',
    'Allow: /',
    'Disallow: /admintomoyo',
    'Disallow: /dashboard',
    'Disallow: /masuk',
    'Disallow: /api/',
    '',
    `Sitemap: ${cleanBase}/sitemap.xml`,
    '',
  ].join('\n');
}

function escapeHtmlAttr(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function escapeXml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

export function injectSeoIntoHtml(html: string, pathname: string, baseUrl: string): string {
  const meta = getSeoForPath(pathname);
  const cleanBase = baseUrl.replace(/\/+$/, '');
  const canonicalUrl = meta.path === '/' ? `${cleanBase}/` : `${cleanBase}${meta.path}`;

  let output = html
    .replace(/<title>[\s\S]*?<\/title>/i, `<title>${escapeHtmlAttr(meta.title)}</title>`)
    .replace(
      /<meta\s+name="description"\s+content="[^"]*"\s*\/?>/i,
      `<meta name="description" content="${escapeHtmlAttr(meta.description)}" />`
    )
    .replace(
      /<meta\s+property="og:title"\s+content="[^"]*"\s*\/?>/i,
      `<meta property="og:title" content="${escapeHtmlAttr(meta.title)}" />`
    )
    .replace(
      /<meta\s+property="og:description"\s+content="[^"]*"\s*\/?>/i,
      `<meta property="og:description" content="${escapeHtmlAttr(meta.description)}" />`
    );

  const robotsTag = meta.indexable
    ? '<meta name="robots" content="index, follow" />'
    : '<meta name="robots" content="noindex, nofollow" />';

  const canonicalTag = meta.indexable
    ? `<link rel="canonical" href="${escapeHtmlAttr(canonicalUrl)}" />\n    <meta property="og:url" content="${escapeHtmlAttr(canonicalUrl)}" />`
    : '';

  const extraHead = [robotsTag, canonicalTag].filter(Boolean).join('\n    ');
  output = output.replace('<!--__SEO_HEAD__-->', extraHead);
  return output;
}
