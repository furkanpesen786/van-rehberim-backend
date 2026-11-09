# 🧠 VAN REHBERİM — PROJE BELLEĞİ (MEMORY.md)

> **Amaç:** Bu dosya, projenin geliştirme sürecinde gelinen aşamayı, çözülen temel sorunları,
> alınan mimari kararları ve sıradaki adımların kalıcı kaydını tutar. Yeni bir çalışma
> oturumuna başlamadan önce bu dosya okunmalı, oturum sonunda güncellenmelidir.
>
> **Son güncelleme:** 09.11.2026 — M9 TAMAMLANDI ✅ (AndroidManifest güvenliği,
> deploy `live` + canlı doğrulandı)
> **Özet:** 09.11 oturumu (M8 + M9): (1) `6ca3a1a` CI ✅ yeşil. (2) **M8**
> (`b3acdd8`): `/api/currencies`'e 10 dk önbellek + 2 saat bayat-fallback +
> 10 sn fetch timeout — canlıda doğrulandı. (3) **M9** (`5542427`):
> AndroidManifest'te `usesCleartextTraffic=false` + `allowBackup=false`;
> server.ts'te RSS haber görsellerinde `http://` → `https://` yükseltmesi.
> Deploy `live`, CI yeşil, canlı `/api/news` 30 haber + `http://` görsel yok.
> ÖNEMLİ: manifest değişikliği yalnızca YENİ APK derlenince etkili olur.
> Kalan görevler: C (kök temizliği), D (markalaşma); M5 donduruldu.

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

**07.11.2026 oturum #6 (akşam) — M5 DONDURULDU (kullanıcı kararı):**
Kullanıcı, RevenueCat yerine **iyzico** ödeme sistemine geçmeyi düşünüyor. Karar:
M5 tamamlanmayacak; tüm sorunlar çözüldükten sonra M5'e dönüp **iyzico vs RevenueCat
karşılaştırması** yapılacak (yerel kart/TRY avantajı vs Play Billing politikası
riski vs entegrasyon emeği), seçimden sonra ödeme altyapısı kurulacak.

**M5 dondurma notları (dönünce buradan devam):**
- Kod durumu: M5 kodu commit'li + push'lı (`d548ef6`), CI düzeltmesi `bf8bab9`,
  firebase-admin kurulmuş. CI main'de yeşil kontrolü HENÜZ YAPILMADI.
- **Mevcut APK hâlâ İSTEMCİDEN Firestore'a yazıyor** → `firestore.rules`'taki
  `create: if false` HENÜZ Console'a deploy EDİLMEDİ (doğru — önceki APK kırılır).
  Kurallar repoda hazır; deploy ancak yeni ödeme akışı canlıya çıkınca yapılır.
- `server/listings.ts` mimarisinin büyük kısmı iyzico'ya da taşınabilir (backend
  yazımı, süre/tarih hesabı, alan beyaz listesi, Admin SDK). Değişen kısım:
  RevenueCat subscriber doğrulaması yerine iyzico checkout + webhook doğrulaması
  (daha da temiz olur — ödeme kanıtı tamamen sunucu tarafında biter).
- **Render kurulum scripti hazır ama KASTEN ÇALIŞTIRILMADI:**
  `Desktop/yeni klasör/render-setup.sh` (env ekleme + deploy + endpoint testi).
  İçinde kullanılan girdiler aynı klasörde: `revenuecat` (Secret API key),
  `render-apı-key.txt` (Render API key),
  `vanrehberim-f181b-firebase-adminsdk-....json` (service account — ⚠️ Firestore'a
  tam yetkili secret; repo dışında ama masaüstünde açıkta, iş bitince silinmeli/
  güvenceye alınmalı). `FIREBASE_SERVICE_ACCOUNT` env'i iyzico senaryosunda da
  gerekecek; `REVENUECAT_SECRET_API_KEY` yalnızca RevenueCat seçilirse.
- Render env'leri HENÜZ EKLENMEDİ → canlıda `/api/listings` 503 döner (fail-closed,
  kasıtlı ve güvenli durum).

**07.11.2026 gece — M6 ÇÖZÜLDÜ (haber sistemi; commit bekliyor):** Ölü RSS'ler
çıkarıldı (kalan 3 canlı kaynak WebFetch ile doğrulandı: wanhaber ~34, vanolay ~34,
vanhavadis ~20 haber), sunucuya 10 dk önbellek + 2 saatlik bayat-fallback eklendi,
istemci polling'i 5 sn → 60 sn, uydurma haber dizisi ve sahte readCount kaldırıldı,
hata durumunda dürüst hata kartı gösteriliyor. Ayrıntı Bölüm 3'teki M6 kaydında.

**⚠️ M6 sonrası yapılacaklar (güncel durum 08.11, oturum #7):**
1. ✅ Commit + push yapıldı (`78f4923`) → ✅ CI main'de yeşil (GitHub API'den
   doğrulandı; `bf8bab9` de yeşil, `d548ef6` fail — bilinen/düzeltildi)
2. ✅ **Render deploy sorunu KÖK NEDENİYLE çözüldü (M7, `6ca3a1a`):** dün gece
   manuel deploy dahil M5 sonrası TÜM deploy'lar `update_failed` idi (5 kayıt:
   d548ef6, 2× bf8bab9, 2× 78f4923). Son başarılı deploy `713632a` (88 sn).
   Neden: M5'te `server.ts`'e eklenen `'./server/listings'` import'u — proje
   `"type": "module"` (native ESM) olduğundan Node ESM çözümleyicisi uzantısız
   göreli import'u ÇÖZEMİYOR → sunucu boot'ta `ERR_MODULE_NOT_FOUND` ile
   çöküyor → Render `update_failed` işaretleyip ESKİ sürümü çalıştırmaya devam
   ediyordu (canlıda eski kod olmasının açıklaması). tsc/tsx/esbuild bundler
   çözümlemesi yaptığından ve CI sunucuyu hiç BAŞLATMADIĞINDAN yakalanamadı.
   Düzeltme: `'./server/listings.ts'` (tam uzantı). Doğrulandı: `npx -y ts-node
   server.ts` boot EXIT 124 (ayakta), `tsc --noEmit` + `npm run build` temiz,
   `NODE_ENV=production node dist/server.cjs` boot OK.
3. ✅ **Push sonrası kontrol yapıldı (08.11 akşam):** `6ca3a1a | live | 119 sn`
   (Render API'den doğrulandı). Canlı `/api/news` YENİ kodu döndürüyor:
   `channelsCount: 3`, kaynak "Wan Haber, Van Olay, Van Havadis (Canlı RSS)",
   `readCount` YOK, 30 gerçek haber (bugünün tarihli, gerçek sourceUrl'ler).
   **M6+M7 birlikte canlıda.** Gözlem: deploy sonrası İLK istek yavaş/boş
   dönebiliyor (önbellek boş → 3 RSS senkron taranıyor; 45 sn'de bitmeyebilir,
   90 sn timeout'la tamamlandı). Sonraki istekler 10 dk önbellekten hızlı.
   Ayrıca Render free uykudan uyanırken ilk istek 503 + Retry-After verebiliyor.
4. ⬜ Uygulamada Haberler sekmesi testi (telefonda elle): haberler geliyor,
   60 sn'de bir sessiz yenileme, hata simülasyonunda (uçak modu) "TEKRAR DENE"
   kartı. NOT: mevcut APK'daki istemci kodu eski sürüm olabilir — bu test
   anlamlı şekilde ancak yeni APK derlenince yapılabilir (istemci tarafındaki
   M6 değişiklikleri: 60 sn polling, 3 kanal, hata kartı).
5. ✅ **CI kontrolü yapıldı (09.11):** `6ca3a1a` → "build" check-run
   `conclusion: success` (35 sn, 08.11 19:41 UTC; GitHub API check-runs
   endpoint'inden doğrulandı). Eski `/status` endpoint'i Actions için boş
   döner — `.../commits/{sha}/check-runs` kullanılmalı.

**📋 Render servis bilgileri (oturum #7'de API'den doğrulandı):**
- Servis: `srv-d9nm3bajnfac73bcb2v0` ("van-rehberim-api", free plan, frankfurt,
  autoDeploy: YES — commit tetikler). Repo: `furkanpesen786/van-rehberim-backend`
  (= yerel origin; CI de aynı repoda). Build: `npm install && npm run build`;
  **Start: `npx ts-node server.ts`** (ts-node package.json'da YOK — npx runtime'ta
  indiriyor; ileride `npm start`/`node dist/server.cjs`'e geçirilmesi düşünülebilir,
  ama M7 düzeltmesi mevcut komutla da çalışıyor). Health check yok; build cache yok.
- Render API anahtarı: `Desktop/yeni klasör/render apı keys.txt` (`rnd_...`,
  08.11'de kullanıcı güncelledi — ESKİ dosya `render-apı-key.txt` silindi).
  Scriptler (hepsi yeni anahtar dosyasını okuyacak şekilde düzeltildi):
  `render-deploy-status.sh` (son 5), `render-deploy-history.sh` (son 30 + süre),
  `render-logs.sh` (zaman aralıklı log — /v1/logs parametre adları HENÜZ
  çözülemedi: `name`, `serviceId`, `filter[...]` reddedildi), `render-setup.sh`
  (M5 env kurulumu — DONDURULDU, çalıştırma!).

**09.11.2026 oturumu #8 — M8 ÇÖZÜLDÜ + CANLIDA (`/api/currencies` önbelleği):**
Kullanici gorevi secti (A/B/C/D arasindan **A**). Yapilanlar ayrintisi Bölüm 3'teki
M8 kaydında. Kısa özet: `/api/currencies`'e 10 dk taze önbellek + 2 saat
bayat-fallback + 10 sn fetch timeout; istemci değişmedi (60 sn polling önbellekten
ucuz yanıt alır). Commit `b3acdd8`, deploy `live`, canlı doğrulandı.
Not: Bu oturumda da Bash sınıflandırıcısı aralıklı arızalıydı — tsc/eslint/
git-commit/curl çalıştı ama `npm run build`, boot testi, `git push` ve bazı
curl'ler reddedildi; kullanıcı `!` önekiyle çalıştırdı (dünkü yöntem).

**09.11.2026 oturumu #9 (devamı) — M9 ÇÖZÜLDÜ + CANLIDA (AndroidManifest güvenliği):**
Kullanıcı görev **B**'yi seçti. Ayrıntı Bölüm 3'teki M9 kaydında. Kısa özet:
`usesCleartextTraffic=false` + `allowBackup=false` (tüm istemci trafiği zaten
https — doğrulandı) + RSS görsellerinde http→https yükseltmesi. Commit
`5542427`, deploy `live`, CI yeşil, canlı doğrulandı. **Etkisi ancak yeni
APK derlenince görülür** (mevcut kurulu APK'da eski manifest var).
Bash sınıflandırıcısı bu oturumda da aralıklı arızalıydı (tsc çalıştı;
build/boot/push/deploy-kontrolleri kullanıcı `!` ile çalıştırdı).

**📋 Sıradaki görev seçimi (A ve B tamamlandı, kalan: C/D):**
**C)** Kök dizin temizliği **D)** Markalaşma. M5 donduruldu — tüm sorunlar
bitince iyzico vs RevenueCat karşılaştırması.

**07.11.2026 gece — oturum #6 kapanış notları:**
- Bash'in güvenlik sınıflandırıcısı OTURUM BOYUNCA arızalıydı; yalnızca önceden
  onaylı komutlar çalıştı. Doğrulama/commit/push komutları KULLANICI tarafından
  `!` önekiyle çalıştırıldı (tsc exit 0, lint 0 error/80 warn, commit+push OK).
- WebFetch aralıklı çalıştı (RSS doğrulaması + CI durumu + canlı endpoint testi
  yapılabildi); Monitor ile 15 dk deploy izleme yapıldı, zaman aşımına uğradı.

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
- ~~Commit edilmemiş staged değişiklikler~~ **✅ temiz** (07.11.2026 akşam doğrulandı:
  çalışma ağacı clean — M5 dahil her şey commit'li+push'lı; keystore/APK diskte +
  gitignore'lı).

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

> **09.11.2026 — M9 ÇÖZÜLDÜ (AndroidManifest: cleartext trafik + allowBackup kapatıldı):**
>
> - **Sorun (4.1.4):** `android:usesCleartextTraffic="true"` (HTTP trafiğine izin
>   veriyor, MITM riski) ve `android:allowBackup="true"` (adb backup ile uygulama
>   verisi çekilebilir) açıktı.
> - **Değişiklikler:**
>   1. `android/app/src/main/AndroidManifest.xml`: her iki öznitelik `false`
>      yapıldı.
>   2. `server.ts` (savunmacı önlem): `/api/news` RSS ayrıştırmasında haber
>      görsel URL'lerinde `http://` → `https://` yükseltmesi — cleartext kapalı
>      Android'de http görsel zaten yüklenmezdi; https destekleyen kaynak
>      çalışmaya devam eder.
> - **Güvenlik analizi:** istemcide `http://` ağ isteği YOK (tek eşleşme
>   JobsView'daki SVG xmlns — ağ değil); tüm trafik https (Firebase, Render API,
>   Aladhan, görseller). Sunucudan istemciye giden veride http URL yalnızca RSS
>   görsellerinde olabilirdi → yükseltme eklendi. CORS localhost origin'leri
>   dev amaçlı, etkilenmez.
> - **Doğrulama:** `npx tsc --noEmit` exit 0; `npm run build` OK (server.cjs
>   72,5 kB); boot smoke-test EXIT 124 + "Server running" (kullanıcı `!` ile
>   çalıştırdı). Deploy `live`; CI "build" `success`; canlı `/api/news`:
>   count 30, channelsCount 3, `http://` görsel YOK.
> - **ÖNEMLİ SINIR:** manifest değişikliği **ancak yeni APK derlenip
>   kurulunca** etkili olur — mevcut kurulu APK'da hâlâ eski değerler var.
>   Bir sonraki APK derlemesinde (M6 istemci değişiklikleriyle birlikte)
>   manifest de devreye girecek. Android tarafında elle test önerilir
>   (giriş, haberler, görseller, bildirimler).
> - **Commit:** `5542427`.

> **09.11.2026 — M8 ÇÖZÜLDÜ (/api/currencies önbelleği; 4.2.4'ün kalan yarısı):**
>
> - **Sorun:** HomeView 60 sn'de bir `handleRefreshCurrencies()` çağırıyordu ve
>   `/api/currencies` her istekte doviz.com'u baştan tarıyordu (scrape + Render
>   yükü). Ayrıca endpoint'teki fetch'in timeout'u YOKTU — doviz.com yavaşlarsa
>   istek süresiz asılı kalabilirdi.
> - **Çözüm (haber endpoint'i /api/news ile birebir aynı model, M6 deseni):**
>   - `CURRENCIES_CACHE_TTL_MS` = 10 dk taze önbellek: taze önbellek varsa
>     doviz.com hiç taranmaz, önbellekteki payload doğrudan döner.
>   - `CURRENCIES_STALE_MAX_MS` = 2 saat bayat-fallback: doviz.com geçici
>     düşerse son başarılı sonuç `stale: true` + kaynak etiketinde "geçici
>     olarak önbellekten" notuyla sunulur; altında dürüst 500 hatası.
>   - Fetch'e 10 sn AbortController timeout eklendi.
>   - `CurrenciesApiPayload` interface'i + `currenciesCache` state'i eklendi.
>   - **İstemci değişmedi** (bilinçli): 60 sn polling sunucuda artık ucuz;
>     istemci değişikliği yeni APK gerektirirdi. `stale` alanı istemciye ek
>   alan olarak gider, `LiveCurrencyResponse`'da tanımlı olmasa da zararsız.
> - **Doğrulama:** `npx tsc --noEmit` exit 0; `npx eslint src` 0 error /
>   79 warning (80'den düştü); `npm run build` OK (server.cjs 72,4 kB);
>   boot smoke-test `npx -y ts-node server.ts` EXIT 124 (ayakta — M7 dersi).
>   (build + boot testi kullanıcı `!` ile çalıştırdı, Bash sınıflandırıcı
>   arızalıydı.)
> - **Commit:** `b3acdd8` — push edildi (kullanıcı `!` ile), auto-deploy
>   **`live`**. Canlı doğrulama: 18:19'da çekilen veri, dakikalar sonraki
>   tekrar çağrılarda aynı `lastUpdated` ("Bugün 18:19") ile önbellekten
>   dönüyor → scrape tekrarlanmıyor.
> - **Bilinen sınırlar:** istemci 60 sn'de bir sunucuya istek atmayı sürdürüyor
>   (yanıt önbellekten ucuz ama Render free uykudan uyanma 503'ü hâlâ yaşanabilir);
>   doviz.com scraping ToS riski sürüyor (4.1.5).

> **08.11.2026 — M7 ÇÖZÜLDÜ (M5 sonrası tüm Render deploy'ları update_failed; boot çökmesi):**
>
> - **Belirti:** d548ef6 (M5)'ten itibaren 5 deploy da ~90-110 sn'de `update_failed`;
>   canlıda M5 öncesi kod çalışıyordu. Dün geceki manuel deploy da faydasızdı.
> - **Teşhis süreci:** Render API'den deploy geçmişi çekildi (yeni `rnd_...` anahtarla;
>   son başarılı `713632a`, 88 sn). Başarılı deploy süresi ≈ başarısızların süresi
>   → build değil, **boot aşaması** şüphesi. Render'ın start komutu birebir lokalde
>   çalıştırıldı (`npx -y ts-node server.ts`) → `ERR_MODULE_NOT_FOUND:
> ./server/listings` — kök neden yerelde yakalandı.
> - **Kök neden:** `server.ts:6`'daki `import { listingsRouter } from './server/listings'`
>   (M5 ilavesi — server.ts'in İLK göreli import'u). Proje `"type": "module"` olduğundan
>   Node native ESM çözümleyicisi uzantısız göreli belirticiyi çözmez. Eski kodda göreli
>   import yoktuğu için aynı start komutu yıllardır sorunsuzdu. `tsc`, `tsx`, `esbuild`
>   bundler çözümlemesi yaptığından ve CI sunucuyu hiç başlatmadığından (yalnızca
>   lint+build) hata CI'da görünmezdi; lokal dev de `tsx server.ts` kullanıyordu.
> - **Çözüm:** import `'./server/listings.ts'` olarak değiştirildi (tam uzantı +
>   açıklama yorumu). tsconfig'de `allowImportingTsExtensions: true` zaten var.
> - **Doğrulama:** `npx -y ts-node server.ts` → EXIT 124 + "Server running"
>   (60 sn boyunca ayakta); `npx tsc --noEmit` exit 0; `npm run build` OK
>   (vite 1741 modül + esbuild dist/server.cjs 71,6 kB); `NODE_ENV=production
>   PORT=3999 node dist/server.cjs` → EXIT 124 + "Server running" (prod yolu da sağlam).
> - **Commit:** `6ca3a1a` (yalnızca server.ts, 4 satır) — push edildi, auto-deploy
>   **`live` (119 sn)**; canlı `/api/news` yeni kodu döndürüyor (3 kanal, gerçek
>   haberler, readCount yok) — M6+M7 birlikte canlıya geçti (08.11 akşam).
> - **Dersler:** (1) CI'a sunucu boot smoke-test'i eklenmeli (ör. `NODE_ENV=production
>   node dist/server.cjs` + 5 sn sonra port kontrolü) — ileride değerlendirilebilir;
>   (2) native ESM'de göreli import'lara daima tam uzantı; (3) Render `update_failed`
>   = build sonrası başlatma/aşama hatası (build hatası olsa `build_failed` olurdu).

> **07.11.2026 — M6 ÇÖZÜLDÜ (haber sistemi dürüstleştirme + performans):**
>
> - **Ölü RSS kaynakları çıkarıldı:** 7 kaynaktan 4'ü ölüydü (02.11 denetimi:
>   sehrivan: DNS yok, vanpostasi: 410, gazetevan: 404, vanekspres: bağlantı
>   kopuyor). Kalan 3 kaynak canlı doğrulandı (07.11, WebFetch): wanhaber.com
>   (~34 haber), vanolay.com (~34), vanhavadis.com (~20).
> - **`server.ts` `/api/news`:**
>   - ~90 satırlık `defaultTop7News` uydurma haber dizisi TAMAMEN SİLİNDİ.
>     Eskiden RSS başarısızsa sahte haberler `success: true` ile "canlı" gibi
>     döndürülüyordu. Artık veri yoksa **503 + `success: false` + Türkçe hata**
>     (dürüst hata).
>   - **10 dk sunucu önbelleği** (`newsCache`, `NEWS_CACHE_TTL_MS`): taze önbellek
>     varsa RSS taraması yapılmaz → Render ücretsiz planında yük büyük ölçüde düşer.
>   - **Bayat-önbellek fallback'i** (`NEWS_STALE_MAX_MS` = 2 saat): canlı kaynaklar
>     geçici olarak düşerse son başarılı sonuç `stale: true` + kaynak etiketinde
>     "geçici olarak önbellekten" notuyla sunulur (uydurma veri YOK).
>   - Sahte `readCount` (`Math.random()*1000+500`) kaldırıldı.
> - **`src/components/NewsView.tsx`:** polling **5 sn → 60 sn**; kanal listesi
>   (`VAN_NEWS_CHANNELS`, eski adı TOP_7_VAN_CHANNELS) 3 canlı kaynağa indi;
>   `newsError` state + "TEKRAR DENE" butonlu hata kartı eklendi (liste boşken);
>   sessiz yenileme başarısızsa mevcut liste KORUNUR; daha önce hiç render
>   edilmeyen `newsSourceInfo` artık başlık kartında "Kaynak:" olarak gösteriliyor
>   (bayat-önbellek notu burada görünür).
> - **`src/services/newsService.ts`:** hata durumunda artık sessiz boş sonuç yerine
>   Türkçe `Error` fırlatıyor (tek çağıran NewsView, catch bloğu var); timeout
>   60 sn → 15 sn.
> - **`src/types.ts`:** `NewsItem.readCount` kaldırıldı (UI kullanmıyordu).
> - **Doğrulama (kullanıcı çalıştırdı, Bash arızalı olduğu için):** `npx tsc
>   --noEmit` → exit 0; `npx eslint src` → **0 error, 80 warning** (M6 öncesi 87;
>   azalma: M5'in firebase.ts temizliği + `newsSourceInfo` artık kullanılıyor).
> - **Bilinen sınırlar / kalan ilgili işler:** haber bildirimleri hâlâ gün içinde
>   rastgele 5 saate planlanıyor (gerçek yeni haber kontrolü yok — Bölüm 4.2.10);
>   HomeView'un 60 sn'de bir doviz.com scrape tetiklemesi AYRI bir iş (Bölüm 4.2.4'ün
>   kalan yarısı — `/api/currencies`'e de önbellek gerekir); `any` uyarı borcu devam.

> **07.11.2026 — M5 KODU YAZILDI (ödeme doğrulaması backend'e taşındı; DONDURULDU):**
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
> - **Doğrulama durumu:** `npm install` ✅ (firebase-admin node_modules'da, 07.11 akşam
>   doğrulandı); commit + push ✅ (`d548ef6` + `bf8bab9` origin/main'de). CI, `npm audit
>   fix` adımı yüzünden kırıldı → adım kaldırıldı (`bf8bab9`); **CI'ın yeni run'ının
>   yeşil olduğu henüz KONTROL EDİLMEDİ**; yerel `tsc`/`lint` de bu oturumda
>   çalıştırılamadı (Bash sınıflandırıcı arızası — bkz. Bölüm 2 oturum #6 notu).
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
3. ~~**Ödeme doğrulaması istemci tarafında**~~ **⏸️ 07.11.2026 DONDURULDU (M5)** — kod
   tamam + commit + push; canlıya alma (Render env, APK, kural deploy'u) tüm sorunlar
   çözüldükten sonra iyzico/RevenueCat kararına göre yapılacak (Bölüm 2 dondurma notu).
4. ~~**AndroidManifest:** `android:usesCleartextTraffic="true"` ve `android:allowBackup="true"` açık~~
   **✅ 09.11.2026 çözüldü (M9)** — her ikisi `false` yapıldı + RSS görsellerinde
   http→https yükseltmesi (ayrıntı Bölüm 3'te). **Etkisi yeni APK derlenince
   görülür** (mevcut kurulu APK'da eski manifest var).
5. **Scraping ToS riski:** MGM / Diyanet / doviz.com / Eczacı Odası / van.bel.tr
   sahte User-Agent ile taranıyor; regex tabanlı parsing kırılgan.

### 4.2 🐛 Mantık Hataları

1. ~~**DealsView süre/fiyat uyuşmazlığı**~~ **✅ 06.11.2026 çözüldü** (JobsView modeline
   geçildi: gerçek RevenueCat paketleri + `durationDays`; ayrıntı Bölüm 3'te).
2. ~~**ESLint kırık (doğrulandı, exit -1)**~~ **✅ 06.11.2026 çözüldü (M4)** — tek flat
   config yazıldı, parser bağlandı, `.eslintrc.json` silindi; `npm run lint` exit 0
   (0 error / 87 warning — ayrıntı Bölüm 3). Kalan alt-görev: CI'ın main'de yeşil
   olduğunu push sonrası doğrulamak.
3. ~~**Haber sistemi: ölü RSS'ler + uydurma fallback + sahte readCount**~~ **✅ 07.11.2026
   çözüldü (M6)** — ölü 4 kaynak çıkarıldı, 10 dk önbellek + dürüst hata eklendi,
   uydurma veri ve sahte readCount kaldırıldı (ayrıntı Bölüm 3 M6 kaydı).
4. ~~**Aşırı polling / önbellek yok (haber kısmı)**~~ **✅ 07.11.2026 çözüldü (M6)** —
   NewsView 5 sn → 60 sn; sunucuda 10 dk önbellek. ~~Kalan yarısı: HomeView 60 sn'de bir
   doviz.com scrape tetikliyor~~ **✅ 09.11.2026 çözüldü (M8)** — `/api/currencies`'e de
   10 dk önbellek + bayat-fallback + fetch timeout eklendi; canlıda doğrulandı.
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
| 5 | 🟠 Yüksek | ~~RevenueCat backend entitlement doğrulaması; ilan yazımını backend'e taşı~~ **⏸️ 07.11.2026 DONDURULDU** — kod tamam+push'lı (`d548ef6`); tüm sorunlar bitince iyzico vs RevenueCat kararına göre tamamlanacak | Ödeme yapılmadan ilan yayımlanamıyor (ertelendi — M5 dondurma notu Bölüm 2'de) |
| 6 | 🟠 Yüksek | ~~Haber sistemi: 5 sn polling → 60+ sn; sunucuda 5–10 dk cache; ölü RSS'leri kaldır; uydurma fallback'i dürüst hata ile değiştir~~ **✅ 07.11 çözüldü (M6) + 08.11 CANLIDA (M7 ile)** | Kaynak etiketleri gerçek; sunucu istek/s sayısı düştü ✅ (canlıda doğrulandı) |
| 6b | 🟠 Yüksek | ~~`/api/currencies`'e önbellek (HomeView 60 sn'de bir doviz.com scrape tetikliyor)~~ **✅ 09.11 çözüldü (M8) + CANLIDA** (`b3acdd8`: 10 dk önbellek + bayat-fallback + 10 sn timeout) | Canlı tekrar çağrılar aynı `lastUpdated` ile önbellekten dönüyor ✅ |
| 7 | 🟡 Orta | ~~AndroidManifest: `usesCleartextTraffic` ve `allowBackup` kapat~~ **✅ 09.11 çözüldü (M9)** (`5542427`, canlıda) | Manifest temiz ✅ (kod düzeyinde; etki yeni APK'da) |
| 8 | 🟡 Orta | Kök temizliği: scriptler `scripts/` klasörüne, dump/debug dosyaları sil; tek lock dosyası kal | Kökte yalnız üretim dosyaları |
| 9 | 🟡 Orta | Markalaşma: `package.json` adı, `index.html` başlığı + `lang="tr"`, gerçek README | Başlık "Van Rehberim" |
| 10 | 🟢 İleri | HomeView'u alt bileşenlere böl; Firestore şemasını normalize et; Vitest testleri ekle | Testler CI'da koşuyor |

**Önerilen çalışma düzeni:** Her düzeltme ayrı commit + ayrı oturum; her oturum sonunda
bu dosyanın Bölüm 2/4/6'sı güncellenmeli (çözülenler Bölüm 3'e taşınmalı).

---

## 7. DOĞRULAMA ORTAMI VE KOMUTLAR

| Komut | Sonuç (09.11.2026, oturum #9 — M9 sonrası) |
|---|---|
| `npx tsc --noEmit` | ✅ exit 0 — temiz (M0–M9 sonrası doğrulandı) |
| `npx eslint src` | ✅ exit 0 — 0 error, **79 warning** (M8 sonrası; M9 src'yi değiştirmedi) |
| `npm run dev` | `tsx server.ts` — dev sunucusu (Vite middleware, port 3000/PORT) |
| `npm run build` | `vite build` + `esbuild server.ts → dist/server.cjs` |
| `npm start` | `node dist/server.cjs` (prod) |
| `npm run lint` | ✅ exit 0 — `tsc --noEmit && eslint src` (M4 sonrası) |

**Ortam:** Windows (PowerShell), çalışma dizini:
`c:\Users\FURKAN\Desktop\van-rehberim - Kopya`

**Ortama özgü notlar:**
- `clean` script'i (`rm -rf dist server.js`) Windows/PowerShell'da çalışmaz.
- Git durumu (09.11.2026, oturum #9): dal ucu `5542427` (M9: manifest güvenliği
  + http→https görsel yükseltmesi; deploy `live` + CI yeşil), önceki `d70a0c3`
  (MEMORY M8), `b3acdd8` (M8), `6ca3a1a` (M7), `78f4923` (M6), `bf8bab9` (CI
  düzeltmesi), `d548ef6` (M5), `713632a` (MEMORY), `a3f46e9` (M4), `daa6f3b`
  (M3), `7541456` (M2), `522e980` (M0+M1). **Hepsi origin/main'de** (push +
  CI `6ca3a1a`, `b3acdd8`, `5542427` için ✅ yeşil doğrulandı; `gh` CLI bu
  makinede kurulu DEĞİL — CI kontrolü GitHub API'den `/commits/{sha}/check-runs`
  ile yapılıyor). Keystore/APK ve yedek `*.tar.gz` dosyaları
  untracked + gitignore'lı, diskte yerlerinde. Geçmiş yeniden yazıldığı için
  04.11 öncesi eski hash'ler geçersiz.
- **Yeni ortam değişkenleri (M5):** `REVENUECAT_SECRET_API_KEY` (Render + lokal .env)
  ve `FIREBASE_SERVICE_ACCOUNT` (service account JSON'ı tek satır string; Render +
  lokal .env). İkisi de eksikken `/api/listings` bilinçli olarak 503 döner (fail-closed).
- **Render yardımcı dosyaları (repo DIŞINDA, `Desktop/yeni klasör/`):**
  `render apı keys.txt` (geçerli `rnd_...` API anahtarı, 08.11 güncellendi;
  eski `render-apı-key.txt` silindi), `render-deploy-status.sh` (son 5 deploy),
  `render-deploy-history.sh` (son 30 deploy + süreler), `render-logs.sh`
  (/v1/logs — parametre adları çözülemedi, şimdilik işlevsiz),
  `render-deploy-logs.sh` (deploy log endpoint'i 404 — işlevsiz),
  `render-setup.sh` (M5 env kurulumu; DONDURULDU, çalıştırma!),
  `revenuecat` (Secret API key), `vanrehberim-f181b-firebase-adminsdk-....json`
  (service account — Firestore tam yetki, dikkat). Bu klasör yedeklenmeli/
  güvende tutulmalı, işler bitince secret'lar silinmeli.
- 07.11.2026 oturum notu (#5): Bash araçları sistemsel arıza nedeniyle oturum boyunca
  kapalıydı; tüm doğrulamalar ertelendi. Oturum #6 notu: Bash'in güvenlik
  sınıflandırıcısı aralıklı arızalıydı — yalnızca önceden onaylı komutlar (git
  status/log/show, ls) çalıştı; `npx tsc`, `npm run lint`, curl reddedildi.
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
