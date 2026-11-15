// server/account.ts — Hesap silme API'si (M35, KVKK 4.2.9)
//
// Neden sunucu tarafında: Android'de CapacitorHttp WebView'daki tüm
// fetch/XHR'yi native katmana yönlendirir ve Firestore web SDK'nın YAZMA
// işlemleri (deleteDoc) bu tünelden asla sonuçlanmıyor — M34'te adım adım
// logla doğrulandı ("Firestore verilerinin silinmesi" adımı 20 sn'de
// tamamlanamadı). M5 mimarisinin ilkesiyle de uyumlu: Firestore'a yalnızca
// Admin SDK ile yazılır/silinir. Ek kazançlar: Admin SDK'da
// requires-recent-login kısıtı yok; @capacitor-firebase/authentication
// plugin'inin deleteUser'ı başarısızlığı sessizce yutan kusurundan da
// etkilenmeyiz.
//
// Akış:
//  1) İstemci kendi Firebase Auth ID token'ını gönderir (Bearer)
//  2) Sunucu verifyIdToken (iptal edilmiş oturum reddedilir) ile uid çıkarır
//  3) Firestore: users/{uid}, userFavorites/{uid} + üç ilan koleksiyonunda
//     userId eşleşmeli dokümanlar silinir (M13 KVKK kapsamıyla aynı)
//  4) Auth kaydı Admin SDK ile silinir — silme tüm oturum tokenlarını
//     otomatik iptal eder
// Tüm adımlar idempotent: olmayan dokümanı silmek no-op'tur, yarıda kalan
// silme yeniden denenebilir.
//
// Gerekli ortam değişkeni: FIREBASE_SERVICE_ACCOUNT (eksikse 503 fail-closed).

import { Router, type Request, type Response } from 'express';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';
import type { App } from 'firebase-admin/app';
import { getAdminApp } from './adminApp.ts';

export const accountRouter = Router();

// M13 KVKK kapsamı — istemcideki eski deleteAllUserData ile aynı liste
const USER_LISTING_COLLECTIONS = ['is_ilanlari', 'indirim_ilanlari', 'taksiler'] as const;

// Silme denemesi rate limit'i (uid başına saatte 5). Hesabını silmek isteyen
// gerçek kullanıcı için bol; spam denemeleri için yeterli.
const RATE_LIMIT_MAX_PER_HOUR = 5;
const RATE_LIMIT_WINDOW_MS = 60 * 60 * 1000;
const rateLimiter = new Map<string, number[]>();
let rateLimiterLastPrune = 0;

function isRateLimited(uid: string): boolean {
  const now = Date.now();
  if (now - rateLimiterLastPrune > 60 * 1000) {
    rateLimiterLastPrune = now;
    const windowStart = now - RATE_LIMIT_WINDOW_MS;
    for (const [key, stamps] of rateLimiter) {
      const fresh = stamps.filter((t) => t > windowStart);
      if (fresh.length === 0) rateLimiter.delete(key);
      else rateLimiter.set(key, fresh);
    }
  }
  const windowStart = now - RATE_LIMIT_WINDOW_MS;
  const stamps = (rateLimiter.get(uid) || []).filter((t) => t > windowStart);
  if (stamps.length >= RATE_LIMIT_MAX_PER_HOUR) {
    rateLimiter.set(uid, stamps);
    return true;
  }
  stamps.push(now);
  rateLimiter.set(uid, stamps);
  return false;
}

/**
 * Kullanıcının TÜM verisini ve Auth kaydını siler (M13 KVKK kapsamı, M35'te
 * istemciden sunucuya taşındı). Sıra kritik: önce Firestore verisi, en son
 * Auth kaydı — aksi halde kime ait olduğunu doğrulayan oturum ortadan
 * kalkardı. Idempotent: olmayan dokümanı silmek no-op'tur, yarıda kalan
 * silme güvenle yeniden denenebilir. Testlerin koruduğu kritik KVKK yoludur.
 */
export async function deleteAllUserDataAndAccount(adminApp: App, uid: string): Promise<void> {
  const db = getFirestore(adminApp);
  await db.doc(`users/${uid}`).delete();
  await db.doc(`userFavorites/${uid}`).delete();
  for (const collName of USER_LISTING_COLLECTIONS) {
    const snapshot = await db.collection(collName).where('userId', '==', uid).get();
    await Promise.all(snapshot.docs.map((d) => d.ref.delete()));
  }
  await getAuth(adminApp).deleteUser(uid);
}

accountRouter.post('/delete', async (req: Request, res: Response) => {
  try {
    // 0) Konfigürasyon (fail-closed)
    const adminApp = getAdminApp();
    if (!adminApp) {
      return res.status(503).json({
        error: 'Sunucu veritabanı yönetim erişimi yapılandırılmamış (FIREBASE_SERVICE_ACCOUNT eksik).',
      });
    }

    // 1) Kimlik doğrulama (Firebase ID token, iptal edilmiş oturumlar reddedilir)
    const authHeader = req.headers.authorization || '';
    const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : '';
    if (!token) {
      return res.status(401).json({ error: 'Oturum doğrulanamadı. Lütfen giriş yapınız.' });
    }
    let uid: string;
    try {
      const decoded = await getAuth(adminApp).verifyIdToken(token, true);
      uid = decoded.uid;
    } catch {
      return res.status(401).json({ error: 'Oturum doğrulanamadı. Lütfen tekrar giriş yapınız.' });
    }
    if (isRateLimited(uid)) {
      return res.status(429).json({ error: 'Çok fazla deneme yapıldı. Lütfen bir süre sonra tekrar deneyiniz.' });
    }

    // 2+3) Firestore verisi + Auth kaydı (idempotent; Auth kaydı en son —
    // Admin SDK'da requires-recent-login yok, silme tüm oturum tokenlarını
    // geçersiz kılar)
    await deleteAllUserDataAndAccount(adminApp, uid);

    return res.json({ ok: true });
  } catch (err) {
    console.error('[account] hesap silme hatası:', err);
    return res.status(500).json({ error: 'Hesap silinirken sunucu hatası oluştu. Lütfen tekrar deneyiniz.' });
  }
});
