import { PrayerTimes } from '../types';
import { PRAYER_TIMES } from '../data/mockData';

export interface LivePrayerTimesResponse {
  success: boolean;
  city: string;
  date: string;
  times: {
    imsak: string;
    sabah: string;
    ogle: string;
    ikindi: string;
    aksam: string;
    yatsi: string;
  };
  activeKey: 'imsak' | 'sabah' | 'ogle' | 'ikindi' | 'aksam' | 'yatsi';
  activeTitle: string;
  nextPrayer: string;
  remainingText: string;
  remainingMinutes: number;
  lastUpdated: string;
  source: string;
  isLive?: boolean;
  stale?: boolean;
}

export function calculatePrayerStatus(times: {
  imsak: string;
  sabah: string;
  ogle: string;
  ikindi: string;
  aksam: string;
  yatsi: string;
}) {
  const toMinutes = (timeStr: string) => {
    if (!timeStr) return 0;
    const [h, m] = timeStr.split(':').map(Number);
    return (h || 0) * 60 + (m || 0);
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

  return { activeKey, activeTitle, nextTitle, remainingText, remainingMinutes: nextMinutes };
}

export async function fetchLivePrayerTimes(): Promise<LivePrayerTimesResponse> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000);
    // M15: TEK KAYNAK — istemci Aladhan'ı bıraktı; Diyanet verisi kendi
    // sunucumuzdan geliyor (sunucuda 1 saat önbellek + bayat-fallback var).
    // Böylece aynı özellik için iki ayrı kaynaktan sapan değerler ortadan kalktı.
    const response = await fetch(`${import.meta.env.VITE_API_URL || 'https://van-rehberim-api.onrender.com'}/api/prayer-times`, { signal: controller.signal });
    clearTimeout(timeoutId);
    if (response.ok) {
      const json: any = await response.json();
      if (json && json.success && json.times) {

        // Aktif vakit/geri sayım sunucuda önbelleğe alınma anında hesaplanmış
        // olabilir — istemcide güncel saatle yeniden hesapla (HomeView zaten
        // her dakika yeniden hesaplıyor).
        const dynamicStatus = calculatePrayerStatus(json.times);

        const nowStr = new Date().toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });

        return {
          success: true,
          city: json.city || 'Van (Diyanet)',
          // Sunucudan gelen date bazen Hicri olur ("1 Cemaziyelahir 1448" —
          // Diyanet sayfasındaki ilk tarih eşleşmesi); ana gösterim için
          // Gregorian Türkçe tarih istemcide üretilir.
          date: new Date().toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' }),
          times: json.times,
          activeKey: dynamicStatus.activeKey,
          activeTitle: dynamicStatus.activeTitle,
          nextPrayer: dynamicStatus.nextTitle,
          remainingText: dynamicStatus.remainingText,
          remainingMinutes: dynamicStatus.remainingMinutes,
          lastUpdated: `Bugün ${nowStr} (Diyanet — sunucudan)`,
          source: json.source || 'Diyanet İşleri Başkanlığı',
          isLive: true,
          stale: !!json.stale,
        };
      }
    } else {
      const errText = await response.text().catch(() => 'No Body');
      console.error(`[prayerService] API Hatası - Status: ${response.status}`, errText);
    }
  } catch (err: any) {
    console.error(`[prayerService] Ağ/Timeout Hatası:`, err.message || err);
  }

  // Fallback
  const fallbackTimes = {
    imsak: PRAYER_TIMES.imsak || '03:23',
    sabah: PRAYER_TIMES.sabah || '05:01',
    ogle: PRAYER_TIMES.ogle || '12:18',
    ikindi: PRAYER_TIMES.ikindi || '16:08',
    aksam: PRAYER_TIMES.aksam || '19:25',
    yatsi: PRAYER_TIMES.yatsi || '20:56',
  };

  const dynamicStatus = calculatePrayerStatus(fallbackTimes);

  return {
    success: false,
    city: 'Van',
    date: new Date().toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' }),
    times: fallbackTimes,
    activeKey: dynamicStatus.activeKey,
    activeTitle: dynamicStatus.activeTitle,
    nextPrayer: dynamicStatus.nextTitle,
    remainingText: dynamicStatus.remainingText,
    remainingMinutes: dynamicStatus.remainingMinutes,
    lastUpdated: 'Çevrimdışı varsayılan değerler',
    source: 'Yerel varsayılan (bağlantı yok)',
    isLive: false,
  };
}
