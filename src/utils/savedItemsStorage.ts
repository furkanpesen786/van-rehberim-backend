// M28 (17/17): favori ilan/yer ID listelerinin localStorage kalıcılığı.
// Saf fonksiyonlar — SavedItemsContext bunların üzerinden okur/yazar.
// Anahtarlar değişmedi (saved_deals_van / saved_places_van): mevcut
// kullanıcı verisi yeni state yönetiminde de aynen okunur.

export const SAVED_DEALS_KEY = 'saved_deals_van';
export const SAVED_PLACES_KEY = 'saved_places_van';

// M29: depoda kayıt yoksa ilan favorisi varsayılanı BOŞ — eski sürümler
// 'd-1'/'d-4' hayalet id'leri yazıyordu (DEALS mock'u boş; bu id'lere
// karşılık gelen ilan hiç yoktu → favoriye eklenen ilan asla görünmüyor,
// hayalet id birikiyordu). Yer varsayılanları GERÇEK id'ler: p-1 = Akdamar
// Adası, p-3 = Edremit Sahili (PLACES_TO_VISIT mock'unda mevcutlar).
export const DEFAULT_SAVED_DEAL_IDS: string[] = [];
export const DEFAULT_SAVED_PLACE_IDS = ['p-1', 'p-3'];

// M29: eski sürümlerin bıraktığı hayalet favori id'leri. Provider mount
// edilirken listelerden süzülür; kalıcılık effect'i temiz hali depoya
// yazar (tek seferlik geçiş temizliği).
export const GHOST_DEAL_IDS = new Set(['d-1', 'd-2', 'd-3', 'd-4']);
export const GHOST_PLACE_IDS = new Set(['place-1', 'place-3']);

/** Hayalet ilan id'lerini süzer (bilinen hayalet id yoksa aynı dizi döner). */
export function filterGhostDealIds(ids: string[]): string[] {
  return GHOST_DEAL_IDS.size === 0 ? ids : ids.filter((id) => !GHOST_DEAL_IDS.has(id));
}

/** Hayalet yer id'lerini süzer (bilinen hayalet id yoksa aynı dizi döner). */
export function filterGhostPlaceIds(ids: string[]): string[] {
  return GHOST_PLACE_IDS.size === 0 ? ids : ids.filter((id) => !GHOST_PLACE_IDS.has(id));
}

/**
 * Anahtardan string[] okur. Bozuk/eksik veride fallback döner.
 */
export function loadSavedIds(key: string, fallback: string[]): string[] {
  try {
    const stored = localStorage.getItem(key);
    if (stored) {
      const parsed: unknown = JSON.parse(stored);
      if (Array.isArray(parsed) && parsed.every((id) => typeof id === 'string')) {
        return parsed;
      }
    }
  } catch (e) {
    console.error(`[SavedItems] localStorage okuma hatası (${key}):`, e);
  }
  return fallback;
}

/**
 * ID listesini anahtara yazar. Yazma başarısızsa sessizce geçilir
 * (state yine de günceldir; sadece kalıcılık kaybolur).
 */
export function saveSavedIds(key: string, ids: string[]): void {
  try {
    localStorage.setItem(key, JSON.stringify(ids));
  } catch (e) {
    console.error(`[SavedItems] localStorage yazma hatası (${key}):`, e);
  }
}
