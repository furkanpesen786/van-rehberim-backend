import { VanWeatherData } from '../types';
import { VAN_WEATHER } from '../data/mockData';

export async function fetchLiveVanWeather(): Promise<VanWeatherData> {
  // Client-side Live API via Open-Meteo (lat: 38.5012, lon: 43.3730 for Van)
  try {
    const openMeteoUrl = 'https://api.open-meteo.com/v1/forecast?latitude=38.5012&longitude=43.3730&current=temperature_2m,relative_humidity_2m,apparent_temperature,weather_code,surface_pressure,wind_speed_10m,wind_direction_10m&daily=weather_code,temperature_2m_max,temperature_2m_min,uv_index_max&timezone=Europe%2FIstanbul';
    const aqiUrl = 'https://air-quality-api.open-meteo.com/v1/air-quality?latitude=38.5012&longitude=43.3730&current=us_aqi';

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 60000);
    const [omRes, aqiRes] = await Promise.all([
      fetch(openMeteoUrl, { signal: controller.signal }),
      fetch(aqiUrl, { signal: controller.signal }).catch(() => null)
    ]);
    clearTimeout(timeoutId);

    if (omRes.ok) {
      const omData = await omRes.json();
      const aqiData = aqiRes && aqiRes.ok ? await aqiRes.json() : null;

      const current = omData.current || {};
      const daily = omData.daily || {};

      const currentTemp = Math.round(current.temperature_2m ?? 24);
      const feelsLike = Math.round(current.apparent_temperature ?? currentTemp);
      const humidity = Math.round(current.relative_humidity_2m ?? 40);
      const windSpeed = Math.round(current.wind_speed_10m ?? 12);
      const pressure = Math.round(current.surface_pressure ?? 1012);

      const codeMap: Record<number, { condition: string; icon: 'sun' | 'cloud-sun' | 'cloud' | 'rain' | 'wind' }> = {
        0: { condition: 'Açık, Güneşli', icon: 'sun' },
        1: { condition: 'Az Bulutlu', icon: 'cloud-sun' },
        2: { condition: 'Parçalı Bulutlu', icon: 'cloud-sun' },
        3: { condition: 'Çok Bulutlu', icon: 'cloud' },
        45: { condition: 'Sisli', icon: 'cloud' },
        48: { condition: 'Puslu ve Sisli', icon: 'cloud' },
        51: { condition: 'Çiseleyen Yağmur', icon: 'rain' },
        61: { condition: 'Hafif Yağmurlu', icon: 'rain' },
        63: { condition: 'Sağanak Yağışlı', icon: 'rain' },
        71: { condition: 'Kar Yağışlı', icon: 'rain' },
        80: { condition: 'Kuvvetli Sağanak', icon: 'rain' },
        95: { condition: 'Gökgürültülü Sağanak', icon: 'rain' },
      };

      const weatherMeta = codeMap[current.weather_code] || { condition: 'Parçalı Bulutlu', icon: 'cloud-sun' };

      const tempMax = Math.round(daily.temperature_2m_max?.[0] ?? currentTemp + 4);
      const tempMin = Math.round(daily.temperature_2m_min?.[0] ?? currentTemp - 8);

      const daysOfWeek = ['Pazar', 'Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma', 'Cumartesi'];
      const months = ['Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran', 'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'];

      const forecast7Days = (daily.time || []).slice(0, 7).map((tStr: string, idx: number) => {
        const dObj = new Date(tStr);
        const code = daily.weather_code?.[idx] ?? 0;
        const meta = codeMap[code] || { condition: 'Parçalı Bulutlu', icon: 'cloud-sun' };
        return {
          day: idx === 0 ? 'Bugün' : daysOfWeek[dObj.getDay()],
          date: `${dObj.getDate()} ${months[dObj.getMonth()]}`,
          condition: meta.condition,
          icon: meta.icon,
          tempMax: Math.round(daily.temperature_2m_max?.[idx] ?? tempMax),
          tempMin: Math.round(daily.temperature_2m_min?.[idx] ?? tempMin),
          pop: meta.icon === 'rain' ? 70 : meta.icon === 'cloud' ? 25 : 5,
          humidity: Math.round(humidity + (idx % 3) * 2 - 2),
        };
      });

      const aqi = Math.round(aqiData?.current?.us_aqi ?? 32);
      const uvIndex = Math.round((daily.uv_index_max?.[0] ?? 6.5) * 10) / 10;
      const nowStr = new Date().toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });

      return {
        city: 'Van Merkez',
        currentTemp,
        feelsLike,
        condition: weatherMeta.condition,
        tempMax,
        tempMin,
        humidity,
        windSpeed,
        windDirection: 'KB',
        pressure,
        uvIndex,
        uvStatus: uvIndex >= 8 ? 'Çok Yüksek' : uvIndex >= 6 ? 'Yüksek' : 'Orta',
        uvAdvice: 'Güneş ışınlarının dik geldiği öğle saatlerinde koruyucu şapka kullanın.',
        aqi,
        aqiStatus: aqi <= 50 ? 'İyi (Temiz Dağ Havası)' : 'Orta',
        aqiColor: 'emerald',
        aqiAdvice: 'Van Gölü ve etrafında gökyüzü ve hava kalitesi açık hava etkinlikleri için idealdir.',
        lastUpdated: `Bugün ${nowStr} (Canlı Canlı API)`,
        forecast7Days,
      };
    } else {
      const errText = await omRes.text().catch(() => 'No Body');
      console.error(`[weatherService] API Hatası - Status: ${omRes.status}`, errText);
    }
  } catch (err: any) {
    console.error(`[weatherService] Ağ/Timeout Hatası:`, err.message || err);
  }

  // Fallback to initial baseline
  return VAN_WEATHER;
}
