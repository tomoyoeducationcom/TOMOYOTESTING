import 'dotenv/config';
import express from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

import {
  ADMIN_WHATSAPP_TARGET,
  FONNTE_SENDER_NUMBER,
  REGISTRATION_WHATSAPP_TARGET,
  buildPaymentDueNotificationMessage,
  buildRegistrationNotificationMessage,
  computeNextMonthlyDueDate,
  getPaymentStatusLabel,
  normalizeWhatsappPhone,
  type PaymentStatus,
} from './src/lib/domain';
import { renderTemplateVariables } from './src/lib/quizAndWaDomain';
import {
  generateRobotsTxt,
  generateSitemapXml,
  injectSeoIntoHtml,
} from './src/lib/seo';
import {
  extractBearerToken,
  isDecodedTokenAdmin,
  verifyRequestFirebaseToken,
  verifyRequestFirebaseTokenDetailed,
} from './src/server/auth';
import {
  addKnowledgeCategory,
  createOrUpdateKnowledgeItem,
  getAdminAiAnalytics,
  getAdminAiOverview,
  getAdminKnowledgeList,
  getAiInstructions,
  getAiSettings,
  getPublicAiSettings,
  processChatbotMessage,
  removeKnowledgeItem,
  updateAiInstructions,
  updateAiSettings,
} from './src/server/aiService';
import {
  checkFonnteDeviceStatus,
  confirmDueReminder,
  isFonnteConfigured,
  listDueReminders,
  processDueRemindersNow,
  sendFonnteWhatsApp,
  upsertDueReminder,
} from './src/server/fonnte';
import {
  deleteAdminQuiz,
  deleteAdminQuizAttempt,
  exportAdminQuizCsv,
  exportAllAdminQuizAttemptsCsv,
  getAdminQuizAttempts,
  getPublicQuizById,
  listAdminQuizzes,
  listAllAdminQuizAttempts,
  listPublicQuizzes,
  startStudentQuizSession,
  submitStudentQuizAttempt,
  upsertAdminQuiz,
} from './src/server/quizService';
import {
  addWaOptOut,
  createWaCampaign,
  deleteWaTemplate,
  exportWaCampaignCsv,
  getWaCenterOverviewStatus,
  getWaSettings,
  listSavedWaGroups,
  listWaTemplates,
  processWaCampaignBatch,
  refreshWaGroupsFromFonnte,
  removeWaOptOut,
  saveWaSettings,
  sendQuizToWaTargets,
  sendWaGroupAnnouncement,
  setWaCampaignStatus,
  updatePinnedWaGroups,
  upsertWaTemplate,
} from './src/server/waCenterService';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function resolveBaseUrl(req?: express.Request): string {
  if (process.env.APP_URL && process.env.APP_URL.startsWith('http')) {
    return process.env.APP_URL.replace(/\/+$/, '');
  }
  if (!req) return 'http://localhost:3000';
  const proto = (req.headers['x-forwarded-proto'] as string) || req.protocol || 'http';
  const host = (req.headers['x-forwarded-host'] as string) || req.get('host') || 'localhost:3000';
  return `${proto}://${host}`;
}

export function createApp() {
  const app = express();
  app.use(express.json({ limit: '1mb' }));

  app.get('/api/health', (_req, res) => {
    res.json({ ok: true, fonnteConfigured: isFonnteConfigured() });
  });

  app.get('/robots.txt', (req, res) => {
    const baseUrl = resolveBaseUrl(req);
    res.type('text/plain').send(generateRobotsTxt(baseUrl));
  });

  app.get('/sitemap.xml', (req, res) => {
    const baseUrl = resolveBaseUrl(req);
    res.type('application/xml').send(generateSitemapXml(baseUrl));
  });

  app.get('/download-apk', (req, res, next) => {
    if (!process.env.VERCEL && process.env.NODE_ENV !== 'production') {
      next();
      return;
    }
    const indexPath = path.resolve(process.cwd(), 'dist', 'index.html');
    if (!fs.existsSync(indexPath)) {
      next();
      return;
    }
    const rawHtml = fs.readFileSync(indexPath, 'utf-8');
    const seoHtml = injectSeoIntoHtml(rawHtml, '/download-apk', resolveBaseUrl(req));
    res.status(200).set({ 'Content-Type': 'text/html; charset=utf-8' }).end(seoHtml);
  });

  app.get('/api/admin/verify', async (req, res) => {
    const { decoded, reason } = await verifyRequestFirebaseTokenDetailed(req);
    if (!decoded) {
      res.status(401).json({
        authorized: false,
        error: reason || 'Token Firebase tidak valid atau belum login.',
      });
      return;
    }

    if (!isDecodedTokenAdmin(decoded)) {
      res.status(403).json({
        authorized: false,
        uid: decoded.uid,
        email: decoded.email || null,
        emailVerified: Boolean(decoded.email_verified),
        error:
          'Akun ini tidak memiliki otorisasi admin. Pastikan login menggunakan akun admin resmi yang terverifikasi pada project tomoyoindramayu.',
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
      registrationTarget: REGISTRATION_WHATSAPP_TARGET,
      whatsappTarget: ADMIN_WHATSAPP_TARGET,
    });
  });

  app.post('/api/notify/registration', async (req, res) => {
    const decoded = await verifyRequestFirebaseToken(req);
    if (!decoded || !decoded.email_verified) {
      res.status(401).json({ error: 'Autentikasi orang tua terverifikasi diperlukan.' });
      return;
    }

    const body = req.body as {
      parentName?: string;
      parentPhone?: string;
      registrations?: Array<{
        registrationId?: string;
        childName?: string;
        childGender?: string;
        gradeLevel?: string;
        packageName?: string;
        branchName?: string;
        billingAmount?: number | null;
        registeredAtIso?: string;
        nextDueAtIso?: string;
      }>;
    };

    const parentName = typeof body.parentName === 'string' ? body.parentName.trim() : '';
    const parentPhone = typeof body.parentPhone === 'string' ? body.parentPhone.trim() : '';
    const items = Array.isArray(body.registrations) ? body.registrations : [];
    if (!parentName || items.length === 0 || items.length > 10) {
      res.status(400).json({ error: 'Data notifikasi pendaftaran tidak valid.' });
      return;
    }

    const baseUrl = resolveBaseUrl(req);
    const results = [];

    for (const item of items) {
      const registrationId =
        typeof item.registrationId === 'string' ? item.registrationId.trim() : '';
      const childName = typeof item.childName === 'string' ? item.childName.trim() : '';
      const childGender = typeof item.childGender === 'string' ? item.childGender.trim() : '';
      const gradeLevel = typeof item.gradeLevel === 'string' ? item.gradeLevel.trim() : '';
      const packageName = typeof item.packageName === 'string' ? item.packageName.trim() : '';
      const branchName = typeof item.branchName === 'string' ? item.branchName.trim() : '';

      if (!registrationId || !childName || !gradeLevel || !packageName || !branchName) {
        results.push({
          registrationId: registrationId || 'unknown',
          status: 'failed' as const,
          target: REGISTRATION_WHATSAPP_TARGET,
          detail: 'Payload anak tidak lengkap.',
          messagePreview: '',
        });
        continue;
      }

      const registeredAtIso = item.registeredAtIso || new Date().toISOString();
      const nextDueAtIso =
        item.nextDueAtIso || computeNextMonthlyDueDate(new Date(registeredAtIso)).toISOString();

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
        billingAmount: typeof item.billingAmount === 'number' ? item.billingAmount : null,
      });

      const message = buildRegistrationNotificationMessage({
        parentName,
        parentPhone,
        childName,
        childGender: childGender || undefined,
        gradeLevel,
        packageName,
        branchName,
        billingAmount: typeof item.billingAmount === 'number' ? item.billingAmount : null,
        nextDueAtIso,
        channel: 'online',
        appUrl: baseUrl,
      });

      const delivery = await sendFonnteWhatsApp({
        target: REGISTRATION_WHATSAPP_TARGET,
        message,
        idempotencyKey: `reg_${decoded.uid}_${registrationId}`,
      });

      results.push({
        registrationId,
        status: delivery.status,
        target: delivery.target,
        detail: delivery.detail,
        messagePreview: message.slice(0, 480),
      });
    }

    res.json({ results });
  });

  app.post('/api/admin/notify/offline-registration', async (req, res) => {
    const decoded = await verifyRequestFirebaseToken(req);
    if (!decoded || !isDecodedTokenAdmin(decoded)) {
      res.status(403).json({ error: 'Khusus admin terotorisasi.' });
      return;
    }

    const body = req.body as {
      registrationId?: string;
      parentId?: string;
      parentName?: string;
      parentPhone?: string;
      childName?: string;
      childGender?: string;
      gradeLevel?: string;
      packageName?: string;
      branchName?: string;
      billingAmount?: number | null;
      initialPaymentStatus?: PaymentStatus;
      registeredAtIso?: string;
      nextDueAtIso?: string;
      channel?: 'offline' | 'migration';
    };

    const registrationId = (body.registrationId || '').trim();
    const childName = (body.childName || '').trim();
    const parentName = (body.parentName || '').trim();
    const parentPhone = (body.parentPhone || '').trim();
    const gradeLevel = (body.gradeLevel || '').trim();
    const packageName = (body.packageName || '').trim();
    const branchName = (body.branchName || '').trim();

    if (!registrationId || !childName || !parentName || !parentPhone || !packageName || !branchName) {
      res.status(400).json({ error: 'Payload pendaftaran offline tidak lengkap.' });
      return;
    }

    const baseUrl = resolveBaseUrl(req);
    const registeredAtIso = body.registeredAtIso || new Date().toISOString();
    const nextDueAtIso =
      body.nextDueAtIso || computeNextMonthlyDueDate(new Date(registeredAtIso)).toISOString();

    upsertDueReminder({
      studentId: registrationId,
      parentId: body.parentId || 'offline_admin',
      childName,
      parentName,
      parentPhone,
      packageName,
      branchName,
      registeredAtIso,
      dueAtIso: nextDueAtIso,
      billingAmount: typeof body.billingAmount === 'number' ? body.billingAmount : null,
    });

    const channel = body.channel === 'migration' ? 'migration' : 'offline';

    const message = buildRegistrationNotificationMessage({
      parentName,
      parentPhone,
      childName,
      childGender: body.childGender,
      gradeLevel,
      packageName,
      branchName,
      billingAmount: typeof body.billingAmount === 'number' ? body.billingAmount : null,
      nextDueAtIso,
      channel,
      paymentStatusLabel: body.initialPaymentStatus
        ? getPaymentStatusLabel(body.initialPaymentStatus)
        : undefined,
      appUrl: baseUrl,
    });

    const delivery = await sendFonnteWhatsApp({
      target: REGISTRATION_WHATSAPP_TARGET,
      message,
      idempotencyKey: `offline_reg_${registrationId}`,
    });

    // Also process immediately in case admin entered a backdated registration whose 1-month due date already arrived
    const dueTriggered = await processDueRemindersNow(baseUrl);

    res.json({
      registrationId,
      status: delivery.status,
      target: delivery.target,
      detail: delivery.detail,
      messagePreview: message.slice(0, 480),
      dueTriggered,
    });
  });

  app.post('/api/admin/due-reminders/sync', async (req, res) => {
    const decoded = await verifyRequestFirebaseToken(req);
    if (!decoded || !isDecodedTokenAdmin(decoded)) {
      res.status(403).json({ error: 'Khusus admin terotorisasi.' });
      return;
    }

    const body = req.body as {
      students?: Array<{
        id: string;
        parentId: string;
        childName: string;
        parentName: string;
        parentPhone: string;
        packageName: string;
        branchName: string;
        status: string;
        registeredAtIso?: string;
        nextDueAtIso?: string;
        dueConfirmedIso?: string;
        lastDueNotifiedIso?: string;
        billingAmount?: number;
      }>;
    };

    const students = Array.isArray(body.students) ? body.students : [];
    for (const s of students) {
      if (!s.id || s.status === 'rejected' || !s.nextDueAtIso) continue;
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
        billingAmount: typeof s.billingAmount === 'number' ? s.billingAmount : null,
        confirmedIso: s.dueConfirmedIso,
        notifiedIso: s.lastDueNotifiedIso,
      });
    }

    const baseUrl = resolveBaseUrl(req);
    const triggered = await processDueRemindersNow(baseUrl);
    res.json({
      triggered,
      reminders: listDueReminders(),
      fonnteConfigured: isFonnteConfigured(),
    });
  });

  app.post('/api/admin/due-reminders/send-now', async (req, res) => {
    const decoded = await verifyRequestFirebaseToken(req);
    if (!decoded || !isDecodedTokenAdmin(decoded)) {
      res.status(403).json({ error: 'Khusus admin terotorisasi.' });
      return;
    }

    const body = req.body as {
      studentId?: string;
      childName?: string;
      parentName?: string;
      parentPhone?: string;
      packageName?: string;
      branchName?: string;
      registeredAtIso?: string;
      dueAtIso?: string;
      billingAmount?: number | null;
      sendToParent?: boolean;
    };

    if (!body.studentId || !body.childName || !body.parentName || !body.dueAtIso) {
      res.status(400).json({ error: 'Data pengingat jatuh tempo tidak lengkap.' });
      return;
    }

    const baseUrl = resolveBaseUrl(req);
    const message = buildPaymentDueNotificationMessage({
      childName: body.childName,
      parentName: body.parentName,
      parentPhone: body.parentPhone || '-',
      packageName: body.packageName || '-',
      branchName: body.branchName || '-',
      registeredAtIso: body.registeredAtIso,
      dueAtIso: body.dueAtIso,
      billingAmount: typeof body.billingAmount === 'number' ? body.billingAmount : null,
      appUrl: baseUrl,
    });

    const target =
      body.sendToParent && body.parentPhone
        ? normalizeWhatsappPhone(body.parentPhone)
        : ADMIN_WHATSAPP_TARGET;

    const delivery = await sendFonnteWhatsApp({
      message,
      target,
    });

    res.json({
      ...delivery,
      messagePreview: message.slice(0, 480),
    });
  });

  app.post('/api/admin/due-reminders/confirm', async (req, res) => {
    const decoded = await verifyRequestFirebaseToken(req);
    if (!decoded || !isDecodedTokenAdmin(decoded)) {
      res.status(403).json({ error: 'Khusus admin terotorisasi.' });
      return;
    }

    const body = req.body as {
      studentId?: string;
      nextDueAtIso?: string;
      confirmedAtIso?: string;
    };
    if (!body.studentId || !body.nextDueAtIso) {
      res.status(400).json({ error: 'studentId dan nextDueAtIso wajib dikirim.' });
      return;
    }
    const updated = confirmDueReminder(
      body.studentId,
      body.nextDueAtIso,
      body.confirmedAtIso || new Date().toISOString()
    );
    res.json({ ok: true, reminder: updated });
  });

  app.post('/api/admin/test-whatsapp', async (req, res) => {
    const decoded = await verifyRequestFirebaseToken(req);
    if (!decoded) {
      res.status(401).json({ error: 'Token Firebase tidak valid.' });
      return;
    }
    if (!isDecodedTokenAdmin(decoded)) {
      res.status(403).json({ error: 'Akses ditolak. Khusus akun admin terotorisasi.' });
      return;
    }

    const baseUrl = resolveBaseUrl(req);
    const body = (req.body || {}) as { target?: string };
    const customTarget = typeof body.target === 'string' && body.target.trim()
      ? (body.target.trim().endsWith('@g.us') ? body.target.trim() : normalizeWhatsappPhone(body.target.trim()))
      : ADMIN_WHATSAPP_TARGET;
    const nowLabel = new Date().toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' });
    const message = [
      '✅ UJI NOTIFIKASI WHATSAPP — TOMOYO EDUCATION',
      '',
      `Pengirim Admin: ${decoded.email}`,
      `Nomor Device Fonnte: +${FONNTE_SENDER_NUMBER}`,
      `Waktu Uji: ${nowLabel} WIB`,
      `Dashboard Admin: ${baseUrl}/admintomoyo`,
      '',
      'Integrasi backend Fonnte aktif dan siap menerima notifikasi pendaftaran siswa baru, kuis online, maupun siaran pesan.',
    ].join('\n');

    const delivery = await sendFonnteWhatsApp({ target: customTarget, message });
    res.json({
      ...delivery,
      messagePreview: message.slice(0, 480),
    });
  });

  app.get('/api/admin/fonnte/device', async (req, res) => {
    const decoded = await verifyRequestFirebaseToken(req);
    if (!decoded) {
      res.status(401).json({ error: 'Token Firebase tidak valid.' });
      return;
    }
    if (!isDecodedTokenAdmin(decoded)) {
      res.status(403).json({ error: 'Akses ditolak. Khusus akun admin terotorisasi.' });
      return;
    }
    const status = await checkFonnteDeviceStatus();
    res.json(status);
  });

  // ============================================================================
  // PUBLIC ONLINE QUIZ ROUTES (NO LOGIN REQUIRED — KEYS NEVER EXPOSED)
  // ============================================================================

  app.get('/api/quizzes', async (_req, res) => {
    res.setHeader('Cache-Control', 'no-store');
    res.json({ quizzes: await listPublicQuizzes() });
  });

  app.get('/api/quizzes/:quizId', async (req, res) => {
    res.setHeader('Cache-Control', 'no-store');
    const data = await getPublicQuizById(req.params.quizId);
    if (!data.quiz) {
      res.status(404).json({ error: 'Kuis tidak ditemukan atau belum diterbitkan.' });
      return;
    }
    res.json(data);
  });

  app.post('/api/quizzes/:quizId/start', async (req, res) => {
    const body = (req.body || {}) as {
      studentName?: string;
      studentClass?: string;
      parentWhatsapp?: string;
    };
    const started = await startStudentQuizSession({
      quizId: req.params.quizId,
      studentName: typeof body.studentName === 'string' ? body.studentName : '',
      studentClass: typeof body.studentClass === 'string' ? body.studentClass : '',
      parentWhatsapp: typeof body.parentWhatsapp === 'string' ? body.parentWhatsapp : undefined,
    });
    if (!started.ok) {
      res.status(400).json({ error: started.error || 'Gagal memulai kuis.' });
      return;
    }
    res.json(started);
  });

  app.post('/api/quizzes/:quizId/submit', async (req, res) => {
    const body = (req.body || {}) as {
      sessionToken?: string;
      studentName?: string;
      studentClass?: string;
      parentWhatsapp?: string;
      answers?: Record<string, string>;
    };
    const outcome = await submitStudentQuizAttempt({
      quizId: req.params.quizId,
      sessionToken: body.sessionToken,
      studentName: typeof body.studentName === 'string' ? body.studentName : '',
      studentClass: typeof body.studentClass === 'string' ? body.studentClass : '',
      parentWhatsapp: typeof body.parentWhatsapp === 'string' ? body.parentWhatsapp : undefined,
      answers: body.answers && typeof body.answers === 'object' ? body.answers : {},
    });
    if (!outcome.ok) {
      res.status(400).json({ error: outcome.error || 'Gagal mengirim jawaban kuis.' });
      return;
    }
    res.json(outcome);
  });

  // ============================================================================
  // ADMIN QUIZ MANAGEMENT ROUTES
  // ============================================================================

  app.post('/api/admin/quizzes/:quizId/send-wa', async (req, res) => {
    const decoded = await verifyRequestFirebaseToken(req);
    if (!decoded || !isDecodedTokenAdmin(decoded)) {
      res.status(403).json({ error: 'Khusus admin terotorisasi.' });
      return;
    }

    const body = (req.body || {}) as {
      title?: string;
      targetClass?: string;
      questionCount?: number;
      timeLimitMinutes?: number;
      groupIds?: string[];
      singlePhone?: string;
      message?: string;
    };

    const result = await sendQuizToWaTargets({
      quizId: req.params.quizId,
      title: typeof body.title === 'string' ? body.title : 'Kuis Online TOMOYO',
      targetClass: typeof body.targetClass === 'string' ? body.targetClass : undefined,
      questionCount: typeof body.questionCount === 'number' ? body.questionCount : undefined,
      timeLimitMinutes:
        typeof body.timeLimitMinutes === 'number' ? body.timeLimitMinutes : undefined,
      groupIds: Array.isArray(body.groupIds) ? body.groupIds.map((g) => String(g)) : [],
      singlePhone: typeof body.singlePhone === 'string' ? body.singlePhone : undefined,
      message: typeof body.message === 'string' ? body.message : undefined,
      baseUrl: resolveBaseUrl(req),
      sentByEmail: decoded.email || 'admin',
    });

    if (!result.ok) {
      res.status(400).json({ error: result.error || 'Target pengiriman WhatsApp tidak valid.' });
      return;
    }

    res.json(result);
  });

  app.post('/api/admin/quizzes/:quizId/notify', async (req, res) => {
    const decoded = await verifyRequestFirebaseToken(req);
    if (!decoded || !isDecodedTokenAdmin(decoded)) {
      res.status(403).json({ error: 'Khusus admin terotorisasi.' });
      return;
    }

    const body = (req.body || {}) as {
      title?: string;
      targetClass?: string;
      notifyTarget?: string;
    };
    const notifyTarget = typeof body.notifyTarget === 'string' ? body.notifyTarget.trim() : '';
    const title = typeof body.title === 'string' ? body.title.trim() : '';
    const targetClass = typeof body.targetClass === 'string' ? body.targetClass.trim() : 'Semua Tingkat';
    if (!notifyTarget || !title) {
      res.status(400).json({ error: 'Target WhatsApp dan judul kuis wajib diisi.' });
      return;
    }

    const baseUrl = resolveBaseUrl(req);
    const quizUrl = `${baseUrl}/kuis/${req.params.quizId}`;
    const rawMsg = `Kuis Online baru tersedia: *${title}* (${targetClass}). Kerjakan langsung di ${quizUrl}`;
    const target = notifyTarget.endsWith('@g.us')
      ? notifyTarget
      : normalizeWhatsappPhone(notifyTarget);
    const autoDispatch = target
      ? await sendFonnteWhatsApp({
          target,
          message: rawMsg,
        })
      : null;

    res.json({ ok: true, autoDispatch });
  });

  app.get('/api/admin/quizzes', async (req, res) => {
    res.setHeader('Cache-Control', 'no-store');
    const decoded = await verifyRequestFirebaseToken(req);
    if (!decoded || !isDecodedTokenAdmin(decoded)) {
      res.status(403).json({ error: 'Khusus admin terotorisasi.' });
      return;
    }
    res.json({ quizzes: listAdminQuizzes() });
  });

  app.post('/api/admin/quizzes', async (req, res) => {
    const decoded = await verifyRequestFirebaseToken(req);
    if (!decoded || !isDecodedTokenAdmin(decoded)) {
      res.status(403).json({ error: 'Khusus admin terotorisasi.' });
      return;
    }
    const saved = upsertAdminQuiz(req.body || {});
    if (!saved.ok || !saved.quiz) {
      res.status(400).json({
        error: saved.errors?.join(' ') || 'Data kuis tidak valid.',
        errors: saved.errors,
      });
      return;
    }

    // Optional automatic notification if turned ON and quiz just published with a notification target
    const settings = getWaSettings();
    let autoDispatch: unknown = null;
    if (
      settings.autoNotifyQuizPublished &&
      saved.quiz.status === 'published' &&
      req.body?.notifyTarget
    ) {
      const templates = listWaTemplates();
      const tpl = templates.find((t) => t.id === settings.autoQuizTemplateId);
      const baseUrl = resolveBaseUrl(req);
      const rawMsg =
        tpl?.content ||
        `Kuis Online baru tersedia: *${saved.quiz.title}* (${saved.quiz.targetClass}). Kerjakan di ${baseUrl}/kuis/${saved.quiz.id}`;
      const rendered = renderTemplateVariables(rawMsg, {
        nama_siswa: 'Siswa-siswi TOMOYO',
        nama_orang_tua: 'Bapak/Ibu',
        kelas: saved.quiz.targetClass,
        nama_program: saved.quiz.title,
        jadwal: `${baseUrl}/kuis/${saved.quiz.id}`,
      });
      const targetStr = String(req.body.notifyTarget).trim();
      const target = targetStr.endsWith('@g.us') ? targetStr : normalizeWhatsappPhone(targetStr);
      if (target) {
        autoDispatch = await sendFonnteWhatsApp({
          target,
          message: rendered.rendered,
        });
      }
    }

    res.json({ ok: true, quiz: saved.quiz, autoDispatch });
  });

  app.delete('/api/admin/quizzes/:quizId', async (req, res) => {
    const decoded = await verifyRequestFirebaseToken(req);
    if (!decoded || !isDecodedTokenAdmin(decoded)) {
      res.status(403).json({ error: 'Khusus admin terotorisasi.' });
      return;
    }
    const deleted = deleteAdminQuiz(req.params.quizId);
    if (!deleted) {
      res.status(404).json({ error: 'Kuis tidak ditemukan.' });
      return;
    }
    res.json({ ok: true });
  });

  app.get('/api/admin/quizzes/:quizId/attempts', async (req, res) => {
    const decoded = await verifyRequestFirebaseToken(req);
    if (!decoded || !isDecodedTokenAdmin(decoded)) {
      res.status(403).json({ error: 'Khusus admin terotorisasi.' });
      return;
    }
    const data = getAdminQuizAttempts(req.params.quizId);
    if (!data.quiz) {
      res.status(404).json({ error: 'Kuis tidak ditemukan.' });
      return;
    }
    res.json(data);
  });

  app.get('/api/admin/quizzes/:quizId/export', async (req, res) => {
    const decoded = await verifyRequestFirebaseToken(req);
    if (!decoded || !isDecodedTokenAdmin(decoded)) {
      res.status(403).json({ error: 'Khusus admin terotorisasi.' });
      return;
    }
    const exported = exportAdminQuizCsv(req.params.quizId);
    if (!exported.ok || !exported.csv) {
      res.status(404).json({ error: 'Kuis tidak ditemukan.' });
      return;
    }
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${exported.filename}"`);
    res.send(exported.csv);
  });

  app.get('/api/admin/quiz-attempts', async (req, res) => {
    res.setHeader('Cache-Control', 'no-store');
    const decoded = await verifyRequestFirebaseToken(req);
    if (!decoded || !isDecodedTokenAdmin(decoded)) {
      res.status(403).json({ error: 'Khusus admin terotorisasi.' });
      return;
    }
    res.json({ attempts: listAllAdminQuizAttempts() });
  });

  app.get('/api/admin/quiz-attempts/export', async (req, res) => {
    const decoded = await verifyRequestFirebaseToken(req);
    if (!decoded || !isDecodedTokenAdmin(decoded)) {
      res.status(403).json({ error: 'Khusus admin terotorisasi.' });
      return;
    }
    const exported = exportAllAdminQuizAttemptsCsv({
      quizId: typeof req.query.quizId === 'string' ? req.query.quizId : undefined,
      studentClass: typeof req.query.studentClass === 'string' ? req.query.studentClass : undefined,
      search: typeof req.query.search === 'string' ? req.query.search : undefined,
    });
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${exported.filename}"`);
    res.send(exported.csv);
  });

  app.delete('/api/admin/quiz-attempts/:attemptId', async (req, res) => {
    const decoded = await verifyRequestFirebaseToken(req);
    if (!decoded || !isDecodedTokenAdmin(decoded)) {
      res.status(403).json({ error: 'Khusus admin terotorisasi.' });
      return;
    }
    const deleted = deleteAdminQuizAttempt(req.params.attemptId);
    if (!deleted) {
      res.status(404).json({ error: 'Data hasil kuis tidak ditemukan.' });
      return;
    }
    res.json({ ok: true });
  });

  // ============================================================================
  // ADMIN WHATSAPP GROUP ROUTES (FONNTE)
  // ============================================================================

  app.get('/api/admin/wa-groups', async (req, res) => {
    const decoded = await verifyRequestFirebaseToken(req);
    if (!decoded || !isDecodedTokenAdmin(decoded)) {
      res.status(403).json({ error: 'Khusus admin terotorisasi.' });
      return;
    }
    res.json({
      fonnteConfigured: isFonnteConfigured(),
      senderNumber: FONNTE_SENDER_NUMBER,
      ...listSavedWaGroups(),
    });
  });

  app.post('/api/admin/wa-groups/sync', async (req, res) => {
    const decoded = await verifyRequestFirebaseToken(req);
    if (!decoded || !isDecodedTokenAdmin(decoded)) {
      res.status(403).json({ error: 'Khusus admin terotorisasi.' });
      return;
    }
    const triggerFetchGroup = Boolean(req.body?.triggerFetchGroup);
    const result = await refreshWaGroupsFromFonnte(triggerFetchGroup);
    res.json(result);
  });

  app.post('/api/admin/wa-groups/pinned', async (req, res) => {
    const decoded = await verifyRequestFirebaseToken(req);
    if (!decoded || !isDecodedTokenAdmin(decoded)) {
      res.status(403).json({ error: 'Khusus admin terotorisasi.' });
      return;
    }
    const pinnedIds = Array.isArray(req.body?.pinnedIds)
      ? req.body.pinnedIds.map((id: unknown) => String(id))
      : [];
    const groups = updatePinnedWaGroups(pinnedIds);
    res.json({ ok: true, groups });
  });

  app.post('/api/admin/wa-groups/send', async (req, res) => {
    const decoded = await verifyRequestFirebaseToken(req);
    if (!decoded || !isDecodedTokenAdmin(decoded)) {
      res.status(403).json({ error: 'Khusus admin terotorisasi.' });
      return;
    }
    const body = (req.body || {}) as {
      groupIds?: string[];
      message?: string;
      requestId?: string;
    };
    const result = await sendWaGroupAnnouncement({
      groupIds: Array.isArray(body.groupIds) ? body.groupIds : [],
      message: typeof body.message === 'string' ? body.message : '',
      sentByEmail: decoded.email || 'admin',
      requestId: typeof body.requestId === 'string' ? body.requestId : undefined,
    });
    if (!result.ok) {
      res.status(400).json({ error: result.error || 'Gagal mengirim pesan grup.' });
      return;
    }
    res.json(result);
  });

  // ============================================================================
  // ADMIN WHATSAPP CENTER ROUTES (TEMPLATES, CAMPAIGNS, QUEUE, SETTINGS)
  // ============================================================================

  app.get('/api/admin/wa-center/overview', async (req, res) => {
    const decoded = await verifyRequestFirebaseToken(req);
    if (!decoded || !isDecodedTokenAdmin(decoded)) {
      res.status(403).json({ error: 'Khusus admin terotorisasi.' });
      return;
    }
    const overview = await getWaCenterOverviewStatus();
    res.json({
      senderNumber: FONNTE_SENDER_NUMBER,
      adminTarget: ADMIN_WHATSAPP_TARGET,
      ...overview,
    });
  });

  app.post('/api/admin/wa-center/templates', async (req, res) => {
    const decoded = await verifyRequestFirebaseToken(req);
    if (!decoded || !isDecodedTokenAdmin(decoded)) {
      res.status(403).json({ error: 'Khusus admin terotorisasi.' });
      return;
    }
    const result = upsertWaTemplate({
      id: typeof req.body?.id === 'string' ? req.body.id : undefined,
      name: typeof req.body?.name === 'string' ? req.body.name : '',
      category: typeof req.body?.category === 'string' ? req.body.category : '',
      content: typeof req.body?.content === 'string' ? req.body.content : '',
      isEnabled: typeof req.body?.isEnabled === 'boolean' ? req.body.isEnabled : undefined,
    });
    if (!result.ok) {
      res.status(400).json({ error: result.error });
      return;
    }
    res.json({ ok: true, template: result.template, templates: listWaTemplates() });
  });

  app.delete('/api/admin/wa-center/templates/:id', async (req, res) => {
    const decoded = await verifyRequestFirebaseToken(req);
    if (!decoded || !isDecodedTokenAdmin(decoded)) {
      res.status(403).json({ error: 'Khusus admin terotorisasi.' });
      return;
    }
    const deleted = deleteWaTemplate(req.params.id);
    if (!deleted) {
      res.status(404).json({ error: 'Template tidak ditemukan.' });
      return;
    }
    res.json({ ok: true, templates: listWaTemplates() });
  });

  app.post('/api/admin/wa-center/optouts', async (req, res) => {
    const decoded = await verifyRequestFirebaseToken(req);
    if (!decoded || !isDecodedTokenAdmin(decoded)) {
      res.status(403).json({ error: 'Khusus admin terotorisasi.' });
      return;
    }
    const phone = typeof req.body?.phone === 'string' ? req.body.phone : '';
    const reason = typeof req.body?.reason === 'string' ? req.body.reason : undefined;
    if (!phone.trim()) {
      res.status(400).json({ error: 'Nomor WhatsApp opt-out wajib diisi.' });
      return;
    }
    const optOuts = addWaOptOut(phone, reason);
    res.json({ ok: true, optOuts });
  });

  app.delete('/api/admin/wa-center/optouts/:phone', async (req, res) => {
    const decoded = await verifyRequestFirebaseToken(req);
    if (!decoded || !isDecodedTokenAdmin(decoded)) {
      res.status(403).json({ error: 'Khusus admin terotorisasi.' });
      return;
    }
    const optOuts = removeWaOptOut(req.params.phone);
    res.json({ ok: true, optOuts });
  });

  app.post('/api/admin/wa-center/settings', async (req, res) => {
    const decoded = await verifyRequestFirebaseToken(req);
    if (!decoded || !isDecodedTokenAdmin(decoded)) {
      res.status(403).json({ error: 'Khusus admin terotorisasi.' });
      return;
    }
    const settings = saveWaSettings(req.body || {});
    res.json({ ok: true, settings });
  });

  app.post('/api/admin/wa-center/campaigns', async (req, res) => {
    const decoded = await verifyRequestFirebaseToken(req);
    if (!decoded || !isDecodedTokenAdmin(decoded)) {
      res.status(403).json({ error: 'Khusus admin terotorisasi.' });
      return;
    }
    const body = req.body || {};
    const created = createWaCampaign({
      title: typeof body.title === 'string' ? body.title : '',
      templateId: typeof body.templateId === 'string' ? body.templateId : undefined,
      templateName: typeof body.templateName === 'string' ? body.templateName : undefined,
      rawMessage: typeof body.rawMessage === 'string' ? body.rawMessage : '',
      recipients: Array.isArray(body.recipients) ? body.recipients : [],
      delaySeconds: typeof body.delaySeconds === 'number' ? body.delaySeconds : undefined,
      batchSize: typeof body.batchSize === 'number' ? body.batchSize : undefined,
      maxRetries: typeof body.maxRetries === 'number' ? body.maxRetries : undefined,
      createdByEmail: decoded.email || 'admin',
      fallbackVariables:
        body.fallbackVariables && typeof body.fallbackVariables === 'object'
          ? body.fallbackVariables
          : undefined,
    });
    if (!created.ok) {
      res.status(400).json({
        error: created.error,
        missingVariableErrors: created.missingVariableErrors,
      });
      return;
    }
    res.json(created);
  });

  app.post('/api/admin/wa-center/campaigns/:id/process-batch', async (req, res) => {
    const decoded = await verifyRequestFirebaseToken(req);
    if (!decoded || !isDecodedTokenAdmin(decoded)) {
      res.status(403).json({ error: 'Khusus admin terotorisasi.' });
      return;
    }
    const result = await processWaCampaignBatch(req.params.id);
    if (!result.ok) {
      res.status(404).json({ error: result.error });
      return;
    }
    res.json(result);
  });

  app.post('/api/admin/wa-center/campaigns/:id/status', async (req, res) => {
    const decoded = await verifyRequestFirebaseToken(req);
    if (!decoded || !isDecodedTokenAdmin(decoded)) {
      res.status(403).json({ error: 'Khusus admin terotorisasi.' });
      return;
    }
    const status = req.body?.status === 'paused' ? 'paused' : 'running';
    const updated = setWaCampaignStatus(req.params.id, status);
    if (!updated) {
      res.status(404).json({ error: 'Kampanye tidak ditemukan.' });
      return;
    }
    res.json({ ok: true, campaign: updated });
  });

  app.get('/api/admin/wa-center/campaigns/:id/export', async (req, res) => {
    const decoded = await verifyRequestFirebaseToken(req);
    if (!decoded || !isDecodedTokenAdmin(decoded)) {
      res.status(403).json({ error: 'Khusus admin terotorisasi.' });
      return;
    }
    const exported = exportWaCampaignCsv(req.params.id);
    if (!exported.ok || !exported.csv) {
      res.status(404).json({ error: 'Kampanye tidak ditemukan.' });
      return;
    }
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${exported.filename}"`);
    res.send(exported.csv);
  });

  // ============================================================================
  // TOMOYO ASISTEN (AI ASSISTANT) PUBLIC & ADMIN ROUTES
  // ============================================================================

  app.get('/api/ai/settings', async (_req, res) => {
    res.setHeader('Cache-Control', 'no-store');
    try {
      const settings = await getPublicAiSettings();
      res.json(settings);
    } catch {
      res.status(500).json({ error: 'Gagal memuat konfigurasi TOMOYO ASISTEN.' });
    }
  });

  const handleAiChatRequest = async (req: express.Request, res: express.Response) => {
    res.setHeader('Cache-Control', 'no-store');
    const decoded = await verifyRequestFirebaseToken(req);
    const verifiedAdmin = Boolean(decoded && isDecodedTokenAdmin(decoded));
    const adminIdToken = verifiedAdmin ? extractBearerToken(req) || undefined : undefined;

    const body = (req.body || {}) as {
      sessionId?: unknown;
      message?: unknown;
      history?: unknown;
      mode?: unknown;
    };

    // Admin can explicitly test public mode via mode: 'public'; non-admin can NEVER escalate to admin.
    const isAdmin = verifiedAdmin && body.mode !== 'public';

    const sessionId =
      typeof body.sessionId === 'string' && body.sessionId.trim()
        ? body.sessionId.trim().slice(0, 80)
        : `sess_${Date.now()}`;
    const message = typeof body.message === 'string' ? body.message : '';
    const history = Array.isArray(body.history)
      ? body.history
          .filter(
            (item): item is { role: 'user' | 'assistant'; content: string } =>
              Boolean(item) &&
              typeof item === 'object' &&
              ((item as { role?: unknown }).role === 'user' ||
                (item as { role?: unknown }).role === 'assistant') &&
              typeof (item as { content?: unknown }).content === 'string'
          )
          .slice(-12)
      : [];

    const forwardedFor = req.headers['x-forwarded-for'];
    const clientIp =
      (Array.isArray(forwardedFor) ? forwardedFor[0] : forwardedFor || '')
        .split(',')[0]
        .trim() ||
      req.ip ||
      'unknown';

    const result = await processChatbotMessage({
      sessionId,
      clientIp,
      message,
      history,
      isAdmin,
      adminIdToken,
    });

    res.status(result.statusCode).json(result);
  };

  app.post('/api/ai/chat', handleAiChatRequest);
  app.post('/api/responses', handleAiChatRequest);

  app.get('/api/admin/ai/overview', async (req, res) => {
    res.setHeader('Cache-Control', 'no-store');
    const decoded = await verifyRequestFirebaseToken(req);
    if (!decoded || !isDecodedTokenAdmin(decoded)) {
      res.status(403).json({ error: 'Khusus admin terotorisasi.' });
      return;
    }
    const idToken = extractBearerToken(req) || undefined;
    const overview = await getAdminAiOverview(idToken);
    res.json(overview);
  });

  app.get('/api/admin/ai/knowledge', async (req, res) => {
    res.setHeader('Cache-Control', 'no-store');
    const decoded = await verifyRequestFirebaseToken(req);
    if (!decoded || !isDecodedTokenAdmin(decoded)) {
      res.status(403).json({ error: 'Khusus admin terotorisasi.' });
      return;
    }
    const idToken = extractBearerToken(req) || undefined;
    const data = await getAdminKnowledgeList(idToken);
    res.json(data);
  });

  app.post('/api/admin/ai/knowledge', async (req, res) => {
    const decoded = await verifyRequestFirebaseToken(req);
    if (!decoded || !isDecodedTokenAdmin(decoded)) {
      res.status(403).json({ error: 'Khusus admin terotorisasi.' });
      return;
    }
    const idToken = extractBearerToken(req) || undefined;
    const body = (req.body || {}) as {
      id?: string;
      title?: unknown;
      category?: unknown;
      content?: unknown;
      isActive?: unknown;
    };
    const saved = await createOrUpdateKnowledgeItem({
      id: typeof body.id === 'string' ? body.id : undefined,
      title: body.title,
      category: body.category,
      content: body.content,
      isActive: body.isActive,
      idToken,
    });
    if (!saved.ok) {
      res.status(400).json({ error: saved.errors?.join(' ') || 'Data materi tidak valid.', errors: saved.errors });
      return;
    }
    res.json({ ok: true, item: saved.item, categories: saved.categories });
  });

  app.post('/api/admin/ai/knowledge/categories', async (req, res) => {
    const decoded = await verifyRequestFirebaseToken(req);
    if (!decoded || !isDecodedTokenAdmin(decoded)) {
      res.status(403).json({ error: 'Khusus admin terotorisasi.' });
      return;
    }
    const name = typeof req.body?.name === 'string' ? req.body.name.trim() : '';
    if (name.length < 2 || name.length > 80) {
      res.status(400).json({ error: 'Nama kategori wajib 2–80 karakter.' });
      return;
    }
    const categories = addKnowledgeCategory(name);
    res.json({ ok: true, categories });
  });

  app.put('/api/admin/ai/knowledge/:id', async (req, res) => {
    const decoded = await verifyRequestFirebaseToken(req);
    if (!decoded || !isDecodedTokenAdmin(decoded)) {
      res.status(403).json({ error: 'Khusus admin terotorisasi.' });
      return;
    }
    const idToken = extractBearerToken(req) || undefined;
    const body = (req.body || {}) as {
      title?: unknown;
      category?: unknown;
      content?: unknown;
      isActive?: unknown;
    };
    const saved = await createOrUpdateKnowledgeItem({
      id: req.params.id,
      title: body.title,
      category: body.category,
      content: body.content,
      isActive: body.isActive,
      idToken,
    });
    if (!saved.ok) {
      res.status(400).json({ error: saved.errors?.join(' ') || 'Data materi tidak valid.', errors: saved.errors });
      return;
    }
    res.json({ ok: true, item: saved.item, categories: saved.categories });
  });

  app.delete('/api/admin/ai/knowledge/:id', async (req, res) => {
    const decoded = await verifyRequestFirebaseToken(req);
    if (!decoded || !isDecodedTokenAdmin(decoded)) {
      res.status(403).json({ error: 'Khusus admin terotorisasi.' });
      return;
    }
    const idToken = extractBearerToken(req) || undefined;
    const removed = await removeKnowledgeItem({ id: req.params.id, idToken });
    if (!removed.ok) {
      res.status(404).json({ error: 'Materi Knowledge Center tidak ditemukan.' });
      return;
    }
    res.json({ ok: true });
  });

  app.get('/api/admin/ai/instructions', async (req, res) => {
    res.setHeader('Cache-Control', 'no-store');
    const decoded = await verifyRequestFirebaseToken(req);
    if (!decoded || !isDecodedTokenAdmin(decoded)) {
      res.status(403).json({ error: 'Khusus admin terotorisasi.' });
      return;
    }
    const idToken = extractBearerToken(req) || undefined;
    const instructions = await getAiInstructions(idToken);
    res.json({ instructions });
  });

  app.put('/api/admin/ai/instructions', async (req, res) => {
    const decoded = await verifyRequestFirebaseToken(req);
    if (!decoded || !isDecodedTokenAdmin(decoded)) {
      res.status(403).json({ error: 'Khusus admin terotorisasi.' });
      return;
    }
    const idToken = extractBearerToken(req) || undefined;
    const instructions = await updateAiInstructions(req.body || {}, idToken);
    res.json({ ok: true, instructions });
  });

  app.get('/api/admin/ai/settings', async (req, res) => {
    res.setHeader('Cache-Control', 'no-store');
    const decoded = await verifyRequestFirebaseToken(req);
    if (!decoded || !isDecodedTokenAdmin(decoded)) {
      res.status(403).json({ error: 'Khusus admin terotorisasi.' });
      return;
    }
    const settings = await getAiSettings(true);
    res.json({ settings });
  });

  app.put('/api/admin/ai/settings', async (req, res) => {
    const decoded = await verifyRequestFirebaseToken(req);
    if (!decoded || !isDecodedTokenAdmin(decoded)) {
      res.status(403).json({ error: 'Khusus admin terotorisasi.' });
      return;
    }
    const idToken = extractBearerToken(req) || undefined;
    const settings = await updateAiSettings(req.body || {}, idToken);
    res.json({ ok: true, settings });
  });

  app.get('/api/admin/ai/analytics', async (req, res) => {
    res.setHeader('Cache-Control', 'no-store');
    const decoded = await verifyRequestFirebaseToken(req);
    if (!decoded || !isDecodedTokenAdmin(decoded)) {
      res.status(403).json({ error: 'Khusus admin terotorisasi.' });
      return;
    }
    const period = typeof req.query.period === 'string' ? req.query.period : '30d';
    const analytics = await getAdminAiAnalytics(period);
    res.json(analytics);
  });

  return app;
}

async function startServer() {
  const app = createApp();
  const isProd = process.env.NODE_ENV === 'production';

  if (!isProd) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'custom',
    });
    app.use(vite.middlewares);

    app.use('*', async (req, res, next) => {
      if (req.originalUrl.startsWith('/api/')) {
        next();
        return;
      }
      try {
        const templatePath = path.resolve(__dirname, 'index.html');
        const rawHtml = fs.readFileSync(templatePath, 'utf-8');
        const transformed = await vite.transformIndexHtml(req.originalUrl, rawHtml);
        const seoHtml = injectSeoIntoHtml(transformed, req.originalUrl, resolveBaseUrl(req));
        res.status(200).set({ 'Content-Type': 'text/html' }).end(seoHtml);
      } catch (err) {
        vite.ssrFixStacktrace(err as Error);
        next(err);
      }
    });
  } else {
    const distDir = path.resolve(process.cwd(), 'dist');
    app.use(express.static(distDir, { index: false }));
    app.use('*', (req, res, next) => {
      if (req.originalUrl.startsWith('/api/')) {
        next();
        return;
      }
      const indexPath = path.join(distDir, 'index.html');
      const rawHtml = fs.readFileSync(indexPath, 'utf-8');
      const seoHtml = injectSeoIntoHtml(rawHtml, req.originalUrl, resolveBaseUrl(req));
      res.status(200).set({ 'Content-Type': 'text/html' }).end(seoHtml);
    });
  }

  // Automated monthly payment due-date watcher (runs every 60 seconds while server is active)
  const fallbackBaseUrl = resolveBaseUrl();
  setInterval(() => {
    processDueRemindersNow(fallbackBaseUrl).catch(() => {});
  }, 60_000);

  const port = Number(process.env.PORT) || 3000;
  app.listen(port, '0.0.0.0', () => {
    console.log(`TOMOYO server running on http://0.0.0.0:${port}`);
  });
}

if (!process.env.VERCEL) {
  startServer();
}
