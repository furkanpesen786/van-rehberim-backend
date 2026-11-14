import 'dotenv/config';
import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import cors from 'cors';
// DİKKAT: Native ESM ("type": "module") uzantısız göreli import'u çözemez —
// tam .ts uzantısı şart (ts-node, tsx, esbuild ve tsc/allowImportingTsExtensions
// hepsi bu formu kabul eder).
import { listingsRouter } from './server/listings.ts';
// M20: ~612 satırlık inline otobüs fallback verisi ayrı modüle taşındı
import { BUS_FALLBACK_ROUTES, type BusRouteData } from './server/busFallbackData.ts';

const app = express();
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

// M5: Ücretli ilan yayınlama (Firebase ID token + RevenueCat entitlement
// doğrulaması; Firestore'a yalnızca Admin SDK ile yazılır).
app.use('/api/listings', listingsRouter);

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

// Helper function to map MGM wind direction angle to Turkish compass directions
function getWindDirectionName(degree: number): string {
  if (degree === undefined || degree === null) return 'K';
  const val = Math.floor((degree / 45) + 0.5);
  const arr = ['K', 'KD', 'D', 'GD', 'G', 'GB', 'B', 'KB'];
  return arr[val % 8] || 'K';
}

// Helper function to map MGM event codes (hadiseKodu) to Turkish descriptions & Lucide icon keys
function parseMgmHadise(code: string): { condition: string; icon: 'sun' | 'cloud-sun' | 'cloud' | 'rain' | 'wind' } {
  if (!code) return { condition: 'Parçalı Bulutlu', icon: 'cloud-sun' };
  const upper = code.toUpperCase();

  if (upper === 'A' || upper === 'G') {
    return { condition: 'Açık, Güneşli', icon: 'sun' };
  } else if (upper === 'AB') {
    return { condition: 'Az Bulutlu', icon: 'cloud-sun' };
  } else if (upper === 'PB') {
    return { condition: 'Parçalı Bulutlu', icon: 'cloud-sun' };
  } else if (upper === 'CB') {
    return { condition: 'Çok Bulutlu', icon: 'cloud' };
  } else if (upper === 'HY') {
    return { condition: 'Hafif Yağmurlu', icon: 'rain' };
  } else if (upper === 'Y' || upper === 'SY' || upper === 'KGY' || upper === 'GSY') {
    return { condition: 'Sağanak Yağışlı', icon: 'rain' };
  } else if (upper === 'K' || upper === 'HK') {
    return { condition: 'Kar Yağışlı', icon: 'rain' };
  } else if (upper === 'SIS' || upper === 'PUS') {
    return { condition: 'Sisli ve Puslu', icon: 'cloud' };
  } else if (upper === 'R') {
    return { condition: 'Rüzgarlı', icon: 'wind' };
  }

  return { condition: 'Parçalı Bulutlu', icon: 'cloud-sun' };
}

// Helper function to get day name in Turkish
function getTurkishDayName(dateObj: Date): string {
  const days = ['Pazar', 'Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma', 'Cumartesi'];
  return days[dateObj.getDay()];
}

// Helper function to format date as "1 Ağustos"
function getTurkishFormattedDate(dateObj: Date): string {
  const months = [
    'Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran',
    'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'
  ];
  return `${dateObj.getDate()} ${months[dateObj.getMonth()]}`;
}

// Helper function to calculate AQI status & advice
function getAqiDetails(aqiVal: number) {
  if (aqiVal <= 50) {
    return {
      status: 'İyi (Temiz Dağ Havası)',
      color: 'emerald',
      advice: 'Van Gölü ve çevresindeki hava kalitesi ideal seviyede. Açık hava yürüyüşü ve doğa aktiviteleri için harika bir gün.'
    };
  } else if (aqiVal <= 100) {
    return {
      status: 'Orta Seviye',
      color: 'amber',
      advice: 'Hava kalitesi kabul edilebilir düzeyde. Hassas kişiler için hafif açık hava tavsiyeleri geçerlidir.'
    };
  } else {
    return {
      status: 'Hassas Gruplar İçin Sağlıksız',
      color: 'orange',
      advice: 'Açık havada uzun süreli yoğun egzersiz yapmaktan kaçının.'
    };
  }
}

// Helper function for UV index status & advice
function getUvDetails(uvVal: number) {
  if (uvVal < 3) {
    return {
      status: 'Düşük',
      advice: 'Güneş koruması gerekmez, açık havanın tadını çıkarın.'
    };
  } else if (uvVal < 6) {
    return {
      status: 'Orta',
      advice: 'Öğle saatlerinde şapka ve güneş gözlüğü takılması tavsiye olunur.'
    };
  } else if (uvVal < 8) {
    return {
      status: 'Yüksek - Korunma Tavsiye Edilir',
      advice: '11:00 - 15:00 saatleri arasında gölgede kalın, koruyucu şapka ve güneş kremi kullanın.'
    };
  } else {
    return {
      status: 'Çok Yüksek',
      advice: 'Güneşin dik açıyla geldiği öğle saatlerinde korumasız dışarı çıkmamaya özen gösterin.'
    };
  }
}

// M18: MGM/Open-Meteo 10 dk önbellek + 2 saat bayat-fallback — her istemci
// yenilemesi MGM servis API'sini doğrudan vuruyordu (ToS/blok riski + gecikme).
const WEATHER_CACHE_TTL_MS = 10 * 60 * 1000;
const WEATHER_STALE_MAX_MS = 2 * 60 * 60 * 1000;
interface WeatherApiPayload {
  city: string;
  currentTemp: number;
  feelsLike: number;
  condition: string;
  tempMax: number;
  tempMin: number;
  humidity: number;
  windSpeed: number;
  windDirection: string;
  pressure: number;
  uvIndex: number;
  uvStatus: string;
  uvAdvice: string;
  aqi: number;
  aqiStatus: string;
  aqiColor: string;
  aqiAdvice: string;
  lastUpdated: string;
  forecast7Days: any[];
  isLive: boolean;
  source: string;
  stale?: boolean;
}
let weatherCache: { payload: WeatherApiPayload; fetchedAt: number } | null = null;

// API ROUTE: Live Van Weather Data fetched directly from MGM + Open-Meteo
app.get('/api/weather', async (_req, res) => {
  // Taze önbellek varsa doğrudan dön
  if (weatherCache && Date.now() - weatherCache.fetchedAt < WEATHER_CACHE_TTL_MS) {
    return res.json(weatherCache.payload);
  }
  try {
    const headers = {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Origin': 'https://www.mgm.gov.tr',
      'Referer': 'https://www.mgm.gov.tr/'
    };

    // Fetch MGM sondurumlar (current observation) — M30: timeout'lu
    const mgmSonRes = await fetchWithTimeout('https://servis.mgm.gov.tr/web/sondurumlar?il=Van', { headers }).catch(() => null);
    const mgmSonData = mgmSonRes && mgmSonRes.ok ? await mgmSonRes.json() : null;

    // Fetch MGM günlük tahminler (daily forecast) — M30: timeout'lu
    const mgmTahminRes = await fetchWithTimeout('https://servis.mgm.gov.tr/web/tahminler/gunluk?il=Van', { headers }).catch(() => null);
    const mgmTahminData = mgmTahminRes && mgmTahminRes.ok ? await mgmTahminRes.json() : null;

    // Fetch Open-Meteo for AQI & UV — M30: timeout'lu
    const openMeteoAqiRes = await fetchWithTimeout('https://air-quality-api.open-meteo.com/v1/air-quality?latitude=38.5012&longitude=43.3730&current=us_aqi').catch(() => null);
    const openMeteoAqiData = openMeteoAqiRes && openMeteoAqiRes.ok ? await openMeteoAqiRes.json() : null;

    const openMeteoUvRes = await fetchWithTimeout('https://api.open-meteo.com/v1/forecast?latitude=38.5012&longitude=43.3730&current=uv_index&daily=uv_index_max&timezone=Europe%2FIstanbul').catch(() => null);
    const openMeteoUvData = openMeteoUvRes && openMeteoUvRes.ok ? await openMeteoUvRes.json() : null;

    // Default fallback values if MGM endpoints are delayed
    let currentTemp = 24;
    let feelsLike = 25;
    let condition = 'Parçalı Bulutlu';
    let tempMax = 28;
    let tempMin = 15;
    let humidity = 40;
    let windSpeed = 12;
    let windDirection = 'KB';
    let pressure = 1012;

    const currentSon = Array.isArray(mgmSonData) && mgmSonData.length > 0 ? mgmSonData[0] : null;

    if (currentSon) {
      if (typeof currentSon.sicaklik === 'number') currentTemp = Math.round(currentSon.sicaklik);
      if (typeof currentSon.hissedilenSicaklik === 'number') feelsLike = Math.round(currentSon.hissedilenSicaklik);
      else feelsLike = currentTemp;

      if (currentSon.hadiseKodu) {
        condition = parseMgmHadise(currentSon.hadiseKodu).condition;
      }
      if (typeof currentSon.nem === 'number') humidity = Math.round(currentSon.nem);
      if (typeof currentSon.ruzgarHiz === 'number') windSpeed = Math.round(currentSon.ruzgarHiz);
      if (typeof currentSon.ruzgarYon === 'number') windDirection = getWindDirectionName(currentSon.ruzgarYon);
      if (typeof currentSon.denizeIndirgenmisBasinc === 'number' && currentSon.denizeIndirgenmisBasinc > 0) {
        pressure = Math.round(currentSon.denizeIndirgenmisBasinc);
      } else if (typeof currentSon.aktuelBasinc === 'number' && currentSon.aktuelBasinc > 0) {
        pressure = Math.round(currentSon.aktuelBasinc);
      }
    }

    // Process forecast
    const forecast7Days: any[] = [];
    const mainTahmin = Array.isArray(mgmTahminData) && mgmTahminData.length > 0 ? mgmTahminData[0] : null;

    if (mainTahmin) {
      // Day 0
      if (typeof mainTahmin.enYuksekGun0 === 'number') tempMax = mainTahmin.enYuksekGun0;
      if (typeof mainTahmin.enDusukGun0 === 'number') tempMin = mainTahmin.enDusukGun0;

      for (let i = 0; i <= 6; i++) {
        const dateObj = new Date();
        dateObj.setDate(dateObj.getDate() + i);

        const tMinKey = `enDusukGun${i}`;
        const tMaxKey = `enYuksekGun${i}`;
        const hadiseKey = `hadiseGun${i}`;
        const humKey = `enYuksekNemGun${i}`;

        const dMin = typeof mainTahmin[tMinKey] === 'number' ? mainTahmin[tMinKey] : tempMin;
        const dMax = typeof mainTahmin[tMaxKey] === 'number' ? mainTahmin[tMaxKey] : tempMax;
        const hadiseCode = mainTahmin[hadiseKey] || 'PB';
        const parsedH = parseMgmHadise(hadiseCode);
        const humVal = typeof mainTahmin[humKey] === 'number' ? mainTahmin[humKey] : humidity;

        forecast7Days.push({
          day: i === 0 ? 'Bugün' : getTurkishDayName(dateObj),
          date: getTurkishFormattedDate(dateObj),
          condition: parsedH.condition,
          icon: parsedH.icon,
          tempMax: dMax,
          tempMin: dMin,
          pop: parsedH.icon === 'rain' ? 65 : parsedH.icon === 'cloud' ? 20 : 5,
          humidity: humVal,
        });
      }
    } else {
      // Fallback forecast for 7 days
      for (let i = 0; i < 7; i++) {
        const dateObj = new Date();
        dateObj.setDate(dateObj.getDate() + i);
        forecast7Days.push({
          day: i === 0 ? 'Bugün' : getTurkishDayName(dateObj),
          date: getTurkishFormattedDate(dateObj),
          condition: i % 2 === 0 ? 'Parçalı Bulutlu' : 'Güneşli',
          icon: i % 2 === 0 ? 'cloud-sun' : 'sun',
          tempMax: tempMax + (i % 3) - 1,
          tempMin: tempMin + (i % 2),
          pop: 10,
          humidity: 40,
        });
      }
    }

    // AQI & UV
    let aqi = 34;
    if (openMeteoAqiData && openMeteoAqiData.current && typeof openMeteoAqiData.current.us_aqi === 'number') {
      aqi = Math.round(openMeteoAqiData.current.us_aqi);
    }
    const aqiDetails = getAqiDetails(aqi);

    let uvIndex = 6.5;
    if (openMeteoUvData && openMeteoUvData.current && typeof openMeteoUvData.current.uv_index === 'number') {
      uvIndex = Math.round(openMeteoUvData.current.uv_index * 10) / 10;
    } else if (openMeteoUvData && openMeteoUvData.daily && openMeteoUvData.daily.uv_index_max && openMeteoUvData.daily.uv_index_max[0]) {
      uvIndex = Math.round(openMeteoUvData.daily.uv_index_max[0] * 10) / 10;
    }
    const uvDetails = getUvDetails(uvIndex);

    const nowStr = new Date().toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });

    const vanWeatherData = {
      city: 'Van Merkez (MGM)',
      currentTemp,
      feelsLike,
      condition,
      tempMax,
      tempMin,
      humidity,
      windSpeed,
      windDirection,
      pressure,
      uvIndex,
      uvStatus: uvDetails.status,
      uvAdvice: uvDetails.advice,
      aqi,
      aqiStatus: aqiDetails.status,
      aqiColor: aqiDetails.color,
      aqiAdvice: aqiDetails.advice,
      lastUpdated: `Bugün ${nowStr} (Canlı MGM API)`,
      forecast7Days,
      isLive: true,
      source: 'Meteoroloji Genel Müdürlüğü (MGM)'
    };

    weatherCache = { payload: vanWeatherData, fetchedAt: Date.now() };
    res.json(vanWeatherData);
  } catch (error: unknown) {
    console.error('Error fetching MGM weather data:', error);
    // M18: bayat (≤2 saat) önbellekten devam
    if (weatherCache && Date.now() - weatherCache.fetchedAt < WEATHER_STALE_MAX_MS) {
      return res.json({ ...weatherCache.payload, stale: true, source: `${weatherCache.payload.source} — geçici olarak önbellekten` });
    }
    res.status(500).json({ error: 'MGM hava durumu verisi alınamadı' });
  }
});

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
  pharmacies: any[];
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
    const pharmacies: any[] = [];

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
  heroRates: any[];
  tableItems: any[];
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

// M18: van.bel.tr 1 saat önbellek + 24 saat bayat-fallback — tarifeler nadir
// değişir; her istemci yenilemesi sayfayı scrape ediyordu (ToS/blok riski).
const BUS_CACHE_TTL_MS = 60 * 60 * 1000;
const BUS_STALE_MAX_MS = 24 * 60 * 60 * 1000;
interface BusApiPayload {
  success: boolean;
  routes: any[];
  lastUpdated: string;
  source: string;
  isLive: boolean;
  stale?: boolean;
}
let busCache: { payload: BusApiPayload; fetchedAt: number } | null = null;

// API ROUTE: Live Bus Schedules & Stops from van.bel.tr (https://van.bel.tr/Syf/Otobus-Hareket-Saatleri.html)
app.get('/api/bus-schedules', async (_req, res) => {
  // Taze önbellek varsa doğrudan dön
  if (busCache && Date.now() - busCache.fetchedAt < BUS_CACHE_TTL_MS) {
    return res.json(busCache.payload);
  }

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3500);

    const response = await fetch('https://van.bel.tr/Syf/Otobus-Hareket-Saatleri.html', {
      signal: controller.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'tr-TR,tr;q=0.9,en-US;q=0.8,en;q=0.7',
      },
    });

    clearTimeout(timeoutId);

    if (response.ok) {
      const html = await response.text();
      // Try parsing tables or accordion rows from van.bel.tr
      const parsedRoutes: BusRouteData[] = [];

      const trMatches = html.match(/<tr[^>]*>[\s\S]*?<\/tr>/gi) || [];
      trMatches.forEach((tr, idx) => {
        const text = tr.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
        const timeMatches = text.match(/\b([0-2]?[0-9]:[0-5][0-9])\b/g);
        if (text.length > 5 && timeMatches && timeMatches.length >= 2) {
          const parts = text.split(/\s+/);
          parsedRoutes.push({
            id: `v-live-${idx}`,
            lineNo: parts[0] || `Hat ${idx + 101}`,
            title: text.substring(0, 60),
            route: text,
            departureTimes: Array.from(timeMatches),
            returnTimes: [],
            // M31: canlı ayrıştırma yalnızca saatleri okuyabiliyor — durak
            // listesi ve tarife sayfada yok. Uydurma "Merkez Garaj / Varış
            // Durak" durakları ve sabit 15 TL tarife kaldırıldı; istemci
            // boş alanları zaten gizliyor.
            stops: [],
            frequency: 'Canlı Saatler',
            status: 'Aktif',
            tariff: '',
            operatingHours: `${timeMatches[0]} - ${timeMatches[timeMatches.length - 1]}`,
          });
        }
      });

      if (parsedRoutes.length > 0) {
        const livePayload: BusApiPayload = {
          success: true,
          routes: parsedRoutes,
          lastUpdated: 'van.bel.tr Canlı',
          source: 'van.bel.tr (VAN BELVAN Ulaşım Dairesi)',
          isLive: true,
        };
        busCache = { payload: livePayload, fetchedAt: Date.now() };
        return res.json(livePayload);
      }
    }
  } catch {
    // Graceful fallback to official BELVAN bus schedules dataset when external van.bel.tr endpoint is unreachable
  }

  // M18: canlı veri alınamadıysa önce bayat (≤24 saat) önbellek
  if (busCache && Date.now() - busCache.fetchedAt < BUS_STALE_MAX_MS) {
    return res.json({ ...busCache.payload, stale: true, source: `${busCache.payload.source} — geçici olarak önbellekten` });
  }

  const now = new Date();
  const timeStr = now.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });

  res.json({
    success: true,
    routes: BUS_FALLBACK_ROUTES,
    lastUpdated: `Bugün ${timeStr} (van.bel.tr Ulaşım)`,
    source: 'van.bel.tr (VAN BELVAN Ulaşım Dairesi)',
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
  news: any[];
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
            const image = imgMatch
              ? imgMatch[1].replace(/^http:\/\//i, 'https://')
              : 'https://images.unsplash.com/photo-1504711434969-e33886168f5c?auto=format&fit=crop&w=800&q=80';

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
    const fetchedNews: any[] = [];
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
