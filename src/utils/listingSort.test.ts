import { describe, it, expect } from 'vitest';
import { listingTimestampMillis, sortByNewestFirst } from './listingSort';

// M30: "En Yeni İlanlar Üstte" sıralaması — Firestore composite index
// istemeden istemci tarafında. Regresyon = yeni ilan listenin altında kalır.

describe('listingTimestampMillis', () => {
  it('Firestore Timestamp benzeri değerden (toMillis) milisaniye üretir', () => {
    expect(listingTimestampMillis({ toMillis: () => 123456 })).toBe(123456);
  });

  it('raw Timestamp şeklinden (seconds) milisaniye üretir', () => {
    expect(listingTimestampMillis({ seconds: 2, nanoseconds: 5 })).toBe(2000);
  });

  it('tanınmayan değerlerde 0 döner', () => {
    expect(listingTimestampMillis(undefined)).toBe(0);
    expect(listingTimestampMillis(null)).toBe(0);
    expect(listingTimestampMillis('2026-11-13')).toBe(0);
    expect(listingTimestampMillis({})).toBe(0);
  });
});

describe('sortByNewestFirst', () => {
  const items = [
    { id: 'old', ts: { seconds: 1 } },
    { id: 'new', ts: { toMillis: () => 3000 } },
    { id: 'mid', ts: { seconds: 2 } },
    { id: 'nots', ts: undefined },
  ];

  it('en yeniden eskiye sıralar, timestamp değeri olmayan sona düşer', () => {
    const sorted = sortByNewestFirst(items, (i) => i.ts);
    expect(sorted.map((i) => i.id)).toEqual(['new', 'mid', 'old', 'nots']);
  });

  it('orijinal diziyi değiştirmez (kopya döner)', () => {
    sortByNewestFirst(items, (i) => i.ts);
    expect(items[0].id).toBe('old');
  });
});
