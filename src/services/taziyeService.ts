import { DeathNotice } from '../types';

export interface LiveTaziyeResponse {
  success: boolean;
  count: number;
  lastUpdated: string;
  source: string;
  sourceUrl: string;
  isLive: boolean;
  notices: DeathNotice[];
}

export async function fetchLiveTaziyeler(): Promise<LiveTaziyeResponse> {
  try {
    const response = await fetch('https://van-rehberim-api.onrender.com/api/taziyeler?limit=30');
    if (response.ok) {
      const data = await response.json();
      if (data && data.success && Array.isArray(data.notices)) {
        return data;
      }
    }
  } catch (err) {
    console.warn('Live taziyeler fetch error from backend API:', err);
  }

  return {
    success: false,
    count: 0,
    lastUpdated: new Date().toLocaleDateString('tr-TR'),
    source: 'van.bel.tr (Van Büyükşehir Belediyesi Taziye Sistemleri)',
    sourceUrl: 'https://van.bel.tr/Taziyeler.html',
    isLive: false,
    notices: [],
  };
}
