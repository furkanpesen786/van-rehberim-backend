// src/services/publicListingsService.ts — /api/v1 liste verisi istemci
// katmanı (ölçek dönüşümü aşama 4).
//
// Görev: ilan listelerini (iş / indirim / taksi) Firestore onSnapshot
// abonelikleri yerine Express /api/v1 uçlarından çekmek. Böylece Firestore
// okuma kotası kullanıcı sayısından bağımsız hale gelir (sunucu tarafında
// 5 dakikalık node-cache + yayınlamada invalidasyon — bkz.
// server/publicData.ts, server/cacheService.ts).
//
// Katmanlar (busService/M38 deseni):
//  1) BELLEK önbelleği (2 dk) — sekme geçişlerinde tekrar istek atılmaz
//  2) localStorage önbelleği (2 dk) — uygulama yeniden başlasa da taze
//     sayılır; base64 görseller kota doldurursa sessizce atlanır
//  3) fetch /api/v1 — 4 sn AbortController timeout (Render free plan
//     soğuk başlangıcı ~30-50 sn; kullanıcı bekletilmez)
//  4) DÜŞÜŞ: doğrudan Firestore getDocs sorgusu — yalnızca API
//     erişilemezken ve önbellek boşken kullanılır (kotayı yakan eski
//     yol; çağıran taraf src/lib/firebase.ts fallback fonksiyonu verir)
//
// Paralel çağrılar tek uçuşa katlanır (DealsView + SettingsView aynı
// veriyi isterse tek istek atılır).

import { getErrorMessage } from '../utils/errors';

const API_BASE = import.meta.env.VITE_API_URL || 'https://van-rehberim-api.onrender.com';

// İstemci önbelleği 2 dakika: sunucu zaten 5 dk cache'liyor + yayın
// anında invalidasyon yapıyor; istemci önbelleğinin amacı sekme
// geçişlerindeki tekrarları kesmek.
export const CLIENT_LISTING_CACHE_TTL_MS = 2 * 60 * 1000;

// Render free plan soğuk başlangıcı ~30-50 sn sürer; 4 sn'de vazgeçip
// doğrudan Firestore'a düşülür. M38 busService'te kanıtlanmış desen.
const FETCH_TIMEOUT_MS = 4000;

// localStorage boyut koruması: indirim ilanları base64 görseller
// içerebilir (~150K karakter/fotoğraf, bkz. server M29 sınırları).
// Kota (~5 MB) taşarsa localStorage yazması atlanır — bellek önbelleği
// çalışmaya devam eder.
const LOCALSTORAGE_MAX_CHARS = 1_500_000;

interface CacheEntry<T> {
  storedAt: number;
  items: T[];
}

const memoryCache = new Map<string, CacheEntry<unknown>>();
const inflight = new Map<string, Promise<unknown>>();

function readCache<T>(key: string): T[] | null {
  const now = Date.now();

  const mem = memoryCache.get(key);
  if (mem && now - mem.storedAt < CLIENT_LISTING_CACHE_TTL_MS) {
    return mem.items as T[];
  }

  // localStorage ikincil katman — bozuksa/ yoksa sessizce atlanır.
  try {
    const raw = localStorage.getItem(key);
    if (raw) {
      const parsed = JSON.parse(raw) as CacheEntry<T>;
      if (
        parsed
        && typeof parsed.storedAt === 'number'
        && Array.isArray(parsed.items)
        && now - parsed.storedAt < CLIENT_LISTING_CACHE_TTL_MS
      ) {
        memoryCache.set(key, parsed);
        return parsed.items;
      }
      localStorage.removeItem(key); // süresi geçmiş / bozuk kayıt
    }
  } catch {
    // erişim yok sayılır
  }
  return null;
}

function writeCache<T>(key: string, items: T[]): void {
  const entry: CacheEntry<T> = { storedAt: Date.now(), items };
  memoryCache.set(key, entry);
  try {
    const raw = JSON.stringify(entry);
    if (raw.length <= LOCALSTORAGE_MAX_CHARS) {
      localStorage.setItem(key, raw);
    }
  } catch {
    // Kota dolu vb. — bellek önbelleği yeterli.
  }
}

export interface FetchListingsOptions<T> {
  /** Önbellek anahtarı (ad alanlı: 'van_public_v1_jobs') */
  cacheKey: string;
  /** API yolu ('/api/v1/jobs') */
  endpoint: string;
  /** Yanıt gövdesindeki liste alanı ('jobs' | 'deals' | 'taxis') */
  responseField: string;
  /** API erişilemezse doğrudan Firestore sorgusu (src/lib/firebase.ts) */
  fallback: () => Promise<T[]>;
}

/**
 * Liste verisini önbellek → /api/v1 → doğrudan Firestore sırasıyla çeker.
 * Üç katman da başarısız olursa fallback'in hatası fırlatılır (çağıran
 * görünüm mevcut hata UI'ını gösterir).
 */
export async function fetchListings<T>(opts: FetchListingsOptions<T>): Promise<T[]> {
  const cached = readCache<T>(opts.cacheKey);
  if (cached) return cached;

  // Aynı anahtarın paralel istekleri tek promise'e katlanır.
  const existing = inflight.get(opts.cacheKey);
  if (existing) return existing as Promise<T[]>;

  const promise = (async (): Promise<T[]> => {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
      let data: unknown;
      try {
        const response = await fetch(`${API_BASE}${opts.endpoint}`, {
          signal: controller.signal,
        });
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        data = await response.json();
      } finally {
        clearTimeout(timeoutId);
      }

      const body = data as { success?: boolean } & Record<string, unknown>;
      const items = body?.[opts.responseField];
      if (body?.success !== true || !Array.isArray(items)) {
        throw new Error('Beklenmeyen yanıt biçimi');
      }

      const list = items as T[];
      writeCache(opts.cacheKey, list);
      return list;
    } catch (err) {
      console.warn(
        `[publicListings] ${opts.endpoint} alınamadı (${getErrorMessage(err)}) — doğrudan Firestore'a düşülüyor`,
      );
      // Düşüş: kotayı yakan eski yol; yalnızca API erişilemezken ve
      // önbellek boşken tetiklenir.
      const items = await opts.fallback();
      writeCache(opts.cacheKey, items);
      return items;
    }
  })();

  inflight.set(opts.cacheKey, promise);
  try {
    return await promise;
  } finally {
    inflight.delete(opts.cacheKey);
  }
}

/**
 * İstemci önbelleğini temizler. İlan yayımlandıktan sonra çağrılır
 * (src/services/listingService.ts): sunucu önbelleği zaten invalid
 * edildiği için bir sonraki liste açılışı yeni ilanı getirir.
 * Anahtar verilirse yalnızca o koleksiyon, verilirse hepsi temizlenir.
 */
export function clearPublicListingsCache(cacheKey?: string): void {
  const keys = cacheKey
    ? [cacheKey]
    : ['van_public_v1_jobs', 'van_public_v1_deals', 'van_public_v1_taxis'];
  for (const key of keys) {
    memoryCache.delete(key);
    try {
      localStorage.removeItem(key);
    } catch {
      // erişim yok sayılır
    }
  }
}
