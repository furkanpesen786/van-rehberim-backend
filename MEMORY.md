# 🧠 VAN REHBERİM — PROJE BELLEĞİ (MEMORY.md)

> **Amaç:** Bu dosya, projenin geliştirme sürecinde gelinen aşamayı, çözülen temel sorunları,
> alınan mimari kararları ve sıradaki adımların kalıcı kaydını tutar. Yeni bir çalışma
> oturumuna başlamadan önce bu dosya okunmalı, oturum sonunda güncellenmelidir.
>
> **Son güncelleme:** 27.11.2026 (oturum #25) — **M43: TÜRKİYE HUKUKİ
> UYUM PAKETİ (denetim + 4 düzeltme grubu; kod tamam, doğrulandı,
> commit bekliyor).** Kullanıcının getirdiği hukuk kontrol promptu
> (6502 ödeme ekranı, 6563 e-posta, 5846 telif, 5651 yer sağlayıcı,
> KVKK m.10 aydınlatma, m.9 yurt dışı aktarım) önce SALT-OKUNUR
> denetimle uygulandı (12 dosya okundu, rapor verildi, 4 grup düzeltme
> onayı alındı). Denetim sonucu: **madde 2 (ticari e-posta) TEMİZ** —
> kodda hiç e-posta gönderimi yok (nodemailer/SMTP/sendEmail: 0 sonuç;
> tek temas gelen yönlü mailto). Diğer 5 başlıkta 12 dosyada düzeltme:
> (1) **Politika metinleri** (SettingsView: gizlilik + KVKK + koşullar)
> gerçek veri envanterine göre yeniden yazıldı. KRİTİK bulgu: eski
> metin "verileriniz yurt içinde güvenli sunucularda saklanır" ve
> "yalnızca kamu kurumlarına aktarılır" diyordu — mimari Firebase
> (Google) + RevenueCat (ABD) + Render (ABD); ayrıca toplanan veri
> listesi eksikti (ad/fotoğraf/ilan telefonu/RevenueCat işlem kimliği
> yazmıyordu). Yeni metinler: veri sorumlusu + iletişim, gerçek veri
> envanteri (ilan verisinin HERKESE AÇIK yayınlandığı dahil), yurt
> dışı işlemci listesi (m.9), saklama süresi (ilan: yayın sonu + en
> geç 7 gün), tam m.11 hak listesi + 30 gün yanıt taahhüdü.
> (2) **Kullanım Koşulları'na 5651 yer sağlayıcı bildirimi** (Van
> Rehberim — furkanpesen786@gmail.com; şikayet inceleme + kaldırma
> taahhüdü). (3) **Ödeme ekranları** (JobsView form + DealsView Play
> modalı + HomeView taksi paywall/onay kutusu): dijital içerik cayma
> hakkı feragati (6502/MSY), taksi aboneliğinde "otomatik yenilenir +
> deneme sonu 1.000 TL otomatik tahsilat + iptal yolu (Google Play →
> Profil → Ödemeler ve abonelikler → Abonelikler)". (4) **Onboarding
> son slaytı** politika onay kutusu; "Başla" onaysız kilitli; "Atla" +
> ilk slaytta geri artık ONAY SLAYTINA yönelenir (hiçbir yol KVKK m.10
> onayını atlamaz). (5) **Kendi ilanını silme + bildirim kanalı**:
> server/listings.ts'e DELETE /api/listings/:type/:docId (Bearer ID
> token; sunucu doc.userId === uid yetki kontrolü; `delete:` ad
> alanlı rate limit) + POST /api/listings/takedown (TAKEDOWN_SECRET
> env — CACHE_INVALIDATION_SECRET'in fail-closed 503/401 deseni);
> listingService'e deleteOwnListing(); userId alanı types.ts
> (JobListing/Deal/TaxiStand) + firebase.ts (RawDealDoc/RawTaxiDoc) +
> dealMapping passthrough ile UI'a taşındı; JobsView detay + DealsView
> detay + HomeView taksi kartı: kendi ilanında SİL (confirm + yerel
> state'ten çıkar), başkasınınkinde BİLDİR (mailto, ilan ID hazır);
> HomeView'e taxiNotice geri bildirim şeridi. (M32'de no-op olduğu için
> kaldırılan taksi silme düğmesi GERÇEK akımla geri geldi.)
> (6) **KVKK saklama temizliği**: cleanupExpiredListings() —
> bitisTarihi < now−7gün dokümanları (koleksiyon başına 400/batch)
> siler; server.ts'te başlangıç +30 sn ve 24 saatte bir koşar; metindeki
> "en geç 7 günde silinir" taahhüdünün karşılığı. .env.example'e
> TAKEDOWN_SECRET bölümü eklendi. Doğrulandı: tsc ✅ + eslint ✅ +
> 82/82 test ✅ + build ✅ (server.cjs 150,9 kB). **BEKLEYEN:** commit
> + push + CI; Render'a TAKEDOWN_SECRET env'i eklenmezse takedown
> endpoint'i fail-closed KAPALI kalır (kullanıcı kararı — eklemek
> istiyorsa Render panelinden); cleanup + yeni metinler yeni deploy'la
> canlıya gider; APK'da görünmesi için yeni APK gerekli. Not: bu bir
> kontrol listesi düzeltmesidir, hukuki görüş değildir.
>
> **27.11.2026 (oturum #25, ilk bölüm) — M42 CANLI DOĞRULAMA TAMAM —
> express.json 1 MB gövde limiti Render'da ÇALIŞIYOR.** Dün pushlanan
> `62db2d0`'nin Render deploy'u canlıya çıkmış; zararsız dummy JSON
> POST'larıyla doğrulandı: /api/listings'e 200 KB gövde → HTTP 400
> "Geçersiz istek" (gövde rotaya ULAŞTI), 750 KB gövde (gerçek
> fotoğraflı ilan boyutu) → HTTP 400. Önceden 100 KB üstü her istek
> 413 PayloadTooLarge ile rotaya ulaşamıyordu (para alınıp ilan
> yayımlanmıyordu). **M42 TAMAMEN KAPANDI.** Kalan uçtan uca gerçek
> fotoğraflı ilan testi RevenueCat gerçek `goog_...` anahtarını
> bekliyor. Bash sınıflandırıcısı bu oturumda da aralıklı arızalıydı;
> doğrulama komutları kullanıcı `!` önekiyle çalıştırdı.
>
> **Son güncelleme (önceki):** 26.11.2026 (oturum #24) — **M42: CLINE DENETİMİ
> 2. TUR — 6 DÜZELTME (kod tamam, commit bekliyor).** Yeni rapor bulgu
> bulgu doğrulandı: 1 bulgu GEÇERSİZ (".gitignore commit edilmemiş" —
> 887479a'da zaten commitliydi, denetim bayat durum okudu). DOĞRULANAN
> VE DÜZELTİLEN: (1) **KRİTİK — express.json() gövde limiti:** varsayılan
> 100 KB, fotoğraflı indirim ilanı 750 KB'a kadar gönderiyor (5 × 150k
> base64) → istek rotaya ulaşmadan 413; akış ÖNCE ödeme SONRA ilan
> olduğundan **para alınıp ilan yayımlanmıyordu** (M29 retry da aynı 413'ü
> yiyordu). Çözüm: `express.json({ limit: '1mb' })` (Firestore 1 MiB
> doküman sınırıyla uyumlu); (2) **bildirim sesi:** `sound: 'beep.caf'`
> dosyası yoktu (.caf iOS formatı, res/raw klasörü hiç yok) → satır
> kaldırıldı, kanal importance:4 varsayılan sistem sesini çalar;
> (3) **AndroidManifest:** USE_EXACT_ALARM kaldırıldı (Play politikası
> alarma/takvim uygulamalarına özgü — reddedilme riski; SCHEDULE_EXACT_ALARM
> kalıyor); (4) **PWA manifest:** `"orientation": "portrait"` kaldırıldı
> (M40 responsive sonrası tablet yatay kullanılabilmeli; JSON'a yorum
> eklenmez — geçersiz kılınırdı); (5) weatherService `aqiColor` sabit
> 'emerald' → AQI değerine göre (emerald/amber/slate; not: alan şu an hiç
> bileşende kullanılmıyor); (6) server.ts news rotasında kullanılan `_req`
> → `req` (isimlendirme). Bilgi amaçlı (kod değişikliği yok): **.env'de
> gerçek Firebase Admin private key + RevenueCat secret var ve repo
> PUBLIC** — şu an temiz (hiç commit edilmemiş, gitignore koruyor) ama
> dikkat: klasörü paylaşırken/zip'lerken .env ve upload.keystore dışarı
> çıkmasın; şüphe olursa Firebase Console'dan anahtar iptal + yenile.
> Doğrulandı: tsc ✅ + eslint ✅ + 82/82 test ✅ + build ✅ + manifest
> JSON parse ✅. **Commit `62db2d0` pushlandı + CI ✅ yeşil — M42
> KAPANDI.** Dikkat: express.json düzeltmesi Render'da bir sonraki
> deploy'da canlıya gider — fotoğraflı ilan testi ancak o sonra yapılabilir.
>
> **Son güncelleme (önceki):** 26.11.2026 (oturum #23) — **M41: CLINE AI PROJE
> DENETİMİ DOĞRULANDI + 9 GEÇERLİ BULGU DÜZELTİLDİ (kod tamam,
> doğrulama/commit bekliyor).** Kullanıcının yaptırdığı Cline denetim
> raporu bulgu-bulgu incelendi: 2 bulgu GEÇERSİZ (HomeView activeModal
> değerleri set ediliyor; LoginModal'da e-posta UI yok — loginWithEmail
> devre dışı bilinçli), 9 bulgu GEÇERLİ ve düzeltildi: (1) **PWA manifest
> ölüydü** — ikonlar yanlış yerde + manifest bozuktu: `icons/ → public/icons/`
> taşındı, `public/manifest.webmanifest` sıfırdan yazıldı (7 webp ikon,
> relative yol, doğru type/purpose), `index.html`'e `<link rel="manifest">`
> eklendi; (2) **firestore-schema-audit.ts'te hardcode makine yolu** —
> kaldırıldı, yalnızca FIREBASE_SERVICE_ACCOUNT_FILE env'i (yoksa net
> hata + exit 1); (3) **server.ts'te ölü /api/weather MGM bloğu** (~290
> satır: parseMgmHadise/getWindDirectionName/getAqiDetails/weatherCache
> vb.) — silindi (weatherService aylardır doğrudan Open-Meteo'ya gidiyor),
> WeatherDayForecast import'u da temizlendi; (4) **JOB_DURATION_OPTIONS
> ölü export** — mockData.ts'ten silindi (0 kullanım); (5) **server.cjs
> APK'nın içine gömülüyordu** — esbuild outfile `dist/server.cjs` →
> `dist-server/server.cjs`, npm start/clean + ci.yml + README güncellendi
> (dist/ artık yalnızca web bundle → cap sync sonrası APK'dan server
> çıkmaz; Render start komutu npm start olduğu için etkilenmez); (6)
> **Unsplash stok foto fallback** — server.ts'te '' döner oldu +
> NewsView.tsx kart ve detay modalında görselsiz habere nötr Newspaper
> placeholder (koşullu render); (7) **build.gradle'de keystore yolu
> HATALIYDİ** — `rootProject.file('android/keystore.properties')`
> android/android/... arıyordu → `rootProject.file('keystore.properties')`
> düzeltildi (kullanıcı doğru yere koysa da okunmuyordu!); (8)
> `android/keystore.properties.example` şablonu oluşturuldu (keytool
> komutu + adımlar; gerçek dosya .gitignore'da zaten); (9) `akdamar
> copy.jpg` yinelenen görsel — kullanıcı `!` ile sildi.
> kullanıcıya bırakıldı). Kalan (kod dışı, kullanıcı tarafı): gerçek
> RevenueCat `goog_...` anahtarı hâlâ placeholder; Play Console yayınlama
> (upload.keystore + keystore.properties gerçek şifrelerle); Apple sign-in
> donuk. **Doğrulandı: tsc ✅ + eslint ✅ + 82/82 test ✅ + build ✅ + cap
> sync ✅ — assets/public içinde server.cjs YOK (APK şişkinliği giderildi).
> Commit `14d96ce` pushlandı; ancak `git add -A`, gitignore'da olmayan
> `dist-server/` build çıktılarını da (~387 kB) commit etti — takip
> düzeltmesi: `.gitignore`'a `/dist-server/` eklendi + `git rm -r --cached
> dist-server` ile repodan çıkarıldı** (Render zaten `npm run build`
> çalıştırıyor; dist/ da hep ignore'dı). Takip commit'i `887479a`. **İKİ
> COMMIT DE CI ✅ YEŞİL (build success) — M41 KAPANDI.**
>
> **Son güncelleme (önceki):** 25.11.2026 (oturum #22) — **M39 GERİ DÖNDÜ →
> GERÇEK KÖK NEDEN LOGCAT İLE BULUNDU VE ÇÖZÜLDÜ (3 dosya).** 24.11
> APK'sında da ikinci giriş takılıyordu; telefon USB + `adb logcat`
> ile canlı teşhis yapıldı. BULGULAR: (1) giriş aslında ÇALIŞIYORDU —
> hesap seçici görünmüyordu çünkü Android Credential Manager önceki
> izni SESSİZCE döndürüyor (normal davranış); (2) **logout asılı
> kalıyordu:** eklentinin native `signOut()` çağrısı sırasında
> `idTokenChange` dinleyicisi `No user is signed in` exception fırlatıp
> `firebaseAuth.signOut()`'u yarıda kesiyor → JS callback HİÇ resolve
> olmuyor → `clearNativeSession` sonsuz bekliyor (45 sn guard yalnızca
> signInWithGoogle'u sarmalıyordu, işe yaramıyordu); (3) tekrar giriş
> denemesinde `clearNativeSession` içinde takılma + `saveUserToFirestore`
> CapacitorHttp altında Firestore Write kanalı kırıldığı için hiç
> sonuçlanmıyor (M34 deseni) → loginWithGoogle promise'i asılı →
> sonsuz "İşleniyor...". ÇÖZÜM: (a) `capacitor.config.ts`
> `skipNativeAuth: true` — eklenti artık native Auth oturumu TUTMAZ,
> sadece credential döndürür (JS SDK signInWithCredential zaten
> mevcut desen; bayat oturum + signOut-hang sınıfı kökten kalktı);
> (b) `clearNativeSession` içindeki TÜM native çağrılar 5 sn timeout'lu;
> (c) `saveUserToFirestore` 8 sn iç timeout + AuthContext'te artık
> fire-and-forget (effect `setLoading(false)`'u ve login promise'ini
> bloklamıyor). Doğrulandı: tsc ✅ + 82/82 test ✅ + lint 0/0 ✅ +
> build ✅ + cap sync ✅ + **commit `f2969ce` pushlandı + CI ✅ yeşil**
> (build success). **YENİ DEBUG
> APK ÜRETİLDİ (25.11 17:54, 19 MB — M39-v2 dahil; APK içinden
> `skipNativeAuth: true` doğrulandı):** `android/app/build/outputs/apk/
> debug/app-debug.apk`. **TELEFONDA TEST EDİLDİ — ÇIKIŞ ✅ VE TEKRAR
> GİRİŞ ✅ SORUNSUZ (25.11, kullanıcı onayı) — M39 KAPANDI.**
> Kalan test: ~~M40 geniş ekran kontrolü~~ — **26.11'de telefonda
> DOĞRULANDI (kategoriler altta, sorunsuz) — M40 KAPANDI.**
>
> **Son güncelleme (önceki):** 24.11.2026 (oturum #21) — **M39 ÇÖZÜLDÜ + M40
> KOD TAMAM (doğrulama/commit bekliyor).** M39: çıkış sonrası ikinci
> giriş sonsuz "İşleniyor..." spinner'ında takılıyordu — `skipNativeAuth:
> false` yüzünden native eklenti oturumu bayat kalıyordu; `logout()`
> artık native `signOut` da yapıyor + girişlerden önce bayat oturum
> temizliği + 45 sn timeout guard. Doğrulandı (tsc/82 test/lint/build
> ✅), commit `0756cfc` pushlandı. M40 (kullanıcı talebi, tablet testi
> sonrası): **kategoriler her ekranda ALTTA** — TopNav.tsx SİLİNDİ,
> BottomNav `md:hidden` kaldırıldı (tüm boyutlarda görünür), görünüm
> alt dolguları `pb-28` (md:pb-10 geri alındı), sticky başlıklar
> `top-0` (md:top-16 geri alındı), DealsView FAB `bottom-20` +
> detay sticky `lg:top-6` (TopNav ofsetleri temizlendi). Tema/Giriş
> Ayarlar sekmesinde zaten mevcut. Doğrulandı: tsc ✅ + 82/82 test ✅ +
> lint ✅ + build ✅; commit `461cdb1` pushlandı + **CI ✅ yeşil**
> (0756cfc de ✅). **YENİ DEBUG APK üretildi (24.11 23:40, 19 MB —
> M39 + M40 dahil):** `android/app/build/outputs/apk/debug/app-debug.apk`.
> **Telefonda test listesi:** (1) çıkış yap → tekrar Google girişi →
> hesap seçici gelmeli, spinner bitmeli (M39); (2) tablette/geniş
> ekranda kategoriler altta (M40).
>
> **Son güncelleme (önceki):** 23.11.2026 (oturum #20) — **DUYARLI (RESPONSIVE) UI
> DÖNÜŞÜMÜ: AŞAMA 1–4 TAMAM, DOĞRULANDI** (tsc ✅, 82/82 test ✅, lint ✅,
> build ✅ — Bash sınıflandırıcısı yine arızalıydı, doğrulama komutunu
> kullanıcı `!` önekiyle çalıştırdı). Mobil öncelikli uygulama tablet
> (md/lg) ve masaüstü web'e (xl/2xl) taşındı; mobil deneyim birebir
> korundu. Aşama 2: kademeli kapsayıcılar (`max-w-md md:max-w-4xl
> lg:max-w-7xl mx-auto px-4 md:px-6`), mobilde BottomNav (`md:hidden`),
> md+ YENİ `TopNav.tsx` (sticky üst çubuk: sekmeler + tema + Giriş Yap),
> görünüm içi sticky başlıklar `md:top-16`, `pb-28 md:pb-10`. Aşama 3:
> liste grid'leri (`sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4`),
> kart görselleri `aspect-[4/3]` + object-cover + hover efektleri
> (`hover:shadow-lg hover:-translate-y-1`, `group-hover:scale-105`), FAB
> `md:bottom-6`. Aşama 4: detay sayfaları `lg:` 2 sütun (sol içerik,
> sağ `lg:sticky` iletişim kartı — ARA/KONUMA GİT/Paylaş); formlar
> `md:max-w-2xl` + iki sütunlu satırlar (taksi: şoför+telefon,
> plaka+ilçe); App.tsx köküne `overflow-x-hidden` (375/768/1440 px taşma
> koruması). HİÇBİR işlev değişmedi (Firebase sorguları, Express önbellek,
> RevenueCat tetikleyicileri, tel:/harita/WhatsApp linkleri). Önceki:
> oturum #19 — RevenueCat entegrasyonu (aşağıda).
>
> **Son güncelleme (önceki):** 23.11.2026 (oturum #19) — **REVENUECAT TÜKETİLEBİLİR
> İLAN SATIN ALMA ENTEGRASYONU: AŞAMA 1–4 KOD TAMAM** (Aşama 2+3 doğrulandı:
> tsc ✅, 85/85 test ✅, lint 0/0 ✅, build ✅; Aşama 4 kod tamam —
> tsc/vitest/lint/build doğrulaması Bash arızası nedeniyle BEKLİYOR, komut
> kullanıcıya verildi). Kullanıcı 4 aşamalı talebi, mevcut mimariyle
> çelişen noktaları görüşülerek uyarlandı: (1) "işletme kaydı" formu YOK
> (Places mock — atlandı); (2) mevcut ürün kimlikleri korundu
> (`ilan_30_gun`/`one_cikan_30_gun`/`taksi_ilan_aylik` — kullanıcının
> önerdiği yeni kimlikler Play Console'da yok); (3) Firestore yazımı
> SUNUCUDA kaldı (üretim kuralları create/update/delete kapalı; istemci
> yazsaydı reddedilirdi + ödeme doğrulaması zayıflardı) — `paymentStatus:
> 'paid'` + `paymentProvider: 'revenuecat'` SUNUCU tarafından sabitlenir,
> istemciden yalnızca kayıt amaçlı `transactionId` (128 kr sınır) kabul
> edilir. Aşama 2: `Capacitor.isNativePlatform()` guard (web'de sessiz
> atlama) + yer tutucu anahtar algılama (`YOUR_`/`xxxxx`) + logIn UID
> eşlemesi. Aşama 3: `getListingPackages(category)` + `purchaseListingPackage()`
> → `{success, cancelled, transactionId?}` sözleşmesi (iptal hata FIRLATMAZ;
> customerInfo gelmezse dürüst hata). Aşama 4: JobsView + DealsView +
> HomeView(taksi) yeni API'ye geçti; deprecated `purchasePackage()` SİLİNDİ;
> taksi akışına eksik olan M29 çift-ücret koruması EKLENDİ ("TEKRAR DENE
> (ÜCRET ALINMAZ)" + ödeme sırasında ✕ kilitli). Testler: 85 → 82
> (4 eski deprecated testi 1 yeni API karşılığıyla değiştirildi).
> **Aşama 4 doğrulandı: tsc ✅, 82/82 test ✅, lint 0/0 ✅, build ✅
> (23.11; server.cjs 156,1 kB). TÜM AŞAMALAR TAMAM — commit `d78927e`
> pushlandı (8 dosya, +422/−58) + **CI ✅** (GitHub Actions `build`
> success; Render otomatik deploy başlar).**
> **BEKLİYOR (kullanıcı):** gerçek `goog_...` anahtarı .env'ye + Play
> Console yayını (keystore.properties, ürünler Active). **YENİ DEBUG APK
> üretildi (23.11 19:29, 19 MB — Aşama 2-4 dahil)** ancak yer tutucu
> anahtar nedeniyle içinde RevenueCat etkin DEĞİL; ödeme testi için anahtar
> sonrası yeniden üretim gerek. Önceki: oturum #18
> — ölçek dönüşümü tamam (aşağıda).
>
> **Son güncelleme (önceki):** 22.11.2026 (oturum #18) — **ÖLÇEK DÖNÜŞÜMÜ TAMAM:
> AŞAMA 1–4 BİTTİ, CI ✅ + RENDER CANLIDA ✅** (aşama commit'leri:
> 2=`ea6f046`, 3=`050bf26`, 4=`cc6aa7f`; memory=`174bc87`).
> **Aşama 4 istemci değişiklikleri + M38 otobüs düzeltmesi içeren YENİ
> APK TELEFONDA TEST EDİLDİ — SORUN YOK ✅ (22.11, kullanıcı onayı).**
> Ölçek dönüşümü uçtan uca tamam.
> **TAM PROJE TARAMASI (22.11, aynı oturum):** 49 istemci + 7 sunucu
> dosyası + server.ts + kurallar tarandı. 4 bulgu DÜZELTİLDİ (firestore.rules
> sahibine update/delete tamamen KAPALI — ödeme bypass yolu kapatıldı;
> DealsView toast timer temizliği; weatherService dürüst offline etiketi;
> server.ts 9 `any` uyarısı gerçek tiplerle kapatıldı → lint artık 0/0).
> **Ödeme sistemi kararı: RevenueCat ile devam (kullanıcı onayı).**
> **BEKLİYOR: firestore.rules Firebase Console'dan ÜRETİME DEPLOY
> EDİLDİ ✅ (23.11, kullanıcı onayı).** Eski üretim kurallarında `create:
> if ownsNewDoc()` açığı vardı (giriş yapmış her kullanıcı ödemeden
> istemciden ilan oluşturabiliyordu) — yeni kurallarla create/update/
> delete tamamen backend'e kapatıldı.
> ÖNEMLİ git notu: dosyanın gerçek adı `MEMORY.md` (büyük harf) —
> `git add memory.md` Windows'ta sessizce HİÇBİR ŞEY yapamaz (index
> harfe duyarlı); her zaman `git add MEMORY.md` kullan. Amaç: Firestore okuma kotasını
> kullanıcı sayısından bağımsız yapmak. Aşama 1 (analiz) ✅ —
> koleksiyonlarda `status` alanı YOK (aktiflik = `bitisTarihi > now`);
> places yerel mock (businesses endpoint atlandı); deals'a İKİ ayrı
> onSnapshot dinleyicisi vardı (DealsView + SettingsView). Aşama 2 ✅ —
> `/api/v1/jobs|deals|taxis` (node-cache TTL 300 sn / maxKeys 500,
> X-Cache HIT/MISS, trust proxy 1, compression, /health, IP limiti
> 60/dk yalnızca /api/v1'de). Aşama 3 ✅ — ilan yayınında otomatik
> invalidasyon + `POST /api/v1/cache/clear` (fail-closed 503/401) +
> adminApp.ts bölünmüş env (geriye uyumlu JSON fallback) + `.env.example`
> tam liste. **Aşama 4 ✅ — `src/services/publicListingsService.ts` (YENİ):
> 2 dk bellek+localStorage önbelleği, paralel istek tekilleştirme, 4 sn
> AbortController timeout, düşüş = doğrudan Firestore getDocs;
> `src/lib/firebase.ts` üç subscribe* içi değişti (İMZALAR AYNI →
> görünümlere dokunulmadı); listingService yayın sonrası istemci önbelleği
> temizler; listingTimestampMillis string-seconds sağlamlaştırması.**
> Önceki: oturum #17 (20.11) — M38 ✅
> (`bc80288`, telefonda test için yeni APK gerekli); APPLE GİRİŞİ
> DONDURULDU (Apple Developer yok); M5 istemci tarafı dondurulmuş.
> Kullanıcı bildirimi: otobüs durakları ilk yüklemede
> 7 hat, ikinci yenilemede 87 hat geliyordu. Kök neden: Render free plan
> uykudayken soğuk başlangıç istemcinin 15 sn timeout'unu aşıyordu →
> busService 7 hatlık KURGUSSAL `BUS_ROUTES` mock'una düşüyordu (ikinci
> istekte sunucu uyanık → 87). Çözüm: gerçek van.bel.tr anlık görüntüsü
> `server/busFallbackData.ts` → `src/data/busSnapshot.ts`'e taşındı;
> istemci offline fallback'i artık bu 87 gerçek hat (dürüst etiket);
> kurgusal mock silindi; BusSection rozeti dürüst + 30 sn sonra bir kez
> arka plan yeniden denemesi. **Telefonda test için YENİ APK gerekli.**
> **APPLE GİRİŞİ DONDURULDU (kullanıcı kararı, 20.11):** telefonda test
> edildi — beklenen 2. katman hatası geldi ("identity provider
> configuration is not found": Firebase Console'da Apple sağlayıcısı etkin
> değil; etkinleştirmek Apple Developer Program $99/yıl + Service ID +
> Team ID + Key ID + .p8 gerektiriyor). Kullanıcı hesabı yok → sorun
> donduruldu; istenirse ileride Android'de Apple düğmesi gizlenir.
> Önceki: oturum #16 — M37 çözüldü (`e664809`); M36 onboarding telefonda
> test edildi ✅. **M5 İSTEMCİ TARAFI hâlâ dondurulmuş** (`goog_...`
> anahtarı + Play Console yayını bekliyor). M5 SUNUCU TARAFI canlıda.
> Bilinen ufak sorun: Render free plan uykudan soğuk başlangıçta ilk
> hesap silme denemesi 20 sn zaman aşımına düşebiliyor (tekrar deneyince
> çalışıyor — bkz. M35 kaydı).

---

## 1. PROJE KİMLİĞİ

**Van Rehberim**, Van ili için geliştirilen dijital şehir rehberi uygulamasıdır.
Google AI Studio'dan export edilen React projesi, Capacitor ile Android'e paketlenir;
backend Render.com üzerinde Express olarak çalışır.

| Katman | Teknolojiler |
|---|---|
| Frontend | React 19, TypeScript 5.8 (strict KAPALI), Vite 6, Tailwind CSS 4, lucide-react |
| Mobil | Capacitor 8 (yalnızca Android; iOS projesi yok), Firebase Auth, RevenueCat, LocalNotifications |
| Backend | Express 4 (`server.ts`, ~1.080 satır + `server/` modülleri) — scraping tabanlı veri toplama |
| Veri | Firebase Firestore (`is_ilanlari`, `indirim_ilanlari`, `taksiler`, `users`, `userFavorites`) |
| CI/CD | GitHub Actions (`.github/workflows/ci.yml`), Render deploy (`van-rehberim-api.onrender.com`) |

**Özellikler:** hava durumu, nöbetçi eczane, namaz vakitleri, döviz/altın kurları,
otobüs saatleri, haberler (RSS), iş/indirim/taksi ilanları (RevenueCat ödemeli),
yerel bildirimler, açık/koyu tema, Google/Apple girişi (e-posta girişi devre dışı).

**Kritik dosyalar:**
- `server.ts` — Express API: `/api/weather`, `/api/pharmacies`, `/api/prayer-times`,
  `/api/currencies`, `/api/bus-schedules`, `/api/news`
- `src/components/HomeView.tsx` (~960 satır) + `src/components/home/` — ana ekran
  ve 5 bölüm bileşeni (M25 bölünmesi)
- `src/lib/firebase.ts` — Firestore erişim katmanı (config hardcoded: `vanrehberim-f181b`)
- `firestore.rules` — güvenlik kuralları
- `android/app/upload.keystore` — Play Store imza anahtarı (⚠️ git'te izleniyor!)

---

## 2. GELİNEN AŞAMA

**25.11.2026 oturum #22 — M39 GERİ DÖNDÜ → GERÇEK KÖK NEDEN LOGCAT
TEŞHİSİYLE ÇÖZÜLDÜ (çıkış/tekrar giriş asılı kalması; 3 dosya):**

24.11 APK'sı telefonda test edildi: ikinci giriş HÂLÂ takılıyordu
(hesap seçici hiç gelmiyor, "İşleniyor..." spinner'ı 60 sn+ bitmiyor,
45 sn timeout hatası da ÇIKMIYORDU — bu, takılmanın sarmalanan
`signInWithGoogle` çağrısında OLMADIĞının ilk ipucuydu). Telefon USB
ile bağlandı (adb: `C:\Users\FURKAN\Android\Sdk\platform-tools\adb.exe`,
`ANDROID_HOME=C:\Users\FURKAN\Android\Sdk`), `adb logcat -c` → sorunu
reproduce et → `adb logcat -d` ile canlı log alındı.

**Logcat bulguları (m39-logcat.txt, 25.11 14:54-14:57):**
1. **Giriş aslında ÇALIŞIYORDU:** getCurrentUser anında `{user:null}`
   döndü → signInWithGoogle → Credential Manager hesap seçici
   ETKİNLİĞİ açıldı (com.android.credentialmanager) → 1,8 sn'de
   credential döndü (resultCode=-1) → native FirebaseAuth kullanıcayı
   girdi → JS SDK signInWithIdp + accounts:lookup tamam → kullanıcı
   GİRİŞ YAPMIŞTI. "Seçici hiç gelmedi" algısı: Credential Manager
   önceki oturumda izin verilen hesabı SESSİZCE döndürüyor (ekran
   kısa açılıp kapanıyor ya da hiç görünmüyor) — normal davranış.
2. **Logout asılıydı (asıl yeni bulgu):** kullanıcı Çıkış Yap'a
   basınca `fbSignOut` ✅ → eklentinin native `signOut()` çağrısı →
   log: `firebaseAuth.signOut()` sırasında eklentinin idTokenChange
   dinleyicisi `getIdToken` çağırdı → `java.lang.Exception: No user
   is signed in` (FirebaseAuthentication.java:188, handleIdTokenChange)
   → signOut YARIDA KALDI → PluginCall resolve EDİLMEDİ → JS tarafında
   `await FirebaseAuthentication.signOut()` sonsuz bekledi →
   `clearNativeSession` kilitlendi. (45 sn guard sadece
   signInWithGoogle'u sarmalıyordu — bu yüzden hiç ateşlenmedi.)
3. **saveUserToFirestore asılı:** giriş sonrası Firestore
   Write/channel istekleri 4 kez `transport errored` ile sonuçlandı,
   promise HİÇ settle olmadı (console.warn de çıkmadı — retry
   limbo'sunda) → loginWithGoogle promise'i bitmedi → LoginModal
   `finally` çalışmadı. M34'ün belgelediği CapacitorHttp-Firestore
   yazma sorununun aynısı.
4. Yan bulgu: aynı anda prayer/pharmacy/currency/bus servisleri de
   timeout yedi — Render free plan uykuda soğuk başlangıç (M38 bilinen
   durum, ayrı sorun değil).

**Düzeltmeler (3 dosya):**
1. `capacitor.config.ts`: `skipNativeAuth: false` → **`true`**. Eklenti
   artık KENDİ native Firebase Auth oturumunu TUTMAZ; yalnızca
   Google/Apple credential döndürür. Gerçek oturum JS SDK'da kurulur
   (AuthContext'te `signInWithCredential` zaten mevcut — eklenti
   dokümantasyonunun JS SDK ile birlikte kullanım için önerdiği desen).
   Kökten kaldırdığı sorunlar: (a) çıkışta bayat native oturum, (b)
   idTokenChange-listener exception'ının signOut'u kilitlemesi (native
   oturum olmadığından dinleyici tetiklenmez), (c) çift oturum state'i.
   `getCurrentUser()` artık her zaman null döner → clearNativeSession
   fiilen no-op; native signOut yolu tamamen kapandı. M37 providers
   listesi (`google.com`, `apple.com`) korundu.
2. `src/context/AuthContext.tsx`: (a) `withNativeTimeout` artık
   parametreli (varsayılan 45 sn); `clearNativeSession` içindeki
   `getCurrentUser` + `signOut` DAHİL tüm native çağrılar 5 sn
   timeout'lu — eklenti asılı kalsa bile giriş/çıkış ilerler;
   (b) onAuthStateChanged effect'inde `setLoading(false)` artık
   `saveUserToFirestore`'u BEKLEMİYOR (kayıt `void` ile fire-and-forget);
   (c) loginWithGoogle/loginWithApple'daki `await saveUserToFirestore`
   blokları kaldırıldı → giriş promise'i signInWithCredential bitince
   ANINDA bitiyor, modal/spinner kapanıyor.
3. `src/lib/firebase.ts`: `saveUserToFirestore` içine 8 sn
   `Promise.race` timeout'u eklendi (M34 sınıfı asılı kalmaya karşı
   son savunma; timeout'ta hata yutulur — profil kaydı best-effort).
- Doğrulama: tsc ✅ + vitest 82/82 ✅ + eslint 0/0 ✅ + build ✅ +
  `npx cap sync android` ✅ (android assets'te `skipNativeAuth: true`
  doğrulandı).
- **Commit `f2969ce` (4 dosya, +181/−69) origin/main'e pushlandı +
  CI ✅ yeşil** (check-runs: build completed/success, 25.11; Render
  otomatik deploy başlar). Commit komutu Bash arızası nedeniyle
  kullanıcı `!` önekiyle çalıştırdı.
- **YENİ DEBUG APK ÜRETİLDİ (25.11 17:54, 19 MB; BUILD SUCCESSFUL —
  APK içinden `skipNativeAuth: true` doğrulandı):** `android/app/build/
  outputs/apk/debug/app-debug.apk`. **TELEFONDA TEST EDİLDİ ✅ (25.11,
  kullanıcı onayı): çıkış anında çalışıyor + tekrar giriş sorunsuz —
  M39 KAPANDI.** Kalan: M40 geniş ekran kontrolü (kategoriler altta).
- Bash sınıflandırıcısı bu oturumda da aralıklı arızalıydı; adb/logcat
  komutlarını kullanıcı `!` önekiyle çalıştırdı; tsc/test/lint/build/
  cap sync ara ara Claude Bash ile çalıştı.

**24.11.2026 oturum #21 — M40 TAMAMLANDI (kategoriler her ekranda altta;
kullanıcı talebi, tablet testi sonrası; 8 dosya):**

Kullanıcı, responsive APK'yı tablette test etti — sorun yok ✅; ancak
kategorilerin yukarıdaki TopNav sekmelerinde değil, telefonda olduğu
gibi ALTTA olmasını istedi. Seçenek B onaylandı: TopNav tamamen
kaldırılır, BottomNav tüm boyutlarda görünür (tema + Giriş Yap zaten
Ayarlar sekmesinde mevcut — işlev kaybı yok).

- `src/components/TopNav.tsx` SİLİNDİ (`git rm`); `App.tsx`'ten import +
  render kaldırıldı.
- `BottomNav.tsx`: `md:hidden` kaldırıldı — sabit hap navigasyon artık
  mobil/tablet/masaüstü TÜM boyutlarda altta (`fixed bottom-3
  max-w-lg`).
- Tüm görünüm kökleri: `pb-28 md:pb-10` → `pb-28` (alt nav her yerde
  olduğu için alt dolgu telafisi de her yerde; HomeView, PlacesView,
  NewsView, DealsView, JobsView, SettingsView) + DealsView form dalı
  `pb-32 md:pb-10` → `pb-32`.
- Sticky başlıklar `top-0 md:top-16` → `top-0` (NewsView, SettingsView,
  DealsView form başlığı — TopNav artık yok, ofset gereksiz).
- DealsView: FAB `bottom-20 md:bottom-6` → `bottom-20` (alt nav'ın
  üstünde kalır); detay sayfası sağ sticky kart `lg:top-20` → `lg:top-6`
  (TopNav h-16 ofseti temizlendi).
- Aşama 3–4 responsive kazanımları KORUNDU: kademeli kapsayıcılar
  (`max-w-md md:max-w-4xl lg:max-w-7xl`), liste grid'leri
  (`sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4`), kart
  hover/aspect-[4/3], lg 2 sütunlu detay sayfaları, formlar
  `md:max-w-2xl`, `overflow-x-hidden`.
- Doğrulama: tsc ✅ + vitest 82/82 ✅ + lint 0/0 ✅ + build ✅ (Bash
  sınıflandırıcısı arızalı — `git rm` dahil tüm komutlar kullanıcı `!`
  önekiyle çalıştırdı).
- Web (Render) tarafında yeni deploy ile anında etkili; **YENİ DEBUG APK
  üretildi (24.11 23:40, 19 MB — M39 + M40 dahil; build + cap sync +
  assembleDebug BUILD SUCCESSFUL):** `android/app/build/outputs/apk/debug/
  app-debug.apk`. Test listesi: (1) çıkış → tekrar Google girişi → hesap
  seçici + giriş tamamlanmalı (M39); (2) geniş ekranda kategoriler
  altta (M40).

**24.11.2026 oturum #21 — M39 ÇÖZÜLDÜ (çıkış sonrası ikinci giriş sonsuz
"İşleniyor..." spinner'ında takılıyor; tek dosya: AuthContext.tsx):**

Kullanıcı bildirimi (telefon): hesaptan çıkış yaptıktan sonra tekrar giriş
yapmaya çalışınca yükleme ekranı geliyor ve bir şey olmuyor. (Aynı oturumda:
responsive APK tablette test edildi — sorun yok ✅; M40 talebi alındı:
tablette kategoriler altta olsun.)

- Kök neden: `capacitor.config.ts` → FirebaseAuthentication
  `skipNativeAuth: false`. Native eklenti kendi Auth oturumunu tutar;
  `AuthContext.logout()` yalnızca web SDK `fbSignOut(auth)` yapıyordu.
  Çıkış sonrası native oturum bayat şekilde açık kalıyordu ve ikinci
  `FirebaseAuthentication.signInWithGoogle()` çağrısı promise'i hiç
  sonuçlandırmıyordu → LoginModal'daki "İşleniyor..." overlay'i sonsuza
  kadar kalıyordu. (M35 hesap silme akışı bu yüzden zaten native
  `FirebaseAuthentication.signOut()` kullanıyordu — normal çıkışta aynı
  desen eksik kalmıştı.)
- Düzeltmeler:
  1. `logout()`: web SDK `signOut` sonrası `clearNativeSession()` —
     native `getCurrentUser()` kullanıcı dönerse `signOut()` (idempotent;
     try/catch — temizlik hatası çıkışı engellemez).
  2. `loginWithGoogle`/`loginWithApple` (native dal): signIn çağrısından
     ÖNCE `clearNativeSession()` — uygulama kill edilip oturumun yarım
     kaldığı yollar için savunma (logout dışı bayat oturum senaryoları).
  3. `withNativeTimeout(label, promise)`: 45 sn `Promise.race` zaman
     aşımı — native eklenti hata fırlatmadan asılı kalırsa LoginModal
     catch'ine Türkçe hata gider ("...işlemi zaman aşımına uğradı.
     Lütfen tekrar deneyiniz."), sonsuz spinner artık imkânsız.
  4. Web dalı (signInWithPopup) ve tüm işlev imzaları değişmedi;
     LoginModal'a dokunulmadı.
- Doğrulama: tsc ✅ + vitest 82/82 ✅ + lint 0/0 ✅ + build ✅
  (dist 355,5 kB + vendor 798,9 kB; server.cjs 156,1 kB) — Bash
  sınıflandırıcısı oturum boyunca aralıklı arızalıydı, doğrulama
  komutunu kullanıcı `!` önekiyle çalıştırdı.
- **Telefonda test için YENİ APK gerekli** (`npm run build` →
  `npx cap sync android` → `gradlew assembleDebug`): çıkış yap → tekrar
  Google girişi → hesap seçici açılmalı ve giriş tamamlanmalı.
- Tam yedek alındı: `Desktop/van-rehberim-YEDEK-2026-11-24.tar.gz` (48 MB).

**23.11.2026 oturum #20 — DUYARLI (RESPONSIVE) UI DÖNÜŞÜMÜ (Aşama 1–4; tamam
ve doğrulandı):**

Kullanıcı 4 aşamalı responsive dönüşüm talebi verdi (senior UI/UX +
Responsive Frontend mimarı rolü; tablet md/lg + masaüstü xl/2xl; mobil
deneyim BOZULMAYACAK; her aşama sonunda onay — 4 onay da alındı).
Kural: hiçbir mevcut fonksiyon (Firebase sorguları, Express önbellek
katmanı, RevenueCat satın alma tetikleyicileri, harita/WhatsApp
yönlendirmeleri) silinmeyecek/bozulmayacak; tsc + Vite build hatası
kalmayacak.

**Aşama 1 (analiz, kod değişikliği yok):** daraltma App.tsx kökünde değil
GÖRÜNÜM bazlı (`max-w-md`/`max-w-lg`); BottomNav tek navigasyon (fixed
pill, `max-w-lg`); JobsView'ta kısmi grid zaten vardı; modallar zaten
max-w kısıtlı. Sticky başlık + yeni üst çubuk çakışma riski tespit
edildi (çözüm: görünüm başlıkları z-30, TopNav z-40, `md:top-16`).

**Aşama 2 — kademeli kapsayıcı + akıllı navigasyon:**
- Tüm görünüm kapsayıcıları: `w-full max-w-md md:max-w-4xl lg:max-w-7xl
  mx-auto px-4 md:px-6` (HomeView/PlacesView/DealsView/JobsView;
  NewsView `max-w-xl md:max-w-3xl lg:max-w-5xl`; SettingsView
  `max-w-md md:max-w-2xl lg:max-w-4xl`).
- `src/components/TopNav.tsx` YENİ: `hidden md:block sticky top-0 z-40`
  backdrop-blur üst çubuk — logo, 6 sekme (lg+ etiketli, aktif hap),
  tema düğmesi (Sun/Moon), Giriş Yap gradyan düğmesi / kullanıcı çipi;
  App.tsx `activeTab` state'ini paylaşır.
- BottomNav `md:hidden`; görünüm içi sticky başlıklar `top-0 md:top-16`
  (TopNav h-16 altına oturur); alt dolgu `pb-28 md:pb-10` (bottom-nav
  telafisi yalnız mobilde).

**Aşama 3 — duyarlı grid'ler + kartlar:**
- Liste grid'leri: `grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3
  xl:grid-cols-4 gap-4` (Deals/Places/Jobs); yükleme/hata/boş
  durumları `col-span-full`.
- Kart görselleri `w-full aspect-[4/3]` + `object-cover` (pikselleşme
  önlenir); `hover:shadow-lg hover:-translate-y-1 transition-all`,
  `group-hover:scale-105`, `cursor-pointer`; FAB `fixed bottom-20
  md:bottom-6 right-6`.
- DealsView ilan kartı yatay→dikey yeniden yapılandırıldı (tüm
  onClick/href işleyicileri korunarak).

**Aşama 4 — detay sayfaları 2 sütun + formlar + taşma koruması:**
- JobsView iş detayı: modal `max-w-lg md:max-w-2xl lg:max-w-4xl`, foto
  `h-48 lg:h-64`, içerik `lg:grid lg:grid-cols-[1fr_320px]` — sol:
  sağlayıcı kartı + açıklama; sağ: `lg:sticky` Konum & Detaylar kartı
  + ARA (tel:) + Paylaş. İş formu `md:max-w-2xl`.
- DealsView ilan detayı: `lg:grid-cols-[1fr_360px]` — sol: `lg:h-96`
  görsel + başlık/açıklama/M29 fotoğrafları; sağ: `lg:sticky lg:top-20`
  İŞLETMEYİ ARA (tel:) + KONUMA GİT (harita).
- PlacesView yer detay modalı `md:max-w-2xl`.
- HomeView taksi formu: `md:max-w-2xl` + iki sütunlu satırlar
  (şoför+telefon; plaka+ilçe seçimi yukarı taşındı; bölgeler
  textarea'ısı tam genişlik).
- App.tsx kök div `overflow-x-hidden` → 375/768/1440 px'de yatay
  kaydırma oluşamaz.

**Doğrulama:** tsc ✅ + vitest 82/82 ✅ + lint 0 hata ✅ + build ✅
(23.11; komut Bash sınıflandırıcı arızası nedeniyle kullanıcı `!`
önekiyle çalıştırdı). Taşma kontrolü: 375 px mobil birebir korundu,
768 px 2 sütun + TopNav aktif, 1440 px 3-4 sütun + 2 sütunlu detay.

**YENİ DEBUG APK üretildi (23.11 23:23, 19 MB — responsive Aşama 1–4
dahil; build+cap sync+assembleDebug tamam, komut kullanıcı `!` önekiyle
çalıştırdı):** `android/app/build/outputs/apk/debug/app-debug.apk` —
tablet testi bekliyor (dikey=mobil düzen, yatay/geniş=TopNav + grid).
Responsive değişiklikler web (Render) tarafında yeni deploy ile anında
etkili.

---

**23.11.2026 oturum #19 — REVENUECAT TÜKETİLEBİLİR İLAN SATIN ALMA
ENTEGRASYONU (Aşama 1–4; kod tamam, Aşama 4 doğrulaması bekliyor):**

Kullanıcı 4 aşamalı entegrasyon talebi verdi (senior React/TS/Capacitor/
RevenueCat rolü; her aşama sonunda onay). Talepteki mimariyle mevcut kod
çelişiyordu — kullanıcı onayıyla şu uyarlamalar yapıldı:
- **"İşletme kaydı" formu yok** (Places = yerel mock, Firestore koleksiyonu
  yok) → üç MEVCUT akışa (job/deal/taxi) entegrasyon yapıldı.
- **Kullanıcının önerdiği ürün kimlikleri yok** (`isletme_kayit_paketi`
  vb. Play Console'da tanımlı değil) → mevcutlar korundu:
  `ilan_30_gun`, `one_cikan_30_gun`, `taksi_ilan_aylik`.
- **Firestore'a istemci yazımı REDDEDİLDİ** → üretim `firestore.rules`
  üç ilan koleksiyonunda create/update/delete tamamen kapalı (23.11
  deploy); ayrıca M5 "pull" modeli ödemeyi sunucuda doğruluyor. Yazma
  POST /api/listings'te kaldı; `paymentStatus`/`paymentProvider`/
  `transactionId` sunucu tarafında eklendi.

**Aşama 1 (analiz):** purchaseService (mevcut: setup/getPackages/
getPackageByProductId/purchasePackage/deprecated sözleşme), App.tsx
setup çağrısı (uid ile), üç görünümün form/payload yapısı raporlandı.

**Aşama 2 — platform güvenliği (`src/services/purchaseService.ts`):**
- `Capacitor.isNativePlatform()` guard: web derlemesinde configure
  ÇAĞRILMAZ (eklenti implementation'u yok), sessiz atlama.
- Yer tutucu anahtar algılama: `YOUR_`/`xxxxx` içeren anahtarla configure
  çağrılmaz (sahte anahtarla runtime patlaması engellendi).
- İkinci setup = `Purchases.logIn({appUserID: uid})` (Firebase UID
  eşlemesi; sunucu subscriber sorgusu uid ile yapıyor — kritik eşleşme).
- +5 test (`vi.stubEnv`, `@capacitor/core` mock'u eklendi).

**Aşama 3 — kategorik satın alma API'si (aynı dosya):**
- `ListingCategory = 'job'|'deal'|'taxi'` + `CATEGORY_PACKAGE_IDS`
  haritası; `getListingPackages(category)` offerings'tan yalnızca o
  kategorinin ürünlerini döndürür (M29 "yanlış paket" riski servis
  katmanına taşındı).
- `purchaseListingPackage(target: string | PurchasesPackage)` →
  `{success, cancelled, transactionId?}`: iptal hata FIRLATMAZ (form
  korunur), ağ hatası/düşük SDK yanıtı dürüst Türkçe Error. Eski
  `purchasePackage`'ın sessiz-false hatası (customerInfo yokken
  "satın alınmadı" demek) düzeltildi.
- Doğrulandı: tsc ✅, 85/85 test ✅, lint 0/0 ✅, build ✅.

**Aşama 4 — ödeme kapılı yazım akışı:**
- `server/listings.ts`: docData'ya `paymentStatus: 'paid'` +
  `paymentProvider: 'revenuecat'` SABİT (istemci yazamaz); istemciden
  gelen `transactionId` varsa trim+128 karakter sınırıyla kayıt amaçlı
  yazılır (gerçek doğrulama zaten adım 3'te sunucuda bağımsız).
- `purchaseService.ts`: deprecated `purchasePackage()` SİLİNDİ.
- `JobsView.tsx` + `DealsView.tsx`: `getListingPackages('job'/'deal')`;
  `purchaseListingPackage(selectedPackage)`; `transactionIdRef` ile
  işlem kimliği payload'a; M29 deseni korundu.
- `HomeView.tsx` (taksi): önceden OLmayan M29 çift-ücret koruması
  eklendi — `purchaseCompletedTaksi` guard (ödeme sonrası yazım hatası
  → "TEKRAR DENE (ÜCRET ALINMAZ)" yalnızca yazımı yeniden dener);
  `taxiTransactionIdRef`; ödeme sırasında ✕ düğmesi kilitli; form
  yeniden gönderiminde durum sıfırlanır.
- `purchaseService.test.ts`: 4 eski deprecated test 1 yeni API
  karşılığıyla değiştirildi (85 → 82 test).
- **DOĞRULAMA:** tsc ✅ + vitest 82/82 ✅ + lint 0/0 ✅ + build ✅
  (server.cjs 156,1 kB) — Aşama 2/3'ün doğrulaması kullanıcı `!`
  önekiyle, build Claude Bash ile çalıştı. **Commit `d78927e` (8 dosya,
  +422/−58) origin/main'e pushlandı** (Bash arızası nedeniyle commit
  komutunu da kullanıcı `!` önekiyle çalıştırdı). **CI ✅** (GitHub API
  `/commits/d78927e/check-runs` → `build` completed/success, 23.11) —
  Render otomatik deploy'u başlar; canlı doğrulama için
  `curl https://van-rehberim-api.onrender.com/health` kontrol edilebilir
  (free plan soğuk başlangıçta ~30-50 sn sürebilir).

**Bekleyen (kullanıcı tarafı):** gerçek `goog_...` RevenueCat public
anahtarı yerel `.env`'ye; Play Console yayını (keystore.properties,
üç ürün Active). Kod tarafında yapılabilecek bir şey YOK — anahtar
yer tutucu kaldıkça configure bilinçli olarak atlanır.

**21–22.11.2026 oturum #18 — ÖLÇEK DÖNÜŞÜMÜ: AŞAMA 1 + 2 TAMAM (Firestore
okuma kotası koruması; Aşama 2 commit `ea6f046`, 6 dosya +430/−24):**

Kullanıcı isteği: yüksek trafik (100.000+ günlük kullanıcı) altında
Firestore okuma kotalarını tüketmeyecek + Render'da sorunsuz çalışan
4 aşamalı mimari dönüşüm (Auth + RevenueCat akışlarına zarar vermeden;
her aşama sonunda onay beklenir).

**Aşama 1 (analiz, kod değişikliği yok) — bulgular:**
- Firestore liste okuyan tek nokta: `src/lib/firebase.ts` üç
  `subscribe*` (onSnapshot + `bitisTarihi > now`): jobs→JobsView,
  deals→DealsView **VE** SettingsView (çift dinleyici!), taxis→HomeView.
  Her görünüm mount'ında yeni dinleyici + M22 long-polling → asıl kota
  yakıcı bu. `users` yalnızca yazma; `userFavorites` M28'den beri
  localStorage.
- **Koleksiyonlarda `status` alanı YOK** — aktiflik `bitisTarihi`
  (Timestamp) > now; sunucu `bitisTarihi`/`createdAtTimestamp` yazar.
  v1 filtreleri bu alanla yapıldı (istemci sorgularıyla birebir).
- Places (İşletmeler) Firestore'ta DEĞİL — `PLACES_TO_VISIT` mock'u →
  `/api/v1/businesses` BİLİNÇLİ ATLANDI (tasarruf sıfır).
- `node-cache`/`compression`/`express-rate-limit` kurulu değildi;
  trust proxy / /health / compression yoktu; `.env.example` AI Studio
  kalıntısıydı (eksik: FIREBASE_SERVICE_ACCOUNT, REVENUECAT_SECRET_API_KEY,
  SCRAPERAPI_KEY, PORT).
- Yazma yolu zaten tamamen sunucuda (POST /api/listings) → Aşama 3
  invalidasyon noktası bedava.

**Aşama 2 (`ea6f046`) — uygulanan:**
1. `server/cacheService.ts` (YENİ): node-cache — `publicDataCache`
   (stdTTL 300 sn, maxKeys 500 — Render 512 MB RAM koruması) +
   `CACHE_KEYS` (v1:jobs/deals/taxis — Aşama 3 invalidasyonu için).
2. `server/publicData.ts` (YENİ): `publicDataRouter` — GET
   `/api/v1/jobs|deals|taxis`. HIT → RAM'den (Firestore'a gidilmez);
   MISS → Admin SDK `where('bitisTarihi','>',Timestamp.now())` +
   sunucu tarafı createdAtTimestamp desc sıralama (`sortByNewestFirst`
   src/utils/listingSort.ts'ten paylaşımlı — composite index GEREKMEZ).
   Yanıt: `{success, count, jobs|deals|taxis: [{id, ...data}]}` —
   Timestamp'ler JSON'da {seconds, nanoseconds}; istemcinin
   `listingTimestampMillis` bu biçimi destekliyor. Fail-closed 503
   (env yok) / dürüst 502 (Firestore hatası). TS notu: spread dizin
   imzasını düşürür → `(d): PublicListingItem =>` açık tip şart.
3. `server.ts`: `app.set('trust proxy', 1)` (Render reverse proxy —
   express-rate-limit v7 IP doğruluğu); `compression()`; `GET /health`
   (`{status:'ok', uptime}` — Firestore'suz); express-rate-limit
   60/istek-dk-IP **yalnızca `/api/v1`'e** (bilinçli: /api/listings +
   /api/account uid limiter'lı ödeme yolları IP limitiyle
   bloklanmasın — CGNAT riski; `API_V1_RATE_LIMIT_PER_MINUTE` env'i
   ile ayarlanabilir, standart başlıklar draft-7).
4. Yeni paketler: node-cache, compression, express-rate-limit +
   @types/compression (dev). Not: npm audit 21 bulgu (19 orta/2 yüksek)
   — mevcut bağımlılıklardan, bu aşamadan değil.
- **Doğrulama:** tsc ✅; eslint 0 error / 9 warning (bilinen borç);
  **65/65 test** ✅; build ✅ (server.cjs 153,8 kB); YEREL duman testi
  (NODE_ENV=production, dist/server.cjs): /health ok, ilk istek
  `X-Cache: MISS` + RateLimit başlıkları, ikinci `X-Cache: HIT`;
  **CI ✅ yeşil + Render `ea6f046` `live` + CANLIDA doğrulandı**
  (/health 200; /api/v1/jobs 200, ratelimit-limit: 60, x-cache
  MISS→HIT). Dev notu: `node dist/server.cjs` NODE_ENV'siz DEV moda
  düşer (Vite middleware) — duman testlerinde NODE_ENV=production şart.
- **Bekleyen:** Aşama 4 sonrası telefonda test için YENİ APK gerekli
  (M38 otobüs düzeltmesi de aynı APK'da olacak).

**Aşama 4 (aynı oturum, commit bekliyor) — istemci /api/v1 geçişi:**

1. `src/services/publicListingsService.ts` (YENİ): liste verisi taşıma
   katmanı. Katman sırası: 2 dk BELLEK önbelleği → 2 dk localStorage
   (ad alanlı anahtarlar `van_public_v1_*`; base64 görseller kota
   doldurursa yazma sessizce atlanır, 1,5 MB boyut koruması) →
   fetch `/api/v1/...` 4 sn AbortController timeout (Render soğuk
   başlangıcı ~30-50 sn; M38 busService deseni) → DÜŞÜŞ: doğrudan
   Firestore getDocs (çağıranın verdiği fallback fonksiyonu).
   Paralel çağrılar `inflight` Map ile tek promise'e katlanır
   (DealsView + SettingsView aynı veriyi isterse tek istek).
   `clearPublicListingsCache(key?)` — yayın sonrası tazeleme.
   Yanıt doğrulaması: `success === true` + `Array.isArray(items)`,
   yoksa düşüş. Önbelleğe fallback sonucu da yazılır (2 dk).
2. `src/lib/firebase.ts`: üç `subscribeJobListings/subscribeDeals/
   subscribeTaxis` İÇİ değişti, İMZALAR AYNI — JobsView, DealsView,
   SettingsView, HomeView'e TEK SATIR dokunulmadı. onSnapshot
   kaldırıldı (kota yakıcı ana neden); yerine async fetch + `cancelled`
   bayraklı unsubscribe. Firestore'a doğrudan sorgu (getDocs + aynı
   `bitisTarihi > now` + sortByNewestFirst) yalnızca DÜŞÜŞ olarak
   kaldı (fetchJobs/Deals/TaxisFromFirestore). `onSnapshot` import'u
   silindi; M22 `experimentalForceLongPolling` flag'i KORUNDU (Auth
   yazmaları + fallback getDocs için). Davranış farkı: abonelik
   "canlı güncelleme" yerine mount başına tek atım — istemci önbelleği
   + yayın sonrası temizlik bunun telafisi.
3. `src/services/listingService.ts`: `submitPaidListing` başarılı
   yanıtta `clearPublicListingsCache()` — sunucu önbelleği zaten
   invalid edildi; istemci önbelleği de temizlenince yeni ilan bir
   sonraki liste açılışında anında görünür.
4. `src/utils/listingSort.ts`: `listingTimestampMillis` artık string
   gelen `seconds` değerini de sayıya çevirir (bazı SDK serileştirmeleri
   int64'ü string yapar; /api/v1 JSON güvenliği).
- **Testler:** `publicListingsService.test.ts` (YENİ, 6 test): önbellek
  (fetch bir kez), ağ hatası/HTTP 502/bozuk yanıt düşüşü, cache clear
  sonrası yeniden istek, paralel çağrı tek fetch. `listingSort.test.ts`
  +1 string-seconds testi. **72/72** ✅; tsc ✅; eslint 0 error ✅;
  build ✅.
- **Bilinçli kararlar:** API'den gelen JSON Timestamp'ları
  `{seconds, nanoseconds}` — istemcide yalnızca sıralamada kullanılır,
  sunucu zaten sıralı gönderir + listingTimestampMillis her iki biçimi
  destekler. Görünümlerdeki `firestoreJobs/firestoreDeals` gibi
  değişken adları "eski ad" olarak kaldı (dokunma minimizasyonu).
  localStorage anahtarları ad alanlı (`van_public_v1_*`) — SavedItems
  Context anahtarlarıyla çakışmaz.

**TAM PROJE TARAMASI + DÜZELTMELER (22.11, aşama 4 sonrası):**

Kapsam: 49 istemci dosyası, 7 sunucu modülü, server.ts (~1150 satır),
firestore.rules, capacitor.config, package.json, tüm servisler/bağlamlar/
görünümler. Temiz çıkanlar: ödeme akışı (sunucu doğrulaması sağlam),
KVKK silme (adım timeout'lu + idempotent), kod disiplini (`console.log`/
`@ts-ignore`/`eslint-disable` hepsi 0), timer temizlikleri, servis
timeout+fallback desenleri, firebaseConfig API anahtarı public-by-design.

Düzeltilen bulgular:
1. **firestore.rules (gelir bypass kapatıldı):** `allow update: if
   ownsExistingDoc()` kuralı ödeme yapmış kullanıcının web SDK ile kendi
   ilanının `bitisTarihi`'ni uzatmasına / `isFeatured: true` yapmasına
   (bedava vitrin) izin veriyordu. İstemcide güncelleme akışı zaten yok →
   üç koleksiyonda da `create/update/delete: if false` (yalnızca
   `read: if true`); KVKK silme sunucuda Admin SDK ile — etkilenmez.
   Kullanılmayan ownsNewDoc/ownsExistingDoc fonksiyonları kaldırıldı.
   **BU DOSYA HENÜZ ÜRETİME DEPLOY EDİLMEDİ** — Firebase Console →
   Firestore → Rules → dosya içeriği yapıştır + Publish gerekiyor.
2. **DealsView toast timer'ları:** JobsView M30 `toastTimers` deseni
   (useRef<Set> + unmount cleanup + scheduleToastClear) buraya da
   uygulandı; 4 setTimeout çağrısı çevrildi.
3. **weatherService dürüst fallback:** API düşerse VAN_WEATHER mock'u
   dönüyor ama `lastUpdated: 'Bugün 13:30'` sabit yazıyordu (bayat veri
   canlı sanılıyordu) → artık "Canlı veriye ulaşılamadı — yerel tahmin
   (offline)" (M38 dürüstlük standardı).
4. **server.ts 9 `any` uyarısı:** API payload'ları gerçek tiplerle
   tanımlandı (WeatherDayForecast/Pharmacy/CurrencyItem/TableItem/
   BusRouteData/NewsItem — type-only import'larla, istemcilerle aynı
   sözleşme). **eslint artık 0 error / 0 warning.**
- **Doğrulama:** tsc ✅, eslint 0/0 ✅, 72/72 test ✅, build ✅.
- **Bilinçli dokunulmayanlar:** eski /api/* endpoint'lerinde IP rate
  limit yok (hepsi RAM cache'li + CGNAT riski — bilinçli), npm audit 21
  bulgu (mevcut bağımlılıklar, overrides kısmen ele almış), M5 istemci
  tarafı + Apple girişi dondurulmuş durumda.
- **Kullanıcı kararı:** ödeme sistemi RevenueCat ile devam ediyor.
- **npm audit kapanışı (23.11):** `npm audit fix` (güvenli mod) 21 → 14
  bulgu (17 paket kırılmadan güncellendi; lint/test/build doğrulandı).
  Kalan 14 bilinçli olarak bırakıldı: `uuid` (moderate) firebase-admin
  transit bağımlılığı — zaafiyet yalnızca v3/v5/v6 buffer'lı çağrılarda,
  firebase-admin yalnızca v4 kullanır (pratik risk ~0); çözümü
  firebase-admin@14 major (Auth/ödeme riski). `sharp`/`glob`/`minimatch`
  `@capacitor/assets` GELİŞTİRME aracının içinde (üretime girmez, risk 0);
  çözümü @capacitor/assets@4 (breaking). İleride firebase-admin 14
  geçişi planlanırsa bunlar kendiliğinden kapanır. `--force` KULLANILMADI.

**Aşama 3 (aynı oturum, commit bekliyor) — invalidasyon + env mimarisi:**

1. `server/publicData.ts`: `invalidatePublicDataCache(collection)`
   export'u (LISTING_ENDPOINTS'ten cacheKey bulur, `publicDataCache.del`)
   + `POST /api/v1/cache/clear` manuel endpoint. **Fail-closed:**
   `CACHE_INVALIDATION_SECRET` tanımsızsa 503 (endpoint kapalı — kimse
   gizli anahtarsız önbelleği boşaltıp Firestore maliyeti yükleyemez);
   tanımlıysa `x-invalidation-secret` başlığı birebir eşleşmeli, yoksa
   401. Üç CACHE_KEYS'i birden siler, `{ok, cleared}` döner.
2. `server/listings.ts`: 201 (ilan yayımlandı) sonrası
   `invalidatePublicDataCache(typeConfig.collection)` — try/catch içinde,
   invalidasyon hatası yayını ENGELLEMEZ (en kötü durum: yeni ilan TTL
   5 dk sonunda görünür). Ödeme akışına dokunulmadı.
3. `server/adminApp.ts` YENİDEN YAZILDI: credential önceliği —
   (a) üç bölünmüş env (`FIREBASE_PROJECT_ID` +
   `FIREBASE_CLIENT_EMAIL` + `FIREBASE_PRIVATE_KEY`, sonuncusu
   `.replace(/\\n/g,'\n')` ile düzeltilir — Render paneline tek satır
   girilir) → (b) `FIREBASE_SERVICE_ACCOUNT` tek-JSON (mevcut Render
   kurulumu BOZULMAZ, geriye uyumlu) → (c) yok → null → 503. Lazy init
   + `getApps()` koruması korundu.
4. `.env.example` TAM LİSTE olarak yeniden yazıldı: istemci (VITE_API_URL,
   VITE_REVENUECAT_API_KEY — bundle'a gömülür) vs sunucu (Firebase Admin
   iki biçim, REVENUECAT_SECRET_API_KEY, CACHE_INVALIDATION_SECRET,
   opsiyonel API_V1_RATE_LIMIT_PER_MINUTE, PORT Render'dan otomatik)
   ayrımı; GEMINI_API_KEY/APP_URL kodda kullanılmıyor (eski AI Studio
   kalıntısı, silinebilir); SCRAPERAPI_KEY Render'da tanımlı eski
   değişken, kodda kullanılmıyor.
- **Doğrulama (yerel):** tsc ✅; eslint 0 error / 9 warning (bilinen
  borç); **65/65 test** ✅; build ✅ (server.cjs 155,5 kB). Duman testi
  (NODE_ENV=production): yanlış/eksik secret → 401; doğru secret →
  200 `{ok:true, cleared:0}` (önbellek boştu — beklenen); secret'sız
  instance → 503 "yapılandırılmamış"; /health çalışıyor.
- **Render'da yapılandırma notu:** mevcut FIREBASE_SERVICE_ACCOUNT JSON
  olduğu sürece hiçbir panel değişikliği gerekmez. İleride bölünmüş
  env'lere geçilirse üçü de girilmeli (kod JSON'a öncelik verir).
  CACHE_INVALIDATION_SECRET Render'da tanımlı DEĞİLSE manuel temizleme
  kapalıdır (otomatik invalidasyon listing yayınında çalışır).
- Bash sınıflandırıcısı bu oturumda da kapalıydı — kurulum/doğrulama/
  commit komutları kullanıcı `!` önekiyle çalıştırdı.

**20.11.2026 oturumu #17 — M38 ÇÖZÜLDÜ (otobüs ilk açılışta 7 hat; commit
`bc80288`, 8 dosya +103/−198):**

Kullanıcı bildirimi: otobüs durakları/saatleri İLK yüklemede 7 hat
görünüyor; kullanıcı ikinci kez yenileyince diğer 80 hat geliyor.
İlk yüklemede de 87 gerçek hat gelsin istendi.

- Kök neden: `busService.fetchLiveBusSchedules` 15 sn timeout'lu fetch
  atıyor; Render free plan uykudayken soğuk başlangıç bunu aşıyor
  (memory'deki bilinen sorun — M35'te hesap silmede de yaşanmıştı).
  Başarısızlıkta istemci `mockData.ts`'teki 7 hatlık KURGUSSAL
  `BUS_ROUTES` mock'una ("Yerel Mock Data") düşüyordu. Kullanıcı
  yenileyince sunucu uyanmış oluyor → 87'lik anlık görüntü geliyordu.
- Çözüm (kurgusal veriyi gerçek veriyle değiştirme — M31/M33 dürüstlük
  çizgisi):
  1. **`server/busFallbackData.ts` → `src/data/busSnapshot.ts`**
     (git mv; yeniden adlandırma `%98` algılandı): 87 hatlık GERÇEK
     van.bel.tr anlık görüntüsü artık istemciden de import edilebilir.
     Export'lar `BUS_SNAPSHOT_ROUTES` / `BUS_SNAPSHOT_LAST_UPDATED`;
     `BusRouteData.status` artık `BusRoute['status']` birliği (istemci
     tipiyle atılabilir).
  2. **`busService.ts`:** offline fallback = `BUS_SNAPSHOT_ROUTES`
     (87 gerçek hat), dürüst etiket: lastUpdated "van.bel.tr anlık
     görüntüsü (15.11.2026 13:33) — sunucuya ulaşılamadı, yenilemeyi
     deneyin", source "van.bel.tr — yerel kopya (offline)",
     isLive: false.
  3. **`mockData.ts`:** 7 hatlık kurgusal `BUS_ROUTES` (b-1..b-7,
     Hat 101-107, uydurma tarifelerle) TAMAMEN silindi + kullanılmayan
     `BusRoute` import'u.
  4. **`BusSection.tsx`:** modal başlığındaki her-zaman-yeşil "Canlı
     Sync" rozeti artık gerçek duruma göre (canlıysa yeşil "Canlı Sync",
     yerel kopyaysa amber "Yerel Kopya"); yerel kopyaya düşülürse 30 sn
     sonra bir KEZ arka planda canlı veri yeniden denenir
     (`hasAutoRetriedRef` — döngüye girmez; timer'lar unmount'ta
     temizlenir; `useCallback` ile exhaustive-deps temiz).
  5. **Bağlı güncellemeler:** `server.ts` (import + fallback yanıt
     bloğu), `server/busScraper.ts` (tip import yolu),
     `scripts/update-bus-fallback.ts` (hedef dosya + üretilen şablon
     yeni konum/adlara), test `src/data/busSnapshot.test.ts`'e taşındı.
- **Not — snapshot büyüdükçe istemci paketi büyür** (şu an vendor
  chunk 797 kB; snapshot ~60 kB). `npm run scrape:bus` yenilemesinde
  fark edilecek artış normaldir.
- **Doğrulama:** tsc strict ✅ exit 0; **65/65 test** ✅; eslint 0
  error / 9 warning (bilinen server.ts `any` borcu — BusSection'a
  eklenen exhaustive-deps uyarısı useCallback ile çözüldü); build ✅
  (vite 4.59 s + server.cjs 150 kB). Push `f911b16..bc80288`;
  **CI ✅ yeşil** (check-runs: build / completed / success) + **Render
  `bc80288` `live`** (20.11 16:14 UTC) + canlı uç nokta doğrulandı:
  **87 hat**, "van.bel.tr anlık görüntü (15.11.2026 13:33) — yerel
  kopya", isLive: false (beklendiği gibi — Render van.bel.tr'ye
  erişemiyor, anlık görüntüden servis ediyor).
- **Telefonda test için YENİ APK derlenmeli** (mevcut disk APK'sı
  17.11 18:27 üretimi — M38 istemci değişiklikleri YOK içinde).
  Test: uygulama ilk açılışta (Render uykudayken bile) otobüs listesi
  87 hat göstermeli; rozet "Yerel Kopya" olmalı; ~30 sn sonra ya da
  yenilemede canlıya dönmeli.
- Bash sınıflandırıcısı oturum boyunca KAPALIydı — tsc/test/lint/
  build/commit/push komutları kullanıcı `!` önekiyle çalıştırdı
  (dosya düzenlemeleri Read/Edit araçlarıyla yapıldı).

**20.11.2026 oturumu #17 — APPLE GİRİŞİ DONDURULDU (M37 devamı;
kullanıcı kararı, kod değişikliği yok):**

Telefonda test edildi (yeni APK, 17.11 üretimi): Google girişi ✅;
Apple girişi beklenen 2. katman hatasıyla düştü — "this operation is
not allowed... [the identity provider configuration is not found]".
Neden: Firebase Console → Authentication → Sign-in method'da Apple
sağlayıcısı etkin değil (kullanıcı uygulamasında Apple bağlantısını
aktif yapmamış). Etkinleştirmek Apple Developer Program üyeliği
($99/yıl) + Services ID + Team ID + Key ID + .p8 anahtarı ister;
kullanıcının Apple Developer hesabı yok → **sorun DONDURULDU**.
Döndürülmesi istenirse seçenekler: (a) Apple Developer hesabı al +
Firebase Console'da Apple sağlayıcısını yapılandır (redirect:
`https://vanrehberim-f181b.firebaseapp.com/__/auth/handler`), ya da
(b) Android'de Apple girişi düğmesini gizle (Google yeterli).

**17.11.2026 oturumu #16 — M37 ÇÖZÜLDÜ (Apple girişi Android'de
"provider is not enabled" hatası):**

Kullanıcı bildirimi: yeni APK'da (M36 dahil) Google girişi çalışıyor,
Apple girişi "Apple ile giriş yapılamadı: apple sign-in provider is not
enabled. Make sure to add the provider to the 'providers' list in the
capacitor configuration" hatası veriyordu. (Aynı oturumda M36 onboarding
telefonda test edildi — sorun yok ✅.)

- Kök neden: `capacitor.config.ts` → FirebaseAuthentication eklenti
  yapılandırmasındaki `providers` listesinde yalnızca `["google.com"]`
  vardı. Android'de @capacitor-firebase/authentication, tarayıcı OAuth
  akışına düşen sağlayıcıları (apple.com, microsoft.com vb.) bu listede
  açıkça ister; listede olmayan çağrılınca eklenti bu hatayı fırlatır.
  Google listede olduğu için native akış çalışıyordu.
- Düzeltme: `providers: ["google.com", "apple.com"]`. Tek satırlık
  değişiklik; istemci koduna (AuthContext) dokunulmadı — mevcut
  `signInWithApple` + `OAuthProvider.credential({idToken, rawNonce})`
  akışı eklenti dokümantasyonundaki desene zaten uygun.
- Doğrulama: `npx cap sync android` → yeni capacitor.config.json
  android assets'e yazıldı; `gradlew assembleDebug` (ilk deneme geçici
  hatayla BUILD FAILED — tekrarında tamamlandı); **APK içinden
  `unzip -p ... assets/capacitor.config.json` ile apple.com olduğu
  doğrulandı** (APK 18:27, config 18:25 — sıra doğru).
- **Telefonda test bekliyor:** yeni APK kurulunca Apple düğmesi eklenti
  hatasını geçmeli. **Bir sonraki katman uyarısı:** Apple girişi
  Android'de Apple'ın web sayfası üzerinden akar — çalışması için
  Firebase Console → Authentication → Sign-in method → Apple
  sağlayıcısında Android/web yapılandırması gerekli: Apple Developer
  Program üyeliği ($99/yıl) + Services ID (Sign in with Apple açık) +
  Team ID + Key ID + .p8 içerik anahtarı; ayrıca Apple Developer'da
  Service ID'ye redirect URL olarak
  `https://vanrehberim-f181b.firebaseapp.com/__/auth/handler`
  kaydedilmeli. Bunlar yoksa kullanıcı yeni bir hatayla döner (Apple
  sayfasında invalid_request ya da Firebase OAuth hatası) — bu durumda
  sağlayıcıyı yapılandırana kadar Apple düğmesini gizlemek seçenek.



**Proje çalışır durumda:** APK üretilmiş (diskte, artık git dışı), backend Render'da canlı.
TypeScript derlemesi: ✅ `tsc --noEmit` exit 0 (M0 ve M2 sonrası doğrulandı, 05.11.2026).

**07.11.2026 oturum #6 (akşam) — M5 DONDURULDU → 15.11.2026 KARAR VERİLDİ:**
Kullanıcı RevenueCat yerine iyzico'yu düşünüyordu; M5 dondurulmuştu. **15.11.2026
oturum #13 kapanışında karar verildi: REVENUECAT.** M5 16.11'de tamamlanacak
(Render'a `REVENUECAT_SECRET_API_KEY` ekleme + Play Console yayını — bkz. oturum
#13 kaydındaki 16.11 planı).

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

**09–10.11.2026 oturumu #10 — M10 ÇÖZÜLDÜ (kök dizin temizliği):**
Kullanıcı görev **C**'yi seçti; plan onaylandı (AskUserQuestion). Önce tam
yedek alındı: `Desktop/van-rehberim-YEDEK-2026-11-09.tar.gz` (66 MB, .git dahil,
node_modules/dist/eski tar.gz'ler hariç). Ayrıntı Bölüm 3'teki M10 kaydında.
Kısa özet: 29 çöp dosya `git rm`, 10 ikon scripti `git mv scripts/`,
APK + 3 eski yedek `Desktop/van-rehberim-arsiv/`'e taşındı, tsconfig include
düzeltildi. Commit `f541f84` (41 dosya, -9.535 satır). tsc + build + boot
doğrulandı; CI ✅ yeşil. Render deploy kontrolü bekliyor.

**📋 Durum (12.11 gece, oturum #11): KALAN 17 SORUN TEK TEK ÇÖZÜLÜYOR.**
M12-M18 ✅ bitti (7/17). M19 (alert() → bildirimler) ✅ bitti (8/17). M20
(server.ts şişkinliği) ✅ bitti (9/17). M21 (any tip borcu) ✅ bitti (10/17).
M22 (timeout'lar + long-polling) ✅ bitti (11/17). M23 (CI cleanup-commit) ✅
bitti (12/17). M24 (Vitest test altyapısı) ✅ bitti (13/17). M25 (HomeView
monolit bölünmesi) ✅ bitti (14/17). M26 (Firestore şema normalizasyonu)
✅ bitti (15/17). M27 (tsconfig strict + @types/react) ✅ bitti (16/17).
**M28 (state management) ✅ bitti (17/17) — LİSTE TAMAMLANDI.** Kalan:
M5 (iyzico vs RevenueCat kararı — dondurulmuş).

**📋 YENİ DÖNGÜ (13.11, oturum #11): TAM PROJE İNCELEMESİ + M29-M32.**
Kullanıcı "tüm projeyi en ince ayrıntısına kadar incele" istedi → kapsamlı
rapor teslim edildi (3 kritik + 13 orta + hafif; ayrıca JobsView+DealsView
derin inceleme ajanı ~28 bulgu more). Kullanıcı **"tamam sırayla çöz bunları"**
dedi. **M29 ✅ ÇÖZÜLDÜ — commit `e8e4abd`** (12 dosya, +469/−104; **CI ✅
yeşil + Render `live`**, 13.11 akşamı API'den doğrulandı). **M30 ✅ ÇÖZÜLDÜ
— commit `6d6cf65`** (7 dosya, +223/−40; **CI ✅ + Render `live`**).
**M31 ✅ ÇÖZÜLDÜ — commit `6885559`** (5 dosya, +185/−86; **CI ✅ + Render
`live`**, 14.11 API'den doğrulandı). **M32 ✅ ÇÖZÜLDÜ — commit `c4bd63e`**
(23 dosya, +292/−2012; **CI ✅ + Render `live`**, 14.11 API'den doğrulandı).
Ayrıntı aşağıdaki
M29/M30/M31/M32 kayıtlarında. **İnceleme döngüsü bitti — sıradaki bekleyen
parti yok.**

**12.11.2026 oturumu #11 — M25 ÇÖZÜLDÜ (HomeView monolit bölünmesi; 4.3):**
HomeView.tsx 2167 → 960 satır. Hava durumu / nöbetçi eczane / ezan vakitleri
/ döviz kuru / otobüs saatleri kart+modal blokları kendi state/effect'leriyle
`src/components/home/`'a taşındı (WeatherSection, PharmacySection,
PrayerSection, CurrencySection, BusSection — uniform prop'lar: isDark,
searchQuery, isModalOpen, onOpen, onClose). HomeView'da activeModal birlik
state'i, arama, iş ilanı/hastane/taksi kartları, hastane modalı ve taksi
akışı kaldı. Davranış değişikliği yok. Bonus: pharmacyService'te ölü
PHARMACIES import'u silindi (eslint uyarısı 48 → 38). İş arka plan ajanıyla
başladı, kullanıcı ajanı durdurdu; kontrol + doğrulama + commit ana oturumda
yapıldı. Commit `46eaf9b`. JobsView (1033) / SettingsView (995) bölünmesi
ayrı görev olarak kaldı (istenirse 17'den sonra).

**13.11.2026 oturumu #11 — M29 ÇÖZÜLDÜ (kritik ödeme/ilan akışı +
favori hayalet id'ler; inceleme raporu kritik #1 + #2):**

Kapsam: inceleme raporunun kritik bulguları + ajan bulguları. Commit
`e8e4abd` (12 dosya, +469/−104). Oturum bilgisayara restart nedeniyle
bölündü — ilk yarı (imageCompress, server whitelist, DealsView) restart
önce diskte yazılmıştı; ikinci yarı (JobsView retry akışı + favori
hayalet id'ler + testler) restart sonrası tamamlandı.

- `src/utils/imageCompress.ts` (YENİ): compressImageFile — canvas ile
  aşamalı JPEG sıkıştırma (1024/0.72 → 900/0.55 → 720/0.4),
  MAX_IMAGE_DATAURL_CHARS=150_000, createImageBitmap + `<img>` fallback.
  Base64 fotoğraflar sunucuda 5000 karakterde kesilip bozuluyordu (kritik #1).
- `server/listings.ts`: IMAGE_FIELDS{image,photo} / IMAGE_LIST_FIELDS{images}
  / MAX_IMAGE_FIELD_LENGTH=150_000 / MAX_IMAGE_COUNT=5 (5×150K=750K <
  Firestore 1MB); deal whitelist += `indirimMetni`, `images`, `phone`;
  pickFields görsel alanlarında büyük limit + `images` string[] doğrulaması.
- `src/lib/firebase.ts`: RawDealDoc += indirimMetni?/images?/phone?.
- `src/utils/dealMapping.ts`: image = doc.image || images[0] || default;
  images/indirimMetni/phone eşlenir. `src/types.ts`: Deal.indirimMetni?
  eklendi, phone yorumu güncellendi.
- `DealsView.tsx`: fotoğraf yükleme artık sıkıştırılmış; paket fallback'i
  (`usable = packages`) KALDIRILDI (taksi paketi deal formunda satılabilir →
  para alınırdı, sunucu 400 verirdi); `purchaseCompleted` state — ödeme sonrası
  yazım hatasında "TEKRAR DENE (ÜCRET ALINMAZ)" akışı (yeniden
  purchasePackage ÇAĞIRMAZ; sunucunun 15 dk tazelik penceresi retry'a izin
  verir — çift ücret engellendi); payload += images[]/phone/indirimMetni
  (contactNumber ve discountText eskiden ÇÖPE GİDİYORDU); "Özel Kampanya"
  tipinde % öneki zorlanmaz; discountAmount 1-99 doğrulaması; başarıda TÜM
  form sıfırlanır; geri butonu formError+purchaseCompleted temizler; ödeme
  modalı ✕'i isProcessing'te disabled; liste kartında ÖNE ÇIKAN rozeti (ücretli
  özellik görünmezdi); detayda phone "Ara" + indirimMetni çipi + images
  galerisi + img onError; indirim kodu etiketi tema duyarlı; pricePaid →
  Number(price) (JobsView ile tutarlı).
- `JobsView.tsx`: paket fallback'i kaldırıldı; purchaseCompleted state;
  handlePostSubmit'te sıfırlama; handleFinalPurchase purchaseCompleted ise
  satın alma adımını atlıyor; catch bloğunda kalıcı "Ödemeniz alındı ancak
  ilan yayımlanamadı: ... Tekrar Dene — yeniden ücret alınmaz" mesajı
  (setTimeout'suz); başarı yolunda setPurchaseCompleted(false); ödeme modalı
  ✕ disabled={isProcessing}; buton etiketi "TEKRAR DENE (ÜCRET ALINMAZ)";
  her iki modalın ✕'i kalıcı hata toast'unu temizler.
- **Favori hayalet id'ler (kritik #2):** `savedItemsStorage.ts`:
  DEFAULT_SAVED_DEAL_IDS=[] (d-1/d-4 hayalet — DEALS mock boş),
  DEFAULT_SAVED_PLACE_IDS=['p-1','p-3'] (GERÇEK id'ler: p-1=Akdamar Adası,
  p-3=Edremit Sahili) + filterGhostDealIds/filterGhostPlaceIds
  (GHOST: d-1..d-4, place-1, place-3). `SavedItemsContext.tsx`: mount'ta VE
  storage event'te hayalet süzme (persistence effect temiz hali depoya yazar
  — tek seferlik geçiş); setSavedDeals API'si KALDIRILDI. `SettingsView.tsx`:
  Favorilerim > İşletmeler sekmesi artık `subscribeDeals` + `mapDealDoc` ile
  CANLI Firestore ilanlarını gösteriyor (DealsView ile aynı kaynak; önceden
  boş DEALS mock'u + legacy user_deals_van okunuyordu → favoriye eklenen ilan
  ASLA görünmüyordu); yükleniyor spinner'ı eklendi; addSampleBusinesses +
  "Örnek Van İşletmelerini Ekle" düğmesi SİLİNDİ (hayalet id'leri gerçek
  favorilerin ÜZERİNE yazıyordu — veri kaybı); kullanılmayan DEALS/Sparkles
  import'ları temizlendi.
- **Bonus:** DealsView'daki kalıcı hata toast'u (M29 retry mesajı) hiçbir
  yerde temizlenmiyordu → ödeme modalı ✕ ve form geri düğmesi artık
  setErrorToast(null) yapıyor.
- **Testler:** dealMapping.test.ts M29 sözleşmesine güncellendi (+2:
  images/indirimMetni/phone eşlemesi, kapak fallback'i) ve
  savedItemsStorage.test.ts'ye hayalet temizliği regresyonu (+6). 54/54 ✅.
- **Doğrulama:** tsc strict exit 0; eslint 0 error / 36 warning (37→36);
  build ✅ (vite 11.71 s + server bundle). Push `6a2790c..e8e4abd`;
  **CI ✅ yeşil** (check-runs: build / completed / success) + **Render
  `e8e4abd` live** (API'den doğrulandı). MEMORY kaydı: `d7fc81d`.
- **Bash sınıflandırıcısı** oturum boyunca aralıklı arızalıydı (bir ara
  tamamen kapalı — model kullanılamıyor hatası); test/lint/build/commit/push
  komutlarını kullanıcı `!` önekiyle çalıştırdı.

**15.11.2026 oturumu #13 — M34+M35 ÇÖZÜLDÜ (KVKK hesap silme telefonda
sonsuz "İşleniyor" takılması; commits `9b21de1` (M34) + `c6200c8` (M35),
CI ✅ + Render `live`; TELEFONDA DOĞRULANDI ✅):**

Kullanıcı bildirimi: telefonda hesap silme hiç bitmiyordu — "İşleniyor"
spinner'ı sonsuza kadar kalıyordu. İki aşamalı çözüm:

**M34 (`9b21de1`) — teşhis altyapısı + ilk deneme:** Silme akışına adım adım
konsol log'u (`[hesap-silme]`) + her adıma 20 sn zaman aşımı eklendi; Auth
silmesi native'de web SDK yerine `FirebaseAuthentication.deleteUser()`'a
verildi. Sonuç: takılma noktası kesinleşti — **"Firestore verilerinin
silinmesi" adımı** asla sonuçlanmıyordu. Kök neden: **CapacitorHttp altında
Firestore web SDK'nın YAZMA işlemleri (deleteDoc) sonuçlanmıyor** (okuma/
onSnapshot çalışıyor — M22 long-polling bilgisi yalnızca okuma için geçerliydi;
istemcideki TEK yazma yolu olan `saveUserToFirestore` hataları yuttuğu için
bu hiç fark edilmemiş). Ayrıca plugin'in Android `deleteUser`'ı görev
başarısız olsa bile resolve döndürüyor (hata yutan kusur).

**M35 (`c6200c8`) — kökten çözüm, silme sunucuya taşındı:**
1. **`server/account.ts` (yeni):** `POST /api/account/delete` — Bearer ID
   token `verifyIdToken(token, true)` ile doğrulanır → Firestore'da
   `users/{uid}` + `userFavorites/{uid}` + 3 ilan koleksiyonunda
   `userId == uid` dokümanları silinir → **en son** Auth kaydı (Admin SDK'da
   `requires-recent-login` yok; silme tüm oturum tokenlarını iptal eder).
   Idempotent; uid başına saatte 5 deneme rate limit'i. M13 KVKK kapsamı aynen.
2. **`server/adminApp.ts` (yeni):** Admin SDK lazy init ortak modüle taşındı
   (listings.ts aynı davranışla kullanır).
3. **İstemci:** `src/services/accountService.ts` (yeni, listingService deseni:
   30 sn timeout); SettingsView akışı: ID token al → sunucuda sil → yerel
   oturum (`FirebaseAuthentication.signOut`) + localStorage favori
   temizliği (`saved_deals_van`, `saved_places_van`) → logout → reload.
   Adımlı log + 20 sn zaman aşımı korundu. `deleteAllUserData` istemciden
   kaldırıldı; KVKK kapsam testleri `server/account.test.ts`'e taşındı
   (60→61 test).
4. **Render'a `FIREBASE_SERVICE_ACCOUNT` env'i EKLENDİ** (kullanıcı izniyle,
   `Desktop/yeni klasör/render-add-sa-env.sh` — render-setup.sh'in dondurulmuş
   RevenueCat kısmına dokunmaz; Render API'de env değişikliği **PUT** ile
   yapılıyor, POST/PATCH 405 döner ve PUT tüm seti eşitlediğinden mevcut
   `SCRAPERAPI_KEY` gövdeye dahil edildi). `REVENUECAT_SECRET_API_KEY` hâlâ
   eklenmedi — yarınki RevenueCat işinde eklenecek. Lokal `.env`'e de
   service account eklendi (`add-firebase-env.mjs`).

**Doğrulama:** tsc ✅; eslint 0 error / 9 warning (bilinen borç); **61/61
test**; build ✅; lokal smoke (token yok/sahte → 401); canlıda **401** +
Türkçe mesaj (service account yüklü). **Telefonda kullanıcı testi:** ilk
deneme (uykudaki Render'a) 20 sn zaman aşımına düştü, çık-gir + kısa bekleme
sonrası ikinci deneme **başarıyla silindi** (yeşil mesaj görüldü). Bilinen
ufak sorun: Render free-tier soğuk başlangıç >20 sn sürebiliyor — istenirse
sunucu çağrısı adımının zaman aşımı artırılabilir (ör. 60 sn) ya da silme
öncesi sessiz bir health-check ile servis uyandırılabilir. Bash sınıflandırıcısı
yine oturum boyunca aralıklı arızalıydı — komutlar kullanıcı `!` önekiyle
çalıştırdı.

**17.11.2026 oturumu #15 — M36 ÇÖZÜLDÜ (onboarding ekranı; ilk açılış
tanıtımı):**

Kullanıcı kararı: M5 istemci tarafı (goog_... anahtarı + Play Console)
**yeniden donduruldu**; onboarding öne alındı. Yapılanlar:
1. `src/utils/onboardingStorage.ts` (YENİ, M28 deseni): `van_onboarding_done`
   localStorage işareti — `hasCompletedOnboarding()` (okuma hatasında true
   döner: depo kalıcı bozuksa kullanıcıyı her açılışta tanıtıma zorlamak
   daha kötü) + `completeOnboarding()` (yazma hatası sessiz — yalnızca
   kalıcılık kaybolur). + `onboardingStorage.test.ts` (4 test; sahte
   localStorage deseni — savedItemsStorage.test.ts).
2. `src/components/OnboardingView.tsx` (YENİ): tam ekran tanıtım (z-50,
   LoginModal'dan sonra render → üstünde görünür; splash 600 ms bitince
   açılır). 5 slayt: karşılama (logo, splash marka kimliği) → Günlük Yaşam
   (hava/eczane/namaz/döviz) → Şehir Rehberi (yerler/otobüs/haber/taksi) →
   İlanlar ve Favoriler (iş/indirim/favori/bildirim) → final "Başla" CTA.
   Gezinme: İleri/Başla + geri chevron + üst sağda "Atla" + ilerleme
   noktaları. **Android geri tuşu** M32 deseniyle (`useBackButtonClose`):
   önce önceki slayta gider, ilk slaytta tanıtımı kapatır (onCloseRef her
   render güncellendiğinden güncel step'i görür). Tema duyarlı (light/dark).
   Slayt geçişi `key={step}` + animate-fadeIn.
3. `src/App.tsx`: `showOnboarding` lazy state (`() =>
   !hasCompletedOnboarding()`) + `<OnboardingView>` render'ı. Tamamlayınca
   yalnızca state kapanır — işaret depoya bileşen içinde yazılır.
4. **Doğrulama:** tsc strict ✅ exit 0; **65/65 test** ✅ (61→65, +4);
   eslint 0 error / 9 warning (bilinen server.ts `any` borcu, değişiklik
   yok); build ✅ (CSS 111,79 kB — yeni sınıflar; `w-5.5`/`h-5.5` Tailwind 4
   dinamik ölçeğiyle derlendi, derlenmiş CSS'te doğrulandı). Bash
   sınıflandırıcısı bir kez daha arızalandı (grep testinde) — Grep aracı
   kullanıldı; tsc/test/lint/build sorunsuz çalıştı. Commit `877b7ab` +
   versionCode commit'i `fab6a62` — push ✅; **her ikisi de CI ✅ yeşil**
   (check-runs: build / completed / success, GitHub API'den doğrulandı).
   Render auto-deploy tetiklendi (sunucu kodu değişmedi — istemci +
   android değişiklikleri; deploy kontrolü yapılmadı, kritik değil).
5. **Telefonda test bekliyor:** yeni APK derlenince ilk açılışta tanıtım
   çıkmalı; tamamlanınca/kapatınca bir daha çıkmamalı. (İstenirse test
   sonrası localStorage'dan `van_onboarding_done` silinerek yeniden
   tetiklenebilir.)

**16.11.2026 oturumu #14 — M5 SUNUCU TARAFI ÇÖZÜLDÜ (RevenueCat canlıda):**

Kullanıcı "ikisi sırayla" dedi → önce M5, sonra onboarding. Yapılanlar:
1. **Tam yedek alındı:** `Desktop/van-rehberim-arsiv/van-rehberim-YEDEK-2026-11-16.tar.gz`
   (node_modules/dist/android build hariç, .git dahil).
2. **Render'a `REVENUECAT_SECRET_API_KEY` eklendi:** yeni betik
   `Desktop/yeni klasör/render-add-rc-env.sh` (render-add-sa-env.sh deseninin
   birebir kopyası; PUT ile tüm seti eşitler, mevcut `FIREBASE_SERVICE_ACCOUNT`
   + `SCRAPERAPI_KEY` gövdeye dahil edilip sonradan korundukları doğrulandı).
   Key kaynağı: `Desktop/yeni klasör/revenuecat` (sk_..., 30-32 karakter —
   RevenueCat secret key'leri beklenenden kısa olabilir; betiğin uzunluk
   doğrulaması 40→20'ye düşürüldü). Deploy tetiklendi → **`live`** (17:01).
3. **Canlı doğrulama:** `POST /api/listings` boş gövde → **400** ("Geçersiz
   istek") — 503 DEĞİL, yani fail-closed konfigürasyon kontrolü geçildi: her
   iki env de yüklü. (Empty body 400'ü type/productId doğrulaması veriyor;
   token kontrolü 401 daha sonra.)
4. **Lokal `.env`'e `REVENUECAT_SECRET_API_KEY` eklendi** (gitignore'lı;
   VITE_API_URL + FIREBASE_SERVICE_ACCOUNT'ın yanına).
5. **Play Console kod tarafı:** `android/app/build.gradle` versionCode 1→2,
   versionName "1.0"→"1.1". İmza: `android/app/upload.keystore` diskte yerinde;
   `android/keystore.properties` HENÜZ YOK (storePassword/keyPassword
   kullanıcıda — gitignore'lı dosyaya elle yazılacak).
6. **M5 kalan işler (bekleyen):**
   - İstemci `VITE_REVENUECAT_API_KEY` hâlâ placeholder
     (`goog_YOUR_REVENUECAT_GOOGLE_API_KEY`) — RevenueCat Dashboard → Apps →
     Android'deki `goog_...` HERKESİ AÇIK anahtar kullanıcıdan alınıp .env'e
     yazılacak (secret DEĞİL). Placeholder boş olmadığından purchaseService
     configure'u sahte key'le çağırıp çalışma anında patlıyor — uzun vadede
     placeholder'a özel koruma eklenebilir.
   - Play Console: keystore.properties → release build → yükleme → in-app
     ürünler Aktif (`ilan_30_gun`, `one_cikan_30_gun`, `taksi_ilan_aylik`) —
     bu, ilan paketlerindeki boş ödeme tutarlarını da çözer (M33 §4).
   - `firestore.rules` üretim deploy'u (`create: if false`) YENİ APK canlıya
     çıkarken yapılacak (eski APK istemciden yazıyor — erken deploy kırar).
7. **Not:** versionCode/keystore değişiklikleri oturum #15'te (17.11) M36
   commit'iyle birlikte commit edildi.

**16.11.2026 planı (kullanıcı istekleri):**
1. **Ödeme: RevenueCat** (kullanıcı kararı — M5 dondurması KALKTI). Yapılacaklar:
   RevenueCat Secret API key'i Render'a ekle (`REVENUECAT_SECRET_API_KEY`,
   render-add-sa-env.sh benzeri betikle), Play Console yayını (versionCode 2,
   versionName 1.1, keystore.properties, in-app ürünler Aktif) — bu aynı
   zamanda ilan paketlerindeki boş ödeme tutarlarını da çözer.
2. **Onboarding ekranı:** uygulama ilk açıldığında (ilk kez indiren kullanıcı)
   tanıtım/rehber ekranı gösterilecek.

**15.11.2026 oturumu #12 — M33 ÇÖZÜLDÜ (van.bel.tr yeni site yapısı: otobüs
gerçek veri; commits `8591910` + `3631119`, CI ✅ + Render `live`):**

Kullanıcı bildirimi: telefonda yalnız **7 otobüs hatı** görünüyordu (eskiden
30). Kök neden: van.bel.tr otobüs sayfasını yenilemiş — liste artık tablo
değil **hat linkleri** (`OtobusSaatDetay/{id}`); eski `<tr>` ayrıştırıcı 0
satır buluyor, görünen 7 hat tasarım değişikliğinden hemen önce
ayrıştırılmış bayat önbellektendi. İki ek gizli sorun daha bulundu: detay
sayfalarının 56'sı **HTML-escape edilmiş** teslim ediliyor (`&lt;li&gt;`)
ve saat satırları **"HH:MM KALKIŞ-NOTU"** biçiminde (`13:45 MERKEZ
(ARIZALI)` gibi — kalkış noktası/arıza notu değerli gerçek veri).

1. **`server/busScraper.ts` (yeni):** kazıyıcı server.ts'ten modüle
   ayrıldı. Liste sayfasından 87 hat linki (hat no + güzergâh), her hattın
   detayından gidiş/dönüş saatleri + `route-note` durak zinciri.
   `unescapeHtmlEntities` ile escape'li sayfalar çözülür; etiketli saat
   satırları kabul edilir; operatingHours/frequency saf saat önekinden
   hesaplanır. Yerel test: **87/87 hat saatli**.
2. **stale-while-revalidate:** `/api/bus-schedules` taze önbelleği (1 sa)
   yoksa yenilemeyi arka plana bırakır, istemciyi bekletmez (87 detay
   sayfası ~15-30 sn, 6'şarlı gruplar); istek anında bayat önbellek ya
   da anlık görüntüye döner.
3. **Render'dan van.bel.tr'ye erişim başarısız** (veri merkezi IP engeli
   veya yavaşlık — yerelde kusursuz, Render'da canlı yenileme
   başarısız). Çözüm: **anlık görüntü fallback'i** — `npm run
   scrape:bus` (`scripts/update-bus-fallback.ts`) van.bel.tr'ye
   erişebilen makinede `server/busFallbackData.ts`'i GERÇEK veriyle
   yazar. 30 **kurgusal** Hat 101-130 silindi; yerine 15.11 13:33
   anlık görüntüsü (87 hat, hepsi saatli) işlendi. Render artık her
   koşulda gerçek veri sunar; canlı yenileme bir gün çalışırsa daha taze
   veriyle değiştirir. **van.bel.tr tarifeleri değişince anlık görüntüyü
   `npm run scrape:bus` + commit/push ile yenilemek gerekir.**
4. **Ödeme tutarı görünmüyor (kullanıcı bildirimi — kod değil, yapı):**
   fiyatlar M24'ten beri yalnızca Google Play/RevenueCat'ten canlı gelir
   (uydurulmaz). Uygulama Play Console'a yüklenip in-app ürünler Aktif
   olana (en az Internal testing) kadar Play fiyat döndürmez → ilan
   paket kartlarında tutar boş. Play Store yayınıyla çözülür (kullanıcı
   eylemi, kodda iş yok).
5. Testler yeni sözleşmeye güncellendi (59→60: benzersizlik, saat öneki,
   damga, dürüst boş alanlar); tsconfig/eslint kapsamı
   `scripts/firestore-schema-audit.ts` → `scripts/*.ts`.

**Doğrulama:** tsc ✅ exit 0; eslint 0 error / 9 warning (server.ts `any`
borcu, değişiklik yok); **60/60 test** ✅; build ✅ (server.cjs 80→147 KB —
veri seti büyüdü). Push `d0284fc → 8591910 → 3631119`. **CI ✅ + Render
`live`** (15.11 10:42 UTC); canlı uç nokta doğrulandı: **87 hat, 0 saatsiz,
"van.bel.tr anlık görüntü (15.11.2026 13:33)" damgası**. APK gerekmez
(yalnız sunucu tarafı). Bash sınıflandırıcısı yine oturum boyunca aralıklı
arızalıydı — komutlar kullanıcı `!` önekiyle çalıştırdı.

**14.11.2026 oturumu #11 — M32 ÇÖZÜLDÜ (geri tuşu + ölü kod/uyarı temizliği +
deps; commit `c4bd63e`, 23 dosya +292/−2012):**

1. **Android geri tuşu artık modalları kapatıyor:** yeni
   `src/utils/backButtonStack.ts` — modül seviyesinde LIFO kapatıcı yığını +
   `useBackButtonClose(isOpen, onClose)` hook'u (onClose ref'te, effect
   yalnızca isOpen'a bağımlı; modal başka yolla kapanırsa cleanup yığından
   düşürür). App.tsx backButton dinleyicisi önce `closeTopModal()` dener,
   yığın boşsa eski davranış (sekme→home, home'da çıkış). Bağlanan 14 nokta:
   LoginModal, 5 home bölümü (Weather/Pharmacy/Prayer/Currency/Bus —
   isModalOpen prop'uyla), HomeView (activeModal + taksi ekleme + taksi
   ödeme), JobsView (detay + ilan formu + ödeme), DealsView (detay + ödeme),
   NewsView, PlacesView, SettingsView (politikalar + favoriler + işletme
   detayı — iç içe modaller LIFO sırayla kapanır).
2. **mailto/market:// dürüstleştirme:** "Uygulamayı Değerlendir"
   `market://` (WebView'de güvenilmez) → `https://play.google.com/store/apps/
   details?id=com.vanrehberim.app` (tarayıcıda + Android'de Play Store
   açar). "Yardım & Destek" alt yazısı "Bize ulaşın" → görünür e-posta
   adresi (mailto sessizce başarısız olursa kullanıcı kopyalayabilir).
3. **36 eslint uyarısı → 0 (src):** ölü importlar 10 dosyada (App,
   HomeView, JobsView, PlacesView, SettingsView, BusSection, AuthContext,
   firebase, currencyService, DealsView'ta gereksiz eslint-disable);
   BusSection'da hiç okunmayan 3 state (busSource/busIsLive/
   selectedBusCategory); SettingsView'da ölü isLoggedOut; loginWithEmail'in
   devre dışı akış için anlamsız parametreleri; AuthContext'te 2 boş catch
   değişkeni.
4. **Ölü kod:** firebase.ts'te çağıransız
   saveUserFavoritesToFirestore/getUserFavoritesFromFirestore silindi
   (userFavorites dokümanı hesap silmede yine temizleniyor); JobsView'taki
   getJobMetaFromPackage (listingMeta.getDealMetaFromPackage'ın kopyası, ölü
   ILAN_30_GUN dalıyla) silindi — 5 çağrı noktası test'li tek kaynağa geçti;
   HomeView'daki boş handleDeleteTaxi + ona bağlı no-op "İlanı Sil" düğmesi
   kaldırıldı (gerçek silme akışı istenirse deleteDoc + owner kuralıyla
   ayrıca eklenmeli). `JobListing.durationDays` tipi `1|3|7|15|30`
   birliğinden `number`'a genişletildi (gerçekte yalnızca 30 var).
5. **deps temizliği:** `motion` + `@google/genai` (hiç import edilmiyor) ve
   `eslint-plugin-react` (config'te yok) kaldırıldı; `jimp` →
   devDependencies (yalnızca scripts/ ikon araçları kullanıyor). npm
   install 108 paket kaldırdı; lockfile senkron (CI `npm ci` kullanıyor —
   package.json değişikliğinden sonra npm install ŞART).
6. **vite.config:** AI Studio kalıntısı DISABLE_HMR sunucu bloğu kaldırıldı;
   manualChunks `id.includes('react')` → yol sınırlı regex (react/react-dom/
   scheduler) — lucide-react artık yanlışlıkla vendor-react chunk'ında
   değil (250 KB → 223 KB).
7. **Kapsam genişletme:** tsconfig include'a `server/` +
   `scripts/firestore-schema-audit.ts`; eslint hem config `files`'ına hem
   `lint:eslint` script'ine aynı yolları aldı. Server kodu ilk kez tip
   denetiminden geçti — tsc strict temiz; eslint 0 error / 9 uyarı
   (server.ts'teki bilinen `any` borcu, uyarı seviyesinde bilinçli).

**Doğrulama:** npm install (lockfile) + tsc strict ✅ exit 0; eslint 0 error /
9 warning (src: **0**); **59/59 test** ✅; build ✅ (vendor-react 223 KB).
Push `6059374..c4bd63e`. **CI ✅ yeşil + Render `live`** (14.11 15:03 UTC'den
itibaren). Bash sınıflandırıcısı oturum boyunca aralıklı arızalı — doğrulama
ve commit kullanıcı `!` önekiyle çalıştırdı.

**14.11.2026 oturum #11 — M31 ÇÖZÜLDÜ (veri dürüstlüğü + bildirim/hesap-silme;
commit `6885559`, 5 dosya +185/−86):**

1. **`catch (error: any)` ×4 → `unknown`:** `server.ts`'e `errorMessage(error:
   unknown)` yardımcısı (Error → message, değilse String) — hava durumu /
   eczane / namaz / döviz catch'lerinde `error.message` yerine. `any` ile
   yakalanan değerin Error olduğu varsayımı güvenli değildi (AbortSignal vb.).
2. **Eczane uydurma fallback telefon:** telefon ayrıştırılamazsa sabit
   `'0432 216 56 76'` (odanın kendi numarası) basılıyordu — yanlış eczaneye
   çağrı yönlendirir. Artık boş gönderiliyor; PharmacySection telefonsuz
   kayıtta ARA düğmesi yerine "Telefon belirtilmemiş" gösteriyor.
3. **Diyanet uydurma vakitler + isLive:** regex eşleşmezse sabit eski vakitler
   ('03:23' vb.) "canlı" etiketiyle önbelleğe alınıyordu. Artık eksik
   ayrıştırma hata fırlatıyor → bayat önbellek / dürüst 500 yolu. Bayat
   önbellek yanıtında `isLive: false` (önceden hep `true`).
4. **Otobüs canlı-parse uydurma veriler:** van.bel.tr tablosundan yalnızca
   saatler okunabiliyor ama payload `['Merkez Garaj', 'İpekyolu', 'Varış
   Durak']` durakları + sabit '15,00 TL' tarife taşıyordu. İkisi de boş
   (istemci BusSection boş alanları zaten gizliyor). BUS_FALLBACK_ROUTES
   (isLive:false yerel veri seti) bilinçli tasarım — dokunulmadı.
5. **Haber RSS pubDate:** `<pubDate>` ayrıştırma eklendi — önceden her haber
   "bugün + şu an" gösteriyordu (gerçek yayın tarihi değil). pubDate yoksa
   eski davranış korunur.
6. **rateLimiter bellek sızıntısı (listings.ts):** pencere dışına çıkan
   uid'ler Map'ten hiç silinmiyordu → uzun ömürlü süreçte büyüme. Dakikada
   bir çalışan `pruneRateLimiter()` — boş girdi silinir, kısmi filtre yazılır.
7. **notificationService namaz bildirimleri:** `schedule: { on: {hour,
   minute} }` GÜNLÜK tekrar planlıyordu → ertesi gün BAYAT vakitte bildirim.
   Tek atımlık `at:` kullanılıyor; App.tsx her açılışta applySettings ile
   yeniden planlıyor (dependable). Başlıklar API anahtarından değil
   (Imsak/Ogle) düzgün Türkçe isimlerden: İmsak/Güneş/Öğle/İkindi/Akşam/Yatsı
   + tam cümle gövdeler.
8. **SettingsView bildirim efektleri → handler:** isInitialLoad bekçili effect
   işe yaramıyordu (senkron state yüklemesinde ilk render'da guardı yutuyor,
   sonra her ziyarette ayarlar geri yazılıp bildirimler yeniden planlanıyordu).
   Yeni `handleNotificationToggle(patch)` — ayarlar yalnızca toggle değişince
   kaydediliyor; `requestPermissions` yalnızca bir bildirim türü AÇILIRKEN
   çağrılıyor (önceden mount'ta koşulsuz — Android'de rahatsız edici).
9. **SettingsView hesap silme dürüstlüğü:** `auth.currentUser` yoksa eskiden
   sessizce "başarılı" davranıyordu (hiçbir şey silinmediği halde) → artık
   dürüst hata. 50 ms'lik setTimeout zinciri kaldırıldı — spinner logout +
   yönlendirme bitene kadar açık. deleteError 8 sn sonra kendini temizliyor.
10. **Toggle alt yazıları state'e bağlı** (haber/namaz/titreşim açık-kapalı
    gösteriyor) + "Baskı" yazım hatası giderildi.

**Doğrulama:** tsc strict ✅ exit 0; eslint 0 error / 36 warning (aynı);
**59/59 test** ✅; build ✅ (vite 3.23 s + server bundle). Push
`38e9556..6885559`. **CI ✅ yeşil + Render `live`** (14.11 09:37 UTC'den
itibaren). Bash sınıflandırıcısı oturum boyunca aralıklı arızalı — doğrulama
ve commit kullanıcı `!` önekiyle çalıştırdı.

**13.11.2026 oturumu #11 — M30 ÇÖZÜLDÜ (orta önem partisi; commit `6d6cf65`,
7 dosya +223/−40):**

1. **Server fetch timeout'ları:** `server.ts`'e `fetchWithTimeout` yardımcısı
   (AbortSignal.timeout, 15 sn) — weather ×4 (MGM sondurum/tahmin +
   Open-Meteo AQI/UV), pharmacies, prayer-times fetch'lerine bağlandı.
   Önceden Node fetch'in varsayılan zaman aşımı YOKTU — asılı bağlantı
   route'u süresiz blokluyordu. Abort mevcut M18 bayat-önbellek fallback'ine
   düşüyor. (currencies 10 sn / bus + news 3,5 sn zaten timeout'luydu.)
2. **Abonelik hata callback'leri:** `subscribeJobListings`/`subscribeDeals`/
   `subscribeTaxis` imzalarına opsiyonel `onError` eklendi (onSnapshot hata
   callback'i önceden yalnızca console.warn ediyordu). Tüketicilerde
   (JobsView/DealsView/SettingsView/HomeView-taksi) hata durumunda
   setIsLoading(false) + dürüst hata kartı — önceden sonsuz iskelet/spinner.
3. **"En Yeni İlanlar Üstte":** `src/utils/listingSort.ts` (YENİ, +5 test) —
   `listingTimestampMillis` (Firestore Timestamp toMillis/seconds) +
   `sortByNewestFirst`. Sıralama üç subscribe fonksiyonun içinde tek
   noktada (docs sıralanıp sonra map edilir) — Firestore orderBy composite
   index istemez; timestamp'u olmayan eski kayıtlar sona düşer.
4. **İlçe filtresi/form uyumsuzluğu (JobsView):** tek `VAN_DISTRICTS`
   sabiti (İpekyolu, Edremit, Tuşba, Erciş, Gevaş, Muradiye, Özalp) hem
   filtre hem form select'inde (önceden Özalp filtrede vardı ama formda
   yoktu → ölü filtre; form "/ Van" sonekli değerler yazıyordu). "Tüm Van
   Geneli" ilanları artık her ilçe filtresinde görünür; eski sonekli
   kayıtlar includes() eşleşmesiyle uyumlu kalır.
5. **DealsView tarih input'ları readOnly:** tarihler satın alınan paketten
   hesaplanıyor (finalStartDate/finalEndDate) — düzenlenebilir görünüm
   yanıltıcıydı. Setter'lar paket seçiminde/reset'te hâlâ çalışıyor.
6. **JobsView toast unmount koruması:** `toastTimers` ref + `scheduleToastClear`
   — 4 setTimeout artık izleniyor, unmount'ta clearTimeout.
7. **py-0.2 → py-0.5** (4 yer: HomeView/JobsView/SettingsView çipleri —
   derlenmiş CSS'te doğrulandı: py-0.2 üretilmiyordu, sessizce padding yoktu).
   **İnceleme düzeltmesi:** py-4.5 ve border-3 Tailwind 4 dinamik ölçekle
   GEÇERLİymiş (derlenmiş CSS'te mevcutlar) — incelemedeki şüphe yanlıştı.
8. **JobsView payload ölü alanları:** sunucunun ezip yazdığı createdAt/
   durationDays/isFeatured/userEmail/userId/productId payload'tan çıkarıldı;
   yerel liste güncellemesi (`newJob`) sunucu değerleriyle açıkça kuruluyor.
   pricePaid whitelist'te — kaldı.

**Doğrulama:** tsc strict ✅ exit 0; eslint 0 error / 36 warning (aynı);
**59/59 test** ✅ (9 dosya — listingSort +5); build ✅ (vite 3.23 s + server
bundle). Push `d7fc81d..6d6cf65`. CI + Render kontrolü bekliyor.
Bash sınıflandırıcısı oturum boyunca aralıklı arızalı — doğrulama ve commit
kullanıcı `!` önekiyle çalıştırdı.

**Sonraki partiler (kullanıcı zaten "sırayla çöz" onayı verdi):**
- ~~**M33:** van.bel.tr yeni site yapısı — telefonda 7 otobüs hatı sorunu~~
  **✅ 15.11.2026 çözüldü** (commits `8591910` + `3631119`; ayrıntı
  yukarıdaki M33 kaydında).
- ~~**M32:** Android geri tuşu, mailto/market, 36 eslint uyarısı, ölü kod,
  deps temizliği, vite.config, kapsam genişletme~~ **✅ 14.11.2026 çözüldü**
  (commit `c4bd63e`; ayrıntı yukarıdaki M32 kaydında). **M29-M32 döngüsü
  bitti — bekleyen parti kalmadı.**
- **Kullanıcı eylemi bekleyen:** firestore.rules ÜRETİME DEPLOY
  (`firebase deploy --only firestore:rules` — kritik #3, login gerekli);
  android/keystore.properties (release imza — şifreler kullanıcıda);
  versionCode 1/versionName 1.0 artırımı (Play Store öncesi — in-app
  ürünlerin Aktif edilmesi ödeme tutarlarının görünmesini de sağlar, bkz.
  M33 kaydı §4); M5 kararı (iyzico vs RevenueCat) hâlâ dondurulmuş —
  kullanıcıdan haber bekle. Periyodik bakım: van.bel.tr tarifeleri
  değişince `npm run scrape:bus` + commit/push.

APK: diskteki debug APK `android/app/build/outputs/apk/debug/app-debug.apk`
(19 MB, **23.11 19:29 üretimi — EN GÜNCEL: RevenueCat entegrasyonu Aşama 2-4
(commit `d78927e`) dahil; versionCode 2/1.1**). Önceki 17.11 üretimi (18 MB)
Apple girişi testinde kullanılmıştı → 2. katman hatası (bkz. oturum #17 Apple
kaydı; sorun donduruldu). M36 onboarding 17.11'de telefonda test edildi ✅.
**DİKKAT (23.11):** bu APK'da RevenueCat configure EDİLMEZ — `.env`'deki
`VITE_REVENUECAT_API_KEY` hâlâ yer tutucu; gerçek anahtar girilip APK
yeniden üretilmeden ödeme akışı telefonda test EDİLEMEZ (Aşama 2 güvenlik
katmanı bilinçli olarak atlıyor).

**13.11.2026 oturumu #11 — M28 ÇÖZÜLDÜ (state management; 17/17 — SON):**
Favori ilan/yer state'i React Context'e taşındı (yeni bağımlılık YOK —
Zustand yerine): `src/context/SavedItemsContext.tsx` (SavedItemsProvider +
useSavedItems; localStorage kalıcılığı + sekmeler arası `storage` senkronu
provider'da tek noktada) + `src/utils/savedItemsStorage.ts` (saf yükleme/
kaydetme; anahtarlar aynı → kullanıcı favorileri korunur) + 5 test.
`van_saved_deals_changed` özel window event'i ve 3 bileşendeki dağınık
dinleyiciler kaldırıldı — bonus: PlacesView yanlışlıkla İLAN event'ini
dinleyerek YERleri senkronluyordu (isim benzerliği tuzağı). DealsView/
PlacesView/SettingsView yerel useState kopyaları + elle localStorage
yazmaları → useSavedItems(). Doğrulama: tsc strict exit 0; 46/46 test;
eslint 0 error / 37 warning (38→37); build OK. Commit `6a2790c`.

**12.11.2026 oturumu #11 — M27 ÇÖZÜLDÜ (tsconfig strict; 16/17):**
EN BÜYÜK BULGU: `@types/react`/`@types/react-dom` HİÇ kurulmamıştı — react
import'ları `any`'ye çözümleniyordu, yani JSX dahil tüm React kodu proje
tarihinde hiç tip denetlenmemişti. Kuruldu (React 19 tipleri). tsconfig'e
`strict: true` eklendi, gereksiz `allowJs` kaldırıldı → 31 hata çıktı,
tamamı düzeltildi: ~19 catch değişkeni (M21'den ertelenen borç — yeni
`src/utils/errors.ts` yardımcıları: getErrorMessage/getErrorCode/
isPurchaseCancelled + 8 test), AuthContext photoURL birlik daraltması
(firebase `photoURL` vs capacitor `photoUrl`), Deal'e opsiyonel `phone`
(eski localStorage ilanları). BONUS GERÇEK HATA: NewsView "Yenile" butonu
MouseEvent'i `silent` parametresine geçiriyordu → spinner hiç görünmüyordu;
düzeltildi. RevenueCat iptal tespiti SDK'nın resmi yoluna taşındı
(code === PURCHASE_CANCELLED_ERROR, userCancelled deprecated). Doğrulama:
tsc strict exit 0; 41/41 test; eslint 0 error / 38 warning; build 3.43 s.
Commit `7156b76` — push + **CI ✅ yeşil** (check-runs: build / completed /
success; CI artık strict tsc ile koşuyor).

**12.11.2026 oturumu #11 — M26 ÇÖZÜLDÜ (Firestore şema normalizasyonu; 15/17):**
Ön denetim (aşağıda) üç koleksiyonun da BOŞ olduğunu gösterince iş kod
tarafına indi. `src/lib/firebase.ts`'te RawDealDoc/RawTaxiDoc canonical'e
indirildi (12 varyant alan silindi; server/listings.ts whitelists'leri tek
doğruluk kaynağı). DealsView'daki satır içi eşleme (Timestamp kalkanı +
`??` zincirleri + `as Deal[]` cast'i) saf fonksiyona çıktı:
`src/utils/dealMapping.ts` + 4 regresyon testi. HomeView'daki taksi eşlemesi
canonical-only oldu; `as TaxiStand[]` cast'i kalktı. `Deal`/`TaxiStand`
uygulama-modeli tiplerine DOKUNULMADI (eşleme katmanı meşru normalizasyon
noktası; SettingsView/testlere domino etkisini önlemek için bilinçli karar).
Denetim betiği `scripts/firestore-schema-audit.ts` repoya girdi. Commit
`135b131`. İstemci tarafı → Render deploy gerekmedi.

**12.11.2026 oturumu #11 — 15/17 ÖN DENETİM (Firestore şema):**
Salt okunur denetim betiği yazıldı (`scripts/firestore-schema-audit.ts`,
repoda — `npx tsx` ile koşulur). SONUÇ: `is_ilanlari`, `indirim_ilanlari`,
`taksiler` koleksiyonlarının ÜÇÜ DE BOŞ (0 doküman; service account +
istemci config aynı proje `vanrehberim-f181b` doğrulandı). Yani 15/17 =
migrate edilecek veri YOK; iş kod tarafına indi: RawDealDoc/RawTaxiDoc
canonical'e indir + bileşen `??` zincirleri sadeleşir + DealsView eşlemesi
saf fonksiyona çıkar (M24 deseni). Betik M26 commit'iyle (`135b131`) repoya
girdi.

**12.11.2026 oturumu #11 — M24 ÇÖZÜLDÜ (Vitest test altyapısı; 4.3):**
Vitest kuruldu — 5 test dosyası / 29 test, CI'da her push'ta koşuyor.
DealsView süre mantığı `src/utils/listingMeta.ts`'e çıkarıldı (saf
fonksiyonlar). KVKK silme yolu (deleteAllUserData) artık regresyon
testiyle korunuyor. Commit `6540bb3`, CI ✅ yeşil.

**12.11.2026 oturumu #11 — M23 ÇÖZÜLDÜ (CI cleanup-commit; 4.3):**
Ölü "Clean generated files" adımı CI'dan silindi (commit push yetkisi
olmayan detached checkout'ta çöpe gidiyordu; repoda temizlenecek dosya da
yok). Yerine M7 dersinden sunucu boot smoke-test'i eklendi — import/boot
sınıfı hatalar artık CI'da yakalanıyor. Commit `ccfef32`, CI ✅ yeşil.

**12.11.2026 oturumu #11 — M22 ÇÖZÜLDÜ (timeout'lar + long-polling; 4.3):**
4 serviste 60 sn fetch timeout → 15 sn (news/prayer ile tutarlı).
`experimentalForceLongPolling` KALDI ama bilinçli karar olarak belgelendi:
CapacitorHttp açık → Firestore WebChannel (XHR streaming) Android'de
çalışmaz; onSnapshot long-polling'e muhtaç. Commit `2620d2b` (CI Actions
kuyruğunda bekledi — platform gecikmesi; yerel doğrulama tamamdı).

**11.11.2026 oturumu #11 — M21 ÇÖZÜLDÜ (any tip borcu; 4.3):**
29 explicit `any`'nin TAMAMI temizlendi (eslint no-explicit-any 29 → 0;
toplam uyarı 77 → 48). Firestore sınırı tipli hale geldi (RawDealDoc /
RawTaxiDoc ham doküman arayüzleri + JobListing); ölü
`src/services/firestoreFetchData.ts` silindi. Commit `a24c93d`, CI ✅ yeşil.

**11.11.2026 oturumu #11 — M20 ÇÖZÜLDÜ (server.ts şişkinliği; 4.3):**
612 satırlık inline otobüs fallback verisi (b-1..b-30, `fallbackRoutes`
dizisi + 23 `push` bloğu) `server/busFallbackData.ts` modülüne taşındı
(`BUS_FALLBACK_ROUTES` + `BusRouteData` export). server.ts 1694 → 1082
satır; veri artık istek başına yeniden oluşturulmuyor. Commit `1b49a38`,
CI ✅ yeşil + Render'da CANLIDA (canlı endpoint doğrulandı).

**11.11.2026 oturumu #11 — M19 ÇÖZÜLDÜ (alert() kullanımları; 4.3):**
10 alert() çağrısının tamamı uygulama içi bildirimlere çevrildi (JobsView
errorToast, DealsView errorToast, HomeView ödeme modalı hata alanı,
SettingsView yeşil başarı bildirimi). Bonus: paylaş butonundaki sahte
"bağlantı kopyalandı" artık gerçek clipboard kopyalaması. Commit `acc21ae`.

**11.11.2026 oturumu #11 — M18 ÇÖZÜLDÜ (scraping ToS riski; 4.1.5):**
Önbelleği olmayan üç scraped endpoint'e (hava/eczane/otobüs) M8/M15 deseni
uygulandı — kaynak başına istek hacmi ciddi düştü. Commit `130c114`,
CI ✅ yeşil + Render'da CANLIDA.

**11.11.2026 oturumu #11 — M17 ÇÖZÜLDÜ (küçük mantık kümesi; 4.2.10):**
Beş bağımsız düzeltme tek batch'te: (1) `removeAllListeners()` → yalnızca
kendi backButton dinleyicisi; (2) splash 2 sn → 600 ms; (3) var olmayan
lodash chunk'ı kaldırıldı; (4) `clean` script'i Windows uyumlu (node
fs.rmSync — test edildi); (5) haber bildirimleri rastgele 5 saat yerine
sabit 09:00/18:00 dürüst hatırlatma. Commit `2410c94`.

**11.11.2026 oturumu #11 — M16 ÇÖZÜLDÜ (taziye yarı-özelliği; 4.2.7):**
Kullanıcı kararı: yarım özellik TAMAMEN KALDIRILDI (tamamlama değil).
`DeathNotice` tipi, boş `DEATH_NOTICES` mock'u, `obituaryEnabled` ayarı,
ölü `deathNoticeAlerts` state'i ve politika metinlerindeki "vefat ilanları"
vaatleri silindi. Özellik ileride gerçekten istenirse planlı ve tam olarak
eklenecek. Commit `10b54ec`, CI ✅ yeşil. İstemci tarafı.

**11.11.2026 oturumu #11 — M15 ÇÖZÜLDÜ (namaz vakitleri çift kaynak; 4.2.8):**
Ayrıntı Bölüm 3'teki M15 kaydında. Kısa özet: istemci Aladhan'ı bıraktı,
tek kaynak kendi sunucumuzdaki Diyanet endpoint'i oldu (1 saat önbellek +
24 saat bayat-fallback). Commit `cbf355f` CANLIDA doğrulandı; `4ab347f`
ek düzeltme (Gregorian tarih gösterimi).

**10.11.2026 oturumu #11 — M14 ÇÖZÜLDÜ (AuthContext sorunları; 4.2.6):**
Ayrıntı Bölüm 3'teki M14 kaydında. Kısa özet: ölü `fontLoading()` kodu,
localStorage'dan doğrulamasız oturum restore'u ve logout hard reload
kaldırıldı; e-posta yanıltıcı UI metinleri düzeltildi. Commit `1607a85`.
İstemci tarafı — etki yeni APK/web'de.

**10.11.2026 oturumu #11 — M13 ÇÖZÜLDÜ (KVKK hesap silme; 4.2.9):**
Ayrıntı Bölüm 3'teki M13 kaydında. Kısa özet: `deleteAllUserData()` Auth
kaydı silinmeden ÖNCE Firestore'daki profil + favoriler + kendi ilanlarını
siliyor (backend 503 döndüğü için istemci tarafında; kurallar sahibin
silinebilmesine izin veriyor). Commit `1060f5b`, CI ✅ yeşil. İstemci
tarafı — etki yeni APK/web'de.

**10.11.2026 oturumu #11 — M12 ÇÖZÜLDÜ (weatherService uydurma veri; 4.2.5):**
Kullanıcı kalan 17 sorunun tamamını çözmeyi onayladı. Ayrıntı Bölüm 3'teki
M12 kaydında. Kısa özet: rüzgar yönü sabit 'KB' idi → artık API derecesinden
16 yönlü Türkçe pusula; yağış olasılığı ve günlük nem uydurma formüllerden →
gerçek `precipitation_probability_max` + `relative_humidity_2m_mean`
(Open-Meteo desteklemiyor olabilir diye canlı API çağrısıyla doğrulandı);
AQI/UV eksikse sahte varsayılan yerine null → UI "Veri Yok". Commit `e210a85`,
CI ✅ yeşil. İstemci tarafı değişikliği — etki yeni APK/web'de görünecek.

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

> **13.11.2026 — M28 ÇÖZÜLDÜ (state management; 4.3 — 17/17 SON SORUN):**
>
> - **Sorun:** Bileşenler arası senkronizasyon localStorage + özel window
>   event'iyle yapılıyordu: her bileşen kendi `useState` kopyasını
>   `saved_deals_van`/`saved_places_van`'dan okuyor, `van_saved_deals_changed`
>   event'i dağıtıp dinliyordu. (Bonus kusur: PlacesView YER senkronu için
>   yanlışlıkla İLAN event'ini dinliyordu — isim benzerliği tuzağı.)
> - **Karar:** Zustand yerine React Context — yeni bağımlılık yok, uygulama
>   ölçeği için yeterli, React-idiomatik (5.2.4 önerisi böyle karşılandı).
> - **Çözüm:**
>   - `src/context/SavedItemsContext.tsx` (YENİ): SavedItemsProvider +
>     `useSavedItems()` — savedDealIds/savedPlaceIds state'i, kalıcılık
>     effect'leri ve sekmeler arası `storage` dinleyicisi TEK provider'da.
>     API: isDealSaved/isPlaceSaved/toggleSaveDeal/toggleSavePlace/setSavedDeals.
>   - `src/utils/savedItemsStorage.ts` (YENİ): `loadSavedIds` (bozuk JSON /
>     dizi olmayan / string olmayan eleman koruması) + `saveSavedIds` (saf;
>     +5 test `savedItemsStorage.test.ts` — sahte localStorage ile).
>     Anahtarlar ve varsayılanlar değişmedi (saved_deals_van → ['d-1','d-4'],
>     saved_places_van → ['place-1','place-3']): mevcut kullanıcı verisi
>     aynen taşınır.
>   - `src/main.tsx`: SavedItemsProvider, AuthProvider'ın içine eklendi.
>   - DealsView: yerel savedDeals state'i + persistence effect'i →
>     `useSavedItems()` (JSX aynı kalsın diye `savedDealIds: savedDeals`
>     takma adıyla).
>   - PlacesView: state + yanlış-event dinleyicisi → `useSavedItems()`.
>   - SettingsView: 2 state + sync effect + toggleSaveDeal/toggleSavePlace/
>     addSampleBusinesses'in elle localStorage yazmaları → context çağrıları.
>   - `van_saved_deals_changed` event'i TAMAMEN kaldırıldı (yalnızca
>     yorumlarda anılıyor).
> - **Kapsam dışı (bilinçli):** `app_theme` (App.tsx prop akışıyla zaten
>   düzgün — event hack'i yok); `user_deals_van` salt-okunur eski veri.
> - **Doğrulama:** `npx tsc --noEmit` (strict) ✅ exit 0; `npm test` ✅
>   46/46 (8 dosya, 309 ms — savedItemsStorage testleri +5); eslint 0 error /
>   37 warning (38→37 — kaldırılan kod bir uyarıyı götürdü); build ✅.
>   Commit `6a2790c` — push + **CI ✅ yeşil** (check-runs: build / completed /
>   success). İstemci tarafı → Render deploy gerekmedi; etki yeni
>   APK/web'de.

> **12.11.2026 — M27 ÇÖZÜLDÜ (tsconfig strict + @types/react; 4.3):**
>
> - **Sorun:** `tsconfig.json`'da `strict` yoktu VE `@types/react`/
>   `@types/react-dom` hiç kurulmamıştı — react/react-dom import'ları
>   `any`'ye çözümleniyordu. Yani `tsc --noEmit` geçiyordu ama JSX dahil
>   hiçbir React kodu gerçekte tip denetlenmiyordu (M21'in any temizliği
>   bile bu kör noktayı kapatamamıştı).
> - **Çözüm:**
>   - `npm i -D @types/react@19 @types/react-dom@19` — React kodu ilk kez
>     gerçekten tip denetleniyor.
>   - `tsconfig.json`: `"strict": true` eklendi; gereksiz `allowJs: true`
>     kaldırıldı (src'de .js dosyası yok; sadece tipli dosyalar).
>   - `src/utils/errors.ts` (YENİ): strict'te catch değişkenleri `unknown`
>     gelir — `getErrorMessage` (Error→.message, string→kendisi, diğer→
>     String()), `getErrorCode` (Firebase Auth kodları), `isPurchaseCancelled`
>     (RevenueCat: code === PURCHASE_CANCELLED_ERROR="1" resmi yol +
>     deprecated `userCancelled` legacy). + `src/utils/errors.test.ts`
>     (8 test).
>   - 31 strict hatasının tamamı düzeltildi (DealsView ×3, HomeView ×2,
>     JobsView ×3, LoginModal ×2, NewsView ×1, SettingsView ×2+4,
>     AuthContext ×6, 5 servis ×1, purchaseService ×1):
>     - ~19 catch değişkeni → getErrorMessage/getErrorCode (M21'den
>       ertelenen borç kapandı).
>     - AuthContext photoURL: `fbUser` birliği `User(firebase) | User
>       (capacitor)` — alan adları farklı (photoURL vs photoUrl); `'photoURL'
>       in fbUser` daraltmasıyla güvenli okuma.
>     - `Deal` tipine opsiyonel `phone` eklendi (yalnızca eski localStorage
>       `user_deals_van` ilanlarında var; SettingsView "Ara" butonu okur —
>       Firestore canonical şemasında YOK, M26 kararı değişmedi).
>   - **Bonus gerçek hata:** NewsView "Yenile" `onClick={loadNewsData}`
>     MouseEvent'i `silent` parametresi olarak geçiriyordu (truthy) →
>     manuel tıklamada yükleme spinner'ı HİÇ görünmüyordu. →
>     `onClick={() => loadNewsData()}`.
> - **Doğrulama:** `npx tsc --noEmit` (strict config) ✅ exit 0; `npm test`
>   ✅ 41/41 (7 dosya, 598 ms — errors.ts testleri +8); eslint 0 error /
>   38 warning (değişiklik yok); build ✅ (vite 3.43 s). Commit `7156b76`.
>   İstemci tarafı + tip paketleri → Render deploy gerekmedi (sunucu
>   çalışma kodu değişmedi).

> **12.11.2026 — M26 ÇÖZÜLDÜ (Firestore şema normalizasyonu; 4.3):**
>
> - **Sorun:** Firestore ham doküman tipleri (`RawDealDoc`/`RawTaxiDoc`)
>   eski şema varyantlarını (storeName/baslik/oran/vs.) da içeriyordu ve
>   bileşenler veriyi 5-6 alternatiflı `??` zincirleriyle "KORUMA KALKANI"
>   yorumlarıyla okuyordu — yazma yolu (server/listings.ts) zaten tek
>   (canonical) şemaya bağlıyken okuma tarafı gereksiz tolerans taşıyordu.
> - **Ön denetim:** `scripts/firestore-schema-audit.ts` (salt okunur,
>   firebase-admin ile; repoya commit edildi, `npx tsx` ile yeniden
>   koşulabilir) — `is_ilanlari`, `indirim_ilanlari`, `taksiler`
>   koleksiyonlarının ÜÇÜ DE BOŞ (0 doküman; service account + istemci
>   config aynı proje `vanrehberim-f181b` doğrulandı). Migrate edilecek
>   veri yok → iş kod tarafına indi.
> - **Çözüm:**
>   - `src/lib/firebase.ts`: RawDealDoc 10 canonical alan + RawTaxiDoc 9
>     canonical alan; 12 varyant alan silindi. Başlıkta canonical kararın
>     (M21+M26) ve boş-DB denetiminin (12.11.2026) belgesi.
>   - `src/utils/dealMapping.ts` (YENİ): `mapDealDoc(doc) → Deal` saf
>     fonksiyonu — eski DealsView satır içi eşlemesinin tek noktaya
>     çıkarılmış hali; eksik alanlara akıllı varsayılanlar.
>   - `src/utils/dealMapping.test.ts` (YENİ): 4 test — tam canonical
>     eşleme (toEqual), boş doküman varsayılanları, indirimKodu→
>     indirimDegeri fallback'i, isFeatured tanımsız geçişi.
>   - `src/components/DealsView.tsx`: satır içi eşleme + Timestamp kalkanı
>     + `as Deal[]` cast'i kaldırıldı → `firestoreDeals.map(mapDealDoc)`.
>   - `src/components/HomeView.tsx`: taksi eşlemesi canonical-only sabit
>     eşleme; `as TaxiStand[]` cast'i kaldırıldı.
> - **Bilinçli kararla DOKUNULMADI:** `Deal`/`TaxiStand`/`JobListing`
>   uygulama-modeli tipleri (eşleme katmanı DB→model normalizasyonunun
>   meşru noktası; SettingsView + testlere domino etkisini önler);
>   `experimentalForceLongPolling` (M22 belgeli kısıtı); JobsView/SettingsView
>   eşlemeleri (ayrı görev — monolit bölünmeleri).
> - **Doğrulama:** `npx tsc --noEmit` ✅ exit 0; `npm test` ✅ 33/33
>   (6 dosya, 358 ms); eslint 0 error / 38 warning (değişiklik yok);
>   `npm run build` ✅ (vite 3.46 s + server bundle). Commit `135b131` —
>   push; **CI ✅ yeşil** (check-runs: build / completed / success).
>   İstemci tarafı değişikliği → Render deploy gerekmedi; etki yeni
>   APK/web'de.

> **12.11.2026 — M25 ÇÖZÜLDÜ (HomeView monolit bölünmesi; 4.3):**
>
> - **Sorun:** HomeView.tsx 2.167 satırlık monolitti — hava durumu, eczane,
>   ezan, döviz, otobüs, taksi bölümlerinin TÜM state/handler/JSX'i tek
>   dosyada; bakım ve test (M24'te RTL ertelenmişti) imkânsızı.
> - **Yöntem:** Refaktör bir arka plan alt ajana devredildi (ayrıntılı brifing:
>   saf taşıma, davranış değişikliği yok, uniform prop'lar). Ajan Bash
>   sınıflandırıcısı arızası nedeniyle kendi kendini doğrulayamadan kullanıcı
>   tarafından durduruldu; 5 bölüm dosyası oluşmuştu. Ana oturum devraldı:
>   HomeView'in son hali satır satır gözden geçirildi (kablolama, prop
>   eşleşmeleri, kalan bölümler), doğrulama + commit ana oturumda yapıldı.
> - **Sonuç:** HomeView.tsx **2167 → 960 satır**; 5 yeni dosya
>   `src/components/home/` altında:
>   - `WeatherSection.tsx` (379 satır) — canlı hava durumu + modal.
>   - `PharmacySection.tsx` (276) — nöbetçi eczane + modal.
>   - `PrayerSection.tsx` (312) — ezan vakitleri + 60 sn yeniden hesap
>     interval'i + modal.
>   - `CurrencySection.tsx` (293) — döviz/altın + 60 sn tazeleme + modal.
>   - `BusSection.tsx` (370) — otobüs hatları + arama/kategori filtreleri
>     + modal.
>   Her bölüm uniform prop alır: `{ isDark, searchQuery, isModalOpen,
>   onOpen, onClose }` — modal açık/kapalı tekeli HomeView'daki `activeModal`
>   union state'inde kaldı (aynı anda tek modal).
> - **HomeView'da kalan:** arama çubuğu + `showCard` gizleme helper'ı, iş
>   ilanı promo kartı, hastane kartı + hastane modalı, taksi bölümünün
>   TAMAMI (Firestore aboneliği + eşleme + ekleme formu + RevenueCat ödeme
>   modalı — akışlar birbirine bağlı olduğu için bilinçli olarak bölünmedi).
> - **Bonus temizlik:** `pharmacyService.ts`'te kullanılmayan `PHARMACIES`
>   import'u silindi — eslint uyarıları 48 → 38.
> - **Doğrulama:** `npx tsc --noEmit` ✅ exit 0; `npm test` ✅ 29/29
>   (607 ms); `npm run build` ✅ (vite 10.47 s + server bundle). Commit
>   `46eaf9b` — push + **CI ✅ yeşil** (check-runs: build / completed /
>   success). İstemci tarafı değişikliği → Render deploy gerekmedi; etki
>   yeni APK/web'de.
> - **Kalan monolitler:** JobsView (1.033) + SettingsView (995) — ayrı görev
>   (istenirse 17 sorun bittikten sonra; 14/17 maddesi HomeView'ı hedefliyordu).

> **12.11.2026 — M24 ÇÖZÜLDÜ (Vitest test altyapısı; 4.3):**
>
> - **Sorun:** Test altyapısı YOKTU — hiçbir test çerçevesi, hiçbir test
>   yoktu; her doğrulama elle tsc/build/boot ile yapılıyordu.
> - **Çözüm (altyapı):** `vitest` devDependency olarak eklendi (v5.1.0);
>   `vitest.config.ts` (environment: 'node'; src + server test dosyaları);
>   `package.json`'a `"test": "vitest run"`; ci.yml'e "Unit tests (Vitest)"
>   adımı lint sonrası. CI akışı artık: npm ci → lint → test → build →
>   boot smoke-test → artifact.
> - **Kapsam kararı:** React Testing Library ŞİMDİLİK eklenmedi — bileşen
>   render testleri HomeView bölünmesinden (14/17) sonra anlamlı; monolit
>   bileşenleri render etmek kırılgan testler üretirdi. Öncelik 5.2.5'teki
>   saf/mocked hedefler alındı.
> - **Refactor (test edilebilirlik):** DealsView'ın süre mantığı saf
>   fonksiyon modülüne taşındı — `src/utils/listingMeta.ts`
>   (`getDealMetaFromPackage` + `computeEndDate`; ikincisine opsiyonel
>   `from: Date` parametresi eklendi, çağıranlar değişmedi). Bu modül
>   14/17 bölünmesine de zemin hazırlar.
> - **Test dosyaları (5 dosya / 29 test):**
>   - `src/utils/listingMeta.test.ts` — ürün→süre/meta eşlemesi, gg.aa.yyyy
>     üretimi, ay taşıma, artık yıl (2028/2027).
>   - `src/services/prayerService.test.ts` — `calculatePrayerStatus` 5
>     senaryo (sahte sistem saatiyle: imsak/öğle/yatsı-sonrası/gece-öncesi,
>     sınır dakikaları).
>   - `src/services/purchaseService.test.ts` — mock'lu RevenueCat: paket
>     arama (bulma/boş/aktif offering yok), satın alma (başarı/kullanıcı
>     iptali false/hata mesajı/geçersiz paket).
>   - `src/lib/firebase.test.ts` — mock'lu firestore ile
>     `deleteAllUserData` (M13 KVKK kritik yolu: profil + favoriler + 3
>     koleksiyon sorgusu + ilan silme sayıları). Regresyon = KVKK ihlali
>     riski olduğu için en değerli test.
>   - `server/busFallbackData.test.ts` — M20 çıkarımının şekil sözleşmesi:
>     30 hat, benzersiz id/lineNo, tüm saatler ss:dd regex, zorunlu alanlar.
> - **Doğrulama:** `npm test` → **29/29 geçti** (830 ms); tsc exit 0; eslint
>   48 warning (değişiklik yok); build OK. Commit `6540bb3` — push + **CI ✅
>   yeşil** (test adımı CI'da ilk kez bu committe koştu). Sunucu çalışma
>   kodu değişmedi → Render deploy gerekmedi.

> **12.11.2026 — M23 ÇÖZÜLDÜ (CI cleanup-commit anti-pattern; 4.3):**
>
> - **Sorun:** ci.yml'deki "Clean generated files (git rm --cached)" adımı
>   CI içinde `git rm --cached` + `git commit` yapıyordu. (1) Commit çöpe
>   gidiyordu: checkout push yetkisi olmayan detached state'te çalışır,
>   oluşturulan commit hiçbir yere itilmez — tamamen ölü kod. (2) Token
>   yetkisi olsaydı bot commit'leri main geçmişini kirletirdi (gerçek
>   anti-pattern). (3) Koruduğu hiçbir şey yoktu: M10 temizliğinden sonra
>   repoda üretilmiş dosya kalmadı (`git ls-files` doğrulaması: yalnızca
>   `build.gradle` ve `gradle-wrapper.jar` eşleşiyor — ikisi de bilinçli
>   tracked kaynak dosya).
> - **Çözüm:**
>   - Ölü adım ci.yml'den tamamen silindi.
>   - `.gitignore`'a `*.aab` eklendi (ölü adımın tek benzersiz kalıntı
>     korumasıydı; diğer desenler zaten vardı).
>   - **M7 dersinin yerine getirilmesi:** yeni "Server boot smoke test"
>     adımı — `NODE_ENV=production PORT=3999 timeout 15 node dist/server.cjs
>     || test $? -eq 124`. EXIT 124 = sunucu ayakta kaldı = geçti. Env
>     yokken boot güvenli (listings.ts lazy init; /api/listings istek
>     anında 503 fail-closed). Böylece M7'deki gibi yalnızca ts-node/esbuild
>     çözümleme farkında görünen import hataları CI'da yakalanır.
> - **Not (Bölüm 4 maddesinin diğer yarısı):** "npm audit fix build sırasında
>   lock dosyasını değiştirebilir" kısmı zaten çözülmüş — scriptlerde `npm
>   audit fix` yok (M10 çevresinde temizlenmiş).
> - **Doğrulama:** smoke-test komutu YERELDE doğrulandı (EXIT 124, "Server
>   running on http://localhost:3999"); commit `ccfef32` — push + **CI ✅
>   yeşil** (yeni workflow ilk kez bu committe çalıştı). Sunucu kodu
>   değişmedi → Render deploy gerekmedi.

> **12.11.2026 — M22 ÇÖZÜLDÜ (servis timeout'ları + experimentalForceLongPolling; 4.3):**
>
> - **Sorun (iki parça):** (1) 4 servis (weatherService, pharmacyService,
>   currencyService, busService) fetch timeout'u 60 sn'ydi — mobilde çok
>   uzun; kullanıcı yarım dakika boş bekleyebilir. (2)
>   `experimentalForceLongPolling: true` firebase.ts'te açıklamasız duruyordu
>   (denetim: "performans kısıtı, kalmış").
> - **Çözüm (1) — timeout'lar:** dördünde de 60000 → 15000 ms
>   (newsService/prayerService ile tutarlı). Tüm bu servislerin catch
>   blokları zarif fallback'e düşüyor (M12+ çalışması) — abort durumunda
>   uygulama çökmüyor, yerel/önbellek veriye dönüyor.
> - **Çözüm (2) — long-polling KALDIRILMADI, belgelendi:** araştırma
>   sonucu flag yük taşıyor: `capacitor.config.ts`'te **CapacitorHttp
>   açık**; o WebView'daki tüm fetch/XHR'yi native katmana yönlendirir ve
>   akış yanıtlarını tamponlar. Firestore'un varsayılan WebChannel
>   transport'u XHR streaming'e dayanır → CapacitorHttp altında onSnapshot
>   canlı dinleyicileri Android'de ÇALIŞMAZ. Long-polling her istekte tam
>   yanıt aldığı için bu kombinasyonda güvenilir tek yol. Flag'in yanına
>   tam gerekçe yorumu eklendi ("CapacitorHttp kapatılırsa bu flag de
>   kaldırılmalı"). Flag'i kaldırmak uygulamanın TEK mobil platformundaki
>   canlı ilan akışını bozabilirdi — yeni APK + cihaz testi olmadan
>   kaldırılmaz (bilinçli karar).
> - **Doğrulama:** tsc exit 0; eslint 0 error / 48 warning (değişiklik yok);
>   `npm run build` OK. Commit `2620d2b` — push edildi; CI run'ı GitHub
>   Actions kuyruğunda uzun süre `queued` takıldı (platform gecikmesi —
>   hemen önceki run'lar sorunsuz tamamlanmıştı; sonuç bir sonraki
>   kontrolde doğrulanacak). İstemci tarafı: etki yeni APK/web'de.

> **11.11.2026 — M21 ÇÖZÜLDÜ (any tip borcu; 4.3):**
>
> - **Sorun:** 29 yerde explicit `any` — firebase.ts subscribe
>   fonksiyonları, bileşen mapping'leri, catch blokları, prayerService ham
>   JSON; ayrıca hiçbir yerde import edilmeyen ölü
>   `src/services/firestoreFetchData.ts` (2 `any` daha).
> - **Çözüm:**
>   - **firebase.ts:** `subscribeJobListings` artık `(jobs: JobListing[])`
>     verir (Firestore sınırında tek belgeli `as JobListing[]` cast'ı;
>     JobsView'daki tüketici cast'ı kalktı). `subscribeDeals` /
>     `subscribeTaxis` için yeni **ham doküman arayüzleri**:
>     `RawDealDoc` (isletmeAdi/storeName/name/title, indirimKodu/baslik,
>     indirimDegeri/oran vb. TÜM bilinen alan varyantları) ve `RawTaxiDoc`
>     (name/isim/title, plaka/plaka/taxiPlate, calismaBolgeleri vb.).
>     Bunlar şema karışıklığını (denetim maddesi 15) kodda belgeler;
>     normalizasyon tamamlanana kadar bileşen mapping'lerinin tip kaynağı.
>   - **DealsView:** `useState<any[]>` → `Deal[]`, `selectedDeal` →
>     `Deal | null`; mapping parametresi tipli akıyor; startDate/endDate/
>     address eksikliği için `as Deal[]` cast'ı tek noktada, belgeli.
>   - **HomeView:** taksi mapping parametresi artık `RawTaxiDoc` (annotation
>     kaldırıldı, tip callback'ten akıyor).
>   - **prayerService:** ham sunucu yanıtı için `PrayerTimesApiResponse`
>     arayüzü; kullanılmayan `PrayerTimes` import'u da temizlendi.
>   - **19 catch bloğu:** `catch (err: any)` → `catch (err)` (strict kapalı
>     olduğundan davranış birebir aynı — implicit any; `unknown` işleyişi
>     16/17 strict maddesinde yapılacak).
>   - **Ölü kod:** `firestoreFetchData.ts` silindi (grep ile doğrulandı:
>     hiçbir import yoktu).
> - **Sonuç:** `no-explicit-any` 29 → 0; toplam lint uyarısı 77 → 48
>  (kalanlar önceden var olan başka uyarılar). Toplam satır kazancı: -42 ölü.
> - **Doğrulama:** eslint 0 error; tsc exit 0; `npm run build` OK.
>   Commit `a24c93d` — push + **CI ✅ yeşil**. İstemci tarafı: etki yeni
>   APK/web'de (Render deploy gerekmedi — sunucu kodu değişmedi).

> **11.11.2026 — M20 ÇÖZÜLDÜ (server.ts şişkinliği; 4.3):**
>
> - **Sorun:** `server.ts` 1694 satırdı; ~612 satırı (satır 832-1443) rotanın
>   içinde inline otobüs fallback verisiydi: `const fallbackRoutes = [...]`
>   (b-1..b-7) + 23 adet `fallbackRoutes.push({...})` (b-8..b-30 ring
>   hatları). Her `/api/bus-schedules` isteğinde tüm bu nesne dizisi yeniden
>   oluşturuluyordu.
> - **Çözüm:** veri `server/busFallbackData.ts` modülüne taşındı (listings.ts
>   ile aynı dizin; native ESM `.ts` uzantılı import):
>   - `export interface BusRouteData` (id/lineNo/title/route/departureTimes/
>     returnTimes/stops/frequency/status/tariff/operatingHours) +
>     `export const BUS_FALLBACK_ROUTES: BusRouteData[]` (30 hat, birebir
>     aynı içerik — b-1..b-3, b-8, b-29, b-30 örneklemiyle doğrulandı).
>   - server.ts'te: import eklendi; `typeof fallbackRoutes` → `BusRouteData[]`;
>     `routes: fallbackRoutes` → `routes: BUS_FALLBACK_ROUTES`.
>   - 612 satırlık silme Edit aracı yerine `sed -i '832,1443d'` ile yapıldı
>     (birebir eşleşme kırılgan olurdu; Bash sınıflandırıcısı kapalıydı,
>     kullanıcı `!` ile çalıştırdı).
> - **Sonuç:** server.ts 1694 → 1082 satır; veri modül seviyesinde tek seferde
>   tanımlı. Davranış değişikliği yok.
> - **Doğrulama:** tsc exit 0; `npm run build` OK; boot testi EXIT_CODE=124;
>   yerel `localhost:3000/api/bus-schedules` yeni modülden aynı veriyi döndü;
>   commit `1b49a38` — push + **CI ✅ yeşil** + Render'da **CANLIDA**
>   (canlı endpoint aynı veriyi döndürüyor).

> **11.11.2026 — M19 ÇÖZÜLDÜ (alert() kullanımları; 4.3):**
>
> - **Sorun:** ödeme/hata akışlarında 10 yerde `alert()` (JobsView 4,
>   DealsView 3, HomeView 2, SettingsView 1) — çirkin, engelleyici ve
>   Android WebView'da kötü UX.
> - **Çözüm:**
>   - **JobsView:** `errorToast` state (successToast'un kırmızı ikizi,
>     fixed toast) — 3 hata alert'i buraya; `AlertCircle` zaten importluydu.
>   - **DealsView:** aynı `errorToast` deseni — 3 alert; `AlertCircle`
>     import'u eklendi.
>   - **HomeView:** taksi ödeme modalında hata alanı yoktu → `payModalError`
>     state + modal içi kırmızı kutu — 2 alert buraya.
>   - **SettingsView:** hesap silme `alert(...)` → `deleteSuccess` yeşil
>     cam bildirim; çıkış/hard reload 2,5 sn gecikmeli (kullanıcı mesajı
>     okuyabilsin).
>   - **Bonus hata (JobsView paylaş butonu):** `navigator.share` yoksa
>     "İlan bağlantısı kopyalandı!" alert'i veriyordu ama HİÇBİR ŞEY
>     kopyalanmıyordu → artık gerçek `navigator.clipboard.writeText` +
>     successToast.
> - **Doğrulama:** tsc exit 0; eslint 0 error; `npm run build` OK.
>   Commit `acc21ae` — push + **CI ✅ yeşil**. İstemci tarafı: etki yeni
>   APK/web'de.

> **11.11.2026 — M18 ÇÖZÜLDÜ (scraping ToS riski hafifletme; 4.1.5):**
>
> - **Sorun:** MGM / Diyanet / doviz.com / Eczacı Odası / van.bel.tr sahte
>   User-Agent ile taranıyordu; önbelleği olmayan üç endpoint'te (hava,
>   eczane, otobüs) HER istemci yenilemesi kaynak siteyi doğrudan vuruyordu.
> - **Çözüm (kod düzeyinde hafifletme):** M8/M15 önbellek deseni kalan üçüne:
>   - `/api/weather`: 10 dk TTL + 2 saat bayat-fallback (`stale: true` +
>     kaynak eki). MGM + Open-Meteo istekleri önbellekleniyor.
>   - `/api/pharmacies`: 1 saat TTL + 24 saat bayat-fallback (nöbet listesi
>     günlük değişir).
>   - `/api/bus-schedules`: 1 saat TTL + 24 saat bayat-fallback (tarifeler
>     nadir değişir); canlı parse başarısızsa önce bayat önbellek, sonra
>     yerel fallback verisi.
>   - Önceden var olanlar: haber 10 dk (M6), döviz 10 dk (M8), namaz 1 saat (M15).
> - **Sonuç:** kaynak başına üst sınır (istemci sayısından bağımsız):
>   MGM saatte ≤6, Eczacı Odası saatte ≤1, van.bel.tr saatte ≤1, Diyanet
>   saatte ≤1, doviz.com 10 dk'da ≤1 istek.
> - **KALAN RİSK (kod dışı):** resmî API sözleşmesi/izni alınamadı; sahte
>   User-Agent kullanımı ve regex tabanlı kırılgan parsing sürüyor. Kaynak
>   site HTML değiştirirse endpoint dürüst hataya düşer (fallback'ler var).
>   Tam çözüm kaynaklarla resmî anlaşma gerektirir — ürün kararı, ertelendi.
> - **Doğrulama:** tsc exit 0; boot testi EXIT 124 ✅; `npm run build` OK.
>   Commit `130c114` — push edildi. CI + Render deploy + canlı önbellek
>   doğrulaması bekliyor (sınıflandırıcı engeli).

> **11.11.2026 — M17 ÇÖZÜLDÜ (küçük mantık kümesi; 4.2.10):**
>
> - **(1) `removeAllListeners()` (App.tsx):** backButton effect'i her sekme
>   değişiminde yeniden kuruluyor ve temizlikte TÜM Capacitor dinleyicilerini
>   öldürüyordu (bildirim vb.). Artık `listener.then(h => h.remove())` ile
>   yalnızca kendi dinleyicisi kaldırılıyor.
> - **(2) Splash gecikmesi (App.tsx):** 2000 ms yapay bekleme → 600 ms.
> - **(3) `vendor-lodash` chunk (vite.config.ts):** projede lodash yok —
>   ölü chunk kuralı kaldırıldı.
> - **(4) `clean` script (package.json):** `rm -rf dist server.js` →
>   `node -e "require('fs').rmSync(...)"` — Windows'ta çalışır (lokal
>   test edildi: "temiz" çıktısı). `node -e` CJS yorumlanır (require güvenli).
> - **(5) Haber bildirimleri (notificationService.ts):** önceden gün içinde
>   RASTGELE 5 saate "Yeni Haberler Var" planlanıyordu — yeni haber kontrolü
>   olmadan yanlış iddia. Artık sabit 09:00 ve 18:00'de dürüst hatırlatma
>   ("Günün Haberleri — göz atmak ister misiniz?"). Gerçek yeni-haber push'ı
>   altyapı gerektirir, kapsam dışı.
> - **Doğrulama:** tsc exit 0; eslint 0 error (1 önceden var olan uyarı);
>   `npm run clean` ✅; `npm run build` OK. Commit `2410c94` — push +
>   **CI ✅ yeşil**. İstemci tarafı: etki yeni APK/web'de.

> **11.11.2026 — M16 ÇÖZÜLDÜ (taziye yarı-özelliği; 4.2.7):**
>
> - **Sorun:** taziye (vefat) özelliği yarım — `DeathNotice` tipi, boş
>   `DEATH_NOTICES` mock'u, `obituaryEnabled` ayar anahtarı ve UI'sı olmayan
>   `deathNoticeAlerts` state'i vardı; backend endpoint'i ve bildirim akışı
>   yoktu. Kullanıcıya görünür tek şey politika metinlerindeki boş vaatti.
> - **Kullanıcı kararı (AskUserQuestion):** tamamlamak yerine TAMAMEN KALDIR.
> - **Silinenler:** `src/types.ts` `DeathNotice` interface'i; `mockData.ts`
>   `DEATH_NOTICES` + import; `notificationService.ts` `obituaryEnabled`
>   alanı (interface + varsayılan) + legacy id-200 bildirim iptali;
>   `SettingsView.tsx` ölü `deathNoticeAlerts` state'i + KVKK/Gizlilik ve
>   Kullanım Koşulları metinlerinden "vefat ilanları" vaatleri.
> - **Geriye dönük uyum:** eski kullanıcıların localStorage'ında kalan
>   `obituaryEnabled` anahtarı zararsız — ayar objesi artık state'ten
>   yeniden kuruluyor, fazladan anahtar yok sayılıyor.
> - **Doğrulama:** `npx tsc --noEmit` exit 0; `npm run build` OK. Commit
>   `10b54ec` — push + **CI ✅ yeşil**. İstemci tarafı: etki yeni APK/web'de.

> **11.11.2026 — M15 ÇÖZÜLDÜ (namaz vakitleri çift kaynak; 4.2.8):**
>
> - **Sorun:** aynı özellik için iki ayrı kaynak — istemci Aladhan API
>   (method 13, "Diyanet'e yakın" varsayımıyla Fajr'ı İmsak sayıyordu),
>   sunucu Diyanet scraping. Değerler sapabiliyordu, çift bakım gerekiyordu.
> - **Çözüm (tek kaynak = sunucudaki Diyanet):**
>   - **`server.ts`:** scrape kodu `fetchDiyanetTimes()` yardımcısına
>     ayrıştırıldı + M8 deseniyle önbellek: 1 saat TTL (vakitler günlük
>     değişir) + 24 saat bayat-fallback (`stale: true` + kaynak eki
>     "— geçici olarak önbellekten"). Aktif vakit/geri sayım her istekte
>     güncel saatten hesaplanır (önbelleğe alınmaz).
>   - **`src/services/prayerService.ts`:** Aladhan çağrısı kaldırıldı →
>     `${VITE_API_URL}/api/prayer-times`; 60 sn → 15 sn timeout; aktif
>     vakit/geri sayım istemcide güncel saatle yeniden hesaplanıyor;
>     `stale` alanı istemci arayüzüne eklendi; mock fallback etiketi
>     "Diyanet Standart" (yanıltıcı) → "Çevrimdışı varsayılan" oldu.
>   - **`4ab347f` ek düzeltme:** sunucudan gelen `date` bazen Hicri oluyor
>     ("1 Cemaziyelahir 1448" — Diyanet sayfasındaki ilk tarih eşleşmesi);
>     ana gösterim için Gregorian Türkçe tarih istemcide üretiliyor.
> - **Doğrulama:** tsc exit 0; eslint 0 error; `npm run build` OK; boot testi
>   EXIT 124 ✅; **CANLIDA**: iki çağrıda aynı Diyanet vakitleri (önbellek
>   çalışıyor), `stale: false`, gerçek vakitler (05:12/06:35/11:55/14:41/
>   17:05/18:24). `cbf355f` Render'da live. `4ab347f` istemci tarafı —
>   etki yeni APK/web'de.

> **10.11.2026 — M14 ÇÖZÜLDÜ (AuthContext sorunları; 4.2.6):**
>
> - **Sorun:** (a) `fontLoading()` ölü/anlaşılmaz kod; (b) e-posta girişi
>   `throw` ile kapalı ama UI metinleri "e-posta ile..." diyordu; (c) Firebase
>   oturumu yoksa localStorage'dan (`van_user_profile`) doğrulamasız oturum
>   restore ediliyordu — silinmiş/cihaz dışı hesaplar "girişli" görünebiliyordu;
>   (d) logout `window.location.href = '/'` hard reload yapıyordu.
> - **Çözüm:**
>   - **`src/context/AuthContext.tsx`:** `fontLoading()` silindi (default
>     context `loading: true`); `currentUser` başlangıcı `null`; oturum
>     YALNIZCA `onAuthStateChanged` onayından sonra kuruluyor (else dalı
>     `setCurrentUser(null)`); tüm `van_user_profile` localStorage
>     okuma/yazma kaldırıldı (KVKK dostu: PII artık localStorage'da tutulmuyor);
>     `logout()` hard reload'sız — yalnızca `fbSignOut` + state temizliği.
>   - **`src/components/SettingsView.tsx`:** çıkış butonundaki tekrarlayan
>     hard reload kaldırıldı (SettingsView `currentUser === null`'da "oturum
>     kapalı" kartına döner — null-güvenli); "E-posta veya Google hesabı ile
>     giriş yapın" → "Google veya Apple hesabı ile giriş yapın".
>   - **`src/components/LoginModal.tsx`:** "uçtan uca güvenle saklanır ...
>     e-posta ile ilan ve fırsat paylaşabilirsiniz" (iki yanıltma) →
>     "Firebase altyapısında güvenle saklanır ... Google veya Apple hesabınızla
>     ... paylaşabilirsiniz".
>   - Hesap silme akışındaki (`M13`) hard reload'lar BILINÇLİ olarak korundu —
>     hesap silinmesi sonrası tüm uygulama state'inin sıfırlanması gerekli.
> - **Bilinen davranış değişikliği:** uygulama açılışında Firebase Auth
>   kararı gelene kadar `loading === true` (önceden localStorage'dan anında
>   sahte profil geliyordu). Gerçek oturum varsa `onAuthStateChanged` hızla
>   düzeltir.
> - **Doğrulama:** `npx tsc --noEmit` exit 0; `npm run build` OK (index.js
>   259,71 → 259,23 kB). Commit `1607a85` — push + **CI ✅ yeşil**. İstemci
>   tarafı: etki yeni APK/web'de.

> **10.11.2026 — M13 ÇÖZÜLDÜ (KVKK hesap silme; 4.2.9):**
>
> - **Sorun:** `deleteUser` yalnızca Auth kaydını siliyordu; Firestore'daki
>   `users/{uid}` profil dokümanı, `userFavorites/{uid}` ve kullanıcının kendi
>   ilanları (`is_ilanlari` / `indirim_ilanlari` / `taksiler`) geride kalıyordu
>   — KVKK uyumsuzluğu.
> - **Çözüm (istemci tarafında):**
>   - **`src/lib/firebase.ts`:** yeni `deleteAllUserData(userId)` — sırasıyla
>     `users/{uid}` ve `userFavorites/{uid}` dokümanlarını siler, sonra üç
>     ilan koleksiyonunda `where('userId', '==', uid)` sorgusuyla eşleşen
>     dokümanları tek tek siler.
>   - **`src/components/SettingsView.tsx`:** hesap silme handler'ında
>     `deleteAllUserData(auth.currentUser.uid)` çağrısı, `deleteUser`'dan
>     ÖNCE eklendi. Sıra kritik: güvenlik kuralları (M2) Auth oturumu
>     gerektirir — Auth kaydı silindikten sonra Firestore silmeleri reddedilirdi.
> - **Neden backend değil:** `/api/listings` M5 gereği env'ler olmadan
>   Render'da 503 döndürüyor (fail-closed) — Auth kaydı zaten istemcide
>   silindiği için arka uç endpoint'i pratik değildi. Kurallar sahibin
>   silmesine izin veriyor.
> - **Bilinen sınır:** M2 öncesi oluşturulmuş (`userId` alanı olmayan) eski
>   ilanlar sorguya yakalanmaz — yalnızca Firebase Console'dan silinebilir.
> - **Doğrulama:** `npx tsc --noEmit` exit 0; eslint 0 error (yalnızca önceden
>   var olan uyarılar); `npm run build` OK. Commit `1060f5b` — push +
>   **CI ✅ yeşil**. İstemci tarafı: etki yeni APK/web'de. Canlı silme testi
>   yapılmadı (gerçek hesap gerektiriyor) — yeni APK'da manuel test önerilir.

> **10.11.2026 — M12 ÇÖZÜLDÜ (weatherService uydurma veri; 4.2.5):**
>
> - **Sorun:** `windDirection: 'KB'` sabitti (API'den gelen `wind_direction_10m`
>   derecesi isteniyor ama hiç kullanılmıyordu); tahmin yağış olasılığı ikona
>   göre uyduruluyordu (70/25/5); tahmin nemi `humidity + (idx%3)*2-2` formülüyle;
>   AQI isteği düşerse sahte "32 AQI İyi", UV eksikse sahte 6.5 üretiliyordu;
>   etikette "(Canlı Canlı API)" yazım hatası.
> - **Çözüm (`src/services/weatherService.ts`):**
>   - `degToCompassTR()`: 16 yönlü Türkçe pusula (K, KKD, KD... KB, KKB) —
>     gerçek dereceden hesap; veri yoksa '—'.
>   - Open-Meteo daily isteğine `precipitation_probability_max` ve
>     `relative_humidity_2m_mean` eklendi (önce canlı API çağrısıyla
>     desteklendikleri doğrulandı — kullanıcı `!` ile çalıştırdı).
>   - `pop` ve tahmin `humidity` artık gerçek API değerleri.
>   - `aqi`/`uvIndex` uydurma varsayılan yerine `null` → dürüst "Veri Yok".
>     (AQI ayrı bir istek olduğundan ana yanıttan bağımsız düşebilir —
>     gerçek bir senaryo.)
>   - Etiket: "(Open-Meteo canlı veri)".
> - **`src/types.ts`:** `uvIndex`/`aqi` → `number | null`.
> - **`src/components/HomeView.tsx`:** 4 kullanım yeri null-güvenli
>   (rozet 495/504, detay kartları 1855-1907; bar genişlikleri null'da 0).
> - **Bilinen sınır:** ana yanıttaki sıcaklık/nem `?? 24/40` varsayılanları
>   kaldırılmadı (yanıt hep tam gelir, pratikte tetiklenmez); ana istek tamamen
>   düşerse sessizce `VAN_WEATHER` mock'una dönülüyor — bu 5.1.3 mimari deseni,
>   ayrı bir iş olarak değerlendirilebilir.
> - **Doğrulama:** `npx tsc --noEmit` exit 0; `npx eslint src` 0 error /
>   79 warning (değişiklik yok); `npm run build` OK. Commit `e210a85` — push +
>   **CI ✅ yeşil**. İstemci tarafı: etki yeni APK/web'de.

> **10.11.2026 — M11 ÇÖZÜLDÜ (markalaşma; 4.4'ün son açık maddesi):**
>
> - **`package.json`:** ad `react-example` → `van-rehberim`, version `0.0.0` →
>   `1.0.0`, Türkçe `description` eklendi.
> - **`index.html`:** `lang="en"` → `lang="tr"`; başlık "My Google AI Studio
>   App" → **"Van Rehberim"**; Türkçe `meta description` + `theme-color`
>   (`#0f172a`) eklendi.
> - **`README.md`:** AI Studio şablonu tamamen değiştirildi — gerçek proje
>   README'si (özellikler, teknoloji tablosu, geliştirme komutları, Android
>   akışı, dağıtım bağlantıları).
> - **Doğrulama:** `npx tsc --noEmit` exit 0; `npm run build` OK — build
>   başlığı artık `van-rehberim@1.0.0`, index.html 0,81 kB (meta etiketleriyle).
> - **Commit:** `4e60ea4` (3 dosya, +47/−18) — push edildi, **CI ✅ yeşil**,
>   **deploy ✅ `live`** (Render API'den doğrulandı, 10.11).
> - **Not:** başlık/lang değişikliği web'de ve YENİ APK'da görünür; mevcut
>   kurulu APK'da eski başlık var (M9 notuyla aynı durum).

> **10.11.2026 — M10 ÇÖZÜLDÜ (kök dizin temizliği; 4.4 + 4.3'ün bir kısmı):**
>
> - **Önce yedek alındı:** `Desktop/van-rehberim-YEDEK-2026-11-09.tar.gz`
>   (66 MB; .git dahil; node_modules, dist, repo içi eski tar.gz'ler ve
>   Android build çıktıları hariç — önceki yedeklerle aynı model).
> - **`git rm` ile silinen 29 dosya** (hepsi git geçmişinden geri getirilebilir):
>   - Scrap dump'ları: `bus-check.html`, `taziyeler.html`, `temp_taziye.html`,
>     `van_bel.html`
>   - Debug/ürün olmayan çıktılar: `debug_urls.json`, `debug_urls2.json`,
>     `git_diff_components.txt`, `git_log_output.txt`, `gofile_link.txt`,
>     `lint_full.txt`, `npm_audit.json`, `out.txt`, `temp_output.txt`,
>     `temp_text.txt`, `theme_issues.txt`
>   - Geçici testler: `scraper-test.js`, `test-taziye.js`, `test_native.cjs`,
>     `test_rss.js`, `test_rss2.js`, `test_rss3.js`, `test_server_startup.js`
>   - AI Studio kalıntıları: `firebase-applet-config.json` (çift proje sorunu
>     4.3 çözüldü — gerçek config zaten src/lib/firebase.ts'te hardcoded),
>     `firebase-blueprint.json`, `metadata.json`
>   - Büyük görseller: `cleaned_icon.png` (751 KB), `van_kedisi.jpg` (1,4 MB)
>   - Çift lock: `bun.lock` (CI `npm ci`, Render `npm install` — npm tek lock)
>   - Diğer: `upload.js` (debug APK'yı gofile'a yükleyen geçici araç),
>     `.agent/fixCards.cjs`
> - **`git mv` ile `scripts/` klasörüne taşınan 10 ikon scripti:**
>   combine, crop, extract, find_icon, find_issues, force_icons, transparent
>   (.cjs), install_android_icons.py, prepare_icon.js, process_logo.py
>   (jimp bağımlılığı package.json'de duruyor — bu scriptler kullanıyor).
> - **Diskte taşınanlar (untracked, silinmedi):** `van-rehberim-guncel.apk`
>   (18 MB) + 3 eski yedek tar.gz → `Desktop/van-rehberim-arsiv/` klasörü.
> - **`tsconfig.json`:** include listesindeki `test_server_startup.js` çıkarıldı
>   (dosya silindi).
> - **Referans kontrolü:** src/, package.json script'leri ve CI'da silinen
>   dosyalara HİÇ referans yok (grep ile doğrulandı).
> - **Doğrulama:** `npx tsc --noEmit` exit 0; `npm run build` OK; boot
>   smoke-test EXIT 124 + "Server running" (kullanıcı `!` ile çalıştırdı).
>   **Yan kazanç:** CSS bundle 110,50 → 109,74 kB düştü — Tailwind 4 kök
>   dizindeki tüm dosyaları class taramasından geçiriyordu; çöpteki
>   class-benzeri metinler CSS'e sızıyordu.
> - **Commit:** `f541f84` (41 dosya, +1/−9.535 satır) — push edildi.
>   **CI ✅ yeşil** (check-runs: `build` success, 10.11 doğrulandı).
>   **Deploy ✅ `live`** (Render API'den doğrulandı, 10.11). Canlı endpoint
>   kontrolü yapılamadı (sınıflandırıcı) — kritik değil: M10 sunucu kodunu
>   değiştirmedi, boot/build lokalde doğrulandı.
> - **Kalan hijyen işi (ileri):** `clean` script'i `rm -rf` → Windows'ta
>   çalışmıyor (4.2.10'da kayıtlı).

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
5. ~~**Scraping ToS riski:** MGM / Diyanet / doviz.com / Eczacı Odası / van.bel.tr
   sahte User-Agent ile taranıyor; regex tabanlı parsing kırılgan~~
   **✅ 11.11.2026 hafifletildi (M18)** — tüm scraped kaynaklarda önbellek +
   bayat-fallback; kaynak başına istek üst sınırı düştü. Kalan risk (resmî API
   sözleşmesi yok, sahte UA, kırılgan regex) ürün kararı olarak ertelendi.

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
5. ~~**weatherService uydurma veri:** `windDirection: 'KB'` sabit; `pop` ve `humidity`
   uydurma formüllerle hesaplanıyor~~ **✅ 10.11.2026 çözüldü (M12)** — rüzgar yönü
   gerçek dereceden pusulaya, pop/nem gerçek API değerlerinden, AQI/UV null +
   "Veri Yok" (ayrıntı Bölüm 3'te).
6. ~~**AuthContext sorunları:** `fontLoading()` ölü kod; e-posta girişi `throw` ile kapalı
   ama UI metinleri hâlâ "e-posta ile..." diyor; Firebase oturumu yoksa localStorage'dan
   doğrulamasız oturum restore ediliyor; logout hard reload (`window.location.href = '/'`)~~
   **✅ 10.11.2026 çözüldü (M14)** — ölü kod, doğrulamasız restore ve hard reload kaldırıldı;
   UI metinleri dürüstleştirildi (ayrıntı Bölüm 3'te).
7. ~~**Taziye (vefat) özelliği yarım:** tip (`DeathNotice`), ayar anahtarı (`obituaryEnabled`)
   ve UI var; backend endpoint'i ve bildirim akışı yok~~ **✅ 11.11.2026 çözüldü (M16)** —
   kullanıcı kararıyla yarım özellik tamamen kaldırıldı (ölü kod + politika vaatleri).
8. ~~**Namaz vakitleri çift kaynak:** istemci Aladhan API (method 13), sunucu Diyanet
   scraping — aynı özellik için iki ayrı kaynak, değerler sapabilir~~
   **✅ 11.11.2026 çözüldü (M15)** — tek kaynak: sunucudaki Diyanet endpoint'i
   (1 saat önbellek + bayat-fallback); istemci Aladhan'ı bıraktı (ayrıntı Bölüm 3'te).
9. ~~**Hesap silme eksik (KVKK):** `deleteUser` yalnızca Auth kaydını siler; Firestore'daki
   `users` dokümanı ve kullanıcının ilanları silinmiyor~~ **✅ 10.11.2026 çözüldü (M13)** —
   `deleteAllUserData()` Auth silmeden önce profil + favoriler + kendi ilanlarını temizler
   (ayrıntı Bölüm 3'te).
10. ~~**Diğer:** `removeAllListeners()` tüm dinleyicileri temizliyor; Vite config'te
    `vendor-lodash` chunk'ı (lodash hiç yok); splash ekranı 2 sn yapay gecikme;
    `clean` script'i `rm -rf` → Windows'ta çalışmaz; haber bildirimleri gün içinde
    RASTGELE 5 saate planlanıyor (gerçek yeni haber kontrolü yok)~~
    **✅ 11.11.2026 çözüldü (M17)** — beş düzeltme tek batch'te (ayrıntı Bölüm 3'te).

### 4.3 🏗️ Mimari / Kod Kalitesi

- **Monolit bileşenler:** ~~HomeView 2.167 satır~~, JobsView 1.033, SettingsView 995 —
  bakımı zor, alt bileşenlere bölünmeli.
  **✅ 12.11.2026 HomeView çözüldü (M25)** — 2167 → 960 satır; hava durumu/eczane/
  ezan/döviz/otobüs bölümleri `src/components/home/`'a taşındı (5 dosya, uniform
  prop'lar). JobsView + SettingsView bölünmesi ayrı görev olarak kaldı.
- ~~**`server.ts` şişkin:** ~1.570 satırın ~700 satırı inline otobüs fallback verisi
  (mockData.ts ile tekrar eden veri).~~
  **✅ 11.11.2026 çözüldü (M20)** — 612 satırlık fallback verisi
  `server/busFallbackData.ts`'e taşındı; server.ts 1694 → 1082 satır.
- ~~**20+ yerde `any`** (firebase.ts fonksiyonları, bileşen mapping'leri, catch blokları).~~
  **✅ 11.11.2026 çözüldü (M21)** — 29 explicit any'nin tamamı temizlendi
  (no-explicit-any 29 → 0); Firestore sınırı tipli; ölü firestoreFetchData.ts
  silindi. Catch değişkenleri strict kapalıyken implicit any olarak kaldı —
  `unknown` işleyişi 16/17 (strict) maddesinde.
- ~~**Tutarsız Firestore şeması:** Türkçe/İngilizce alan karışımı (`isletmeAdi`/`storeName`/
  `name`) → bileşenlerde 5-6 alternatiflı `??` zincirleri ("KORUMA KALKANI" yorumları).~~
  **✅ 12.11.2026 çözüldü (M26)** — ham doküman tipleri + bileşen okumaları
  canonical'e indirildi (server/listings.ts whitelists'leri tek kaynak);
  `mapDealDoc` saf fonksiyonu + 4 test. Koleksiyonlar boş çıktığı için veri
  taşıma gerekmedi (denetim betiği repoda: `scripts/firestore-schema-audit.ts`).
- ~~**Ödeme/hata akışlarında `alert()`** (JobsView, DealsView, HomeView, SettingsView).~~
  **✅ 11.11.2026 çözüldü (M19)** — 10 alert'in tamamı uygulama içi bildirimlere
  çevrildi; sahte "kopyalandı" iddiası gerçek clipboard kopyalaması oldu.
- ~~**Test altyapısı YOK:** Vitest/Jest yok; kökte geçici `test_*.js` scriptleri duruyor.~~
  **✅ 12.11.2026 çözüldü (M24)** — Vitest kuruldu; 5 dosya / 29 test CI'da
  koşuyor (`npm test`). RTL bileşen testleri bilinçli olarak 14/17 sonrasına
  ertelendi (monolit bileşenler). Kökteki `test_*.js` artıkları M10'da
  zaten temizlenmişti.
- **İki paket yöneticisi:** ~~`bun.lock` VE `package-lock.json` birlikte~~
  **✅ 10.11.2026 çözüldü (M10)** — `bun.lock` silindi; tek lock `package-lock.json`.
- ~~**`tsconfig.json`:** `strict` yok, `allowJs: true` → tip güvenliği zayıf.~~
  **✅ 12.11.2026 çözüldü (M27)** — `strict: true` + `@types/react@19` kuruldu
  (React kodu ilk kez gerçekten tip denetleniyor); 31 hata düzeltildi;
  `allowJs` kaldırıldı.
- **Çift Firebase projesi:** ~~`src/lib/firebase.ts` (`vanrehberim-f181b`) vs
  `firebase-applet-config.json` (`emergent-gift-7x4wp`, AI Studio kalıntısı)~~
  **✅ 10.11.2026 çözüldü (M10)** — `firebase-applet-config.json` silindi;
  tek config `src/lib/firebase.ts`'te.
- ~~**`experimentalForceLongPolling: true`** kalmış (performans kısıtı); servis fetch
  timeout'ları 60 sn (mobil için çok uzun).~~
  **✅ 12.11.2026 çözüldü (M22)** — timeout'lar 60 → 15 sn; long-polling flag'i
  bilinçli karar olarak BELGELENDİ (CapacitorHttp açık → WebChannel Android'de
  çalışmaz; flag kaldırılmamalı, CapacitorHttp kapatılırsa kaldırılmalı).
- ~~**State yönetimi yok:** localStorage + özel window event (`van_saved_deals_changed`)
  ile bileşenler arası senkronizasyon.~~
  **✅ 13.11.2026 çözüldü (M28)** — favori state'i SavedItemsContext'e
  taşındı; `van_saved_deals_changed` event'i ve dağınık `storage`
  dinleyicileri kaldırıldı; localStorage kalıcılık katmanı olarak kaldı
  (anahtarlar aynı — kullanıcı verisi korunur).

### 4.4 📁 Proje Hijyeni

- ~~**Kök dizinde ~30 gereksiz dosya**~~ **✅ 10.11.2026 çözüldü (M10)** — 29 dosya
  silindi, 10 script `scripts/`'e taşındı, APK + yedekler `Desktop/van-rehberim-arsiv/`'e
  alındı (ayrıntı Bölüm 3'te). Yan kazanç: CSS bundle 110,5 → 109,7 kB.
- ~~**Markalaşma eksik:** `package.json` adı `react-example`; `index.html` başlığı
  "My Google AI Studio App" ve `lang="en"`; README AI Studio şablonu~~
  **✅ 10.11.2026 çözüldü (M11)** — `van-rehberim@1.0.0`, başlık "Van Rehberim",
  `lang="tr"`, gerçek README (ayrıntı Bölüm 3'te).
- ~~**CI anti-pattern'leri:** `npm audit fix` build sırasında lock dosyasını değiştirebilir;
  CI'dan repoya commit atan "cleanup" adımı git geçmişini kirletir.~~
  **✅ 12.11.2026 çözüldü (M23)** — cleanup adımı silindi (commit zaten çöpe
  gidiyordu); yerine sunucu boot smoke-test eklendi; `npm audit fix`
  scriptlerde zaten yoktu. CI artık: npm ci → lint → build → boot test →
  artifact.

---

## 5. MİMARİ KARARLAR

### 5.1 Alınmış Kararlar (mevcut durum — as-is)

1. **Monolitik bileşen mimarisi:** Her sekme tek büyük dosya (JobsView, DealsView,
   SettingsView, NewsView, PlacesView); HomeView M25'te bölündü (5 bölüm
   `src/components/home/` + ~960 satırlık kabuk). Router yok — sekme durumu
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
10. **CI:** GitHub Actions — npm ci → lint → build → server boot smoke-test
    → artifact upload (cleanup-commit adımı M23'te kaldırıldı).

### 5.2 Önerilen Kararlar (henüz alınmadı — to-be)

1. Ödeme doğrulaması RevenueCat **webhook + backend**'e taşınmalı; ilan yazımı yalnızca
   backend'den yapılmalı (entitlement kontrolü ile).
2. Firestore kuralları **owner-based + alan doğrulamalı** olmalı (`userId` zorunlu alan).
3. Scraping yerine mümkünse resmi API'ler; zorunluysa **sunucu tarafı önbellek (5–10 dk)**
   ve rate-limit eklenmeli.
4. ~~HomeView alt bileşenlere bölünmeli; ortak veri akışı için Context/Zustand benzeri
   state yönetimi alınmalı.~~
   **✅ ÇÖZÜLDÜ** — HomeView bölünmesi M25 (12.11); favori state'i Context'e
   taşındı M28'de (13.11, `6a2790c`).
5. ~~Test altyapısı kurulmalı: **Vitest + React Testing Library** (öncelik: purchaseService,
   prayerService hesaplamaları, firestore yazım fonksiyonları, DealsView süre mantığı).~~
   **✅ 12.11.2026 KISMEN ÇÖZÜLDÜ (M24)** — Vitest + öncelik hedeflerin tamamı
   test ediliyor (29 test, CI'da); RTL bileşen testleri 14/17 monolit
   bölünmesi sonrasına kaldı.
6. ~~Tek ESLint flat config (`@typescript-eslint/parser` ile) + `tsconfig`'e `strict: true`.~~
   **✅ ÇÖZÜLDÜ** — ESLint flat config M4'te (06.11); `strict: true` M27'de
   (12.11, `7156b76`; @types/react@19 ile birlikte).
7. Firebase config env değişkenlerine taşınmalı (çift proje kalıntısı temizlenmeli).
8. ~~Firestore şeması tek dilli (İngilizce) normalize edilmeli; `durationDays`/`userId`
   gibi kritik alanlar yazımda doğrulanmalı.~~
   **✅ 12.11.2026 KISMEN ÇÖZÜLDÜ (M26)** — okuma tarafı canonical'e indi
   (RawDealDoc/RawTaxiDoc + saf eşleme); yazma tarafı zaten whitelist'liydi
   (server/listings.ts). Alan adları Türkçe kaldı (canonical bunlar);
   İngilizce'ye çevirme koleksiyonlar dolmadan önce gereksiz risk.

---

## 6. SONRAKİ ADIMLAR — ÖNCELİKLİ YOL HARİTASI

| # | Öncelik | Görev | Kabul Kriteri |
|---|---|---|---|
| 0 | 🔴 Acil | ~~M0: `HomeViewProps`'a `onNavigateToJobs` ekle~~ **✅ 04.11.2026 çözüldü + tsc doğrulandı** | `npx tsc --noEmit` exit 0 ✅ |
| 1 | 🔴 Acil | ~~Keystore + APK git geçmişinden kaldır~~ **✅ 04.11.2026 çözüldü** (yedek → filter-branch → force push; doğrulandı). Alt-görev: `keystore.properties` yerelde oluştur | `git ls-files` içinde keystore/apk yok ✅ |
| 2 | 🔴 Acil | ~~Firestore kurallarını sıkılaştır~~ **✅ 05.11.2026 çözüldü** (owner-based; tsc doğrulandı; commit edildi). Kalan: Firebase'e deploy + canlı test | Kurallar canlıda aktif; yabancı kullanıcı silme denemesi reddediliyor |
| 3 | 🔴 Acil | ~~DealsView süre/fiyat hatasını düzelt~~ **✅ 06.11.2026 çözüldü** (JobsView modeli; tsc doğrulandı). Canlı RevenueCat satın alma testi önerilir | Seçilen gün = satın alınan ürün = Firestore'a yazılan süre ✅ (kod düzeyinde) |
| 4 | 🟠 Yüksek | ~~ESLint'i düzelt (tek flat config + `@typescript-eslint/parser`), `.eslintrc.json`'ı sil~~ **✅ 06.11.2026 çözüldü** (`npm run lint` exit 0, 0 error / 87 warn). Kalan: push sonrası CI main'de yeşil kontrolü | `npm run lint` exit 0 ✅ |
| 5 | 🟠 Yüksek | ~~RevenueCat backend entitlement doğrulaması; ilan yazımını backend'e taşı~~ **⏸️ 07.11 DONDURULDU → 🔓 15.11 AÇILDI (karar: RevenueCat)** — kod tamam+push'lı (`d548ef6`); 16.11'de tamamlanacak: Render'a `REVENUECAT_SECRET_API_KEY` + Play Console yayını (versionCode 2, versionName 1.1, keystore.properties, in-app ürünler Aktif) | Ödeme yapılmadan ilan yayımlanamıyor; ilan paketlerinde tutar görünüyor (Play fiyatı) |
| 5b | 🟠 Yüksek | ~~**YENİ (16.11):** Onboarding ekranı — uygulama ilk açıldığında (cihazda ilk kez) tanıtım/rehber gösterimi (kullanıcı isteği)~~ **✅ 17.11.2026 çözüldü (M36)** — 5 slaytlık tam ekran tanıtım; `van_onboarding_done` localStorage işareti; Android geri tuşu slaytlar arasında gezinir | İlk açılışta onboarding görünüyor, tamamlanınca bir daha çıkmıyor (localStorage işareti) ✅ (kod düzeyinde; telefonda test yeni APK'da) |
| 5c | 🟢 İleri | **Bilinen ufak sorun (M35):** Render free-tier soğuk başlangıçta ilk hesap silme denemesi 20 sn zaman aşımına düşüyor (tekrar deneyince çalışıyor). İstenirse: sunucu çağrısı adımı zaman aşımını artır (ör. 60 sn) ya da silme öncesi sessiz health-check ile servisi uyandır | İlk denemede de silme tamamlanıyor |
| 6 | 🟠 Yüksek | ~~Haber sistemi: 5 sn polling → 60+ sn; sunucuda 5–10 dk cache; ölü RSS'leri kaldır; uydurma fallback'i dürüst hata ile değiştir~~ **✅ 07.11 çözüldü (M6) + 08.11 CANLIDA (M7 ile)** | Kaynak etiketleri gerçek; sunucu istek/s sayısı düştü ✅ (canlıda doğrulandı) |
| 6b | 🟠 Yüksek | ~~`/api/currencies`'e önbellek (HomeView 60 sn'de bir doviz.com scrape tetikliyor)~~ **✅ 09.11 çözüldü (M8) + CANLIDA** (`b3acdd8`: 10 dk önbellek + bayat-fallback + 10 sn timeout) | Canlı tekrar çağrılar aynı `lastUpdated` ile önbellekten dönüyor ✅ |
| 7 | 🟡 Orta | ~~AndroidManifest: `usesCleartextTraffic` ve `allowBackup` kapat~~ **✅ 09.11 çözüldü (M9)** (`5542427`, canlıda) | Manifest temiz ✅ (kod düzeyinde; etki yeni APK'da) |
| 8 | 🟡 Orta | ~~Kök temizliği: scriptler `scripts/` klasörüne, dump/debug dosyaları sil; tek lock dosyası kal~~ **✅ 10.11 çözüldü (M10)** (`f541f84`) | Kökte yalnız üretim dosyaları ✅ |
| 9 | 🟡 Orta | ~~Markalaşma: `package.json` adı, `index.html` başlığı + `lang="tr"`, gerçek README~~ **✅ 10.11 çözüldü (M11)** (`4e60ea4`) | Başlık "Van Rehberim" ✅ |
| 10 | 🟢 İleri | ~~HomeView'u alt bileşenlere böl~~ **✅ 12.11 çözüldü (M25)** (`46eaf9b`; 5 bölüm `src/components/home/`); ~~Firestore şemasını normalize et~~ **✅ 12.11 çözüldü (M26)** (`135b131`; koleksiyonlar boş çıktı → kod tarafında çözüldü); ~~Vitest testleri ekle~~ **✅ M24** | Testler CI'da koşuyor ✅ |

**Önerilen çalışma düzeni:** Her düzeltme ayrı commit + ayrı oturum; her oturum sonunda
bu dosyanın Bölüm 2/4/6'sı güncellenmeli (çözülenler Bölüm 3'e taşınmalı).

---

## 7. DOĞRULAMA ORTAMI VE KOMUTLAR

| Komut | Sonuç (15.11.2026, oturum #13 — M35 sonrası) |
|---|---|
| `npx tsc --noEmit` | ✅ exit 0 — **strict modda** temiz (M27: strict + @types/react@19) |
| `npx eslint src` | ✅ exit 0 — 0 error, **37 warning** (M28 sonrası; M24'te 48 idi) |
| `npm test` | ✅ 61/61 geçti (Vitest; 9 dosya, CI'da da koşuyor — M35: 5 istemci KVKK testi `server/account.test.ts`'te 6 teste taşındı) |
| `npm run dev` | `tsx server.ts` — dev sunucusu (Vite middleware, port 3000/PORT) |
| `npm run build` | ✅ `vite build` + `esbuild server.ts → dist/server.cjs` |
| `npm start` | `node dist/server.cjs` (prod) |
| `npm run lint` | ✅ exit 0 — `tsc --noEmit && eslint src` (M4 sonrası) |

**Ortam:** Windows (PowerShell), çalışma dizini:
`c:\Users\FURKAN\Desktop\van-rehberim - Kopya`

**Ortama özgü notlar:**
- `clean` script'i (`rm -rf dist server.js`) Windows/PowerShell'da çalışmaz.
- Git durumu (17.11.2026, oturum #15 kapanışı): dal ucu `fab6a62` (M5
  yarım kalan: versionCode 2/1.1; **CI ✅**), önceki `877b7ab` (M36:
  onboarding ekranı; **CI ✅**), `034d8ad` (MEMORY M34+M35), `c6200c8` (M35:
  hesap silme sunucuya taşındı — Admin SDK; **CI ✅ + Render `live`**,
  telefonda doğrulandı), önceki `9b21de1` (M34: silme akışına adım adım log
  + 20 sn zaman aşımı + native deleteUser denemesi; CI ✅), `66a7981`
  (MEMORY M33), `3631119` (M33: otobüs anlık görüntü fallback'i — 87 gerçek
  hat; **CI ✅ + Render `live`**), önceki `8591910` (M33-1: yeni site
  ayrıştırıcı; CI ✅ + Render `live`), `d0284fc` (MEMORY M32), `c4bd63e`
  (M32: geri tuşu +
  ölü kod temizliği + deps; **CI ✅ + Render `live`**), önceki `6059374`
  (MEMORY M31), `6885559` (M31; **CI ✅ + Render `live`**), önceki
  `38e9556` (MEMORY M30), `6d6cf65` (M30; CI ✅ + Render `live`), `d7fc81d`
  (MEMORY M29), `e8e4abd` (M29; CI ✅ + Render `live`), `6a2790c` (M28: state
  management — 17/17 SON SORUN), önceki `ff65be7` (MEMORY M27), `7156b76`
  (M27: tsconfig strict + @types/react; CI ✅ yeşil), önceki `00d2e21`
  (MEMORY M26), `135b131` (M26: Firestore şema normalizasyonu; CI ✅ yeşil),
  önceki `46eaf9b` (M25: HomeView bölünmesi; CI ✅ yeşil), önceki
  `56ac6b5` (MEMORY M24), `6540bb3` (M24: Vitest
  altyapısı; CI ✅ yeşil — test adımı ilk kez koştu), önceki `98d3e66`
  (MEMORY M23), `ccfef32` (M23: CI cleanup + boot test; CI ✅ yeşil),
  `3be2bce` (MEMORY M22; CI ✅ yeşil — M22
  kodunu dolaylı doğruladı), `2620d2b` (M22: timeout'lar + long-polling;
  run'ı Actions kuyruğunda takıldı, kodu 3be2bce ile doğrulandı),
  `b7aebc2` (MEMORY M21), `a24c93d` (M21: any tip borcu; CI ✅ yeşil),
  `b82f2ac` (MEMORY M20), `1b49a38` (M20:
  server.ts şişkinliği; CI ✅ yeşil + CANLIDA), `22006de` (MEMORY M19),
  `acc21ae` (M19: alert → bildirimler; CI ✅ yeşil), `328a03f` (MEMORY M18),
  `130c114` (M18: scraping önbellekleri; CI ✅ yeşil + CANLIDA),
  `d637daa` (MEMORY M17), `2410c94` (M17: küçük mantık kümesi; CI ✅ yeşil), `3575efe` (MEMORY M16), `10b54ec`
  (M16: taziye kaldırma; CI ✅ yeşil), `ca6651f` (MEMORY M15), `4ab347f` (M15 ek:
  Gregorian tarih), `cbf355f` (M15: namaz tek kaynak; CANLIDA + CI ✅ yeşil),
  `0c93429` (MEMORY M14), `1607a85` (M14: AuthContext; CI ✅ yeşil),
  `0e67302` (MEMORY M13), `1060f5b` (M13: KVKK;
  CI ✅ yeşil), `e210a85` (M12: weatherService), `738399f`
  (MEMORY M11), `4e60ea4` (M11), `67c0b1d`
  (MEMORY M10),
  `f541f84` (M10), `e3f88c4` (MEMORY M9), `5542427` (M9),
  `d70a0c3` (MEMORY M8), `b3acdd8` (M8), `6ca3a1a` (M7), `78f4923` (M6),
  `bf8bab9` (CI düzeltmesi), `d548ef6` (M5), `713632a` (MEMORY), `a3f46e9`
  (M4), `daa6f3b` (M3), `7541456` (M2), `522e980` (M0+M1). **Hepsi
  origin/main'de** (push doğrulandı; CI `6ca3a1a`, `b3acdd8`, `5542427`,
  `f541f84`, `4e60ea4` için ✅ yeşil; `gh` CLI bu makinede kurulu DEĞİL —
  CI kontrolü GitHub API'den `/commits/{sha}/check-runs` ile yapılıyor).
  Keystore diskte + gitignore'lı.
- **Yedekler (10.11.2026 itibarıyla):** `Desktop/van-rehberim-YEDEK-2026-11-09.tar.gz`
  (66 MB, M10 öncesi — en güncel) + eski yedekler (04/05/06.11) ve
  `van-rehberim-guncel.apk` artık `Desktop/van-rehberim-arsiv/` klasöründe
  (repo kökünden taşındı). 04.11 yedeği (keystore'lu eski geçmiş) hâlâ tek
  kurtarma noktasıdır, saklanmalı. Geçmiş yeniden yazıldığı için 04.11 öncesi
  eski hash'ler geçersiz.
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
