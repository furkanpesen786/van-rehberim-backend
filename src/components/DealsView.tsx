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

  const [selectedPublishPkg, setSelectedPublishPkg] = useState<PackageOption | null>(PUBLISH_PACKAGES[3]);
  const [selectedHighlightPkg, setSelectedHighlightPkg] = useState<PackageOption | null>(HIGHLIGHT_PACKAGES[4]);
  const [showPlayModal, setShowPlayModal] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  // New UI states needed for the complex form
  const [discountType, setDiscountType] = useState('Yüzde (%) İndirim');
  const [contactNumber, setContactNumber] = useState('');

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

          <div className="px-4 pt-4 pb-32 space-y-4 text-xs font-medium">
            {/* 1. Temel Bilgiler */}
            <div className={`p-5 rounded-3xl space-y-4 shadow-sm ${isDark ? 'bg-[#1b1c21]' : 'bg-white'}`}>
              <div>
                <label className="font-bold block mb-2 text-sm">Mağaza / İşletme Adı</label>
                <input
                  type="text"
                  value={storeName}
                  onChange={(e) => setStoreName(e.target.value)}
                  placeholder="Örn: Van Kahve Dükkanı"
                  className={`w-full rounded-2xl p-4 font-semibold text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/50 ${isDark ? 'bg-[#24262c] text-white' : 'bg-slate-50 text-slate-900 border border-slate-100'}`}
                />
              </div>
              <div>
                <label className="font-bold block mb-2 text-sm">İlan Başlığı</label>
                <input
                  type="text"
                  value={dealTitle}
                  onChange={(e) => setDealTitle(e.target.value)}
                  placeholder="Örn: Tüm Kahve Çeşitlerinde %20 İndirim"
                  className={`w-full rounded-2xl p-4 font-semibold text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/50 ${isDark ? 'bg-[#24262c] text-white' : 'bg-slate-50 text-slate-900 border border-slate-100'}`}
                />
              </div>
            </div>

            {/* 2. Fotoğraflar */}
            <div className={`p-5 rounded-3xl space-y-4 shadow-sm ${isDark ? 'bg-[#1b1c21]' : 'bg-white'}`}>
              <div className="flex items-center justify-between">
                <span className="font-bold text-sm flex items-center gap-2"><Camera className="w-5 h-5 text-emerald-600" /> İşletme / İlan Fotoğrafları</span>
                <span className="bg-slate-100 text-slate-600 px-3 py-1 rounded-full text-xs font-bold">{uploadedPhotos.length} / 5 Fotoğraf</span>
              </div>
              <p className="text-xs text-slate-400">İşletmenizi veya kampanya ürünlerinizi temsil eden en fazla 5 adet fotoğraf ekleyebilirsiniz.</p>

              <div className="grid grid-cols-3 gap-3">
                {uploadedPhotos.length < 5 && (
                  <label className={`aspect-square rounded-2xl border-2 border-dashed flex flex-col items-center justify-center cursor-pointer transition-colors ${isDark ? 'border-slate-700 bg-[#24262c] hover:border-emerald-500' : 'border-slate-300 bg-slate-50 hover:border-emerald-500'}`}>
                    <input type="file" accept="image/*" multiple onChange={handlePhotoUpload} className="hidden" />
                    <ImagePlus className="w-6 h-6 text-slate-400 mb-2" />
                    <span className="text-[10px] font-bold text-slate-400">Fotoğraf Ekle</span>
                  </label>
                )}
                {uploadedPhotos.map((photo, idx) => (
                  <div key={idx} className="relative aspect-square rounded-2xl overflow-hidden bg-black shadow-md">
                    <img src={photo} alt="" className="w-full h-full object-cover" />
                    <button onClick={() => handleRemovePhoto(idx)} className="absolute top-2 right-2 bg-red-600/90 backdrop-blur-sm text-white p-1.5 rounded-full z-10 shadow-lg">
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
              {uploadedPhotos.length < 5 && (
                <button type="button" onClick={handleAddSamplePhoto} className="w-full py-3 font-bold text-xs rounded-2xl bg-emerald-50 text-emerald-700 hover:bg-emerald-100 transition-colors">
                  + Örnek Görsel Ekle (+1)
                </button>
              )}
            </div>

            {/* 3. Tarih */}
            <div className={`p-5 rounded-3xl flex items-center gap-4 shadow-sm ${isDark ? 'bg-[#1b1c21]' : 'bg-white'}`}>
              <div className="flex-1">
                <label className="font-bold block mb-2 text-sm text-slate-500">Başlangıç</label>
                <div className={`flex items-center gap-2 p-3.5 rounded-2xl ${isDark ? 'bg-[#24262c]' : 'bg-slate-50 border border-slate-100'}`}>
                  <Calendar className="w-4 h-4 text-slate-400" />
                  <input type="text" value={startDate} onChange={e => setStartDate(e.target.value)} className="bg-transparent w-full font-bold text-sm outline-none" />
                </div>
              </div>
              <div className="flex-1">
                <label className="font-bold block mb-2 text-sm text-slate-500">Bitiş</label>
                <div className={`flex items-center gap-2 p-3.5 rounded-2xl ${isDark ? 'bg-[#24262c]' : 'bg-slate-50 border border-slate-100'}`}>
                  <Calendar className="w-4 h-4 text-slate-400" />
                  <input type="text" value={endDate} onChange={e => setEndDate(e.target.value)} className="bg-transparent w-full font-bold text-sm outline-none" />
                </div>
              </div>
            </div>

            {/* 4. Kategori */}
            <div className={`p-5 rounded-3xl shadow-sm ${isDark ? 'bg-[#1b1c21]' : 'bg-white'}`}>
              <label className="font-bold block mb-3 text-sm">Kategori</label>
              <div className="flex flex-wrap gap-2">
                {categories.filter(c => c !== 'Tümü').map((cat) => (
                  <button
                    key={cat}
                    onClick={() => setCategory(cat)}
                    className={`px-4 py-2.5 rounded-full text-xs font-bold transition-all ${category === cat ? 'bg-[#0A1128] text-white shadow-md' : isDark ? 'bg-[#24262c] text-white' : 'bg-slate-50 text-slate-500 border border-slate-100 hover:bg-slate-100'}`}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>

            {/* 5. İndirim Detayları */}
            <div className={`p-5 rounded-3xl space-y-5 shadow-sm ${isDark ? 'bg-[#1b1c21]' : 'bg-white'}`}>
              <div>
                <label className="font-bold block mb-3 text-sm">İndirim Türü</label>
                <div className="flex gap-2">
                  <button onClick={() => setDiscountType('Yüzde (%) İndirim')} className={`flex-1 py-3 px-2 rounded-2xl font-bold text-sm transition-colors border ${discountType === 'Yüzde (%) İndirim' ? 'bg-emerald-100 text-emerald-800 border-emerald-300' : isDark ? 'bg-[#24262c] border-transparent' : 'bg-slate-50 text-slate-600 border-slate-100'}`}>Yüzde (%) İndirim</button>
                  <button onClick={() => setDiscountType('Özel Kampanya')} className={`flex-1 py-3 px-2 rounded-2xl font-bold text-sm transition-colors border ${discountType === 'Özel Kampanya' ? 'bg-emerald-100 text-emerald-800 border-emerald-300' : isDark ? 'bg-[#24262c] border-transparent' : 'bg-slate-50 text-slate-600 border-slate-100'}`}>Özel Kampanya</button>
                </div>
              </div>

              <div>
                <label className="font-bold block mb-2 text-sm text-slate-500">İndirim Değeri / Miktarı</label>
                <div className={`flex items-center gap-2 rounded-2xl p-4 ${isDark ? 'bg-[#24262c]' : 'bg-slate-50 border border-slate-100'}`}>
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

              <div>
                <label className="font-bold block mb-2 text-sm text-slate-300">İndirim Kodu / Metni</label>
                <div className={`flex items-center gap-2 rounded-2xl p-4 bg-[#392518] text-[#D8B498]`}>
                  <span className="font-bold">#</span>
                  <input
                    type="text"
                    value={discountText}
                    onChange={(e) => setDiscountText(e.target.value)}
                    placeholder="Örn: REHBERİM20 veya Kış Fırsatı"
                    className="w-full bg-transparent font-bold text-sm focus:outline-none placeholder:text-[#8D6F59]"
                  />
                </div>
              </div>
            </div>

            {/* 6. Konum ve İletişim */}
            <div className={`p-5 rounded-3xl space-y-4 shadow-sm ${isDark ? 'bg-[#1b1c21]' : 'bg-white'}`}>
              <div>
                <label className="font-bold block mb-2 text-sm text-slate-500">Konum</label>
                <div className={`flex items-center gap-3 p-4 rounded-2xl ${isDark ? 'bg-[#24262c]' : 'bg-slate-50 border border-slate-100'}`}>
                  <MapPin className="w-5 h-5 text-slate-400" />
                  <input type="text" value={location} onChange={e => setLocation(e.target.value)} className="bg-transparent w-full font-bold text-sm outline-none" />
                </div>
              </div>
              <div>
                <label className="font-bold block mb-2 text-sm text-slate-500">İletişim Numarası</label>
                <div className={`flex items-center gap-3 p-4 rounded-2xl ${isDark ? 'bg-[#24262c]' : 'bg-slate-50 border border-slate-100'}`}>
                  <svg className="w-5 h-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"></path></svg>
                  <input type="text" value={contactNumber} onChange={e => setContactNumber(e.target.value)} placeholder="0532 123 45 67" className="bg-transparent w-full font-bold text-sm outline-none" />
                </div>
              </div>
            </div>

            {/* 7. Publish Packages */}
            <div className="grid grid-cols-2 gap-3 pt-2">
              {PUBLISH_PACKAGES.map((pkg) => (
                <div
                  key={pkg.days}
                  onClick={() => setSelectedPublishPkg(pkg)}
                  className={`p-4 rounded-3xl border-2 flex flex-col items-center justify-center cursor-pointer transition-all ${selectedPublishPkg?.days === pkg.days ? 'border-[#0A1128] bg-[#0A1128] text-white shadow-xl scale-[1.02]' : isDark ? 'border-slate-800 bg-[#1b1c21] hover:border-slate-700' : 'border-slate-100 bg-white hover:border-slate-300'}`}
                >
                  <div className="text-sm font-semibold opacity-90">{pkg.label}</div>
                  <div className="text-lg font-black mt-1">₺{pkg.price.toFixed(2).replace('.', ',')}</div>
                </div>
              ))}
            </div>

            {/* 8. Highlight Packages */}
            <div className={`p-5 rounded-3xl shadow-sm border ${isDark ? 'bg-[#1b1c21] border-slate-800' : 'bg-white border-yellow-400'}`}>
              <div className="flex items-center gap-3 mb-1">
                <Star className="w-6 h-6 fill-orange-400 text-orange-400" />
                <h3 className="font-bold text-lg text-slate-800 dark:text-white">İlanınızı Öne Çıkarın</h3>
              </div>
              <p className="text-[11px] text-slate-500 mb-4 pl-9">İlanınızın daha fazla kişiye ulaşması için bir paket seçin.</p>

              <div className={`p-3.5 rounded-xl flex items-center justify-between mb-4 border ${isDark ? 'bg-[#24262c] border-slate-700' : 'bg-slate-50 border-slate-200'}`}>
                <span className="font-bold text-sm text-slate-700 dark:text-slate-300">Seçilen: {selectedHighlightPkg ? `${selectedHighlightPkg.label} (₺${selectedHighlightPkg.price.toFixed(2).replace('.', ',')})` : 'Yok'}</span>
                <ChevronLeft className="w-4 h-4 text-slate-400 rotate-90" />
              </div>

              <div className="grid grid-cols-2 gap-3">
                {HIGHLIGHT_PACKAGES.slice(0, 4).map((pkg) => (
                  <div
                    key={pkg.days}
                    onClick={() => setSelectedHighlightPkg(pkg)}
                    className={`p-4 rounded-3xl border-2 flex flex-col items-center justify-center cursor-pointer transition-all ${selectedHighlightPkg?.days === pkg.days ? 'border-orange-500 bg-orange-500 text-white shadow-xl scale-[1.02]' : isDark ? 'border-slate-800 bg-[#24262c]' : 'border-slate-100 bg-slate-50 hover:bg-slate-100'}`}
                  >
                    <div className="text-sm font-semibold opacity-90">{pkg.label}</div>
                    <div className="text-lg font-black mt-1">₺{pkg.price.toFixed(2).replace('.', ',')}</div>
                  </div>
                ))}
                {/* 30 Gün Special Full Width */}
                <div
                  onClick={() => setSelectedHighlightPkg(HIGHLIGHT_PACKAGES[4])}
                  className={`col-span-2 p-4 rounded-3xl border-2 flex flex-col items-center justify-center cursor-pointer transition-all ${selectedHighlightPkg?.days === 30 ? 'border-orange-500 bg-orange-500 text-white shadow-xl scale-[1.02]' : isDark ? 'border-slate-800 bg-[#24262c]' : 'border-slate-100 bg-slate-50 hover:bg-slate-100'}`}
                >
                  <div className="text-sm font-semibold opacity-90">30 Gün</div>
                  <div className="text-lg font-black mt-1">₺169,99</div>
                </div>
              </div>
            </div>
          </div>

          <div className="fixed bottom-20 left-1/2 -translate-x-1/2 w-full max-w-md px-4 py-3 bg-white dark:bg-[#121316] z-40 border-t border-slate-100 dark:border-slate-800">
            <button onClick={() => { if (!storeName) alert('Mağaza adı giriniz'); else setShowPlayModal(true); }} className="w-full bg-[#108A56] text-white font-black py-4 rounded-2xl flex items-center justify-center gap-2 shadow-lg hover:bg-emerald-700 transition-colors">
              <Megaphone className="w-5 h-5 fill-white" /> İlanı Yayınla (₺{totalPrice.toFixed(2).replace('.', ',')})
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
            <span className="flex items-center gap-1.5 text-emerald-700">
              <div className="w-1.5 h-6 bg-emerald-600 rounded-full"></div>
              <h1 className="text-xl font-black text-slate-800">VAN REHBERİM</h1>
            </span>
            <button onClick={() => setShowSavedOnly(!showSavedOnly)} className={`p-2 rounded-full border ${showSavedOnly ? 'bg-emerald-600 text-white' : 'bg-white border-slate-200'}`}>
              <Bookmark className="w-5 h-5" />
            </button>
          </div>

          <div className="mb-4">
            <h2 className="text-[28px] font-black leading-none mb-2 text-slate-800">İndirimler & Esnaf</h2>
            <p className="text-sm text-slate-500 leading-snug">Bu uygulama ile mahallenizdeki tüm güncel indirim ve fırsatlardan anında haberdar olun.</p>
          </div>

          <button
            onClick={() => setShowSavedOnly(!showSavedOnly)}
            className={`w-full py-4 mb-4 rounded-2xl flex items-center justify-center gap-2 font-bold text-base transition-colors ${showSavedOnly ? 'bg-emerald-600 text-white' : 'bg-emerald-50 text-emerald-700 border border-emerald-200'}`}
          >
            <Bookmark className={`w-5 h-5 ${showSavedOnly ? 'fill-white' : 'fill-emerald-700'}`} />
            Kaydettiklerim
          </button>

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
        <div className="fixed inset-0 z-50 bg-[#3c2a21]/90 backdrop-blur-sm flex items-end sm:items-center justify-center sm:p-4">
          <div className="w-full h-auto max-w-md bg-[#3F2B20] border-t-2 sm:border-2 border-[#584033] sm:rounded-[40px] rounded-t-[40px] p-8 text-white space-y-6 shadow-2xl relative pt-10">
            <button onClick={() => setShowPlayModal(false)} className="absolute top-6 right-6 p-2 bg-[#4D372A] rounded-full text-[#B58A6C] hover:text-white transition-colors">
              <X className="w-5 h-5" />
            </button>
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-[#E5B667] flex items-center justify-center shadow-lg">
                <Star className="w-4 h-4 fill-white text-white" />
              </div>
              <h3 className="text-base font-black tracking-wider text-[#FFFFFF] mt-1">GÜVENLİ ÖDEME</h3>
            </div>

            <div className="bg-[#4D372A] p-5 rounded-[24px] flex items-center gap-4 border border-[#584033] shadow-inner mt-4">
              <div className="w-14 h-14 bg-[#E5B667] rounded-[18px] flex items-center justify-center shrink-0">
                <Megaphone className="w-6 h-6 text-[#4D372A] -rotate-6" />
              </div>
              <div>
                <p className="font-bold text-[15px] leading-tight text-white mb-1.5">{selectedPublishPkg?.label} İndirim İlanı{selectedHighlightPkg ? ' + Öne Çıkarma' : ''} <span className="text-[#E5B667]">₺{totalPrice.toFixed(2).replace('.', ',')}</span></p>
                <div className="text-[10px] uppercase font-black text-[#E5B667] tracking-widest">VAN REHBERİM PREMIUM</div>
              </div>
            </div>

            <div className="space-y-4 px-2 pt-2 text-[13px] font-medium text-[#B58A6C]">
              <div className="flex justify-between items-center border-b border-[#584033] pb-3">
                <span>Hesap:</span>
                <span className="font-bold text-white tracking-wide">{currentUser?.displayName || 'Anonim Kullanıcı'}</span>
              </div>
              <div className="flex justify-between items-center">
                <span>Ödeme Yöntemi:</span>
                <span className="font-bold text-[#E5B667] flex items-center gap-1 cursor-pointer">Google Play <ChevronLeft className="w-4 h-4 rotate-180" /></span>
              </div>
            </div>

            <p className="text-[10px] text-center text-[#9c755c] pt-2 pb-2 leading-relaxed px-4">
              Google Play In-App Purchase aracılığıyla ödeme yapılmaktadır. İlanınız ödeme onayından hemen sonra yayınlanacaktır.
            </p>

            <button onClick={handleFinalPurchase} disabled={isProcessing} className="w-full bg-gradient-to-r from-[#D7A75C] to-[#C18C44] text-[#3F2B20] font-black tracking-wide py-4.5 rounded-[24px] flex justify-center items-center gap-2 hover:opacity-90 transition-opacity disabled:opacity-50 text-[15px] h-[60px]">
              {isProcessing ? 'İşleniyor...' : <>ÖDEMEYİ TAMAMLA <ArrowRight className="w-4 h-4" /></>}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};