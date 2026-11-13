import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  loadSavedIds,
  saveSavedIds,
  SAVED_DEALS_KEY,
  DEFAULT_SAVED_DEAL_IDS,
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
