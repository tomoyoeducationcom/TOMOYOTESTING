import { BRAND_IDENTITY } from './domain';

export const TOMOYO_APK_DOWNLOAD_URL =
  'https://drive.google.com/uc?export=download&id=1ARY-EUu8c1NGxo4zD-AhDnDSBDdJ3Rko';

export const TOMOYO_APK_BANNER_PNG = '/assets/aistudio/20261120_172643_6cf4e989.png';
export const TOMOYO_APK_BANNER_WEBP = '/assets/aistudio/tomoyo_apk_banner.webp';

export const TOMOYO_APK_SEO = {
  path: '/download-apk',
  label: 'Download APK',
  title: 'Download APK TOMOYO EDUCATION – Aplikasi Resmi Android',
  description:
    'Download aplikasi resmi TOMOYO EDUCATION untuk Android. Nikmati kemudahan mengakses layanan pendidikan, privat, dan bimbingan belajar TOMOYO melalui smartphone.',
  bannerAlt:
    'Banner Download APK TOMOYO PARENT — Aplikasi Resmi Android TOMOYO PRIVAT & BIMBEL EDUCATION',
} as const;

export interface ApkInstallStep {
  stepNumber: string;
  title: string;
  description: string;
}

export const TOMOYO_APK_INSTALL_STEPS: ApkInstallStep[] = [
  {
    stepNumber: '01',
    title: 'Unduh File APK Resmi',
    description:
      'Klik banner atau tombol Download APK di halaman ini, lalu klik DOWNLOAD APK SEKARANG untuk mengunduh file installer resmi melalui Google Drive TOMOYO EDUCATION.',
  },
  {
    stepNumber: '02',
    title: 'Buka File APK dari Pengelola Unduhan',
    description:
      'Setelah unduhan selesai di smartphone Android Anda, buka panel notifikasi atau aplikasi File Manager pada folder Download dan ketuk file APK TOMOYO EDUCATION.',
  },
  {
    stepNumber: '03',
    title: 'Izinkan Pemasangan Aplikasi dari Browser atau File Manager',
    description:
      'Jika Android menampilkan permintaan izin "Instal aplikasi tidak dikenal" (Install unknown apps), aktifkan izin tersebut sementara agar proses pemasangan dapat berjalan.',
  },
  {
    stepNumber: '04',
    title: 'Selesaikan Instalasi dan Buka Aplikasi',
    description:
      'Ketuk tombol Instal, tunggu beberapa saat hingga selesai, lalu buka aplikasi TOMOYO EDUCATION untuk mengakses informasi program, jadwal, kuis, dan layanan privat & bimbel.',
  },
];

export const TOMOYO_APK_SPEC_ITEMS = [
  { label: 'Nama Aplikasi', value: 'TOMOYO EDUCATION' },
  { label: 'Sistem Operasi', value: 'Android (APK Resmi)' },
  { label: 'Format File', value: 'APK Android' },
  { label: 'Penerbit Resmi', value: BRAND_IDENTITY.officialName },
] as const;

export function buildDownloadApkStructuredData(baseUrl: string) {
  const cleanBase = baseUrl.replace(/\/+$/, '');
  const pageUrl = `${cleanBase}${TOMOYO_APK_SEO.path}`;
  const bannerUrl = `${cleanBase}${TOMOYO_APK_BANNER_PNG}`;

  return {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'EducationalOrganization',
        '@id': `${cleanBase}/#organization`,
        name: BRAND_IDENTITY.officialName,
        alternateName: BRAND_IDENTITY.shortName,
        description: BRAND_IDENTITY.meaning,
        url: cleanBase,
        email: 'tomoyoeducation.com@gmail.com',
        telephone: '+6282119770700',
        sameAs: [
          'https://www.instagram.com/tomoyoeducation?bqrl=cHJsb3RnY3g1c3g2',
          'https://www.facebook.com/share/1CSomr9gXK/',
        ],
      },
      {
        '@type': 'WebPage',
        '@id': `${pageUrl}#webpage`,
        url: pageUrl,
        name: TOMOYO_APK_SEO.title,
        description: TOMOYO_APK_SEO.description,
        inLanguage: 'id-ID',
        isPartOf: {
          '@id': `${cleanBase}/#organization`,
        },
        primaryImageOfPage: {
          '@type': 'ImageObject',
          url: bannerUrl,
        },
      },
      {
        '@type': 'SoftwareApplication',
        '@id': `${pageUrl}#software`,
        name: 'TOMOYO EDUCATION',
        applicationCategory: 'EducationalApplication',
        operatingSystem: 'Android',
        downloadUrl: TOMOYO_APK_DOWNLOAD_URL,
        url: pageUrl,
        description: 'Aplikasi resmi TOMOYO EDUCATION.',
        image: bannerUrl,
        publisher: {
          '@type': 'Organization',
          name: BRAND_IDENTITY.officialName,
          url: cleanBase,
        },
      },
    ],
  };
}
