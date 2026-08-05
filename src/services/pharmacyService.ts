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
    const response = await fetch('https://van-rehberim-api.onrender.com/api/pharmacies');
    if (response.ok) {
      const data = await response.json();
      if (data && data.success && Array.isArray(data.pharmacies)) {
        return data;
      }
    }
  } catch (err) {
    console.warn('Live pharmacies fetch error from server API, using fallback:', err);
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
