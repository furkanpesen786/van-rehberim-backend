# 🧠 VAN REHBERİM — PROJE BELLEĞİ (MEMORY.md)

> **Amaç:** Bu dosya, projenin geliştirme sürecinde gelinen aşamayı, çözülen temel sorunları,
> alınan mimari kararları ve sıradaki adımların kalıcı kaydını tutar. Yeni bir çalışma
> oturumuna başlamadan önce bu dosya okunmalı, oturum sonunda güncellenmelidir.
>
> **Son güncelleme:** 04.11.2026 (oturum duraklatıldı — yarın devam)
> **Son oturum:** Düzeltme oturumu #1 — M0 ✅ + M1 ✅ çözüldü; M2 onaylandı, analiz edildi,
> uygulama yarınki oturumda yapılacak (bkz. Bölüm 2 ve Bölüm 6)

---

## 1. PROJE KİMLİĞİ

**Van Rehberim**, Van ili için geliştirilen dijital şehir rehberi uygulamasıdır.
Google AI Studio'dan export edilen React projesi, Capacitor ile Android'e paketlenir;
backend Render.com üzerinde Express olarak çalışır.

| Katman | Teknolojiler |
|---|---|
| Frontend | React 19, TypeScript 5.8 (strict KAPALI), Vite 6, Tailwind CSS 4, lucide-react |
| Mobil | Capacitor 8 (yalnızca Android; iOS projesi yok), Firebase Auth, RevenueCat, LocalNotifications |
| Backend | Express 4 (`server.ts`, ~1.570 satır) — scraping tabanlı veri toplama |
| Veri | Firebase Firestore (`is_ilanlari`, `indirim_ilanlari`, `taksiler`, `users`, `userFavorites`) |
| CI/CD | GitHub Actions (`.github/workflows/ci.yml`), Render deploy (`van-rehberim-api.onrender.com`) |

**Özellikler:** hava durumu, nöbetçi eczane, namaz vakitleri, döviz/altın kurları,
otobüs saatleri, haberler (RSS), iş/indirim/taksi ilanları (RevenueCat ödemeli),
yerel bildirimler, açık/koyu tema, Google/Apple girişi (e-posta girişi devre dışı).

**Kritik dosyalar:**
- `server.ts` — Express API: `/api/weather`, `/api/pharmacies`, `/api/prayer-times`,
  `/api/currencies`, `/api/bus-schedules`, `/api/news`
- `src/components/HomeView.tsx` — 2.167 satır, ana monolit bileşen
- `src/lib/firebase.ts` — Firestore erişim katmanı (config hardcoded: `vanrehberim-f181b`)
- `firestore.rules` — güvenlik kuralları
- `android/app/upload.keystore` — Play Store imza anahtarı (⚠️ git'te izleniyor!)

---

## 2. GELİNEN AŞAMA

**Proje çalışır durumda:** APK üretilmiş (diskte, artık git dışı), backend Render'da canlı.
TypeScript derlemesi: ✅ `tsc --noEmit` exit 0 (M0 sonrası doğrulandı, 04.11.2026).

**04.11.2026 oturumu:** Kullanıcı tüm sorunların kritikten başlayarak sırayla
çözülmesini onayladı (her sorun sonrası izin istenerek). **M0 ve M1 çözüldü** (bkz. Bölüm 3).
**M2 onaylandı ve analiz edildi** — kod değişikliği henüz YAPILMADI, oturum duraklatıldı.
Yarınki oturum M2 uygulamasıyla başlamalı.

**⚠️ ÖNEMLİ — Commit hash'leri değişti:** M1 sırasında `git filter-branch` ile geçmiş
yeniden yazıldığı için Bölüm 3 tablosundaki eski hash'ler (bf44a84, a578067 vb.)
artık geçersizdir; yeni hash'ler için `git log --oneline` kullanılmalıdır.
Yeni dal ucu: `522e980` (checkpoint commit).

**⚠️ Bekleyen commit:** Bu MEMORY.md güncellemesi henüz commit edilmedi (oturum
sonundaki geçici araç sorunu nedeniyle). Yarın M2 commit'i ile birlikte veya
ayrı olarak commit edilmeli.

**Kırmızı bayraklar:**
- ESLint yapılandırması kırık → `npm run lint` ve CI lint adımı şu anda başarısız.
- Commit edilmemiş staged değişiklikler mevcut; arasında `android/app/upload.keystore`
  da var — **asla commit edilmemeli** (Bölüm 4.1).

---

## 3. DAHA ÖNCE ÇÖZÜLEN TEMEL SORUNLAR (git geçmişinden)

| Commit | Çözülen Sorun |
|---|---|
| `bf44a84` | Bildirim gecikmeleri — `allowWhileIdle` + `SCHEDULE_EXACT_ALARM` izinleri |
| `a578067` / `fcae73a` | Açık/koyu tema uyumluluğu (LoginModal, HomeView, Tailwind `dark` variant) |
| `4730c44` | Render API URL'si `van-rehberim-api` olarak güncellendi |
| `9838b5e` / `0f16909` | 1 MB üzeri üretilmiş dosyalar repodan temizlendi, .gitignore güçlendirildi |
| `3194890` | Van hastane telefonları doğrulanmış bilgilerle güncellendi |
| `c236a51` | Places/Home sayfalama kaldırıldı, global kart araması getirildi |
| `60b7e72` | Güvenlik ve mimari güncellemeleri |
| `9582ab5` | Deals form gönderim düzeni ve ezan bildirim güvenilirliği |

> **04.11.2026 — M0 VE M1 ÇÖZÜLDÜ (commit: `522e980` + force push):**
>
> **M0 — HomeView prop uyuşmazlığı (✅ doğrulandı):**
> - `HomeViewProps` arayüzüne `onNavigateToJobs?: () => void` eklendi
>   (`src/components/HomeView.tsx:63`). Bu prop `App.tsx:104`'ten gönderiliyordu ve
>   `HomeView.tsx:85`'te destructure ediliyordu ama arayüzde tanımlı değildi →
>   TypeScript derleme hatası (TS2339) ve kırık CI.
> - Doğrulama: `npx tsc --noEmit` → exit 0, temiz.
>
> **M1 — Keystore + APK'nın git'ten tamamen kaldırılması (✅ doğrulandı):**
> - **Önce yedek alındı:** `Desktop/van-rehberim-YEDEK-2026-11-04.tar.gz` (137 MB,
>   2577 kayıt; `.git` geçmişi ve keystore dahil; node_modules/build hariç).
>   Bu arşiv silinmemeli — geçmiş yeniden yazma öncesi tek kurtarma noktası.
> - **Tespit:** Keystore ana dal geçmişinde YOKTU (asla push edilmedi, sadece
>   indekste staged + 3 Cline checkpoint ref'inde). APK ise 4 commit'te + GitHub'da idi.
> - **Yapılanlar:**
>   1. `git rm --cached` (keystore + APK indeksten çıkarıldı; diskte duruyorlar)
>   2. `.gitignore`'a `*.keystore`, `*.jks`, `keystore.properties` eklendi
>   3. Checkpoint commit (`522e980`): tüm bekleyen çalışma + M0 + MEMORY.md
>   4. `git filter-branch` ile 53 commit yeniden yazıldı (APK yolu silindi)
>   5. `refs/cline/checkpoints/*` silindi (keystore/APK kopyası taşıyorlardı)
>   6. reflog expire + `git gc --prune=now --aggressive`
>   7. **Force push:** `origin/main` `0f16909` → `522e980` (GitHub'daki eski geçmiş geçersiz)
> - **Doğrulama:** `git rev-list --objects --all` ve `git ls-files`'ta keystore/APK
>   YOK; `git fsck` temiz; geçmiş sağlam; dosyalar diskte yerinde.
> - **Artıklar/Notlar:**
>   - GitHub, eski (ulaşılamaz) commit'leri bir süre SHA ile erişilebilir tutabilir;
>     keystore asla push edilmediği için risk yok, sadece APK dosyası söz konusu.
>   - `android/keystore.properties` dosyası hâlâ YOK → release build imzalamada
>     `storePassword` null olur. Yerelde oluşturulmalı (gitignore'landı, güvenli).
>   - Kullanıcı keystore'u **yenilemeyi** düşünebilir (savunma derinliği; sızma
>     kanıtı yok, opsiyonel).

> Not: Bu oturumda (02.11.2026) çözüm değil **tespit** yapıldı; Bölüm 4'teki sorunlar açıktır.

---

## 4. TESPİT EDİLEN TEMEL SORUNLAR (henüz çözülmedi)

### 4.1 🔴 Kritik Güvenlik

1. ~~**`android/app/upload.keystore` git'te izleniyor + staged**~~ **✅ 04.11.2026 çözüldü**
   (geçmiş yeniden yazıldı + force push; ayrıntı Bölüm 3'te). Kalan alt-görev:
   `android/keystore.properties` yerelde oluşturulmalı (şifreler) — release build için.
2. **Firestore kuralları gevşek** (`firestore.rules`): giriş yapan HER kullanıcı
   `is_ilanlari`, `indirim_ilanlari`, `taksiler` koleksiyonlarını silebilir/değiştirebilir
   (`allow write: if request.auth != null` — update/delete dahil); `users` herkese okunur.
   → Çözüm: `resource.data.userId == request.auth.uid` tabanlı yazma + alan doğrulaması.

   **📋 M2 UYGULAMA PLANI (04.11.2026'da onaylandı + analiz edildi, uygulanacak):**
   - **Değişecek dosyalar:**
     a. `firestore.rules` — owner-based yeniden yazım:
        - `users`: `read, write` yalnız `request.auth.uid == userId` (herkese okuma KAPALI)
        - `is_ilanlari` / `indirim_ilanlari` / `taksiler`: `read: if true`;
          `create: request.auth != null && request.resource.data.userId == request.auth.uid`;
          `update, delete: resource.data.userId == request.auth.uid`
        - `userFavorites`: mevcut owner-only kural aynen kalır
     b. `src/lib/firebase.ts` — üç yazma fonksiyonuna `userId` alanı eklenecek:
        - `addJobListingToFirestore` (satır ~95)
        - `addDealToFirestore` (satır ~140)
        - `addTaxiToFirestore` (satır ~212)
        (En temiz yöntem: fonksiyon imzasına `userId: string` parametresi ekleyip
        yazılan dokümana dahil etmek)
     c. Çağrı noktalarında `currentUser.uid` geçilecek (hepsi `useAuth`'tan
        `currentUser`'a erişiyor):
        - `JobsView.tsx:256` → `addJobListingToFirestore(jobPayload, currentUser.uid)`
        - `DealsView.tsx:237` → `addDealToFirestore(dealPayload, currentUser.uid)`
        - `HomeView.tsx:219` → `addTaxiToFirestore(pendingTaxiData, currentUser.uid)`
   - **Geçiş notu (kritik):** Firestore'daki MEVCUT ilan dokümanlarında `userId` YOK →
     yeni kurallarla istemciden kimse onları değiştiremez/silemez. Kabul edilebilir:
     ilanlar `bitisTarihi` ile zaten otomatik süresi doluyor; eski dokümanları silmek
     gerekiyorsa Firebase Console'dan (kuralları bypass eder) yapılır.
   - **Doğrulama:** `firebase emulators:start` + kural testleri VEYA canlıda dikkatli
     test (kendi hesabıyla ilan ekle → göründüğünü doğrula → ikinci hesapla silmeyi
     dene → reddedildiğini doğrula). Kurallar Firebase Console'a deploy edilmeli
     (`firebase deploy --only firestore:rules` — Firebase CLI gerekli).
   - M2 sonrası `firestore.rules` + `firebase.ts` + bileşen değişiklikleri + bu
     MEMORY.md güncellemesi TEK commit'te toplu olarak commit edilmeli.
3. **Ödeme doğrulaması istemci tarafında:** RevenueCat ödemesinden sonra ilan doğrudan
   istemciden Firestore'a yazılıyor; webhook/entitlement kontrolü yok → ödemeyi atlatma mümkün.
4. **AndroidManifest:** `android:usesCleartextTraffic="true"` ve `android:allowBackup="true"` açık.
5. **Scraping ToS riski:** MGM / Diyanet / doviz.com / Eczacı Odası / van.bel.tr
   sahte User-Agent ile taranıyor; regex tabanlı parsing kırılgan.

### 4.2 🐛 Mantık Hataları

1. **DealsView süre/fiyat uyuşmazlığı (en ciddi iş hatası):** Kullanıcıya 3/7/15/30 günlük
   paketler (99.99–499.99 TL) gösteriliyor (`PUBLISH_PACKAGES`); ancak `handleFinalPurchase`
   HER ZAMAN `ilan_30_gun` ürününü satın alıyor ve `dealPayload`'a `durationDays`
   gönderilmediği için `addDealToFirestore` varsayılan **7 gün** uyguluyor.
   → 30 günlük pakete ödeme yapan kullanıcının ilanı 7 gün sonra sona eriyor.
2. **ESLint kırık (doğrulandı, exit -1):** `.eslintrc.json` + `eslint.config.js` birlikte
   duruyor; ESLint 9 flat config'de `@typescript-eslint/parser` tanımlı olmadığından tüm
   `.tsx` dosyalarında parsing error ("interface is reserved"). `npm run lint` ve CI kırmızı.
3. **Haber sistemi:** 7 RSS kaynağının 4'ü ölü (sehrivan: DNS yok, vanpostasigazetesi: 410,
   gazetevan: 404, vanekspres: bağlantı kopuyor — bkz. `debug_urls.json`); RSS başarısızsa
   sunucu hardcoded uydurma haberleri `success: true` ile "canlı" gibi döndürüyor;
   `readCount` = `Math.floor(Math.random()*1000)+500` (sahte okunma sayıları).
4. **Aşırı polling / önbellek yok:** `NewsView` her **5 saniyede** `/api/news` çekiyor →
   sunucu her istekte 7 RSS kaynağını yeniden tarıyor. `HomeView` 60 sn'de bir doviz.com
   scrape tetikliyor. Render ücretsiz planı için ağır yük.
5. **weatherService uydurma veri:** `windDirection: 'KB'` sabit; `pop` ve `humidity`
   uydurma formüllerle hesaplanıyor (`humidity + (idx % 3) * 2 - 2`); etiket "Canlı API".
6. **AuthContext sorunları:** `fontLoading()` ölü kod; e-posta girişi `throw` ile kapalı
   ama UI metinleri hâlâ "e-posta ile..." diyor; Firebase oturumu yoksa localStorage'dan
   doğrulamasız oturum restore ediliyor; logout hard reload (`window.location.href = '/'`).
7. **Taziye (vefat) özelliği yarım:** tip (`DeathNotice`), ayar anahtarı (`obituaryEnabled`)
   ve UI var; backend endpoint'i ve bildirim akışı yok.
8. **Namaz vakitleri çift kaynak:** istemci Aladhan API (method 13), sunucu Diyanet
   scraping — aynı özellik için iki ayrı kaynak, değerler sapabilir.
9. **Hesap silme eksik (KVKK):** `deleteUser` yalnızca Auth kaydını siler; Firestore'daki
   `users` dokümanı ve kullanıcının ilanları silinmiyor.
10. **Diğer:** `removeAllListeners()` tüm dinleyicileri temizliyor; Vite config'te
    `vendor-lodash` chunk'ı (lodash hiç yok); splash ekranı 2 sn yapay gecikme;
    `clean` script'i `rm -rf` → Windows'ta çalışmaz; haber bildirimleri gün içinde
    RASTGELE 5 saate planlanıyor (gerçek yeni haber kontrolü yok).

### 4.3 🏗️ Mimari / Kod Kalitesi

- **Monolit bileşenler:** HomeView 2.167 satır, JobsView 1.033, SettingsView 995 —
  bakımı zor, alt bileşenlere bölünmeli.
- **`server.ts` şişkin:** ~1.570 satırın ~700 satırı inline otobüs fallback verisi
  (mockData.ts ile tekrar eden veri).
- **20+ yerde `any`** (firebase.ts fonksiyonları, bileşen mapping'leri, catch blokları).
- **Tutarsız Firestore şeması:** Türkçe/İngilizce alan karışımı (`isletmeAdi`/`storeName`/
  `name`) → bileşenlerde 5-6 alternatiflı `??` zincirleri ("KORUMA KALKANI" yorumları).
- **Ödeme/hata akışlarında `alert()`** (JobsView, DealsView, HomeView, SettingsView).
- **Test altyapısı YOK:** Vitest/Jest yok; kökte geçici `test_*.js` scriptleri duruyor.
- **İki paket yöneticisi:** `bun.lock` VE `package-lock.json` birlikte.
- **`tsconfig.json`:** `strict` yok, `allowJs: true` → tip güvenliği zayıf.
- **Çift Firebase projesi:** `src/lib/firebase.ts` (`vanrehberim-f181b`) vs
  `firebase-applet-config.json` (`emergent-gift-7x4wp`, AI Studio kalıntısı).
- **`experimentalForceLongPolling: true`** kalmış (performans kısıtı); servis fetch
  timeout'ları 60 sn (mobil için çok uzun).
- **State yönetimi yok:** localStorage + özel window event (`van_saved_deals_changed`)
  ile bileşenler arası senkronizasyon.

### 4.4 📁 Proje Hijyeni

- **Kök dizinde ~30 gereksiz dosya:** scrap dump'ları (`bus-check.html`, `taziye.html`,
  `van_bel.html`, `temp_*`), debug çıktıları (`debug_urls*.json`, `theme_issues.txt`,
  `npm_audit.json`, `git_log_output.txt`...), ikon scriptleri (`crop.cjs`, `extract.cjs`,
  `force_icons.cjs`...), geçici testler (`test_rss*.js`, `scraper-test.js`...),
  18 MB APK, büyük görseller (`cleaned_icon.png`, `van_kedisi.jpg`), `.agent/fixCards.cjs`.
- **Markalaşma eksik:** `package.json` adı `react-example`; `index.html` başlığı
  "My Google AI Studio App" ve `lang="en"`; README AI Studio şablonu (proje bilgisi yok).
- **CI anti-pattern'leri:** `npm audit fix` build sırasında lock dosyasını değiştirebilir;
  CI'dan repoya commit atan "cleanup" adımı git geçmişini kirletir.

---

## 5. MİMARİ KARARLAR

### 5.1 Alınmış Kararlar (mevcut durum — as-is)

1. **Monolitik bileşen mimarisi:** Her sekme tek büyük dosya (HomeView, JobsView,
   DealsView, SettingsView, NewsView, PlacesView); router yok — sekme durumu
   `App.tsx` içinde `useState<TabType>` ile yönetiliyor.
2. **Express tek sunucu:** `server.ts` hem API hem statik dosya sunar (dev'de Vite
   middleware, prod'da `dist/` static + SPA fallback; `NODE_ENV` ile ayrım).
3. **Veri edinme = scraping + istemci fallback'i:** Her servis canlı veri alamazsa
   mock/yerel veriye sessizce düşer (kullanıcıya her zaman "başarılı" görünür).
4. **Doğrudan istemci → Firestore erişimi:** Backend Firestore'a dokunmaz; tüm okuma/
   yazma istemciden (güvenlik kurallarına dayanıyor — şu an gevşek).
5. **Ödeme akışı tamamen istemcide:** RevenueCat JS SDK; satın alma sonrası ilan
   istemciden Firestore'a yazılır (sunucu doğrulaması yok).
6. **Kalıcılık:** localStorage (tema, oturum önbelleği, favoriler) + custom window
   event'lerle bileşen senkronizasyonu.
7. **Namaz vakitleri iki bağımsız kaynaktan:** istemci Aladhan API, sunucu Diyanet scraping.
8. **Capacitor Android:** `webDir: 'dist'`, `CapacitorHttp` açık, native/web auth ayrımı
   (`Capacitor.isNativePlatform()`), release imzası `upload.keystore` + `keystore.properties`.
9. **Firestore'da süre sonu alanı:** `bitisTarihi` timestamp + `where('bitisTarihi','>',now)`
   filtresi ile süresi dolan ilanlar gizlenir; `experimentalForceLongPolling: true`.
10. **CI:** GitHub Actions — npm ci → lint → build → artifact upload (+ cleanup commit).

### 5.2 Önerilen Kararlar (henüz alınmadı — to-be)

1. Ödeme doğrulaması RevenueCat **webhook + backend**'e taşınmalı; ilan yazımı yalnızca
   backend'den yapılmalı (entitlement kontrolü ile).
2. Firestore kuralları **owner-based + alan doğrulamalı** olmalı (`userId` zorunlu alan).
3. Scraping yerine mümkünse resmi API'ler; zorunluysa **sunucu tarafı önbellek (5–10 dk)**
   ve rate-limit eklenmeli.
4. HomeView alt bileşenlere bölünmeli; ortak veri akışı için Context/Zustand benzeri
   state yönetimi alınmalı.
5. Test altyapısı kurulmalı: **Vitest + React Testing Library** (öncelik: purchaseService,
   prayerService hesaplamaları, firestore yazım fonksiyonları, DealsView süre mantığı).
6. Tek ESLint flat config (`@typescript-eslint/parser` ile) + `tsconfig`'e `strict: true`.
7. Firebase config env değişkenlerine taşınmalı (çift proje kalıntısı temizlenmeli).
8. Firestore şeması tek dilli (İngilizce) normalize edilmeli; `durationDays`/`userId`
   gibi kritik alanlar yazımda doğrulanmalı.

---

## 6. SONRAKİ ADIMLAR — ÖNCELİKLİ YOL HARİTASI

| # | Öncelik | Görev | Kabul Kriteri |
|---|---|---|---|
| 0 | 🔴 Acil | ~~M0: `HomeViewProps`'a `onNavigateToJobs` ekle~~ **✅ 04.11.2026 çözüldü + tsc doğrulandı** | `npx tsc --noEmit` exit 0 ✅ |
| 1 | 🔴 Acil | ~~Keystore + APK git geçmişinden kaldır~~ **✅ 04.11.2026 çözüldü** (yedek → filter-branch → force push; doğrulandı). Alt-görev: `keystore.properties` yerelde oluştur | `git ls-files` içinde keystore/apk yok ✅ |
| 2 | 🔴 Acil | Firestore kurallarını sıkılaştır (owner-based yazma + alan doğrulama; `users` okumasını kapat) — **✅ onaylandı, plan hazır (bkz. 4.1/2), YARIN uygulanacak** | Yabancı kullanıcı başkasının ilanını silemiyor; kurallar emulator ile test edildi |
| 3 | 🔴 Acil | DealsView süre/fiyat hatasını düzelt: seçilen paket → doğru ürün + `durationDays` payload'a | Seçilen gün = satın alınan ürün = Firestore'a yazılan süre |
| 4 | 🟠 Yüksek | ESLint'i düzelt (tek flat config + `@typescript-eslint/parser`), `.eslintrc.json`'ı sil | `npm run lint` exit 0; CI main'de yeşil |
| 5 | 🟠 Yüksek | RevenueCat webhook + backend entitlement doğrulaması; ilan yazımını backend'e taşı | Ödeme yapılmadan ilan yayımlanamıyor |
| 6 | 🟠 Yüksek | Haber sistemi: 5 sn polling → 60+ sn; sunucuda 5–10 dk cache; ölü RSS'leri kaldır; uydurma fallback'i dürüst hata ile değiştir | Kaynak etiketleri gerçek; sunucu istek/s sayısı düştü |
| 7 | 🟡 Orta | AndroidManifest: `usesCleartextTraffic` ve `allowBackup` kapat | Manifest temiz, uygulama çalışıyor |
| 8 | 🟡 Orta | Kök temizliği: scriptler `scripts/` klasörüne, dump/debug dosyaları sil; tek lock dosyası kal | Kökte yalnız üretim dosyaları |
| 9 | 🟡 Orta | Markalaşma: `package.json` adı, `index.html` başlığı + `lang="tr"`, gerçek README | Başlık "Van Rehberim" |
| 10 | 🟢 İleri | HomeView'u alt bileşenlere böl; Firestore şemasını normalize et; Vitest testleri ekle | Testler CI'da koşuyor |

**Önerilen çalışma düzeni:** Her düzeltme ayrı commit + ayrı oturum; her oturum sonunda
bu dosyanın Bölüm 2/4/6'sı güncellenmeli (çözülenler Bölüm 3'e taşınmalı).

---

## 7. DOĞRULAMA ORTAMI VE KOMUTLAR

| Komut | Sonuç (04.11.2026) |
|---|---|
| `npx tsc --noEmit` | ✅ exit 0 — temiz (M0 sonrası doğrulandı) |
| `npx eslint src --ext .js,.ts,.tsx` | ❌ hâlâ kırık (B1 — sonraki düzeltmelerde) |
| `npm run dev` | `tsx server.ts` — dev sunucusu (Vite middleware, port 3000/PORT) |
| `npm run build` | `vite build` + `esbuild server.ts → dist/server.cjs` |
| `npm start` | `node dist/server.cjs` (prod) |
| `npm run lint` | `tsc --noEmit && eslint src ...` → tsc artık temiz, ESLint hâlâ kırık (B1) |

**Ortam:** Windows (PowerShell), çalışma dizini:
`c:\Users\FURKAN\Desktop\van-rehberim - Kopya`

**Ortama özgü notlar:**
- `clean` script'i (`rm -rf dist server.js`) Windows/PowerShell'da çalışmaz.
- Git durumu (04.11.2026 sonrası): dal ucu `522e980`, origin ile senkron
  (force push yapıldı). Çalışma ağacı temiz; keystore/APK untracked +
  gitignore'lı, diskte yerlerinde. Geçmiş yeniden yazıldığı için eski hash'ler geçersiz.
- **Yedek:** `Desktop/van-rehberim-YEDEK-2026-11-04.tar.gz` (137 MB) — M1 öncesi
  tam kopya; eski geçmiş (keystore'lu stash nesneleri dahil) buradadır, saklanmalı.
- Android build: `android/` klasöründe Gradle projesi; `dist/` → `npx cap sync` ile
  `android/app/src/main/assets/public` altına kopyalanır.
- Release build için `android/keystore.properties` oluşturulmalı (storePassword/
  keyPassword; artık gitignore'lı olduğu için güvenli).

---

*Bu dosya, 02.11.2026 tarihli kapsamlı denetim oturumunun ardından Cline (AI kodlama
asistanı) tarafından oluşturuldu. Sonraki oturumlarda öncelikle Bölüm 6'daki yol
haritası izlenmeli ve işler tamamlandıkça bu bellek güncellenmelidir.*
