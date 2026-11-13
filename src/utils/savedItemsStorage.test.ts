import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  loadSavedIds,
  saveSavedIds,
  SAVED_DEALS_KEY,
  SAVED_PLACES_KEY,
  DEFAULT_SAVED_DEAL_IDS,
  DEFAULT_SAVED_PLACE_IDS,
  filterGhostDealIds,
  filterGhostPlaceIds,
} from './savedItemsStorage';

// M28 (17/17): favori ID listelerinin kalıcılığı SavedItemsContext'in
// temeli. Regresyon = kullanıcı favorileri kaybolur / bozuk veri çöker.

// node ortamında localStorage yok — sahte uygulama enjekte edilir.
function createFakeLocalStorage() {
  const store = new Map<string, string>();
  return {
    getItem: (key: string) => store.get(key) ?? null,
    setItem: (key: string, value: string) => void store.set(key, value),
    removeItem: (key: string) => void store.delete(key),
    clear: () => store.clear(),
    key: (index: number) => [...store.keys()][index] ?? null,
    get length() {
      return store.size;
    },
  };
}

beforeEach(() => {
  vi.stubGlobal('localStorage', createFakeLocalStorage());
});

describe('loadSavedIds', () => {
  it('kayıtlı geçerli listeyi döner', () => {
    saveSavedIds(SAVED_DEALS_KEY, ['a', 'b']);
    expect(loadSavedIds(SAVED_DEALS_KEY, [])).toEqual(['a', 'b']);
  });

  it('kayıt yoksa fallback döner', () => {
    expect(loadSavedIds(SAVED_DEALS_KEY, DEFAULT_SAVED_DEAL_IDS)).toEqual(
      DEFAULT_SAVED_DEAL_IDS
    );
  });

  it('bozuk JSON’da fallback döner (çökmez)', () => {
    localStorage.setItem(SAVED_DEALS_KEY, '{bozuk json');
    expect(loadSavedIds(SAVED_DEALS_KEY, ['fb'])).toEqual(['fb']);
  });

  it('dizi olmayan / string olmayan elemanlı veride fallback döner', () => {
    localStorage.setItem(SAVED_DEALS_KEY, JSON.stringify({ id: 'x' }));
    expect(loadSavedIds(SAVED_DEALS_KEY, ['fb'])).toEqual(['fb']);
    localStorage.setItem(SAVED_DEALS_KEY, JSON.stringify([1, 2]));
    expect(loadSavedIds(SAVED_DEALS_KEY, ['fb'])).toEqual(['fb']);
  });
});

describe('saveSavedIds', () => {
  it('listeyi JSON olarak yazar ve geri okur', () => {
    saveSavedIds(SAVED_DEALS_KEY, ['x-1', 'x-2']);
    expect(JSON.parse(localStorage.getItem(SAVED_DEALS_KEY) ?? '[]')).toEqual([
      'x-1',
      'x-2',
    ]);
  });
});

// M29: eski sürümler DEALS mock'undaki (boş) d-1..d-4 hayalet id'lerini ve
// gerçek p-1/p-3 yerine place-1/place-3 yazıyordu — favoriye eklenen ilan
// asla görünmüyordu. Varsayılanlar + hayalet süzme regresyonu.
describe('M29 hayalet id temizliği', () => {
  it('ilan varsayılanı boştur (d-1/d-4 hayaletleri yok)', () => {
    expect(DEFAULT_SAVED_DEAL_IDS).toEqual([]);
  });

  it('yer varsayılanları GERÇEK place id\'leridir (p-1, p-3)', () => {
    expect(DEFAULT_SAVED_PLACE_IDS).toEqual(['p-1', 'p-3']);
  });

  it('filterGhostDealIds hayalet ilan id\'lerini süzer, gerçekleri korur', () => {
    expect(filterGhostDealIds(['d-1', 'fs-1', 'd-4', 'fs-2', 'd-2'])).toEqual([
      'fs-1',
      'fs-2',
    ]);
  });

  it('filterGhostPlaceIds hayalet place-* id\'lerini süzer, gerçek p-* korur', () => {
    expect(filterGhostPlaceIds(['place-1', 'p-1', 'place-3', 'p-3', 'p-5'])).toEqual([
      'p-1',
      'p-3',
      'p-5',
    ]);
  });

  it('hayalet içermeyen liste değişmeden geçer', () => {
    expect(filterGhostDealIds(['fs-9'])).toEqual(['fs-9']);
    expect(filterGhostPlaceIds(['p-9'])).toEqual(['p-9']);
  });

  it('eski hayalet varsayılanlar depodayken süzülmüş liste yüklenir', () => {
    saveSavedIds(SAVED_DEALS_KEY, ['d-1', 'd-4']);
    expect(filterGhostDealIds(loadSavedIds(SAVED_DEALS_KEY, []))).toEqual([]);
    saveSavedIds(SAVED_PLACES_KEY, ['place-1', 'place-3']);
    expect(filterGhostPlaceIds(loadSavedIds(SAVED_PLACES_KEY, []))).toEqual([]);
  });
});
