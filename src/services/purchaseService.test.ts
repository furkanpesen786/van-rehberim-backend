import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { PurchasesPackage } from '@revenuecat/purchases-capacitor';

// RevenueCat Capacitor eklentisi node ortamında çalışmaz — Purchases mock'lanır.
const { getOfferingsMock, purchasePackageMock, configureMock, logInMock, setLogLevelMock, isNativePlatformMock } = vi.hoisted(() => ({
  getOfferingsMock: vi.fn(),
  purchasePackageMock: vi.fn(),
  configureMock: vi.fn(),
  logInMock: vi.fn(),
  setLogLevelMock: vi.fn(),
  isNativePlatformMock: vi.fn(),
}));

vi.mock('@revenuecat/purchases-capacitor', () => ({
  Purchases: {
    getOfferings: getOfferingsMock,
    purchasePackage: purchasePackageMock,
    configure: configureMock,
    logIn: logInMock,
    setLogLevel: setLogLevelMock,
  },
  LOG_LEVEL: { INFO: 'info', DEBUG: 'debug', WARN: 'warn', ERROR: 'error' },
}));

// @capacitor/core da node ortamında native platform algılayamaz — mock'lanır.
vi.mock('@capacitor/core', () => ({
  Capacitor: { isNativePlatform: isNativePlatformMock },
}));

import { PurchaseService, PACKAGE_IDS } from './purchaseService';

function fakePkg(identifier: string): PurchasesPackage {
  return { identifier, product: { identifier } } as unknown as PurchasesPackage;
}

beforeEach(() => {
  getOfferingsMock.mockReset();
  purchasePackageMock.mockReset();
  configureMock.mockReset();
  logInMock.mockReset();
  setLogLevelMock.mockReset();
  isNativePlatformMock.mockReset().mockReturnValue(true);
  // setup()'ın "yalnızca bir kez configure" durumu testler arasında sıfırlanır.
  // (TypeScript'te köşeli parantez erişimi private statik alana izin verir.)
  PurchaseService['configured'] = false;
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

describe('PurchaseService.setup (Aşama 2 güvenlik katmanları)', () => {
  it('web platformunda configure çağırmaz (sessizce atlar)', async () => {
    isNativePlatformMock.mockReturnValue(false);
    vi.stubEnv('VITE_REVENUECAT_API_KEY', 'goog_realkey123');
    await PurchaseService.setup('uid-1');
    expect(configureMock).not.toHaveBeenCalled();
    vi.unstubAllEnvs();
  });

  it('yer tutucu API anahtarıyla configure çağırmaz', async () => {
    vi.stubEnv('VITE_REVENUECAT_API_KEY', 'goog_YOUR_REVENUECAT_GOOGLE_API_KEY');
    await PurchaseService.setup('uid-1');
    expect(configureMock).not.toHaveBeenCalled();
    vi.unstubAllEnvs();
  });

  it('eksik API anahtarında configure çağırmaz', async () => {
    vi.stubEnv('VITE_REVENUECAT_API_KEY', '');
    await PurchaseService.setup('uid-1');
    expect(configureMock).not.toHaveBeenCalled();
    vi.unstubAllEnvs();
  });

  it('geçerli anahtar + uid ile configure eder', async () => {
    vi.stubEnv('VITE_REVENUECAT_API_KEY', 'goog_realkey123');
    await PurchaseService.setup('uid-1');
    expect(configureMock).toHaveBeenCalledTimes(1);
    expect(configureMock).toHaveBeenCalledWith({ apiKey: 'goog_realkey123', appUserID: 'uid-1' });
    vi.unstubAllEnvs();
  });

  it('ikinci setup çağrısında configure etmez, logIn ile uid eşler', async () => {
    vi.stubEnv('VITE_REVENUECAT_API_KEY', 'goog_realkey123');
    await PurchaseService.setup('uid-1');
    await PurchaseService.setup('uid-2');
    expect(configureMock).toHaveBeenCalledTimes(1);
    expect(logInMock).toHaveBeenCalledWith({ appUserID: 'uid-2' });
    vi.unstubAllEnvs();
  });
});

describe('PurchaseService.purchaseListingPackage (eski purchasePackage davranışları)', () => {
  it('geçersiz pakette doğrulama hatası fırlatır', async () => {
    await expect(PurchaseService.purchaseListingPackage(null as unknown as PurchasesPackage)).rejects.toThrow(
      'Geçerli bir satın alma paketi seçilmedi.'
    );
  });
});

describe('PurchaseService.getListingPackages (Aşama 3)', () => {
  it('job kategorisi yalnızca iş ilanı paketlerini döndürür', async () => {
    getOfferingsMock.mockResolvedValue({
      current: {
        availablePackages: [fakePkg('ilan_30_gun'), fakePkg('one_cikan_30_gun'), fakePkg('taksi_ilan_aylik')],
      },
    });
    const packages = await PurchaseService.getListingPackages('job');
    expect(packages.map((p) => p.product.identifier)).toEqual(['ilan_30_gun', 'one_cikan_30_gun']);
  });

  it('taxi kategorisi yalnızca taksi paketini döndürür', async () => {
    getOfferingsMock.mockResolvedValue({
      current: { availablePackages: [fakePkg('ilan_30_gun'), fakePkg('taksi_ilan_aylik')] },
    });
    const packages = await PurchaseService.getListingPackages('taxi');
    expect(packages.map((p) => p.product.identifier)).toEqual(['taksi_ilan_aylik']);
  });
});

describe('PurchaseService.purchaseListingPackage (Aşama 3)', () => {
  it('ürün kimliğiyle çözümleyip başarı + transactionId döner', async () => {
    getOfferingsMock.mockResolvedValue({
      current: { availablePackages: [fakePkg('ilan_30_gun')] },
    });
    purchasePackageMock.mockResolvedValue({
      customerInfo: { entitlements: {} },
      transaction: { transactionIdentifier: 'tx-123' },
    });
    const result = await PurchaseService.purchaseListingPackage('ilan_30_gun');
    expect(result).toEqual({ success: true, cancelled: false, transactionId: 'tx-123' });
  });

  it('paket nesnesiyle doğrudan satın alabilir', async () => {
    purchasePackageMock.mockResolvedValue({ customerInfo: { entitlements: {} } });
    const result = await PurchaseService.purchaseListingPackage(fakePkg('taksi_ilan_aylik'));
    expect(result.success).toBe(true);
    expect(result.cancelled).toBe(false);
  });

  it('kullanıcı iptal ettiğinde hata fırlatmaz, cancelled:true döner', async () => {
    purchasePackageMock.mockRejectedValue({ userCancelled: true });
    const result = await PurchaseService.purchaseListingPackage(fakePkg('ilan_30_gun'));
    expect(result).toEqual({ success: false, cancelled: true });
  });

  it('ağ/mağaza hatasında Türkçe hata fırlatır', async () => {
    purchasePackageMock.mockRejectedValue(new Error('network down'));
    await expect(PurchaseService.purchaseListingPackage(fakePkg('ilan_30_gun'))).rejects.toThrow(
      'Ödeme işlemi başarısız oldu. Lütfen tekrar deneyiniz.'
    );
  });

  it('bulunamayan ürün kimliğinde Türkçe hata fırlatır', async () => {
    getOfferingsMock.mockResolvedValue({
      current: { availablePackages: [fakePkg('ilan_30_gun')] },
    });
    await expect(PurchaseService.purchaseListingPackage('yok_boyle_urun')).rejects.toThrow(
      'Seçilen ilan paketi şu anda satın alınamıyor. Lütfen daha sonra tekrar deneyiniz.'
    );
  });

  it('customerInfo gelmeyen beklenmedik yanıtta dürüst hata fırlatır', async () => {
    purchasePackageMock.mockResolvedValue({});
    await expect(PurchaseService.purchaseListingPackage(fakePkg('ilan_30_gun'))).rejects.toThrow(
      'Ödeme sonucu doğrulanamadı. Lütfen tekrar deneyiniz.'
    );
  });
});
