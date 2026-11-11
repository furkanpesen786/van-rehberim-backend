import { Purchases, LOG_LEVEL, type PurchasesPackage } from '@revenuecat/purchases-capacitor';

/** Product identifiers matching RevenueCat dashboard and Google Play Console */
export const PACKAGE_IDS = {
    ILAN_30_GUN: 'ilan_30_gun',
    ONE_CIKAN_30_GUN: 'one_cikan_30_gun',
    TAKSI_ILAN_AYLIK: 'taksi_ilan_aylik',
} as const;

export class PurchaseService {
    private static configured = false;

    /**
     * Initializes RevenueCat. Call once on app start.
     * When the Firebase user changes, call again with their UID to link purchases.
     */
    public static async setup(appUserId?: string) {
        const apiKey = import.meta.env.VITE_REVENUECAT_API_KEY as string | undefined;

        if (!apiKey || apiKey.trim().length === 0) {
            console.error('[PurchaseService] VITE_REVENUECAT_API_KEY eksik. RevenueCat başlatılamadı.');
            return;
        }

        try {
            if (!this.configured) {
                await Purchases.setLogLevel({ level: LOG_LEVEL.INFO });
                await Purchases.configure({
                    apiKey,
                    appUserID: appUserId,
                });
                this.configured = true;
                return;
            }

            if (appUserId) {
                await Purchases.logIn({ appUserID: appUserId });
            }
        } catch (e) {
            console.error('[PurchaseService] RevenueCat yapılandırma hatası:', e);
        }
    }

    /**
     * Fetches available packages from the current RevenueCat offering.
     * Returns an empty array when offerings are unavailable (never fabricates prices).
     */
    public static async getPackages(): Promise<PurchasesPackage[]> {
        try {
            const offerings = await Purchases.getOfferings();
            if (offerings.current && offerings.current.availablePackages.length > 0) {
                return offerings.current.availablePackages;
            }
            console.warn('[PurchaseService] Aktif offering veya paket bulunamadı.');
            return [];
        } catch (e) {
            console.error('[PurchaseService] Paketler alınamadı:', e);
            throw new Error('Satın alma paketleri yüklenemedi. Lütfen daha sonra tekrar deneyin.');
        }
    }

    /**
     * Finds a package by store product identifier (e.g. ilan_30_gun).
     */
    public static async getPackageByProductId(productId: string): Promise<PurchasesPackage | null> {
        const packages = await this.getPackages();
        return packages.find((pkg) => pkg.product.identifier === productId) ?? null;
    }

    /**
     * Executes a real Google Play / App Store purchase via RevenueCat.
     * @returns true if purchase succeeded, false if the user cancelled.
     */
    public static async purchasePackage(aPackage: PurchasesPackage): Promise<boolean> {
        if (!aPackage || !aPackage.identifier || !aPackage.product) {
            throw new Error('Geçerli bir satın alma paketi seçilmedi.');
        }

        try {
            const result = await Purchases.purchasePackage({ aPackage });
            return typeof result?.customerInfo !== 'undefined';
        } catch (e) {
            if (e?.userCancelled) {
                return false;
            }
            console.error('[PurchaseService] Satın alma hatası:', e);
            throw new Error('Ödeme işlemi başarısız oldu. Lütfen tekrar deneyiniz.');
        }
    }

    /**
     * Returns current customer info / entitlements from RevenueCat.
     */
    public static async getCustomerInfo() {
        try {
            return await Purchases.getCustomerInfo();
        } catch (e) {
            console.error('[PurchaseService] Müşteri bilgisi alınamadı:', e);
            return null;
        }
    }
}
