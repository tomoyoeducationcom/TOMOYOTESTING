import test from 'node:test';
import assert from 'node:assert/strict';
import {
  TOMOYO_APK_BANNER_PNG,
  TOMOYO_APK_BANNER_WEBP,
  TOMOYO_APK_DOWNLOAD_URL,
  TOMOYO_APK_INSTALL_STEPS,
  TOMOYO_APK_SEO,
  buildDownloadApkStructuredData,
} from './apkDownload';
import {
  generateRobotsTxt,
  generateSitemapXml,
  getSeoForPath,
  injectSeoIntoHtml,
} from './seo';

test('TOMOYO APK download constants match official Google Drive link and banner assets', () => {
  assert.equal(
    TOMOYO_APK_DOWNLOAD_URL,
    'https://drive.google.com/uc?export=download&id=1ARY-EUu8c1NGxo4zD-AhDnDSBDdJ3Rko'
  );
  assert.equal(TOMOYO_APK_BANNER_PNG, '/assets/aistudio/20261120_172643_6cf4e989.png');
  assert.equal(TOMOYO_APK_BANNER_WEBP, '/assets/aistudio/tomoyo_apk_banner.webp');
  assert.equal(TOMOYO_APK_INSTALL_STEPS.length, 4);
});

test('/download-apk SEO metadata, canonical, sitemap.xml, and robots.txt are indexable for Google Search Console', () => {
  const baseUrl = 'https://tomoyotesting.vercel.app';
  const routeSeo = getSeoForPath('/download-apk');
  assert.equal(routeSeo.indexable, true);
  assert.equal(routeSeo.title, 'Download APK TOMOYO EDUCATION – Aplikasi Resmi Android');
  assert.equal(
    routeSeo.description,
    'Download aplikasi resmi TOMOYO EDUCATION untuk Android. Nikmati kemudahan mengakses layanan pendidikan, privat, dan bimbingan belajar TOMOYO melalui smartphone.'
  );

  // Trailing slash normalizes to /download-apk canonical
  assert.equal(getSeoForPath('/download-apk/').path, '/download-apk');

  const sitemap = generateSitemapXml(baseUrl);
  assert.ok(sitemap.includes(`<loc>${baseUrl}/download-apk</loc>`));

  const robots = generateRobotsTxt(baseUrl);
  assert.ok(robots.includes('Allow: /'));
  assert.equal(robots.includes('Disallow: /download-apk'), false);

  const sampleHtml = [
    '<head>',
    '<title>Default</title>',
    '<meta name="description" content="Default" />',
    '<meta property="og:title" content="Default" />',
    '<meta property="og:description" content="Default" />',
    '<!--__SEO_HEAD__-->',
    '</head>',
    '<body><div id="root"></div></body>',
  ].join('');

  const injected = injectSeoIntoHtml(sampleHtml, '/download-apk', baseUrl);
  assert.ok(injected.includes(`<title>${TOMOYO_APK_SEO.title}</title>`));
  assert.ok(injected.includes('<meta name="robots" content="index, follow" />'));
  assert.equal(injected.includes('noindex'), false);
  assert.ok(
    injected.includes(`<link rel="canonical" href="${baseUrl}/download-apk" />`)
  );
  assert.ok(injected.includes(`<meta property="og:url" content="${baseUrl}/download-apk" />`));
  assert.ok(injected.includes(`<meta property="og:image" content="${baseUrl}${TOMOYO_APK_BANNER_PNG}" />`));
  assert.ok(injected.includes('<script id="tomoyo-org-jsonld" type="application/ld+json">'));
  assert.ok(injected.includes('<h1>Download Aplikasi TOMOYO EDUCATION</h1>'));
  assert.ok(injected.includes(TOMOYO_APK_DOWNLOAD_URL));
});

test('Schema.org structured data for /download-apk includes WebPage, SoftwareApplication, and Organization without fake metrics', () => {
  const ld = buildDownloadApkStructuredData('https://tomoyotesting.vercel.app');
  const graph = ld['@graph'];
  assert.equal(graph.length, 3);

  const org = graph.find((item) => item['@type'] === 'EducationalOrganization');
  const webpage = graph.find((item) => item['@type'] === 'WebPage');
  const software = graph.find((item) => item['@type'] === 'SoftwareApplication');

  assert.ok(org);
  assert.ok(webpage);
  assert.ok(software);

  assert.equal(software.name, 'TOMOYO EDUCATION');
  assert.equal(software.applicationCategory, 'EducationalApplication');
  assert.equal(software.operatingSystem, 'Android');
  assert.equal(software.downloadUrl, TOMOYO_APK_DOWNLOAD_URL);
  assert.equal(software.description, 'Aplikasi resmi TOMOYO EDUCATION.');

  // Ensure zero fabricated ratings, reviews, download counts, or price
  const serialized = JSON.stringify(ld);
  assert.equal(serialized.includes('aggregateRating'), false);
  assert.equal(serialized.includes('reviewCount'), false);
  assert.equal(serialized.includes('downloadCount'), false);
  assert.equal(serialized.includes('offers'), false);
});
