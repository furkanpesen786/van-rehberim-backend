// server/secretCompare.ts — secret karşılaştırma yardımcısı (tam tarama, 27.11)
//
// TAKEDOWN_SECRET / CACHE_INVALIDATION_SECRET kontrolleri önceden düz
// `provided !== SECRET` string karşılaştırmasıydı. Ağ üzerinden pratik
// sömürüsü çok zor olsa da doğru desen timing-safe karşılaştırmadır:
// node'un timingSafeEqual'i eşit uzunluk ister, bu yüzden uzunluk önce
// denetlenir (uzunluk sızıntısı kabul edilir — içerik sızıntısı yok).

import { timingSafeEqual } from 'crypto';

/**
 * İki secret'ı sabit süreli (timing-safe) karşılaştırır.
 * Eşit değilse (uzunluk dahil) false döner.
 */
export function secretsMatch(provided: string, expected: string): boolean {
  const a = Buffer.from(provided, 'utf8');
  const b = Buffer.from(expected, 'utf8');
  if (a.length !== b.length || a.length === 0) return false;
  return timingSafeEqual(a, b);
}
