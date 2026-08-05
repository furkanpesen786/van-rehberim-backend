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
    const response = await fetch('https://van-rehberim-api.onrender.com/api/news?limit=30');
    if (response.ok) {
      const data = await response.json();
      if (data && data.success && Array.isArray(data.news)) {
        return data;
      }
    }
  } catch (err) {
    console.warn('Live news fetch error from backend API:', err);
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
