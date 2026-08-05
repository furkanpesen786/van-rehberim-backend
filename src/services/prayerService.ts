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
    const response = await fetch('https://api.aladhan.com/v1/timingsByCity?city=Van&country=Turkey&method=13');
    if (response.ok) {
      const json = await response.json();
      if (json && json.code === 200 && json.data && json.data.timings) {

        const liveTimes = {
          imsak: json.data.timings.Fajr, // Diyanet Imsak generally aligns with Aladhan Fajr when method 13
          sabah: json.data.timings.Sunrise,
          ogle: json.data.timings.Dhuhr,
          ikindi: json.data.timings.Asr,
          aksam: json.data.timings.Maghrib,
          yatsi: json.data.timings.Isha,
        };

        const dynamicStatus = calculatePrayerStatus(liveTimes);

        const nowStr = new Date().toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });

        return {
          success: true,
          city: 'Van (Aladhan)',
          date: new Date().toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' }),
          times: liveTimes,
          activeKey: dynamicStatus.activeKey,
          activeTitle: dynamicStatus.activeTitle,
          nextPrayer: dynamicStatus.nextTitle,
          remainingText: dynamicStatus.remainingText,
          remainingMinutes: dynamicStatus.remainingMinutes,
          lastUpdated: `Bugün ${nowStr} (api.aladhan.com)`,
          source: 'Aladhan API (Diyanet Metodu)',
          isLive: true,
        };
      }
    }
  } catch (err) {
    console.warn('Live prayer times fetch error (Aladhan fallback failed), using local static fallback:', err);
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
    lastUpdated: 'Diyanet Standart',
    source: 'Diyanet İşleri Başkanlığı',
    isLive: false,
  };
}
