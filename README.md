# Van Rehberim

Van ili için dijital şehir rehberi. Google AI Studio'dan export edilen React
projesi, Capacitor ile Android'e paketlenir; backend Render.com üzerinde
Express olarak çalışır.

## Özellikler

- Hava durumu, namaz vakitleri, nöbetçi eczane bilgileri
- Döviz/altın kurları (doviz.com, sunucu tarafı önbellekli)
- Otobüs saatleri (van.bel.tr)
- Yerel haberler (canlı RSS: Wan Haber, Van Olay, Van Havadis)
- İş / indirim / taksi ilanları (RevenueCat ödemeli)
- Yerel bildirimler, açık/koyu tema, Google/Apple girişi

## Teknolojiler

| Katman | Teknolojiler |
|---|---|
| Frontend | React 19, TypeScript, Vite 6, Tailwind CSS 4 |
| Mobil | Capacitor 8 (Android), Firebase Auth, RevenueCat, LocalNotifications |
| Backend | Express 4 (`server.ts`) — scraping tabanlı veri toplama |
| Veri | Firebase Firestore |
| CI/CD | GitHub Actions, Render deploy |

## Geliştirme

```bash
npm install          # bağımlılıklar
npm run dev          # dev sunucusu (tsx server.ts, port 3000)
npm run lint         # tsc --noEmit + eslint
npm run build        # vite build + esbuild (dist/server.cjs)
npm start            # production: node dist/server.cjs
```

Ortam değişkenleri için `.env.example` dosyasına bakın (lokal `.env`).

## Android

`android/` klasöründe Gradle projesi. `npm run build` sonrası
`npx cap sync android` ile `dist/` çıktısı senkronlanır. Release imzalama
için `android/keystore.properties` gereklidir (gitignore'lıdır).

## Dağıtım

- Backend: https://van-rehberim-api.onrender.com (Render, auto-deploy)
- Repo: https://github.com/furkanpesen786/van-rehberim-backend
