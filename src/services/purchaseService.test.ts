import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { PurchasesPackage } from '@revenuecat/purchases-capacitor';

// RevenueCat Capacitor eklentisi node ortamında çalışmaz — Purchases mock'lanır.
const { getOfferingsMock, purchasePackageMock } = vi.hoisted(() => ({
  getOfferingsMock: vi.fn(),
  purchasePackageMock: vi.fn(),
}));

vi.mock('@revenuecat/purchases-capacitor', () => ({
  Purchases: {
    getOfferings: getOfferingsMock,
    purchasePackage: purchasePackageMock,
  },
  LOG_LEVEL: { INFO: 'info', DEBUG: 'debug', WARN: 'warn', ERROR: 'error' },
}));

import { PurchaseService, PACKAGE_IDS } from './purchaseService';

function fakePkg(identifier: string): PurchasesPackage {
  return { identifier, product: { identifier } } as unknown as PurchasesPackage;
}

beforeEach(() => {
  getOfferingsMock.mockReset();
  purchasePackageMock.mockReset();
});

describe('PACKAGE_IDS', () => {
  it('RevenueCat dashboard ile eşleşen ürün kimliklerini taşır', () => {
    expect(PACKAGE_IDS.ILAN_30_GUN).toBe('ilan_30_gun');
    expect(PACKAGE_IDS.ONE_CIKAN_30_GUN).toBe('one_cikan_30_gun');
    expect(PACKAGE_IDS.TAKSI_ILAN_AYLIK).toBe('taksi_ilan_aylik');
  });
});

describe('PurchaseService.getPackageByProductId', () => {
  it('ürün kimliğiyle eşleşen paketi bulur', async () => {
    getOfferingsMock.mockResolvedValue({
      current: { availablePackages: [fakePkg('one_cikan_30_gun'), fakePkg('ilan_30_gun')] },
    });
    const pkg = await PurchaseService.getPackageByProductId('ilan_30_gun');
    expect(pkg?.product.identifier).toBe('ilan_30_gun');
  });

  it('eşleşme yoksa null döner', async () => {
    getOfferingsMock.mockResolvedValue({
      current: { availablePackages: [fakePkg('ilan_30_gun')] },
    });
    const pkg = await PurchaseService.getPackageByProductId('yok_boyle_urun');
    expect(pkg).toBeNull();
  });

  it('aktif offering yoksa null döner (boş paket listesi)', async () => {
    getOfferingsMock.mockResolvedValue({ current: null });
    const pkg = await PurchaseService.getPackageByProductId('ilan_30_gun');
    expect(pkg).toBeNull();
  });
});

describe('PurchaseService.purchasePackage', () => {
  it('başarılı satın almada true döner', async () => {
    purchasePackageMock.mockResolvedValue({ customerInfo: { entitlements: {} } });
    const ok = await PurchaseService.purchasePackage(fakePkg('ilan_30_gun'));
    expect(ok).toBe(true);
  });

  it('kullanıcı iptal ettiğinde hata fırlatmadan false döner', async () => {
    purchasePackageMock.mockRejectedValue({ userCancelled: true });
    const ok = await PurchaseService.purchasePackage(fakePkg('ilan_30_gun'));
    expect(ok).toBe(false);
  });

  it('diğer hatalarda anlaşılır Türkçe hata fırlatır', async () => {
    purchasePackageMock.mockRejectedValue(new Error('network down'));
    await expect(PurchaseService.purchasePackage(fakePkg('ilan_30_gun'))).rejects.toThrow(
      'Ödeme işlemi başarısız oldu. Lütfen tekrar deneyiniz.'
    );
  });

  it('geçersiz pakette doğrulama hatası fırlatır', async () => {
    await expect(PurchaseService.purchasePackage(null as unknown as PurchasesPackage)).rejects.toThrow(
      'Geçerli bir satın alma paketi seçilmedi.'
    );
  });
});
