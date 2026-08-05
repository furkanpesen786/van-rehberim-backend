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
    const response = await fetch('https://van-rehberim-api.onrender.com/api/currencies');
    if (response.ok) {
      const data = await response.json();
      if (data && data.success && data.heroRates) {
        return data;
      }
    }
  } catch (err) {
    console.warn('Live currencies fetch error, using fallback:', err);
  }

  // Fallback map
  const fallbackHeroRates: CurrencyItem[] = CURRENCY_RATES.map((c, i) => ({
    code: c.code,
    name: c.name,
    value: c.value,
    change: c.change,
    isUp: c.isUp,
    status: c.isUp ? 'up' : 'down',
    key: `fallback-${i}`,
  }));

  return {
    success: false,
    heroRates: fallbackHeroRates,
    tableItems: [],
    lastUpdated: 'Varsayılan',
    source: 'doviz.com (Yedek)',
    isLive: false,
  };
}
