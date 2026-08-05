import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { subscribeDeals, addDealToFirestore } from '../lib/firebase';
import { PurchaseService, PACKAGE_IDS } from '../services/purchaseService';
import {
  Search,
  Bookmark,
  MapPin,
  Calendar,
  ChevronLeft,
  Navigation,
  Star,
  Plus,
  Camera,
  X,
  ImagePlus,
  CheckCircle2,
  Megaphone,
  ArrowRight
} from 'lucide-react';

interface DealsViewProps {
  theme?: 'light' | 'dark';
}

interface PackageOption {
  days: number;
  price: number;
  label: string;
}

const PUBLISH_PACKAGES: PackageOption[] = [
  { days: 3, price: 99.99, label: '3 Gün' },
  { days: 7, price: 199.99, label: '7 Gün' },
  { days: 15, price: 299.99, label: '15 Gün' },
  { days: 30, price: 499.99, label: '30 Gün' },
];

const HIGHLIGHT_PACKAGES: PackageOption[] = [
  { days: 1, price: 19.99, label: '1 Gün' },
  { days: 3, price: 29.99, label: '3 Gün' },
  { days: 7, price: 49.99, label: '7 Gün' },
  { days: 15, price: 89.99, label: '15 Gün' },
  { days: 30, price: 169.99, label: '30 Gün' },
];

export const DealsView: React.FC<DealsViewProps> = ({ theme = 'light' }) => {
  const { currentUser } = useAuth();
  const [dealsList, setDealsList] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Subscribe to Firebase Firestore live deals
  useEffect(() => {
    const unsub = subscribeDeals((firestoreDeals) => {
      if (Array.isArray(firestoreDeals)) {
        const mappedDeals = firestoreDeals.map((d: any) => {
          // KORUMA KALKANI: Firebase Timestamp objelerini (seconds, nanoseconds) bulup düz metne çevirir
          const safeData = { ...d };
          Object.keys(safeData).forEach(key => {
            if (safeData[key] && typeof safeData[key] === 'object' && 'seconds' in safeData[key]) {
              safeData[key] = new Date(safeData[key].seconds * 1000).toLocaleDateString('tr-TR');
            }
          });

          return {
            ...safeData,
            storeName: safeData?.isletmeAdi ?? safeData?.storeName ?? 'Van İşletmesi',
            dealTitle: safeData?.indirimKodu ?? safeData?.dealTitle ?? safeData?.indirimDegeri ?? 'Özel Fırsat',
            discountRate: safeData?.indirimDegeri ?? safeData?.discountRate ?? '%20',
            category: safeData?.kategori ?? safeData?.category ?? 'Kafe & Restoran',
            image: safeData?.image ?? (safeData?.images && safeData?.images[0]) ?? 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=600&auto=format&fit=crop&q=80',
            locationName: safeData?.locationName ?? safeData?.district ?? 'İpekyolu, Van',
          };
        });
        setDealsList(mappedDeals);
      }
      setIsLoading(false);
    });
    return () => unsub();
  }, []);

  const [selectedCategory, setSelectedCategory] = useState<string>('Tümü');
  
  // LocalStorage Array Koruması
  const [savedDeals, setSavedDeals] = useState<string[]>(() => {
    try {
      const stored = localStorage.getItem('saved_deals_van');
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch (e) {
      console.error('LocalStorage Okuma Hatası:', e);
    }
    return ['d-1', 'd-4'];
  });

  useEffect(() => {
    try {
      localStorage.setItem('saved_deals_van', JSON.stringify(savedDeals));
      window.dispatchEvent(new Event('van_saved_deals_changed'));
    } catch (e) {
      console.error(e);
    }
  }, [savedDeals]);

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDeal, setSelectedDeal] = useState<any | null>(null);
  const [showSavedOnly, setShowSavedOnly] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const [isPublishing, setIsPublishing] = useState(false);
  const [startDate, setStartDate] = useState('01.08.2026');
  const [endDate, setEndDate] = useState('31.08.2026');
  const [category, setCategory] = useState('Kafe & Restoran');
  const [discountAmount, setDiscountAmount] = useState('% 20');
  const [discountText, setDiscountText] = useState('');
  const [location, setLocation] = useState('İpekyolu, Van');
  const [storeName, setStoreName] = useState('');
  const [dealTitle, setDealTitle] = useState('');
  const [description, setDescription] = useState('');
  const [uploadedPhotos, setUploadedPhotos] = useState<string[]>([]);

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files) return;
    const files = Array.from(e.target.files) as File[];
    const availableSlots = 5 - uploadedPhotos.length;
    const selectedFiles = files.slice(0, availableSlots);

    selectedFiles.forEach((file) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        if (typeof reader.result === 'string') {
          setUploadedPhotos((prev) => (prev.length >= 5 ? prev : [...prev, reader.result as string]));
        }
      };
      reader.readAsDataURL(file);
    });
    e.target.value = '';
  };

  const handleRemovePhoto = (index: number) => {
    setUploadedPhotos((prev) => prev.filter((_, i) => i !== index));
  };

  const SAMPLE_PRESET_IMAGES = [
    'https://images.unsplash.com/photo-1554118811-1e0d58224f24?w=600&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1559925393-8be0ec4767c8?w=600&auto=format&fit=crop&q=80',
  ];

  const handleAddSamplePhoto = () => {
    if (uploadedPhotos.length >= 5) return;
    const nextSample = SAMPLE_PRESET_IMAGES[uploadedPhotos.length % SAMPLE_PRESET_IMAGES.length];
    setUploadedPhotos((prev) => [...prev, nextSample]);
  };

  const [selectedPublishPkg] = useState<PackageOption | null>(PUBLISH_PACKAGES[3]);
  const [selectedHighlightPkg] = useState<PackageOption | null>(HIGHLIGHT_PACKAGES[4]);
  const [showPlayModal, setShowPlayModal] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  const isDark = theme === 'dark';
  const categories = ['Tümü', 'Kafe & Restoran', 'Giyim', 'Hizmet', 'Gıda & Fırın', 'Market', 'Yemek', 'Diğer'];

  const toggleBookmark = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!id) return;
    setSavedDeals(prev => Array.isArray(prev) ? (prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]) : [id]);
  };

  // Arama & Filtreleme Kalkanı (toLowerCase hataları giderildi)
  const filteredDeals = Array.isArray(dealsList) ? dealsList.filter(deal => {
    if (!deal) return false;
    
    const sName = String(deal.storeName || '');
    const dTitle = String(deal.dealTitle || '');
    const searchVal = String(searchQuery || '').toLowerCase();
    
    const matchesCat = selectedCategory === 'Tümü' || deal.category === selectedCategory;
    const matchesSearch = sName.toLowerCase().includes(searchVal) || dTitle.toLowerCase().includes(searchVal);
    const matchesSaved = showSavedOnly ? (Array.isArray(savedDeals) && savedDeals.includes(deal.id)) : true;
    
    return matchesCat && matchesSearch && matchesSaved;
  }) : [];

  const totalPrice = (selectedPublishPkg?.price || 0) + (selectedHighlightPkg?.price || 0);

  // Güvenli Asenkron Yükleme Kaydı
  const handleFinalPurchase = async () => {
    setIsProcessing(true);
    try {
      await PurchaseService.purchasePackage({
        product: { identifier: selectedHighlightPkg ? PACKAGE_IDS.ONE_CIKAN_30_GUN : PACKAGE_IDS.ILAN_30_GUN }
      });
    } catch (e: any) {
      alert(e.message);
      setIsProcessing(false);
      return;
    }

    const defaultImage = 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=600&auto=format&fit=crop&q=80';
    
    // Saf String Koruması
    const safeStoreName = String(storeName || '').trim() || 'Yeni Van Esnafı';
    const safeDealTitle = String(dealTitle || '').trim() || 'İndirim Fırsatı';
    const safeDiscountAmount = String(discountAmount || '');
    
    const dealPayload = {
      isletmeAdi: safeStoreName,
      kategori: String(category || 'Diğer'),
      indirimKodu: safeDealTitle,
      indirimDegeri: safeDiscountAmount.includes('%') ? safeDiscountAmount : `%${safeDiscountAmount}`,
      image: uploadedPhotos.length > 0 ? uploadedPhotos[0] : defaultImage,
      locationName: String(location || 'İpekyolu, Van'),
      startDate: String(startDate || ''),
      endDate: String(endDate || ''),
      description: String(description || '').trim() || `${safeStoreName} işletmesinde geçerli özel kampanya.`,
      isFeatured: Boolean(selectedHighlightPkg),
      userEmail: String(currentUser?.email || 'anonim@van.rehberim'),
      userId: String(currentUser?.uid || ''),
    };

    try {
      await addDealToFirestore(dealPayload);
      setIsProcessing(false);
      setShowPlayModal(false);
      setIsPublishing(false);
      setUploadedPhotos([]);
      setToastMessage('🎉 İlanınız başarıyla yayınlandı!');
      setTimeout(() => setToastMessage(null), 4000);
    } catch (err: any) {
      setIsProcessing(false);
      alert('Hata: ' + (err.message || err));
    }
  };

  return (
    <div className={`min-h-screen pb-28 font-sans ${isDark ? 'bg-[#141518] text-white' : 'bg-slate-50 text-slate-800'}`}>
      {toastMessage && (
        <div className="fixed top-5 left-1/2 -translate-x-1/2 z-50 bg-emerald-600 text-white px-5 py-3 rounded-2xl shadow-2xl flex items-center gap-2 font-bold text-xs animate-bounce">
          <CheckCircle2 className="w-5 h-5 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      {isPublishing ? (
        <div className={`max-w-md mx-auto min-h-screen pb-32 ${isDark ? 'bg-[#121316] text-white' : 'bg-slate-50 text-slate-800'}`}>
          <div className={`px-5 py-4 flex items-center gap-3 border-b sticky top-0 z-30 backdrop-blur-md ${isDark ? 'border-slate-800 bg-[#121316]/95' : 'border-slate-200 bg-white/95'}`}>
            <button onClick={() => setIsPublishing(false)} className="p-1.5 rounded-full">
              <ChevronLeft className="w-6 h-6 stroke-[2.5]" />
            </button>
            <h1 className="text-xl font-bold">İndirim İlanı Ver</h1>
          </div>

          <div className="px-4 pt-4 space-y-4 text-xs">
            <div className={`p-4 rounded-3xl border space-y-3 ${isDark ? 'bg-[#1b1c21] border-slate-800' : 'bg-white border-slate-200'}`}>
              <div>
                <label className="font-bold block mb-1">Mağaza / İşletme Adı</label>
                <input
                  type="text"
                  value={storeName}
                  onChange={(e) => setStoreName(e.target.value)}
                  placeholder="Örn: Van Kahve Dükkanı"
                  className={`w-full border rounded-2xl p-3 focus:outline-none ${isDark ? 'bg-[#24262c] border-slate-700 text-white' : 'bg-slate-50 border-slate-200'}`}
                />
              </div>
              <div>
                <label className="font-bold block mb-1">İlan Başlığı</label>
                <input
                  type="text"
                  value={dealTitle}
                  onChange={(e) => setDealTitle(e.target.value)}
                  placeholder="Örn: %20 İndirim"
                  className={`w-full border rounded-2xl p-3 focus:outline-none ${isDark ? 'bg-[#24262c] border-slate-700 text-white' : 'bg-slate-50 border-slate-200'}`}
                />
              </div>
            </div>
            
            <div className={`p-4 rounded-3xl border space-y-3 ${isDark ? 'bg-[#1b1c21] border-slate-800' : 'bg-white border-slate-200'}`}>
               <label className="font-bold block mb-1">İndirim Değeri / Miktarı</label>
               <div className={`flex items-center gap-2 border rounded-2xl p-3 ${isDark ? 'bg-[#24262c] border-slate-700' : 'bg-slate-50 border-slate-200'}`}>
                 <span className="text-slate-400 font-bold">%</span>
                 <input
                   type="text"
                   value={String(discountAmount || '').replace('%', '').trim()}
                   onChange={(e) => setDiscountAmount(`% ${e.target.value}`)}
                   placeholder="20"
                   className={`w-full bg-transparent font-bold text-sm focus:outline-none ${isDark ? 'text-white' : 'text-slate-900'}`}
                 />
               </div>
            </div>

            <div className={`p-4 rounded-3xl border space-y-3 ${isDark ? 'bg-[#1b1c21] border-slate-800' : 'bg-white border-slate-200'}`}>
              <div className="flex items-center justify-between">
                <span className="font-bold">Fotoğraflar ({uploadedPhotos.length}/5)</span>
              </div>
              <div className="grid grid-cols-3 gap-2">
                {uploadedPhotos.map((photo, idx) => (
                  <div key={idx} className="relative aspect-square rounded-xl overflow-hidden bg-black">
                    <img src={photo} alt="" className="w-full h-full object-cover" />
                    <button onClick={() => handleRemovePhoto(idx)} className="absolute top-1 right-1 bg-red-600 text-white p-1 rounded-full">
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ))}
                {uploadedPhotos.length < 5 && (
                  <label className={`aspect-square rounded-xl border-2 border-dashed flex flex-col items-center justify-center cursor-pointer ${isDark ? 'border-slate-700 bg-[#24262c]' : 'border-slate-300 bg-slate-50'}`}>
                    <input type="file" accept="image/*" multiple onChange={handlePhotoUpload} className="hidden" />
                    <ImagePlus className="w-5 h-5 text-slate-400" />
                  </label>
                )}
              </div>
              {uploadedPhotos.length < 5 && (
                <button type="button" onClick={handleAddSamplePhoto} className="w-full py-2 font-bold text-[11px] rounded-xl border bg-emerald-50 text-emerald-700">
                  + Örnek Görsel Ekle
                </button>
              )}
            </div>
          </div>

          <div className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-md p-4 border-t bg-emerald-900 z-40">
            <button onClick={() => { if (!storeName) alert('Mağaza adı giriniz'); else setShowPlayModal(true); }} className="w-full bg-emerald-600 text-white font-black py-3 rounded-xl flex items-center justify-center gap-2">
              <Megaphone className="w-5 h-5" /> Yayınla (₺{totalPrice.toFixed(2)})
            </button>
          </div>
        </div>
      ) : selectedDeal ? (
        <div className={`max-w-md mx-auto min-h-screen flex flex-col justify-between ${isDark ? 'bg-[#141518]' : 'bg-slate-50'}`}>
          <div>
            <div className={`p-4 flex items-center justify-between border-b ${isDark ? 'bg-[#1b1c21] border-slate-800' : 'bg-white border-slate-200'}`}>
              <button onClick={() => setSelectedDeal(null)} className="p-2"><ChevronLeft className="w-6 h-6" /></button>
              <h2 className="text-lg font-bold">İndirim Detayı</h2>
              <button onClick={(e) => toggleBookmark(selectedDeal.id, e)} className="p-2"><Bookmark className={`w-5 h-5 ${Array.isArray(savedDeals) && savedDeals.includes(selectedDeal.id) ? 'fill-emerald-600 text-emerald-600' : ''}`} /></button>
            </div>
            <div className="relative w-full h-72 bg-black">
              <img src={selectedDeal.image} alt="" className="w-full h-full object-cover" />
              <div className="absolute top-4 left-4 bg-red-600 text-white font-bold text-xs px-3 py-1 rounded-full uppercase">
                {selectedDeal.discountRate}
              </div>
            </div>
            <div className="p-5 space-y-3">
              <h1 className="text-2xl font-bold">{selectedDeal.storeName}</h1>
              <p className="text-sm font-semibold uppercase">{selectedDeal.dealTitle}</p>
              <p className="text-xs text-slate-400">{selectedDeal.description}</p>
            </div>
          </div>
          <div className="p-5">
            <a href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(String(selectedDeal.storeName || '') + ' Van')}`} target="_blank" rel="noreferrer" className="w-full bg-emerald-600 text-white font-bold py-3.5 rounded-2xl flex items-center justify-center gap-2">
              <Navigation className="w-5 h-5" /> KONUMA GİT
            </a>
          </div>
        </div>
      ) : (
        <div className="max-w-md mx-auto px-4 pt-4">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-xl font-black">VAN REHBERİM</h1>
            <button onClick={() => setShowSavedOnly(!showSavedOnly)} className={`p-2 rounded-full border ${showSavedOnly ? 'bg-emerald-600 text-white' : ''}`}>
              <Bookmark className="w-5 h-5" />
            </button>
          </div>

          <div className="relative mb-4">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Mağaza ara..."
              className={`w-full border rounded-2xl py-3 pl-11 pr-4 text-xs ${isDark ? 'bg-[#1b1c21] border-slate-800 text-white' : 'bg-white border-slate-200'}`}
            />
            <Search className="w-4 h-4 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2" />
          </div>

          <div className="flex gap-2 overflow-x-auto pb-3 mb-4 scrollbar-none">
            {categories.map((cat, idx) => (
              <button key={idx} onClick={() => setSelectedCategory(cat)} className={`px-4 py-2 rounded-full text-xs font-bold whitespace-nowrap border ${selectedCategory === cat ? 'bg-emerald-600 text-white border-emerald-500' : 'bg-slate-100 text-slate-600 border-slate-200'}`}>
                {cat}
              </button>
            ))}
          </div>

          <div className="space-y-4">
            {isLoading ? (
              <div className="text-center py-10 text-xs font-bold">Yükleniyor...</div>
            ) : filteredDeals.map((deal) => (
              <div key={deal.id} onClick={() => setSelectedDeal(deal)} className={`rounded-3xl p-4 border cursor-pointer flex gap-3 ${isDark ? 'bg-[#1b1c21] border-slate-800' : 'bg-white border-slate-200'}`}>
                <div className="relative w-28 h-28 shrink-0 rounded-2xl overflow-hidden bg-black">
                  <img src={deal.image} alt="" className="w-full h-full object-cover" />
                  <div className="absolute bottom-1 left-1 bg-red-600 text-white text-[9px] font-black px-2 py-0.5 rounded uppercase">
                    {deal.discountRate}
                  </div>
                </div>
                <div className="flex-1 flex flex-col justify-between">
                  <div>
                    <h3 className="font-bold text-base">{deal.storeName}</h3>
                    <p className="text-xs font-semibold uppercase mt-0.5">{deal.dealTitle}</p>
                  </div>
                  <div className="text-[10px] text-slate-400 flex items-center gap-1">
                    <MapPin className="w-3 h-3" /> {deal.locationName}
                  </div>
                </div>
              </div>
            ))}
            {!isLoading && filteredDeals.length === 0 && (
              <div className="text-center p-8 border rounded-3xl text-xs font-bold">İlan bulunamadı.</div>
            )}
          </div>

          <div className="fixed bottom-20 right-6 z-30">
            <button onClick={() => setIsPublishing(true)} className="w-14 h-14 bg-emerald-600 text-white rounded-full flex items-center justify-center shadow-xl">
              <Plus className="w-7 h-7 stroke-[2.5]" />
            </button>
          </div>
        </div>
      )}

      {showPlayModal && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-[#2D1B15] border border-[#5D4037] rounded-3xl p-6 text-white space-y-4">
            <h3 className="text-base font-bold text-[#F5E6D3]">Ödeme Onayı</h3>
            <button onClick={handleFinalPurchase} disabled={isProcessing} className="w-full bg-[#D4AF37] text-black font-black py-3.5 rounded-full">
              {isProcessing ? 'İşleniyor...' : 'Ödemeyi Tamamla'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};