// M24: DealsView'daki ilan süre/öne çıkarma mantığı test edilebilirlik için
// saf fonksiyon modülüne çıkarıldı (bileşen gövdesinden bağımsız — React
// import'u yok, doğrudan unit test edilebilir).

import type { PurchasesPackage } from '@revenuecat/purchases-capacitor';
import { PACKAGE_IDS } from '../services/purchaseService';

// Satın alınan RevenueCat ürününden ilan süresi ve öne çıkma bilgisi türetir.
// Firestore'a yazılan süre HER ZAMAN buradan gelir — UI'daki seçimle birebir aynıdır.
export function getDealMetaFromPackage(pkg: PurchasesPackage): { durationDays: number; isFeatured: boolean } {
  const productId = pkg.product.identifier;
  if (productId === PACKAGE_IDS.ONE_CIKAN_30_GUN) {
    return { durationDays: 30, isFeatured: true };
  }
  return { durationDays: 30, isFeatured: false };
}

// Seçilen paketin süresine göre gerçek bitiş tarihi üretir (tr-TR, gg.aa.yyyy).
export function computeEndDate(durationDays: number, from: Date = new Date()): string {
  const end = new Date(from.getTime());
  end.setDate(end.getDate() + durationDays);
  return end.toLocaleDateString('tr-TR', { day: '2-digit', month: '2-digit', year: 'numeric' });
}
