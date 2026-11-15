import { describe, it, expect } from 'vitest';
import { BUS_FALLBACK_ROUTES, BUS_FALLBACK_LAST_UPDATED } from './busFallbackData';

// M33: veri artık npm run scrape:bus ile van.bel.tr'den çekilen GERÇEK
// anlık görüntü. Sabit uzunluk yok — site değiştikçe hat sayısı değişir.
// Sözleşme: en az 30 hat, benzersiz id/hat no, saatli hatların saatleri
// ss:dd biçiminde, dürüst boş alanlar (tarife van.bel.tr'de hiç
// yayımlanmıyor; bazı hatların saatleri sitede yok).
describe('BUS_FALLBACK_ROUTES', () => {
  it('en az 30 hat içerir (gerçek van.bel.tr anlık görüntüsü)', () => {
    expect(BUS_FALLBACK_ROUTES.length).toBeGreaterThanOrEqual(30);
  });

  it('id ve hat numaraları benzersizdir', () => {
    expect(new Set(BUS_FALLBACK_ROUTES.map((r) => r.id)).size).toBe(BUS_FALLBACK_ROUTES.length);
    expect(new Set(BUS_FALLBACK_ROUTES.map((r) => r.lineNo)).size).toBe(BUS_FALLBACK_ROUTES.length);
  });

  it('kaynak damgası (BUS_FALLBACK_LAST_UPDATED) doludur', () => {
    expect(BUS_FALLBACK_LAST_UPDATED.length).toBeGreaterThan(5);
  });

  it('tüm kalkış/dönüş saatleri ss:dd ile başlar', () => {
    // Saat girdileri "HH:MM" veya "HH:MM kalkış-notu" (ör. "13:45 MERKEZ
    // (ARIZALI)") biçiminde olabilir — önek denetlenir.
    const re = /^([01]\d|2[0-3]):[0-5]\d(\s|$)/;
    let timedRoutes = 0;
    for (const route of BUS_FALLBACK_ROUTES) {
      const allTimes = [...route.departureTimes, ...route.returnTimes];
      if (allTimes.length === 0) continue; // saati yayımlanmayan hatlar olabilir
      timedRoutes++;
      for (const t of allTimes) {
        expect(t, `${route.id} hatalı saat: ${t}`).toMatch(re);
      }
    }
    // scrape:bus eşiğiyle aynı: anlık görüntünün en az 10 hattı saatli
    expect(timedRoutes).toBeGreaterThanOrEqual(10);
  });

  it('her hat zorunlu alanları dürüst biçimde taşır', () => {
    for (const route of BUS_FALLBACK_ROUTES) {
      expect(route.title.length, `${route.id} title boş`).toBeGreaterThan(0);
      expect(route.route.length, `${route.id} route boş`).toBeGreaterThan(0);
      expect(route.frequency.length, `${route.id} frequency boş`).toBeGreaterThan(0);
      expect(route.status.length, `${route.id} status boş`).toBeGreaterThan(0);
      // Tarife van.bel.tr'de yayımlanmıyor — M31/M33 dürüstlük: bilinçli boş.
      expect(route.tariff, `${route.id} tariff`).toBe('');
      // Durak/çalışma saati yalnızca saatli hatlarda dolu olabilir
      if (route.departureTimes.length > 0) {
        expect(route.stops.length, `${route.id} durak yok`).toBeGreaterThanOrEqual(2);
        expect(route.operatingHours.length, `${route.id} operatingHours boş`).toBeGreaterThan(0);
      }
    }
  });
});
