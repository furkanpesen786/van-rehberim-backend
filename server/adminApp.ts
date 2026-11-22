// server/adminApp.ts — Firebase Admin SDK lazy init (paylaşılan modül)
//
// M5'te server/listings.ts içinde doğdu; M35'te hesap silme endpoint'i
// (server/account.ts) de aynı yönetimi kullanacağı için buraya taşındı.
// Fail-closed: hiçbir kimlik bilgisi çözümlenemezse null döner, çağıran
// taraf 503 ile reddeder.
//
// Kimlik bilgisi biçimleri (öncelik sırasıyla, aşama 3):
//  1) BÖLÜNMÜŞ env'ler — Render.com Environment Variables paneline tek tek
//     girilebilir (önerilen; panelde tek satırlık dev JSON düzenlemek
//     hataya açık):
//       FIREBASE_PROJECT_ID   : "vanrehberim-f181b"
//       FIREBASE_CLIENT_EMAIL : "firebase-adminsdk-...@....iam.gserviceaccount.com"
//       FIREBASE_PRIVATE_KEY  : "-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
//     (panelde \n karakterleri hazır bulunur; kod \n → gerçek satır sonu
//     dönüştürmesi yapar)
//  2) FIREBASE_SERVICE_ACCOUNT : tam service account JSON'ı (tek satır
//     string) — mevcut Render kurulumu, geriye uyumluluk için korunur.

import { initializeApp, getApps, cert, type App } from 'firebase-admin/app';

const FIREBASE_PROJECT_ID = process.env.FIREBASE_PROJECT_ID || '';
const FIREBASE_CLIENT_EMAIL = process.env.FIREBASE_CLIENT_EMAIL || '';
// Render/panelden gelen anahtarlar \n kaçış dizisi olarak taşınır — gerçek
// satır sonlarına çevrilmezse "Invalid private key" hatası alınır.
const FIREBASE_PRIVATE_KEY = (process.env.FIREBASE_PRIVATE_KEY || '').replace(/\\n/g, '\n');
const FIREBASE_SERVICE_ACCOUNT = process.env.FIREBASE_SERVICE_ACCOUNT || '';

/** Öncelik sırasına göre Admin SDK credential'ı üretir; yoksa null. */
function buildCredential(): ReturnType<typeof cert> | null {
  if (FIREBASE_PROJECT_ID && FIREBASE_CLIENT_EMAIL && FIREBASE_PRIVATE_KEY) {
    return cert({
      projectId: FIREBASE_PROJECT_ID,
      clientEmail: FIREBASE_CLIENT_EMAIL,
      privateKey: FIREBASE_PRIVATE_KEY,
    });
  }
  if (FIREBASE_SERVICE_ACCOUNT) {
    return cert(JSON.parse(FIREBASE_SERVICE_ACCOUNT));
  }
  return null;
}

let cachedAdminApp: App | null = null;

export function getAdminApp(): App | null {
  if (cachedAdminApp) return cachedAdminApp;
  if (getApps().length > 0) {
    cachedAdminApp = getApps()[0];
    return cachedAdminApp;
  }
  try {
    const credential = buildCredential();
    if (!credential) return null;
    cachedAdminApp = initializeApp({ credential });
    return cachedAdminApp;
  } catch (err) {
    console.error('[admin] Firebase yönetim kimlik bilgileri çözümlenemedi:', err);
    return null;
  }
}
