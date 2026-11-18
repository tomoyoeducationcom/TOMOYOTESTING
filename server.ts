import 'dotenv/config';
import express from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createServer as createViteServer } from 'vite';
import {
  ADMIN_WHATSAPP_TARGET,
  buildPaymentDueNotificationMessage,
  buildRegistrationNotificationMessage,
  computeNextMonthlyDueDate,
  getPaymentStatusLabel,
  normalizeWhatsappPhone,
  type PaymentStatus,
} from './src/lib/domain';
import {
  generateRobotsTxt,
  generateSitemapXml,
  injectSeoIntoHtml,
} from './src/lib/seo';
import { isDecodedTokenAdmin, verifyRequestFirebaseToken } from './src/server/auth';
import {
  confirmDueReminder,
  isFonnteConfigured,
  listDueReminders,
  processDueRemindersNow,
  sendFonnteWhatsApp,
  upsertDueReminder,
} from './src/server/fonnte';

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

  app.get('/api/admin/verify', async (req, res) => {
    const decoded = await verifyRequestFirebaseToken(req);
    if (!decoded) {
      res.status(401).json({
        authorized: false,
        error: 'Token Firebase tidak valid atau belum login.',
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
          target: ADMIN_WHATSAPP_TARGET,
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
      channel: 'offline',
      paymentStatusLabel: body.initialPaymentStatus
        ? getPaymentStatusLabel(body.initialPaymentStatus)
        : undefined,
      appUrl: baseUrl,
    });

    const delivery = await sendFonnteWhatsApp({
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
    const nowLabel = new Date().toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' });
    const message = [
      '✅ UJI NOTIFIKASI WHATSAPP — TOMOYO EDUCATION',
      '',
      `Pengirim Admin: ${decoded.email}`,
      `Waktu Uji: ${nowLabel} WIB`,
      `Dashboard Admin: ${baseUrl}/admintomoyo`,
      '',
      'Integrasi backend Fonnte aktif dan siap menerima notifikasi pendaftaran siswa baru maupun pengingat pembayaran jatuh tempo.',
    ].join('\n');

    const delivery = await sendFonnteWhatsApp({ message });
    res.json({
      ...delivery,
      messagePreview: message.slice(0, 480),
    });
  });

  return app;
}

async function startServer() {
  const app = createApp();
  const isProd = process.env.NODE_ENV === 'production';

  if (!isProd) {
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
    const distDir = path.resolve(__dirname, 'dist');
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
