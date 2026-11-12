import { describe, it, expect } from 'vitest';
import { BUS_FALLBACK_ROUTES } from './busFallbackData';

// M20 çıkarımının duman testi: veri modülü şekil sözleşmesini korumalı.
// /api/bus-schedules van.bel.tr'ye erişemezse bu veriden döner (isLive:false).
describe('BUS_FALLBACK_ROUTES', () => {
  it('30 hat içerir (b-1 .. b-30)', () => {
    expect(BUS_FALLBACK_ROUTES).toHaveLength(30);
    expect(BUS_FALLBACK_ROUTES[0].id).toBe('b-1');
    expect(BUS_FALLBACK_ROUTES[29].id).toBe('b-30');
  });

  it('id ve hat numaraları benzersizdir', () => {
    expect(new Set(BUS_FALLBACK_ROUTES.map((r) => r.id)).size).toBe(30);
    expect(new Set(BUS_FALLBACK_ROUTES.map((r) => r.lineNo)).size).toBe(30);
  });

  it('tüm kalkış/dönüş saatleri ss:dd biçimindedir', () => {
    const re = /^([01]\d|2[0-3]):[0-5]\d$/;
    for (const route of BUS_FALLBACK_ROUTES) {
      const allTimes = [...route.departureTimes, ...route.returnTimes];
      expect(allTimes.length).toBeGreaterThan(0);
      for (const t of allTimes) {
        expect(t, `${route.id} hatalı saat: ${t}`).toMatch(re);
      }
    }
  });

  it('her hat zorunlu alanları dolu taşır', () => {
    for (const route of BUS_FALLBACK_ROUTES) {
      expect(route.title.length, `${route.id} title boş`).toBeGreaterThan(0);
      expect(route.route.length, `${route.id} route boş`).toBeGreaterThan(0);
      expect(route.stops.length, `${route.id} durak yok`).toBeGreaterThanOrEqual(3);
      expect(route.frequency.length, `${route.id} frequency boş`).toBeGreaterThan(0);
      expect(route.tariff.length, `${route.id} tariff boş`).toBeGreaterThan(0);
      expect(route.operatingHours.length, `${route.id} operatingHours boş`).toBeGreaterThan(0);
    }
  });
});
