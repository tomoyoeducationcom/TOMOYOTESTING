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

export function extractBearerToken(req: Request): string | null {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    return null;
  }
  const token = header.slice('Bearer '.length).trim();
  return token.length > 0 ? token : null;
}

export async function verifyRequestFirebaseToken(req: Request): Promise<DecodedIdToken | null> {
  const token = extractBearerToken(req);
  if (!token) {
    return null;
  }
  try {
    const app = getAdminApp();
    const decoded = await getAuth(app).verifyIdToken(token);
    return decoded;
  } catch {
    return null;
  }
}

export function isDecodedTokenAdmin(decoded: DecodedIdToken | null): boolean {
  if (!decoded) return false;
  return isAuthorizedAdminIdentity({
    uid: decoded.uid,
    email: decoded.email ?? null,
    emailVerified: decoded.email_verified ?? false,
  });
}
