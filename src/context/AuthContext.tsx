import React, { createContext, useContext, useState, useEffect } from 'react';
import {
  auth,
  googleProvider,
  saveUserToFirestore,
  UserProfile,
} from '../lib/firebase';
import { signInWithPopup, signOut as fbSignOut, onAuthStateChanged, GoogleAuthProvider, signInWithCredential } from 'firebase/auth';
import { FirebaseAuthentication } from '@capacitor-firebase/authentication';
import { Capacitor } from '@capacitor/core';

interface AuthContextType {
  currentUser: UserProfile | null;
  loading: boolean;
  loginWithEmail: (email: string, displayName?: string) => Promise<void>;
  loginWithGoogle: () => Promise<void>;
  logout: () => Promise<void>;
  showAuthModal: boolean;
  setShowAuthModal: (show: boolean) => void;
}

const AuthContext = createContext<AuthContextType>({
  currentUser: null,
  loading: fontLoading(),
  loginWithEmail: async () => { },
  loginWithGoogle: async () => { },
  logout: async () => { },
  showAuthModal: false,
  setShowAuthModal: () => { },
});

function fontLoading() { return true; }

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(() => {
    try {
      const saved = localStorage.getItem('van_user_profile');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });
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
        localStorage.setItem('van_user_profile', JSON.stringify(profile));
        await saveUserToFirestore(profile);
      } else {
        // If no Firebase Auth user, check if we have local email-only session
        const saved = localStorage.getItem('van_user_profile');
        if (saved) {
          try {
            setCurrentUser(JSON.parse(saved));
          } catch { }
        }
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const loginWithEmail = async (email: string, displayName?: string) => {
    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail || !cleanEmail.includes('@')) {
      throw new Error('Lütfen geçerli bir e-posta adresi giriniz.');
    }

    const uid = 'usr_' + cleanEmail.replace(/[^a-z0-9]/g, '_');
    const name = displayName?.trim() || cleanEmail.split('@')[0];

    const profile: UserProfile = {
      uid: uid,
      email: cleanEmail,
      displayName: name,
      loginMethod: 'email',
      createdAt: new Date().toISOString(),
      lastLoginAt: new Date().toISOString(),
    };

    setCurrentUser(profile);
    localStorage.setItem('van_user_profile', JSON.stringify(profile));
    setShowAuthModal(false); // Close modal instantly before long network request

    // Save to Firestore in the background
    try {
      await saveUserToFirestore(profile);
    } catch (e) {
      console.warn("Firestore sync failed, but user is logged in locally.");
    }
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
        localStorage.setItem('van_user_profile', JSON.stringify(profile));
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

  const logout = async () => {
    try {
      await fbSignOut(auth);
    } catch { }
    setCurrentUser(null);
    localStorage.removeItem('van_user_profile');
    window.location.href = '/'; // Hard reload nükleer çözüm
  };

  return (
    <AuthContext.Provider
      value={{
        currentUser,
        loading,
        loginWithEmail,
        loginWithGoogle,
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
