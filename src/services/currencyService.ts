import { CURRENCY_RATES } from '../data/mockData';

export interface CurrencyItem {
  code: string;
  name: string;
  value: string;
  change: string;
  isUp: boolean;
  status: 'up' | 'down' | 'neutral';
  key: string;
}

export interface TableItem {
  key: string;
  name: string;
  value: string;
  change: string;
  status: 'up' | 'down' | 'neutral';
}

export interface LiveCurrencyResponse {
  success: boolean;
  heroRates: CurrencyItem[];
  tableItems: TableItem[];
  lastUpdated: string;
  source: string;
  isLive?: boolean;
}

export async function fetchLiveCurrencies(): Promise<LiveCurrencyResponse> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 60000);
    const response = await fetch(`${import.meta.env.VITE_API_URL || 'https://van-rehberim-api.onrender.com'}/api/currencies`, { signal: controller.signal });
    clearTimeout(timeoutId);
    if (response.ok) {
      const data = await response.json();
      if (data && data.success && data.heroRates) {
        return data;
      }
    } else {
      const errText = await response.text().catch(() => 'No Body');
      console.error(`[currencyService] Backend Yanıt Hatası - Status: ${response.status}`, errText);
    }
  } catch (err: any) {
    console.error(`[currencyService] Ağ/Timeout Hatası:`, err.message || err);
  }

  return {
    success: false,
    heroRates: [],
    tableItems: [],
    lastUpdated: 'Varsayılan',
    source: 'doviz.com (Yedek)',
    isLive: false,
  };
}
