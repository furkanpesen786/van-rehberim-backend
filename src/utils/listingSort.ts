// M30: "En Yeni İlanlar Üstte" — Firestore tarafında
// orderBy('createdAtTimestamp', 'desc') composite index ister (her koleksiyon
// için Console'da elle oluşturulur); sıralama istemci tarafında yapılır.
// server/listings.ts her ilana createdAtTimestamp: serverTimestamp() yazar;
// eski/yerel kayıtlarda alan yoktur → bunlar listenin sonuna düşer.

interface TimestampLike {
  toMillis?: () => number;
  seconds?: number;
}

/**
 * Firestore Timestamp benzeri bir değerden milisaniye üretir.
 * Tanınmayan değerlerde 0 döner (sıralamada sona düşer).
 */
export function listingTimestampMillis(value: unknown): number {
  if (!value || typeof value !== 'object') return 0;
  const v = value as TimestampLike;
  if (typeof v.toMillis === 'function') return v.toMillis();
  if (typeof v.seconds === 'number') return v.seconds * 1000;
  return 0;
}

/**
 * Öğeleri verilen timestamp alanına göre en yeniden eskiye sıralar
 * (orijinal diziyi değiştirmez — kopya döner).
 */
export function sortByNewestFirst<T>(items: T[], getTimestamp: (item: T) => unknown): T[] {
  return [...items].sort(
    (a, b) => listingTimestampMillis(getTimestamp(b)) - listingTimestampMillis(getTimestamp(a))
  );
}
