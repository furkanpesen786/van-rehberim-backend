import { BUS_ROUTES } from '../data/mockData';
import { BusRoute } from '../types';

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
    const timeoutId = setTimeout(() => controller.abort(), 60000);
    const response = await fetch('https://van-rehberim-api.onrender.com/api/bus-schedules', { signal: controller.signal });
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
  } catch (err: any) {
    console.error(`[busService] Ağ/Timeout Hatası:`, err.message || err);
  }

  return {
    success: false,
    routes: [],
    lastUpdated: 'Van Bel.tr Standart Hat Saatleri',
    source: 'van.bel.tr (VAN BELVAN Ulaşım Dairesi)',
    isLive: false,
  };
}
