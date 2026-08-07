import { NewsItem } from '../types';

export interface LiveNewsResponse {
  success: boolean;
  count: number;
  lastUpdated: string;
  source: string;
  channelsCount: number;
  news: NewsItem[];
}

export async function fetchLiveVanNews(): Promise<LiveNewsResponse> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 60000);
    const response = await fetch('https://van-rehberim-api.onrender.com/api/news?limit=30', { signal: controller.signal });
    clearTimeout(timeoutId);
    if (response.ok) {
      const data = await response.json();
      if (data && data.success && Array.isArray(data.news)) {
        return data;
      }
    } else {
      const errText = await response.text().catch(() => 'No Body');
      console.error(`[newsService] Backend Yanıt Hatası - Status: ${response.status}`, errText);
    }
  } catch (err: any) {
    console.error(`[newsService] Ağ/Timeout Hatası:`, err.message || err);
  }

  return {
    success: false,
    count: 0,
    lastUpdated: new Date().toLocaleDateString('tr-TR'),
    source: 'Van Haber Kanalları',
    channelsCount: 7,
    news: [],
  };
}
