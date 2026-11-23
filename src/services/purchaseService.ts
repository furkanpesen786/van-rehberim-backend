import { Capacitor } from '@capacitor/core';
import { Purchases, LOG_LEVEL, type PurchasesPackage } from '@revenuecat/purchases-capacitor';
import { isPurchaseCancelled } from '../utils/errors';

/** Product identifiers matching RevenueCat dashboard and Google Play Console */
export const PACKAGE_IDS = {
    ILAN_30_GUN: 'ilan_30_gun',
    ONE_CIKAN_30_GUN: 'one_cikan_30_gun',
    TAKSI_ILAN_AYLIK: 'taksi_ilan_aylik',
} as const;

/** İlan kategorisi — satın alınabilir paket kümesini belirler. */
export type ListingCategory = 'job' | 'deal' | 'taxi';

/**
 * Kategoriye göre satın alınabilir tüketilebilir (consumable) ürün kimlikleri.
 * Fiyatlar RevenueCat Offerings'tan canlı gelir — asla uydurulmaz.
 */
const CATEGORY_PACKAGE_IDS: Record<ListingCategory, readonly string[]> = {
    job: [PACKAGE_IDS.ILAN_30_GUN, PACKAGE_IDS.ONE_CIKAN_30_GUN],
    deal: [PACKAGE_IDS.ILAN_30_GUN, PACKAGE_IDS.ONE_CIKAN_30_GUN],
    taxi: [PACKAGE_IDS.TAKSI_ILAN_AYLIK],
};

/**
 * Tüketilebilir paket satın alma sonucu (Aşama 3 sözleşmesi).
 * - success: mağaza ödemeyi onayladı (customerInfo döndü).
 * - cancelled: kullanıcı ödeme penceresini kendisi kapattı — hata DEĞİLDİR,
 *   form korunur, kullanıcı ekranda tutulur.
 * - transactionId: RevenueCat işlem kimliği (varsa) — sunucu tarafı ödeme
 *   doğrulaması ve Firestore kaydıyla ilişkilendirme için taşınır.
 */
export interface ListingPurchaseResult {
    success: boolean;
    cancelled: boolean;
    transactionId?: string;
}

/**
 * .env.example şablonundaki yer tutucu değerin gerçek anahtar sanılmasını
 * engeller (sahte anahtarla configure çağrısı çalışma anında patlardı).
 */
function isPlaceholderApiKey(apiKey: string): boolean {
    return apiKey.includes('YOUR_') || apiKey.includes('xxxxx');
}

export class PurchaseService {
    private static configured = false;

    /**
     * Initializes RevenueCat. Call once on app start.
     * When the Firebase user changes, call again with their UID to link purchases.
     *
     * Güvenlik katmanları (Aşama 2):
     * - Yalnızca mobil (native) platformda çalışır — web tarayıcısında
     *   eklenti implementation'a sahip değildir; sessizce atlanır, hata vermez.
     * - Eksik veya yer tutucu API anahtarında configure ÇAĞRILMAZ.
     */
    public static async setup(appUserId?: string) {
        if (!Capacitor.isNativePlatform()) {
            console.info('[PurchaseService] Web ortamı — RevenueCat yalnızca mobil platformda etkin, atlandı.');
            return;
        }

        const apiKey = import.meta.env.VITE_REVENUECAT_API_KEY as string | undefined;

        if (!apiKey || apiKey.trim().length === 0) {
            console.error('[PurchaseService] VITE_REVENUECAT_API_KEY eksik. RevenueCat başlatılamadı.');
            return;
        }
        if (isPlaceholderApiKey(apiKey)) {
            console.error(
                '[PurchaseService] VITE_REVENUECAT_API_KEY hâlâ yer tutucu değerde. ' +
                'RevenueCat Dashboard → Project settings → API keys bölümünden gerçek goog_ anahtarı .env dosyasına girilmeli.'
            );
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
     * Kategoriye göre satın alınabilir ilan paketlerini getirir
     * (job/deal → ilan_30_gun + one_cikan_30_gun, taxi → taksi_ilan_aylik).
     * Offerings'ta aktif offering/paket yoksa boş dizi döner.
     */
    public static async getListingPackages(category: ListingCategory): Promise<PurchasesPackage[]> {
        const allowed = CATEGORY_PACKAGE_IDS[category];
        const packages = await this.getPackages();
        return packages.filter((pkg) => allowed.includes(pkg.product.identifier));
    }

    /**
     * Tüketilebilir (consumable) ilan paketi satın alır.
     *
     * @param target ürün kimliği (ör. PACKAGE_IDS.TAKSI_ILAN_AYLIK) YA DA
     *        getListingPackages/getPackageByProductId'den gelen paket nesnesi.
     *
     * Sözleşme:
     *  - Kullanıcı iptali: { success: false, cancelled: true } — Error FIRLATMAZ;
     *    form korunur, kullanıcı ekranda tutulur.
     *  - Mağaza onayı: { success: true, cancelled: false, transactionId? }.
     *  - Ağ/mağaza hatası veya geçersiz paket: anlaşılır Türkçe Error fırlatır.
     */
    public static async purchaseListingPackage(target: string | PurchasesPackage): Promise<ListingPurchaseResult> {
        let aPackage: PurchasesPackage | null;
        if (typeof target === 'string') {
            aPackage = await this.getPackageByProductId(target);
            if (!aPackage) {
                throw new Error('Seçilen ilan paketi şu anda satın alınamıyor. Lütfen daha sonra tekrar deneyiniz.');
            }
        } else {
            aPackage = target;
        }

        if (!aPackage || !aPackage.identifier || !aPackage.product) {
            throw new Error('Geçerli bir satın alma paketi seçilmedi.');
        }

        let result: Awaited<ReturnType<typeof Purchases.purchasePackage>>;
        try {
            result = await Purchases.purchasePackage({ aPackage });
        } catch (e) {
            // M27: SDK'nın resmi önerisi code === PURCHASE_CANCELLED_ERROR
            // kontrolü (userCancelled alanı deprecated); ikisi de denetlenir.
            if (isPurchaseCancelled(e)) {
                return { success: false, cancelled: true };
            }
            console.error('[PurchaseService] Satın alma hatası:', e);
            throw new Error('Ödeme işlemi başarısız oldu. Lütfen tekrar deneyiniz.');
        }

        if (typeof result?.customerInfo === 'undefined') {
            // Beklenmedik SDK yanıtı — sessizce "satın alınmadı" demek yerine
            // dürüst hata: kullanıcı ödediği halde kayıt atlanmasın.
            throw new Error('Ödeme sonucu doğrulanamadı. Lütfen tekrar deneyiniz.');
        }

        return {
            success: true,
            cancelled: false,
            // transaction bazı platform/SDK sürümlerinde gelmeyebilir;
            // sunucu doğrulaması zaten bağımsız yapılır (server/listings.ts).
            transactionId: result.transaction?.transactionIdentifier,
        };
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
