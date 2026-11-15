// server/adminApp.ts — Firebase Admin SDK lazy init (paylaşılan modül)
//
// M5'te server/listings.ts içinde doğdu; M35'te hesap silme endpoint'i
// (server/account.ts) de aynı yönetimi kullanacağı için buraya taşındı.
// Fail-closed: FIREBASE_SERVICE_ACCOUNT env'i yoksa null döner, çağıran
// taraf 503 ile reddeder.
//
// Gerekli ortam değişkeni:
//  - FIREBASE_SERVICE_ACCOUNT : Firebase service account JSON'ı (tek satır string)

import { initializeApp, getApps, cert, type App } from 'firebase-admin/app';

const FIREBASE_SERVICE_ACCOUNT = process.env.FIREBASE_SERVICE_ACCOUNT || '';

let cachedAdminApp: App | null = null;

export function getAdminApp(): App | null {
  if (cachedAdminApp) return cachedAdminApp;
  if (getApps().length > 0) {
    cachedAdminApp = getApps()[0];
    return cachedAdminApp;
  }
  if (!FIREBASE_SERVICE_ACCOUNT) return null;
  try {
    const serviceAccount = JSON.parse(FIREBASE_SERVICE_ACCOUNT);
    cachedAdminApp = initializeApp({ credential: cert(serviceAccount) });
    return cachedAdminApp;
  } catch (err) {
    console.error('[admin] FIREBASE_SERVICE_ACCOUNT çözümlenemedi:', err);
    return null;
  }
}
