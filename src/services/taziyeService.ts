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
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 60000);
    const response = await fetch('https://van-rehberim-api.onrender.com/api/taziyeler?limit=30', { signal: controller.signal });
    clearTimeout(timeoutId);
    if (response.ok) {
      const data = await response.json();
      if (data && data.success && Array.isArray(data.notices)) {
        return data;
      }
    } else {
      const errText = await response.text().catch(() => 'No Body');
      console.error(`[taziyeService] Backend Yanıt Hatası - Status: ${response.status}`, errText);
    }
  } catch (err: any) {
    console.error(`[taziyeService] Ağ/Timeout Hatası:`, err.message || err);
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
