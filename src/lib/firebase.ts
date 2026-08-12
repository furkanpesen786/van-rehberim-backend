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
  addDoc,
  query,
  orderBy,
  onSnapshot,
  deleteDoc,
  serverTimestamp,
  Timestamp,
  where,
} from 'firebase/firestore';

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
  experimentalForceLongPolling: true
});

// User Profile interface for App
export interface UserProfile {
  uid: string;
  email: string;
  displayName?: string;
  photoURL?: string;
  loginMethod: 'email' | 'google';
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
export function subscribeJobListings(callback: (jobs: any[]) => void) {
  try {
    // PRODUCTION: Yalnızca bitiş tarihi geçmemiş (aktif) ilanları getir
    const q = query(
      collection(db, 'is_ilanlari'),
      where('bitisTarihi', '>', Timestamp.now())
    );
    return onSnapshot(q, (snapshot) => {
      const jobs = snapshot.docs.map((d) => ({
        id: d.id,
        ...d.data(),
      }));
      callback(jobs);
    }, (error) => {
      console.warn('Firestore is_ilanlari snapshot warning:', error);
    });
  } catch (err) {
    console.error('Error setting up job listings listener:', err);
    return () => { };
  }
}

// Add Job Listing to Firebase Firestore
export async function addJobListingToFirestore(jobData: any) {
  try {
    const colRef = collection(db, 'is_ilanlari');

    const durationDays = jobData.durationDays || 7;
    const expirationDate = new Date();
    expirationDate.setDate(expirationDate.getDate() + durationDays);
    const bitisTarihi = Timestamp.fromDate(expirationDate);

    const docRef = await addDoc(colRef, {
      ...jobData,
      createdAtTimestamp: serverTimestamp(),
      createdAt: jobData.createdAt || new Date().toLocaleDateString('tr-TR'),
      bitisTarihi: bitisTarihi
    });
    return docRef.id;
  } catch (err) {
    console.error('Error adding job to Firestore:', err);
    throw err;
  }
}

// Subscribe to Deals from Firebase Firestore (indirim_ilanlari koleksiyonu)
export function subscribeDeals(callback: (deals: any[]) => void) {
  try {
    const q = query(
      collection(db, 'indirim_ilanlari'),
      where('bitisTarihi', '>', Timestamp.now())
    );
    return onSnapshot(q, (snapshot) => {
      const deals = snapshot.docs.map((d) => ({
        id: d.id,
        ...d.data(),
      }));
      callback(deals);
    }, (error) => {
      console.warn('Firestore indirim_ilanlari snapshot warning:', error);
    });
  } catch (err) {
    console.error('Error setting up deals listener:', err);
    return () => { };
  }
}

// Add Deal to Firebase Firestore (indirim_ilanlari koleksiyonu)
export async function addDealToFirestore(dealData: any) {
  try {
    const colRef = collection(db, 'indirim_ilanlari');

    const durationDays = dealData.durationDays || 7;
    const expirationDate = new Date();
    expirationDate.setDate(expirationDate.getDate() + durationDays);
    const bitisTarihi = Timestamp.fromDate(expirationDate);

    const docRef = await addDoc(colRef, {
      ...dealData,
      createdAtTimestamp: serverTimestamp(),
      createdAt: dealData.createdAt || new Date().toLocaleDateString('tr-TR'),
      bitisTarihi: bitisTarihi
    });
    return docRef.id;
  } catch (err) {
    console.error('Error adding deal to Firestore:', err);
    throw err;
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

// Subscribe to Taxis from Firebase Firestore (taksiler koleksiyonu)
export function subscribeTaxis(callback: (taxis: any[]) => void) {
  try {
    const q = query(
      collection(db, 'taksiler'),
      where('bitisTarihi', '>', Timestamp.now())
    );
    return onSnapshot(q, (snapshot) => {
      const taxis = snapshot.docs.map((d) => ({
        id: d.id,
        ...d.data(),
      }));
      callback(taxis);
    }, (error) => {
      console.warn('Firestore taksiler snapshot warning:', error);
    });
  } catch (err) {
    console.error('Error setting up taxis listener:', err);
    return () => { };
  }
}

// Add Taxi to Firebase Firestore (taksiler koleksiyonu)
export async function addTaxiToFirestore(taxiData: any) {
  try {
    const colRef = collection(db, 'taksiler');

    const durationDays = taxiData.durationDays || 30;
    const expirationDate = new Date();
    expirationDate.setDate(expirationDate.getDate() + durationDays);
    const bitisTarihi = Timestamp.fromDate(expirationDate);

    const docRef = await addDoc(colRef, {
      ...taxiData,
      createdAtTimestamp: serverTimestamp(),
      createdAt: taxiData.createdAt || new Date().toLocaleDateString('tr-TR'),
      bitisTarihi: bitisTarihi
    });
    return docRef.id;
  } catch (err) {
    console.error('Error adding taxi to Firestore:', err);
    throw err;
  }
}