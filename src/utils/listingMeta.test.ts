import { describe, it, expect, vi } from 'vitest';
import type { PurchasesPackage } from '@revenuecat/purchases-capacitor';

// listingMeta → purchaseService zinciri @revenuecat/purchases-capacitor'ı
// gerçekten import ediyor; node ortamında Capacitor eklentisini yüklememek
// için modül mock'lanır (yalnızca PACKAGE_IDS sabitine ihtiyaç var).
vi.mock('@revenuecat/purchases-capacitor', () => ({
  Purchases: {},
  LOG_LEVEL: { INFO: 'info', DEBUG: 'debug', WARN: 'warn', ERROR: 'error' },
}));

import { getDealMetaFromPackage, computeEndDate } from './listingMeta';

// PurchasesPackage yalnızca tip olarak kullanılıyor — test için minimal obje
function fakePkg(identifier: string): PurchasesPackage {
  return {
    identifier,
    product: { identifier },
  } as unknown as PurchasesPackage;
}

describe('getDealMetaFromPackage', () => {
  it('öne çıkan üründe 30 gün + isFeatured true döner', () => {
    expect(getDealMetaFromPackage(fakePkg('one_cikan_30_gun'))).toEqual({
      durationDays: 30,
      isFeatured: true,
    });
  });

  it('standart ilan ürününde 30 gün + isFeatured false döner', () => {
    expect(getDealMetaFromPackage(fakePkg('ilan_30_gun'))).toEqual({
      durationDays: 30,
      isFeatured: false,
    });
  });

  it('taksi ürünü de standart ilan meta verisi alır', () => {
    expect(getDealMetaFromPackage(fakePkg('taksi_ilan_aylik'))).toEqual({
      durationDays: 30,
      isFeatured: false,
    });
  });
});

describe('computeEndDate', () => {
  it('verilen tarihe süre kadar gün ekleyip gg.aa.yyyy üretir', () => {
    // 01.01.2026 + 30 gün = 31.01.2026
    expect(computeEndDate(30, new Date(2026, 0, 1))).toBe('31.01.2026');
  });

  it('ay sınırını doğru taşır', () => {
    // 31.01.2026 + 1 gün = 01.02.2026
    expect(computeEndDate(1, new Date(2026, 0, 31))).toBe('01.02.2026');
  });

  it('artık yılı doğru işler', () => {
    // 28.02.2028 + 1 gün = 29.02.2028 (2028 artık yıl)
    expect(computeEndDate(1, new Date(2028, 1, 28))).toBe('29.02.2028');
  });

  it('normal yılda Şubat sonu Mart başına düşer', () => {
    // 28.02.2027 + 1 gün = 01.03.2027 (2027 artık yıl değil)
    expect(computeEndDate(1, new Date(2027, 1, 28))).toBe('01.03.2027');
  });
});
