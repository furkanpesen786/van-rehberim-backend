import { initializeApp, getApps, getApp } from 'firebase/app';
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signOut,
  onAuthStateChanged,
  User,
} from 'firebase/auth';
import {
  getFirestore,
  initializeFirestore,
  collection,
  doc,
  setDoc,
  getDoc,
  getDocs,
  deleteDoc,
  query,
  onSnapshot,
  Timestamp,
  where,
} from 'firebase/firestore';
import type { JobListing } from '../types';

// M21: Firestore ham doküman tipleri. Koleksiyonlarda şema normalizasyonu
// (denetim maddesi 15) tamamlanana kadar Türkçe/İngilizce alan karışımı var;
// bileşenler bu ham tipleri alıp kendi mapping'inde normalize ediyor. Bu
// arayüzler bilinen tüm alan varyantlarını belgeler — bilinmeyen bir alan
// adı kullanılırsa artık derleme hatası verir.
export interface RawDealDoc {
  id: string;
  isletmeAdi?: string; storeName?: string; name?: string; title?: string;
  indirimKodu?: string; dealTitle?: string; baslik?: string;
  indirimDegeri?: string; discountRate?: string; indirimMiktari?: string; oran?: string;
  kategori?: string; category?: string;
  image?: string; images?: string[]; photoUrl?: string;
  locationName?: string; district?: string; ilce?: string; konum?: string;
  description?: string; aciklama?: string; detay?: string;
  startDate?: string; endDate?: string; address?: string;
}

export interface RawTaxiDoc {
  id: string;
  name?: string; isim?: string; title?: string;
  driverName?: string; soforAdi?: string;
  phone?: string; telefon?: string; tel?: string;
  plate?: string; plaka?: string; taxiPlate?: string;
  operatingRegions?: string; calismaBolgeleri?: string; bolgeler?: string; regions?: string;
  district?: string; ilce?: string; mahalle?: string;
  monthlyFee?: string; aylikUcret?: string; fee?: string;
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

// Subscribe to Job Listings from Firebase Firestore
export function subscribeJobListings(callback: (jobs: JobListing[]) => void) {
  try {
    // PRODUCTION: Yalnızca bitiş tarihi geçmemiş (aktif) ilanları getir
    const q = query(
      collection(db, 'is_ilanlari'),
      where('bitisTarihi', '>', Timestamp.now())
    );
    return onSnapshot(q, (snapshot) => {
      // Firestore verisi tipsizdir — güvenilir tek cast noktası burasıdır
      const jobs = snapshot.docs.map((d) => ({
        id: d.id,
        ...d.data(),
      })) as JobListing[];
      callback(jobs);
    }, (error) => {
      console.warn('Firestore is_ilanlari snapshot warning:', error);
    });
  } catch (err) {
    console.error('Error setting up job listings listener:', err);
    return () => { };
  }
}

// NOT (M5): addJobListingToFirestore / addDealToFirestore / addTaxiToFirestore
// kaldırıldı — ücretli ilanlar artık backend üzerinden yayımlanır
// (src/services/listingService.ts → server/listings.ts). İstemciden doğrudan
// Firestore'a ilan yazma yolu kapatıldı; güvenlik kuralları da create'i
// istemciye kapatır.

// Subscribe to Deals from Firebase Firestore (indirim_ilanlari koleksiyonu)
export function subscribeDeals(callback: (deals: RawDealDoc[]) => void) {
  try {
    const q = query(
      collection(db, 'indirim_ilanlari'),
      where('bitisTarihi', '>', Timestamp.now())
    );
    return onSnapshot(q, (snapshot) => {
      // Firestore verisi tipsizdir — güvenilir tek cast noktası burasıdır
      const deals = snapshot.docs.map((d) => ({
        id: d.id,
        ...d.data(),
      })) as RawDealDoc[];
      callback(deals);
    }, (error) => {
      console.warn('Firestore indirim_ilanlari snapshot warning:', error);
    });
  } catch (err) {
    console.error('Error setting up deals listener:', err);
    return () => { };
  }
}

// Save User Favorites to Firebase Firestore
export async function saveUserFavoritesToFirestore(userId: string, favorites: { savedJobs?: string[]; savedDeals?: string[]; savedPlaces?: string[] }) {
  try {
    const favRef = doc(db, 'userFavorites', userId);
    await setDoc(favRef, {
      ...favorites,
      updatedAt: new Date().toISOString(),
    }, { merge: true });
  } catch (err) {
    console.error('Error saving user favorites to Firestore:', err);
  }
}

// Get User Favorites from Firebase Firestore
export async function getUserFavoritesFromFirestore(userId: string) {
  try {
    const favRef = doc(db, 'userFavorites', userId);
    const snapshot = await getDoc(favRef);
    if (snapshot.exists()) {
      return snapshot.data();
    }
  } catch (err) {
    console.error('Error getting user favorites:', err);
  }
  return null;
}

// M13 (KVKK): Hesap silme — Auth kaydı silinmeden ÖNCE çağrılır. Kullanıcının
// Firestore'daki tüm verisini siler: profil dokümanı, favoriler ve kendi
// ilanları (is_ilanlari / indirim_ilanlari / taksiler, userId == uid).
// Güvenlik kuralları sahibin bu silmeleri yapmasına izin verir; Auth kaydı
// silindikten sonra kurallar reddederdi — bu yüzden sıra önemli.
// NOT: M2 öncesi oluşturulmuş (userId alanı olmayan) eski ilanlar bu sorguya
// yakalanmaz — onlar yalnızca Firebase Console'dan silinebilir (bilinen sınır).
export async function deleteAllUserData(userId: string): Promise<void> {
  // 1) Profil dokümanı
  await deleteDoc(doc(db, 'users', userId));

  // 2) Favoriler (doküman yoksa silme no-op'tur, hata vermez)
  await deleteDoc(doc(db, 'userFavorites', userId));

  // 3) Kullanıcının ilanları — üç koleksiyonda userId eşleşmeli silme
  const listingCollections = ['is_ilanlari', 'indirim_ilanlari', 'taksiler'];
  for (const collName of listingCollections) {
    const q = query(collection(db, collName), where('userId', '==', userId));
    const snapshot = await getDocs(q);
    for (const d of snapshot.docs) {
      await deleteDoc(d.ref);
    }
  }
}

// Subscribe to Taxis from Firebase Firestore (taksiler koleksiyonu)
export function subscribeTaxis(callback: (taxis: RawTaxiDoc[]) => void) {
  try {
    const q = query(
      collection(db, 'taksiler'),
      where('bitisTarihi', '>', Timestamp.now())
    );
    return onSnapshot(q, (snapshot) => {
      // Firestore verisi tipsizdir — güvenilir tek cast noktası burasıdır
      const taxis = snapshot.docs.map((d) => ({
        id: d.id,
        ...d.data(),
      })) as RawTaxiDoc[];
      callback(taxis);
    }, (error) => {
      console.warn('Firestore taksiler snapshot warning:', error);
    });
  } catch (err) {
    console.error('Error setting up taxis listener:', err);
    return () => { };
  }
}

