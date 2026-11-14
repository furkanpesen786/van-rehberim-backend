// server/listings.ts — Ücretli ilan yayınlama API'si (M5)
//
// Güvenlik modeli ("pull" doğrulama):
//  1) İstemci Firebase Auth ID token gönderir → sunucu verifyIdToken ile uid çıkarır
//  2) Sunucu RevenueCat REST API'den subscriber kaydını çeker, ürün satın alımını doğrular
//  3) durationDays / bitisTarihi / isFeatured / userId SUNUCUDA hesaplanır —
//     istemciden gelen bu alanlar yok sayılır (sahtelenemez)
//  4) Firestore'a yalnızca Admin SDK ile yazılır (güvenlik kurallarını bypass eder;
//     istemci tarafında create kuralı kapatılır)
//
// Gerekli ortam değişkenleri:
//  - REVENUECAT_SECRET_API_KEY : RevenueCat Dashboard → Settings → API keys (Secret)
//  - FIREBASE_SERVICE_ACCOUNT   : Firebase service account JSON'ı (tek satır string)
// İkisi de eksikse endpoint fail-closed davranır (503).

import { Router, type Request, type Response } from 'express';
import axios from 'axios';
import { initializeApp, getApps, cert, type App } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore, Timestamp, FieldValue } from 'firebase-admin/firestore';

export const listingsRouter = Router();

// --- Konfigürasyon -----------------------------------------------------------

const RC_SECRET_API_KEY = process.env.REVENUECAT_SECRET_API_KEY || '';
const FIREBASE_SERVICE_ACCOUNT = process.env.FIREBASE_SERVICE_ACCOUNT || '';

// Ürün → süre/vitrin metaı. Tek doğrul kaynağı SUNUCUDUR (istemcideki
// getJobMetaFromPackage / getDealMetaFromPackage yalnızca UI içindir).
const PRODUCT_META: Record<string, { durationDays: number; isFeatured: boolean }> = {
  'ilan_30_gun': { durationDays: 30, isFeatured: false },
  'one_cikan_30_gun': { durationDays: 30, isFeatured: true },
  'taksi_ilan_aylik': { durationDays: 30, isFeatured: false },
};

// İlan tipi → koleksiyon + izinli ürünler + istemciden kabul edilen alanlar.
// Kritik alanlar (userId, süre, tarihler, isFeatured...) bu listelere bilinçli
// olarak DAHİL DEĞİLDİR — sunucu bunları kendi hesaplar.
type ListingType = 'job' | 'deal' | 'taxi';

const LISTING_TYPES: Record<ListingType, {
  collection: string;
  allowedProducts: string[];
  fields: string[];
}> = {
  job: {
    collection: 'is_ilanlari',
    allowedProducts: ['ilan_30_gun', 'one_cikan_30_gun'],
    fields: [
      'title', 'providerName', 'category', 'district', 'address',
      'phone', 'description', 'photo', 'experienceYears', 'pricePaid',
    ],
  },
  deal: {
    collection: 'indirim_ilanlari',
    allowedProducts: ['ilan_30_gun', 'one_cikan_30_gun'],
    fields: [
      'isletmeAdi', 'kategori', 'indirimKodu', 'indirimDegeri',
      'indirimMetni', 'image', 'images', 'phone', 'locationName',
      'description', 'pricePaid',
    ],
  },
  taxi: {
    collection: 'taksiler',
    allowedProducts: ['taksi_ilan_aylik'],
    fields: [
      'name', 'driverName', 'phone', 'plate', 'operatingRegions',
      'district', 'subscriptionPlan', 'monthlyFee', 'pricePaid',
    ],
  },
};

// Satın alma "tazelik" penceresi: tek seferlik (non-subscription) satın almalarda
// yayınlama, son 15 dakika içinde yapılmış güncel bir ödemeye bağlı olmalı.
// (Aksi halde geçmişte bir kez alan kişi sonsuza kadar ücretsiz yayınlardı.)
// Aktif entitlement (varsa) süre boyunca geçerlidir, tazelik istemez.
const PURCHASE_FRESHNESS_MS = 15 * 60 * 1000;
const SUBSCRIBER_CACHE_TTL_MS = 60 * 1000;
const RATE_LIMIT_MAX_PER_HOUR = 10;
const MAX_FIELD_LENGTH = 5000;

// M29: görsel alanları için ayrı üst sınır. İstemci fotoğrafları canvas ile
// ~150K karaktere sıkıştırıp base64 JPEG olarak gönderir (imageCompress.ts).
// 5 fotoğraf × 150K = 750K karakter → Firestore'un 1MB doküman sınırının
// altında kalır. URL girişleri (JobsView modeli) bu sınıra çok uzaktan uyar.
const IMAGE_FIELDS = new Set(['image', 'photo']);
const IMAGE_LIST_FIELDS = new Set(['images']);
const MAX_IMAGE_FIELD_LENGTH = 150_000;
const MAX_IMAGE_COUNT = 5;

// --- Firebase Admin (lazy init, fail-closed) ---------------------------------

let cachedAdminApp: App | null = null;

function getAdminApp(): App | null {
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
    console.error('[listings] FIREBASE_SERVICE_ACCOUNT çözümlenemedi:', err);
    return null;
  }
}

// --- RevenueCat subscriber sorgusu (v1 REST, 60 sn önbellekli) ---------------

interface RcEntitlement {
  product_identifier?: string;
  expires_date?: string | null;
  [key: string]: unknown;
}

interface RcNonSubscriptionPurchase {
  product_id?: string;
  purchase_date?: string;
  [key: string]: unknown;
}

interface RcSubscriber {
  entitlements?: Record<string, RcEntitlement>;
  non_subscriptions?: Record<string, RcNonSubscriptionPurchase[]>;
  [key: string]: unknown;
}

const subscriberCache = new Map<string, { data: RcSubscriber; expiresAt: number }>();

async function fetchRevenueCatSubscriber(uid: string): Promise<RcSubscriber | null> {
  const cached = subscriberCache.get(uid);
  if (cached && cached.expiresAt > Date.now()) return cached.data;

  const response = await axios.get(
    `https://api.revenuecat.com/v1/subscribers/${encodeURIComponent(uid)}`,
    {
      headers: {
        Authorization: `Bearer ${RC_SECRET_API_KEY}`,
        'X-Platform': 'android',
      },
      timeout: 15000,
      validateStatus: (status) => status === 200 || status === 404,
    },
  );

  // 404 = bu kullanıcı için RevenueCat kaydı hiç oluşturulmamış (hiç ödeme yok)
  if (response.status === 404) return null;

  const subscriber = (response.data?.subscriber ?? {}) as RcSubscriber;
  subscriberCache.set(uid, { data: subscriber, expiresAt: Date.now() + SUBSCRIBER_CACHE_TTL_MS });
  return subscriber;
}

function isEntitlementActive(ent: RcEntitlement): boolean {
  if (!ent.expires_date) return true; // süresiz (lifetime) kabul edilir
  return new Date(ent.expires_date).getTime() > Date.now();
}

function hasValidPurchase(subscriber: RcSubscriber | null, productId: string): boolean {
  if (!subscriber) return false;

  // 1) Aktif entitlement — ürün eşleşmeli
  for (const ent of Object.values(subscriber.entitlements || {})) {
    if (ent && ent.product_identifier === productId && isEntitlementActive(ent)) {
      return true;
    }
  }

  // 2) Güncel tek seferlik satın alma (non-subscription, tazelik penceresi içinde)
  const purchases = subscriber.non_subscriptions?.[productId] || [];
  const now = Date.now();
  return purchases.some((p) => {
    if (!p.purchase_date) return false;
    return now - new Date(p.purchase_date).getTime() <= PURCHASE_FRESHNESS_MS;
  });
}

// --- Basit rate limit (uid başına saatlik) -----------------------------------

const rateLimiter = new Map<string, number[]>();
const RATE_LIMIT_WINDOW_MS = 60 * 60 * 1000;
let rateLimiterLastPrune = 0;

// M31: pencere dışına çıkmış uid'leri Map'ten sil — eskiden her benzersiz uid
// bir kez girdikten sonra sonsuza kadar bellekte kalıyordu (uzun ömürlü
// süreçte sızıntı). Süpürme dakikada bir yapılır (her istekte değil).
function pruneRateLimiter(now: number): void {
  const windowStart = now - RATE_LIMIT_WINDOW_MS;
  for (const [uid, stamps] of rateLimiter) {
    const fresh = stamps.filter((t) => t > windowStart);
    if (fresh.length === 0) {
      rateLimiter.delete(uid);
    } else if (fresh.length !== stamps.length) {
      rateLimiter.set(uid, fresh);
    }
  }
}

function isRateLimited(uid: string): boolean {
  const now = Date.now();
  if (now - rateLimiterLastPrune > 60 * 1000) {
    rateLimiterLastPrune = now;
    pruneRateLimiter(now);
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

// --- Yardımcılar --------------------------------------------------------------

function pickFields(data: Record<string, unknown>, fields: string[]): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const key of fields) {
    const value = data[key];
    if (value === undefined || value === null) continue;
    if (typeof value === 'string') {
      const limit = IMAGE_FIELDS.has(key) ? MAX_IMAGE_FIELD_LENGTH : MAX_FIELD_LENGTH;
      out[key] = value.slice(0, limit);
    } else if (typeof value === 'number' || typeof value === 'boolean') {
      out[key] = value;
    } else if (Array.isArray(value) && IMAGE_LIST_FIELDS.has(key)) {
      // M29: görsel listesi (string[]) — yalnızca images alanında, en fazla
      // MAX_IMAGE_COUNT adet, her biri görsel üst sınırıyla kırpılır.
      out[key] = value
        .filter((item): item is string => typeof item === 'string' && item.length > 0)
        .slice(0, MAX_IMAGE_COUNT)
        .map((item) => item.slice(0, MAX_IMAGE_FIELD_LENGTH));
    }
    // Diğer nesne/dizi değerleri bilinçli olarak reddedilir (enjeksiyon riski).
  }
  return out;
}

function todayTR(): string {
  return new Date().toLocaleDateString('tr-TR', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

// --- Endpoint -----------------------------------------------------------------

listingsRouter.post('/', async (req: Request, res: Response) => {
  try {
    // 0) Konfigürasyon kontrolü (fail-closed)
    if (!RC_SECRET_API_KEY) {
      return res.status(503).json({
        error: 'Sunucu ödeme doğrulaması yapılandırılmamış (REVENUECAT_SECRET_API_KEY eksik).',
      });
    }
    const adminApp = getAdminApp();
    if (!adminApp) {
      return res.status(503).json({
        error: 'Sunucu veritabanı yönetim erişimi yapılandırılmamış (FIREBASE_SERVICE_ACCOUNT eksik).',
      });
    }

    // 1) İstek gövdesi
    const { type, productId, data } = req.body || {};
    const typeConfig = LISTING_TYPES[type as ListingType];
    if (!typeConfig || typeof productId !== 'string' || !data || typeof data !== 'object') {
      return res.status(400).json({ error: 'Geçersiz istek.' });
    }
    const meta = PRODUCT_META[productId];
    if (!meta || !typeConfig.allowedProducts.includes(productId)) {
      return res.status(400).json({ error: 'Bu ilan tipi için geçersiz paket.' });
    }

    // 2) Kimlik doğrulama (Firebase ID token, iptal edilmiş oturumlar reddedilir)
    const authHeader = req.headers.authorization || '';
    const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : '';
    if (!token) {
      return res.status(401).json({ error: 'Oturum doğrulanamadı. Lütfen giriş yapınız.' });
    }
    let decoded;
    try {
      decoded = await getAuth(adminApp).verifyIdToken(token, true);
    } catch {
      return res.status(401).json({ error: 'Oturum doğrulanamadı. Lütfen tekrar giriş yapınız.' });
    }
    const uid = decoded.uid;
    if (isRateLimited(uid)) {
      return res.status(429).json({ error: 'Çok fazla istek gönderildi. Lütfen bir süre sonra tekrar deneyiniz.' });
    }

    // 3) Ödeme doğrulaması (RevenueCat subscriber kontrolü)
    let subscriber: RcSubscriber | null = null;
    try {
      subscriber = await fetchRevenueCatSubscriber(uid);
    } catch (err) {
      console.error('[listings] RevenueCat sorgusu başarısız:', err);
      return res.status(502).json({ error: 'Ödeme bilgisi doğrulanamadı. Lütfen kısa süre sonra tekrar deneyiniz.' });
    }
    if (!hasValidPurchase(subscriber, productId)) {
      return res.status(403).json({
        error: 'Ödeme doğrulanamadı. Ödemeniz tamamlandıysa kısa süre sonra tekrar deneyiniz.',
      });
    }

    // 4) Dokümanı SUNUCU değerleriyle oluştur
    const now = new Date();
    const endDate = new Date(now.getTime() + meta.durationDays * 24 * 60 * 60 * 1000);

    const docData: Record<string, unknown> = {
      ...pickFields(data as Record<string, unknown>, typeConfig.fields),
      userId: uid,
      userEmail: decoded.email || 'anonim@van.rehberim',
      productId,
      durationDays: meta.durationDays,
      isFeatured: meta.isFeatured,
      createdAt: todayTR(),
      createdAtTimestamp: FieldValue.serverTimestamp(),
      bitisTarihi: Timestamp.fromDate(endDate),
    };
    if (type === 'deal') {
      docData.startDate = todayTR();
      docData.endDate = endDate.toLocaleDateString('tr-TR', { day: '2-digit', month: '2-digit', year: 'numeric' });
    }

    const docRef = await getFirestore(adminApp).collection(typeConfig.collection).add(docData);
    return res.status(201).json({ ok: true, id: docRef.id, durationDays: meta.durationDays });
  } catch (err) {
    console.error('[listings] beklenmeyen hata:', err);
    return res.status(500).json({ error: 'İlan yayımlanamadı. Lütfen tekrar deneyiniz.' });
  }
});
