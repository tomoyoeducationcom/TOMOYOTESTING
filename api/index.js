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
var FONNTE_SENDER_NUMBER = "6283121902760";
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
  const title = params.channel === "migration" ? "\u{1F4C2} PINDAH DATA SISWA LAMA (ARSIP) \u2014 TOMOYO EDUCATION" : params.channel === "offline" ? "\u{1F4DD} PENDAFTARAN SISWA OFFLINE (ADMIN) \u2014 TOMOYO EDUCATION" : "\u{1F514} PENDAFTARAN SISWA BARU \u2014 TOMOYO EDUCATION";
  const statusText = params.channel === "migration" ? "TERDAFTAR DARI ARSIP BERKAS (AKTIF)" : params.channel === "offline" ? "TERDAFTAR OFFLINE (DISETUJUI ADMIN)" : "MENUNGGU PERSETUJUAN";
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
    `Status: ${statusText}`,
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

// src/lib/quizAndWaDomain.ts
function toStudentSafeQuiz(quiz) {
  const sorted = [...quiz.questions].sort((a, b) => a.order - b.order);
  const totalPoints = sorted.reduce((sum, q) => sum + (Number(q.points) || 0), 0);
  return {
    id: quiz.id,
    title: quiz.title,
    description: quiz.description,
    instructions: quiz.instructions,
    targetClass: quiz.targetClass,
    status: quiz.status,
    timeLimitMinutes: quiz.timeLimitMinutes,
    maxAttempts: quiz.maxAttempts,
    startAtIso: quiz.startAtIso,
    endAtIso: quiz.endAtIso,
    questions: sorted.map((q) => ({
      id: q.id,
      order: q.order,
      type: q.type,
      prompt: q.prompt,
      ...q.imageUrl ? { imageUrl: q.imageUrl } : {},
      options: q.options.map((o) => ({ id: o.id, text: o.text })),
      points: q.points
    })),
    questionCount: sorted.length,
    totalPoints,
    createdAtIso: quiz.createdAtIso,
    updatedAtIso: quiz.updatedAtIso
  };
}
function checkQuizAvailability(quiz, now = /* @__PURE__ */ new Date()) {
  if (quiz.status === "draft") {
    return { available: false, state: "draft", reason: "Kuis masih berstatus draf dan belum diterbitkan." };
  }
  if (quiz.status === "disabled") {
    return { available: false, state: "disabled", reason: "Kuis sedang dinonaktifkan oleh pengelola." };
  }
  const nowMs = now.getTime();
  if (quiz.startAtIso) {
    const startMs = new Date(quiz.startAtIso).getTime();
    if (!Number.isNaN(startMs) && nowMs < startMs) {
      return {
        available: false,
        state: "upcoming",
        reason: "Jadwal pelaksanaan kuis belum dimulai."
      };
    }
  }
  if (quiz.endAtIso) {
    const endMs = new Date(quiz.endAtIso).getTime();
    if (!Number.isNaN(endMs) && nowMs > endMs) {
      return {
        available: false,
        state: "ended",
        reason: "Batas waktu pelaksanaan kuis telah berakhir."
      };
    }
  }
  return { available: true, state: "active" };
}
function normalizeParticipantIdentity(value) {
  return value.trim().toLowerCase().replace(/\s+/g, " ");
}
function countMatchingAttempts(attempts, quizId, studentName, studentClass) {
  const normName = normalizeParticipantIdentity(studentName);
  const normClass = normalizeParticipantIdentity(studentClass);
  return attempts.filter(
    (a) => a.quizId === quizId && normalizeParticipantIdentity(a.studentName) === normName && normalizeParticipantIdentity(a.studentClass) === normClass
  ).length;
}
function gradeQuizSubmission(quiz, answers, durationSeconds) {
  const sorted = [...quiz.questions].sort((a, b) => a.order - b.order);
  let score = 0;
  let maxScore = 0;
  let correctCount = 0;
  let wrongCount = 0;
  let unansweredCount = 0;
  const gradedDetails = sorted.map((q) => {
    const qPoints = Math.max(0, Number(q.points) || 0);
    maxScore += qPoints;
    const selectedId = typeof answers[q.id] === "string" ? answers[q.id].trim() : "";
    const selectedOpt = q.options.find((o) => o.id === selectedId);
    const correctOpt = q.options.find((o) => o.id === q.correctOptionId);
    const isCorrect = Boolean(selectedId) && selectedId === q.correctOptionId;
    if (!selectedId) {
      unansweredCount += 1;
      wrongCount += 1;
    } else if (isCorrect) {
      correctCount += 1;
      score += qPoints;
    } else {
      wrongCount += 1;
    }
    return {
      questionId: q.id,
      prompt: q.prompt,
      ...q.imageUrl ? { imageUrl: q.imageUrl } : {},
      selectedOptionId: selectedId,
      selectedOptionText: selectedOpt?.text || "(Tidak dijawab)",
      correctOptionId: q.correctOptionId,
      correctOptionText: correctOpt?.text || q.correctOptionId,
      isCorrect,
      earnedPoints: isCorrect ? qPoints : 0,
      maxPoints: qPoints,
      explanation: q.explanation
    };
  });
  const percentage = maxScore > 0 ? Math.round(score / maxScore * 100) : 0;
  return {
    score,
    maxScore,
    percentage,
    correctCount,
    wrongCount,
    unansweredCount,
    gradedDetails: gradedDetails.map((d) => ({ ...d, durationSeconds }))
  };
}
function validateQuizPayload(input) {
  const errors = [];
  const title = (input.title || "").trim();
  if (title.length < 3 || title.length > 180) {
    errors.push("Judul kuis wajib diisi (3\u2013180 karakter).");
  }
  if (!input.status || !["draft", "published", "disabled"].includes(input.status)) {
    errors.push("Status kuis harus draft, published, atau disabled.");
  }
  const timeLimit = Number(input.timeLimitMinutes ?? 0);
  if (Number.isNaN(timeLimit) || timeLimit < 0 || timeLimit > 240) {
    errors.push("Batas waktu kuis harus antara 0 (tanpa batas) sampai 240 menit.");
  }
  const maxAttempts = Number(input.maxAttempts ?? 1);
  if (Number.isNaN(maxAttempts) || maxAttempts < 0 || maxAttempts > 50) {
    errors.push("Batas percobaan harus antara 0 (tidak terbatas) sampai 50.");
  }
  if (input.startAtIso && input.endAtIso) {
    const startMs = new Date(input.startAtIso).getTime();
    const endMs = new Date(input.endAtIso).getTime();
    if (!Number.isNaN(startMs) && !Number.isNaN(endMs) && endMs <= startMs) {
      errors.push("Waktu selesai kuis harus setelah waktu mulai.");
    }
  }
  const questions = Array.isArray(input.questions) ? input.questions : [];
  if (questions.length === 0) {
    errors.push("Minimal harus ada 1 soal dalam kuis.");
  } else if (questions.length > 100) {
    errors.push("Maksimal 100 soal per kuis.");
  } else {
    questions.forEach((q, idx) => {
      const label = `Soal #${idx + 1}`;
      if (!q.prompt || q.prompt.trim().length < 2) {
        errors.push(`${label}: Pertanyaan wajib diisi.`);
      }
      if (!["multiple_choice", "true_false"].includes(q.type)) {
        errors.push(`${label}: Tipe soal tidak valid.`);
      }
      if (!Array.isArray(q.options) || q.options.length < 2) {
        errors.push(`${label}: Minimal harus memiliki 2 pilihan jawaban.`);
      } else {
        const emptyOpt = q.options.some((o) => !o.text || !o.text.trim());
        if (emptyOpt) {
          errors.push(`${label}: Semua teks pilihan jawaban harus diisi.`);
        }
        const hasKey = q.options.some((o) => o.id === q.correctOptionId);
        if (!hasKey) {
          errors.push(`${label}: Kunci jawaban yang benar wajib dipilih.`);
        }
      }
      if (q.imageUrl !== void 0 && q.imageUrl !== null && String(q.imageUrl).trim() !== "") {
        const cleanUrl = String(q.imageUrl).trim();
        const isSafeUrl = /^https?:\/\/\S+$/i.test(cleanUrl) || cleanUrl.startsWith("/") && !cleanUrl.startsWith("//") && cleanUrl.length <= 1500;
        if (!isSafeUrl || cleanUrl.length > 1500) {
          errors.push(`${label}: URL gambar soal tidak valid (gunakan unggah gambar atau tautan https://).`);
        }
      }
      if (Number.isNaN(Number(q.points)) || Number(q.points) <= 0) {
        errors.push(`${label}: Bobot nilai soal harus lebih dari 0.`);
      }
    });
  }
  return { valid: errors.length === 0, errors };
}
function escapeCsvCell(value) {
  const str = value === void 0 || value === null ? "" : String(value);
  if (/[",\r\n]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}
function buildQuizAttemptsCsv(quiz, attempts) {
  const header = [
    "No",
    "Judul Kuis",
    "Nama Siswa",
    "Kelas",
    "WA Orang Tua",
    "Skor",
    "Skor Maksimal",
    "Persentase (%)",
    "Benar",
    "Salah",
    "Durasi (Detik)",
    "Waktu Selesai"
  ];
  const rows = attempts.map((a, idx) => [
    idx + 1,
    quiz.title,
    a.studentName,
    a.studentClass,
    a.parentWhatsapp || "-",
    a.score,
    a.maxScore,
    a.percentage,
    a.correctCount,
    a.wrongCount,
    a.durationSeconds,
    a.submittedAtIso
  ]);
  const lines = [header, ...rows].map((row) => row.map(escapeCsvCell).join(","));
  return "\uFEFF" + lines.join("\r\n");
}
function buildAllQuizAttemptsCsv(attempts) {
  const header = [
    "No",
    "Nama Siswa",
    "Kelas",
    "Judul Kuis",
    "Nilai (0-100)",
    "Skor Poin",
    "Skor Maksimal",
    "Benar",
    "Salah",
    "WA Orang Tua",
    "Durasi (Detik)",
    "Waktu Selesai"
  ];
  const rows = attempts.map((a, idx) => [
    idx + 1,
    a.studentName,
    a.studentClass,
    a.quizTitle,
    a.percentage,
    a.score,
    a.maxScore,
    a.correctCount,
    a.wrongCount,
    a.parentWhatsapp || "-",
    a.durationSeconds,
    a.submittedAtIso
  ]);
  const lines = [header, ...rows].map((row) => row.map(escapeCsvCell).join(","));
  return "\uFEFF" + lines.join("\r\n");
}
var WA_TEMPLATE_CATEGORIES = [
  "Pendaftaran",
  "Pembayaran & Jatuh Tempo",
  "Pengumuman Umum",
  "Kuis Online",
  "Jadwal Belajar",
  "Evaluasi & Laporan Belajar",
  "Pengingat Kelas",
  "Ucapan & Apresiasi"
];
var WA_TEMPLATE_VARIABLES = [
  "nama_siswa",
  "nama_orang_tua",
  "kelas",
  "nama_program",
  "jadwal",
  "tanggal",
  "jam",
  "nama_lembaga"
];
function extractTemplatePlaceholders(template) {
  const found = /* @__PURE__ */ new Set();
  const regex = /\{([a-zA-Z0-9_]+)\}/g;
  let match;
  while ((match = regex.exec(template)) !== null) {
    found.add(match[1]);
  }
  return Array.from(found);
}
function renderTemplateVariables(template, variables) {
  const placeholders = extractTemplatePlaceholders(template);
  const allowedSet = new Set(WA_TEMPLATE_VARIABLES);
  const missingVariables = [];
  const unknownVariables = [];
  const nowJakarta = /* @__PURE__ */ new Date();
  const defaultDate = nowJakarta.toLocaleDateString("id-ID", {
    timeZone: "Asia/Jakarta",
    day: "2-digit",
    month: "long",
    year: "numeric"
  });
  const defaultTime = nowJakarta.toLocaleTimeString("id-ID", {
    timeZone: "Asia/Jakarta",
    hour: "2-digit",
    minute: "2-digit"
  }) + " WIB";
  const lookup = {
    nama_lembaga: BRAND_IDENTITY.officialName,
    tanggal: defaultDate,
    jam: defaultTime
  };
  for (const [key, val] of Object.entries(variables)) {
    if (typeof val === "string" && val.trim().length > 0) {
      lookup[key] = val.trim();
    }
  }
  for (const key of placeholders) {
    if (!allowedSet.has(key)) {
      unknownVariables.push(key);
    } else if (!lookup[key] || lookup[key].trim().length === 0) {
      missingVariables.push(key);
    }
  }
  const rendered = template.replace(/\{([a-zA-Z0-9_]+)\}/g, (full, key) => {
    if (lookup[key]) return lookup[key];
    return full;
  });
  return {
    rendered,
    missingVariables,
    unknownVariables
  };
}
function isValidWaTarget(raw) {
  const trimmed = raw.trim();
  if (!trimmed) {
    return { valid: false, normalized: "", isGroupId: false, reason: "Nomor atau ID tujuan kosong." };
  }
  if (trimmed.endsWith("@g.us")) {
    return { valid: true, normalized: trimmed, isGroupId: true };
  }
  const normalized = normalizeWhatsappPhone(trimmed);
  const digits = normalized.replace(/\D/g, "");
  if (digits.length < 8 || digits.length > 16) {
    return {
      valid: false,
      normalized,
      isGroupId: false,
      reason: "Nomor WhatsApp harus terdiri dari 8\u201316 digit."
    };
  }
  return { valid: true, normalized: digits, isGroupId: false };
}
function deduplicateAndFilterRecipients(inputs, optOutPhones) {
  const optOutSet = new Set(
    optOutPhones.map((p) => {
      const check = isValidWaTarget(p);
      return check.valid ? check.normalized : p.trim();
    })
  );
  const seen = /* @__PURE__ */ new Set();
  const accepted = [];
  const invalid = [];
  let duplicates = 0;
  let optedOut = 0;
  for (const item of inputs) {
    const check = isValidWaTarget(item.phone);
    if (!check.valid) {
      invalid.push({ raw: item.phone, reason: check.reason || "Format nomor tidak valid." });
      continue;
    }
    if (optOutSet.has(check.normalized)) {
      optedOut += 1;
      continue;
    }
    if (seen.has(check.normalized)) {
      duplicates += 1;
      continue;
    }
    seen.add(check.normalized);
    accepted.push({
      ...item,
      normalizedPhone: check.normalized
    });
  }
  return { accepted, invalid, duplicates, optedOut };
}
function recalculateCampaignCounts(campaign) {
  let waitingCount = 0;
  let processingCount = 0;
  let successCount = 0;
  let failedCount = 0;
  for (const item of campaign.items) {
    if (item.status === "menunggu") waitingCount += 1;
    else if (item.status === "diproses") processingCount += 1;
    else if (item.status === "berhasil") successCount += 1;
    else if (item.status === "gagal") failedCount += 1;
  }
  const totalCount = campaign.items.length;
  let status = campaign.status;
  if (totalCount > 0 && waitingCount === 0 && processingCount === 0) {
    status = "completed";
  }
  return {
    ...campaign,
    status,
    totalCount,
    waitingCount,
    processingCount,
    successCount,
    failedCount
  };
}
function buildCampaignReportCsv(campaign) {
  const header = [
    "No",
    "Nama Kampanye",
    "Template",
    "Penerima",
    "Nomor/ID WA",
    "Sumber",
    "Status",
    "Percobaan",
    "Waktu Kirim",
    "Detail / Alasan Gagal"
  ];
  const rows = campaign.items.map((item, idx) => [
    idx + 1,
    campaign.title,
    campaign.templateName || "Pesan Kustom",
    item.displayName,
    item.phone,
    item.source,
    item.status,
    item.attempts,
    item.sentAtIso || "-",
    item.lastError || "-"
  ]);
  const lines = [header, ...rows].map((row) => row.map(escapeCsvCell).join(","));
  return "\uFEFF" + lines.join("\r\n");
}
var INITIAL_WA_TEMPLATES = [
  {
    id: "tpl-pendaftaran",
    name: "Konfirmasi Pendaftaran Siswa Baru",
    category: "Pendaftaran",
    content: "Halo Bapak/Ibu *{nama_orang_tua}*, terima kasih telah mendaftarkan ananda *{nama_siswa}* ({kelas}) pada *{nama_program}* di *{nama_lembaga}*. Tim kami akan segera mengonfirmasi jadwal belajar pada {tanggal}.",
    isEnabled: true,
    createdAtIso: "2026-11-01T08:00:00.000Z",
    updatedAtIso: "2026-11-01T08:00:00.000Z"
  },
  {
    id: "tpl-pembayaran",
    name: "Pengingat Pembayaran Bulanan",
    category: "Pembayaran & Jatuh Tempo",
    content: "Yth. Bapak/Ibu *{nama_orang_tua}*, kami informasikan jadwal administrasi bulanan ananda *{nama_siswa}* ({nama_program}) jatuh pada *{tanggal}*. Mohon konfirmasi kepada admin *{nama_lembaga}*.",
    isEnabled: true,
    createdAtIso: "2026-11-01T08:00:00.000Z",
    updatedAtIso: "2026-11-01T08:00:00.000Z"
  },
  {
    id: "tpl-pengumuman",
    name: "Pengumuman Resmi Lembaga",
    category: "Pengumuman Umum",
    content: "*PENGUMUMAN \u2014 {nama_lembaga}*\n\nKepada Yth. Bapak/Ibu *{nama_orang_tua}* (Orang Tua dari *{nama_siswa}* - {kelas}), kami sampaikan pembaruan kegiatan belajar pada {tanggal} pukul {jam}.",
    isEnabled: true,
    createdAtIso: "2026-11-01T08:00:00.000Z",
    updatedAtIso: "2026-11-01T08:00:00.000Z"
  },
  {
    id: "tpl-kuis",
    name: "Undangan Mengerjakan Kuis Online",
    category: "Kuis Online",
    content: "Halo *{nama_siswa}* ({kelas}) & Bapak/Ibu *{nama_orang_tua}*, kuis latihan *{nama_program}* telah dibuka di portal Kuis Online *{nama_lembaga}*. Silakan kerjakan sebelum jadwal berikutnya ({jadwal}).",
    isEnabled: true,
    createdAtIso: "2026-11-01T08:00:00.000Z",
    updatedAtIso: "2026-11-01T08:00:00.000Z"
  },
  {
    id: "tpl-jadwal",
    name: "Informasi Perubahan Jadwal",
    category: "Jadwal Belajar",
    content: "Yth. Bapak/Ibu *{nama_orang_tua}*, jadwal belajar ananda *{nama_siswa}* ({nama_program}) tercatat pada *{jadwal}* mulai {tanggal} pukul {jam} bersama *{nama_lembaga}*.",
    isEnabled: true,
    createdAtIso: "2026-11-01T08:00:00.000Z",
    updatedAtIso: "2026-11-01T08:00:00.000Z"
  },
  {
    id: "tpl-evaluasi",
    name: "Laporan Perkembangan Belajar",
    category: "Evaluasi & Laporan Belajar",
    content: "Yth. Bapak/Ibu *{nama_orang_tua}*, berikut catatan evaluasi belajar ananda *{nama_siswa}* ({kelas} \xB7 {nama_program}) per {tanggal} di *{nama_lembaga}*.",
    isEnabled: true,
    createdAtIso: "2026-11-01T08:00:00.000Z",
    updatedAtIso: "2026-11-01T08:00:00.000Z"
  },
  {
    id: "tpl-pengingat-kelas",
    name: "Pengingat Sesi Belajar Hari Ini",
    category: "Pengingat Kelas",
    content: "Selamat pagi Bapak/Ibu *{nama_orang_tua}*, mengingatkan sesi belajar *{nama_siswa}* ({nama_program}) hari ini *{jadwal}* pukul *{jam}* di *{nama_lembaga}*.",
    isEnabled: true,
    createdAtIso: "2026-11-01T08:00:00.000Z",
    updatedAtIso: "2026-11-01T08:00:00.000Z"
  },
  {
    id: "tpl-apresiasi",
    name: "Apresiasi Kemajuan Siswa",
    category: "Ucapan & Apresiasi",
    content: "Selamat untuk ananda *{nama_siswa}* ({kelas})! Terima kasih Bapak/Ibu *{nama_orang_tua}* atas dukungan belajar bersama *{nama_lembaga}*. Terus semangat!",
    isEnabled: true,
    createdAtIso: "2026-11-01T08:00:00.000Z",
    updatedAtIso: "2026-11-01T08:00:00.000Z"
  }
];

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
    path: "/kuis",
    label: "Kuis Online",
    title: "Kuis Online Siswa \u2014 TOMOYO PRIVAT & BIMBEL EDUCATION",
    description: "Latihan soal dan evaluasi belajar interaktif tanpa login untuk siswa TK hingga Kelas 6 SD TOMOYO Education.",
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
  if (normalized.startsWith("/kuis/")) {
    return PUBLIC_INDEXABLE_ROUTES.find((r) => r.path === "/kuis") || PUBLIC_INDEXABLE_ROUTES[0];
  }
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

// src/server/storage.ts
import fs from "fs";
import path from "path";
var cachedDataDir = null;
function getWritableDataDir() {
  if (cachedDataDir) return cachedDataDir;
  const candidates = [
    path.resolve(process.cwd(), ".data"),
    path.join("/tmp", "tomoyo-data")
  ];
  for (const dir of candidates) {
    try {
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      const probe = path.join(dir, ".write-check");
      fs.writeFileSync(probe, "ok", "utf-8");
      fs.unlinkSync(probe);
      cachedDataDir = dir;
      return dir;
    } catch {
    }
  }
  cachedDataDir = candidates[1];
  return cachedDataDir;
}
function readJsonData(filename, fallback) {
  try {
    const dir = getWritableDataDir();
    const filePath = path.join(dir, filename);
    if (!fs.existsSync(filePath)) {
      return fallback;
    }
    const raw = fs.readFileSync(filePath, "utf-8");
    if (!raw.trim()) return fallback;
    return JSON.parse(raw);
  } catch {
    return fallback;
  }
}
function writeJsonData(filename, value) {
  try {
    const dir = getWritableDataDir();
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    const filePath = path.join(dir, filename);
    fs.writeFileSync(filePath, JSON.stringify(value, null, 2), "utf-8");
    return true;
  } catch {
    return false;
  }
}

// src/server/fonnte.ts
var IDEMPOTENCY_FILENAME = "fonnte-idempotency.json";
var DUE_REMINDERS_FILENAME = "due-reminders.json";
var sentIdempotencyKeys = new Set(readJsonData(IDEMPOTENCY_FILENAME, []));
var dueJobsCache = readJsonData(DUE_REMINDERS_FILENAME, []);
function saveDueJobs() {
  writeJsonData(DUE_REMINDERS_FILENAME, dueJobsCache);
}
function persistKey(key) {
  sentIdempotencyKeys.add(key);
  const items = Array.from(sentIdempotencyKeys).slice(-2e3);
  writeJsonData(IDEMPOTENCY_FILENAME, items);
}
function sanitizeFonnteToken(raw) {
  if (typeof raw !== "string") return "";
  let cleaned = raw.trim();
  if (cleaned.startsWith('"') && cleaned.endsWith('"') || cleaned.startsWith("'") && cleaned.endsWith("'")) {
    cleaned = cleaned.slice(1, -1).trim();
  }
  cleaned = cleaned.replace(/^Bearer\s+/i, "").trim();
  return cleaned;
}
function formatFonnteFailureDetail(rawDetail) {
  const clean = rawDetail.trim();
  if (/unknown\s+token/i.test(clean)) {
    return `unknown token \u2014 Token device Fonnte ditolak oleh api.fonnte.com. Pastikan environment variable FONNTE_TOKEN di Vercel (scope Production) diisi dengan Device Token resmi untuk nomor 083121902760 (${FONNTE_SENDER_NUMBER}) \u2014 bukan Account Token \u2014 tanpa tanda kutip/spasi, lalu lakukan Redeploy tanpa cache.`;
  }
  if (/disconnect|not\s+connected|device\s+not\s+ready/i.test(clean)) {
    return `${clean} \u2014 Perangkat WhatsApp ${FONNTE_SENDER_NUMBER} di dashboard Fonnte sedang terputus; silakan scan ulang QR WhatsApp di Fonnte.`;
  }
  return clean;
}
function isFonnteConfigured() {
  return sanitizeFonnteToken(process.env.FONNTE_TOKEN).length > 0;
}
async function sendFonnteWhatsApp(params) {
  const target = params.target || ADMIN_WHATSAPP_TARGET;
  const token = sanitizeFonnteToken(process.env.FONNTE_TOKEN);
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
      const rawError = parsed?.reason || parsed?.detail || `Fonnte merespons HTTP ${response.status} dengan status gagal.`;
      lastError = formatFonnteFailureDetail(rawError);
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
async function checkFonnteDeviceStatus() {
  const token = sanitizeFonnteToken(process.env.FONNTE_TOKEN);
  if (!token) {
    return {
      configured: false,
      connected: false,
      senderNumber: FONNTE_SENDER_NUMBER,
      detail: "FONNTE_TOKEN belum dikonfigurasi pada environment backend."
    };
  }
  try {
    const response = await fetch("https://api.fonnte.com/device", {
      method: "POST",
      headers: {
        Authorization: token
      },
      signal: AbortSignal.timeout(8e3)
    });
    const text = await response.text();
    let parsed = null;
    try {
      parsed = JSON.parse(text);
    } catch {
      parsed = null;
    }
    if (response.ok && parsed && parsed.status === true) {
      const devStatus = parsed.device_status || "connect";
      const connected = /connect/i.test(devStatus) && !/disconnect/i.test(devStatus);
      return {
        configured: true,
        connected,
        senderNumber: FONNTE_SENDER_NUMBER,
        deviceNumber: parsed.device ? String(parsed.device) : void 0,
        deviceName: parsed.name ? String(parsed.name) : void 0,
        deviceStatus: devStatus,
        quota: parsed.quota ? String(parsed.quota) : void 0,
        tokenLength: token.length,
        detail: connected ? `Perangkat Fonnte terhubung (${devStatus})${parsed.device ? ` \u2014 Nomor terdaftar: ${parsed.device}` : ""}.` : `Perangkat Fonnte berstatus: ${devStatus}.`
      };
    }
    const rawErr = parsed?.reason || parsed?.detail || `HTTP ${response.status} dari Fonnte device check.`;
    return {
      configured: true,
      connected: false,
      senderNumber: FONNTE_SENDER_NUMBER,
      tokenLength: token.length,
      detail: formatFonnteFailureDetail(rawErr)
    };
  } catch (err) {
    return {
      configured: true,
      connected: false,
      senderNumber: FONNTE_SENDER_NUMBER,
      tokenLength: token.length,
      detail: err instanceof Error ? err.message : "Gagal mengecek status perangkat Fonnte."
    };
  }
}
async function fetchFonnteGroupRefresh() {
  const token = sanitizeFonnteToken(process.env.FONNTE_TOKEN);
  if (!token) {
    return {
      ok: false,
      configured: false,
      detail: "FONNTE_TOKEN belum dikonfigurasi di environment backend."
    };
  }
  try {
    const response = await fetch("https://api.fonnte.com/fetch-group", {
      method: "POST",
      headers: {
        Authorization: token
      },
      signal: AbortSignal.timeout(12e3)
    });
    const text = await response.text();
    let parsed = null;
    try {
      parsed = JSON.parse(text);
    } catch {
      parsed = null;
    }
    if (response.ok && parsed && parsed.status === true) {
      return {
        ok: true,
        configured: true,
        detail: parsed.detail || "Daftar grup WhatsApp berhasil disinkronkan dari Fonnte."
      };
    }
    return {
      ok: false,
      configured: true,
      detail: formatFonnteFailureDetail(
        parsed?.reason || parsed?.detail || `Gagal fetch-group Fonnte (HTTP ${response.status}).`
      )
    };
  } catch (err) {
    return {
      ok: false,
      configured: true,
      detail: err instanceof Error ? err.message : "Koneksi ke Fonnte fetch-group gagal."
    };
  }
}
async function getFonnteWhatsappGroups() {
  const token = sanitizeFonnteToken(process.env.FONNTE_TOKEN);
  if (!token) {
    return {
      ok: false,
      configured: false,
      detail: "FONNTE_TOKEN belum dikonfigurasi di environment backend.",
      groups: []
    };
  }
  try {
    const response = await fetch("https://api.fonnte.com/get-whatsapp-group", {
      method: "POST",
      headers: {
        Authorization: token
      },
      signal: AbortSignal.timeout(12e3)
    });
    const text = await response.text();
    let parsed = null;
    try {
      parsed = JSON.parse(text);
    } catch {
      parsed = null;
    }
    if (response.ok && parsed && parsed.status === true) {
      const rawList = Array.isArray(parsed.data) ? parsed.data : [];
      const groups = [];
      for (const item of rawList) {
        const id = String(item.id || item.target || item.jid || "").trim();
        const name = String(item.name || item.subject || item.title || id).trim();
        if (id) {
          groups.push({ id, name: name || id });
        }
      }
      return {
        ok: true,
        configured: true,
        detail: groups.length > 0 ? `Berhasil memuat ${groups.length} grup WhatsApp dari Fonnte.` : "Tidak ada grup WhatsApp yang ditemukan. Coba tekan Sinkronkan Grup terlebih dahulu.",
        groups
      };
    }
    return {
      ok: false,
      configured: true,
      detail: formatFonnteFailureDetail(
        parsed?.reason || parsed?.detail || `Gagal mengambil grup (HTTP ${response.status}).`
      ),
      groups: []
    };
  } catch (err) {
    return {
      ok: false,
      configured: true,
      detail: err instanceof Error ? err.message : "Gagal menghubungi Fonnte get-whatsapp-group.",
      groups: []
    };
  }
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

// src/server/quizService.ts
import crypto from "crypto";
var QUIZZES_FILE = "quizzes.json";
var ATTEMPTS_FILE = "quiz-attempts.json";
var SESSIONS_FILE = "quiz-sessions.json";
function loadQuizzes() {
  const loaded = readJsonData(QUIZZES_FILE, null);
  if (!loaded || !Array.isArray(loaded)) {
    return [];
  }
  return loaded;
}
function saveQuizzes(quizzes) {
  writeJsonData(QUIZZES_FILE, quizzes);
}
function loadAttempts() {
  return readJsonData(ATTEMPTS_FILE, []);
}
function saveAttempts(attempts) {
  writeJsonData(ATTEMPTS_FILE, attempts);
}
function loadSessions() {
  return readJsonData(SESSIONS_FILE, []);
}
function saveSessions(sessions) {
  writeJsonData(SESSIONS_FILE, sessions.slice(-1e3));
}
function listPublicQuizzes() {
  const quizzes = loadQuizzes();
  return quizzes.filter((q) => q.status === "published").map((q) => ({
    ...toStudentSafeQuiz(q),
    availability: checkQuizAvailability(q)
  }));
}
function getPublicQuizById(quizId) {
  const quizzes = loadQuizzes();
  const found = quizzes.find((q) => q.id === quizId);
  if (!found || found.status !== "published") {
    return { quiz: null, availability: null };
  }
  return {
    quiz: toStudentSafeQuiz(found),
    availability: checkQuizAvailability(found)
  };
}
function startStudentQuizSession(input) {
  const studentName = input.studentName.trim();
  const studentClass = input.studentClass.trim();
  if (studentName.length < 2 || studentName.length > 120) {
    return { ok: false, error: "Nama lengkap siswa wajib diisi (minimal 2 karakter)." };
  }
  if (studentClass.length < 1 || studentClass.length > 60) {
    return { ok: false, error: "Kelas wajib diisi." };
  }
  const quizzes = loadQuizzes();
  const quiz = quizzes.find((q) => q.id === input.quizId);
  if (!quiz) {
    return { ok: false, error: "Kuis tidak ditemukan." };
  }
  const avail = checkQuizAvailability(quiz);
  if (!avail.available) {
    return { ok: false, error: avail.reason || "Kuis belum dapat dikerjakan saat ini." };
  }
  const attempts = loadAttempts();
  const attemptsUsed = countMatchingAttempts(attempts, quiz.id, studentName, studentClass);
  if (quiz.maxAttempts > 0 && attemptsUsed >= quiz.maxAttempts) {
    return {
      ok: false,
      error: `Batas maksimal pengerjaan (${quiz.maxAttempts} kali) untuk ${studentName} (${studentClass}) telah tercapai.`
    };
  }
  const now = /* @__PURE__ */ new Date();
  const startedAtIso = now.toISOString();
  const deadlineIso = quiz.timeLimitMinutes > 0 ? new Date(now.getTime() + quiz.timeLimitMinutes * 60 * 1e3).toISOString() : void 0;
  const sessionToken = crypto.randomUUID();
  const sessions = loadSessions();
  sessions.push({
    sessionToken,
    quizId: quiz.id,
    studentName,
    studentClass,
    parentWhatsapp: input.parentWhatsapp?.trim() ? normalizeWhatsappPhone(input.parentWhatsapp.trim()) : void 0,
    startedAtIso,
    deadlineIso,
    submitted: false
  });
  saveSessions(sessions);
  return {
    ok: true,
    sessionToken,
    startedAtIso,
    deadlineIso,
    attemptsUsed,
    quiz: toStudentSafeQuiz(quiz)
  };
}
function submitStudentQuizAttempt(input) {
  const quizzes = loadQuizzes();
  const quiz = quizzes.find((q) => q.id === input.quizId);
  if (!quiz) {
    return { ok: false, error: "Kuis tidak ditemukan." };
  }
  const avail = checkQuizAvailability(quiz);
  if (!avail.available) {
    return { ok: false, error: avail.reason || "Kuis sudah tidak menerima jawaban." };
  }
  const sessions = loadSessions();
  const sessionIdx = input.sessionToken ? sessions.findIndex((s) => s.sessionToken === input.sessionToken && s.quizId === quiz.id) : -1;
  if (sessionIdx < 0) {
    return { ok: false, error: "Sesi pengerjaan kuis tidak valid atau sudah kedaluwarsa." };
  }
  const session = sessions[sessionIdx];
  if (session.submitted) {
    return { ok: false, error: "Jawaban pada sesi ini sudah pernah dikirim sebelumnya." };
  }
  const nowMs = Date.now();
  const startedMs = new Date(session.startedAtIso).getTime();
  const durationSeconds = Math.max(1, Math.round((nowMs - startedMs) / 1e3));
  if (quiz.timeLimitMinutes > 0) {
    const allowedSec = quiz.timeLimitMinutes * 60 + 20;
    if (durationSeconds > allowedSec) {
      return {
        ok: false,
        error: `Waktu pengerjaan melebihi batas maksimal (${quiz.timeLimitMinutes} menit). Jawaban ditolak oleh server.`
      };
    }
  }
  const attempts = loadAttempts();
  const attemptsUsed = countMatchingAttempts(
    attempts,
    quiz.id,
    session.studentName,
    session.studentClass
  );
  if (quiz.maxAttempts > 0 && attemptsUsed >= quiz.maxAttempts) {
    return {
      ok: false,
      error: `Batas maksimal percobaan (${quiz.maxAttempts}x) telah tercapai.`
    };
  }
  const graded = gradeQuizSubmission(quiz, input.answers || {}, durationSeconds);
  const submittedAtIso = (/* @__PURE__ */ new Date()).toISOString();
  const attemptId = `att_${Date.now()}_${crypto.randomBytes(3).toString("hex")}`;
  const record = {
    id: attemptId,
    quizId: quiz.id,
    quizTitle: quiz.title,
    studentName: session.studentName,
    studentClass: session.studentClass,
    parentWhatsapp: session.parentWhatsapp,
    answers: input.answers || {},
    score: graded.score,
    maxScore: graded.maxScore,
    percentage: graded.percentage,
    correctCount: graded.correctCount,
    wrongCount: graded.wrongCount,
    unansweredCount: graded.unansweredCount,
    durationSeconds,
    startedAtIso: session.startedAtIso,
    submittedAtIso,
    gradedDetails: graded.gradedDetails
  };
  attempts.unshift(record);
  saveAttempts(attempts);
  sessions[sessionIdx] = { ...session, submitted: true };
  saveSessions(sessions);
  return {
    ok: true,
    result: {
      attemptId,
      quizTitle: quiz.title,
      studentName: record.studentName,
      studentClass: record.studentClass,
      score: record.score,
      maxScore: record.maxScore,
      percentage: record.percentage,
      correctCount: record.correctCount,
      wrongCount: record.wrongCount,
      unansweredCount: record.unansweredCount,
      durationSeconds: record.durationSeconds,
      submittedAtIso: record.submittedAtIso
    }
  };
}
function listAdminQuizzes() {
  const quizzes = loadQuizzes();
  const attempts = loadAttempts();
  return quizzes.map((q) => ({
    ...q,
    attemptCount: attempts.filter((a) => a.quizId === q.id).length
  }));
}
function upsertAdminQuiz(payload) {
  const validation = validateQuizPayload(payload);
  if (!validation.valid) {
    return { ok: false, errors: validation.errors };
  }
  const quizzes = loadQuizzes();
  const nowIso = (/* @__PURE__ */ new Date()).toISOString();
  const cleanId = payload.id && /^[a-zA-Z0-9_-]{3,80}$/.test(payload.id) ? payload.id : `kuis-${Date.now()}-${crypto.randomBytes(2).toString("hex")}`;
  const existingIdx = quizzes.findIndex((q) => q.id === cleanId);
  const existing = existingIdx >= 0 ? quizzes[existingIdx] : null;
  const normalizedQuestions = (payload.questions || []).map((q, idx) => ({
    id: q.id || `q_${idx + 1}`,
    order: idx + 1,
    type: q.type,
    prompt: q.prompt.trim(),
    imageUrl: typeof q.imageUrl === "string" && q.imageUrl.trim() ? q.imageUrl.trim() : void 0,
    options: q.options.map((o, oIdx) => ({
      id: o.id || `opt_${oIdx + 1}`,
      text: o.text.trim()
    })),
    points: Math.max(1, Number(q.points) || 10),
    correctOptionId: q.correctOptionId,
    explanation: q.explanation?.trim() || void 0
  }));
  const record = {
    id: cleanId,
    title: (payload.title || "").trim(),
    description: (payload.description || "").trim(),
    instructions: (payload.instructions || "").trim(),
    targetClass: (payload.targetClass || "Semua Tingkat").trim(),
    status: payload.status || "draft",
    timeLimitMinutes: Math.max(0, Number(payload.timeLimitMinutes) || 0),
    maxAttempts: Math.max(0, Number(payload.maxAttempts) || 0),
    startAtIso: payload.startAtIso || void 0,
    endAtIso: payload.endAtIso || void 0,
    questions: normalizedQuestions,
    createdAtIso: existing?.createdAtIso || nowIso,
    updatedAtIso: nowIso
  };
  if (existingIdx >= 0) {
    quizzes[existingIdx] = record;
  } else {
    quizzes.unshift(record);
  }
  saveQuizzes(quizzes);
  return { ok: true, quiz: record };
}
function deleteAdminQuiz(quizId) {
  const quizzes = loadQuizzes();
  const next = quizzes.filter((q) => q.id !== quizId);
  if (next.length === quizzes.length) return false;
  saveQuizzes(next);
  const attempts = loadAttempts();
  const nextAttempts = attempts.filter((a) => a.quizId !== quizId);
  if (nextAttempts.length !== attempts.length) {
    saveAttempts(nextAttempts);
  }
  const sessions = loadSessions();
  const nextSessions = sessions.filter((s) => s.quizId !== quizId);
  if (nextSessions.length !== sessions.length) {
    saveSessions(nextSessions);
  }
  return true;
}
function listAllAdminQuizAttempts() {
  const attempts = loadAttempts();
  return [...attempts].sort(
    (a, b) => new Date(b.submittedAtIso).getTime() - new Date(a.submittedAtIso).getTime()
  );
}
function deleteAdminQuizAttempt(attemptId) {
  const attempts = loadAttempts();
  const next = attempts.filter((a) => a.id !== attemptId);
  if (next.length === attempts.length) return false;
  saveAttempts(next);
  return true;
}
function getAdminQuizAttempts(quizId) {
  const quizzes = loadQuizzes();
  const quiz = quizzes.find((q) => q.id === quizId) || null;
  const attempts = loadAttempts().filter((a) => a.quizId === quizId);
  return { quiz, attempts };
}
function exportAdminQuizCsv(quizId) {
  const { quiz, attempts } = getAdminQuizAttempts(quizId);
  if (!quiz) return { ok: false };
  const safeSlug = quiz.id.replace(/[^a-zA-Z0-9_-]/g, "_");
  return {
    ok: true,
    filename: `hasil-${safeSlug}.csv`,
    csv: buildQuizAttemptsCsv(quiz, attempts)
  };
}
function exportAllAdminQuizAttemptsCsv(filters) {
  let rows = listAllAdminQuizAttempts();
  if (filters?.quizId && filters.quizId !== "all") {
    rows = rows.filter((r) => r.quizId === filters.quizId);
  }
  if (filters?.studentClass && filters.studentClass !== "all") {
    const cls = filters.studentClass.trim().toLowerCase();
    rows = rows.filter((r) => r.studentClass.trim().toLowerCase() === cls);
  }
  if (filters?.search && filters.search.trim()) {
    const q = filters.search.trim().toLowerCase();
    rows = rows.filter(
      (r) => r.studentName.toLowerCase().includes(q) || r.studentClass.toLowerCase().includes(q) || r.quizTitle.toLowerCase().includes(q)
    );
  }
  return {
    filename: "rekap-nilai-kuis-siswa.csv",
    csv: buildAllQuizAttemptsCsv(rows)
  };
}

// src/server/waCenterService.ts
import crypto2 from "crypto";
var WA_GROUPS_FILE = "wa-groups.json";
var WA_GROUP_LOGS_FILE = "wa-group-logs.json";
var WA_TEMPLATES_FILE = "wa-templates.json";
var WA_CAMPAIGNS_FILE = "wa-campaigns.json";
var WA_OPTOUTS_FILE = "wa-optouts.json";
var WA_SETTINGS_FILE = "wa-settings.json";
function loadGroups() {
  return readJsonData(WA_GROUPS_FILE, []);
}
function saveGroups(groups) {
  writeJsonData(WA_GROUPS_FILE, groups);
}
function loadGroupLogs() {
  return readJsonData(WA_GROUP_LOGS_FILE, []);
}
function saveGroupLogs(logs) {
  writeJsonData(WA_GROUP_LOGS_FILE, logs.slice(0, 200));
}
function listSavedWaGroups() {
  return {
    groups: loadGroups(),
    logs: loadGroupLogs()
  };
}
async function refreshWaGroupsFromFonnte(triggerFetchGroup) {
  if (triggerFetchGroup) {
    const fetchRes = await fetchFonnteGroupRefresh();
    if (!fetchRes.ok) {
      return {
        ok: false,
        configured: fetchRes.configured,
        detail: fetchRes.detail,
        groups: loadGroups()
      };
    }
  }
  const listRes = await getFonnteWhatsappGroups();
  if (!listRes.ok) {
    return {
      ok: false,
      configured: listRes.configured,
      detail: listRes.detail,
      groups: loadGroups()
    };
  }
  const existing = loadGroups();
  const pinnedMap = new Map(existing.map((g) => [g.id, g.pinned]));
  const nowIso = (/* @__PURE__ */ new Date()).toISOString();
  const merged = listRes.groups.map((g) => ({
    id: g.id,
    name: g.name,
    pinned: pinnedMap.get(g.id) ?? false,
    lastSyncedIso: nowIso
  }));
  saveGroups(merged);
  return {
    ok: true,
    configured: true,
    detail: listRes.detail,
    groups: merged
  };
}
function updatePinnedWaGroups(pinnedIds) {
  const pinnedSet = new Set(pinnedIds);
  const current = loadGroups();
  const next = current.map((g) => ({
    ...g,
    pinned: pinnedSet.has(g.id)
  }));
  saveGroups(next);
  return next;
}
async function sendWaGroupAnnouncement(input) {
  const cleanMsg = input.message.trim();
  const uniqueIds = Array.from(new Set(input.groupIds.map((id) => id.trim()).filter(Boolean)));
  if (uniqueIds.length === 0) {
    return { ok: false, error: "Pilih minimal satu grup WhatsApp tujuan." };
  }
  if (!cleanMsg) {
    return { ok: false, error: "Isi pengumuman grup wajib ditulis." };
  }
  const groups = loadGroups();
  const groupNames = uniqueIds.map((id) => groups.find((g) => g.id === id)?.name || id);
  const results = [];
  for (let i = 0; i < uniqueIds.length; i++) {
    const gid = uniqueIds[i];
    const gname = groupNames[i];
    const delivery = await sendFonnteWhatsApp({
      target: gid,
      message: cleanMsg,
      idempotencyKey: input.requestId ? `wagroup_${input.requestId}_${gid}` : void 0
    });
    results.push({
      groupId: gid,
      groupName: gname,
      status: delivery.status,
      detail: delivery.detail
    });
    if (i < uniqueIds.length - 1) {
      await new Promise((r) => setTimeout(r, 800));
    }
  }
  const allSent = results.every((r) => r.status === "sent" || r.status === "skipped_duplicate");
  const anySent = results.some((r) => r.status === "sent" || r.status === "skipped_duplicate");
  const unconfigured = results.every((r) => r.status === "unconfigured");
  const log = {
    id: `grplog_${Date.now()}_${crypto2.randomBytes(2).toString("hex")}`,
    groupIds: uniqueIds,
    groupNames,
    message: cleanMsg,
    status: unconfigured ? "unconfigured" : allSent ? "sent" : anySent ? "partial" : "failed",
    results,
    sentAtIso: (/* @__PURE__ */ new Date()).toISOString(),
    sentByEmail: input.sentByEmail
  };
  const logs = loadGroupLogs();
  logs.unshift(log);
  saveGroupLogs(logs);
  return { ok: true, log };
}
function loadTemplates() {
  const loaded = readJsonData(WA_TEMPLATES_FILE, null);
  if (!loaded || !Array.isArray(loaded) || loaded.length === 0) {
    writeJsonData(WA_TEMPLATES_FILE, INITIAL_WA_TEMPLATES);
    return [...INITIAL_WA_TEMPLATES];
  }
  return loaded;
}
function saveTemplates(templates) {
  writeJsonData(WA_TEMPLATES_FILE, templates);
}
function listWaTemplates() {
  return loadTemplates();
}
function upsertWaTemplate(input) {
  const name = input.name.trim();
  const content = input.content.trim();
  if (name.length < 2 || name.length > 150) {
    return { ok: false, error: "Nama template wajib diisi (2\u2013150 karakter)." };
  }
  if (!WA_TEMPLATE_CATEGORIES.includes(input.category)) {
    return { ok: false, error: "Kategori template tidak valid." };
  }
  if (content.length < 3 || content.length > 4e3) {
    return { ok: false, error: "Isi pesan template wajib diisi (3\u20134000 karakter)." };
  }
  const templates = loadTemplates();
  const nowIso = (/* @__PURE__ */ new Date()).toISOString();
  const cleanId = input.id && /^[a-zA-Z0-9_-]{3,80}$/.test(input.id) ? input.id : `tpl_${Date.now()}_${crypto2.randomBytes(2).toString("hex")}`;
  const idx = templates.findIndex((t) => t.id === cleanId);
  const existing = idx >= 0 ? templates[idx] : null;
  const record = {
    id: cleanId,
    name,
    category: input.category,
    content,
    isEnabled: input.isEnabled ?? existing?.isEnabled ?? true,
    createdAtIso: existing?.createdAtIso || nowIso,
    updatedAtIso: nowIso
  };
  if (idx >= 0) templates[idx] = record;
  else templates.unshift(record);
  saveTemplates(templates);
  return { ok: true, template: record };
}
function deleteWaTemplate(id) {
  const templates = loadTemplates();
  const next = templates.filter((t) => t.id !== id);
  if (next.length === templates.length) return false;
  saveTemplates(next);
  return true;
}
function loadOptOuts() {
  return readJsonData(WA_OPTOUTS_FILE, []);
}
function saveOptOuts(items) {
  writeJsonData(WA_OPTOUTS_FILE, items);
}
function listWaOptOuts() {
  return loadOptOuts();
}
function addWaOptOut(phone, reason) {
  const list = loadOptOuts();
  const clean = phone.replace(/[^\d+]/g, "").replace(/^\+/, "").replace(/^0/, "62");
  if (!clean) return list;
  if (!list.some((o) => o.phone === clean)) {
    list.unshift({
      phone: clean,
      reason: reason?.trim() || "Berhenti menerima pesan",
      addedAtIso: (/* @__PURE__ */ new Date()).toISOString()
    });
    saveOptOuts(list);
  }
  return list;
}
function removeWaOptOut(phone) {
  const next = loadOptOuts().filter((o) => o.phone !== phone);
  saveOptOuts(next);
  return next;
}
var DEFAULT_SETTINGS = {
  delaySeconds: 2,
  batchSize: 5,
  maxRetries: 1,
  defaultTemplateId: "tpl-pengumuman",
  testRecipientPhone: ADMIN_WHATSAPP_TARGET,
  autoNotifyQuizPublished: false,
  autoQuizTemplateId: "tpl-kuis",
  autoNotifyRegistration: true,
  autoRegistrationTemplateId: "tpl-pendaftaran",
  autoNotifyLearningInfo: false,
  autoLearningTemplateId: "tpl-pengingat-kelas",
  updatedAtIso: "2026-11-01T08:00:00.000Z"
};
function getWaSettings() {
  return readJsonData(WA_SETTINGS_FILE, DEFAULT_SETTINGS);
}
function saveWaSettings(updates) {
  const current = getWaSettings();
  const next = {
    ...current,
    ...updates,
    delaySeconds: Math.min(60, Math.max(1, Number(updates.delaySeconds ?? current.delaySeconds) || 2)),
    batchSize: Math.min(25, Math.max(1, Number(updates.batchSize ?? current.batchSize) || 5)),
    maxRetries: Math.min(3, Math.max(0, Number(updates.maxRetries ?? current.maxRetries) || 1)),
    updatedAtIso: (/* @__PURE__ */ new Date()).toISOString()
  };
  writeJsonData(WA_SETTINGS_FILE, next);
  return next;
}
function loadCampaigns() {
  return readJsonData(WA_CAMPAIGNS_FILE, []);
}
function saveCampaigns(campaigns) {
  writeJsonData(WA_CAMPAIGNS_FILE, campaigns.slice(0, 100));
}
function listWaCampaigns() {
  return loadCampaigns().map(recalculateCampaignCounts);
}
function getWaCampaign(id) {
  const found = loadCampaigns().find((c) => c.id === id);
  return found ? recalculateCampaignCounts(found) : null;
}
function createWaCampaign(input) {
  const title = input.title.trim() || `Siaran WhatsApp ${(/* @__PURE__ */ new Date()).toLocaleDateString("id-ID")}`;
  const rawMessage = input.rawMessage.trim();
  if (!rawMessage) {
    return { ok: false, error: "Isi pesan WhatsApp wajib diisi." };
  }
  const optOuts = loadOptOuts().map((o) => o.phone);
  const filtered = deduplicateAndFilterRecipients(input.recipients, optOuts);
  if (filtered.accepted.length === 0) {
    return {
      ok: false,
      error: `Tidak ada penerima valid yang tersisa (tidak valid: ${filtered.invalid.length}, opt-out: ${filtered.optedOut}, duplikat: ${filtered.duplicates}).`
    };
  }
  const missingVariableErrors = [];
  const items = [];
  for (let i = 0; i < filtered.accepted.length; i++) {
    const r = filtered.accepted[i];
    const vars = {
      nama_siswa: r.name || input.fallbackVariables?.nama_siswa || "",
      nama_orang_tua: r.parentName || input.fallbackVariables?.nama_orang_tua || "",
      kelas: r.studentClass || input.fallbackVariables?.kelas || "",
      nama_program: r.programName || input.fallbackVariables?.nama_program || "",
      jadwal: r.scheduleLabel || input.fallbackVariables?.jadwal || ""
    };
    const rendered = renderTemplateVariables(rawMessage, vars);
    if (rendered.missingVariables.length > 0) {
      missingVariableErrors.push({
        recipient: r.name || r.normalizedPhone,
        missing: rendered.missingVariables
      });
    }
    items.push({
      id: `item_${i + 1}_${crypto2.randomBytes(2).toString("hex")}`,
      phone: r.normalizedPhone,
      displayName: r.name || r.parentName || r.normalizedPhone,
      resolvedMessage: rendered.rendered,
      source: r.source || "manual",
      status: "menunggu",
      attempts: 0,
      variables: vars
    });
  }
  if (missingVariableErrors.length > 0) {
    return {
      ok: false,
      error: `Terdapat variabel template yang belum lengkap untuk ${missingVariableErrors.length} penerima.`,
      missingVariableErrors: missingVariableErrors.slice(0, 10)
    };
  }
  const settings = getWaSettings();
  const nowIso = (/* @__PURE__ */ new Date()).toISOString();
  const campaign = recalculateCampaignCounts({
    id: `cmp_${Date.now()}_${crypto2.randomBytes(2).toString("hex")}`,
    title,
    templateId: input.templateId,
    templateName: input.templateName,
    rawMessage,
    status: "running",
    totalCount: items.length,
    waitingCount: items.length,
    processingCount: 0,
    successCount: 0,
    failedCount: 0,
    delaySeconds: Math.min(30, Math.max(1, Number(input.delaySeconds ?? settings.delaySeconds) || 2)),
    batchSize: Math.min(25, Math.max(1, Number(input.batchSize ?? settings.batchSize) || 5)),
    maxRetries: Math.min(3, Math.max(0, Number(input.maxRetries ?? settings.maxRetries) || 1)),
    createdAtIso: nowIso,
    updatedAtIso: nowIso,
    createdByEmail: input.createdByEmail,
    items
  });
  const campaigns = loadCampaigns();
  campaigns.unshift(campaign);
  saveCampaigns(campaigns);
  return {
    ok: true,
    campaign,
    summary: {
      invalidCount: filtered.invalid.length,
      duplicateCount: filtered.duplicates,
      optedOutCount: filtered.optedOut
    }
  };
}
async function processWaCampaignBatch(campaignId) {
  const campaigns = loadCampaigns();
  const idx = campaigns.findIndex((c) => c.id === campaignId);
  if (idx < 0) {
    return { ok: false, error: "Kampanye tidak ditemukan.", processedInStep: 0 };
  }
  let campaign = campaigns[idx];
  if (campaign.status === "paused") {
    return { ok: true, campaign: recalculateCampaignCounts(campaign), processedInStep: 0 };
  }
  if (campaign.status === "completed") {
    return { ok: true, campaign: recalculateCampaignCounts(campaign), processedInStep: 0 };
  }
  const maxStepMs = 9e3;
  const stepStart = Date.now();
  let processedInStep = 0;
  for (let i = 0; i < campaign.items.length; i++) {
    if (processedInStep >= campaign.batchSize) break;
    if (processedInStep > 0 && Date.now() - stepStart >= maxStepMs) break;
    const item = campaign.items[i];
    const canRetry = item.status === "gagal" && item.attempts <= campaign.maxRetries;
    if (item.status !== "menunggu" && !canRetry) continue;
    if (processedInStep > 0) {
      await new Promise((r) => setTimeout(r, Math.min(campaign.delaySeconds, 5) * 1e3));
    }
    campaign.items[i] = { ...item, status: "diproses", attempts: item.attempts + 1 };
    campaigns[idx] = recalculateCampaignCounts({
      ...campaign,
      updatedAtIso: (/* @__PURE__ */ new Date()).toISOString()
    });
    saveCampaigns(campaigns);
    const delivery = await sendFonnteWhatsApp({
      target: item.phone,
      message: item.resolvedMessage,
      idempotencyKey: `cmp_${campaign.id}_${item.id}`
    });
    const isSuccess = delivery.status === "sent" || delivery.status === "skipped_duplicate";
    campaign.items[i] = {
      ...campaign.items[i],
      status: isSuccess ? "berhasil" : "gagal",
      lastError: isSuccess ? void 0 : delivery.detail,
      sentAtIso: (/* @__PURE__ */ new Date()).toISOString()
    };
    processedInStep += 1;
    campaign = recalculateCampaignCounts({
      ...campaign,
      updatedAtIso: (/* @__PURE__ */ new Date()).toISOString()
    });
    campaigns[idx] = campaign;
    saveCampaigns(campaigns);
  }
  const finalized = recalculateCampaignCounts({
    ...campaign,
    updatedAtIso: (/* @__PURE__ */ new Date()).toISOString()
  });
  campaigns[idx] = finalized;
  saveCampaigns(campaigns);
  return { ok: true, campaign: finalized, processedInStep };
}
function setWaCampaignStatus(campaignId, status) {
  const campaigns = loadCampaigns();
  const idx = campaigns.findIndex((c) => c.id === campaignId);
  if (idx < 0) return null;
  const current = campaigns[idx];
  if (current.status === "completed") return recalculateCampaignCounts(current);
  const updated = recalculateCampaignCounts({
    ...current,
    status,
    updatedAtIso: (/* @__PURE__ */ new Date()).toISOString()
  });
  campaigns[idx] = updated;
  saveCampaigns(campaigns);
  return updated;
}
function exportWaCampaignCsv(campaignId) {
  const campaign = getWaCampaign(campaignId);
  if (!campaign) return { ok: false };
  return {
    ok: true,
    filename: `laporan-wa-${campaign.id}.csv`,
    csv: buildCampaignReportCsv(campaign)
  };
}
async function getWaCenterOverviewStatus() {
  const device = await checkFonnteDeviceStatus();
  return {
    fonnteConfigured: isFonnteConfigured(),
    device,
    settings: getWaSettings(),
    templates: listWaTemplates(),
    optOuts: listWaOptOuts(),
    campaigns: listWaCampaigns()
  };
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
      fonnteSenderNumber: FONNTE_SENDER_NUMBER,
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
    const channel = body.channel === "migration" ? "migration" : "offline";
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
      channel,
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
    const body = req.body || {};
    const customTarget = typeof body.target === "string" && body.target.trim() ? body.target.trim().endsWith("@g.us") ? body.target.trim() : normalizeWhatsappPhone(body.target.trim()) : ADMIN_WHATSAPP_TARGET;
    const nowLabel = (/* @__PURE__ */ new Date()).toLocaleString("id-ID", { timeZone: "Asia/Jakarta" });
    const message = [
      "\u2705 UJI NOTIFIKASI WHATSAPP \u2014 TOMOYO EDUCATION",
      "",
      `Pengirim Admin: ${decoded.email}`,
      `Nomor Device Fonnte: +${FONNTE_SENDER_NUMBER}`,
      `Waktu Uji: ${nowLabel} WIB`,
      `Dashboard Admin: ${baseUrl}/admintomoyo`,
      "",
      "Integrasi backend Fonnte aktif dan siap menerima notifikasi pendaftaran siswa baru, kuis online, maupun siaran pesan."
    ].join("\n");
    const delivery = await sendFonnteWhatsApp({ target: customTarget, message });
    res.json({
      ...delivery,
      messagePreview: message.slice(0, 480)
    });
  });
  app2.get("/api/admin/fonnte/device", async (req, res) => {
    const decoded = await verifyRequestFirebaseToken(req);
    if (!decoded) {
      res.status(401).json({ error: "Token Firebase tidak valid." });
      return;
    }
    if (!isDecodedTokenAdmin(decoded)) {
      res.status(403).json({ error: "Akses ditolak. Khusus akun admin terotorisasi." });
      return;
    }
    const status = await checkFonnteDeviceStatus();
    res.json(status);
  });
  app2.get("/api/quizzes", (_req, res) => {
    res.setHeader("Cache-Control", "no-store");
    res.json({ quizzes: listPublicQuizzes() });
  });
  app2.get("/api/quizzes/:quizId", (req, res) => {
    res.setHeader("Cache-Control", "no-store");
    const data = getPublicQuizById(req.params.quizId);
    if (!data.quiz) {
      res.status(404).json({ error: "Kuis tidak ditemukan atau belum diterbitkan." });
      return;
    }
    res.json(data);
  });
  app2.post("/api/quizzes/:quizId/start", (req, res) => {
    const body = req.body || {};
    const started = startStudentQuizSession({
      quizId: req.params.quizId,
      studentName: typeof body.studentName === "string" ? body.studentName : "",
      studentClass: typeof body.studentClass === "string" ? body.studentClass : "",
      parentWhatsapp: typeof body.parentWhatsapp === "string" ? body.parentWhatsapp : void 0
    });
    if (!started.ok) {
      res.status(400).json({ error: started.error || "Gagal memulai kuis." });
      return;
    }
    res.json(started);
  });
  app2.post("/api/quizzes/:quizId/submit", (req, res) => {
    const body = req.body || {};
    const outcome = submitStudentQuizAttempt({
      quizId: req.params.quizId,
      sessionToken: body.sessionToken,
      studentName: typeof body.studentName === "string" ? body.studentName : "",
      studentClass: typeof body.studentClass === "string" ? body.studentClass : "",
      parentWhatsapp: typeof body.parentWhatsapp === "string" ? body.parentWhatsapp : void 0,
      answers: body.answers && typeof body.answers === "object" ? body.answers : {}
    });
    if (!outcome.ok) {
      res.status(400).json({ error: outcome.error || "Gagal mengirim jawaban kuis." });
      return;
    }
    res.json(outcome);
  });
  app2.get("/api/admin/quizzes", async (req, res) => {
    res.setHeader("Cache-Control", "no-store");
    const decoded = await verifyRequestFirebaseToken(req);
    if (!decoded || !isDecodedTokenAdmin(decoded)) {
      res.status(403).json({ error: "Khusus admin terotorisasi." });
      return;
    }
    res.json({ quizzes: listAdminQuizzes() });
  });
  app2.post("/api/admin/quizzes", async (req, res) => {
    const decoded = await verifyRequestFirebaseToken(req);
    if (!decoded || !isDecodedTokenAdmin(decoded)) {
      res.status(403).json({ error: "Khusus admin terotorisasi." });
      return;
    }
    const saved = upsertAdminQuiz(req.body || {});
    if (!saved.ok || !saved.quiz) {
      res.status(400).json({
        error: saved.errors?.join(" ") || "Data kuis tidak valid.",
        errors: saved.errors
      });
      return;
    }
    const settings = getWaSettings();
    let autoDispatch = null;
    if (settings.autoNotifyQuizPublished && saved.quiz.status === "published" && req.body?.notifyTarget) {
      const templates = listWaTemplates();
      const tpl = templates.find((t) => t.id === settings.autoQuizTemplateId);
      const baseUrl = resolveBaseUrl(req);
      const rawMsg = tpl?.content || `Kuis Online baru tersedia: *${saved.quiz.title}* (${saved.quiz.targetClass}). Kerjakan di ${baseUrl}/kuis/${saved.quiz.id}`;
      const rendered = renderTemplateVariables(rawMsg, {
        nama_siswa: "Siswa-siswi TOMOYO",
        nama_orang_tua: "Bapak/Ibu",
        kelas: saved.quiz.targetClass,
        nama_program: saved.quiz.title,
        jadwal: `${baseUrl}/kuis/${saved.quiz.id}`
      });
      const targetStr = String(req.body.notifyTarget).trim();
      const target = targetStr.endsWith("@g.us") ? targetStr : normalizeWhatsappPhone(targetStr);
      if (target) {
        autoDispatch = await sendFonnteWhatsApp({
          target,
          message: rendered.rendered
        });
      }
    }
    res.json({ ok: true, quiz: saved.quiz, autoDispatch });
  });
  app2.delete("/api/admin/quizzes/:quizId", async (req, res) => {
    const decoded = await verifyRequestFirebaseToken(req);
    if (!decoded || !isDecodedTokenAdmin(decoded)) {
      res.status(403).json({ error: "Khusus admin terotorisasi." });
      return;
    }
    const deleted = deleteAdminQuiz(req.params.quizId);
    if (!deleted) {
      res.status(404).json({ error: "Kuis tidak ditemukan." });
      return;
    }
    res.json({ ok: true });
  });
  app2.get("/api/admin/quizzes/:quizId/attempts", async (req, res) => {
    const decoded = await verifyRequestFirebaseToken(req);
    if (!decoded || !isDecodedTokenAdmin(decoded)) {
      res.status(403).json({ error: "Khusus admin terotorisasi." });
      return;
    }
    const data = getAdminQuizAttempts(req.params.quizId);
    if (!data.quiz) {
      res.status(404).json({ error: "Kuis tidak ditemukan." });
      return;
    }
    res.json(data);
  });
  app2.get("/api/admin/quizzes/:quizId/export", async (req, res) => {
    const decoded = await verifyRequestFirebaseToken(req);
    if (!decoded || !isDecodedTokenAdmin(decoded)) {
      res.status(403).json({ error: "Khusus admin terotorisasi." });
      return;
    }
    const exported = exportAdminQuizCsv(req.params.quizId);
    if (!exported.ok || !exported.csv) {
      res.status(404).json({ error: "Kuis tidak ditemukan." });
      return;
    }
    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader("Content-Disposition", `attachment; filename="${exported.filename}"`);
    res.send(exported.csv);
  });
  app2.get("/api/admin/quiz-attempts", async (req, res) => {
    res.setHeader("Cache-Control", "no-store");
    const decoded = await verifyRequestFirebaseToken(req);
    if (!decoded || !isDecodedTokenAdmin(decoded)) {
      res.status(403).json({ error: "Khusus admin terotorisasi." });
      return;
    }
    res.json({ attempts: listAllAdminQuizAttempts() });
  });
  app2.get("/api/admin/quiz-attempts/export", async (req, res) => {
    const decoded = await verifyRequestFirebaseToken(req);
    if (!decoded || !isDecodedTokenAdmin(decoded)) {
      res.status(403).json({ error: "Khusus admin terotorisasi." });
      return;
    }
    const exported = exportAllAdminQuizAttemptsCsv({
      quizId: typeof req.query.quizId === "string" ? req.query.quizId : void 0,
      studentClass: typeof req.query.studentClass === "string" ? req.query.studentClass : void 0,
      search: typeof req.query.search === "string" ? req.query.search : void 0
    });
    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader("Content-Disposition", `attachment; filename="${exported.filename}"`);
    res.send(exported.csv);
  });
  app2.delete("/api/admin/quiz-attempts/:attemptId", async (req, res) => {
    const decoded = await verifyRequestFirebaseToken(req);
    if (!decoded || !isDecodedTokenAdmin(decoded)) {
      res.status(403).json({ error: "Khusus admin terotorisasi." });
      return;
    }
    const deleted = deleteAdminQuizAttempt(req.params.attemptId);
    if (!deleted) {
      res.status(404).json({ error: "Data hasil kuis tidak ditemukan." });
      return;
    }
    res.json({ ok: true });
  });
  app2.get("/api/admin/wa-groups", async (req, res) => {
    const decoded = await verifyRequestFirebaseToken(req);
    if (!decoded || !isDecodedTokenAdmin(decoded)) {
      res.status(403).json({ error: "Khusus admin terotorisasi." });
      return;
    }
    res.json({
      fonnteConfigured: isFonnteConfigured(),
      senderNumber: FONNTE_SENDER_NUMBER,
      ...listSavedWaGroups()
    });
  });
  app2.post("/api/admin/wa-groups/sync", async (req, res) => {
    const decoded = await verifyRequestFirebaseToken(req);
    if (!decoded || !isDecodedTokenAdmin(decoded)) {
      res.status(403).json({ error: "Khusus admin terotorisasi." });
      return;
    }
    const triggerFetchGroup = Boolean(req.body?.triggerFetchGroup);
    const result = await refreshWaGroupsFromFonnte(triggerFetchGroup);
    res.json(result);
  });
  app2.post("/api/admin/wa-groups/pinned", async (req, res) => {
    const decoded = await verifyRequestFirebaseToken(req);
    if (!decoded || !isDecodedTokenAdmin(decoded)) {
      res.status(403).json({ error: "Khusus admin terotorisasi." });
      return;
    }
    const pinnedIds = Array.isArray(req.body?.pinnedIds) ? req.body.pinnedIds.map((id) => String(id)) : [];
    const groups = updatePinnedWaGroups(pinnedIds);
    res.json({ ok: true, groups });
  });
  app2.post("/api/admin/wa-groups/send", async (req, res) => {
    const decoded = await verifyRequestFirebaseToken(req);
    if (!decoded || !isDecodedTokenAdmin(decoded)) {
      res.status(403).json({ error: "Khusus admin terotorisasi." });
      return;
    }
    const body = req.body || {};
    const result = await sendWaGroupAnnouncement({
      groupIds: Array.isArray(body.groupIds) ? body.groupIds : [],
      message: typeof body.message === "string" ? body.message : "",
      sentByEmail: decoded.email || "admin",
      requestId: typeof body.requestId === "string" ? body.requestId : void 0
    });
    if (!result.ok) {
      res.status(400).json({ error: result.error || "Gagal mengirim pesan grup." });
      return;
    }
    res.json(result);
  });
  app2.get("/api/admin/wa-center/overview", async (req, res) => {
    const decoded = await verifyRequestFirebaseToken(req);
    if (!decoded || !isDecodedTokenAdmin(decoded)) {
      res.status(403).json({ error: "Khusus admin terotorisasi." });
      return;
    }
    const overview = await getWaCenterOverviewStatus();
    res.json({
      senderNumber: FONNTE_SENDER_NUMBER,
      adminTarget: ADMIN_WHATSAPP_TARGET,
      ...overview
    });
  });
  app2.post("/api/admin/wa-center/templates", async (req, res) => {
    const decoded = await verifyRequestFirebaseToken(req);
    if (!decoded || !isDecodedTokenAdmin(decoded)) {
      res.status(403).json({ error: "Khusus admin terotorisasi." });
      return;
    }
    const result = upsertWaTemplate({
      id: typeof req.body?.id === "string" ? req.body.id : void 0,
      name: typeof req.body?.name === "string" ? req.body.name : "",
      category: typeof req.body?.category === "string" ? req.body.category : "",
      content: typeof req.body?.content === "string" ? req.body.content : "",
      isEnabled: typeof req.body?.isEnabled === "boolean" ? req.body.isEnabled : void 0
    });
    if (!result.ok) {
      res.status(400).json({ error: result.error });
      return;
    }
    res.json({ ok: true, template: result.template, templates: listWaTemplates() });
  });
  app2.delete("/api/admin/wa-center/templates/:id", async (req, res) => {
    const decoded = await verifyRequestFirebaseToken(req);
    if (!decoded || !isDecodedTokenAdmin(decoded)) {
      res.status(403).json({ error: "Khusus admin terotorisasi." });
      return;
    }
    const deleted = deleteWaTemplate(req.params.id);
    if (!deleted) {
      res.status(404).json({ error: "Template tidak ditemukan." });
      return;
    }
    res.json({ ok: true, templates: listWaTemplates() });
  });
  app2.post("/api/admin/wa-center/optouts", async (req, res) => {
    const decoded = await verifyRequestFirebaseToken(req);
    if (!decoded || !isDecodedTokenAdmin(decoded)) {
      res.status(403).json({ error: "Khusus admin terotorisasi." });
      return;
    }
    const phone = typeof req.body?.phone === "string" ? req.body.phone : "";
    const reason = typeof req.body?.reason === "string" ? req.body.reason : void 0;
    if (!phone.trim()) {
      res.status(400).json({ error: "Nomor WhatsApp opt-out wajib diisi." });
      return;
    }
    const optOuts = addWaOptOut(phone, reason);
    res.json({ ok: true, optOuts });
  });
  app2.delete("/api/admin/wa-center/optouts/:phone", async (req, res) => {
    const decoded = await verifyRequestFirebaseToken(req);
    if (!decoded || !isDecodedTokenAdmin(decoded)) {
      res.status(403).json({ error: "Khusus admin terotorisasi." });
      return;
    }
    const optOuts = removeWaOptOut(req.params.phone);
    res.json({ ok: true, optOuts });
  });
  app2.post("/api/admin/wa-center/settings", async (req, res) => {
    const decoded = await verifyRequestFirebaseToken(req);
    if (!decoded || !isDecodedTokenAdmin(decoded)) {
      res.status(403).json({ error: "Khusus admin terotorisasi." });
      return;
    }
    const settings = saveWaSettings(req.body || {});
    res.json({ ok: true, settings });
  });
  app2.post("/api/admin/wa-center/campaigns", async (req, res) => {
    const decoded = await verifyRequestFirebaseToken(req);
    if (!decoded || !isDecodedTokenAdmin(decoded)) {
      res.status(403).json({ error: "Khusus admin terotorisasi." });
      return;
    }
    const body = req.body || {};
    const created = createWaCampaign({
      title: typeof body.title === "string" ? body.title : "",
      templateId: typeof body.templateId === "string" ? body.templateId : void 0,
      templateName: typeof body.templateName === "string" ? body.templateName : void 0,
      rawMessage: typeof body.rawMessage === "string" ? body.rawMessage : "",
      recipients: Array.isArray(body.recipients) ? body.recipients : [],
      delaySeconds: typeof body.delaySeconds === "number" ? body.delaySeconds : void 0,
      batchSize: typeof body.batchSize === "number" ? body.batchSize : void 0,
      maxRetries: typeof body.maxRetries === "number" ? body.maxRetries : void 0,
      createdByEmail: decoded.email || "admin",
      fallbackVariables: body.fallbackVariables && typeof body.fallbackVariables === "object" ? body.fallbackVariables : void 0
    });
    if (!created.ok) {
      res.status(400).json({
        error: created.error,
        missingVariableErrors: created.missingVariableErrors
      });
      return;
    }
    res.json(created);
  });
  app2.post("/api/admin/wa-center/campaigns/:id/process-batch", async (req, res) => {
    const decoded = await verifyRequestFirebaseToken(req);
    if (!decoded || !isDecodedTokenAdmin(decoded)) {
      res.status(403).json({ error: "Khusus admin terotorisasi." });
      return;
    }
    const result = await processWaCampaignBatch(req.params.id);
    if (!result.ok) {
      res.status(404).json({ error: result.error });
      return;
    }
    res.json(result);
  });
  app2.post("/api/admin/wa-center/campaigns/:id/status", async (req, res) => {
    const decoded = await verifyRequestFirebaseToken(req);
    if (!decoded || !isDecodedTokenAdmin(decoded)) {
      res.status(403).json({ error: "Khusus admin terotorisasi." });
      return;
    }
    const status = req.body?.status === "paused" ? "paused" : "running";
    const updated = setWaCampaignStatus(req.params.id, status);
    if (!updated) {
      res.status(404).json({ error: "Kampanye tidak ditemukan." });
      return;
    }
    res.json({ ok: true, campaign: updated });
  });
  app2.get("/api/admin/wa-center/campaigns/:id/export", async (req, res) => {
    const decoded = await verifyRequestFirebaseToken(req);
    if (!decoded || !isDecodedTokenAdmin(decoded)) {
      res.status(403).json({ error: "Khusus admin terotorisasi." });
      return;
    }
    const exported = exportWaCampaignCsv(req.params.id);
    if (!exported.ok || !exported.csv) {
      res.status(404).json({ error: "Kampanye tidak ditemukan." });
      return;
    }
    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader("Content-Disposition", `attachment; filename="${exported.filename}"`);
    res.send(exported.csv);
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
