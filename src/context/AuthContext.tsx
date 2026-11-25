import React, { createContext, useContext, useState, useEffect } from 'react';
import {
  auth,
  googleProvider,
  saveUserToFirestore,
  UserProfile,
} from '../lib/firebase';
import { signInWithPopup, signOut as fbSignOut, onAuthStateChanged, GoogleAuthProvider, signInWithCredential, OAuthProvider } from 'firebase/auth';
import { FirebaseAuthentication } from '@capacitor-firebase/authentication';
import { Capacitor } from '@capacitor/core';
import { getErrorMessage, getErrorCode } from '../utils/errors';

// M39 (2. tur, 25.11 logcat teşhisi): Çıkış sonrası ikinci girişin
// takılmasının GERÇEK kök nedenleri:
// 1. `skipNativeAuth: false` → native eklenti kendi Auth oturumunu tutar.
//    Çıkışta eklentinin signOut'u, firebaseAuth.signOut() sırasında
//    idTokenChange dinleyicisinin "No user is signed in" exception
//    fırlatmasıyla yarıda kalıyor ve JS callback HİÇ resolve olmuyordu
//    → logout + sonraki girişte clearNativeSession sonsuz asılı.
//    Çözüm: capacitor.config.ts'te skipNativeAuth: true (native oturum
//    artık hiç tutulmuyor; eklenti yalnızca credential döndürüyor).
// 2. `saveUserToFirestore` CapacitorHttp altında asılı kalabiliyordu
//    (Firestore Write kanalı 'transport errored' sonrası promise hiç
//    sonuçlanmıyor — M34 deseni) → loginWithGoogle promise'i bitmiyor,
//    LoginModal spinner'ı kapanmıyordu. Çözüm: profil kaydı artık
//    giriş akışını BEKLETMEZ (fire-and-forget + firebase.ts'te 8 sn
//    zaman aşımı).
// Ek savunma: TÜM native eklenti çağrıları (getCurrentUser/signOut
// dahil) kısa zaman aşımıyla sarmalanır — 45 sn guard yalnızca
// signInWithGoogle' u sarmaladığı için önceki turda işe yaramamıştı.

/** Native eklenti çağrısını zaman aşımıyla sarmalar. */
const withNativeTimeout = <T,>(label: string, promise: Promise<T>, timeoutMs = 45_000): Promise<T> => {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => {
      reject(new Error(`${label} işlemi zaman aşımına uğradı. Lütfen tekrar deneyiniz.`));
    }, timeoutMs);
  });
  return Promise.race([promise, timeout]).finally(() => {
    if (timer) clearTimeout(timer);
  });
};

/** Native eklentide bekleyen (bayat) oturum varsa kapatır. İdempotent.
 *  skipNativeAuth: true ile normalde hep boştur; savunma amaçlı 5 sn
 *  zaman aşımıyla sarmalanır — eklenti çağrısı asılı kalırsa girişi
 *  veya çıkışı bloklamaz. */
const clearNativeSession = async (): Promise<void> => {
  if (!Capacitor.isNativePlatform()) return;
  try {
    const current = await withNativeTimeout('Oturum temizliği', FirebaseAuthentication.getCurrentUser(), 5_000);
    if (current?.user) {
      await withNativeTimeout('Oturum kapatma', FirebaseAuthentication.signOut(), 5_000);
    }
  } catch {
    // Teşhis amaçlı temizlik — başarısızsa girişin önünü kesmeyiz.
  }
};

interface AuthContextType {
  currentUser: UserProfile | null;
  loading: boolean;
  loginWithEmail: (email: string, displayName?: string) => Promise<void>;
  loginWithGoogle: () => Promise<void>;
  loginWithApple: () => Promise<void>;
  logout: () => Promise<void>;
  showAuthModal: boolean;
  setShowAuthModal: (show: boolean) => void;
}

const AuthContext = createContext<AuthContextType>({
  currentUser: null,
  loading: true,
  loginWithEmail: async () => { },
  loginWithGoogle: async () => { },
  loginWithApple: async () => { },
  logout: async () => { },
  showAuthModal: false,
  setShowAuthModal: () => { },
});

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // M14: oturum yalnızca Firebase Auth onayından sonra kurulur —
  // localStorage'dan doğrulamasız restore kaldırıldı (sahte "girişli"
  // görünüm + silinmiş hesapların hayalet oturumu riski).
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [showAuthModal, setShowAuthModal] = useState<boolean>(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (fbUser) => {
      if (fbUser && fbUser.email) {
        const profile: UserProfile = {
          uid: fbUser.uid,
          email: fbUser.email,
          displayName: fbUser.displayName || fbUser.email.split('@')[0],
          photoURL: fbUser.photoURL || undefined,
          loginMethod: fbUser.providerData[0]?.providerId === 'google.com' ? 'google' : 'email',
          createdAt: new Date().toISOString(),
          lastLoginAt: new Date().toISOString(),
        };
        setCurrentUser(profile);
        // M39 (2. tur): profil kaydı oturum kurulumunu BEKLETMEZ —
        // CapacitorHttp altında Firestore yazması asılı kalabiliyordu
        // (logcat 25.11) ve setLoading(false) hiç çalışmıyordu.
        void saveUserToFirestore(profile);
      } else {
        // M14: Firebase oturumu yoksa kullanıcı da yok (eski: localStorage'dan
        // doğrulamasız restore). UI bu sürede `loading` ile korunur.
        setCurrentUser(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // M32: e-posta girişi devre dışı — parametreler artık gereksiz.
  const loginWithEmail = async () => {
    throw new Error('E-posta ile giriş sistemi güvenlik güncellemeleri nedeniyle geçici olarak devre dışı bırakılmıştır. Lütfen Google veya Apple ile giriş yapınız.');
  };

  const loginWithGoogle = async () => {
    try {
      let fbUser;

      if (Capacitor.isNativePlatform()) {
        // M39: bayat native oturum eklentiyi kilitliyordu — önce temizle.
        await clearNativeSession();
        // Use Capacitor Native @capacitor-firebase/authentication for Android/iOS
        const nativeResult = await withNativeTimeout('Google girişi', FirebaseAuthentication.signInWithGoogle());

        if (nativeResult.credential?.idToken) {
          // Authenticate with Firebase JS SDK using the native credential
          const credential = GoogleAuthProvider.credential(nativeResult.credential.idToken);
          const userCredential = await signInWithCredential(auth, credential);
          fbUser = userCredential.user;
        } else if (nativeResult.user) {
          // Fallback for some environments
          fbUser = nativeResult.user;
        } else {
          throw new Error("Google girişi başarılı ancak bilgiler alınamadı.");
        }
      } else {
        // Fallback for Web browser
        const userCredential = await signInWithPopup(auth, googleProvider);
        fbUser = userCredential.user;
      }

      if (fbUser && fbUser.email) {
        const profile: UserProfile = {
          uid: fbUser.uid,
          email: fbUser.email,
          displayName: fbUser.displayName || fbUser.email.split('@')[0],
          // fbUser: firebase User | capacitor User birliği — alan adları
          // farklı (photoURL vs photoUrl); 'in' ile daraltıp güvenle okuruz.
          photoURL: ('photoURL' in fbUser ? fbUser.photoURL : fbUser.photoUrl) || undefined,
          loginMethod: 'google',
          createdAt: new Date().toISOString(),
          lastLoginAt: new Date().toISOString(),
        };
        setCurrentUser(profile);
        setShowAuthModal(false); // Close modal instantly before long network request

        // M39 (2. tur): profil kaydı arka planda, bloklamadan —
        // saveUserToFirestore asılı kalırsa bile loginWithGoogle
        // promise'i biter ve spinner kapanır (firebase.ts'te 8 sn
        // zaman aşımı da var).
        void saveUserToFirestore(profile);
      }
    } catch (err) {
      console.error('Google Sign-In Error:', err);
      // Ignore user cancellation codes
      if (getErrorCode(err) !== 'auth/popup-closed-by-user' && getErrorMessage(err) !== 'signInWithGoogle canceled.') {
        throw new Error('Google ile giriş yapılamadı: ' + (getErrorMessage(err) || 'Lütfen tekrar deneyiniz.'));
      }
    }
  };

  const loginWithApple = async () => {
    try {
      let fbUser;

      if (Capacitor.isNativePlatform()) {
        // M39: bayat native oturum eklentiyi kilitliyordu — önce temizle.
        await clearNativeSession();
        const nativeResult = await withNativeTimeout('Apple girişi', FirebaseAuthentication.signInWithApple());

        if (nativeResult.credential?.idToken) {
          const appleProvider = new OAuthProvider('apple.com');
          const credential = appleProvider.credential({
            idToken: nativeResult.credential.idToken,
            rawNonce: nativeResult.credential.nonce,
          });
          const userCredential = await signInWithCredential(auth, credential);
          fbUser = userCredential.user;
        } else if (nativeResult.user) {
          fbUser = nativeResult.user;
        } else {
          throw new Error("Apple girişi başarılı ancak bilgiler alınamadı.");
        }
      } else {
        const appleProvider = new OAuthProvider('apple.com');
        appleProvider.addScope('email');
        appleProvider.addScope('name');
        const userCredential = await signInWithPopup(auth, appleProvider);
        fbUser = userCredential.user;
      }

      if (fbUser) {
        // If Apple didn't provide email via OAuth directly (sometimes happens on subsequent logins), 
        // fall back to provider Data or placeholder if totally unavailable (unlikely for Apple if properly configured).
        const email = fbUser.email || (fbUser.providerData[0]?.email) || `${fbUser.uid}@apple.com`;

        const profile: UserProfile = {
          uid: fbUser.uid,
          email: email,
          displayName: fbUser.displayName || email.split('@')[0],
          photoURL: ('photoURL' in fbUser ? fbUser.photoURL : fbUser.photoUrl) || undefined,
          loginMethod: 'apple',
          createdAt: new Date().toISOString(),
          lastLoginAt: new Date().toISOString(),
        };
        setCurrentUser(profile);
        setShowAuthModal(false);

        // M39 (2. tur): Google akışıyla aynı — bloklamayan profil kaydı.
        void saveUserToFirestore(profile);
      }
    } catch (err) {
      console.error('Apple Sign-In Error:', err);
      if (getErrorCode(err) !== 'auth/popup-closed-by-user' && getErrorMessage(err) !== 'signInWithApple canceled.') {
        throw new Error('Apple ile giriş yapılamadı: ' + (getErrorMessage(err) || 'Lütfen tekrar deneyiniz.'));
      }
    }
  };


  const logout = async () => {
    try {
      await fbSignOut(auth);
    } catch { }
    // M39: native eklenti oturumu da kapatılır — yoksa ikinci giriş
    // signInWithGoogle'da sonsuza kadar takılıyordu. Ayarlar > hesap
    // silme akışındaki desenle simetrik.
    await clearNativeSession();
    // M14: hard reload (window.location.href = '/') kaldırıldı — React state
    // (currentUser = null) UI'ı günceller; SettingsView zaten null-güvenli.
    setCurrentUser(null);
  };

  return (
    <AuthContext.Provider
      value={{
        currentUser,
        loading,
        loginWithEmail,
        loginWithGoogle,
        loginWithApple,
        logout,
        showAuthModal,
        setShowAuthModal,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
