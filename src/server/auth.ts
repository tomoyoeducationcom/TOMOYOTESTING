import type { Request } from 'express';
import { initializeApp, getApps, getApp } from 'firebase-admin/app';
import { getAuth, type DecodedIdToken } from 'firebase-admin/auth';
import firebaseConfig from '../../firebase-applet-config.json';
import { isAuthorizedAdminIdentity } from '../lib/domain';

function getAdminApp() {
  if (getApps().length > 0) {
    return getApp();
  }
  return initializeApp({
    projectId: firebaseConfig.projectId,
  });
}

export function extractFirebaseTokenFromHeaders(
  headers: Record<string, string | string[] | undefined>
): string | null {
  const customRaw = headers['x-firebase-token'];
  const customHeader = Array.isArray(customRaw) ? customRaw[0] : customRaw;
  if (typeof customHeader === 'string' && customHeader.trim().length > 0) {
    return customHeader.trim();
  }

  const authRaw = headers.authorization;
  const authHeader = Array.isArray(authRaw) ? authRaw[0] : authRaw;
  if (typeof authHeader === 'string' && authHeader.startsWith('Bearer ')) {
    const token = authHeader.slice('Bearer '.length).trim();
    return token.length > 0 ? token : null;
  }

  return null;
}

export function extractBearerToken(req: Request): string | null {
  return extractFirebaseTokenFromHeaders(req.headers);
}

export async function verifyRequestFirebaseTokenDetailed(req: Request): Promise<{
  decoded: DecodedIdToken | null;
  reason?: string;
}> {
  const token = extractBearerToken(req);
  if (!token) {
    return { decoded: null, reason: 'Header token Firebase tidak ditemukan.' };
  }
  try {
    const app = getAdminApp();
    const decoded = await getAuth(app).verifyIdToken(token);
    return { decoded };
  } catch (err: unknown) {
    const code =
      typeof err === 'object' && err !== null && 'code' in err
        ? String((err as { code?: unknown }).code)
        : '';
    return {
      decoded: null,
      reason: code ? `Verifikasi token Firebase ditolak (${code}).` : 'Token Firebase tidak valid.',
    };
  }
}

export async function verifyRequestFirebaseToken(req: Request): Promise<DecodedIdToken | null> {
  const { decoded } = await verifyRequestFirebaseTokenDetailed(req);
  return decoded;
}

export function isDecodedTokenAdmin(decoded: DecodedIdToken | null): boolean {
  if (!decoded) return false;
  return isAuthorizedAdminIdentity({
    uid: decoded.uid,
    email: decoded.email ?? null,
    emailVerified: decoded.email_verified ?? false,
  });
}
