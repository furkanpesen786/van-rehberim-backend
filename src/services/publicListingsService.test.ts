import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { fetchListings, clearPublicListingsCache } from './publicListingsService';

// ÖLÇEK DÖNÜŞÜMÜ AŞAMA 4: /api/v1 istemci katmanı — önbellek, düşüş
// (fallback) ve önbellek temizleme davranışları. Node ortamında
// localStorage yoktur; bellek stub'ı takılır, fetch mock'lanır.

class LocalStorageStub {
  private store = new Map<string, string>();
  getItem(key: string): string | null {
    return this.store.get(key) ?? null;
  }
  setItem(key: string, value: string): void {
    this.store.set(key, value);
  }
  removeItem(key: string): void {
    this.store.delete(key);
  }
}

interface Item {
  id: string;
}

function makeOpts(cacheKey: string, fallback: () => Promise<Item[]>) {
  return {
    cacheKey,
    endpoint: `/api/v1/${cacheKey}`,
    responseField: 'items',
    fallback,
  };
}

function jsonResponse(items: Item[]): Response {
  return {
    ok: true,
    json: async () => ({ success: true, count: items.length, items }),
  } as unknown as Response;
}

describe('publicListingsService (aşama 4)', () => {
  beforeEach(() => {
    vi.stubGlobal('localStorage', new LocalStorageStub() as unknown as Storage);
    clearPublicListingsCache();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    clearPublicListingsCache();
  });

  it('API yanıtını döner ve ikinci çağrıda önbellekten verir (fetch bir kez)', async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse([{ id: 'j1' }, { id: 'j2' }]));
    vi.stubGlobal('fetch', fetchMock);
    const fallback = vi.fn().mockResolvedValue([]);

    const first = await fetchListings<Item>(makeOpts('t_cache', fallback));
    expect(first).toEqual([{ id: 'j1' }, { id: 'j2' }]);
    expect(fallback).not.toHaveBeenCalled();

    const second = await fetchListings<Item>(makeOpts('t_cache', fallback));
    expect(second).toEqual([{ id: 'j1' }, { id: 'j2' }]);
    expect(fetchMock).toHaveBeenCalledTimes(1); // önbellek: yeniden istek yok
  });

  it('API hata verirse doğrudan Firestore düşüşüne geçer', async () => {
    const fetchMock = vi.fn().mockRejectedValue(new Error('network down'));
    vi.stubGlobal('fetch', fetchMock);
    const fallback = vi.fn().mockResolvedValue([{ id: 'f1' }]);

    const result = await fetchListings<Item>(makeOpts('t_fallback', fallback));
    expect(result).toEqual([{ id: 'f1' }]);
    expect(fallback).toHaveBeenCalledTimes(1);
  });

  it('HTTP hata durumunda (502/503 vb.) da düşüşe geçer', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: false, status: 502 } as unknown as Response);
    vi.stubGlobal('fetch', fetchMock);
    const fallback = vi.fn().mockResolvedValue([{ id: 'f2' }]);

    const result = await fetchListings<Item>(makeOpts('t_http502', fallback));
    expect(result).toEqual([{ id: 'f2' }]);
    expect(fallback).toHaveBeenCalledTimes(1);
  });

  it('yanıt biçimi beklenmedikse (success yok) düşüşe geçer', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ error: 'başka bir şey' }),
    } as unknown as Response);
    vi.stubGlobal('fetch', fetchMock);
    const fallback = vi.fn().mockResolvedValue([{ id: 'f3' }]);

    const result = await fetchListings<Item>(makeOpts('t_badshape', fallback));
    expect(result).toEqual([{ id: 'f3' }]);
    expect(fallback).toHaveBeenCalledTimes(1);
  });

  it('clearPublicListingsCache sonrası yeniden istek atılır', async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse([{ id: 'j1' }]));
    vi.stubGlobal('fetch', fetchMock);
    const fallback = vi.fn().mockResolvedValue([]);

    await fetchListings<Item>(makeOpts('t_clear', fallback));
    clearPublicListingsCache('t_clear');
    await fetchListings<Item>(makeOpts('t_clear', fallback));

    expect(fetchMock).toHaveBeenCalledTimes(2); // önbellek temizlendi → yeniden istek
  });

  it('aynı anahtarın paralel çağrıları tek fetch içinde birleşir', async () => {
    let resolveFetch: ((r: Response) => void) | undefined;
    const fetchMock = vi.fn().mockImplementation(
      () => new Promise<Response>((resolve) => { resolveFetch = resolve; }),
    );
    vi.stubGlobal('fetch', fetchMock);
    const fallback = vi.fn().mockResolvedValue([]);

    const p1 = fetchListings<Item>(makeOpts('t_parallel', fallback));
    const p2 = fetchListings<Item>(makeOpts('t_parallel', fallback));
    resolveFetch?.(jsonResponse([{ id: 'p1' }]));

    const [r1, r2] = await Promise.all([p1, p2]);
    expect(r1).toEqual([{ id: 'p1' }]);
    expect(r2).toEqual([{ id: 'p1' }]);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});
