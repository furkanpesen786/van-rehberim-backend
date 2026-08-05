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
    const response = await fetch('https://van-rehberim-api.onrender.com/api/bus-schedules');
    if (response.ok) {
      const data = await response.json();
      if (data && data.success && Array.isArray(data.routes) && data.routes.length > 0) {
        return data;
      }
    }
  } catch (err) {
    // Silently fall back to standard BELVAN route schedule dataset
  }

  return {
    success: false,
    routes: BUS_ROUTES,
    lastUpdated: 'Van Bel.tr Standart',
    source: 'van.bel.tr (VAN BELVAN Ulaşım Dairesi)',
    isLive: false,
  };
}
