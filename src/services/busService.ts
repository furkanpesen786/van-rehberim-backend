import { BUS_SNAPSHOT_ROUTES, BUS_SNAPSHOT_LAST_UPDATED } from '../data/busSnapshot';
import { BusRoute } from '../types';
import { getErrorMessage } from '../utils/errors';

export interface LiveBusResponse {
  success: boolean;
  routes: BusRoute[];
  lastUpdated: string;
  source: string;
  isLive?: boolean;
}

export async function fetchLiveBusSchedules(): Promise<LiveBusResponse> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000);
    const response = await fetch(`${import.meta.env.VITE_API_URL || 'https://van-rehberim-api.onrender.com'}/api/bus-schedules`, { signal: controller.signal });
    clearTimeout(timeoutId);
    if (response.ok) {
      const data = await response.json();
      if (data && data.success && Array.isArray(data.routes) && data.routes.length > 0) {
        return data;
      }
    } else {
      const errText = await response.text().catch(() => 'No Body');
      console.error(`[busService] Backend Yanıt Hatası - Status: ${response.status}`, errText);
    }
  } catch (err) {
    console.error(`[busService] Ağ/Timeout Hatası:`, getErrorMessage(err));
  }

  // M38: sunucuya ulaşılamadı (Render free plan uykuda → soğuk başlangıç
  // 15 sn timeout'u aşıyor vb.). Önceden 7 hatlık KURGUSSAL mock'a
  // düşülüyordu; artık uygulamayla paketlenmiş GERÇEK van.bel.tr anlık
  // görüntüsü gösterilir — ilk açılışta da 87 gerçek hat görünür.
  return {
    success: true,
    routes: BUS_SNAPSHOT_ROUTES,
    lastUpdated: `van.bel.tr anlık görüntüsü (${BUS_SNAPSHOT_LAST_UPDATED}) — sunucuya ulaşılamadı, yenilemeyi deneyin`,
    source: 'van.bel.tr — yerel kopya (offline)',
    isLive: false,
  };
}
