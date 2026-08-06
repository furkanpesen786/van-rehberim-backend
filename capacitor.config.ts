import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.vanrehberim.app',
  appName: 'Van Rehberim',
  webDir: 'dist',
  plugins: {
    FirebaseAuthentication: {
      skipNativeAuth: false,
      providers: ["google.com"],
    }
  },
  server: {
    cleartext: true,
    androidScheme: 'https'
  }
};

export default config;
