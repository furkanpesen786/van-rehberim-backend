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
        await saveUserToFirestore(profile);
      } else {
        // M14: Firebase oturumu yoksa kullanıcı da yok (eski: localStorage'dan
        // doğrulamasız restore). UI bu sürede `loading` ile korunur.
        setCurrentUser(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const loginWithEmail = async (email: string, displayName?: string) => {
    throw new Error('E-posta ile giriş sistemi güvenlik güncellemeleri nedeniyle geçici olarak devre dışı bırakılmıştır. Lütfen Google veya Apple ile giriş yapınız.');
  };

  const loginWithGoogle = async () => {
    try {
      let fbUser;

      if (Capacitor.isNativePlatform()) {
        // Use Capacitor Native @capacitor-firebase/authentication for Android/iOS
        const nativeResult = await FirebaseAuthentication.signInWithGoogle();

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
          photoURL: fbUser.photoURL || undefined,
          loginMethod: 'google',
          createdAt: new Date().toISOString(),
          lastLoginAt: new Date().toISOString(),
        };
        setCurrentUser(profile);
        setShowAuthModal(false); // Close modal instantly before long network request

        // Save to Firestore in the background
        try {
          await saveUserToFirestore(profile);
        } catch (e) {
          console.warn("Firestore sync failed, but user is logged in locally.");
        }
      }
    } catch (err: any) {
      console.error('Google Sign-In Error:', err);
      // Ignore user cancellation codes
      if (err.code !== 'auth/popup-closed-by-user' && err.message !== 'signInWithGoogle canceled.') {
        throw new Error('Google ile giriş yapılamadı: ' + (err.message || 'Lütfen tekrar deneyiniz.'));
      }
    }
  };

  const loginWithApple = async () => {
    try {
      let fbUser;

      if (Capacitor.isNativePlatform()) {
        const nativeResult = await FirebaseAuthentication.signInWithApple();

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
          photoURL: fbUser.photoURL || undefined,
          loginMethod: 'apple',
          createdAt: new Date().toISOString(),
          lastLoginAt: new Date().toISOString(),
        };
        setCurrentUser(profile);
        setShowAuthModal(false);

        try {
          await saveUserToFirestore(profile);
        } catch (e) {
          console.warn("Firestore sync failed, but user is logged in locally.");
        }
      }
    } catch (err: any) {
      console.error('Apple Sign-In Error:', err);
      if (err.code !== 'auth/popup-closed-by-user' && err.message !== 'signInWithApple canceled.') {
        throw new Error('Apple ile giriş yapılamadı: ' + (err.message || 'Lütfen tekrar deneyiniz.'));
      }
    }
  };


  const logout = async () => {
    try {
      await fbSignOut(auth);
    } catch { }
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
