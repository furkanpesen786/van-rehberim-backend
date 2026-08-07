import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.senin.uygulaman', 
  appName: 'Van Rehberim',     
  webDir: 'dist',               
  bundledWebRuntime: false,
  plugins: {
    CapacitorHttp: {
      enabled: false,           
    },
  },
};

export default config;