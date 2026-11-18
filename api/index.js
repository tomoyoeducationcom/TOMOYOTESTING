// server.ts
import "dotenv/config";
import express from "express";
import fs2 from "fs";
import path2 from "path";
import { fileURLToPath } from "url";

// src/lib/domain.ts
var ADMIN_UID = "Tlqf2dNHYCRuYmxgEbHFa783iDs1";
var ADMIN_EMAIL = "tomoyoeducation.com@gmail.com";
var ADMIN_WHATSAPP_TARGET = "6281996284733";
var BRAND_IDENTITY = {
  officialName: "TOMOYO PRIVAT & BIMBEL EDUCATION",
  shortName: "TOMOYO EDUCATION",
  tagline: "LEARN \u2022 GROW \u2022 SUCCEED",
  meaning: "Tempat tumbuhnya generasi cerdas, mandiri, berprestasi, dan siap meraih masa depan.",
  philosophyNote: "TOMOYO merupakan nama yang dimaknai sebagai simbol harapan, semangat, dan masa depan yang lebih baik (filosofi kreatif brand, bukan klaim etimologi literal).",
  headerLogoPath: "/assets/aistudio/header_bb02064d.jpg",
  emblemLogoPath: "/assets/aistudio/favicon_67ba3fe5.png",
  founderPhotoPath: "/assets/aistudio/20261118_140704_95553ff5.jpg",
  founderName: "JALALUDIN NUROHMAN,S.I.Kom.,S.Pd.,Gr",
  founderRole: "Founder & CEO"
};
var INITIAL_FOUNDER = {
  id: "founder",
  sectionKey: "founder",
  founderName: BRAND_IDENTITY.founderName,
  founderRole: BRAND_IDENTITY.founderRole,
  founderPhotoUrl: BRAND_IDENTITY.founderPhotoPath,
  founderBio: "",
  isPublished: true
};
var INITIAL_ABOUT = {
  id: "about",
  sectionKey: "about",
  title: BRAND_IDENTITY.officialName,
  subtitle: BRAND_IDENTITY.meaning,
  body: BRAND_IDENTITY.philosophyNote,
  vision: "",
  mission: "",
  isPublished: true
};
function isAuthorizedAdminIdentity(identity) {
  return identity.uid === ADMIN_UID && identity.email === ADMIN_EMAIL && identity.emailVerified === true;
}
function formatRupiah(amount) {
  return `Rp ${Math.round(amount).toLocaleString("id-ID")}`;
}
function computeNextMonthlyDueDate(baseDate) {
  const year = baseDate.getUTCFullYear();
  const month = baseDate.getUTCMonth();
  const day = baseDate.getUTCDate();
  const hours = baseDate.getUTCHours();
  const minutes = baseDate.getUTCMinutes();
  const seconds = baseDate.getUTCSeconds();
  const ms = baseDate.getUTCMilliseconds();
  const targetMonthIndex = month + 1;
  const targetYear = year + Math.floor(targetMonthIndex / 12);
  const normalizedTargetMonth = targetMonthIndex % 12;
  const daysInTargetMonth = new Date(Date.UTC(targetYear, normalizedTargetMonth + 1, 0)).getUTCDate();
  const clampedDay = Math.min(day, daysInTargetMonth);
  return new Date(
    Date.UTC(targetYear, normalizedTargetMonth, clampedDay, hours, minutes, seconds, ms)
  );
}
function formatJakartaDateTime(isoString) {
  if (!isoString) return "-";
  const dt = new Date(isoString);
  if (Number.isNaN(dt.getTime())) return "-";
  return dt.toLocaleString("id-ID", {
    timeZone: "Asia/Jakarta",
    day: "2-digit",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  }) + " WIB";
}
function normalizeWhatsappPhone(raw) {
  const digits = raw.replace(/[^\d+]/g, "");
  if (!digits) return "";
  if (digits.startsWith("+62")) return digits.slice(1);
  if (digits.startsWith("62")) return digits;
  if (digits.startsWith("0")) return `62${digits.slice(1)}`;
  return digits;
}
function buildRegistrationNotificationMessage(params) {
  const cleanBase = params.appUrl.replace(/\/+$/, "");
  const title = params.channel === "offline" ? "\u{1F4DD} PENDAFTARAN SISWA OFFLINE (ADMIN) \u2014 TOMOYO EDUCATION" : "\u{1F514} PENDAFTARAN SISWA BARU \u2014 TOMOYO EDUCATION";
  const lines = [
    title,
    "",
    `Nama Orang Tua: ${params.parentName}`,
    ...params.parentPhone ? [`No. HP/WA Aktif: ${params.parentPhone}`] : [],
    `Nama Siswa: ${params.childName}`,
    ...params.childGender ? [`Jenis Kelamin: ${params.childGender}`] : [],
    `Kelas: ${params.gradeLevel}`,
    `Program: ${params.packageName}`,
    `Cabang: ${params.branchName}`,
    ...typeof params.billingAmount === "number" ? [`Nominal Paket: ${formatRupiah(params.billingAmount)}`] : [],
    ...params.paymentStatusLabel ? [`Status Pembayaran: ${params.paymentStatusLabel}`] : [],
    ...params.nextDueAtIso ? [`Jadwal Jatuh Tempo Berikutnya: ${formatJakartaDateTime(params.nextDueAtIso)}`] : [],
    `Status: ${params.channel === "offline" ? "TERDAFTAR OFFLINE (DISETUJUI ADMIN)" : "MENUNGGU PERSETUJUAN"}`,
    "",
    "Silakan periksa data siswa melalui dashboard admin:",
    `${cleanBase}/admintomoyo`
  ];
  return lines.join("\n");
}
function buildPaymentDueNotificationMessage(params) {
  const cleanBase = params.appUrl.replace(/\/+$/, "");
  return [
    "\u23F0 PENGINGAT PEMBAYARAN JATUH TEMPO \u2014 TOMOYO EDUCATION",
    "",
    `Siswa: ${params.childName}`,
    `Orang Tua: ${params.parentName} (${params.parentPhone})`,
    `Program: ${params.packageName}`,
    `Cabang: ${params.branchName}`,
    ...params.registeredAtIso ? [`Tanggal Daftar: ${formatJakartaDateTime(params.registeredAtIso)}`] : [],
    `Waktu Jatuh Tempo: ${formatJakartaDateTime(params.dueAtIso)}`,
    ...typeof params.billingAmount === "number" && params.billingAmount > 0 ? [`Nominal Tagihan: ${formatRupiah(params.billingAmount)}`] : [],
    "",
    "Status: JATUH TEMPO PEMBAYARAN \u2014 HARUS DIKONFIRMASI ADMIN.",
    `Konfirmasi melalui Dashboard Admin: ${cleanBase}/admintomoyo`
  ].join("\n");
}
function getPaymentStatusLabel(status) {
  switch (status) {
    case "lunas":
      return "Lunas";
    case "cicilan":
      return "Cicilan";
    default:
      return "Belum Bayar";
  }
}

// src/lib/seo.ts
var PUBLIC_INDEXABLE_ROUTES = [
  {
    path: "/",
    label: "Beranda",
    title: "TOMOYO PRIVAT & BIMBEL EDUCATION \u2014 Learn, Grow, Succeed",
    description: "Tempat tumbuhnya generasi cerdas, mandiri, berprestasi, dan siap meraih masa depan. Program Calistung, Mata Pelajaran SD, dan Persiapan TKA di Indramayu.",
    indexable: true
  },
  {
    path: "/tentang",
    label: "Tentang Kami",
    title: "Tentang & Filosofi \u2014 TOMOYO PRIVAT & BIMBEL EDUCATION",
    description: "Mengenal profil lembaga, filosofi brand TOMOYO, dan visi misi pendidikan di Indramayu.",
    indexable: true
  },
  {
    path: "/founder",
    label: "Founder & CEO",
    title: "Founder & CEO \u2014 TOMOYO PRIVAT & BIMBEL EDUCATION",
    description: "Profil resmi Founder & CEO TOMOYO PRIVAT & BIMBEL EDUCATION, JALALUDIN NUROHMAN,S.I.Kom.,S.Pd.,Gr.",
    indexable: true
  },
  {
    path: "/program",
    label: "Program Belajar",
    title: "Program & Paket Belajar \u2014 TOMOYO PRIVAT & BIMBEL EDUCATION",
    description: "Tiga paket belajar resmi TOMOYO: Paket 1 TK\u2013Kelas 1 (CALISTUNG), Paket 2 Kelas 2\u20135, dan Paket 3 Kelas 6 (Persiapan TKA).",
    indexable: true
  },
  {
    path: "/guru",
    label: "Guru & Pengajar",
    title: "Daftar Guru & Pengajar \u2014 TOMOYO PRIVAT & BIMBEL EDUCATION",
    description: "Daftar tenaga pengajar resmi di TOMOYO PRIVAT & BIMBEL EDUCATION Indramayu Kota dan Terisi.",
    indexable: true
  },
  {
    path: "/galeri",
    label: "Galeri Kegiatan",
    title: "Galeri Kegiatan \u2014 TOMOYO PRIVAT & BIMBEL EDUCATION",
    description: "Dokumentasi kegiatan belajar mengajar dan aktivitas siswa di TOMOYO PRIVAT & BIMBEL EDUCATION.",
    indexable: true
  },
  {
    path: "/pengumuman",
    label: "Pengumuman",
    title: "Pengumuman Resmi \u2014 TOMOYO PRIVAT & BIMBEL EDUCATION",
    description: "Informasi dan pengumuman terbaru dari TOMOYO PRIVAT & BIMBEL EDUCATION untuk orang tua dan siswa.",
    indexable: true
  },
  {
    path: "/jadwal",
    label: "Jadwal Belajar",
    title: "Jadwal Belajar \u2014 TOMOYO PRIVAT & BIMBEL EDUCATION",
    description: "Informasi jadwal belajar resmi TOMOYO PRIVAT & BIMBEL EDUCATION cabang Indramayu Kota dan Kecamatan Terisi.",
    indexable: true
  },
  {
    path: "/cabang",
    label: "Cabang & Lokasi",
    title: "Cabang & Lokasi \u2014 TOMOYO PRIVAT & BIMBEL EDUCATION",
    description: "Lokasi resmi TOMOYO EDUCATION Indramayu Kota (Pusat) dan Kecamatan Terisi (Cabang) lengkap dengan tautan Google Maps.",
    indexable: true
  },
  {
    path: "/kontak",
    label: "Kontak Resmi",
    title: "Kontak Resmi \u2014 TOMOYO PRIVAT & BIMBEL EDUCATION",
    description: "Hubungi TOMOYO PRIVAT & BIMBEL EDUCATION melalui WhatsApp 0821-1977-0700, email, Instagram, dan Facebook resmi.",
    indexable: true
  },
  {
    path: "/daftar",
    label: "Pendaftaran Siswa",
    title: "Pendaftaran Siswa \u2014 TOMOYO PRIVAT & BIMBEL EDUCATION",
    description: "Alur pendaftaran siswa baru TOMOYO PRIVAT & BIMBEL EDUCATION untuk satu atau beberapa anak melalui akun Google orang tua.",
    indexable: true
  },
  {
    path: "/peta-situs",
    label: "Peta Situs",
    title: "Peta Situs \u2014 TOMOYO PRIVAT & BIMBEL EDUCATION",
    description: "Daftar lengkap halaman publik yang tersedia di situs resmi TOMOYO PRIVAT & BIMBEL EDUCATION.",
    indexable: true
  }
];
var NOINDEX_ROUTES = [
  {
    path: "/masuk",
    label: "Masuk Orang Tua",
    title: "Masuk Orang Tua \u2014 TOMOYO PRIVAT & BIMBEL EDUCATION",
    description: "Halaman autentikasi Google Sign-In khusus orang tua siswa TOMOYO.",
    indexable: false
  },
  {
    path: "/dashboard",
    label: "Dashboard Orang Tua",
    title: "Dashboard Orang Tua \u2014 TOMOYO PRIVAT & BIMBEL EDUCATION",
    description: "Portal orang tua untuk pendaftaran dan pemantauan status siswa TOMOYO.",
    indexable: false
  },
  {
    path: "/admintomoyo",
    label: "Admin Dashboard",
    title: "Panel Administrasi \u2014 TOMOYO PRIVAT & BIMBEL EDUCATION",
    description: "Panel administrasi internal TOMOYO PRIVAT & BIMBEL EDUCATION.",
    indexable: false
  }
];
function normalizePathname(pathname) {
  const clean = pathname.split("?")[0].split("#")[0] || "/";
  if (clean.length > 1 && clean.endsWith("/")) {
    return clean.slice(0, -1);
  }
  return clean;
}
function getSeoForPath(pathname) {
  const normalized = normalizePathname(pathname);
  const noindexMatch = NOINDEX_ROUTES.find(
    (r) => normalized === r.path || normalized.startsWith(`${r.path}/`)
  );
  if (noindexMatch) return noindexMatch;
  const publicMatch = PUBLIC_INDEXABLE_ROUTES.find((r) => r.path === normalized);
  if (publicMatch) return publicMatch;
  return PUBLIC_INDEXABLE_ROUTES[0];
}
function generateSitemapXml(baseUrl) {
  const cleanBase = baseUrl.replace(/\/+$/, "");
  const urls = PUBLIC_INDEXABLE_ROUTES.map((route) => {
    const loc = route.path === "/" ? `${cleanBase}/` : `${cleanBase}${route.path}`;
    const priority = route.path === "/" ? "1.0" : "0.8";
    return [
      "  <url>",
      `    <loc>${escapeXml(loc)}</loc>`,
      `    <changefreq>weekly</changefreq>`,
      `    <priority>${priority}</priority>`,
      "  </url>"
    ].join("\n");
  }).join("\n");
  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    urls,
    "</urlset>"
  ].join("\n");
}
function generateRobotsTxt(baseUrl) {
  const cleanBase = baseUrl.replace(/\/+$/, "");
  return [
    "User-agent: *",
    "Allow: /",
    "Disallow: /admintomoyo",
    "Disallow: /dashboard",
    "Disallow: /masuk",
    "Disallow: /api/",
    "",
    `Sitemap: ${cleanBase}/sitemap.xml`,
    ""
  ].join("\n");
}
function escapeHtmlAttr(value) {
  return value.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}
function escapeXml(value) {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&apos;");
}
function injectSeoIntoHtml(html, pathname, baseUrl) {
  const meta = getSeoForPath(pathname);
  const cleanBase = baseUrl.replace(/\/+$/, "");
  const canonicalUrl = meta.path === "/" ? `${cleanBase}/` : `${cleanBase}${meta.path}`;
  let output = html.replace(/<title>[\s\S]*?<\/title>/i, `<title>${escapeHtmlAttr(meta.title)}</title>`).replace(
    /<meta\s+name="description"\s+content="[^"]*"\s*\/?>/i,
    `<meta name="description" content="${escapeHtmlAttr(meta.description)}" />`
  ).replace(
    /<meta\s+property="og:title"\s+content="[^"]*"\s*\/?>/i,
    `<meta property="og:title" content="${escapeHtmlAttr(meta.title)}" />`
  ).replace(
    /<meta\s+property="og:description"\s+content="[^"]*"\s*\/?>/i,
    `<meta property="og:description" content="${escapeHtmlAttr(meta.description)}" />`
  );
  const robotsTag = meta.indexable ? '<meta name="robots" content="index, follow" />' : '<meta name="robots" content="noindex, nofollow" />';
  const canonicalTag = meta.indexable ? `<link rel="canonical" href="${escapeHtmlAttr(canonicalUrl)}" />
    <meta property="og:url" content="${escapeHtmlAttr(canonicalUrl)}" />` : "";
  const extraHead = [robotsTag, canonicalTag].filter(Boolean).join("\n    ");
  output = output.replace("<!--__SEO_HEAD__-->", extraHead);
  return output;
}

// src/server/auth.ts
import { initializeApp, getApps, getApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";

// firebase-applet-config.json
var firebase_applet_config_default = {
  projectId: "tomoyoindramayu",
  appId: "1:1078762824833:web:c36150bad38c8be2fc1980",
  apiKey: "AIzaSyDwmYEBjAXG9m6iEHRYaAUaVSEo0ZlET48",
  authDomain: "tomoyoindramayu.firebaseapp.com",
  firestoreDatabaseId: "ai-studio-8509be80-871b-4707-80a4-526f1d69f7ad",
  storageBucket: "tomoyoindramayu.firebasestorage.app",
  messagingSenderId: "1078762824833",
  measurementId: "",
  oAuthClientId: "1078762824833-3dgvq0u4u9bfuk44mklbp6p6qi8h23gb.apps.googleusercontent.com",
  recaptchaSiteKey: ""
};

// src/server/auth.ts
function getAdminApp() {
  if (getApps().length > 0) {
    return getApp();
  }
  return initializeApp({
    projectId: firebase_applet_config_default.projectId
  });
}
function extractFirebaseTokenFromHeaders(headers) {
  const customRaw = headers["x-firebase-token"];
  const customHeader = Array.isArray(customRaw) ? customRaw[0] : customRaw;
  if (typeof customHeader === "string" && customHeader.trim().length > 0) {
    return customHeader.trim();
  }
  const authRaw = headers.authorization;
  const authHeader = Array.isArray(authRaw) ? authRaw[0] : authRaw;
  if (typeof authHeader === "string" && authHeader.startsWith("Bearer ")) {
    const token = authHeader.slice("Bearer ".length).trim();
    return token.length > 0 ? token : null;
  }
  return null;
}
function extractBearerToken(req) {
  return extractFirebaseTokenFromHeaders(req.headers);
}
async function verifyRequestFirebaseTokenDetailed(req) {
  const token = extractBearerToken(req);
  if (!token) {
    return { decoded: null, reason: "Header token Firebase tidak ditemukan." };
  }
  try {
    const app2 = getAdminApp();
    const decoded = await getAuth(app2).verifyIdToken(token);
    return { decoded };
  } catch (err) {
    const code = typeof err === "object" && err !== null && "code" in err ? String(err.code) : "";
    return {
      decoded: null,
      reason: code ? `Verifikasi token Firebase ditolak (${code}).` : "Token Firebase tidak valid."
    };
  }
}
async function verifyRequestFirebaseToken(req) {
  const { decoded } = await verifyRequestFirebaseTokenDetailed(req);
  return decoded;
}
function isDecodedTokenAdmin(decoded) {
  if (!decoded) return false;
  return isAuthorizedAdminIdentity({
    uid: decoded.uid,
    email: decoded.email ?? null,
    emailVerified: decoded.email_verified ?? false
  });
}

// src/server/fonnte.ts
import fs from "fs";
import path from "path";
var sentIdempotencyKeys = /* @__PURE__ */ new Set();
var IDEMPOTENCY_DIR = path.resolve(process.cwd(), ".data");
var IDEMPOTENCY_FILE = path.join(IDEMPOTENCY_DIR, "fonnte-idempotency.json");
var DUE_REMINDERS_FILE = path.join(IDEMPOTENCY_DIR, "due-reminders.json");
var dueJobsCache = [];
function loadPersistedKeys() {
  try {
    if (fs.existsSync(IDEMPOTENCY_FILE)) {
      const raw = fs.readFileSync(IDEMPOTENCY_FILE, "utf-8");
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        for (const key of parsed) {
          if (typeof key === "string") {
            sentIdempotencyKeys.add(key);
          }
        }
      }
    }
  } catch {
  }
}
function loadPersistedDueJobs() {
  try {
    if (fs.existsSync(DUE_REMINDERS_FILE)) {
      const raw = fs.readFileSync(DUE_REMINDERS_FILE, "utf-8");
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        dueJobsCache = parsed;
      }
    }
  } catch {
    dueJobsCache = [];
  }
}
function saveDueJobs() {
  try {
    if (!fs.existsSync(IDEMPOTENCY_DIR)) {
      fs.mkdirSync(IDEMPOTENCY_DIR, { recursive: true });
    }
    fs.writeFileSync(DUE_REMINDERS_FILE, JSON.stringify(dueJobsCache, null, 2), "utf-8");
  } catch {
  }
}
function persistKey(key) {
  sentIdempotencyKeys.add(key);
  try {
    if (!fs.existsSync(IDEMPOTENCY_DIR)) {
      fs.mkdirSync(IDEMPOTENCY_DIR, { recursive: true });
    }
    const items = Array.from(sentIdempotencyKeys).slice(-1e3);
    fs.writeFileSync(IDEMPOTENCY_FILE, JSON.stringify(items, null, 2), "utf-8");
  } catch {
  }
}
loadPersistedKeys();
loadPersistedDueJobs();
function isFonnteConfigured() {
  const token = process.env.FONNTE_TOKEN;
  return typeof token === "string" && token.trim().length > 0;
}
async function sendFonnteWhatsApp(params) {
  const target = params.target || ADMIN_WHATSAPP_TARGET;
  const token = process.env.FONNTE_TOKEN?.trim();
  if (!token) {
    return {
      status: "unconfigured",
      target,
      detail: "FONNTE_TOKEN belum dikonfigurasi di environment backend."
    };
  }
  if (params.idempotencyKey && sentIdempotencyKeys.has(params.idempotencyKey)) {
    return {
      status: "skipped_duplicate",
      target,
      detail: "Notifikasi ini sudah dikirim sebelumnya (idempotency)."
    };
  }
  const maxAttempts = 2;
  let lastError = "Gagal mengirim notifikasi WhatsApp melalui Fonnte.";
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const formParams = {
        target,
        message: params.message,
        countryCode: "62"
      };
      if (typeof params.scheduleTimestampSec === "number" && params.scheduleTimestampSec > Math.floor(Date.now() / 1e3) + 30) {
        formParams.schedule = String(Math.floor(params.scheduleTimestampSec));
      }
      const body = new URLSearchParams(formParams);
      const response = await fetch("https://api.fonnte.com/send", {
        method: "POST",
        headers: {
          Authorization: token,
          "Content-Type": "application/x-www-form-urlencoded"
        },
        body: body.toString(),
        signal: AbortSignal.timeout(1e4)
      });
      const text = await response.text();
      let parsed = null;
      try {
        parsed = JSON.parse(text);
      } catch {
        parsed = null;
      }
      if (response.ok && parsed && parsed.status === true) {
        if (params.idempotencyKey) {
          persistKey(params.idempotencyKey);
        }
        return {
          status: "sent",
          target,
          providerStatus: true,
          detail: parsed.detail || "Pesan berhasil dikirim oleh Fonnte."
        };
      }
      lastError = parsed?.reason || parsed?.detail || `Fonnte merespons HTTP ${response.status} dengan status gagal.`;
      if (response.status < 500) {
        break;
      }
    } catch (error) {
      lastError = error instanceof Error ? error.message : "Koneksi atau timeout saat menghubungi Fonnte.";
    }
  }
  return {
    status: "failed",
    target,
    providerStatus: false,
    detail: lastError
  };
}
function upsertDueReminder(input) {
  const idx = dueJobsCache.findIndex((j) => j.studentId === input.studentId);
  const existing = idx >= 0 ? dueJobsCache[idx] : void 0;
  let nextStatus = "scheduled";
  if (existing && existing.dueAtIso === input.dueAtIso) {
    nextStatus = existing.status;
  }
  if (input.confirmedIso) {
    const confMs = new Date(input.confirmedIso).getTime();
    const dueMs = new Date(input.dueAtIso).getTime();
    if (!Number.isNaN(confMs) && !Number.isNaN(dueMs) && confMs >= dueMs) {
      nextStatus = "confirmed";
    }
  } else if (input.notifiedIso && nextStatus === "scheduled") {
    const notifMs = new Date(input.notifiedIso).getTime();
    const dueMs = new Date(input.dueAtIso).getTime();
    if (!Number.isNaN(notifMs) && !Number.isNaN(dueMs) && notifMs >= dueMs) {
      nextStatus = "notified";
    }
  }
  const merged = {
    studentId: input.studentId,
    parentId: input.parentId,
    childName: input.childName,
    parentName: input.parentName,
    parentPhone: input.parentPhone,
    packageName: input.packageName,
    branchName: input.branchName,
    registeredAtIso: input.registeredAtIso,
    dueAtIso: input.dueAtIso,
    billingAmount: input.billingAmount ?? existing?.billingAmount ?? null,
    status: nextStatus,
    lastNotifiedAtIso: existing?.lastNotifiedAtIso || input.notifiedIso,
    lastConfirmedAtIso: existing?.lastConfirmedAtIso || input.confirmedIso,
    lastAttemptAtIso: existing?.lastAttemptAtIso,
    lastDeliveryStatus: existing?.lastDeliveryStatus,
    lastDeliveryDetail: existing?.lastDeliveryDetail
  };
  if (idx >= 0) {
    dueJobsCache[idx] = merged;
  } else {
    dueJobsCache.push(merged);
  }
  saveDueJobs();
  return merged;
}
function confirmDueReminder(studentId, nextDueAtIso, confirmedAtIso) {
  const idx = dueJobsCache.findIndex((j) => j.studentId === studentId);
  if (idx < 0) return null;
  const current = dueJobsCache[idx];
  const updated = {
    ...current,
    dueAtIso: nextDueAtIso,
    status: "scheduled",
    lastConfirmedAtIso: confirmedAtIso,
    lastDeliveryStatus: void 0,
    lastDeliveryDetail: void 0,
    lastAttemptAtIso: void 0
  };
  dueJobsCache[idx] = updated;
  saveDueJobs();
  return updated;
}
function listDueReminders() {
  return [...dueJobsCache];
}
async function processDueRemindersNow(appUrl) {
  const nowMs = Date.now();
  const triggered = [];
  for (let i = 0; i < dueJobsCache.length; i++) {
    const job = dueJobsCache[i];
    if (job.status !== "scheduled") continue;
    const dueMs = new Date(job.dueAtIso).getTime();
    if (Number.isNaN(dueMs) || nowMs < dueMs) continue;
    if (job.lastAttemptAtIso) {
      const lastAttemptMs = new Date(job.lastAttemptAtIso).getTime();
      if (!Number.isNaN(lastAttemptMs) && nowMs - lastAttemptMs < 15 * 60 * 1e3) {
        continue;
      }
    }
    const message = buildPaymentDueNotificationMessage({
      childName: job.childName,
      parentName: job.parentName,
      parentPhone: job.parentPhone,
      packageName: job.packageName,
      branchName: job.branchName,
      registeredAtIso: job.registeredAtIso,
      dueAtIso: job.dueAtIso,
      billingAmount: job.billingAmount,
      appUrl
    });
    const delivery = await sendFonnteWhatsApp({
      message,
      idempotencyKey: `due_${job.studentId}_${job.dueAtIso}`
    });
    const nowIso = (/* @__PURE__ */ new Date()).toISOString();
    dueJobsCache[i] = {
      ...job,
      lastAttemptAtIso: nowIso,
      lastDeliveryStatus: delivery.status,
      lastDeliveryDetail: delivery.detail,
      ...delivery.status === "sent" || delivery.status === "skipped_duplicate" ? { status: "notified", lastNotifiedAtIso: nowIso } : {}
    };
    triggered.push({
      studentId: job.studentId,
      parentId: job.parentId,
      childName: job.childName,
      dueAtIso: job.dueAtIso,
      status: delivery.status,
      detail: delivery.detail,
      target: delivery.target,
      messagePreview: message.slice(0, 480)
    });
  }
  if (triggered.length > 0) {
    saveDueJobs();
  }
  return triggered;
}

// server.ts
var __filename = fileURLToPath(import.meta.url);
var __dirname = path2.dirname(__filename);
function resolveBaseUrl(req) {
  if (process.env.APP_URL && process.env.APP_URL.startsWith("http")) {
    return process.env.APP_URL.replace(/\/+$/, "");
  }
  if (!req) return "http://localhost:3000";
  const proto = req.headers["x-forwarded-proto"] || req.protocol || "http";
  const host = req.headers["x-forwarded-host"] || req.get("host") || "localhost:3000";
  return `${proto}://${host}`;
}
function createApp() {
  const app2 = express();
  app2.use(express.json({ limit: "1mb" }));
  app2.get("/api/health", (_req, res) => {
    res.json({ ok: true, fonnteConfigured: isFonnteConfigured() });
  });
  app2.get("/robots.txt", (req, res) => {
    const baseUrl = resolveBaseUrl(req);
    res.type("text/plain").send(generateRobotsTxt(baseUrl));
  });
  app2.get("/sitemap.xml", (req, res) => {
    const baseUrl = resolveBaseUrl(req);
    res.type("application/xml").send(generateSitemapXml(baseUrl));
  });
  app2.get("/api/admin/verify", async (req, res) => {
    const { decoded, reason } = await verifyRequestFirebaseTokenDetailed(req);
    if (!decoded) {
      res.status(401).json({
        authorized: false,
        error: reason || "Token Firebase tidak valid atau belum login."
      });
      return;
    }
    if (!isDecodedTokenAdmin(decoded)) {
      res.status(403).json({
        authorized: false,
        uid: decoded.uid,
        email: decoded.email || null,
        emailVerified: Boolean(decoded.email_verified),
        error: "Akun ini tidak memiliki otorisasi admin. Pastikan login menggunakan akun admin resmi yang terverifikasi pada project tomoyoindramayu."
      });
      return;
    }
    res.json({
      authorized: true,
      uid: decoded.uid,
      email: decoded.email,
      emailVerified: Boolean(decoded.email_verified),
      fonnteConfigured: isFonnteConfigured(),
      whatsappTarget: ADMIN_WHATSAPP_TARGET
    });
  });
  app2.post("/api/notify/registration", async (req, res) => {
    const decoded = await verifyRequestFirebaseToken(req);
    if (!decoded || !decoded.email_verified) {
      res.status(401).json({ error: "Autentikasi orang tua terverifikasi diperlukan." });
      return;
    }
    const body = req.body;
    const parentName = typeof body.parentName === "string" ? body.parentName.trim() : "";
    const parentPhone = typeof body.parentPhone === "string" ? body.parentPhone.trim() : "";
    const items = Array.isArray(body.registrations) ? body.registrations : [];
    if (!parentName || items.length === 0 || items.length > 10) {
      res.status(400).json({ error: "Data notifikasi pendaftaran tidak valid." });
      return;
    }
    const baseUrl = resolveBaseUrl(req);
    const results = [];
    for (const item of items) {
      const registrationId = typeof item.registrationId === "string" ? item.registrationId.trim() : "";
      const childName = typeof item.childName === "string" ? item.childName.trim() : "";
      const childGender = typeof item.childGender === "string" ? item.childGender.trim() : "";
      const gradeLevel = typeof item.gradeLevel === "string" ? item.gradeLevel.trim() : "";
      const packageName = typeof item.packageName === "string" ? item.packageName.trim() : "";
      const branchName = typeof item.branchName === "string" ? item.branchName.trim() : "";
      if (!registrationId || !childName || !gradeLevel || !packageName || !branchName) {
        results.push({
          registrationId: registrationId || "unknown",
          status: "failed",
          target: ADMIN_WHATSAPP_TARGET,
          detail: "Payload anak tidak lengkap.",
          messagePreview: ""
        });
        continue;
      }
      const registeredAtIso = item.registeredAtIso || (/* @__PURE__ */ new Date()).toISOString();
      const nextDueAtIso = item.nextDueAtIso || computeNextMonthlyDueDate(new Date(registeredAtIso)).toISOString();
      upsertDueReminder({
        studentId: registrationId,
        parentId: decoded.uid,
        childName,
        parentName,
        parentPhone,
        packageName,
        branchName,
        registeredAtIso,
        dueAtIso: nextDueAtIso,
        billingAmount: typeof item.billingAmount === "number" ? item.billingAmount : null
      });
      const message = buildRegistrationNotificationMessage({
        parentName,
        parentPhone,
        childName,
        childGender: childGender || void 0,
        gradeLevel,
        packageName,
        branchName,
        billingAmount: typeof item.billingAmount === "number" ? item.billingAmount : null,
        nextDueAtIso,
        channel: "online",
        appUrl: baseUrl
      });
      const delivery = await sendFonnteWhatsApp({
        message,
        idempotencyKey: `reg_${decoded.uid}_${registrationId}`
      });
      results.push({
        registrationId,
        status: delivery.status,
        target: delivery.target,
        detail: delivery.detail,
        messagePreview: message.slice(0, 480)
      });
    }
    res.json({ results });
  });
  app2.post("/api/admin/notify/offline-registration", async (req, res) => {
    const decoded = await verifyRequestFirebaseToken(req);
    if (!decoded || !isDecodedTokenAdmin(decoded)) {
      res.status(403).json({ error: "Khusus admin terotorisasi." });
      return;
    }
    const body = req.body;
    const registrationId = (body.registrationId || "").trim();
    const childName = (body.childName || "").trim();
    const parentName = (body.parentName || "").trim();
    const parentPhone = (body.parentPhone || "").trim();
    const gradeLevel = (body.gradeLevel || "").trim();
    const packageName = (body.packageName || "").trim();
    const branchName = (body.branchName || "").trim();
    if (!registrationId || !childName || !parentName || !parentPhone || !packageName || !branchName) {
      res.status(400).json({ error: "Payload pendaftaran offline tidak lengkap." });
      return;
    }
    const baseUrl = resolveBaseUrl(req);
    const registeredAtIso = body.registeredAtIso || (/* @__PURE__ */ new Date()).toISOString();
    const nextDueAtIso = body.nextDueAtIso || computeNextMonthlyDueDate(new Date(registeredAtIso)).toISOString();
    upsertDueReminder({
      studentId: registrationId,
      parentId: body.parentId || "offline_admin",
      childName,
      parentName,
      parentPhone,
      packageName,
      branchName,
      registeredAtIso,
      dueAtIso: nextDueAtIso,
      billingAmount: typeof body.billingAmount === "number" ? body.billingAmount : null
    });
    const message = buildRegistrationNotificationMessage({
      parentName,
      parentPhone,
      childName,
      childGender: body.childGender,
      gradeLevel,
      packageName,
      branchName,
      billingAmount: typeof body.billingAmount === "number" ? body.billingAmount : null,
      nextDueAtIso,
      channel: "offline",
      paymentStatusLabel: body.initialPaymentStatus ? getPaymentStatusLabel(body.initialPaymentStatus) : void 0,
      appUrl: baseUrl
    });
    const delivery = await sendFonnteWhatsApp({
      message,
      idempotencyKey: `offline_reg_${registrationId}`
    });
    const dueTriggered = await processDueRemindersNow(baseUrl);
    res.json({
      registrationId,
      status: delivery.status,
      target: delivery.target,
      detail: delivery.detail,
      messagePreview: message.slice(0, 480),
      dueTriggered
    });
  });
  app2.post("/api/admin/due-reminders/sync", async (req, res) => {
    const decoded = await verifyRequestFirebaseToken(req);
    if (!decoded || !isDecodedTokenAdmin(decoded)) {
      res.status(403).json({ error: "Khusus admin terotorisasi." });
      return;
    }
    const body = req.body;
    const students = Array.isArray(body.students) ? body.students : [];
    for (const s of students) {
      if (!s.id || s.status === "rejected" || !s.nextDueAtIso) continue;
      upsertDueReminder({
        studentId: s.id,
        parentId: s.parentId,
        childName: s.childName,
        parentName: s.parentName,
        parentPhone: s.parentPhone,
        packageName: s.packageName,
        branchName: s.branchName,
        registeredAtIso: s.registeredAtIso || s.nextDueAtIso,
        dueAtIso: s.nextDueAtIso,
        billingAmount: typeof s.billingAmount === "number" ? s.billingAmount : null,
        confirmedIso: s.dueConfirmedIso,
        notifiedIso: s.lastDueNotifiedIso
      });
    }
    const baseUrl = resolveBaseUrl(req);
    const triggered = await processDueRemindersNow(baseUrl);
    res.json({
      triggered,
      reminders: listDueReminders(),
      fonnteConfigured: isFonnteConfigured()
    });
  });
  app2.post("/api/admin/due-reminders/send-now", async (req, res) => {
    const decoded = await verifyRequestFirebaseToken(req);
    if (!decoded || !isDecodedTokenAdmin(decoded)) {
      res.status(403).json({ error: "Khusus admin terotorisasi." });
      return;
    }
    const body = req.body;
    if (!body.studentId || !body.childName || !body.parentName || !body.dueAtIso) {
      res.status(400).json({ error: "Data pengingat jatuh tempo tidak lengkap." });
      return;
    }
    const baseUrl = resolveBaseUrl(req);
    const message = buildPaymentDueNotificationMessage({
      childName: body.childName,
      parentName: body.parentName,
      parentPhone: body.parentPhone || "-",
      packageName: body.packageName || "-",
      branchName: body.branchName || "-",
      registeredAtIso: body.registeredAtIso,
      dueAtIso: body.dueAtIso,
      billingAmount: typeof body.billingAmount === "number" ? body.billingAmount : null,
      appUrl: baseUrl
    });
    const target = body.sendToParent && body.parentPhone ? normalizeWhatsappPhone(body.parentPhone) : ADMIN_WHATSAPP_TARGET;
    const delivery = await sendFonnteWhatsApp({
      message,
      target
    });
    res.json({
      ...delivery,
      messagePreview: message.slice(0, 480)
    });
  });
  app2.post("/api/admin/due-reminders/confirm", async (req, res) => {
    const decoded = await verifyRequestFirebaseToken(req);
    if (!decoded || !isDecodedTokenAdmin(decoded)) {
      res.status(403).json({ error: "Khusus admin terotorisasi." });
      return;
    }
    const body = req.body;
    if (!body.studentId || !body.nextDueAtIso) {
      res.status(400).json({ error: "studentId dan nextDueAtIso wajib dikirim." });
      return;
    }
    const updated = confirmDueReminder(
      body.studentId,
      body.nextDueAtIso,
      body.confirmedAtIso || (/* @__PURE__ */ new Date()).toISOString()
    );
    res.json({ ok: true, reminder: updated });
  });
  app2.post("/api/admin/test-whatsapp", async (req, res) => {
    const decoded = await verifyRequestFirebaseToken(req);
    if (!decoded) {
      res.status(401).json({ error: "Token Firebase tidak valid." });
      return;
    }
    if (!isDecodedTokenAdmin(decoded)) {
      res.status(403).json({ error: "Akses ditolak. Khusus akun admin terotorisasi." });
      return;
    }
    const baseUrl = resolveBaseUrl(req);
    const nowLabel = (/* @__PURE__ */ new Date()).toLocaleString("id-ID", { timeZone: "Asia/Jakarta" });
    const message = [
      "\u2705 UJI NOTIFIKASI WHATSAPP \u2014 TOMOYO EDUCATION",
      "",
      `Pengirim Admin: ${decoded.email}`,
      `Waktu Uji: ${nowLabel} WIB`,
      `Dashboard Admin: ${baseUrl}/admintomoyo`,
      "",
      "Integrasi backend Fonnte aktif dan siap menerima notifikasi pendaftaran siswa baru maupun pengingat pembayaran jatuh tempo."
    ].join("\n");
    const delivery = await sendFonnteWhatsApp({ message });
    res.json({
      ...delivery,
      messagePreview: message.slice(0, 480)
    });
  });
  return app2;
}
async function startServer() {
  const app2 = createApp();
  const isProd = process.env.NODE_ENV === "production";
  if (!isProd) {
    const { createServer: createViteServer } = await import("vite");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "custom"
    });
    app2.use(vite.middlewares);
    app2.use("*", async (req, res, next) => {
      if (req.originalUrl.startsWith("/api/")) {
        next();
        return;
      }
      try {
        const templatePath = path2.resolve(__dirname, "index.html");
        const rawHtml = fs2.readFileSync(templatePath, "utf-8");
        const transformed = await vite.transformIndexHtml(req.originalUrl, rawHtml);
        const seoHtml = injectSeoIntoHtml(transformed, req.originalUrl, resolveBaseUrl(req));
        res.status(200).set({ "Content-Type": "text/html" }).end(seoHtml);
      } catch (err) {
        vite.ssrFixStacktrace(err);
        next(err);
      }
    });
  } else {
    const distDir = path2.resolve(process.cwd(), "dist");
    app2.use(express.static(distDir, { index: false }));
    app2.use("*", (req, res, next) => {
      if (req.originalUrl.startsWith("/api/")) {
        next();
        return;
      }
      const indexPath = path2.join(distDir, "index.html");
      const rawHtml = fs2.readFileSync(indexPath, "utf-8");
      const seoHtml = injectSeoIntoHtml(rawHtml, req.originalUrl, resolveBaseUrl(req));
      res.status(200).set({ "Content-Type": "text/html" }).end(seoHtml);
    });
  }
  const fallbackBaseUrl = resolveBaseUrl();
  setInterval(() => {
    processDueRemindersNow(fallbackBaseUrl).catch(() => {
    });
  }, 6e4);
  const port = Number(process.env.PORT) || 3e3;
  app2.listen(port, "0.0.0.0", () => {
    console.log(`TOMOYO server running on http://0.0.0.0:${port}`);
  });
}
if (!process.env.VERCEL) {
  startServer();
}

// build-tools/api-entry.ts
var app = createApp();
var api_entry_default = app;
export {
  api_entry_default as default
};
