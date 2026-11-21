// server/cacheService.ts — RAM önbellek katmanı (ölçek hazırlığı, aşama 2)
//
// Amaç: yüksek trafikte (100.000+ günlük kullanıcı) Firestore OKUMA
// kotasını korumak. Üç ortak ilan koleksiyonu (is_ilanlari /
// indirim_ilanlari / taksiler) artık Express üzerinden sunulur
// (/api/v1/*); Firestore'a koleksiyon başına yalnızca TTL süresince
// (5 dk) tek okuma yapılır — tüm kullanıcılar paylaşır.
//
// Render free plan (512 MB RAM) koruması: maxKeys 500 — önbellek
// kontrolsüz büyüyemez. Aşama 3'te ilan yazımında (POST /api/listings)
// ilgili anahtar cache.del ile invalidasyon yapılacak.

import NodeCache from 'node-cache';

export const PUBLIC_DATA_CACHE_TTL_SECONDS = 300; // 5 dakika
export const PUBLIC_DATA_CACHE_MAX_KEYS = 500; // RAM taşma koruması

export const publicDataCache = new NodeCache({
  stdTTL: PUBLIC_DATA_CACHE_TTL_SECONDS,
  maxKeys: PUBLIC_DATA_CACHE_MAX_KEYS,
  // Süresi geçmiş anahtarları arka planda temizle
  checkperiod: 120,
});

// Önbellek anahtarları — invalidasyon (aşama 3) bu sabitlerle yapılır.
export const CACHE_KEYS = {
  jobs: 'v1:jobs',
  deals: 'v1:deals',
  taxis: 'v1:taxis',
} as const;
