import test from 'node:test';
import assert from 'node:assert/strict';
import {
  ADMIN_EMAIL,
  ADMIN_UID,
  INITIAL_BRANCHES,
  INITIAL_PACKAGES,
  INITIAL_TEACHERS,
  LearningPackage,
  buildPaymentDueNotificationMessage,
  buildRegistrationNotificationMessage,
  computeNextMonthlyDueDate,
  formatRupiah,
  getPackagePriceDisplayForBranch,
  getPackagePriceForBranch,
  isAuthorizedAdminIdentity,
  isPaymentDueNow,
  normalizeWhatsappPhone,
  parseRupiahAmount,
  validateMultiChildSubmission,
  validateOfflineRegistrationDraft,
} from './domain';
import {
  generateRobotsTxt,
  generateSitemapXml,
  getSeoForPath,
  injectSeoIntoHtml,
} from './seo';

test('official TOMOYO data invariants hold exact counts and names without dummy prices', () => {
  assert.equal(INITIAL_PACKAGES.length, 3);
  assert.equal(INITIAL_PACKAGES[0].levelRange, 'TK – Kelas 1');
  assert.equal(INITIAL_PACKAGES[0].programType, 'Program: CALISTUNG');
  assert.deepEqual(INITIAL_PACKAGES[1].subjects, [
    'Bahasa Indonesia',
    'Bahasa Inggris',
    'MTK',
    'IPAS',
  ]);
  assert.deepEqual(INITIAL_PACKAGES[2].subjects, ['MTK', 'Bahasa Indonesia', 'IPAS']);

  assert.equal(INITIAL_TEACHERS.length, 9);
  assert.equal(INITIAL_TEACHERS[0].name, 'JALALUDIN NUROHMAN,S.I.Kom.,S.Pd.,Gr');
  assert.equal(INITIAL_TEACHERS[8].name, 'SOFYAN ANDI S.Si.,Gr');

  assert.equal(INITIAL_BRANCHES.length, 2);
  assert.equal(INITIAL_BRANCHES[0].slug, 'indramayu-kota');
  assert.equal(INITIAL_BRANCHES[0].latitude, -6.333158);
  assert.equal(INITIAL_BRANCHES[0].longitude, 108.341824);
  assert.equal(INITIAL_BRANCHES[1].slug, 'terisi');
  assert.equal(INITIAL_BRANCHES[1].latitude, -6.455393);
  assert.equal(INITIAL_BRANCHES[1].longitude, 108.140484);

  // Never invent dummy prices by default
  assert.equal(getPackagePriceForBranch(INITIAL_PACKAGES[0], 'indramayu-kota'), null);
  assert.equal(getPackagePriceForBranch(INITIAL_PACKAGES[0], 'terisi'), null);
});

test('per-branch package pricing differentiates Pusat vs Cabang and parses legacy priceLabel when unset', () => {
  assert.equal(parseRupiahAmount('Rp268.000'), 268000);
  assert.equal(parseRupiahAmount('Rp 250.000 - Rp 300.000'), null);

  const pkg: LearningPackage = {
    ...INITIAL_PACKAGES[0],
    pricePusat: 300000,
    priceCabang: 225000,
  };
  assert.equal(getPackagePriceForBranch(pkg, 'indramayu-kota'), 300000);
  assert.equal(getPackagePriceForBranch(pkg, 'terisi'), 225000);
  assert.equal(formatRupiah(300000), 'Rp 300.000');

  const pusatOnly: LearningPackage = {
    ...INITIAL_PACKAGES[1],
    pricePusat: 350000,
    priceLabel: 'Rp268.000',
  };
  assert.equal(getPackagePriceForBranch(pusatOnly, 'indramayu-kota'), 350000);
  assert.equal(getPackagePriceForBranch(pusatOnly, 'terisi'), null);

  const legacyOnly: LearningPackage = {
    ...INITIAL_PACKAGES[0],
    priceLabel: 'Rp268.000',
    priceNote: '100X pertemuan',
  };
  assert.equal(getPackagePriceForBranch(legacyOnly, 'indramayu-kota'), 268000);
  assert.equal(getPackagePriceForBranch(legacyOnly, 'terisi'), 268000);
  assert.equal(getPackagePriceDisplayForBranch(legacyOnly, 'indramayu-kota'), 'Rp 268.000');
});

test('monthly billing due-date computation preserves exact day and time (e.g. Jan 25 12:00 -> Feb 25 12:00)', () => {
  const regJan25 = new Date('2026-01-25T05:00:00.000Z'); // 12:00 WIB
  const dueFeb25 = computeNextMonthlyDueDate(regJan25);
  assert.equal(dueFeb25.toISOString(), '2026-02-25T05:00:00.000Z');

  // End-of-month clamping: Jan 31 -> Feb 28 (2026 non-leap year)
  const regJan31 = new Date('2026-01-31T05:00:00.000Z');
  const dueFeb28 = computeNextMonthlyDueDate(regJan31);
  assert.equal(dueFeb28.toISOString(), '2026-02-28T05:00:00.000Z');

  // Due status checks
  assert.equal(
    isPaymentDueNow(dueFeb25.toISOString(), undefined, new Date('2026-02-25T04:59:00.000Z')),
    false
  );
  assert.equal(
    isPaymentDueNow(dueFeb25.toISOString(), undefined, new Date('2026-02-25T05:00:00.000Z')),
    true
  );
  // Already confirmed on/after due time -> no longer pending due confirmation
  assert.equal(
    isPaymentDueNow(
      dueFeb25.toISOString(),
      '2026-02-25T05:05:00.000Z',
      new Date('2026-02-26T05:00:00.000Z')
    ),
    false
  );
});

test('admin authorization requires matching UID, email, and verified email', () => {
  assert.equal(
    isAuthorizedAdminIdentity({
      uid: ADMIN_UID,
      email: ADMIN_EMAIL,
      emailVerified: true,
    }),
    true
  );

  assert.equal(
    isAuthorizedAdminIdentity({
      uid: 'other-uid',
      email: ADMIN_EMAIL,
      emailVerified: true,
    }),
    false
  );

  assert.equal(
    isAuthorizedAdminIdentity({
      uid: ADMIN_UID,
      email: ADMIN_EMAIL,
      emailVerified: false,
    }),
    false
  );

  assert.equal(
    isAuthorizedAdminIdentity({
      uid: ADMIN_UID,
      email: 'attacker@gmail.com',
      emailVerified: true,
    }),
    false
  );
});

test('multi-child and offline registration validation require photo, gender, active phone, and payment status', () => {
  const missingPhoto = validateMultiChildSubmission({
    parentName: 'Siti Aminah',
    parentPhone: '082119770700',
    children: [
      {
        childName: 'Rafi Pratama',
        childPhotoUrl: '',
        childGender: 'Laki-laki',
        gradeLevel: 'Kelas 1',
        packageId: 'paket-1',
        branchId: 'indramayu-kota',
      },
    ],
  });
  assert.equal(missingPhoto.valid, false);
  assert.ok(missingPhoto.errors.some((e) => e.includes('Foto anak')));

  const validOnline = validateMultiChildSubmission({
    parentName: 'Siti Aminah',
    parentPhone: '082119770700',
    children: [
      {
        childName: 'Rafi Pratama',
        childPhotoUrl: 'https://res.cloudinary.com/fgxdx2hq/image/upload/v1/rafi.jpg',
        childGender: 'Laki-laki',
        gradeLevel: 'Kelas 1',
        packageId: 'paket-1',
        branchId: 'indramayu-kota',
      },
      {
        childName: 'Nadia Putri',
        childPhotoUrl: 'https://res.cloudinary.com/fgxdx2hq/image/upload/v1/nadia.jpg',
        childGender: 'Perempuan',
        gradeLevel: 'Kelas 6',
        packageId: 'paket-3',
        branchId: 'terisi',
      },
    ],
  });
  assert.equal(validOnline.valid, true);

  const invalidOffline = validateOfflineRegistrationDraft({
    parentName: 'Pak Karta',
    parentPhone: '0812',
    childName: 'Budi',
    childPhotoUrl: '',
    childGender: 'Laki-laki',
    gradeLevel: 'Kelas 3',
    packageId: 'paket-2',
    branchId: 'terisi',
    billingAmount: '',
    initialPaymentStatus: 'cicilan',
    paymentMethod: 'Tunai',
  });
  assert.equal(invalidOffline.valid, false);
  assert.ok(invalidOffline.errors.length >= 3);

  const validOffline = validateOfflineRegistrationDraft({
    parentName: 'Pak Karta',
    parentPhone: '082119770700',
    childName: 'Budi Santoso',
    childPhotoUrl: 'https://res.cloudinary.com/fgxdx2hq/image/upload/v1/budi.jpg',
    childGender: 'Laki-laki',
    gradeLevel: 'Kelas 3 SD',
    packageId: 'paket-2',
    branchId: 'terisi',
    billingAmount: 250000,
    initialPaymentStatus: 'cicilan',
    paymentMethod: 'Tunai',
  });
  assert.equal(validOffline.valid, true);
});

test('phone normalization and Fonnte registration & due-date WhatsApp message formatting', () => {
  assert.equal(normalizeWhatsappPhone('0821-1977-0700'), '6282119770700');
  assert.equal(normalizeWhatsappPhone('+6281996284733'), '6281996284733');

  const regMsg = buildRegistrationNotificationMessage({
    parentName: 'Siti Aminah',
    childName: 'Rafi Pratama',
    gradeLevel: 'Kelas 1',
    packageName: 'PAKET 1: TK – Kelas 1',
    branchName: 'TOMOYO EDUCATION INDRAMAYU KOTA (PUSAT)',
    appUrl: 'https://example.vercel.app/',
  });
  assert.ok(regMsg.includes('PENDAFTARAN SISWA BARU — TOMOYO EDUCATION'));
  assert.ok(regMsg.includes('https://example.vercel.app/admintomoyo'));

  const dueMsg = buildPaymentDueNotificationMessage({
    childName: 'Budi',
    parentName: 'Ibu Sari',
    parentPhone: '082119770700',
    packageName: 'PAKET 2: Kelas 2 – Kelas 5',
    branchName: 'TOMOYO EDUCATION KECAMATAN TERISI (CABANG)',
    registeredAtIso: '2026-01-25T05:00:00.000Z',
    dueAtIso: '2026-02-25T05:00:00.000Z',
    billingAmount: 250000,
    appUrl: 'https://example.vercel.app/',
  });
  assert.ok(dueMsg.includes('PENGINGAT PEMBAYARAN JATUH TEMPO'));
  assert.ok(dueMsg.includes('Budi'));
  assert.ok(dueMsg.includes('HARUS DIKONFIRMASI ADMIN'));
  assert.ok(dueMsg.includes('Rp 250.000'));
});

test('SEO excludes private routes from sitemap and applies noindex', () => {
  const baseUrl = 'https://preview.example.com';
  const sitemap = generateSitemapXml(baseUrl);
  assert.ok(sitemap.includes(`${baseUrl}/program`));
  assert.ok(sitemap.includes(`${baseUrl}/founder`));
  assert.ok(sitemap.includes(`${baseUrl}/peta-situs`));
  assert.equal(sitemap.includes('/admintomoyo'), false);
  assert.equal(sitemap.includes('/masuk'), false);
  assert.equal(sitemap.includes('/dashboard'), false);

  const robots = generateRobotsTxt(baseUrl);
  assert.ok(robots.includes('Disallow: /admintomoyo'));
  assert.ok(robots.includes('Disallow: /dashboard'));
  assert.ok(robots.includes('Disallow: /masuk'));

  assert.equal(getSeoForPath('/admintomoyo').indexable, false);
  assert.equal(getSeoForPath('/masuk').indexable, false);
  assert.equal(getSeoForPath('/dashboard').indexable, false);
  assert.equal(getSeoForPath('/guru').indexable, true);
  assert.equal(getSeoForPath('/founder').indexable, true);

  const sampleHtml = '<head><title>X</title><meta name="description" content="X" /><!--__SEO_HEAD__--></head>';
  const injectedAdmin = injectSeoIntoHtml(sampleHtml, '/admintomoyo', baseUrl);
  assert.ok(injectedAdmin.includes('<meta name="robots" content="noindex, nofollow" />'));
  assert.equal(injectedAdmin.includes('rel="canonical"'), false);

  const injectedPublic = injectSeoIntoHtml(sampleHtml, '/cabang', baseUrl);
  assert.ok(injectedPublic.includes('<meta name="robots" content="index, follow" />'));
  assert.ok(injectedPublic.includes('<link rel="canonical" href="https://preview.example.com/cabang" />'));
});

test('server auth extracts X-Firebase-Token first and falls back to Bearer header', async () => {
  const { extractFirebaseTokenFromHeaders } = await import('../server/auth');
  assert.equal(
    extractFirebaseTokenFromHeaders({
      'x-firebase-token': '  firebase-jwt-custom  ',
      authorization: 'Bearer proxy-token',
    }),
    'firebase-jwt-custom'
  );
  assert.equal(
    extractFirebaseTokenFromHeaders({
      authorization: 'Bearer fallback-jwt',
    }),
    'fallback-jwt'
  );
  assert.equal(extractFirebaseTokenFromHeaders({}), null);
  assert.equal(extractFirebaseTokenFromHeaders({ 'x-firebase-token': '   ' }), null);
});

test('formatFirebaseAuthError surfaces unauthorized hostname and translates common auth errors', async () => {
  const { formatFirebaseAuthError } = await import('./domain');

  const unauth = formatFirebaseAuthError(
    { code: 'auth/unauthorized-domain', message: 'Firebase: Error (auth/unauthorized-domain).' },
    'ais-dev-example.asia-northeast1.run.app'
  );
  assert.equal(unauth.code, 'auth/unauthorized-domain');
  assert.equal(unauth.unauthorizedDomain, 'ais-dev-example.asia-northeast1.run.app');
  assert.ok(unauth.message.includes('ais-dev-example.asia-northeast1.run.app'));
  assert.ok(unauth.message.includes('Authorized Domains'));

  const closed = formatFirebaseAuthError({ code: 'auth/popup-closed-by-user' });
  assert.equal(closed.unauthorizedDomain, null);
  assert.ok(closed.message.includes('ditutup'));
});

