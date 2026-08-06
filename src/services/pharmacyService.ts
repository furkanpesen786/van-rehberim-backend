import { Pharmacy } from '../types';
import { PHARMACIES } from '../data/mockData';

export interface DutyPharmaciesResponse {
  success: boolean;
  dutyDate: string;
  count: number;
  vanCount: number;
  lastUpdated: string;
  source: string;
  pharmacies: Pharmacy[];
}

export async function fetchLivePharmacies(): Promise<DutyPharmaciesResponse> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 60000);
    const response = await fetch('https://van-rehberim-backend.onrender.com/api/pharmacies', { signal: controller.signal });
    clearTimeout(timeoutId);
    if (response.ok) {
      const data = await response.json();
      if (data && data.success && Array.isArray(data.pharmacies)) {
        return data;
      }
    } else {
      const errText = await response.text().catch(() => 'No Body');
      console.error(`[pharmacyService] Backend Yanıt Hatası - Status: ${response.status}`, errText);
    }
  } catch (err: any) {
    console.error(`[pharmacyService] Ağ/Timeout Hatası:`, err.message || err);
  }

  // Fallback
  return {
    success: false,
    dutyDate: 'Bugün',
    count: PHARMACIES.length,
    vanCount: PHARMACIES.length,
    lastUpdated: 'Yerel',
    source: 'Van Eczacı Odası',
    pharmacies: PHARMACIES,
  };
}
