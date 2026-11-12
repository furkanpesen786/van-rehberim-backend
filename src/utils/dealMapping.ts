import type { Deal } from '../types';
import type { RawDealDoc } from '../lib/firebase';

// M26 (15/17): Firestore ham dokümanı → uygulama modeli (Deal) dönüşümünün
// tek noktası. Önceden DealsView içinde satır içi duruyordu ve 5-6 alternatlı
// `??` zincirleriyle eski şema varyantlarını (storeName/baslik/oran/...)
// yakalamaya çalışıyordu. 12.11.2026 denetimi: koleksiyon boş, yazma yolu
// (server/listings.ts) canonical — bu yüzden eşleme yalnızca canonical alan
// adlarını okur, eksik alanlar için akıllı varsayılanlar koyar.

const DEFAULT_DEAL_IMAGE =
  'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=600&auto=format&fit=crop&q=80';

export function mapDealDoc(doc: RawDealDoc): Deal {
  return {
    id: doc.id,
    storeName: doc.isletmeAdi || 'Van İşletmesi',
    category: doc.kategori || 'Kafe & Restoran',
    dealTitle: doc.indirimKodu || doc.indirimDegeri || 'Özel Fırsat',
    discountRate: doc.indirimDegeri || '%20',
    image: doc.image || DEFAULT_DEAL_IMAGE,
    startDate: doc.startDate || '',
    endDate: doc.endDate || '',
    locationName: doc.locationName || 'İpekyolu, Van',
    address: '',
    description: doc.description || '',
    isFeatured: doc.isFeatured,
  };
}
