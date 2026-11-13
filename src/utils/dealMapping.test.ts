import { describe, it, expect } from 'vitest';
import { mapDealDoc } from './dealMapping';

// M26 (15/17): canonical şema sözleşmesi — yazma yolu (server/listings.ts)
// hangi alanları yazıyorsa eşleme onları okur. Buradaki bir regresyon yeni
// ilanların uygulamada görünmemesine yol açar.

describe('mapDealDoc', () => {
  it('canonical alanları uygulama modeline eşler', () => {
    const deal = mapDealDoc({
      id: 'deal-1',
      isletmeAdi: 'Van Kafe',
      kategori: 'Kafe',
      indirimKodu: 'VAN50',
      indirimDegeri: '%50',
      image: 'https://ornek.com/gorsel.jpg',
      locationName: 'İpekyolu',
      description: 'Açıklama',
      startDate: '12.11.2026',
      endDate: '12.12.2026',
      isFeatured: true,
    });
    expect(deal).toEqual({
      id: 'deal-1',
      storeName: 'Van Kafe',
      category: 'Kafe',
      dealTitle: 'VAN50',
      discountRate: '%50',
      image: 'https://ornek.com/gorsel.jpg',
      // M29: yeni opsiyonel alanlar — yoklukta undefined / boş string
      images: undefined,
      indirimMetni: '',
      phone: '',
      startDate: '12.11.2026',
      endDate: '12.12.2026',
      locationName: 'İpekyolu',
      address: '',
      description: 'Açıklama',
      isFeatured: true,
    });
  });

  // M29: görsel listesi, kampanya metni ve telefon artık eşleniyor.
  it('M29: images listesi, indirimMetni ve phone eşlenir', () => {
    const deal = mapDealDoc({
      id: 'deal-5',
      isletmeAdi: 'Van Pastanesi',
      images: ['https://ornek.com/f1.jpg', 'https://ornek.com/f2.jpg'],
      indirimMetni: 'Tüm baklavalarda geçerli',
      phone: '0555 111 22 33',
    });
    expect(deal.images).toEqual(['https://ornek.com/f1.jpg', 'https://ornek.com/f2.jpg']);
    expect(deal.indirimMetni).toBe('Tüm baklavalarda geçerli');
    expect(deal.phone).toBe('0555 111 22 33');
  });

  it('M29: kapak görseli image yoksa images[0] olur; boş listede varsayılan', () => {
    const withList = mapDealDoc({ id: 'deal-6', images: ['https://ornek.com/kapak.jpg'] });
    expect(withList.image).toBe('https://ornek.com/kapak.jpg');
    const emptyList = mapDealDoc({ id: 'deal-7', images: [] });
    expect(emptyList.image).toContain('images.unsplash.com');
    expect(emptyList.images).toBeUndefined();
  });

  it('boş dokümanda akıllı varsayılanlar koyar', () => {
    const deal = mapDealDoc({ id: 'deal-2' });
    expect(deal.storeName).toBe('Van İşletmesi');
    expect(deal.category).toBe('Kafe & Restoran');
    expect(deal.dealTitle).toBe('Özel Fırsat');
    expect(deal.discountRate).toBe('%20');
    expect(deal.image).toContain('images.unsplash.com');
    expect(deal.locationName).toBe('İpekyolu, Van');
    expect(deal.description).toBe('');
    expect(deal.address).toBe('');
  });

  it('indirimKodu yoksa başlık için indirimDegeri değerine düşer', () => {
    const deal = mapDealDoc({ id: 'deal-3', indirimDegeri: '%25' });
    expect(deal.dealTitle).toBe('%25');
    expect(deal.discountRate).toBe('%25');
  });

  it('isFeatured tanımsızsa tanımsız kalır (opsiyonel alan)', () => {
    const deal = mapDealDoc({ id: 'deal-4' });
    expect(deal.isFeatured).toBeUndefined();
  });
});
