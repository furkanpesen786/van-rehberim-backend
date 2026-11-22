// M30: "En Yeni İlanlar Üstte" — Firestore tarafında
// orderBy('createdAtTimestamp', 'desc') composite index ister (her koleksiyon
// için Console'da elle oluşturulur); sıralama istemci tarafında yapılır.
// server/listings.ts her ilana createdAtTimestamp: serverTimestamp() yazar;
// eski/yerel kayıtlarda alan yoktur → bunlar listenin sonuna düşer.

interface TimestampLike {
  toMillis?: () => number;
  seconds?: number | string;
}

/**
 * Firestore Timestamp benzeri bir değerden milisaniye üretir.
 * Tanınmayan değerlerde 0 döner (sıralamada sona düşer).
 *
 * Aşama 4 notu: /api/v1 yanıtlarında Timestamp alanları JSON'a
 * {seconds, nanoseconds} olarak serileşir. `seconds` çoğunlukla sayıdır;
 * string gelirse (bazı SDK serileştirme biçimleri int64'ü string yapar)
 * sayıya çevrilir.
 */
export function listingTimestampMillis(value: unknown): number {
  if (!value || typeof value !== 'object') return 0;
  const v = value as TimestampLike;
  if (typeof v.toMillis === 'function') return v.toMillis();
  if (typeof v.seconds === 'number') return v.seconds * 1000;
  if (typeof v.seconds === 'string' && v.seconds.trim() !== '') {
    const parsed = Number(v.seconds);
    if (Number.isFinite(parsed)) return parsed * 1000;
  }
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
