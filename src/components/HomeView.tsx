import React, { useState, useEffect } from 'react';
import { TaxiStand } from '../types';
import { useAuth } from '../context/AuthContext';
import { HOSPITALS } from '../data/mockData';
import {
  Search,
  Hospital as HospitalIcon,
  CarTaxiFront,
  ChevronRight,
  PhoneCall,
  MapPin,
  Navigation,
  Sparkles,
  Briefcase,
  ShieldCheck,
  X,
  Plus,
  CheckCircle2,
  AlertCircle,
  CreditCard,
} from 'lucide-react';

import { WeatherSection } from './home/WeatherSection';
import { PharmacySection } from './home/PharmacySection';
import { PrayerSection } from './home/PrayerSection';
import { CurrencySection } from './home/CurrencySection';
import { BusSection } from './home/BusSection';
import { getErrorMessage } from '../utils/errors';

interface HomeViewProps {
  theme?: 'light' | 'dark';
  onNavigateToPlaces: () => void;
  onNavigateToJobs?: () => void;
}

import { subscribeTaxis } from '../lib/firebase';
import { PurchaseService, PACKAGE_IDS } from '../services/purchaseService';
import { submitPaidListing } from '../services/listingService';
import { useBackButtonClose } from '../utils/backButtonStack';

export const HomeView: React.FC<HomeViewProps> = ({ theme = 'light', onNavigateToPlaces, onNavigateToJobs }) => {
  const { currentUser, setShowAuthModal } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [activeModal, setActiveModal] = useState<'pharmacy' | 'hospital' | 'bus' | 'taxi' | 'pray' | 'weather' | 'finance' | null>(null);

  // M32: Android geri tuşu önce açık bölüm modalini kapatır (önceden
  // sekmeyi değiştiriyordu). 'hospital'/'taxi' değerleri M25 bölünmesinden
  // kalma — hiç set edilmiyorlar ama tip birliği için duruyorlar.
  useBackButtonClose(activeModal !== null, () => setActiveModal(null));

  // User Taxi Listings & Subscription State (Live from Firestore)
  const [taxis, setTaxis] = useState<TaxiStand[]>([]);
  const [isLoadingTaxis, setIsLoadingTaxis] = useState<boolean>(true);
  // M30: abonelik hatası — önceden sonsuz iskelet kalıyordu
  const [taxisError, setTaxisError] = useState<string | null>(null);
  useEffect(() => {
    const unsub = subscribeTaxis((firestoreTaxis) => {
      if (firestoreTaxis) {
        // M26: ham doküman → TaxiStand eşlemesi yalnızca canonical alanları
        // okur (server/listings.ts taksiler şeması); eksiklere varsayılanlar.
        const mappedTaxis: TaxiStand[] = firestoreTaxis.map((t) => ({
          id: t.id,
          name: t.name || 'Taksi',
          driverName: t.driverName || t.name || 'Taksi Sürücüsü',
          phone: t.phone || '',
          plate: t.plate || '',
          operatingRegions: t.operatingRegions || 'Van İçi',
          district: t.district || 'İpekyolu',
          subscriptionPlan: t.subscriptionPlan,
          monthlyFee: t.monthlyFee || '',
          createdAt: t.createdAt,
        }));
        setTaxis(mappedTaxis);
      }
      setTaxisError(null);
      setIsLoadingTaxis(false);
    }, () => {
      setIsLoadingTaxis(false);
      setTaxisError('Taksi ilanları yüklenemedi. Bağlantınızı kontrol edip tekrar deneyin.');
    });
    return () => unsub();
  }, []);

  const [isAddTaxiModalOpen, setIsAddTaxiModalOpen] = useState<boolean>(false);
  const [showPayModalTaksi, setShowPayModalTaksi] = useState<boolean>(false);
  // M32: Android geri tuşu taksi ekleme/ödeme modallarını kapatır
  useBackButtonClose(isAddTaxiModalOpen, () => setIsAddTaxiModalOpen(false));
  useBackButtonClose(showPayModalTaksi, () => setShowPayModalTaksi(false));
  // M19: alert() yerine ödeme modalı içi hata mesajı
  const [payModalError, setPayModalError] = useState<string | null>(null);
  const [isProcessingTaksi, setIsProcessingTaksi] = useState<boolean>(false);
  const [pendingTaxiData, setPendingTaxiData] = useState<TaxiStand | null>(null);

  const [newTaxiDriverName, setNewTaxiDriverName] = useState<string>('');
  const [newTaxiPhone, setNewTaxiPhone] = useState<string>('');
  const [newTaxiPlate, setNewTaxiPlate] = useState<string>('');
  const [newTaxiOperatingRegions, setNewTaxiOperatingRegions] = useState<string>('');
  const [newTaxiDistrict, setNewTaxiDistrict] = useState<string>('İpekyolu');
  const [subscriptionAccepted, setSubscriptionAccepted] = useState<boolean>(true);
  const [addTaxiError, setAddTaxiError] = useState<string>('');
  const [addTaxiSuccess, setAddTaxiSuccess] = useState<string>('');

  const handleCreateTaxi = (e: React.FormEvent) => {
    e.preventDefault();
    setAddTaxiError('');

    if (!newTaxiPhone.trim()) {
      setAddTaxiError('Lütfen taksi şoförü telefon numarasını giriniz (Zorunlu alan).');
      return;
    }
    if (!newTaxiPlate.trim()) {
      setAddTaxiError('Lütfen taksi plakasını giriniz (Zorunlu alan).');
      return;
    }
    if (!newTaxiOperatingRegions.trim()) {
      setAddTaxiError('Lütfen Van\'da çalışılan yerler / bölgeler bilgisini giriniz (Zorunlu alan).');
      return;
    }
    if (!subscriptionAccepted) {
      setAddTaxiError('Devam etmek için 1. ay ücretsiz abonelik şartlarını onaylamanız gerekmektedir.');
      return;
    }

    const createdTaxi: TaxiStand = {
      id: `taxi-${Date.now()}`,
      name: newTaxiDriverName.trim() || `${newTaxiPlate.trim().toUpperCase()} Taksi`,
      driverName: newTaxiDriverName.trim() || 'Taksi Sürücüsü',
      phone: newTaxiPhone.trim(),
      plate: newTaxiPlate.trim().toUpperCase(),
      operatingRegions: newTaxiOperatingRegions.trim(),
      district: newTaxiDistrict || 'İpekyolu',
      subscriptionPlan: 'FIRST_MONTH_FREE',
      monthlyFee: '1. Ay ÜCRETSİZ (Sonrası 1.000 ₺/Ay)',
      createdAt: new Date().toLocaleDateString('tr-TR'),
    };

    setPendingTaxiData(createdTaxi);
    setIsAddTaxiModalOpen(false); // Close the form
    setShowPayModalTaksi(true); // Open the white transparent paywall drawer
  };

  const handleFinalPurchaseTaksi = async () => {
    if (!pendingTaxiData) return;
    setIsProcessingTaksi(true);
    setPayModalError(null);

    try {
      const taxiPackage = await PurchaseService.getPackageByProductId(PACKAGE_IDS.TAKSI_ILAN_AYLIK);
      if (!taxiPackage) {
        throw new Error('Taksi ilan paketi RevenueCat üzerinde bulunamadı.');
      }
      const purchased = await PurchaseService.purchasePackage(taxiPackage);

      if (!purchased) {
        setIsProcessingTaksi(false);
        return;
      }
    } catch (e) {
      setPayModalError(getErrorMessage(e) || 'Ödeme sırasında bir hata oluştu. Lütfen tekrar deneyiniz.');
      setIsProcessingTaksi(false);
      return;
    }

    try {
      await submitPaidListing('taxi', PACKAGE_IDS.TAKSI_ILAN_AYLIK, pendingTaxiData as unknown as Record<string, unknown>);
      setIsProcessingTaksi(false);
      setShowPayModalTaksi(false);
      setPendingTaxiData(null);

      setAddTaxiSuccess('Taksi ilanınız başarıyla oluşturuldu! Aboneliğiniz başlatıldı.');
      // Keep modal open to show success or open it again
      setIsAddTaxiModalOpen(true);

      setTimeout(() => {
        setIsAddTaxiModalOpen(false);
        setAddTaxiSuccess('');
        setNewTaxiDriverName('');
        setNewTaxiPhone('');
        setNewTaxiPlate('');
        setNewTaxiOperatingRegions('');
      }, 3000);
    } catch (err) {
      setIsProcessingTaksi(false);
      setPayModalError('İlan yayımlanırken bir hata oluştu: ' + getErrorMessage(err));
    }
  };

  // M32: ölü handleDeleteTaxi (id parametresi hiç kullanılmıyordu, gövde
  // boştu) kaldırıldı — taksi silme akışı yok.

  const isDark = theme === 'dark';

  // Dynamic theme class helpers
  const cardBg = isDark ? 'bg-[#1b1c21] border-slate-800 text-white' : 'bg-white border-slate-100 text-slate-800';
  const cardTitleText = isDark ? 'text-amber-400' : 'text-amber-950';
  const cardSubText = isDark ? 'text-slate-400' : 'text-slate-600';
  const buttonStyle = isDark
    ? 'bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-700'
    : 'bg-gradient-to-r from-slate-200 via-slate-300 to-slate-200 hover:from-slate-300 hover:to-slate-300 text-slate-800 border-slate-300/50';

  const filteredHospitals = HOSPITALS.filter(h => h.name.toLowerCase().includes(searchQuery.toLowerCase()));

  const q = searchQuery.toLowerCase().trim();
  const showCard = (keywords: string[]) => {
    if (!q) return true;
    return keywords.some(k => k.toLowerCase().includes(q) || q.includes(k.toLowerCase()));
  };

  return (
    <div className={`relative min-h-screen pb-28 font-sans selection:bg-cyan-500 selection:text-white ${isDark ? 'text-white' : 'text-slate-800'}`}>
      {/* Background Graphic matching screenshot */}
      <div
        className="fixed inset-0 z-0 bg-cover bg-center bg-no-repeat transition-all duration-700"
        style={{
          backgroundImage: isDark
            ? `linear-gradient(to bottom, rgba(10, 12, 18, 0.96), rgba(15, 20, 28, 0.98), rgba(8, 10, 16, 0.99)), url('https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=1200&q=80')`
            : `linear-gradient(to bottom, rgba(5, 45, 75, 0.88), rgba(8, 70, 110, 0.94), rgba(12, 90, 140, 0.98)), url('https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=1200&q=80')`
        }}
      />

      <div className="relative z-10 max-w-md mx-auto px-4 pt-5">



        {/* App Title - Bold Banner Graphic Style */}
        <div className="text-center mb-4">
          <h1 className="text-2xl sm:text-3xl font-black text-cyan-300 tracking-wider uppercase drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)] flex items-center justify-center gap-2">
            VAN REHBERİM
          </h1>
        </div>

        {/* Hero Card Banner - "VAN İLE İLGİLİ HER ŞEY" */}
        <div
          onClick={onNavigateToPlaces}
          className="relative w-full h-56 sm:h-64 rounded-3xl overflow-hidden shadow-2xl border border-white/20 group cursor-pointer transition-transform duration-300 active:scale-[0.98] mb-5"
        >
          <img
            src="/images/akdamar.jpg"
            alt="Van Akdamar Adası"
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
          />
          {/* Subtle gradient overlay */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-black/30 flex flex-col items-center justify-start pt-6 px-4 text-center">
            <h2 className="text-2xl sm:text-3xl font-extrabold text-cyan-300 drop-shadow-[0_3px_6px_rgba(0,0,0,0.9)] tracking-tight leading-tight uppercase font-serif">
              VAN İLE İLGİLİ<br />HER ŞEY
            </h2>
            <div className="mt-auto mb-3 bg-white/20 backdrop-blur-md px-4 py-1.5 rounded-full border border-white/30 text-white text-xs font-semibold flex items-center gap-1.5 shadow-lg group-hover:bg-cyan-500 group-hover:border-cyan-400 transition-colors">
              <span>Keşfetmeye Başla</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </div>
          </div>
        </div>

        {/* Search Bar - Pill Styled */}
        <div className="relative mb-5">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="FAVORİ İSTEDİĞİNİ ARA..."
            className="w-full bg-cyan-900/40 backdrop-blur-md border border-cyan-300/40 rounded-full py-3 pl-5 pr-12 text-sm text-cyan-100 placeholder-cyan-200/60 uppercase font-semibold focus:outline-none focus:ring-2 focus:ring-cyan-300 shadow-inner"
          />
          <button className="absolute right-4 top-1/2 -translate-y-1/2 text-cyan-200 hover:text-white">
            <Search className="w-5 h-5" />
          </button>
        </div>

        {/* Content Pages */}

        <div className="space-y-4 animate-fadeIn">

          {/* 0. Van Hava Durumu Card */}
          <WeatherSection
            isDark={isDark}
            searchQuery={searchQuery}
            isModalOpen={activeModal === 'weather'}
            onOpen={() => setActiveModal('weather')}
            onClose={() => setActiveModal(null)}
          />

          {/* NEW: Van İş İlanları & Usta Rehberi Promo Card */}
          {showCard(['iş', 'ilan', 'usta', 'temizlik', 'nakliye', 'özel']) && (
            <div className={`rounded-3xl p-4 shadow-xl flex items-center gap-3 border transition-all ${isDark
              ? 'bg-gradient-to-r from-indigo-950 via-slate-900 to-slate-900 border-indigo-900/70'
              : 'bg-gradient-to-r from-indigo-50 to-blue-50 border-indigo-200'
              }`}>
              <div className={`w-20 h-20 shrink-0 flex items-center justify-center rounded-2xl ${isDark ? 'bg-indigo-900/60 text-amber-400 border border-indigo-700/50' : 'bg-indigo-600 text-white shadow-md'
                } border relative overflow-hidden`}>
                <Briefcase className="w-10 h-10" />
                <span className="absolute bottom-1 bg-amber-400 text-slate-950 text-[9px] font-black px-1.5 py-0.5 rounded-full shadow-xs uppercase">
                  YENİ
                </span>
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  <h3 className={`text-xs sm:text-sm font-black ${cardTitleText} uppercase tracking-wide`}>
                    İŞ İLANLARI & USTA REHBERİ
                  </h3>
                </div>
                <p className={`text-[11px] ${cardSubText} font-medium leading-tight mt-1`}>
                  Van'daki ustalar, ev temizliği, nakliyat ve özel ders ilanları!
                </p>
                {onNavigateToJobs && (
                  <button
                    onClick={onNavigateToJobs}
                    className="mt-2.5 w-full bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-xs py-2 px-3 rounded-full transition-all shadow-md flex items-center justify-center gap-1.5 active:scale-95"
                  >
                    <span>İŞ İLANLARINI İNCELE & İLAN VER</span>
                    <ChevronRight className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
          )}

          {/* 1. Nöbetçi Eczaneler Card */}
          <PharmacySection
            isDark={isDark}
            searchQuery={searchQuery}
            isModalOpen={activeModal === 'pharmacy'}
            onOpen={() => setActiveModal('pharmacy')}
            onClose={() => setActiveModal(null)}
          />

          {/* 2. Ezan Vakitleri Card */}
          <PrayerSection
            isDark={isDark}
            searchQuery={searchQuery}
            isModalOpen={activeModal === 'pray'}
            onOpen={() => setActiveModal('pray')}
            onClose={() => setActiveModal(null)}
          />

          {/* 3. Döviz Kuru Card (doviz.com Canlı) */}
          <CurrencySection
            isDark={isDark}
            searchQuery={searchQuery}
            isModalOpen={activeModal === 'finance'}
            onOpen={() => setActiveModal('finance')}
            onClose={() => setActiveModal(null)}
          />

        </div>

        <div className="space-y-4 animate-fadeIn mt-4">

          {/* 1. Vanda Bulunan Hastaneler Card */}
          {showCard(['hastane', 'sağlık', 'randevu', 'doktor', 'acil']) && (
            <div className={`${cardBg} rounded-3xl p-4 shadow-xl flex items-center gap-3 border`}>
              <div className={`w-20 h-20 shrink-0 flex items-center justify-center rounded-2xl ${isDark ? 'bg-cyan-950/60 border-cyan-900/50' : 'bg-cyan-50 border-cyan-100'} border`}>
                <div className="w-14 h-14 bg-black rounded-full flex items-center justify-center text-white font-black text-2xl shadow-md border-2 border-white">
                  H
                </div>
              </div>

              <div className="flex-1 min-w-0">
                <h3 className={`text-xs font-extrabold ${cardTitleText} uppercase tracking-wide`}>
                  VAN HASTANELERİ
                </h3>
                <p className={`text-[11px] ${cardSubText} font-medium leading-tight mt-1`}>
                  Van'da bulunan hem devlet hem de özel hastaneler
                </p>
                <button
                  onClick={() => setActiveModal('hospital')}
                  className={`mt-2.5 w-full ${buttonStyle} text-xs font-bold py-2 px-3 rounded-full transition-all shadow-sm flex items-center justify-center gap-1 active:scale-95 border`}
                >
                  TÜM LİSTEYİ GÖR &rarr;
                </button>
              </div>
            </div>
          )}

          {/* 2. Otobüs Saatleri ve Durakları Card */}
          <BusSection
            isDark={isDark}
            searchQuery={searchQuery}
            isModalOpen={activeModal === 'bus'}
            onOpen={() => setActiveModal('bus')}
            onClose={() => setActiveModal(null)}
          />

          {/* 3. Acil Taksi Card */}
          {showCard(['taksi', 'acil', 'ulaşım', 'şoför']) && (
            <div className={`${cardBg} rounded-3xl p-4 shadow-xl flex items-center gap-3 border relative overflow-hidden`}>
              <div className={`w-20 h-20 shrink-0 flex items-center justify-center rounded-2xl ${isDark ? 'bg-amber-950/60 border-amber-900/50' : 'bg-amber-50 border-amber-200'} border`}>
                <div className="w-14 h-14 rounded-full bg-amber-400 border-2 border-black flex flex-col items-center justify-center text-black font-black text-[10px] shadow-sm">
                  <CarTaxiFront className="w-6 h-6 text-black" />
                  <span>TAXI</span>
                </div>
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-1">
                  <h3 className={`text-xs font-extrabold ${cardTitleText} uppercase tracking-wide truncate`}>
                    ACİL TAKSİ REHBERİ
                  </h3>
                  <span className="shrink-0 text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-500 border border-emerald-500/30">
                    1. Ay Ücretsiz
                  </span>
                </div>
                <p className={`text-[10px] ${cardSubText} font-medium leading-tight mt-1`}>
                  7/24 Nöbetçi taksi & şoför ilanları ({taxis.length} İlan)
                </p>
                <div className="mt-2.5 flex items-center gap-2">
                  <button
                    onClick={() => setActiveModal('taxi')}
                    className={`flex-1 ${buttonStyle} text-xs font-bold py-2 px-2.5 rounded-full transition-all shadow-sm flex items-center justify-center gap-1 active:scale-95 border truncate`}
                  >
                    LİSTE ({taxis.length}) &rarr;
                  </button>
                  <button
                    onClick={() => {
                      setActiveModal('taxi');
                      setIsAddTaxiModalOpen(true);
                    }}
                    className="bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-black py-2 px-3 rounded-full transition-all shadow-sm flex items-center justify-center gap-1 active:scale-95 border border-amber-600/30 shrink-0"
                  >
                    <Plus className="w-3.5 h-3.5 stroke-[3]" />
                    <span>TAKSİ EKLE</span>
                  </button>
                </div>
              </div>
            </div>
          )}

        </div>

      </div>

      {/* ================= MODAL DIALOGS FOR LISTS ================= */}

      {/* 2. Hastaneler Modal */}
      {activeModal === 'hospital' && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className={`${isDark ? 'bg-[#18191e] text-white' : 'bg-white'} w-full max-w-lg rounded-t-3xl sm:rounded-3xl max-h-[85vh] flex flex-col shadow-2xl overflow-hidden animate-slideUp`}>
            <div className="bg-cyan-700 text-white p-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <HospitalIcon className="w-6 h-6" />
                <h3 className="font-extrabold text-base uppercase">Van Hastaneleri</h3>
              </div>
              <button
                onClick={() => setActiveModal(null)}
                className="w-8 h-8 rounded-full bg-white/20 text-white flex items-center justify-center hover:bg-white/30"
              >
                ✕
              </button>
            </div>

            <div className="p-4 overflow-y-auto space-y-3">
              {filteredHospitals.map(hosp => (
                <div key={hosp.id} className={`${isDark ? 'bg-[#22242b] border-slate-700' : 'bg-slate-50 border-slate-200'} border rounded-2xl p-4 shadow-sm`}>
                  <div className="flex justify-between items-start">
                    <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full uppercase ${hosp.type === 'Devlet' ? 'bg-cyan-100 text-cyan-800' : hosp.type === 'Üniversite' ? 'bg-purple-100 text-purple-800' : 'bg-emerald-100 text-emerald-800'
                      }`}>
                      {hosp.type} Hastanesi
                    </span>
                    <span className="text-xs text-amber-500 font-bold">★ {hosp.rating}</span>
                  </div>

                  <h4 className={`font-bold text-base mt-1 ${isDark ? 'text-white' : 'text-slate-900'}`}>{hosp.name}</h4>
                  <p className={`text-xs mt-2 flex items-start gap-1.5 ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>
                    <MapPin className="w-4 h-4 text-cyan-500 shrink-0 mt-0.5" />
                    <span>{hosp.address}</span>
                  </p>

                  <div className={`mt-3 pt-3 border-t ${isDark ? 'border-slate-700' : 'border-slate-200'} flex flex-wrap items-center gap-2`}>
                    {hosp.mapUrl && (
                      <a
                        href={hosp.mapUrl}
                        target="_blank" rel="noopener noreferrer"
                        className="bg-sky-50 text-sky-700 hover:bg-sky-100 text-[11px] font-bold py-1.5 px-3 rounded-full flex items-center gap-1 border border-sky-200 shadow-sm"
                      >
                        <Navigation className="w-3 h-3 text-sky-600" />
                        <span>Konum</span>
                      </a>
                    )}

                    <a
                      href={`tel:112`}
                      className="bg-red-50 text-red-700 hover:bg-red-100 text-[11px] font-bold py-1.5 px-3 rounded-full flex items-center gap-1 border border-red-200 shadow-sm"
                    >
                      <PhoneCall className="w-3 h-3 text-red-600" />
                      <span>Acil 112</span>
                    </a>

                    <a
                      href={`tel:${hosp.phone}`}
                      className="bg-cyan-700 hover:bg-cyan-800 text-white text-[11px] font-bold py-1.5 px-3 rounded-full flex items-center gap-1 shadow-sm ml-auto"
                    >
                      <PhoneCall className="w-3 h-3" />
                      <span>{hosp.phone}</span>
                    </a>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* 4. Acil Taksi Modal */}
      {activeModal === 'taxi' && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4 animate-fadeIn">
          <div className={`${isDark ? 'bg-[#18191e] text-white border-slate-800' : 'bg-white border-slate-100'} w-full max-w-xl max-h-[90vh] flex flex-col rounded-t-3xl sm:rounded-3xl border shadow-2xl overflow-hidden animate-slideUp`}>

            {/* Modal Header */}
            <div className={`p-4 sm:p-5 border-b flex items-center justify-between ${isDark ? 'border-slate-800 bg-[#1e2029]' : 'border-amber-200 bg-amber-500 text-slate-950'}`}>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-amber-400 border-2 border-slate-950 text-slate-950 flex flex-col items-center justify-center shadow-md font-black text-[9px]">
                  <CarTaxiFront className="w-5 h-5 text-slate-950" />
                  <span>TAXI</span>
                </div>
                <div>
                  <h3 className={`font-black text-base uppercase tracking-tight ${isDark ? 'text-white' : 'text-slate-950'}`}>
                    VAN ACİL TAKSİ REHBERİ
                  </h3>
                  <p className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-900'} font-medium`}>
                    7/24 Şehir içi taksi ve durak ilanları ({taxis.length} İlan)
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    if (currentUser) {
                      setIsAddTaxiModalOpen(true);
                    } else {
                      setShowAuthModal(true);
                    }
                  }}
                  className="bg-slate-950 hover:bg-slate-900 text-amber-400 hover:text-amber-300 text-xs font-black py-2 px-3.5 rounded-xl flex items-center gap-1.5 shadow-lg active:scale-95 transition-all border border-amber-400/30"
                >
                  <Plus className="w-4 h-4 stroke-[3]" />
                  <span>TAKSİ EKLE</span>
                </button>

                <button
                  onClick={() => setActiveModal(null)}
                  className={`w-9 h-9 rounded-xl flex items-center justify-center transition-all ${isDark ? 'bg-slate-800 hover:bg-slate-700 text-slate-300' : 'bg-black/10 hover:bg-black/20 text-slate-950'
                    }`}
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Subscription Banner Promo */}
            <div className={`p-3.5 px-4 border-b flex items-center justify-between gap-3 ${isDark ? 'bg-[#15161b] border-slate-800' : 'bg-amber-50 border-amber-100'
              }`}>
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-amber-500/20 text-amber-500 flex items-center justify-center shrink-0 font-bold">
                  <Sparkles className="w-4 h-4" />
                </div>
                <div className="text-xs">
                  <span className="font-extrabold text-amber-600 dark:text-amber-400 block">
                    Taksi Şoförü müsünüz? İlanınızı hemen ekleyin!
                  </span>
                  <span className={`text-[11px] ${isDark ? 'text-slate-400' : 'text-slate-600'} font-medium`}>
                    Abonelik Sistemi: <strong className="text-emerald-500">İlk ay %100 Ücretsiz</strong>, diğer aylar 1.000 TL/Ay
                  </span>
                </div>
              </div>

              <button
                onClick={() => setIsAddTaxiModalOpen(true)}
                className="bg-amber-500 hover:bg-amber-600 text-slate-950 text-[11px] font-black px-3 py-1.5 rounded-lg shrink-0 shadow-sm transition-all"
              >
                + İLAN VER
              </button>
            </div>

            {/* Taxi List Body */}
            <div className="p-4 overflow-y-auto space-y-3 flex-1">
              {isLoadingTaxis ? (
                <>
                  {[1, 2, 3].map((i) => (
                    <div key={i} className={`border rounded-2xl p-4 shadow-sm animate-pulse flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${isDark ? 'bg-[#22242b] border-slate-700/80' : 'bg-white border-slate-200'}`}>
                      <div className="space-y-3 flex-1 min-w-0">
                        <div className="flex gap-2">
                          <div className="h-6 w-20 bg-slate-200 dark:bg-slate-700/50 rounded-md"></div>
                          <div className="h-6 w-16 bg-slate-200 dark:bg-slate-700/50 rounded-full"></div>
                        </div>
                        <div className="h-4 w-1/3 bg-slate-200 dark:bg-slate-700/50 rounded-full"></div>
                        <div className="h-10 w-full bg-slate-200 dark:bg-slate-700/50 rounded-xl"></div>
                      </div>
                      <div className="h-10 w-32 bg-slate-200 dark:bg-slate-700/50 rounded-xl shrink-0 mt-3 sm:mt-0"></div>
                    </div>
                  ))}
                </>
              ) : taxisError ? (
                <div className={`p-8 rounded-3xl text-center border space-y-3 ${isDark ? 'bg-[#1e2029] border-slate-800' : 'bg-slate-50 border-slate-200'}`}>
                  <div className="w-16 h-16 rounded-3xl bg-rose-500/10 text-rose-500 flex items-center justify-center mx-auto">
                    <CarTaxiFront className="w-8 h-8" />
                  </div>
                  <h4 className={`font-extrabold text-base ${isDark ? 'text-white' : 'text-slate-900'}`}>
                    Taksi İlanları Yüklenemedi
                  </h4>
                  <p className={`text-xs mt-1.5 max-w-sm mx-auto ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                    {taxisError}
                  </p>
                </div>
              ) : taxis.length === 0 ? (
                <div className={`p-8 rounded-3xl text-center border space-y-4 ${isDark ? 'bg-[#1e2029] border-slate-800' : 'bg-slate-50 border-slate-200'
                  }`}>
                  <div className="w-16 h-16 rounded-3xl bg-amber-400/20 text-amber-500 flex items-center justify-center mx-auto border border-amber-400/30 shadow-inner">
                    <CarTaxiFront className="w-8 h-8" />
                  </div>
                  <div>
                    <h4 className={`font-extrabold text-base ${isDark ? 'text-white' : 'text-slate-900'}`}>
                      Henüz Kayıtlı Taksi İlanı Bulunmuyor
                    </h4>
                    <p className={`text-xs mt-1.5 max-w-sm mx-auto ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                      Van'da hizmet veren taksi şoförleri ve durak sahipleri ilan vererek müşterilerine kolayca ulaşabilir.
                    </p>
                  </div>

                  <div className={`p-3 rounded-2xl text-xs border max-w-sm mx-auto ${isDark ? 'bg-[#15161d] border-slate-800 text-slate-300' : 'bg-amber-50 border-amber-200 text-amber-900'
                    }`}>
                    <div className="font-bold flex items-center justify-center gap-1 text-amber-500 mb-1">
                      <CreditCard className="w-4 h-4" />
                      Abonelik Kampanyası
                    </div>
                    <span>İlk ay <strong>%100 ÜCRETSİZ</strong>. Diğer aylar 1.000 TL/Ay. İstediğiniz an iptal edebilirsiniz.</span>
                  </div>

                  <button
                    onClick={() => {
                      if (currentUser) {
                        setIsAddTaxiModalOpen(true);
                      } else {
                        setShowAuthModal(true);
                      }
                    }}
                    className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs py-3 px-6 rounded-2xl shadow-lg active:scale-95 transition-all inline-flex items-center gap-2"
                  >
                    <Plus className="w-4 h-4 stroke-[3]" />
                    <span>İLK TAKSİ İLANINI SEN EKLE (İLK AY ÜCRETSİZ)</span>
                  </button>
                </div>
              ) : (
                taxis.map(taxi => (
                  <div
                    key={taxi.id}
                    className={`border rounded-2xl p-4 shadow-sm transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${isDark ? 'bg-[#22242b] border-slate-700/80 hover:border-slate-600' : 'bg-white border-slate-200 hover:border-amber-300'
                      }`}
                  >
                    <div className="space-y-1.5 flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        {/* Authentic Turkish License Plate Badge */}
                        <div className="inline-flex items-center bg-amber-400 text-slate-950 font-black text-xs rounded border border-slate-950 shadow-sm overflow-hidden">
                          <span className="bg-blue-700 text-white font-bold text-[9px] px-1 py-1 flex items-center justify-center h-full">
                            TR
                          </span>
                          <span className="px-2 py-0.5 tracking-wider font-mono">
                            {taxi.plate || '65 T ????'}
                          </span>
                        </div>

                        {taxi.district && (
                          <span className="bg-amber-500/10 text-amber-600 dark:text-amber-400 text-[10px] font-extrabold px-2 py-0.5 rounded-full border border-amber-500/20">
                            {taxi.district}
                          </span>
                        )}

                        <span className="bg-emerald-500/10 text-emerald-500 text-[10px] font-extrabold px-2 py-0.5 rounded-full border border-emerald-500/20 flex items-center gap-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                          1. Ay Ücretsiz Aktif İlan
                        </span>
                      </div>

                      <h4 className={`font-extrabold text-sm ${isDark ? 'text-white' : 'text-slate-900'}`}>
                        {taxi.driverName || taxi.name}
                      </h4>

                      {/* Operating Regions in Van */}
                      <div className={`text-xs p-2 rounded-xl border flex items-start gap-1.5 ${isDark ? 'bg-[#17181f] text-slate-300 border-slate-800' : 'bg-slate-50 text-slate-700 border-slate-200'
                        }`}>
                        <MapPin className="w-3.5 h-3.5 text-amber-500 shrink-0 mt-0.5" />
                        <span className="font-medium leading-relaxed">
                          <strong className="text-amber-500">Çalıştığı Yerler:</strong> {taxi.operatingRegions}
                        </span>
                      </div>

                      {taxi.monthlyFee && (
                        <p className="text-[10px] text-slate-400 font-medium">
                          💳 Subscription: {taxi.monthlyFee}
                        </p>
                      )}
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <a
                        href={`tel:${taxi.phone}`}
                        className="bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-black py-2.5 px-4 rounded-xl flex items-center gap-2 shadow-md shrink-0 transition-all active:scale-95"
                      >
                        <PhoneCall className="w-4 h-4 fill-slate-950" />
                        <span>ARA ({taxi.phone})</span>
                      </a>

                      {/* M32: "İlanı Sil" düğmesi kaldırıldı — boş bir no-op
                          handler'a bağlıydı (hiçbir şey silmiyordu). Gerçek
                          silme akışı istenirse ayrıca eklenmeli (deleteDoc +
                          owner kural kontrolü). */}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* 4.1 TAKSİ İLANI EKLE MODAL */}
      {isAddTaxiModalOpen && (
        <div className="fixed inset-0 z-[60] bg-black/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 animate-fadeIn">
          <div className={`${isDark ? 'bg-[#18191e] text-white border-slate-800' : 'bg-white border-slate-200'} w-full max-w-lg max-h-[92vh] flex flex-col rounded-3xl border shadow-2xl overflow-hidden animate-scaleUp`}>

            {/* Header */}
            <div className={`p-4 sm:p-5 border-b flex items-center justify-between ${isDark ? 'bg-[#1e2029] border-slate-800' : 'bg-amber-500 text-slate-950'}`}>
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-slate-950 text-amber-400 flex items-center justify-center font-bold">
                  <CarTaxiFront className="w-5 h-5 text-amber-400" />
                </div>
                <div>
                  <h3 className={`font-black text-base uppercase tracking-tight ${isDark ? 'text-white' : 'text-slate-950'}`}>
                    TAKSİ İLANI EKLE
                  </h3>
                  <p className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-900'} font-medium`}>
                    1. Ay %100 Ücretsiz Abonelik Sistemi
                  </p>
                </div>
              </div>

              <button
                onClick={() => {
                  setIsAddTaxiModalOpen(false);
                  setAddTaxiError('');
                }}
                className={`w-8 h-8 rounded-xl flex items-center justify-center transition-all ${isDark ? 'bg-slate-800 text-slate-300 hover:bg-slate-700' : 'bg-black/10 text-slate-950 hover:bg-black/20'
                  }`}
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Form Body */}
            <form onSubmit={handleCreateTaxi} className="p-4 sm:p-5 overflow-y-auto space-y-4 flex-1">
              {/* Subscription Notice Card */}
              <div className={`p-4 rounded-2xl border ${isDark ? 'bg-[#1e1e28] border-amber-500/30 text-slate-200' : 'bg-gradient-to-br from-amber-50 to-orange-50 border-amber-200 text-amber-950'
                }`}>
                <div className="flex items-center gap-2 text-amber-500 font-extrabold text-sm mb-2">
                  <Sparkles className="w-4 h-4" />
                  <span>ABONELİK PAKETİ VE KOŞULLARI</span>
                </div>
                <ul className="text-xs space-y-1.5 font-medium">
                  <li className="flex items-start gap-1.5 text-emerald-600 dark:text-emerald-400 font-bold">
                    <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
                    <span><strong>İLK AY %100 ÜCRETSİZ DENEME</strong> (Kredi kartı şartı yok)</span>
                  </li>
                  <li className="flex items-start gap-1.5">
                    <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5 text-amber-500" />
                    <span>Diğer Aylar: <strong>1.000 TL / Ay</strong> sabit abonelik ücreti</span>
                  </li>
                  <li className="flex items-start gap-1.5">
                    <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5 text-amber-500" />
                    <span>İlanınız Van Şehir Rehberinde 7/24 kesintisiz ön planda yayınlanır.</span>
                  </li>
                </ul>
              </div>

              {addTaxiError && (
                <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-500 text-xs font-bold flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{addTaxiError}</span>
                </div>
              )}

              {addTaxiSuccess && (
                <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-500 text-xs font-bold flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                  <span>{addTaxiSuccess}</span>
                </div>
              )}

              {/* Input 1: Driver / Stand Name */}
              <div>
                <label className={`block text-xs font-bold mb-1.5 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                  Taksi Şoförü / Durak Adı
                </label>
                <input
                  type="text"
                  maxLength={50}
                  value={newTaxiDriverName}
                  onChange={(e) => setNewTaxiDriverName(e.target.value)}
                  placeholder="Örn: Mehmet Yılmaz / Beşyol Meydan Taksi"
                  className={`w-full px-3.5 py-2.5 text-xs rounded-xl border font-medium outline-none transition-all ${isDark ? 'bg-[#22242b] border-slate-700 text-white focus:border-amber-500' : 'bg-slate-50 border-slate-300 text-slate-900 focus:border-amber-500'
                    }`}
                />
              </div>

              {/* Input 2: Telefon Numarası (*ZORUNLU) */}
              <div>
                <label className={`block text-xs font-bold mb-1.5 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                  Taksi Şoförü Telefon Numarası <span className="text-rose-500">* (Zorunlu)</span>
                </label>
                <div className="relative">
                  <PhoneCall className={`absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 ${isDark ? 'text-slate-500' : 'text-slate-400'}`} />
                  <input
                    type="tel"
                    required
                    maxLength={15}
                    value={newTaxiPhone}
                    onChange={(e) => setNewTaxiPhone(e.target.value)}
                    placeholder="Örn: 0544 123 45 67"
                    className={`w-full pl-10 pr-3.5 py-2.5 text-xs rounded-xl border font-mono font-bold outline-none transition-all ${isDark ? 'bg-[#22242b] border-slate-700 text-amber-400 focus:border-amber-500' : 'bg-slate-50 border-slate-300 text-slate-900 focus:border-amber-500'
                      }`}
                  />
                </div>
              </div>

              {/* Input 3: Taksi Plakası (*ZORUNLU) */}
              <div>
                <label className={`block text-xs font-bold mb-1.5 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                  Taksi Plakası <span className="text-rose-500">* (Zorunlu)</span>
                </label>
                <input
                  type="text"
                  required
                  maxLength={15}
                  value={newTaxiPlate}
                  onChange={(e) => setNewTaxiPlate(e.target.value)}
                  placeholder="Örn: 65 T 0845"
                  className={`w-full px-3.5 py-2.5 text-xs rounded-xl border font-mono uppercase font-black outline-none transition-all ${isDark ? 'bg-[#22242b] border-slate-700 text-amber-300 focus:border-amber-500' : 'bg-slate-50 border-slate-300 text-slate-900 focus:border-amber-500'
                    }`}
                />
              </div>

              {/* Input 4: Van'da Çalıştığı Yerler / Bölgeler (*ZORUNLU) */}
              <div>
                <label className={`block text-xs font-bold mb-1.5 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                  Van'da Çalıştığı Yerler / Çalışma Bölgeleri <span className="text-rose-500">* (Zorunlu)</span>
                </label>
                <textarea
                  required
                  maxLength={200}
                  rows={2}
                  value={newTaxiOperatingRegions}
                  onChange={(e) => setNewTaxiOperatingRegions(e.target.value)}
                  placeholder="Örn: İpekyolu, Maraş Cad., Edremit TOKİ, YYÜ Kampüs, Havaalanı, Otogar, Tüm Van İçi"
                  className={`w-full px-3.5 py-2.5 text-xs rounded-xl border font-medium outline-none transition-all ${isDark ? 'bg-[#22242b] border-slate-700 text-white focus:border-amber-500' : 'bg-slate-50 border-slate-300 text-slate-900 focus:border-amber-500'
                    }`}
                />
              </div>

              {/* Input 5: Bölge / İlçe */}
              <div>
                <label className={`block text-xs font-bold mb-1.5 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                  Ana Çalışma İlçesi
                </label>
                <select
                  value={newTaxiDistrict}
                  onChange={(e) => setNewTaxiDistrict(e.target.value)}
                  className={`w-full px-3.5 py-2.5 text-xs rounded-xl border font-medium outline-none transition-all ${isDark ? 'bg-[#22242b] border-slate-700 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'
                    }`}
                >
                  <option value="İpekyolu">İpekyolu</option>
                  <option value="Edremit">Edremit</option>
                  <option value="Tuşba">Tuşba</option>
                  <option value="Tüm Van İçi">Tüm Van İçi</option>
                </select>
              </div>

              {/* Mandatory Terms Checkbox */}
              <label className="flex items-start gap-2.5 cursor-pointer pt-2">
                <input
                  type="checkbox"
                  checked={subscriptionAccepted}
                  onChange={(e) => setSubscriptionAccepted(e.target.checked)}
                  className="mt-0.5 rounded border-slate-300 text-amber-500 focus:ring-amber-500 w-4 h-4"
                />
                <span className={`text-[11px] ${isDark ? 'text-slate-300' : 'text-slate-700'} font-medium leading-tight`}>
                  <strong>1. Ay Ücretsiz Abonelik Koşulunu Kabul Ediyorum:</strong> İlanım ilk ay tamamen ücretsiz yayınlanacaktır. Sonraki aylar için 1.000 TL/Ay abonelik tarifesi geçerlidir.
                </span>
              </label>

              {/* Submit Button */}
              <button
                type="submit"
                className="w-full mt-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs py-3.5 px-4 rounded-2xl shadow-lg active:scale-95 transition-all flex items-center justify-center gap-2"
              >
                <Sparkles className="w-4 h-4" />
                <span>TAKSİ İLANINI YAYINLA (İLK AY ÜCRETSİZ)</span>
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Taksi Paywall Modal - White/Transparent/Minimalist Theme */}
      {showPayModalTaksi && (
        <div className="fixed inset-0 z-[70] bg-slate-900/40 backdrop-blur-md flex items-end sm:items-center justify-center p-0 sm:p-4 animate-fadeIn">
          <div className="w-full max-w-md bg-white/70 dark:bg-[#121316]/70 backdrop-blur-2xl border border-white/50 dark:border-white/10 sm:rounded-[2.5rem] rounded-t-[2.5rem] p-7 shadow-[0_8px_40px_rgba(0,0,0,0.12)] space-y-6 animate-slideUp">

            {/* Header */}
            <div className="flex items-center justify-between border-b border-slate-200/50 dark:border-slate-700/50 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-emerald-500/10 flex items-center justify-center border border-emerald-500/20">
                  <ShieldCheck className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                </div>
                <span className="text-base font-black tracking-wide text-slate-800 dark:text-white uppercase drop-shadow-sm">GÜVENLİ ABONELİK</span>
              </div>
              <button
                onClick={() => setShowPayModalTaksi(false)}
                className="w-8 h-8 rounded-full bg-slate-100/50 hover:bg-slate-200/80 dark:bg-slate-800/50 dark:hover:bg-slate-700/80 flex items-center justify-center text-slate-500 transition-colors backdrop-blur-sm shadow-inner"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Product Summary */}
            <div className="bg-white/40 dark:bg-slate-900/40 p-5 rounded-3xl border border-white/60 dark:border-white/5 shadow-sm flex flex-col gap-1 backdrop-blur-md relative overflow-hidden">
              {/* Subtle glass accent */}
              <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/10 rounded-full blur-3xl -mr-16 -mt-16 pointer-events-none"></div>

              <div className="flex items-center justify-between relative z-10">
                <h3 className="text-base font-black text-slate-800 dark:text-white tracking-tight">
                  Acil Taksi İlanı Kaydı
                </h3>
                <CarTaxiFront className="w-6 h-6 text-emerald-500 opacity-80" />
              </div>
              <p className="text-[13px] font-bold text-slate-500 dark:text-slate-400 mt-1 relative z-10">
                İlk Ay ÜCRETSİZ, Sonraki Aylar 1000 TL
              </p>
            </div>

            {/* Account Notice */}
            <div className="flex flex-col gap-3.5 px-3">
              <div className="flex justify-between items-center text-xs text-slate-600 dark:text-slate-300">
                <span className="font-semibold tracking-wide">Hesap Bilgisi:</span>
                <span className="font-black text-slate-900 dark:text-white drop-shadow-sm">{currentUser?.email || 'Kullanıcı'}</span>
              </div>
              <div className="flex justify-between items-center text-xs text-slate-600 dark:text-slate-300">
                <span className="font-semibold tracking-wide">Ödeme Sistemi:</span>
                <span className="font-black text-emerald-600 dark:text-emerald-400 drop-shadow-sm flex items-center gap-1">
                  Google Play <ChevronRight className="w-4 h-4" />
                </span>
              </div>
            </div>

            {/* M19: ödeme hatası modal içinde gösterilir (alert yerine) */}
            {payModalError && (
              <div className="bg-rose-500/10 border border-rose-500/30 text-rose-600 dark:text-rose-400 text-xs font-bold px-4 py-3 rounded-2xl flex items-start gap-2">
                <span className="text-base leading-none mt-0.5">!</span>
                <span>{payModalError}</span>
              </div>
            )}

            {/* Action Button */}
            <button
              onClick={handleFinalPurchaseTaksi}
              disabled={isProcessingTaksi}
              className="w-full group bg-white hover:bg-emerald-50/50 dark:bg-emerald-500 dark:hover:bg-emerald-400 text-emerald-600 dark:text-white border border-emerald-100 dark:border-emerald-400/50 font-black text-sm py-4 rounded-3xl shadow-[0_8px_30px_rgba(16,185,129,0.15)] transition-all flex items-center justify-center gap-2 active:scale-95"
            >
              {isProcessingTaksi ? (
                <span className="animate-pulse">İşlem Yapılıyor...</span>
              ) : (
                <>
                  <span className="drop-shadow-sm">İşlemi Tamamla & Yayınla</span>
                  <ChevronRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                </>
              )}
            </button>
            <p className="text-[10px] text-center text-slate-400 dark:text-slate-500 font-medium px-4 leading-relaxed tracking-wide">
              Google Play In-App Purchase ile yönetilen abonelik sözleşmesi. Dilediğiniz zaman iptal edebilirsiniz.
            </p>
          </div>
        </div>
      )}

    </div>
  );
};
