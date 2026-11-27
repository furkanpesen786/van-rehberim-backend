// server/publicData.ts — /api/v1 ortak veri okuma katmanı (aşama 2)
//
// Firestore okuma kotası koruması: istemciler liste verisini artık
// buradan çeker; Firestore'a koleksiyon başına 5 dakikada bir (tüm
// kullanıcılar için tek) okuma yapılır. Önbellek: server/cacheService.ts.
//
// Sözleşme (istemcinin mevcut onSnapshot eşlemeleriyle birebir):
//  - Aktiflik filtresi: where('bitisTarihi', '>', Timestamp.now())
//    (src/lib/firebase.ts sorgularıyla aynı — koleksiyonlarda `status`
//    alanı yok, aktiflik bitiş tarihiyle tanımlı)
//  - Yanıt öğesi: { id, ...dokümanVerisi } — Timestamp alanları
//    JSON'da {seconds, nanoseconds} olarak serileşir; istemcinin
//    listingTimestampMillis utility'si bu biçimi destekler
//  - Sıralama: createdAtTimestamp desc (M30 "En Yeni İlanlar Üstte";
//    timestamp'u olmayan kayıtlar sona düşer) — sunucu tarafında
//    yapılır, composite index GEREKMEZ (orderBy yok)
//
// Başlıklar:
//  - X-Cache: HIT  → RAM önbellekten, Firestore'a gidilmedi
//  - X-Cache: MISS → Firestore'tan okundu, önbelleğe yazıldı
//
// Fail-closed: FIREBASE_SERVICE_ACCOUNT yoksa 503 (adminApp.ts deseni).
// Firestore okuma hatasında dürüst 502 — istemcinin (aşama 4) doğrudan
// Firestore düşüşü (fallback) bu durumda devreye girer.

import { Router, type Request, type Response } from 'express';
import { getFirestore, Timestamp } from 'firebase-admin/firestore';
import { getAdminApp } from './adminApp.ts';
import { publicDataCache, CACHE_KEYS } from './cacheService.ts';
// Tam tarama (27.11): secret karşılaştırması timing-safe yapılır
import { secretsMatch } from './secretCompare.ts';
// M30 sıralama sözleşmesinin tek kaynağı — istemciyle aynı kod
import { sortByNewestFirst } from '../src/utils/listingSort.ts';

export const publicDataRouter = Router();

// Önbelleğe alınan öğe: { id, ...data }
export interface PublicListingItem {
  id: string;
  [field: string]: unknown;
}

type ListingKind = 'jobs' | 'deals' | 'taxis';

const LISTING_ENDPOINTS: Record<
  ListingKind,
  { cacheKey: string; collection: string; responseField: 'jobs' | 'deals' | 'taxis' }
> = {
  jobs: { cacheKey: CACHE_KEYS.jobs, collection: 'is_ilanlari', responseField: 'jobs' },
  deals: { cacheKey: CACHE_KEYS.deals, collection: 'indirim_ilanlari', responseField: 'deals' },
  taxis: { cacheKey: CACHE_KEYS.taxis, collection: 'taksiler', responseField: 'taxis' },
};

/**
 * Aşama 3: verilen koleksiyonun /api/v1 önbelleğini geçersiz kılar.
 * Yeni ilan yayımlandığında (server/listings.ts, 201 yanıtı) çağrılır —
 * önbellekteki eski liste en fazla TTL kadar bayat kalır, bu yolla anında
 * tazelenir. Bilinmeyen koleksiyon adında false döner.
 */
export function invalidatePublicDataCache(collection: string): boolean {
  const entry = Object.values(LISTING_ENDPOINTS).find((c) => c.collection === collection);
  if (!entry) return false;
  return publicDataCache.del(entry.cacheKey) > 0;
}

async function handleListingRequest(kind: ListingKind, _req: Request, res: Response): Promise<void> {
  const cfg = LISTING_ENDPOINTS[kind];

  // 1) RAM önbellek — Firestore'a gitmeden dön
  const cached = publicDataCache.get<PublicListingItem[]>(cfg.cacheKey);
  if (cached !== undefined) {
    res.set('X-Cache', 'HIT');
    res.json({ success: true, count: cached.length, [cfg.responseField]: cached });
    return;
  }

  // 2) Önbellekte yok → Admin SDK ile Firestore'tan aktif kayıtları çek
  const adminApp = getAdminApp();
  if (!adminApp) {
    res.status(503).json({
      error: 'Sunucu veritabanı yönetim erişimi yapılandırılmamış (FIREBASE_SERVICE_ACCOUNT eksik).',
    });
    return;
  }

  try {
    const snapshot = await getFirestore(adminApp)
      .collection(cfg.collection)
      .where('bitisTarihi', '>', Timestamp.now())
      .get();

    // { id, ...data } + createdAtTimestamp desc (M30; timestamp'suzlar sonda).
    // Dikkat: TS, dizin imzalısını spread'te düşürür — açık tip şart.
    const items = sortByNewestFirst(
      snapshot.docs.map((d): PublicListingItem => ({ id: d.id, ...d.data() })),
      (item) => item.createdAtTimestamp,
    );

    publicDataCache.set(cfg.cacheKey, items);

    res.set('X-Cache', 'MISS');
    res.json({ success: true, count: items.length, [cfg.responseField]: items });
  } catch (err) {
    console.error(`[publicData] ${cfg.collection} okunamadı:`, err);
    res.status(502).json({ error: 'İlanlar şu anda alınamadı. Lütfen tekrar deneyiniz.' });
  }
}

publicDataRouter.get('/jobs', (req, res) => {
  void handleListingRequest('jobs', req, res);
});

publicDataRouter.get('/deals', (req, res) => {
  void handleListingRequest('deals', req, res);
});

publicDataRouter.get('/taxis', (req, res) => {
  void handleListingRequest('taxis', req, res);
});

// Aşama 3: manuel invalidasyon — tüm /api/v1 önbelleğini temizler.
// Fail-closed: CACHE_INVALIDATION_SECRET env'i TANIMLI DEĞİLSE endpoint
// kapalıdır (503) — kimse gizli bir anahtar olmadan önbelleği boşaltıp
// Firestore okuma maliyetini sunucuya yükleyemesin. Tanımlıysa istek
// `x-invalidation-secret` başlığıyla aynı değeri göndermelidir.
// Not: otomatik invalidasyon (ilan yayını) için listings.ts'e bakınız —
// bu endpoint olağan dışı durumlar (elle veri düzeltmesi vb.) içindir.
const CACHE_INVALIDATION_SECRET = process.env.CACHE_INVALIDATION_SECRET || '';

publicDataRouter.post('/cache/clear', (req, res) => {
  if (!CACHE_INVALIDATION_SECRET) {
    res.status(503).json({
      error: 'Önbellek temizleme yapılandırılmamış (CACHE_INVALIDATION_SECRET eksik).',
    });
    return;
  }
  const provided = req.get('x-invalidation-secret') || '';
  if (!secretsMatch(provided, CACHE_INVALIDATION_SECRET)) {
    res.status(401).json({ error: 'Yetkisiz istek.' });
    return;
  }
  const cleared = publicDataCache.del([CACHE_KEYS.jobs, CACHE_KEYS.deals, CACHE_KEYS.taxis]);
  console.log(`[publicData] manuel önbellek temizliği: ${cleared} anahtar silindi`);
  res.json({ ok: true, cleared });
});
