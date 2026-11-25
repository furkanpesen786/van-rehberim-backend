import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.vanrehberim.app',
  appName: 'Van Rehberim',
  webDir: 'dist',
  plugins: {
    CapacitorHttp: {
      enabled: true,
    },
    FirebaseAuthentication: {
      // M39 (2. tur, 25.11 logcat): skipNativeAuth: true — eklenti KENDİ
      // native Firebase Auth oturumunu TUTMAZ; yalnızca Google/Apple
      // credential döndürür. Gerçek oturum Firebase JS SDK'da kurulur
      // (AuthContext zaten signInWithCredential kullanıyor — eklentinin
      // JS SDK ile birlikte kullanımında önerilen desen de budur).
      // false iken iki ayrı asılı kalma kaynağı vardı: (a) çıkış sonrası
      // bayat native oturum ikinci girişi kilitliyordu; (b) eklentinin
      // signOut'u, firebaseAuth.signOut() sırasında idTokenChange
      // dinleyicisinin "No user is signed in" fırlatmasıyla yarıda
      // kalıyor ve JS callback hiç resolve olmuyordu → logout sonsuz
      // bekliyordu.
      skipNativeAuth: true,
      providers: ["google.com", "apple.com"],
    }
  },
};

export default config;