import 'dotenv/config';
import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import cors from 'cors';
// Aşama 2 (ölçek hazırlığı): gzip sıkıştırma + IP rate limiting
import compression from 'compression';
import rateLimit from 'express-rate-limit';
// DİKKAT: Native ESM ("type": "module") uzantısız göreli import'u çözemez —
// tam .ts uzantısı şart (ts-node, tsx, esbuild ve tsc/allowImportingTsExtensions
// hepsi bu formu kabul eder).
import { listingsRouter } from './server/listings.ts';
// M35: KVKK hesap silme — Firestore + Auth kaydı Admin SDK ile sunucuda silinir
import { accountRouter } from './server/account.ts';
// Aşama 2 (ölçek): /api/v1 ortak veri okuma katmanı — Firestore okuma kotası
// RAM önbelleğiyle korunur (server/publicData.ts + server/cacheService.ts)
import { publicDataRouter } from './server/publicData.ts';
// M20: ~612 satırlık inline otobüs fallback verisi ayrı modüle taşındı.
// M33: fallback artık npm run scrape:bus ile üretilen GERÇEK van.bel.tr
// anlık görüntüsü; canlı kazıyıcı server/busScraper.ts'te.
// M38: anlık görüntü src/data/busSnapshot.ts'e taşındı — istemci
// (busService) Render uykudayken aynı gerçek veriye düşüyor.
import { BUS_SNAPSHOT_ROUTES, BUS_SNAPSHOT_LAST_UPDATED } from './src/data/busSnapshot.ts';
import { fetchLiveBusRoutes } from './server/busScraper.ts';
// TAM TARAMA (22.11): API yüklerinin `any[]` yerine gerçek tiplerle
// tanımlanması — istemciyle aynı sözleşme (type-only import, bundle'a girmez).
import type { BusRouteData } from './src/data/busSnapshot.ts';
import type { Pharmacy, NewsItem } from './src/types.ts';
import type { CurrencyItem, TableItem } from './src/services/currencyService.ts';

const app = express();
// Render.com reverse proxy arkasında çalışıyoruz: express-rate-limit IP'yi
// X-Forwarded-For'dan doğru okusun (yanlış yapılandırmada v7 hata verir).
app.set('trust proxy', 1);
// Render.com'un dinamik portunu yakalamak için çok önemli!
const PORT = Number(process.env.PORT) || 3000;

// CORS Security Configuration (En sade ve hatasız hali)
const allowedOrigins = [
  'http://localhost:3000',
  'http://localhost:5173',
  'capacitor://localhost',
  'http://localhost',
  process.env.VITE_API_URL || 'https://van-rehberim-api.onrender.com'
];

app.use(cors({
  origin: allowedOrigins,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS']
}));

app.use(express.json());
// Aşama 2: yanıt gövdelerini gzip'le (ilan listelerinin JSON'u küçülür)
app.use(compression());

// Aşama 2: hafif sağlık kontrolü — Render/uptime izleyicileri için.
// Firestore'a DOKUNMAZ; yalnızca sürecin ayakta olduğunu bildirir.
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', uptime: process.uptime() });
});

// Aşama 2: /api/v1 okuma katmanı — IP başına dakikada 60 istek.
// Bilinçli kapsam: ücretli yazma yolları (/api/listings, /api/account)
// HARİÇ — onların daha sıkı uid tabanlı limiter'ları zaten var ve mobil
// operatör CGNAT'ında ödeme yapan kullanıcıyı IP limitiyle bloklamak
// istemiyoruz. limit, API_V1_RATE_LIMIT_PER_MINUTE env'i ile ayarlanabilir.
const apiV1RateLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: Number(process.env.API_V1_RATE_LIMIT_PER_MINUTE) || 60,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Çok fazla istek gönderildi. Lütfen kısa bir süre sonra tekrar deneyiniz.' },
});
app.use('/api/v1', apiV1RateLimiter, publicDataRouter);

// M5: Ücretli ilan yayınlama (Firebase ID token + RevenueCat entitlement
// doğrulaması; Firestore'a yalnızca Admin SDK ile yazılır).
app.use('/api/listings', listingsRouter);

// M35: KVKK hesap silme (ID token doğrulaması; Firestore + Auth Admin SDK ile).
app.use('/api/account', accountRouter);

// M30: timeout'lu fetch yardımcısı. Node fetch'in varsayılan zaman aşımı
// YOKTUR — kaynak asılı kalırsa (bağlantı açılır ama yanıt gelmez) await
// süresiz bekler ve route bloklanır. Bu yardımcı ms sonunda isteği iptal
// eder; abort bir rejection üretir, çağıran tarafın .catch/try-catch'i
// mevcut fallback akışına düşer.
const FETCH_TIMEOUT_MS = 15000;

function fetchWithTimeout(url: string, init: RequestInit = {}, ms: number = FETCH_TIMEOUT_MS): Promise<Response> {
  return fetch(url, { ...init, signal: AbortSignal.timeout(ms) });
}

// M31: `catch (error: any)` yerine tip güvenli mesaj çıkarıcı. `any` ile
// yakalanan değerin Error olduğunu varsaymak güvenli değil (AbortSignal,
// string throw vb.); details alanına undefined yazılmasın.
function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

// M41 (Cline denetimi): /api/weather MGM kazıyıcı bloğu KALDIRILDI —
// istemci (weatherService) aylardır doğrudan Open-Meteo'ya gidiyor, bu
// rottanın hiçbir tüketicisi yoktu (sunucu belleği + bakış açısı maliyeti).

// M18: Eczacı Odası sayfası 1 saat önbellek + 24 saat bayat-fallback —
// nöbet listesi günlük değişir; her istemci yenilemesi sayfayı scrape
// ediyordu (ToS/blok riski).
const PHARMACIES_CACHE_TTL_MS = 60 * 60 * 1000;
const PHARMACIES_STALE_MAX_MS = 24 * 60 * 60 * 1000;
interface PharmaciesApiPayload {
  success: boolean;
  dutyDate: string;
  rawTitle: string;
  count: number;
  vanCount: number;
  lastUpdated: string;
  source: string;
  pharmacies: Pharmacy[];
  stale?: boolean;
}
let pharmaciesCache: { payload: PharmaciesApiPayload; fetchedAt: number } | null = null;

// API ROUTE: Live Duty Pharmacies fetched directly from Van Eczacı Odası (https://www.vaneczaciodasi.org.tr/nobetci-eczaneler)
app.get('/api/pharmacies', async (_req, res) => {
  // Taze önbellek varsa doğrudan dön
  if (pharmaciesCache && Date.now() - pharmaciesCache.fetchedAt < PHARMACIES_CACHE_TTL_MS) {
    return res.json(pharmaciesCache.payload);
  }
  try {
    const response = await fetchWithTimeout('https://www.vaneczaciodasi.org.tr/nobetci-eczaneler', {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Referer': 'https://www.vaneczaciodasi.org.tr/'
      }
    });

    if (!response.ok) {
      throw new Error(`Van Eczacı Odası server responded with status ${response.status}`);
    }

    const html = await response.text();

    const titleMatch = html.match(/<h3 class=\"main-color\">([^<]+)<\/h3>/i);
    const rawDate = titleMatch ? titleMatch[1].trim() : "Van'da Bugün Nöbetçi Eczaneler";
    // Extract date e.g. "01 Ağustos 2026"
    const dutyDateMatch = rawDate.match(/([0-9]{1,2}\s+[A-ZÂİIĞÖŞÜa-zâığöşü]+\s+[0-9]{4})/);
    const dutyDate = dutyDateMatch ? dutyDateMatch[1] : 'Bugün';

    const VAN_DISTRICTS = [
      'İPEKYOLU', 'TUŞBA', 'EDREMİT', 'ERCİŞ', 'BAŞKALE',
      'ÖZALP', 'MURADİYE', 'GEVAŞ', 'GÜRPINAR', 'SARAY',
      'ÇALDIRAN', 'ÇATAK', 'BAHÇESARAY'
    ];

    const BITLIS_DISTRICTS = ['ADİLCEVAZ', 'AHLAT', 'GÜROYMAK', 'HİZAN', 'MUTKİ', 'TATVAN', 'MERKEZ'];
    const HAKKARI_DISTRICTS = ['YÜKSEKOVA', 'ŞEMDİNLİ', 'DERECİK', 'ÇUKURCA'];

    const blocks = html.split('class="col-md-12 nobetci"');
    const pharmacies: Pharmacy[] = [];

    for (let i = 1; i < blocks.length; i++) {
      const b = blocks[i];
      const nameMatch = b.match(/<h4[^>]*>\s*<strong>\s*([^<]+)<br\s*\/?>\s*<small>\s*([^<]+)<\/small>/i);
      const rawName = nameMatch ? nameMatch[1].trim() : '';
      const rawDistrict = nameMatch ? nameMatch[2].trim() : '';

      if (!rawName) continue;

      const phoneMatch = b.match(/href=\"tel:([0-9\s]+)\"/i);
      const phone = phoneMatch ? phoneMatch[1].trim() : '';

      const mapsMatch = b.match(/href=\"(https:\/\/maps\.google\.com\/[^\"]+)\"/i);
      const mapsUrl = mapsMatch ? mapsMatch[1] : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(rawName + ' ' + rawDistrict + ' Van')}`;

      let address = '';
      const addressMatch = b.match(/fa-home[^>]*><\/i>\s*([^<]+)/i);
      if (addressMatch) {
        address = addressMatch[1].trim();
      }

      const upperDist = rawDistrict.toLocaleUpperCase('tr-TR');
      let city = 'Van';
      if (VAN_DISTRICTS.includes(upperDist)) {
        city = 'Van';
      } else if (BITLIS_DISTRICTS.includes(upperDist)) {
        city = 'Bitlis';
      } else if (HAKKARI_DISTRICTS.includes(upperDist)) {
        city = 'Hakkari';
      }

      pharmacies.push({
        id: `live-pharmacy-${i}`,
        name: rawName,
        district: rawDistrict,
        city,
        address: address || `${rawDistrict}, Van`,
        // M31: telefon ayrıştırılamadıysa boş bırak — sabit bir numara
        // uydurmak yanlış eczaneye çağrı yönlendirir. İstemci telefon
        // yoksa ARA düğmesini gizler.
        phone,
        distance: 'Merkez',
        isOpen24h: true,
        dutyDate,
        mapsUrl,
        isLive: true,
      });
    }

    // Filter to prioritize Van pharmacies first
    const vanPharmacies = pharmacies.filter(p => p.city === 'Van');
    const otherPharmacies = pharmacies.filter(p => p.city !== 'Van');
    const sortedPharmacies = [...vanPharmacies, ...otherPharmacies];

    const nowStr = new Date().toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });

    const payload: PharmaciesApiPayload = {
      success: true,
      dutyDate,
      rawTitle: rawDate,
      count: sortedPharmacies.length,
      vanCount: vanPharmacies.length,
      lastUpdated: `Bugün ${nowStr} (vaneczaciodasi.org.tr)`,
      source: 'TEB 38. Bölge Van Eczacı Odası',
      pharmacies: sortedPharmacies,
    };
    pharmaciesCache = { payload, fetchedAt: Date.now() };
    res.json(payload);
  } catch (error: unknown) {
    console.error('Error scraping Van Eczacı Odası duty pharmacies:', error);
    // M18: bayat (≤24 saat) önbellekten devam
    if (pharmaciesCache && Date.now() - pharmaciesCache.fetchedAt < PHARMACIES_STALE_MAX_MS) {
      return res.json({ ...pharmaciesCache.payload, stale: true, source: `${pharmaciesCache.payload.source} — geçici olarak önbellekten` });
    }
    res.status(500).json({
      success: false,
      error: 'Van Eczacı Odası nöbetçi eczane verisi çekilemedi',
      details: errorMessage(error),
    });
  }
});

// M15: Namaz vakitleri TEK KAYNAK — istemci Aladhan'ı bırakıp bu endpoint'i
// kullanıyor (değer sapması + çift bakım sorunu ortadan kalktı). Vakitler
// günlük değiştiği için 1 saat önbellek + 24 saat bayat-fallback yeterli.
const PRAYER_CACHE_TTL_MS = 60 * 60 * 1000;
const PRAYER_STALE_MAX_MS = 24 * 60 * 60 * 1000;
interface DiyanetTimesCache {
  times: { imsak: string; sabah: string; ogle: string; ikindi: string; aksam: string; yatsi: string };
  dateStr: string;
  fetchedAt: number;
}
let prayerCache: DiyanetTimesCache | null = null;

// Diyanet sayfasından vakitleri çeker (önbellekli). Bayat önbellekten
// dönerken `stale: true` işaretlenir.
async function fetchDiyanetTimes(): Promise<DiyanetTimesCache & { stale: boolean }> {
  const now = Date.now();
  if (prayerCache && now - prayerCache.fetchedAt < PRAYER_CACHE_TTL_MS) {
    return { ...prayerCache, stale: false };
  }

  try {
    const diyanetUrl = 'https://namazvakitleri.diyanet.gov.tr/tr-TR/9930/van-icin-namaz-vakti';
    const response = await fetchWithTimeout(diyanetUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'tr-TR,tr;q=0.9,en-US;q=0.8,en;q=0.7',
      },
    });

    if (!response.ok) {
      throw new Error(`Diyanet server status ${response.status}`);
    }

    const html = await response.text();

    const unescapeHtml = (str: string) => str
      .replace(/&#39;/g, "'")
      .replace(/&#231;/g, 'ç')
      .replace(/&#214;/g, 'Ö')
      .replace(/&#246;/g, 'ö')
      .replace(/&#252;/g, 'ü')
      .replace(/&#199;/g, 'Ç')
      .replace(/&quot;/g, '"');

    const cleanHtml = unescapeHtml(html);

    const imsakMatch = cleanHtml.match(/İmsak\s+([0-9]{2}:[0-9]{2})/i);
    const gunesMatch = cleanHtml.match(/Güneş\s+([0-9]{2}:[0-9]{2})/i);
    const ogleMatch = cleanHtml.match(/Öğle\s+([0-9]{2}:[0-9]{2})/i);
    const ikindiMatch = cleanHtml.match(/İkindi\s+([0-9]{2}:[0-9]{2})/i);
    const aksamMatch = cleanHtml.match(/Akşam\s+([0-9]{2}:[0-9]{2})/i);
    const yatsiMatch = cleanHtml.match(/Yatsı\s+([0-9]{2}:[0-9]{2})/i);

    // M31: sabit "fallback" vakitler (03:23 vb.) kaldırıldı — sayfa yapısı
    // değişirse yanlış vakitler "canlı Diyanet verisi" gibi servis ediliyordu.
    // Eksik ayrıştırma artık hata fırlatır; bayat önbellek / dürüst 500 yolu
    // devreye girer.
    if (!imsakMatch || !gunesMatch || !ogleMatch || !ikindiMatch || !aksamMatch || !yatsiMatch) {
      throw new Error('Diyanet sayfa yapısı değişti: namaz vakitleri eksik ayrıştırıldı');
    }

    const times = {
      imsak: imsakMatch[1],
      sabah: gunesMatch[1], // Güneş
      ogle: ogleMatch[1],
      ikindi: ikindiMatch[1],
      aksam: aksamMatch[1],
      yatsi: yatsiMatch[1],
    };

    // Extract Date header if present
    const dateMatch = cleanHtml.match(/([0-9]{1,2}\s+[A-ZÂİIĞÖŞÜa-zâığöşü]+\s+[0-9]{4})/);
    const dateStr = dateMatch ? dateMatch[1] : new Date().toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' });

    prayerCache = { times, dateStr, fetchedAt: now };
    return { times, dateStr, fetchedAt: now, stale: false };
  } catch (err) {
    // Diyanet erişilemezse bayat (≤24 saat) önbellekten devam
    if (prayerCache && now - prayerCache.fetchedAt < PRAYER_STALE_MAX_MS) {
      console.warn('[prayer-times] Diyanet erişilemedi, bayat önbellek kullanılıyor:', errorMessage(err));
      return { ...prayerCache, stale: true };
    }
    throw err;
  }
}

// API ROUTE: Live Diyanet Prayer Times for Van (https://namazvakitleri.diyanet.gov.tr/tr-TR/9930/van-icin-namaz-vakti)
app.get('/api/prayer-times', async (_req, res) => {
  try {
    const { times, dateStr, stale } = await fetchDiyanetTimes();

    // Active Prayer calculation logic
    const toMinutes = (timeStr: string) => {
      const [h, m] = timeStr.split(':').map(Number);
      return h * 60 + m;
    };

    const now = new Date();
    const nowMinutes = now.getHours() * 60 + now.getMinutes();

    const imsakM = toMinutes(times.imsak);
    const gunesM = toMinutes(times.sabah);
    const ogleM = toMinutes(times.ogle);
    const ikindiM = toMinutes(times.ikindi);
    const aksamM = toMinutes(times.aksam);
    const yatsiM = toMinutes(times.yatsi);

    let activeKey: 'imsak' | 'sabah' | 'ogle' | 'ikindi' | 'aksam' | 'yatsi' = 'yatsi';
    let activeTitle = 'Yatsı Vakti';
    let nextTitle = 'İmsak';
    let nextMinutes = (24 * 60 - nowMinutes) + imsakM;

    if (nowMinutes >= imsakM && nowMinutes < gunesM) {
      activeKey = 'imsak';
      activeTitle = 'İmsak (Sabah Vakti)';
      nextTitle = 'Güneş';
      nextMinutes = gunesM - nowMinutes;
    } else if (nowMinutes >= gunesM && nowMinutes < ogleM) {
      activeKey = 'sabah';
      activeTitle = 'Güneş (Kuşluk Vakti)';
      nextTitle = 'Öğle';
      nextMinutes = ogleM - nowMinutes;
    } else if (nowMinutes >= ogleM && nowMinutes < ikindiM) {
      activeKey = 'ogle';
      activeTitle = 'Öğle Vakti';
      nextTitle = 'İkindi';
      nextMinutes = ikindiM - nowMinutes;
    } else if (nowMinutes >= ikindiM && nowMinutes < aksamM) {
      activeKey = 'ikindi';
      activeTitle = 'İkindi Vakti';
      nextTitle = 'Akşam';
      nextMinutes = aksamM - nowMinutes;
    } else if (nowMinutes >= aksamM && nowMinutes < yatsiM) {
      activeKey = 'aksam';
      activeTitle = 'Akşam Vakti';
      nextTitle = 'Yatsı';
      nextMinutes = yatsiM - nowMinutes;
    } else {
      activeKey = 'yatsi';
      activeTitle = 'Yatsı Vakti';
      nextTitle = 'İmsak';
      if (nowMinutes >= yatsiM) {
        nextMinutes = (24 * 60 - nowMinutes) + imsakM;
      } else {
        nextMinutes = imsakM - nowMinutes;
      }
    }

    const hoursLeft = Math.floor(nextMinutes / 60);
    const minsLeft = nextMinutes % 60;
    let remainingText = '';
    if (hoursLeft > 0) {
      remainingText = `${hoursLeft} sa ${minsLeft} dk kaldı`;
    } else {
      remainingText = `${minsLeft} dk kaldı`;
    }

    const nowStr = now.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });

    res.json({
      success: true,
      city: 'Van (Diyanet)',
      date: dateStr,
      times,
      activeKey,
      activeTitle,
      nextPrayer: nextTitle,
      remainingText,
      remainingMinutes: nextMinutes,
      lastUpdated: `Bugün ${nowStr} (namazvakitleri.diyanet.gov.tr)`,
      source: stale ? 'Diyanet İşleri Başkanlığı — geçici olarak önbellekten' : 'Diyanet İşleri Başkanlığı',
      // M31: bayat önbellek yanıtında isLive artık dürüstçe false
      isLive: !stale,
      stale,
    });
  } catch (error: unknown) {
    console.error('Error fetching Diyanet prayer times:', error);
    res.status(500).json({
      success: false,
      error: 'Diyanet ezan vakti verileri alınamadı',
      details: errorMessage(error),
    });
  }
});

// API ROUTE: Live Currency & Gold Rates from doviz.com (https://www.doviz.com/)
// M8: 10 dk sunucu önbelleği + 2 saat bayat-fallback eklendi (haber endpoint'i
// /api/news ile aynı model). İstemci (HomeView) bu endpoint'i 60 sn'de bir
// çağırıyor; önbellek olmadan her çağrı doviz.com scrape tetikliyordu.
const CURRENCIES_CACHE_TTL_MS = 10 * 60 * 1000;      // önbellek tazeliği: 10 dakika
const CURRENCIES_STALE_MAX_MS = 2 * 60 * 60 * 1000;  // eski önbellek üst sınırı: 2 saat

interface CurrenciesApiPayload {
  success: boolean;
  heroRates: CurrencyItem[];
  tableItems: TableItem[];
  lastUpdated: string;
  source: string;
  isLive: boolean;
  stale?: boolean;
}

let currenciesCache: { payload: CurrenciesApiPayload; fetchedAt: number } | null = null;

app.get('/api/currencies', async (_req, res) => {
  // Taze önbellek varsa doğrudan sun — her istekte doviz.com taranmaz
  if (currenciesCache && Date.now() - currenciesCache.fetchedAt < CURRENCIES_CACHE_TTL_MS) {
    return res.json(currenciesCache.payload);
  }

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);
    const response = await fetch('https://www.doviz.com/', {
      signal: controller.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'tr-TR,tr;q=0.9,en-US;q=0.8,en;q=0.7',
      },
    });

    clearTimeout(timeoutId);
    if (!response.ok) {
      throw new Error(`doviz.com status ${response.status}`);
    }

    const html = await response.text();

    const rowMatches = html.match(/<tr[^>]*>[\s\S]*?<\/tr>/gi) || [];
    const tableItems: Array<{
      key: string;
      name: string;
      value: string;
      change: string;
      status: 'up' | 'down' | 'neutral';
    }> = [];

    rowMatches.forEach((tr) => {
      const keyMatch = tr.match(/data-socket-key="([^"]+)"/);
      if (!keyMatch) return;

      const key = keyMatch[1];
      const nameMatch = tr.match(/<a[^>]*>\s*([\s\S]*?)\s*<\/a>/i);
      const rawName = nameMatch ? nameMatch[1].replace(/<[^>]+>/g, '').trim() : key;

      const valMatch = tr.match(/data-socket-attr="s"[^>]*>\s*([^<]+)\s*<\/td>/i) || tr.match(/data-socket-attr="s"[^>]*>\s*([^<]+)/i);
      const changeMatch = tr.match(/data-socket-attr="c"[^>]*>\s*([^<]+)\s*<\/td>/i) || tr.match(/data-socket-attr="c"[^>]*>\s*([^<]+)/i);

      let status: 'up' | 'down' | 'neutral' = 'neutral';
      if (tr.includes('color-up') || tr.includes('status up')) status = 'up';
      if (tr.includes('color-down') || tr.includes('status down')) status = 'down';

      const value = valMatch ? valMatch[1].trim() : '-';
      let change = changeMatch ? changeMatch[1].trim() : '%0,00';
      if (!change.startsWith('%')) change = '%' + change;

      tableItems.push({ key, name: rawName, value, change, status });
    });

    const parseKeyHero = (key: string, defaultName: string) => {
      const valRegex = new RegExp('<span[^>]*data-socket-key="' + key + '"[^>]*data-socket-attr="s"[^>]*>\\s*([^<]+)\\s*<\\/span', 'i');
      const valAlt = new RegExp('<span[^>]*data-socket-attr="s"[^>]*data-socket-key="' + key + '"[^>]*>\\s*([^<]+)\\s*<\\/span', 'i');
      const vm = html.match(valRegex) || html.match(valAlt);

      const changeRegex = new RegExp('<div[^>]*data-socket-key="' + key + '"[^>]*data-socket-attr="c"[^>]*>\\s*(%?[+\\-]?[0-9.,]+%?)\\s*<\\/div', 'i');
      const changeAlt = new RegExp('<div[^>]*data-socket-attr="c"[^>]*data-socket-key="' + key + '"[^>]*>\\s*(%?[+\\-]?[0-9.,]+%?)\\s*<\\/div', 'i');
      const cm = html.match(changeRegex) || html.match(changeAlt);

      const statusRegex = new RegExp('class="[^"]*status\\s+(up|down|neutral)[^"]*"[^>]*data-socket-key="' + key + '"', 'i');
      const statusAlt = new RegExp('data-socket-key="' + key + '"[^>]*class="[^"]*status\\s+(up|down|neutral)[^"]*"', 'i');
      const sm = html.match(statusRegex) || html.match(statusAlt);

      let status: 'up' | 'down' | 'neutral' = 'neutral';
      if (sm) status = sm[1] as 'up' | 'down' | 'neutral';

      return {
        key,
        name: defaultName,
        value: vm ? vm[1].trim() : '-',
        change: cm ? (cm[1].trim().startsWith('%') ? cm[1].trim() : '%' + cm[1].trim()) : '%0,00',
        status,
      };
    };

    const heroKeys = [
      { key: 'USD', name: 'Dolar', code: 'DOLAR' },
      { key: 'EUR', name: 'Euro', code: 'EURO' },
      { key: 'GBP', name: 'Sterlin', code: 'STERLİN' },
      { key: 'gram-altin', name: 'Gram Altın', code: 'ALTIN' },
      { key: 'ceyrek-altin', name: 'Çeyrek Altın', code: 'Ç.ALTIN' },
      { key: 'gumus', name: 'Gümüş', code: 'GÜMÜŞ' },
      { key: 'XU100', name: 'BIST 100', code: 'BIST 100' },
      { key: 'BRENT', name: 'Brent Petrol', code: 'PETROL' },
      { key: 'd-bitcoin', name: 'Bitcoin', code: 'BTC' },
    ];

    const heroRates = heroKeys.map((h) => {
      const inTable = tableItems.find((t) => t.key === h.key && t.value !== '-');
      if (inTable) {
        return {
          code: h.code,
          name: h.name,
          value: inTable.value,
          change: inTable.change,
          isUp: inTable.status === 'up',
          status: inTable.status,
          key: h.key,
        };
      }
      const parsed = parseKeyHero(h.key, h.name);
      return {
        code: h.code,
        name: h.name,
        value: parsed.value,
        change: parsed.change,
        isUp: parsed.status === 'up',
        status: parsed.status,
        key: h.key,
      };
    });

    const now = new Date();
    const nowStr = now.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });

    const payload: CurrenciesApiPayload = {
      success: true,
      heroRates,
      tableItems,
      lastUpdated: `Bugün ${nowStr} (doviz.com)`,
      source: 'doviz.com (Canlı Piyasalar)',
      isLive: true,
    };
    currenciesCache = { payload, fetchedAt: Date.now() };
    return res.json(payload);
  } catch (error: unknown) {
    console.error('Error fetching doviz.com rates:', error);
    // doviz.com geçici olarak düşerse: son başarılı sonuç hâlâ makul
    // tazelikteyse dürüstçe "eski önbellek" olarak sun (kaynak etiketinde
    // belirtilir); bunun altında dürüst hata döner.
    if (currenciesCache && Date.now() - currenciesCache.fetchedAt <= CURRENCIES_STALE_MAX_MS) {
      return res.json({
        ...currenciesCache.payload,
        stale: true,
        source: `${currenciesCache.payload.source} — geçici olarak önbellekten`,
      });
    }
    res.status(500).json({
      success: false,
      error: 'doviz.com canlı kurlar çekilemedi',
      details: errorMessage(error),
    });
  }
});

// M33: van.bel.tr otobüs verisi — ayrıştırıcı server/busScraper.ts'te
// (hem canlı yenileme hem npm run scrape:bus aynı kodu kullanır).
// 1 saat taze önbellek + 24 saat bayat önbellek + YEREL GERÇEK VERİ
// fallback'i (src/data/busSnapshot.ts anlık görüntüsü). Tüm detay sayfaları
// arka planda çekilir; istemci bekletilmez (stale-while-revalidate).
const BUS_CACHE_TTL_MS = 60 * 60 * 1000;
const BUS_STALE_MAX_MS = 24 * 60 * 60 * 1000;
interface BusApiPayload {
  success: boolean;
  routes: BusRouteData[];
  lastUpdated: string;
  source: string;
  isLive: boolean;
  stale?: boolean;
}
let busCache: { payload: BusApiPayload; fetchedAt: number } | null = null;
let busRefreshInProgress = false;

// Arka plan yenilemesi — çağıran istemci bekletilmez; bir sonraki istek
// taze veriyi önbellekten alır. Aynı anda yalnızca tek yenileme çalışır.
function refreshBusCacheInBackground(): void {
  if (busRefreshInProgress) return;
  busRefreshInProgress = true;
  void (async () => {
    try {
      const routes = await fetchLiveBusRoutes();
      const withTimes = routes.filter((r) => r.departureTimes.length > 0);
      console.log(`[bus] van.bel.tr yenileme: ${routes.length} hat (${withTimes.length} saatli)`);
      // Site yapısı yeniden değişirse boş/kırık ayrıştırmayı önbelleğe alma
      if (withTimes.length >= 10) {
        busCache = {
          payload: {
            success: true,
            routes,
            lastUpdated: `van.bel.tr Canlı (${new Date().toLocaleString('tr-TR', {
              dateStyle: 'short',
              timeStyle: 'short',
            })})`,
            source: 'van.bel.tr (VAN BELVAN Ulaşım Dairesi)',
            isLive: true,
          },
          fetchedAt: Date.now(),
        };
      }
    } catch (error) {
      console.warn('[bus] van.bel.tr canlı veri alınamadı:', errorMessage(error));
    } finally {
      busRefreshInProgress = false;
    }
  })();
}

// API ROUTE: Live Bus Schedules & Stops from van.bel.tr (stale-while-revalidate)
app.get('/api/bus-schedules', (_req, res) => {
  // Taze önbellek varsa doğrudan dön
  if (busCache && Date.now() - busCache.fetchedAt < BUS_CACHE_TTL_MS) {
    return res.json(busCache.payload);
  }

  // Taze değil: yenilemeyi arka plana bırak, istemciyi bekleme
  refreshBusCacheInBackground();

  // Bayat (≤24 saat) önbellek hâlâ en iyi tahmin
  if (busCache && Date.now() - busCache.fetchedAt < BUS_STALE_MAX_MS) {
    return res.json({ ...busCache.payload, stale: true, source: `${busCache.payload.source} — geçici olarak önbellekten` });
  }

  // Canlı yenileme hiç çalışmamışsa (ör. Render'dan van.bel.tr'ye erişim
  // engelli): npm run scrape:bus ile çekilmiş GERÇEK veri anlık görüntüsü.
  res.json({
    success: true,
    routes: BUS_SNAPSHOT_ROUTES,
    lastUpdated: `van.bel.tr anlık görüntü (${BUS_SNAPSHOT_LAST_UPDATED})`,
    source: 'van.bel.tr (VAN BELVAN Ulaşım Dairesi) — yerel kopya',
    isLive: false,
  });
});

// API ROUTE: Live Van News (RSS) — M6: ölü kaynaklar çıkarıldı, 10 dk sunucu
// önbelleği eklendi, uydurma fallback verisi dürüst hatayla değiştirildi.
// Canlı doğrulanan kaynaklar (07.11.2026): Wan Haber, Van Olay, Van Havadis.
// Kaldırılan ölü kaynaklar (02.11.2026 denetimi): sehrivan.com (DNS yok),
// vanpostasi.com (410), gazetevan.com (404), vanekspres.com (bağlantı kopuyor).
const NEWS_CACHE_TTL_MS = 10 * 60 * 1000;      // önbellek tazeliği: 10 dakika
const NEWS_STALE_MAX_MS = 2 * 60 * 60 * 1000;  // eski önbellek üst sınırı: 2 saat

interface NewsApiPayload {
  success: boolean;
  count: number;
  lastUpdated: string;
  source: string;
  channelsCount: number;
  news: NewsItem[];
  stale?: boolean;
}

let newsCache: { payload: NewsApiPayload; fetchedAt: number } | null = null;

app.get('/api/news', async (_req, res) => {
  const rssChannels = [
    { name: 'Wan Haber', domain: 'wanhaber.com', baseUrl: 'https://www.wanhaber.com', rssUrl: 'https://www.wanhaber.com/rss' },
    { name: 'Van Olay', domain: 'vanolay.com', baseUrl: 'https://www.vanolay.com', rssUrl: 'https://www.vanolay.com/rss' },
    { name: 'Van Havadis', domain: 'vanhavadis.com', baseUrl: 'https://www.vanhavadis.com', rssUrl: 'https://www.vanhavadis.com/rss' },
  ];

  // Taze önbellek varsa doğrudan sun — her istekte RSS taraması yapılmaz
  if (newsCache && Date.now() - newsCache.fetchedAt < NEWS_CACHE_TTL_MS) {
    return res.json(newsCache.payload);
  }

  const todayStr = new Date().toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' });

  try {
    // Attempt fetching RSS / News feeds from live Van channels
    const rssPromises = rssChannels.map(async (channel) => {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3500);
      try {
        const res = await fetch(channel.rssUrl, {
          signal: controller.signal,
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
            'Accept': 'application/rss+xml, application/xml, text/xml',
          },
        });
        clearTimeout(timeoutId);
        if (res.ok) {
          const xmlText = await res.text();
          const itemMatches = xmlText.match(/<item>[\s\S]*?<\/item>/gi) || [];
          const items = [];
          for (let i = 0; i < Math.min(itemMatches.length, 15); i++) {
            const itemXml = itemMatches[i];
            const titleMatch = itemXml.match(/<title>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/title>/i);
            const linkMatch = itemXml.match(/<link>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/link>/i);
            const descMatch = itemXml.match(/<description>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/description>/i);
            const pubDateMatch = itemXml.match(/<pubDate>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/pubDate>/i);
            const imgMatch = itemXml.match(/url="([^"]+\.(?:jpg|png|jpeg|webp))"/i) || itemXml.match(/src="([^"]+\.(?:jpg|png|jpeg|webp))"/i);

            const title = titleMatch ? titleMatch[1].replace(/<[^>]+>/g, '').trim() : '';
            const link = linkMatch ? linkMatch[1].trim() : channel.baseUrl;
            const desc = descMatch ? descMatch[1].replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim().substring(0, 150) : title;
            // M9: http:// görsel URL'leri https://'e yükseltilir — Android'de
            // cleartext trafik kapatıldı (usesCleartextTraffic=false), http://
            // görsel WebView'da zaten yüklenmezdi; https destekleyen kaynaklarda
            // çalışmaya devam eder.
            // M41: görseli olmayan habere artık dış (Unsplash) stok fotoğraf
            // takılmıyor — alakasız görsel yanıltıcıydı. Boş string döner;
            // istemci (NewsView) nötr placeholder gösterir.
            const image = imgMatch
              ? imgMatch[1].replace(/^http:\/\//i, 'https://')
              : '';

            // M31: tarih artık RSS <pubDate>'ten gelir — eskiden her haber
            // "bugün / şu an" gibi gösteriliyordu (gerçek yayın saati değil).
            let date = todayStr;
            let time = new Date().toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });
            if (pubDateMatch) {
              const parsed = new Date(pubDateMatch[1].trim());
              if (!isNaN(parsed.getTime())) {
                date = parsed.toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' });
                time = parsed.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });
              }
            }

            if (title && title.length > 5) {
              items.push({
                id: `rss-${channel.domain}-${i}-${Date.now()}`,
                title: title,
                category: `${channel.name} Canlı`,
                image: image,
                summary: desc.length > 120 ? desc + '...' : desc,
                content: desc + ' Devamı için kaynağı ziyaret ediniz.',
                date,
                time,
                source: channel.name,
                sourceUrl: link,
              });
            }
          }
          return items;
        }
      } catch {
        // Safe timeout or network catch
      }
      return [];
    });

    const results = await Promise.allSettled(rssPromises);
    const fetchedNews: NewsItem[] = [];
    results.forEach((r) => {
      if (r.status === 'fulfilled' && Array.isArray(r.value)) {
        fetchedNews.push(...r.value);
      }
    });

    // Respect limit
    let finalNews = fetchedNews;
    const limitParam = Number(_req.query.limit);
    if (!isNaN(limitParam) && limitParam > 0) {
      finalNews = finalNews.slice(0, limitParam);
    } else {
      finalNews = finalNews.slice(0, 30);
    }

    if (finalNews.length > 0) {
      const payload: NewsApiPayload = {
        success: true,
        count: finalNews.length,
        lastUpdated: `Güncel ${new Date().toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}`,
        source: 'Wan Haber, Van Olay, Van Havadis (Canlı RSS)',
        channelsCount: rssChannels.length,
        news: finalNews,
      };
      newsCache = { payload, fetchedAt: Date.now() };
      return res.json(payload);
    }

    // Canlı veri yok: son başarılı sonuç hala makul tazelikteyse dürüstçe
    // "eski önbellek" olarak sun (kaynak etiketinde belirtilir).
    if (newsCache && Date.now() - newsCache.fetchedAt <= NEWS_STALE_MAX_MS) {
      return res.json({
        ...newsCache.payload,
        stale: true,
        source: `${newsCache.payload.source} — geçici olarak önbellekten`,
      });
    }
  } catch (err) {
    console.warn('Error fetching RSS news:', err);
    if (newsCache && Date.now() - newsCache.fetchedAt <= NEWS_STALE_MAX_MS) {
      return res.json({
        ...newsCache.payload,
        stale: true,
        source: `${newsCache.payload.source} — geçici olarak önbellekten`,
      });
    }
  }

  // Dürüst hata: uydurma haber üretilmez (eski davranış sahte veriyi "canlı"
  // gibi sunuyordu). İstemci bu durumda hata mesajı gösterir.
  res.status(503).json({
    success: false,
    count: 0,
    error: 'Canlı haber kaynaklarına şu anda ulaşılamıyor. Lütfen daha sonra tekrar deneyiniz.',
    channelsCount: rssChannels.length,
  });
});

async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
