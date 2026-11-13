// M28 (17/17): favori ilan/yer ID listelerinin localStorage kalıcılığı.
// Saf fonksiyonlar — SavedItemsContext bunların üzerinden okur/yazar.
// Anahtarlar değişmedi (saved_deals_van / saved_places_van): mevcut
// kullanıcı verisi yeni state yönetiminde de aynen okunur.

export const SAVED_DEALS_KEY = 'saved_deals_van';
export const SAVED_PLACES_KEY = 'saved_places_van';

// Depoda kayıt yoksa gösterilen örnek favoriler (eski bileşen
// davranışıyla aynı — d-1/d-4 işletmeler, place-1/place-3 yerler).
export const DEFAULT_SAVED_DEAL_IDS = ['d-1', 'd-4'];
export const DEFAULT_SAVED_PLACE_IDS = ['place-1', 'place-3'];

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
