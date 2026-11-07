import { NewsItem } from '../types';

export interface LiveNewsResponse {
  success: boolean;
  count: number;
  lastUpdated: string;
  source: string;
  channelsCount: number;
  news: NewsItem[];
  /** Sunucu canlı kaynaklara ulaşamayıp son başarılı sonucu sunuyorsa true */
  stale?: boolean;
}

/**
 * Canlı Van haberlerini backend'den çeker. M6: hata durumunda sessiz boş
 * sonuç döndürmek yerine, kullanıcıya gösterilebilecek Türkçe bir hata
 * fırlatır (NewsView catch bloğunda yakalar). Timeout 60 sn -> 15 sn.
 */
export async function fetchLiveVanNews(): Promise<LiveNewsResponse> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 15000);
  try {
    const response = await fetch(
      `${import.meta.env.VITE_API_URL || 'https://van-rehberim-api.onrender.com'}/api/news`,
      { signal: controller.signal },
    );
    if (!response.ok) {
      const data = await response.json().catch(() => null);
      throw new Error((data as { error?: string } | null)?.error
        || `Haber servisine ulaşılamadı (${response.status}).`);
    }
    const data = await response.json();
    if (data && data.success && Array.isArray(data.news)) {
      return data as LiveNewsResponse;
    }
    throw new Error((data as { error?: string } | null)?.error || 'Haberler alınamadı.');
  } catch (err: unknown) {
    if (err instanceof Error && err.name === 'AbortError') {
      throw new Error('Haber servisi zaman aşımına uğradı. İnternet bağlantınızı kontrol ediniz.');
    }
    throw err;
  } finally {
    clearTimeout(timeoutId);
  }
}
