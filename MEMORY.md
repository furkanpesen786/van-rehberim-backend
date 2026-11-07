# 🧠 VAN REHBERİM — PROJE BELLEĞİ (MEMORY.md)

> **Amaç:** Bu dosya, projenin geliştirme sürecinde gelinen aşamayı, çözülen temel sorunları,
> alınan mimari kararları ve sıradaki adımların kalıcı kaydını tutar. Yeni bir çalışma
> oturumuna başlamadan önce bu dosya okunmalı, oturum sonunda güncellenmelidir.
>
> **Son güncelleme:** 07.11.2026 (M5 kodu yazıldı — doğrulama/commit/push BEKLİYOR)
> **Son oturum:** Düzeltme oturumu #5 — M5 (ödeme doğrulaması backend'e taşındı) 🔄
> Kod tamamlandı (backend endpoint + istemci geçişi + kurallar), ANCAK oturum
> boyunca Bash araçları sistemsel olarak kapalıydı → `npm install`, `tsc`, `lint`,
> commit, push YAPILAMADI. Ayrıca M4 commit'leri (`a3f46e9`, `713632a`) hâlâ
> origin'e push EDİLMEDİ. Sıradaki adımlar Bölüm 2'deki kontrol listesinde.

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
TypeScript derlemesi: ✅ `tsc --noEmit` exit 0 (M0 ve M2 sonrası doğrulandı, 05.11.2026).

**07.11.2026 oturumu #5:** **M5 kodu yazıldı** (bkz. Bölüm 3 — doğrulama bekliyor).
Ödeme doğrulaması backend'e taşındı: yeni `server/listings.ts` (POST `/api/listings`),
istemci `src/services/listingService.ts`, üç bileşende çağrı noktaları değiştirildi,
`firebase.ts`'ten eski yazım fonksiyonları kaldırıldı, `firestore.rules`'ta istemci
create kapatıldı. **Doğrulama yapılamadı** (Bash kapalıydı) ve **commit/push yok** —
aşağıdaki kontrol listesi sırayla uygulanmalı.

**⚠️ M5 sonrası yapılacaklar (sırayla!):**
1. `git push origin main` (M4 commit'leri `a3f46e9` + `713632a` hâlâ push edilmemiş)
   → CI main'de yeşil kontrolü (M4'ün de kalan doğrulaması)
2. Tam yedek al (`Desktop/van-rehberim-YEDEK-2026-11-07.tar.gz` — M5 öncesi durum
   zaten commit'li olduğu için kritik değil, alışkanlık)
3. `npm install` (firebase-admin eklendi) → `npx tsc --noEmit` → `npm run lint`
4. Sorun yoksa commit + push → CI yeşil kontrolü
5. **Render:** env değişkenleri ekle → `REVENUECAT_SECRET_API_KEY` (Secret API key,
   Dashboard → Settings → API keys) + `FIREBASE_SERVICE_ACCOUNT` (Firebase service
   account JSON'ının tamamı tek satır string) → deploy
6. Endpoint testi: env yokken 503; token'sız 401; sahte ürün 400 beklenir
7. `npm run build` + yeni APK yayınla (istemci artık backend'e yazıyor)
8. **SADECE APK yayımlandıktan SONRA** yeni `firestore.rules`'ı Firebase Console'a
   deploy et (create: false) — önce kapatılırsa eski APK'da yayınlama kırılır
9. Canlı test: gerçek satın alma → ilan yayımlanıyor; ödeme yapmadan yayınlama
   denenince reddediliyor

**06.11.2026 oturumu #4:** **M4 çözüldü** (bkz. Bölüm 3). ESLint 9 flat config onarıldı,
`.eslintrc.json` silindi. `npm run lint` exit 0 — 0 error, 87 warning (bilinen borç:
`any` + kullanılmayan importlar, bilinçli olarak warn seviyesinde).

**06.11.2026 oturumu #3:** **M3 çözüldü** (bkz. Bölüm 3). DealsView ödeme akışı JobsView
modeline geçirildi. Kullanıcı kararı: sahte 3/7/15/30 günlük fiyat kartları yerine
gerçek RevenueCat ürünleri gösterilecek (RevenueCat'te yalnızca `ilan_30_gun` ve
`one_cikan_30_gun` ürünleri mevcut; yeni ürün oluşturma istenmedi).

**05.11.2026 oturumu:** **M2 çözüldü** (bkz. Bölüm 3). Kod değişiklikleri + tsc doğrulaması +
MEMORY.md güncellemesi tek commit'te toplandı. Önce tam yedek alındı
(`Desktop/van-rehberim-YEDEK-2026-11-05.tar.gz`, 63 MB).

**04.11.2026 oturumu:** Kullanıcı tüm sorunların kritikten başlayarak sırayla
çözülmesini onayladı (her sorun sonrası izin istenerek). **M0 ve M1 çözüldü** (bkz. Bölüm 3).
M2 onaylandı ve planlandı.

**⚠️ M2 sonrası:**
1. **✅ Kurallar Firebase Console'a deploy edildi (05.11.2026).** Önemli not: deploy
   öncesi canlıda varsayılan test kuralları vardı ve süresi (03.09.2026) DOLMUŞTU —
   yani client istekleri tamamen reddediliyordu. Yeni kurallar bunu da çözdü.
   (Repoda `firebase.json`/`.firebaserc` yok; deploy Console'dan elle yapıldı.
   Console'a yapıştırılan sürüm = repodaki dosyanın yorum-siz hali — Türkçe yorumlar
   tarayıcı otomatik çevirisi kuralları bozduğu için çıkarıldı.)
2. **Canlı test (hâlâ önerilir):** kendi hesabıyla ilan ekle → göründüğünü doğrula →
   ikinci hesapla o ilanı silmeyi dene → reddedildiğini doğrula.
3. **Geçiş notu:** mevcut ilan dokümanlarında `userId` YOK → istemciden kimse
   değiştiremez/silemez; eski doküman silinecekse Firebase Console'dan yapılır.

**⚠️ ÖNEMLİ — Commit hash'leri değişti:** M1 sırasında `git filter-branch` ile geçmiş
yeniden yazıldığı için Bölüm 3 tablosundaki eski hash'ler (bf44a84, a578067 vb.)
artık geçersizdir; yeni hash'ler için `git log --oneline` kullanılmalıdır.

**Kırmızı bayraklar:**
- ~~ESLint yapılandırması kırık~~ **✅ 06.11.2026 çözüldü (M4)** — `npm run lint` artık
  çalışıyor (0 error / 87 warning); CI lint adımı da aynı komutu kullanıyor.
- ~~Commit edilmemiş staged değişiklikler~~ **✅ temiz** (07.11.2026 doğrulandı: çalışma
  ağacı clean, keystore/APK diskte + gitignore'lı). M5 değişiklikleri henüz commit'li
  değil (Bölüm 2 kontrol listesi).

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

> **05.11.2026 — M2 ÇÖZÜLDÜ (owner-based Firestore kuralları):**
>
> - **Önce yedek alındı:** `Desktop/van-rehberim-YEDEK-2026-11-05.tar.gz` (63 MB).
> - `firestore.rules` owner-based yeniden yazıldı:
>   - `users`: `read, write` yalnız `request.auth.uid == userId` (herkese okuma KAPALI)
>   - `is_ilanlari` / `indirim_ilanlari` / `taksiler`: `read: if true`;
>     `create` → `ownsNewDoc()` (userId == auth.uid); `update` → sahibi + userId
>     değiştirilemez; `delete` → yalnız sahibi
>   - `userFavorites`: owner-only (değişiklik yok)
> - `src/lib/firebase.ts`: `addJobListingToFirestore`, `addDealToFirestore`,
>   `addTaxiToFirestore` imzalarına `userId: string` eklendi; `{...data, userId}` ile
>   payload'daki değer eziliyor (sahtelenemez).
> - Çağrı noktaları: `JobsView.tsx` (~256), `DealsView.tsx` (~237), `HomeView.tsx` (~219)
>   → `currentUser?.uid || ''` (uid boşsa kural reddeder — fail-closed güvenli).
> - **Yan etki analizi:** `saveUserToFirestore` (AuthContext'te yalnız kendi hesabı ile
>   çağrılıyor) ve `userFavorites` yazıları yeni kurallarla uyumlu; başka kırılan yazma yolu yok.
> - Doğrulama: `npx tsc --noEmit` → exit 0.
> - **✅ Kurallar 05.11.2026'da Firebase Console'dan deploy edildi** (eski kurallar
>   süresi dolmuş varsayılan test kurallarıydı — client istekleri reddediliyordu).

> **06.11.2026 — M3 ÇÖZÜLDÜ (DealsView ödeme/süre dürüstleştirme, JobsView modeli):**
>
> - **Kullanıcı kararı:** RevenueCat'te yeni ürün oluşturmak yerine mevcut iki ürünle
>   dürüst UI (JobsView modeli) seçildi.
> - `src/components/DealsView.tsx` değişiklikleri:
>   - `PackageOption` / `PUBLISH_PACKAGES` / `HIGHLIGHT_PACKAGES` sabitleri (sahte
>     fiyat kartları) ve `selectedPublishPkg` / `selectedHighlightPkg` / `totalPrice`
>     state'leri KALDIRILDI.
>   - Yeni: `rcPackages` / `selectedPackage` / `packagesLoading` / `packagesError`
>     state'leri + `loadRevenueCatPackages()` (form açılınca çağrılır; yalnız
>     `ilan_30_gun` + `one_cikan_30_gun` filtrelenir, JobsView ile aynı).
>   - Yeni yardımcılar: `getDealMetaFromPackage()` (ürün ID'sinden durationDays +
>     isFeatured türetir), `computeEndDate()` + `todayTR()` (gerçek tr-TR tarihler).
>   - `handleFinalPurchase` yeniden yazıldı: SEÇİLEN gerçek paket satın alınır;
>     `durationDays`, `isFeatured`, `pricePaid` ve startDate/endDate satın alınan
>     üründen hesaplanıp payload'a yazılır. Artık seçilen gün = satın alınan
>     ürün = Firestore'a yazılan süre.
>   - Sabit '01.08.2026'/'31.08.2026' tarih varsayılanları bugüne/bugün+30'a çekildi.
>   - Ödeme modalı özeti gerçek `product.title` + `priceString` gösterir.
> - Doğrulama: `npx tsc --noEmit` → exit 0.
> - **Bilinen sınır:** RevenueCat'te yalnızca 30 günlük ürünler olduğundan UI'da
>   3/7/15 günlük seçenek artık YOK (bilinçli karar). Farklı süreler istenirse
>   Play Console + RevenueCat'te yeni ürün oluşturulup `PACKAGE_IDS` +
>   `getDealMetaFromPackage` genişletilmeli.

> **07.11.2026 — M5 KODU YAZILDI (ödeme doğrulaması backend'e taşındı; doğrulama bekliyor):**
>
> - **Mimari ("pull" doğrulama, kullanıcı onaylı):** istemci satın alma sonrası ilan
>   verisini + Firebase ID token'ı backend'e gönderir; backend RevenueCat subscriber
>   kontrolü yapar, süreyi/tarihleri kendisi hesaplar, Admin SDK ile Firestore'a yazar.
>   Webhook kullanılmadı (ilan verisi istemciden geldiği için webhook eşleşmesi sorunlu).
> - **Yeni dosya `server/listings.ts`** (~300 satır): `POST /api/listings` endpoint'i.
>   - `PRODUCT_META` (ürün → durationDays/isFeatured) ve `LISTING_TYPES` (tip →
>     koleksiyon/izinli ürünler/alan beyaz listesi) SUNUCUDA tek doğrul kaynağı.
>   - Firebase ID token `verifyIdToken(token, true)` (iptal edilmiş oturum reddedilir).
>   - RevenueCat v1 REST: `GET /v1/subscribers/{uid}` (uid = RevenueCat appUserID —
>     `purchaseService.ts` zaten Firebase uid kullanıyor). 60 sn in-memory cache.
>   - Satın alma kontrolü: aktif entitlement (ürün eşleşmeli) **veya** son 15 dk içinde
>     non-subscription satın alması (tazelik penceresi — eski alımla sonsuz ücretsiz
>     yayınlamayı engeller).
>   - Alan beyaz listesi + uzunluk sınırı (5000 kr) + nesne/dizi reddi; userId/userEmail/
>     productId/durationDays/isFeatured/createdAt/bitisTarihi sunucuda hesaplanır.
>   - Rate limit: uid başına saatte 10 istek. Fail-closed: env eksikse 503.
> - **`server.ts`:** `import 'dotenv/config'` eklendi (lokal .env için) +
>   `app.use('/api/listings', listingsRouter)`.
> - **`package.json`:** `firebase-admin: ^13.0.0` eklendi (**npm install henüz yapılmadı**).
> - **Yeni dosya `src/services/listingService.ts`:** `submitPaidListing(type, productId,
>   data)` — ID token alır, 30 sn timeout, backend hatasını Türkçe mesajla yükseltir.
> - **Çağrı noktaları:** JobsView (`'job'`, seçilen paketin id'si), DealsView (`'deal'`),
>   HomeView taksi (`'taxi'`, `taksi_ilan_aylik`) → artık `submitPaidListing` kullanıyor.
>   JobsView optimistic UI, backend'in döndürdüğü GERÇEK Firestore id'sini kullanıyor.
> - **`src/lib/firebase.ts`:** `addJobListingToFirestore` / `addDealToFirestore` /
>   `addTaxiToFirestore` KALDIRILDI (istemciden doğrudan yazma yolu kapandı) +
>   kullanılmayan importlar temizlendi (addDoc, serverTimestamp, deleteDoc, getDocs, orderBy).
> - **`firestore.rules`:** üç koleksiyonda `create: if false` (read açık, update/delete
>   yalnız sahibi). **DİKKAT: Console'a yalnızca yeni APK yayımlandıktan sonra
>   deploy edilmeli** (önce kapatılırsa mevcut APK'da yayınlama kırılır).
> - **Doğrulama durumu:** ❌ YAPILAMADI — oturum boyunca Bash komutları sistemsel
>   olarak çalıştırılamadı. `npm install` + `tsc --noEmit` + `lint` + commit + push
>   bekliyor (Bölüm 2 kontrol listesi).
> - **Bilinen sınırlar / sonraki fırsatlar:** `pricePaid` kozmetik olarak istemciden
>   alınıyor (görüntülenmiyor, doğrulanmıyor); refund'lar (iade) otomatik işlenmiyor
>   (RevenueCat webhook ile `bitisTarihi` erkenden kapatılabilir — ileride);
>   subscriber cache Render ücretsiz planda instance başınadır (yeterli).

> **06.11.2026 — M4 ÇÖZÜLDÜ (ESLint 9 flat config onarımı):**
>
> - **Kök neden:** ESLint 9 yalnızca `eslint.config.js`'i (flat config) okuyordu ama
>   o dosyada `@typescript-eslint/parser` hiç bağlanmamıştı → varsayılan espree parser
>   TS sözdizimini çözümleyemiyor, tüm `.tsx` dosyalarında parsing error çıkıyordu.
>   Yanında legacy `.eslintrc.json` da duruyordu (karışıklık kaynağı).
> - **Yapılanlar:**
>   1. `eslint.config.js` yeniden yazıldı: `languageOptions.parser` olarak
>      `@typescript-eslint/parser` bağlandı; `@typescript-eslint/eslint-plugin`
>      (v8.72.1) `plugins` ile tanımlandı, `tseslint.configs.recommended.rules`
>      yayıldı (spread).
>   2. **Bilinçli uyarı seviyeleri:** `no-explicit-any` ve `no-unused-vars`
>      recommended'da "error" idi; kod tabanındaki bilinen borç (28 `any`, çok sayıda
>      ölü import) nedeniyle ikisi de "warn" yapıldı → lint çalışır, CI yeşil kalır,
>      borç görünür kalır. Borç kapatıldıkça seviyeler geri yükseltilebilir.
>   3. **react-hooks v7 tuzağı:** v7'nin `configs.flat.recommended` preset'i React
>      Compiler kurallarını (set-state-in-effect, purity, refs vb.) "error" seviyesinde
>      içeriyor — bu kod tabanında onlarca error üretip CI'ı kırardı. Bunun yerine
>      yalnızca klasik iki kural elle bağlandı: `rules-of-hooks: error`,
>      `exhaustive-deps: warn`.
>   4. `.eslintrc.json` silindi (tek config ilkesi).
>   5. `package.json`: `lint:eslint` script'indeki `--ext .js,.ts,.tsx` bayrağı
>      kaldırıldı (flat config'de desteklenmiyor; dosya seçimi config'deki `files`
>      desenleriyle yapılıyor).
>   6. Global `ignores`: `dist/`, `android/`, `resources/`, `node_modules/`.
> - **Doğrulama:** `npx tsc --noEmit` exit 0; `npx eslint src` ve `npm run lint`
>   exit 0 — **0 error, 87 warning** (28× no-explicit-any + ~59× no-unused-vars;
>   dosya dosya liste Bölüm 7'de değil, lint çıktısında mevcut).
> - **Bilinen sınır / sonraki fırsatlar:** react eslint-plugin'i bilinçli olarak
>   eklenmedi (prop-types kuralları TS projesinde gürültü üretir); 87 uyarı kademeli
>   olarak kapatılabilir (ölü importlar hızlı kazanç, `--fix` ile 1 tanesi otomatik).

> Not: Bu oturumda (02.11.2026) çözüm değil **tespit** yapıldı; Bölüm 4'teki sorunlar açıktır.

---

## 4. TESPİT EDİLEN TEMEL SORUNLAR (henüz çözülmedi)

### 4.1 🔴 Kritik Güvenlik

1. ~~**`android/app/upload.keystore` git'te izleniyor + staged**~~ **✅ 04.11.2026 çözüldü**
   (geçmiş yeniden yazıldı + force push; ayrıntı Bölüm 3'te). Kalan alt-görev:
   `android/keystore.properties` yerelde oluşturulmalı (şifreler) — release build için.
2. ~~**Firestore kuralları gevşek** (`firestore.rules`)~~ **✅ 05.11.2026 çözüldü**
   (owner-based kurallar yazıldı, kod + tsc doğrulandı, commit edildi; ayrıntı Bölüm 3).
   **Kalan adım (kullanıcı): kuralları Firebase Console'a deploy et + canlı test.**
3. ~~**Ödeme doğrulaması istemci tarafında**~~ **🔄 07.11.2026 kodlandı (M5)** — backend
   doğrulaması yazıldı; doğrulama/commit/push/Render env/APAK/kural deploy'u bekliyor
   (Bölüm 2 kontrol listesi + Bölüm 3 M5 kaydı).
4. **AndroidManifest:** `android:usesCleartextTraffic="true"` ve `android:allowBackup="true"` açık.
5. **Scraping ToS riski:** MGM / Diyanet / doviz.com / Eczacı Odası / van.bel.tr
   sahte User-Agent ile taranıyor; regex tabanlı parsing kırılgan.

### 4.2 🐛 Mantık Hataları

1. ~~**DealsView süre/fiyat uyuşmazlığı**~~ **✅ 06.11.2026 çözüldü** (JobsView modeline
   geçildi: gerçek RevenueCat paketleri + `durationDays`; ayrıntı Bölüm 3'te).
2. ~~**ESLint kırık (doğrulandı, exit -1)**~~ **✅ 06.11.2026 çözüldü (M4)** — tek flat
   config yazıldı, parser bağlandı, `.eslintrc.json` silindi; `npm run lint` exit 0
   (0 error / 87 warning — ayrıntı Bölüm 3). Kalan alt-görev: CI'ın main'de yeşil
   olduğunu push sonrası doğrulamak.
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
5. **Ödeme akışı (M5 sonrası):** RevenueCat JS SDK ile satın alma istemcide; ilan
   yazımı backend'de (POST `/api/listings`: ID token + RevenueCat entitlement
   doğrulaması + Admin SDK). Eski durum (tamamen istemcide) 07.11.2026'da değişti.
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
| 2 | 🔴 Acil | ~~Firestore kurallarını sıkılaştır~~ **✅ 05.11.2026 çözüldü** (owner-based; tsc doğrulandı; commit edildi). Kalan: Firebase'e deploy + canlı test | Kurallar canlıda aktif; yabancı kullanıcı silme denemesi reddediliyor |
| 3 | 🔴 Acil | ~~DealsView süre/fiyat hatasını düzelt~~ **✅ 06.11.2026 çözüldü** (JobsView modeli; tsc doğrulandı). Canlı RevenueCat satın alma testi önerilir | Seçilen gün = satın alınan ürün = Firestore'a yazılan süre ✅ (kod düzeyinde) |
| 4 | 🟠 Yüksek | ~~ESLint'i düzelt (tek flat config + `@typescript-eslint/parser`), `.eslintrc.json`'ı sil~~ **✅ 06.11.2026 çözüldü** (`npm run lint` exit 0, 0 error / 87 warn). Kalan: push sonrası CI main'de yeşil kontrolü | `npm run lint` exit 0 ✅ |
| 5 | 🟠 Yüksek | RevenueCat backend entitlement doğrulaması; ilan yazımını backend'e taşı | **🔄 07.11.2026 kodlandı** — tsc/lint/commit/push, Render env + deploy, APK, kural deploy'u bekliyor (Bölüm 2 kontrol listesi) | Ödeme yapılmadan ilan yayımlanamıyor |
| 6 | 🟠 Yüksek | Haber sistemi: 5 sn polling → 60+ sn; sunucuda 5–10 dk cache; ölü RSS'leri kaldır; uydurma fallback'i dürüst hata ile değiştir | Kaynak etiketleri gerçek; sunucu istek/s sayısı düştü |
| 7 | 🟡 Orta | AndroidManifest: `usesCleartextTraffic` ve `allowBackup` kapat | Manifest temiz, uygulama çalışıyor |
| 8 | 🟡 Orta | Kök temizliği: scriptler `scripts/` klasörüne, dump/debug dosyaları sil; tek lock dosyası kal | Kökte yalnız üretim dosyaları |
| 9 | 🟡 Orta | Markalaşma: `package.json` adı, `index.html` başlığı + `lang="tr"`, gerçek README | Başlık "Van Rehberim" |
| 10 | 🟢 İleri | HomeView'u alt bileşenlere böl; Firestore şemasını normalize et; Vitest testleri ekle | Testler CI'da koşuyor |

**Önerilen çalışma düzeni:** Her düzeltme ayrı commit + ayrı oturum; her oturum sonunda
bu dosyanın Bölüm 2/4/6'sı güncellenmeli (çözülenler Bölüm 3'e taşınmalı).

---

## 7. DOĞRULAMA ORTAMI VE KOMUTLAR

| Komut | Sonuç (06.11.2026, oturum #4) |
|---|---|
| `npx tsc --noEmit` | ✅ exit 0 — temiz (M0 + M2 + M3 + M4 sonrası doğrulandı) |
| `npx eslint src` | ✅ exit 0 — 0 error, 87 warning (M4 sonrası) |
| `npm run dev` | `tsx server.ts` — dev sunucusu (Vite middleware, port 3000/PORT) |
| `npm run build` | `vite build` + `esbuild server.ts → dist/server.cjs` |
| `npm start` | `node dist/server.cjs` (prod) |
| `npm run lint` | ✅ exit 0 — `tsc --noEmit && eslint src` (M4 sonrası) |

**Ortam:** Windows (PowerShell), çalışma dizini:
`c:\Users\FURKAN\Desktop\van-rehberim - Kopya`

**Ortama özgü notlar:**
- `clean` script'i (`rm -rf dist server.js`) Windows/PowerShell'da çalışmaz.
- Git durumu (07.11.2026, oturum #5): dal ucu `713632a` (MEMORY.md), önceki
  `a3f46e9` (M4), `daa6f3b` (M3), `7541456` (M2), `522e980` (M0+M1).
  **`a3f46e9` + `713632a` henüz push EDİLMEDİ** (M2/M3 origin'de). M5 değişiklikleri
  çalışma ağacında COMMIT'SİZ duruyor (Bash kapalıydı). Keystore/APK ve yedek
  `*.tar.gz` dosyaları untracked + gitignore'lı, diskte yerlerinde. Geçmiş yeniden
  yazıldığı için 04.11 öncesi eski hash'ler geçersiz.
- **Yeni ortam değişkenleri (M5):** `REVENUECAT_SECRET_API_KEY` (Render + lokal .env)
  ve `FIREBASE_SERVICE_ACCOUNT` (service account JSON'ı tek satır string; Render +
  lokal .env). İkisi de eksikken `/api/listings` bilinçli olarak 503 döner (fail-closed).
- 07.11.2026 oturum notu: Bash araçları sistemsel arıza nedeniyle oturum boyunca
  kapalıydı; tüm doğrulamalar ertelendi.
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
