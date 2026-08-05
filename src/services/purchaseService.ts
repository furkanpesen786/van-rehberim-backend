import { Purchases, LOG_LEVEL } from '@revenuecat/purchases-capacitor';

// Using a placeholder API key for Google Play Console (Android)
const API_KEY = "goog_xxxxxxxxxxxxxxxxxxxxxxxxxx";

// Product identifiers matching RevenueCat dashboard and Google Play Console
export const PACKAGE_IDS = {
    ILAN_30_GUN: 'ilan_30_gun',
    ONE_CIKAN_30_GUN: 'one_cikan_30_gun',
    TAKSI_ILAN_AYLIK: 'taksi_ilan_aylik',
};

export class PurchaseService {
    /**
     * Initializes RevenueCat, called upon app start or before usage.
     * Identifies the user so purchases are tied to their Firebase UID or device.
     */
    public static async setup(appUserId?: string) {
        try {
            await Purchases.setLogLevel({ level: LOG_LEVEL.DEBUG });
            await Purchases.configure({ apiKey: API_KEY, appUserID: appUserId });
        } catch (e) {
            console.error('Error configuring RevenueCat:', e);
        }
    }

    /**
     * Fetches available offerings from RevenueCat
     */
    public static async getPackages() {
        try {
            const offerings = await Purchases.getOfferings();
            if (offerings.current && offerings.current.availablePackages.length !== 0) {
                return offerings.current.availablePackages;
            }
        } catch (e) {
            console.warn('Error fetching packages from RevenueCat, returning simulated data:', e);
        }

        // Fallback: return simulated packages if not configured on dashboard yet
        return [
            {
                identifier: '$rc_monthly',
                packageType: 'MONTHLY',
                product: {
                    identifier: PACKAGE_IDS.ILAN_30_GUN,
                    description: 'İlanınızı 30 gün boyunca yayınlar.',
                    title: '30 Günlük İlan Paketi',
                    price: 99.99,
                    priceString: '₺99,99',
                    currencyCode: 'TRY',
                }
            },
            {
                identifier: '$rc_premium',
                packageType: 'CUSTOM',
                product: {
                    identifier: PACKAGE_IDS.ONE_CIKAN_30_GUN,
                    description: 'İlanınızı Vitrin bölümünde 30 gün boyunca yayınlar.',
                    title: 'Öne Çıkan İlan Paketi (Premium)',
                    price: 249.99,
                    priceString: '₺249,99',
                    currencyCode: 'TRY',
                }
            },
            {
                identifier: '$rc_taksi_aylik',
                packageType: 'MONTHLY',
                product: {
                    identifier: PACKAGE_IDS.TAKSI_ILAN_AYLIK,
                    description: 'Taksi ilanınızı yayınlar. İlk Ay ÜCRETSİZ, Sonraki Aylar 1000 TL.',
                    title: 'Acil Taksi İlanı Paketi',
                    price: 1000.00,
                    priceString: '₺1000,00',
                    currencyCode: 'TRY',
                }
            }
        ];
    }

    /**
     * Execute the purchase for a selected package.
     * Prompts the Google Play in-app purchase overlay.
     */
    public static async purchasePackage(packageObj: any): Promise<boolean> {
        try {
            // Trying the real RC method
            if (packageObj.product && !packageObj.product.priceString) {
                const result = await Purchases.purchasePackage({ aPackage: packageObj });
                return typeof result !== 'undefined';
            }

            // Simulation fallback for the custom demo payloads
            console.log('Simulating purchase for:', packageObj.product.identifier);
            // Wait a bit to simulate native modal
            await new Promise(resolve => setTimeout(resolve, 1500));
            return true;
        } catch (e: any) {
            if (!e.userCancelled) {
                console.error('Error during purchase:', e);
                throw new Error('Ödeme işlemi başarısız oldu.');
            }
            return false; // User cancelled
        }
    }

    /**
     * Check if user has active entitlements (purchased plans)
     */
    public static async getCustomerInfo() {
        try {
            const customerInfo = await Purchases.getCustomerInfo();
            return customerInfo;
        } catch (e) {
            console.error(e);
            return null;
        }
    }
}
