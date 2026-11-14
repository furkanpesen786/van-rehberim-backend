import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { defineConfig } from 'vite';

export default defineConfig(() => {
  return {
    build: {
      chunkSizeWarningLimit: 1000,
      rollupOptions: {
        output: {
          // M32: eski `id.includes('react')` eşleşmesi lucide-react, react-dom
          // tip dosyaları vb. her şeyi 'vendor-react' chunk'ına atıyordu.
          // Yol sınırlı eşleşme yalnızca react/react-dom çekirdeğini ayırır;
          // lucide-react artık genel 'vendor' chunk'ına düşer.
          manualChunks(id) {
            if (!id.includes('node_modules')) return undefined;
            if (/[\\/]node_modules[\\/](react|react-dom|scheduler)[\\/]/.test(id)) {
              return 'vendor-react';
            }
            return 'vendor';
          },
        },
      },
    },
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    // M32: AI Studio kalıntısı DISABLE_HMR sunucu yapılandırması kaldırıldı —
    // proje artık AI Studio'da düzenlenmiyor; dev sunucusu (tsx server.ts +
    // Vite middleware) normal HMR/dosya izleme davranışı kullanır.
  };
});
