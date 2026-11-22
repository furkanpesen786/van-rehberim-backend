import { initializeApp, getApps, getApp } from 'firebase/app';
// M32: ölü importlar (signInWithPopup/signOut/onAuthStateChanged/User/
// getFirestore) kaldırıldı — Auth akışı Capacitor/yerel kullanımda bu
// modülün dışında hallediliyor.
import {
  getAuth,
  GoogleAuthProvider,
} from 'firebase/auth';
import {
  initializeFirestore,
  collection,
  doc,
  setDoc,
  query,
  getDocs,
  Timestamp,
  where,
} from 'firebase/firestore';
import type { JobListing } from '../types';
// M30: ilanlar createdAtTimestamp'e göre en yeniden eskiye sıralanır
import { sortByNewestFirst } from '../utils/listingSort';
// ÖLÇEK DÖNÜŞÜMÜ AŞAMA 4: liste verisi artık /api/v1'den (sunucu tarafı
// önbellekli) çekilir; aşağıdaki subscribe* fonksiyonları bu katmana
// delege eder. Firestore'a doğrudan sorgu yalnızca düşüş (fallback)
// olarak kalır — bkz. src/services/publicListingsService.ts.
import { fetchListings } from '../services/publicListingsService';

// M21+M26: Firestore ham doküman tipleri — CANONICAL şema. Tek yazma yolu
// (server/listings.ts LISTING_TYPES) yalnızca bu alan adlarını yazar.
// 12.11.2026 salt okunur denetim (scripts/firestore-schema-audit.ts): üç
// koleksiyon da BOŞ çıktı — eski istemci-tarafı yazımlardan kalma alan adı
// varyantlarına (storeName/baslik/oran/soforAdi/plaka/...) artık rastlanmaz,
// bu yüzden varyant toleransı kaldırıldı. Ham doküman → uygulama modeli
// dönüşümü: utils/dealMapping.ts (deal) ve HomeView taksi eşlemesi.
export interface RawDealDoc {
  id: string;
  isletmeAdi?: string;
  kategori?: string;
  indirimKodu?: string;
  indirimDegeri?: string;
  indirimMetni?: string;
  image?: string;
  images?: string[];
  phone?: string;
  locationName?: string;
  description?: string;
  startDate?: string;
  endDate?: string;
  isFeatured?: boolean;
}

export interface RawTaxiDoc {
  id: string;
  name?: string;
  driverName?: string;
  phone?: string;
  plate?: string;
  operatingRegions?: string;
  district?: string;
  subscriptionPlan?: 'FIRST_MONTH_FREE' | 'PAID';
  monthlyFee?: string;
  createdAt?: string;
}

const firebaseConfig = {
  apiKey: "AIzaSyCH3N-PpKQ92bjg9aCDQdwcL74r0Jkidzc",
  authDomain: "vanrehberim-f181b.firebaseapp.com",
  projectId: "vanrehberim-f181b",
  storageBucket: "vanrehberim-f181b.firebasestorage.app",
  messagingSenderId: "209812036114",
  appId: "1:209812036114:web:d80da68239ecbc56f456cb",
  measurementId: "G-QSRGDJ0P91"
};

const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();

export const db = initializeFirestore(app, {
  // BİLİNÇLİ KARAR (M22): Bu flag kaldırılmamalı. capacitor.config.ts'te
  // CapacitorHttp açık; o, WebView'daki tüm fetch/XHR'yi native katmana
  // yönlendirir ve akış (streaming) yanıtlarını tamponlar. Firestore'un
  // varsayılan WebChannel transport'u XHR akışına dayanır — CapacitorHttp
  // altında onSnapshot canlı dinleyicileri Android'de çalışmaz.
  // Long-polling her istekte tam yanıt aldığı için bu kombinasyonda
  // güvenilir tek yoldur. CapacitorHttp kapatılırsa bu flag de kaldırılmalı.
  experimentalForceLongPolling: true,
});

// User Profile interface for App
export interface UserProfile {
  uid: string;
  email: string;
  displayName?: string;
  photoURL?: string;
  loginMethod: 'email' | 'google' | 'apple';
  createdAt: string;
  lastLoginAt: string;
}

// Save or Update User in Firebase Firestore
export async function saveUserToFirestore(profile: UserProfile) {
  try {
    const userRef = doc(db, 'users', profile.uid);
    await setDoc(userRef, {
      ...profile,
      updatedAt: new Date().toISOString(),
    }, { merge: true });
  } catch (err) {
    console.error('Error saving user to Firestore:', err);
  }
}

// Subscribe to Job Listings
// ÖLÇEK DÖNÜŞÜMÜ AŞAMA 4: onSnapshot aboneliği kaldırıldı — her görünüm
// mount'ında koleksiyonun tamamı Firestore'dan okunuyordu (kota yakıcı).
// Artık publicListingsService /api/v1/jobs'u çeker (2 dk istemci önbelleği
// + 4 sn timeout); API erişilemezse aşağıdaki tek seferlik Firestore
// sorgusuna düşülür. İMZA DEĞİŞMEDİ — çağıran görünümler (JobsView)
// aynı şekilde çalışır; abonelik artık "tek atım" olduğundan geri çağırma
// mount başına bir kez tetiklenir.
async function fetchJobsFromFirestore(): Promise<JobListing[]> {
  // PRODUCTION: Yalnızca bitiş tarihi geçmemiş (aktif) ilanları getir
  const q = query(
    collection(db, 'is_ilanlari'),
    where('bitisTarihi', '>', Timestamp.now())
  );
  const snapshot = await getDocs(q);
  // M30: "En Yeni İlanlar Üstte" — createdAtTimestamp desc (composite
  // index istemeden, istemci tarafında). Timestamp'u olmayan eski
  // kayıtlar sona düşer.
  const docs = sortByNewestFirst(snapshot.docs, (d) => d.data().createdAtTimestamp);
  // Firestore/API verisi tipsizdir — güvenilir tek cast noktası burasıdır
  return docs.map((d) => ({
    id: d.id,
    ...d.data(),
  })) as JobListing[];
}

export function subscribeJobListings(callback: (jobs: JobListing[]) => void, onError?: (error: unknown) => void) {
  let cancelled = false;
  void (async () => {
    try {
      const jobs = await fetchListings<JobListing>({
        cacheKey: 'van_public_v1_jobs',
        endpoint: '/api/v1/jobs',
        responseField: 'jobs',
        fallback: fetchJobsFromFirestore,
      });
      if (!cancelled) callback(jobs);
    } catch (err) {
      console.warn('İş ilanları yüklenemedi:', err);
      if (!cancelled) onError?.(err);
    }
  })();
  return () => { cancelled = true; };
}

// NOT (M5): addJobListingToFirestore / addDealToFirestore / addTaxiToFirestore
// kaldırıldı — ücretli ilanlar artık backend üzerinden yayımlanır
// (src/services/listingService.ts → server/listings.ts). İstemciden doğrudan
// Firestore'a ilan yazma yolu kapatıldı; güvenlik kuralları da create'i
// istemciye kapatır.

// Subscribe to Deals (indirim_ilanlari koleksiyonu)
// Aşama 4 — yukarıdaki subscribeJobListings açıklaması burada da geçerli:
// veri /api/v1/deals'tan gelir (DealsView + SettingsView ikisi de bu
// fonksiyonu kullanır; publicListingsService paralel çağrıları tek
// istekte birleştirir).
async function fetchDealsFromFirestore(): Promise<RawDealDoc[]> {
  const q = query(
    collection(db, 'indirim_ilanlari'),
    where('bitisTarihi', '>', Timestamp.now())
  );
  const snapshot = await getDocs(q);
  // M30: "En Yeni İlanlar Üstte" — createdAtTimestamp desc (composite
  // index istemeden, istemci tarafında). Timestamp'u olmayan eski
  // kayıtlar sona düşer.
  const docs = sortByNewestFirst(snapshot.docs, (d) => d.data().createdAtTimestamp);
  // Firestore/API verisi tipsizdir — güvenilir tek cast noktası burasıdır
  return docs.map((d) => ({
    id: d.id,
    ...d.data(),
  })) as RawDealDoc[];
}

export function subscribeDeals(callback: (deals: RawDealDoc[]) => void, onError?: (error: unknown) => void) {
  let cancelled = false;
  void (async () => {
    try {
      const deals = await fetchListings<RawDealDoc>({
        cacheKey: 'van_public_v1_deals',
        endpoint: '/api/v1/deals',
        responseField: 'deals',
        fallback: fetchDealsFromFirestore,
      });
      if (!cancelled) callback(deals);
    } catch (err) {
      console.warn('İndirim ilanları yüklenemedi:', err);
      if (!cancelled) onError?.(err);
    }
  })();
  return () => { cancelled = true; };
}

// M32: saveUserFavoritesToFirestore / getUserFavoritesFromFirestore
// kaldırıldı — favoriler M28'den beri yalnızca yerel (localStorage +
// SavedItemsContext); çağıran kimse kalmamıştı. Firestore'daki
// userFavorites dokümanı hesap silme akışında (M35: sunucu tarafında,
// /api/account/delete) temizlenir.

// M35: deleteAllUserData (M13, KVKK hesap silme) istemciden KALDIRILDI —
// CapacitorHttp altında Firestore web SDK yazmaları asla sonuçlanmıyordu
// (M34 teşhisi: "Firestore verilerinin silinmesi" adımı 20 sn'de tamamlanamadı).
// Silme artık sunucuda Admin SDK ile yapılır: POST /api/account/delete
// (server/account.ts + src/services/accountService.ts). Orada M13 kapsamı
// aynen korunur: profil + favoriler + üç ilan koleksiyonunda userId eşleşmeli
// dokümanlar, ardından Auth kaydı.

// Subscribe to Taxis (taksiler koleksiyonu)
// Aşama 4 — yukarıdaki subscribeJobListings açıklaması burada da geçerli:
// veri /api/v1/taxis'ten gelir (HomeView).
async function fetchTaxisFromFirestore(): Promise<RawTaxiDoc[]> {
  const q = query(
    collection(db, 'taksiler'),
    where('bitisTarihi', '>', Timestamp.now())
  );
  const snapshot = await getDocs(q);
  // M30: "En Yeni İlanlar Üstte" — createdAtTimestamp desc (composite
  // index istemeden, istemci tarafında). Timestamp'u olmayan eski
  // kayıtlar sona düşer.
  const docs = sortByNewestFirst(snapshot.docs, (d) => d.data().createdAtTimestamp);
  // Firestore/API verisi tipsizdir — güvenilir tek cast noktası burasıdır
  return docs.map((d) => ({
    id: d.id,
    ...d.data(),
  })) as RawTaxiDoc[];
}

export function subscribeTaxis(callback: (taxis: RawTaxiDoc[]) => void, onError?: (error: unknown) => void) {
  let cancelled = false;
  void (async () => {
    try {
      const taxis = await fetchListings<RawTaxiDoc>({
        cacheKey: 'van_public_v1_taxis',
        endpoint: '/api/v1/taxis',
        responseField: 'taxis',
        fallback: fetchTaxisFromFirestore,
      });
      if (!cancelled) callback(taxis);
    } catch (err) {
      console.warn('Taksi ilanları yüklenemedi:', err);
      if (!cancelled) onError?.(err);
    }
  })();
  return () => { cancelled = true; };
}

