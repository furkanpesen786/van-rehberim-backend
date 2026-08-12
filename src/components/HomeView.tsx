import React, { useState, useEffect } from 'react';
import { VanWeatherData, Pharmacy, BusRoute, TaxiStand } from '../types';
import { useAuth } from '../context/AuthContext';
import { fetchLiveVanWeather } from '../services/weatherService';
import { fetchLivePharmacies } from '../services/pharmacyService';
import { fetchLivePrayerTimes, LivePrayerTimesResponse, calculatePrayerStatus } from '../services/prayerService';
import { fetchLiveCurrencies, LiveCurrencyResponse } from '../services/currencyService';
import { fetchLiveBusSchedules } from '../services/busService';
import {
  PHARMACIES,
  HOSPITALS,
  BUS_ROUTES,
  TAXI_STANDS,
  PRAYER_TIMES,
  CURRENCY_RATES,
  VAN_WEATHER,
} from '../data/mockData';
import {
  Search,
  HeartPulse,
  Hospital as HospitalIcon,
  Bus,
  CarTaxiFront,
  ChevronRight,
  Clock,
  PhoneCall,
  MapPin,
  ExternalLink,
  Info,
  Building2,
  CalendarDays,
  Sparkles,
  DollarSign,
  TrendingUp,
  TrendingDown,
  Navigation,
  Sun,
  CloudSun,
  CloudRain,
  Cloud,
  Wind,
  Droplets,
  Thermometer,
  ShieldCheck,
  Compass,
  Briefcase,
  Wrench,
  RefreshCw,
  X,
  ChevronDown,
  ChevronUp,
  Plus,
  Trash2,
  CheckCircle2,
  AlertCircle,
  CreditCard,
} from 'lucide-react';

interface HomeViewProps {
  theme?: 'light' | 'dark';
  onNavigateToPlaces: () => void;
  onNavigateToDeals: () => void;
}

import { subscribeTaxis, addTaxiToFirestore } from '../lib/firebase';
import { PurchaseService, PACKAGE_IDS } from '../services/purchaseService';

const renderWeatherIcon = (iconName: string, className = "w-5 h-5") => {
  switch (iconName) {
    case 'sun':
      return <Sun className={`${className} text-amber-400`} />;
    case 'cloud-sun':
      return <CloudSun className={`${className} text-sky-400`} />;
    case 'cloud':
      return <Cloud className={`${className} text-slate-400`} />;
    case 'rain':
      return <CloudRain className={`${className} text-blue-400`} />;
    case 'wind':
      return <Wind className={`${className} text-cyan-400`} />;
    default:
      return <Sun className={`${className} text-amber-400`} />;
  }
};

export const HomeView: React.FC<HomeViewProps> = ({ theme = 'light', onNavigateToPlaces, onNavigateToDeals, onNavigateToJobs }) => {
  const { currentUser, setShowAuthModal, logout } = useAuth();
  const [slidePage, setSlidePage] = useState<0 | 1>(0);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeModal, setActiveModal] = useState<'pharmacy' | 'hospital' | 'bus' | 'taxi' | 'pray' | 'weather' | 'finance' | null>(null);

  // Live Weather State
  const [weather, setWeather] = useState<VanWeatherData>(VAN_WEATHER);
  const [isWeatherLoading, setIsWeatherLoading] = useState<boolean>(false);

  // Live Duty Pharmacies State (Fetched from vaneczaciodasi.org.tr)
  const [pharmacies, setPharmacies] = useState<Pharmacy[]>([]);
  const [pharmacyDutyDate, setPharmacyDutyDate] = useState<string>('Bugün');
  const [pharmacyLastUpdated, setPharmacyLastUpdated] = useState<string>('');
  const [isPharmaciesLoading, setIsPharmaciesLoading] = useState<boolean>(true);
  const [selectedPharmacyCityFilter, setSelectedPharmacyCityFilter] = useState<'Tümü' | 'Van' | 'Diğer'>('Van');

  // Live Diyanet Prayer Times State (Fetched from namazvakitleri.diyanet.gov.tr)
  const [prayerData, setPrayerData] = useState<LivePrayerTimesResponse | null>(null);
  const [isPrayerLoading, setIsPrayerLoading] = useState<boolean>(true);

  // Live doviz.com Exchange & Gold Rates State
  const [currencyData, setCurrencyData] = useState<LiveCurrencyResponse | null>(null);
  const [isCurrencyLoading, setIsCurrencyLoading] = useState<boolean>(true);

  // Live van.bel.tr Bus Schedules & Stops State
  const [busRoutes, setBusRoutes] = useState<BusRoute[]>([]);
  const [isBusLoading, setIsBusLoading] = useState<boolean>(true);
  const [busSource, setBusSource] = useState<string>('van.bel.tr (VAN BELVAN Ulaşım)');
  const [busLastUpdated, setBusLastUpdated] = useState<string>('');
  const [busIsLive, setBusIsLive] = useState<boolean>(false);
  const [busSearchQuery, setBusSearchQuery] = useState<string>('');
  const [selectedBusCategory, setSelectedBusCategory] = useState<string>('Tümü');
  const [activeBusId, setActiveBusId] = useState<string | null>(null);

  // User Taxi Listings & Subscription State (Live from Firestore)
  const [taxis, setTaxis] = useState<TaxiStand[]>([]);
  const [isLoadingTaxis, setIsLoadingTaxis] = useState<boolean>(true);
  useEffect(() => {
    const unsub = subscribeTaxis((firestoreTaxis) => {
      if (firestoreTaxis) {
        const mappedTaxis = firestoreTaxis.map((t: any) => ({
          ...t,
          id: t.id,
          name: t.name || t.isim || t.title || 'Taksi',
          driverName: t.driverName || t.soforAdi || t.name || t.isim || 'Taksi Sürücüsü',
          phone: t.phone || t.telefon || t.tel || '',
          plate: t.plate || t.plaka || t.taxiPlate || '',
          operatingRegions: t.operatingRegions || t.calismaBolgeleri || t.bolgeler || t.regions || 'Van İçi',
          district: t.district || t.ilce || t.mahalle || 'İpekyolu',
          monthlyFee: t.monthlyFee || t.aylikUcret || t.fee || '',
        }));
        setTaxis(mappedTaxis as TaxiStand[]);
      }
      setIsLoadingTaxis(false);
    });
    return () => unsub();
  }, []);

  const [isAddTaxiModalOpen, setIsAddTaxiModalOpen] = useState<boolean>(false);
  const [showPayModalTaksi, setShowPayModalTaksi] = useState<boolean>(false);
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

    try {
      const purchased = await PurchaseService.purchasePackage({
        product: {
          identifier: PACKAGE_IDS.TAKSI_ILAN_AYLIK
        }
      });

      if (!purchased) {
        setIsProcessingTaksi(false);
        return;
      }
    } catch (e: any) {
      alert(e.message);
      setIsProcessingTaksi(false);
      return;
    }

    try {
      await addTaxiToFirestore(pendingTaxiData);
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
    } catch (err: any) {
      setIsProcessingTaksi(false);
      alert('Hata oluştur: ' + (err.message || err));
    }
  };

  const handleDeleteTaxi = (id: string) => {
    // Only admin can delete from firestore manually or we can add deleteDoc logic here
  };

  const handleRefreshWeather = async () => {
    setIsWeatherLoading(true);
    try {
      const data = await fetchLiveVanWeather();
      setWeather(data);
    } catch (err) {
      console.error('Failed to load live weather:', err);
    } finally {
      setIsWeatherLoading(false);
    }
  };

  const handleRefreshPharmacies = async () => {
    setIsPharmaciesLoading(true);
    try {
      const data = await fetchLivePharmacies();
      if (data && data.pharmacies && data.pharmacies.length > 0) {
        setPharmacies(data.pharmacies);
        if (data.dutyDate) setPharmacyDutyDate(data.dutyDate);
        if (data.lastUpdated) setPharmacyLastUpdated(data.lastUpdated);
      }
    } catch (err) {
      console.error('Failed to load live pharmacies:', err);
    } finally {
      setIsPharmaciesLoading(false);
    }
  };

  const handleRefreshPrayerTimes = async () => {
    setIsPrayerLoading(true);
    try {
      const data = await fetchLivePrayerTimes();
      if (data) {
        setPrayerData(data);
      }
    } catch (err) {
      console.error('Failed to load live Diyanet prayer times:', err);
    } finally {
      setIsPrayerLoading(false);
    }
  };

  const handleRefreshCurrencies = async () => {
    setIsCurrencyLoading(true);
    try {
      const data = await fetchLiveCurrencies();
      if (data) {
        setCurrencyData(data);
      }
    } catch (err) {
      console.error('Failed to load live doviz.com rates:', err);
    } finally {
      setIsCurrencyLoading(false);
    }
  };

  const handleRefreshBusSchedules = async () => {
    setIsBusLoading(true);
    try {
      const data = await fetchLiveBusSchedules();
      if (data && data.routes && data.routes.length > 0) {
        setBusRoutes(data.routes);
        if (data.source) setBusSource(data.source);
        if (data.lastUpdated) setBusLastUpdated(data.lastUpdated);
        setBusIsLive(!!data.isLive);
      }
    } catch (err) {
      console.error('Failed to load live van.bel.tr bus schedules:', err);
    } finally {
      setIsBusLoading(false);
    }
  };

  useEffect(() => {
    handleRefreshWeather();
    handleRefreshPharmacies();
    handleRefreshPrayerTimes();
    handleRefreshCurrencies();
    handleRefreshBusSchedules();

    // Recalculate dynamic active prayer slot every minute
    const interval = setInterval(() => {
      setPrayerData(prev => {
        if (!prev || !prev.times) return prev;
        const dynamicStatus = calculatePrayerStatus(prev.times);
        return {
          ...prev,
          activeKey: dynamicStatus.activeKey,
          activeTitle: dynamicStatus.activeTitle,
          nextPrayer: dynamicStatus.nextTitle,
          remainingText: dynamicStatus.remainingText,
          remainingMinutes: dynamicStatus.remainingMinutes,
        };
      });

      // Refresh currencies every minute
      handleRefreshCurrencies();
    }, 60000);

    return () => clearInterval(interval);
  }, []);

  const isDark = theme === 'dark';

  // Dynamic theme class helpers
  const cardBg = isDark ? 'bg-[#1b1c21] border-slate-800 text-white' : 'bg-white border-slate-100 text-slate-800';
  const cardTitleText = isDark ? 'text-amber-400' : 'text-amber-950';
  const cardSubText = isDark ? 'text-slate-400' : 'text-slate-600';
  const buttonStyle = isDark
    ? 'bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-700'
    : 'bg-gradient-to-r from-slate-200 via-slate-300 to-slate-200 hover:from-slate-300 hover:to-slate-300 text-slate-800 border-slate-300/50';

  // Filter items if search is active
  const filteredPharmacies = pharmacies.filter(p => {
    const matchesSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.district.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.address.toLowerCase().includes(searchQuery.toLowerCase());

    if (selectedPharmacyCityFilter === 'Van') {
      return matchesSearch && (p.city === 'Van' || !p.city);
    } else if (selectedPharmacyCityFilter === 'Diğer') {
      return matchesSearch && p.city && p.city !== 'Van';
    }
    return matchesSearch;
  });
  const filteredHospitals = HOSPITALS.filter(h => h.name.toLowerCase().includes(searchQuery.toLowerCase()));

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

        {/* User Account Bar & Login Button */}
        <div className="flex items-center justify-between mb-3 px-1">
          {currentUser ? (
            <div className="flex items-center gap-2 bg-slate-900/80 backdrop-blur-md px-3 py-1.5 rounded-2xl border border-emerald-500/40 shadow-lg text-xs">
              <div className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
              <div className="flex flex-col">
                <span className="text-[10px] text-emerald-400 font-bold uppercase tracking-wider flex items-center gap-1">
                  Firebase Bulut Oturumu
                </span>
                <span className="text-white font-black truncate max-w-[170px] sm:max-w-[220px]">
                  {currentUser.email}
                </span>
              </div>
            </div>
          ) : (
            <button
              onClick={() => setShowAuthModal(true)}
              className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs px-3.5 py-2 rounded-2xl shadow-lg flex items-center gap-1.5 transition-all active:scale-95 border border-emerald-400/40"
            >
              <ShieldCheck className="w-4 h-4" />
              <span>E-posta / Google Girişi</span>
            </button>
          )}

          {currentUser && (
            <button
              onClick={() => logout()}
              className="bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 font-bold text-[11px] px-2.5 py-1.5 rounded-xl border border-rose-500/30 transition-all active:scale-95"
            >
              Çıkış
            </button>
          )}
        </div>

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

        {/* Content Slider Pages based on Screenshots */}
        {slidePage === 0 ? (
          /* ================= PAGE 1 ================= */
          <div className="space-y-4 animate-fadeIn">

            {/* 0. Van Hava Durumu Card */}
            <div className={`${cardBg} rounded-3xl p-4 shadow-xl border relative overflow-hidden flex flex-col gap-3 transition-transform duration-200`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 ${isDark ? 'bg-sky-950/80 text-sky-400 border-sky-800/60' : 'bg-gradient-to-br from-sky-400 to-blue-600 text-white shadow-md'
                    } border`}>
                    <CloudSun className="w-7 h-7" />
                  </div>
                  <div>
                    <div className="flex items-center gap-1.5">
                      <h3 className={`text-xs sm:text-sm font-extrabold ${cardTitleText} uppercase tracking-wide`}>
                        VAN HAVA DURUMU
                      </h3>
                      <span className="bg-sky-500/20 text-sky-500 text-[9px] font-bold px-1.5 py-0.5 rounded-full uppercase flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                        MGM Canlı
                      </span>
                    </div>
                    <p className={`text-[11px] ${cardSubText} font-medium leading-tight mt-0.5`}>
                      {weather.condition} • Hissedilen {weather.feelsLike}°C
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <div className="text-right shrink-0">
                    <div className="text-xl sm:text-2xl font-black font-mono tracking-tight text-sky-500">
                      {weather.currentTemp}°C
                    </div>
                    <div className={`text-[10px] ${cardSubText} font-semibold`}>
                      {weather.tempMax}° / {weather.tempMin}°
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={handleRefreshWeather}
                    title="MGM Verilerini Yenile"
                    className="p-1.5 rounded-xl hover:bg-sky-500/10 text-sky-500 transition-colors"
                  >
                    <RefreshCw className={`w-4 h-4 ${isWeatherLoading ? 'animate-spin' : ''}`} />
                  </button>
                </div>
              </div>

              {/* Air Quality & UV Badges */}
              <div className="grid grid-cols-2 gap-2 pt-0.5">
                <div className={`p-2 rounded-2xl border flex items-center gap-2 ${isDark ? 'bg-emerald-950/40 border-emerald-900/50 text-emerald-300' : 'bg-emerald-50/80 border-emerald-100 text-emerald-800'
                  }`}>
                  <Wind className="w-4 h-4 text-emerald-500 shrink-0" />
                  <div className="min-w-0">
                    <div className="text-[9px] font-extrabold uppercase tracking-wide opacity-80">Hava Kalitesi</div>
                    <div className="text-xs font-bold truncate">{weather.aqi} AQI • {weather.aqiStatus.split(' ')[0]}</div>
                  </div>
                </div>

                <div className={`p-2 rounded-2xl border flex items-center gap-2 ${isDark ? 'bg-amber-950/40 border-amber-900/50 text-amber-300' : 'bg-amber-50/80 border-amber-100 text-amber-800'
                  }`}>
                  <Sun className="w-4 h-4 text-amber-500 shrink-0" />
                  <div className="min-w-0">
                    <div className="text-[9px] font-extrabold uppercase tracking-wide opacity-80">UV İndeksi</div>
                    <div className="text-xs font-bold truncate">{weather.uvIndex} • {weather.uvStatus.split(' ')[0]}</div>
                  </div>
                </div>
              </div>

              <button
                onClick={() => setActiveModal('weather')}
                className={`w-full ${buttonStyle} text-xs font-bold py-2 px-3 rounded-full transition-all shadow-sm flex items-center justify-center gap-1 active:scale-95 border`}
              >
                <span>7 GÜNLÜK TAHMİN & DETAYLAR</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>

            {/* NEW: Van İş İlanları & Usta Rehberi Promo Card */}
            <div className={`rounded-3xl p-4 shadow-xl flex items-center gap-3 border transition-all ${isDark
              ? 'bg-gradient-to-r from-indigo-950 via-slate-900 to-slate-900 border-indigo-900/70'
              : 'bg-gradient-to-r from-indigo-50 to-blue-50 border-indigo-200'
              }`}>
              <div className={`w-20 h-20 shrink-0 flex items-center justify-center rounded-2xl ${isDark ? 'bg-indigo-900/60 text-amber-400 border border-indigo-700/50' : 'bg-indigo-600 text-white shadow-md'
                } border relative overflow-hidden`}>
                <Briefcase className="w-10 h-10" />
                <span className="absolute bottom-1 bg-amber-400 text-slate-950 text-[9px] font-black px-1.5 py-0.2 rounded-full shadow-xs uppercase">
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

            {/* 1. Nöbetçi Eczaneler Card */}
            <div className={`${cardBg} rounded-3xl p-4 shadow-xl flex items-center gap-3 border`}>
              {/* Heart Canva Icon */}
              <div className={`w-20 h-20 shrink-0 flex items-center justify-center rounded-2xl ${isDark ? 'bg-red-950/60 border-red-900/50' : 'bg-gradient-to-br from-red-50 to-pink-50 border-red-100'} border relative overflow-hidden`}>
                <HeartPulse className="w-12 h-12 text-red-500 animate-pulse" />
                <div className="absolute bottom-1 bg-red-500 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-full shadow-sm">
                  7/24
                </div>
              </div>

              <div className="flex-1 min-w-0">
                <h3 className={`text-sm font-extrabold ${cardTitleText} uppercase tracking-wide`}>
                  NÖBETÇİ ECZANELER
                </h3>
                <p className={`text-[11px] ${cardSubText} font-medium leading-tight mt-1`}>
                  Van'da her gün güncellenen nöbetçi eczaneler listesi
                </p>
                <button
                  onClick={() => setActiveModal('pharmacy')}
                  className={`mt-2.5 w-full ${buttonStyle} text-xs font-bold py-2 px-3 rounded-full transition-all shadow-sm flex items-center justify-center gap-1 active:scale-95 border`}
                >
                  TÜM LİSTEYİ GÖR &rarr;
                </button>
              </div>
            </div>

            {/* 2. Ezan Vakitleri Card */}
            <div className={`${cardBg} rounded-3xl p-4 shadow-xl border text-center relative overflow-hidden`}>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-1.5">
                  <Clock className="w-4 h-4 text-emerald-500 animate-pulse" />
                  <h3 className={`text-xs font-black ${cardTitleText} uppercase tracking-widest flex items-center gap-1.5`}>
                    EZAN VAKİTLERİ (VAN)
                    <span className="bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-[9px] font-extrabold px-1.5 py-0.5 rounded-full">
                      Diyanet Canlı
                    </span>
                  </h3>
                </div>

                <div className="flex items-center gap-1.5">
                  <button
                    onClick={handleRefreshPrayerTimes}
                    title="Diyanet Vakitlerini Yenile"
                    className="p-1 rounded-full hover:bg-slate-500/10 text-slate-400 hover:text-emerald-500 transition-colors"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${isPrayerLoading ? 'animate-spin text-emerald-500' : ''}`} />
                  </button>
                  <button
                    onClick={() => setActiveModal('pray')}
                    className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 hover:underline bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20"
                  >
                    DETAY &rarr;
                  </button>
                </div>
              </div>

              {/* Active Prayer Banner */}
              <div className="mb-3 bg-gradient-to-r from-emerald-500/10 via-amber-500/10 to-emerald-500/10 border border-emerald-500/20 rounded-xl p-2 flex items-center justify-between gap-2 text-left">
                <div className="flex items-center gap-2">
                  <span className="relative flex h-2.5 w-2.5">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
                  </span>
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">ŞU ANKİ VAKİT</span>
                    <span className="text-xs font-black text-emerald-600 dark:text-emerald-400">
                      {prayerData?.activeTitle || 'Öğle Vakti'}
                    </span>
                  </div>
                </div>

                <div className="text-right">
                  <span className="text-[10px] font-bold text-amber-600 dark:text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-full border border-amber-500/20 font-mono">
                    {prayerData?.nextPrayer ? `${prayerData.nextPrayer}: ${prayerData.remainingText}` : 'İkindi Vaktine Az Kaldı'}
                  </span>
                </div>
              </div>

              {/* 6 Prayer Times Grid */}
              <div className="grid grid-cols-6 gap-1 sm:gap-1.5">
                {[
                  { key: 'imsak', title: 'İMSAK', time: prayerData?.times.imsak || PRAYER_TIMES.imsak },
                  { key: 'sabah', title: 'GÜNEŞ', time: prayerData?.times.sabah || PRAYER_TIMES.sabah },
                  { key: 'ogle', title: 'ÖĞLE', time: prayerData?.times.ogle || PRAYER_TIMES.ogle },
                  { key: 'ikindi', title: 'İKİNDİ', time: prayerData?.times.ikindi || PRAYER_TIMES.ikindi },
                  { key: 'aksam', title: 'AKŞAM', time: prayerData?.times.aksam || PRAYER_TIMES.aksam },
                  { key: 'yatsi', title: 'YATSI', time: prayerData?.times.yatsi || PRAYER_TIMES.yatsi },
                ].map((item) => {
                  const isActive = prayerData ? prayerData.activeKey === item.key : item.key === 'ogle';
                  return (
                    <div
                      key={item.key}
                      onClick={() => setActiveModal('pray')}
                      className={`flex flex-col items-center cursor-pointer group transition-transform ${isActive ? 'scale-[1.03]' : ''}`}
                    >
                      <span className={`text-[9px] sm:text-[10px] font-black py-1 px-1 rounded-lg w-full text-center tracking-tight shadow-sm uppercase transition-colors ${isActive
                        ? 'bg-emerald-600 text-white shadow-emerald-500/30'
                        : isDark ? 'bg-amber-950/80 text-amber-200 group-hover:bg-amber-900' : 'bg-amber-900 text-amber-50 group-hover:bg-amber-800'
                        }`}>
                        {item.title}
                      </span>
                      <span className={`mt-1.5 text-xs font-mono font-bold py-1 px-1 rounded-md w-full transition-colors ${isActive
                        ? isDark ? 'bg-emerald-500 text-slate-950 font-black ring-2 ring-emerald-400 shadow-lg' : 'bg-emerald-100 border-2 border-emerald-500 text-emerald-950 font-black shadow-md'
                        : isDark ? 'text-slate-300 bg-slate-800/60' : 'text-slate-700 bg-slate-100'
                        }`}>
                        {item.time}
                      </span>
                      {isActive && (
                        <span className="text-[8px] font-black text-emerald-500 uppercase mt-0.5 tracking-tighter">
                          ● AKTİF
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* 3. Döviz Kuru Card (doviz.com Canlı) */}
            <div className={`${cardBg} rounded-3xl p-4 shadow-xl border text-center relative overflow-hidden`}>
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-1.5">
                  <TrendingUp className="w-4 h-4 text-indigo-500" />
                  <h3 className={`text-xs font-black ${cardTitleText} uppercase tracking-widest flex items-center gap-1.5`}>
                    DÖVİZ & ALTIN KURLARI
                    <span className="bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 text-[9px] font-extrabold px-1.5 py-0.5 rounded-full">
                      doviz.com Canlı
                    </span>
                  </h3>
                </div>

                <div className="flex items-center gap-1.5">
                  <button
                    onClick={handleRefreshCurrencies}
                    title="Kurları Yenile"
                    className="p-1 rounded-full hover:bg-slate-500/10 text-slate-400 hover:text-indigo-500 transition-colors"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${isCurrencyLoading ? 'animate-spin text-indigo-500' : ''}`} />
                  </button>
                  <button
                    onClick={() => setActiveModal('finance')}
                    className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400 hover:underline bg-indigo-500/10 px-2 py-0.5 rounded-full border border-indigo-500/20"
                  >
                    TÜM KURLAR &rarr;
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                {isCurrencyLoading && (!currencyData?.heroRates || currencyData.heroRates.length === 0) ? (
                  [1, 2, 3, 4, 5, 6].map((idx) => (
                    <div key={`skel-cb-${idx}`} className="flex flex-col items-center bg-slate-500/5 p-2 rounded-2xl border border-slate-500/10 animate-pulse">
                      <div className="w-10 h-3 bg-slate-400/20 rounded-full mb-2"></div>
                      <div className="w-14 h-4 bg-slate-400/20 rounded-full mb-1"></div>
                      <div className="w-8 h-2 bg-slate-400/20 rounded-full"></div>
                    </div>
                  ))
                ) : (currencyData?.heroRates && currencyData.heroRates.length > 0
                  ? currencyData.heroRates.slice(0, 6)
                  : []
                ).map((curr, idx) => (
                  <div
                    key={idx}
                    onClick={() => setActiveModal('finance')}
                    className="flex flex-col items-center bg-slate-500/5 hover:bg-slate-500/10 p-2 rounded-2xl border border-slate-500/10 cursor-pointer transition-all hover:scale-[1.02]"
                  >
                    <span className="bg-indigo-900 text-indigo-50 text-[10px] font-black py-0.5 px-2 rounded-full w-full text-center tracking-tight truncate shadow-sm uppercase">
                      {curr.code}
                    </span>
                    <span className={`mt-1.5 text-xs font-mono font-black ${isDark ? 'text-white' : 'text-slate-900'}`}>
                      {curr.value}
                    </span>
                    <span className={`text-[9px] font-extrabold mt-0.5 flex items-center gap-0.5 ${curr.isUp || curr.status === 'up'
                      ? 'text-emerald-500'
                      : curr.status === 'down'
                        ? 'text-rose-500'
                        : 'text-slate-400'
                      }`}>
                      {curr.isUp || curr.status === 'up' ? '▲' : curr.status === 'down' ? '▼' : '•'} {curr.change}
                    </span>
                  </div>
                ))}
              </div>

              {currencyData?.lastUpdated && (
                <div className="mt-2.5 text-[9px] text-slate-400 flex items-center justify-between px-1">
                  <span>Kaynak: doviz.com</span>
                  <span>Son Güncelleme: {currencyData.lastUpdated}</span>
                </div>
              )}
            </div>

          </div>
        ) : (
          /* ================= PAGE 2 ================= */
          <div className="space-y-4 animate-fadeIn">

            {/* 1. Vanda Bulunan Hastaneler Card */}
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

            {/* 2. Otobüs Saatleri ve Durakları Card */}
            <div className={`${cardBg} rounded-3xl p-4 shadow-xl flex items-center gap-3 border relative overflow-hidden`}>
              <div className={`w-20 h-20 shrink-0 flex items-center justify-center rounded-2xl ${isDark ? 'bg-amber-950/40 border-amber-900/50' : 'bg-amber-50 border-amber-200'} border`}>
                <div className="w-14 h-14 rounded-full border-2 border-black flex items-center justify-center bg-amber-400 text-slate-950 shadow-sm">
                  <Bus className="w-8 h-8 text-black" />
                </div>
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-1">
                  <h3 className={`text-xs font-extrabold ${cardTitleText} uppercase tracking-wide truncate`}>
                    OTOBÜS SAATLERİ VE DURAKLARI
                  </h3>
                  <span className="shrink-0 text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-amber-500/20 text-amber-600 dark:text-amber-400 border border-amber-500/30 flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse"></span>
                    van.bel.tr
                  </span>
                </div>
                <p className={`text-[10px] ${cardSubText} font-medium leading-tight mt-1 line-clamp-2`}>
                  Van Büyükşehir Belediyesi BELVAN hatları, kalkış saatleri ve durak noktaları
                </p>
                <button
                  onClick={() => setActiveModal('bus')}
                  className={`mt-2.5 w-full ${buttonStyle} text-xs font-bold py-2 px-3 rounded-full transition-all shadow-sm flex items-center justify-center gap-1 active:scale-95 border`}
                >
                  TÜM LİSTEYİ GÖR ({busRoutes.length} HAT) &rarr;
                </button>
              </div>
            </div>

            {/* 3. Acil Taksi Card */}
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

          </div>
        )}

        {/* Carousel Pagination Controls matching Screenshot */}
        <div className="flex items-center justify-between mt-6 px-2">
          {/* Custom Pill Dots Indicator */}
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setSlidePage(0)}
              className={`h-2.5 rounded-full transition-all duration-300 ${slidePage === 0 ? 'w-8 bg-red-600 shadow' : 'w-2.5 bg-slate-300/70'
                }`}
            />
            <button
              onClick={() => setSlidePage(1)}
              className={`h-2.5 rounded-full transition-all duration-300 ${slidePage === 1 ? 'w-8 bg-red-600 shadow' : 'w-2.5 bg-slate-300/70'
                }`}
            />
          </div>

          {/* DAHA FAZLA / DAHA AZ Button */}
          <button
            onClick={() => setSlidePage(slidePage === 0 ? 1 : 0)}
            className="text-xs font-extrabold text-red-600 uppercase tracking-wider flex items-center gap-1 hover:underline"
          >
            <span>{slidePage === 0 ? 'DAHA FAZLA' : 'DAHA AZ'}</span>
            <ChevronRight className={`w-4 h-4 transition-transform duration-300 ${slidePage === 1 ? 'rotate-180' : ''}`} />
          </button>
        </div>

      </div>

      {/* ================= MODAL DIALOGS FOR LISTS ================= */}

      {/* 1. Nöbetçi Eczaneler Modal */}
      {activeModal === 'pharmacy' && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className={`${isDark ? 'bg-[#18191e] text-white' : 'bg-white'} w-full max-w-lg rounded-t-3xl sm:rounded-3xl max-h-[85vh] flex flex-col shadow-2xl overflow-hidden animate-slideUp`}>
            {/* Modal Header */}
            <div className="bg-red-600 text-white p-4 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <HeartPulse className="w-6 h-6 animate-pulse" />
                <div>
                  <h3 className="font-extrabold text-base uppercase flex items-center gap-2">
                    Nöbetçi Eczaneler
                    <span className="bg-white/20 text-white text-[9px] font-extrabold px-1.5 py-0.5 rounded-full">
                      TEB Canlı
                    </span>
                  </h3>
                  <p className="text-[10px] text-red-100 font-medium">Van Eczacı Odası Canlı Nöbet Listesi</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleRefreshPharmacies}
                  title="Van Eczacı Odası Canlı Verileri Yenile"
                  className="w-8 h-8 rounded-full bg-white/20 text-white flex items-center justify-center hover:bg-white/30 transition-colors"
                >
                  <RefreshCw className={`w-4 h-4 ${isPharmaciesLoading ? 'animate-spin' : ''}`} />
                </button>
                <button
                  type="button"
                  onClick={() => setActiveModal(null)}
                  className="w-8 h-8 rounded-full bg-white/20 text-white flex items-center justify-center hover:bg-white/30 transition-colors font-bold"
                >
                  ✕
                </button>
              </div>
            </div>

            {/* City & Sub-Filter Selector Bar */}
            <div className={`p-3 border-b ${isDark ? 'bg-[#202229] border-slate-700/80' : 'bg-slate-50 border-slate-200'} flex items-center justify-between gap-2`}>
              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => setSelectedPharmacyCityFilter('Van')}
                  className={`text-xs font-bold px-3 py-1 rounded-full transition-all ${selectedPharmacyCityFilter === 'Van'
                    ? 'bg-red-600 text-white shadow-sm'
                    : isDark ? 'bg-slate-800 text-slate-300 hover:bg-slate-700' : 'bg-slate-200 text-slate-700 hover:bg-slate-300'
                    }`}
                >
                  Van Merkez & İlçeler
                </button>
                <button
                  onClick={() => setSelectedPharmacyCityFilter('Tümü')}
                  className={`text-xs font-bold px-3 py-1 rounded-full transition-all ${selectedPharmacyCityFilter === 'Tümü'
                    ? 'bg-red-600 text-white shadow-sm'
                    : isDark ? 'bg-slate-800 text-slate-300 hover:bg-slate-700' : 'bg-slate-200 text-slate-700 hover:bg-slate-300'
                    }`}
                >
                  Tümü ({pharmacies.length})
                </button>
                <button
                  onClick={() => setSelectedPharmacyCityFilter('Diğer')}
                  className={`text-xs font-bold px-3 py-1 rounded-full transition-all ${selectedPharmacyCityFilter === 'Diğer'
                    ? 'bg-red-600 text-white shadow-sm'
                    : isDark ? 'bg-slate-800 text-slate-300 hover:bg-slate-700' : 'bg-slate-200 text-slate-700 hover:bg-slate-300'
                    }`}
                >
                  Bitlis / Hakkari
                </button>
              </div>

              <span className="text-[10px] font-bold text-red-600 dark:text-red-400 bg-red-500/10 px-2 py-0.5 rounded-full border border-red-500/20 whitespace-nowrap">
                {pharmacyDutyDate}
              </span>
            </div>

            {/* Modal Scrollable Content */}
            <div className="p-4 overflow-y-auto space-y-3">
              {isPharmaciesLoading ? (
                // SKELETON LOADER
                [1, 2, 3, 4].map((skel) => (
                  <div key={`skel-pharmacy-${skel}`} className={`${isDark ? 'bg-[#22242b] border-slate-700/80' : 'bg-slate-50 border-slate-200'} border rounded-2xl p-4 shadow-sm animate-pulse flex flex-col gap-3`}>
                    <div className="flex justify-between items-start gap-2">
                      <div className="space-y-2">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <div className="w-16 h-4 bg-slate-400/20 rounded-full"></div>
                          <div className="w-10 h-4 bg-slate-400/20 rounded-full"></div>
                        </div>
                        <div className="w-40 h-5 bg-slate-400/20 rounded-full mt-2"></div>
                      </div>
                      <div className="w-20 h-5 bg-slate-400/20 rounded-full shrink-0"></div>
                    </div>
                    <div className="w-full h-8 bg-slate-400/20 rounded-xl mt-1"></div>
                    <div className="w-full h-10 bg-slate-400/20 rounded-xl mt-1"></div>
                  </div>
                ))
              ) : filteredPharmacies.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-sm font-semibold text-slate-400">Aranan kriterlere uygun nöbetçi eczane bulunamadı.</p>
                </div>
              ) : (
                filteredPharmacies.map(pharmacy => (
                  <div
                    key={pharmacy.id}
                    className={`${isDark ? 'bg-[#22242b] border-slate-700/80' : 'bg-slate-50 border-slate-200'} border rounded-2xl p-4 shadow-sm hover:border-red-400 transition-colors`}
                  >
                    <div className="flex justify-between items-start gap-2">
                      <div>
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="bg-red-600/15 text-red-600 dark:text-red-400 text-[10px] font-black px-2 py-0.5 rounded-full uppercase tracking-wider">
                            {pharmacy.district}
                          </span>
                          {pharmacy.city && (
                            <span className="bg-slate-500/15 text-slate-600 dark:text-slate-300 text-[9px] font-bold px-1.5 py-0.5 rounded-full">
                              {pharmacy.city}
                            </span>
                          )}
                        </div>
                        <h4 className={`font-black text-base mt-1.5 ${isDark ? 'text-white' : 'text-slate-900'}`}>
                          {pharmacy.name}
                        </h4>
                      </div>
                      <span className="text-[10px] font-extrabold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-full border border-emerald-500/20 shrink-0">
                        7/24 Nöbetçi
                      </span>
                    </div>

                    <p className={`text-xs mt-2.5 flex items-start gap-1.5 ${isDark ? 'text-slate-300' : 'text-slate-600'} leading-relaxed`}>
                      <MapPin className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
                      <span>{pharmacy.address}</span>
                    </p>

                    <div className={`mt-3 pt-3 border-t ${isDark ? 'border-slate-700/60' : 'border-slate-200'} flex items-center justify-between gap-2`}>
                      {pharmacy.mapsUrl ? (
                        <a
                          href={pharmacy.mapsUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs font-bold text-sky-600 dark:text-sky-400 hover:underline flex items-center gap-1"
                        >
                          <Navigation className="w-3.5 h-3.5" />
                          <span>Haritada Yol Tarifi</span>
                        </a>
                      ) : (
                        <span className={`text-xs font-medium ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Mesafe: {pharmacy.distance}</span>
                      )}

                      <a
                        href={`tel:${pharmacy.phone.replace(/\s+/g, '')}`}
                        className="bg-red-600 hover:bg-red-700 text-white text-xs font-extrabold py-1.5 px-3.5 rounded-full flex items-center gap-1.5 shadow-sm transition-transform active:scale-95"
                      >
                        <PhoneCall className="w-3.5 h-3.5" />
                        <span>{pharmacy.phone}</span>
                      </a>
                    </div>
                  </div>
                ))
              )}

              <div className="mt-4 text-[10px] text-slate-400 flex items-center justify-between border-t border-slate-700/30 pt-2 px-1">
                <span>Kaynak: TEB 38. Bölge Van Eczacı Odası</span>
                <span>{pharmacyLastUpdated || 'Canlı Güncellendi'}</span>
              </div>
            </div>
          </div>
        </div>
      )}

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

                  <div className={`mt-3 pt-3 border-t ${isDark ? 'border-slate-700' : 'border-slate-200'} flex items-center justify-between`}>
                    <a
                      href={`tel:112`}
                      className="bg-red-50 text-red-700 hover:bg-red-100 text-xs font-bold py-1.5 px-3 rounded-full flex items-center gap-1 border border-red-200"
                    >
                      <PhoneCall className="w-3.5 h-3.5 text-red-600" />
                      <span>Acil 112</span>
                    </a>

                    <a
                      href={`tel:${hosp.phone}`}
                      className="bg-cyan-700 hover:bg-cyan-800 text-white text-xs font-bold py-1.5 px-3 rounded-full flex items-center gap-1 shadow-sm"
                    >
                      <PhoneCall className="w-3.5 h-3.5" />
                      <span>{hosp.phone}</span>
                    </a>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* 3. Otobüs Saatleri Modal */}
      {activeModal === 'bus' && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4 animate-fadeIn">
          <div className={`${isDark ? 'bg-[#18191e] text-white border-slate-800' : 'bg-white border-slate-100'} w-full max-w-2xl max-h-[90vh] flex flex-col rounded-t-3xl sm:rounded-3xl border shadow-2xl overflow-hidden animate-slideUp`}>

            {/* Modal Header */}
            <div className={`p-4 sm:p-5 border-b flex items-center justify-between ${isDark ? 'border-slate-800 bg-[#1e2029]' : 'border-slate-100 bg-amber-500 text-slate-950'}`}>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-amber-400 text-slate-950 flex items-center justify-center shadow-md font-black">
                  <Bus className="w-6 h-6 text-slate-950" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className={`font-black text-base uppercase tracking-tight ${isDark ? 'text-white' : 'text-slate-950'}`}>
                      VAN OTOBÜS SAATLERİ VE DURAKLARI
                    </h3>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping"></span>
                      Canlı Sync
                    </span>
                  </div>
                  <p className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-800'} font-medium`}>
                    Kaynak: van.bel.tr (VAN BELVAN Ulaşım Dairesi)
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={handleRefreshBusSchedules}
                  disabled={isBusLoading}
                  title="Yenile (van.bel.tr)"
                  className={`p-2 rounded-xl transition-all ${isDark ? 'bg-slate-800 hover:bg-slate-700 text-slate-300' : 'bg-black/10 hover:bg-black/20 text-slate-950'
                    }`}
                >
                  <RefreshCw className={`w-4 h-4 ${isBusLoading ? 'animate-spin' : ''}`} />
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

            {/* Info Notice & Search Bar */}
            <div className={`p-3 sm:p-4 border-b space-y-3 ${isDark ? 'bg-[#15161b] border-slate-800' : 'bg-amber-50/50 border-amber-100'}`}>
              <div className="flex items-center justify-between gap-2 text-xs">
                <div className="flex items-center gap-1.5 text-slate-400 font-medium truncate">
                  <Info className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                  <span className="truncate">{busLastUpdated || 'van.bel.tr canlı hat listesi'}</span>
                </div>
                <a
                  href="https://van.bel.tr/Syf/Otobus-Hareket-Saatleri.html"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[11px] font-bold text-amber-500 hover:underline flex items-center gap-1 shrink-0"
                >
                  <span>van.bel.tr Resmi Sayfa</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>

              {/* Search Bar */}
              <div className="relative">
                <Search className={`absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 ${isDark ? 'text-slate-500' : 'text-slate-400'}`} />
                <input
                  type="text"
                  value={busSearchQuery}
                  onChange={(e) => setBusSearchQuery(e.target.value)}
                  placeholder="Hat numarası, güzergah veya durak adı yazın..."
                  className={`w-full pl-10 pr-9 py-2.5 text-xs rounded-xl border font-medium transition-all outline-none ${isDark
                    ? 'bg-[#1e2029] border-slate-700 text-white placeholder-slate-500 focus:border-amber-500'
                    : 'bg-white border-slate-200 text-slate-900 placeholder-slate-400 focus:border-amber-500'
                    }`}
                />
                {busSearchQuery && (
                  <button
                    onClick={() => setBusSearchQuery('')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>

            {/* Bus List */}
            <div className="p-4 overflow-y-auto space-y-4 flex-1">
              {busRoutes
                .filter(bus => {
                  if (!busSearchQuery.trim()) return true;
                  const q = busSearchQuery.toLowerCase();
                  return (
                    bus.lineNo.toLowerCase().includes(q) ||
                    bus.title.toLowerCase().includes(q) ||
                    bus.route.toLowerCase().includes(q) ||
                    (bus.stops && bus.stops.some(s => s.toLowerCase().includes(q)))
                  );
                })
                .map((bus) => {
                  const isExpanded = activeBusId === bus.id;
                  return (
                    <div
                      key={bus.id}
                      className={`border rounded-2xl p-4 shadow-sm transition-all ${isDark ? 'bg-[#20222b] border-slate-800 hover:border-slate-700' : 'bg-white border-slate-200 hover:border-amber-300'
                        }`}
                    >
                      {/* Line Badge & Status */}
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <span className="bg-amber-400 text-slate-950 font-black text-xs px-3 py-1 rounded-lg shadow-sm">
                            {bus.lineNo}
                          </span>
                          <span className={`text-[11px] font-semibold ${isDark ? 'text-amber-400' : 'text-amber-700'}`}>
                            {bus.frequency}
                          </span>
                        </div>
                        <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full ${bus.status === 'Aktif'
                          ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20'
                          : 'bg-amber-500/10 text-amber-500 border border-amber-500/20'
                          }`}>
                          ● {bus.status}
                        </span>
                      </div>

                      {/* Title */}
                      <h4 className={`font-bold text-sm mt-2.5 ${isDark ? 'text-white' : 'text-slate-900'}`}>
                        {bus.title}
                      </h4>

                      {/* Route Path Summary */}
                      <div className={`text-xs mt-2 p-2.5 rounded-xl font-medium border flex items-start gap-2 ${isDark ? 'bg-[#17181f] text-slate-300 border-slate-800' : 'bg-slate-50 text-slate-700 border-slate-200'
                        }`}>
                        <Navigation className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                        <span className="leading-relaxed">{bus.route}</span>
                      </div>

                      {/* Departure Times */}
                      <div className="mt-3">
                        <div className="flex items-center justify-between mb-1.5">
                          <span className={`text-[11px] font-bold uppercase flex items-center gap-1 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                            <Clock className="w-3.5 h-3.5 text-amber-500" />
                            Merkezden Kalkış Saatleri:
                          </span>
                          <span className="text-[10px] font-mono text-slate-400">({bus.departureTimes.length} Sefer)</span>
                        </div>
                        <div className="flex flex-wrap gap-1.5">
                          {bus.departureTimes.map((t, idx) => (
                            <span
                              key={idx}
                              className={`font-mono text-xs px-2.5 py-1 rounded-lg font-bold border ${isDark ? 'bg-[#181a20] text-amber-300 border-slate-700' : 'bg-amber-50 text-slate-900 border-amber-200'
                                }`}
                            >
                              {t}
                            </span>
                          ))}
                        </div>
                      </div>

                      {/* Return Times (If available) */}
                      {bus.returnTimes && bus.returnTimes.length > 0 && (
                        <div className="mt-3 pt-3 border-t border-dashed border-slate-700/50">
                          <div className="flex items-center justify-between mb-1.5">
                            <span className={`text-[11px] font-bold uppercase flex items-center gap-1 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                              <Clock className="w-3.5 h-3.5 text-cyan-500" />
                              Varış Noktasından Dönüş Saatleri:
                            </span>
                            <span className="text-[10px] font-mono text-slate-400">({bus.returnTimes.length} Sefer)</span>
                          </div>
                          <div className="flex flex-wrap gap-1.5">
                            {bus.returnTimes.map((t, idx) => (
                              <span
                                key={idx}
                                className={`font-mono text-xs px-2.5 py-1 rounded-lg font-medium border ${isDark ? 'bg-slate-800 text-slate-300 border-slate-700' : 'bg-slate-100 text-slate-800 border-slate-200'
                                  }`}
                              >
                                {t}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Tariff & Operating Info */}
                      {(bus.tariff || bus.operatingHours) && (
                        <div className={`mt-3 p-2.5 rounded-xl text-xs flex flex-wrap items-center justify-between gap-2 ${isDark ? 'bg-[#16171d] text-slate-400 border border-slate-800' : 'bg-amber-50/60 text-slate-600 border border-amber-100'
                          }`}>
                          {bus.tariff && (
                            <span className="font-semibold text-slate-700 dark:text-slate-300">
                              💳 {bus.tariff}
                            </span>
                          )}
                          {bus.operatingHours && (
                            <span className="font-mono text-[11px] text-amber-600 dark:text-amber-400 font-bold">
                              ⏰ Çalışma: {bus.operatingHours}
                            </span>
                          )}
                        </div>
                      )}

                      {/* Expandable Stops Timeline Toggle */}
                      {bus.stops && bus.stops.length > 0 && (
                        <div className="mt-3 pt-2">
                          <button
                            onClick={() => setActiveBusId(isExpanded ? null : bus.id)}
                            className={`w-full py-2 px-3 rounded-xl text-xs font-bold flex items-center justify-between transition-all ${isDark
                              ? 'bg-[#191b22] hover:bg-[#252834] text-amber-400 border border-slate-800'
                              : 'bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-200'
                              }`}
                          >
                            <span className="flex items-center gap-1.5">
                              <MapPin className="w-4 h-4 text-amber-500" />
                              Durak Noktaları ({bus.stops.length} Durak)
                            </span>
                            {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                          </button>

                          {/* Render Stops Timeline */}
                          {isExpanded && (
                            <div className={`mt-3 p-3 rounded-xl border animate-fadeIn ${isDark ? 'bg-[#15161c] border-slate-800' : 'bg-slate-50 border-slate-200'
                              }`}>
                              <h5 className="text-[11px] font-extrabold text-slate-400 uppercase tracking-wider mb-2.5">
                                Hat Durak Sıralaması
                              </h5>
                              <div className="space-y-2 relative pl-3 before:absolute before:left-5 before:top-2 before:bottom-2 before:w-0.5 before:bg-amber-500/40">
                                {bus.stops.map((stop, sIdx) => (
                                  <div key={sIdx} className="flex items-center gap-3 relative z-10 text-xs">
                                    <div className={`w-4 h-4 rounded-full flex items-center justify-center font-bold text-[9px] shrink-0 shadow-sm ${sIdx === 0
                                      ? 'bg-emerald-500 text-white'
                                      : sIdx === bus.stops!.length - 1
                                        ? 'bg-rose-500 text-white'
                                        : 'bg-amber-400 text-slate-950'
                                      }`}>
                                      {sIdx + 1}
                                    </div>
                                    <span className={`font-medium ${sIdx === 0 || sIdx === bus.stops!.length - 1
                                      ? 'font-bold text-slate-900 dark:text-white'
                                      : 'text-slate-700 dark:text-slate-300'
                                      }`}>
                                      {stop}
                                    </span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
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
                  onClick={() => setIsAddTaxiModalOpen(true)}
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
                    onClick={() => setIsAddTaxiModalOpen(true)}
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

                      <button
                        onClick={() => handleDeleteTaxi(taxi.id)}
                        title="İlanı Sil"
                        className={`p-2.5 rounded-xl border transition-all ${isDark ? 'bg-slate-800 hover:bg-rose-950/60 text-slate-400 hover:text-rose-400 border-slate-700' : 'bg-slate-100 hover:bg-rose-50 text-slate-500 hover:text-rose-600 border-slate-200'
                          }`}
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
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

      {/* 5. Van Hava Durumu Modal */}
      {activeModal === 'weather' && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4 animate-fadeIn">
          <div className={`${isDark ? 'bg-[#18191e] text-white' : 'bg-white'} w-full max-w-lg rounded-t-3xl sm:rounded-3xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden animate-slideUp`}>
            {/* Modal Header */}
            <div className="bg-gradient-to-r from-sky-600 to-blue-700 text-white p-4 flex items-center justify-between shadow-md shrink-0">
              <div className="flex items-center gap-2.5">
                <CloudSun className="w-6 h-6 text-sky-200" />
                <div>
                  <h3 className="font-black text-base uppercase leading-tight tracking-wide flex items-center gap-2">
                    VAN HAVA DURUMU
                    <span className="bg-white/20 text-white text-[9px] font-extrabold px-1.5 py-0.5 rounded-full">
                      MGM Canlı
                    </span>
                  </h3>
                  <p className="text-[10px] text-sky-100 font-medium">Günlük, 7 Günlük Tahmin, UV & Hava Kalitesi</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleRefreshWeather}
                  title="MGM Verilerini Yenile"
                  className="w-8 h-8 rounded-full bg-white/20 text-white flex items-center justify-center hover:bg-white/30 transition-colors"
                >
                  <RefreshCw className={`w-4 h-4 ${isWeatherLoading ? 'animate-spin' : ''}`} />
                </button>
                <button
                  type="button"
                  onClick={() => setActiveModal(null)}
                  className="w-8 h-8 rounded-full bg-white/20 text-white flex items-center justify-center hover:bg-white/30 transition-colors font-bold"
                >
                  ✕
                </button>
              </div>
            </div>

            {/* Modal Scroll Content */}
            <div className="p-4 overflow-y-auto space-y-4 text-slate-800 dark:text-slate-100">

              {/* SECTION 1: Günlük Hava Durumu (Current Details) */}
              <div className={`${isDark ? 'bg-[#22242b] border-slate-700' : 'bg-gradient-to-br from-sky-50 to-blue-50 border-sky-100'} border rounded-2xl p-4 shadow-sm relative overflow-hidden`}>
                <div className="flex justify-between items-start">
                  <div>
                    <span className="bg-sky-500/20 text-sky-600 dark:text-sky-400 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wide">
                      {weather.city}
                    </span>
                    <h4 className={`text-3xl font-black mt-1 ${isDark ? 'text-white' : 'text-slate-900'}`}>
                      {weather.currentTemp}°C
                    </h4>
                    <p className={`text-xs font-semibold mt-0.5 ${isDark ? 'text-sky-300' : 'text-sky-700'}`}>
                      {weather.condition} • Hissedilen {weather.feelsLike}°C
                    </p>
                  </div>

                  <div className="flex flex-col items-end">
                    <CloudSun className="w-12 h-12 text-sky-500" />
                    <span className={`text-[11px] font-mono font-bold mt-1 ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                      Y: {weather.tempMax}° / D: {weather.tempMin}°
                    </span>
                  </div>
                </div>

                {/* Quick Metrics Grid */}
                <div className={`grid grid-cols-3 gap-2 mt-3 pt-3 border-t ${isDark ? 'border-slate-700' : 'border-sky-200/60'}`}>
                  <div className="flex items-center gap-2">
                    <Droplets className="w-4 h-4 text-blue-500 shrink-0" />
                    <div>
                      <div className="text-[9px] uppercase font-bold text-slate-400">Nem</div>
                      <div className="text-xs font-bold font-mono">%{weather.humidity}</div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <Wind className="w-4 h-4 text-teal-500 shrink-0" />
                    <div>
                      <div className="text-[9px] uppercase font-bold text-slate-400">Rüzgar</div>
                      <div className="text-xs font-bold font-mono">{weather.windSpeed} km/s {weather.windDirection}</div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <Compass className="w-4 h-4 text-indigo-500 shrink-0" />
                    <div>
                      <div className="text-[9px] uppercase font-bold text-slate-400">Basınç</div>
                      <div className="text-xs font-bold font-mono">{weather.pressure} hPa</div>
                    </div>
                  </div>
                </div>

                <div className="mt-3 text-[10px] text-slate-400 flex items-center justify-between border-t border-slate-700/30 pt-2">
                  <span>MGM & Meteoroloji Veri Servisi</span>
                  <span>{weather.lastUpdated}</span>
                </div>
              </div>

              {/* SECTION 2: Hava Kalitesi (AQI) */}
              <div className={`${isDark ? 'bg-[#22242b] border-slate-700' : 'bg-slate-50 border-slate-200'} border rounded-2xl p-4 shadow-sm space-y-2`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Wind className="w-5 h-5 text-emerald-500" />
                    <h4 className="font-extrabold text-xs sm:text-sm uppercase tracking-wide">Hava Kalitesi (AQI)</h4>
                  </div>
                  <span className="bg-emerald-500/20 text-emerald-500 text-xs font-black px-2.5 py-1 rounded-full">
                    {weather.aqi} AQI - {weather.aqiStatus}
                  </span>
                </div>

                {/* Visual bar for AQI */}
                <div className="space-y-1">
                  <div className="w-full h-2.5 bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden p-0.5">
                    <div
                      className="h-full bg-emerald-500 rounded-full transition-all duration-500"
                      style={{ width: `${Math.min(100, (weather.aqi / 150) * 100)}%` }}
                    />
                  </div>
                  <div className="flex justify-between text-[9px] font-bold text-slate-400 uppercase">
                    <span>0 (Temiz)</span>
                    <span>50 (İyi)</span>
                    <span>100+ (Hassas)</span>
                  </div>
                </div>

                <p className={`text-xs ${isDark ? 'text-slate-300' : 'text-slate-600'} leading-relaxed pt-1`}>
                  🍃 {weather.aqiAdvice}
                </p>
              </div>

              {/* SECTION 3: UV Işın Miktarı */}
              <div className={`${isDark ? 'bg-[#22242b] border-slate-700' : 'bg-slate-50 border-slate-200'} border rounded-2xl p-4 shadow-sm space-y-2`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Sun className="w-5 h-5 text-amber-500" />
                    <h4 className="font-extrabold text-xs sm:text-sm uppercase tracking-wide">UV Işın Miktarı</h4>
                  </div>
                  <span className="bg-amber-500/20 text-amber-500 text-xs font-black px-2.5 py-1 rounded-full">
                    {weather.uvIndex} / 11 ({weather.uvStatus})
                  </span>
                </div>

                {/* Visual bar for UV */}
                <div className="space-y-1">
                  <div className="w-full h-2.5 bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden p-0.5">
                    <div
                      className="h-full bg-gradient-to-r from-amber-400 to-orange-500 rounded-full transition-all duration-500"
                      style={{ width: `${(weather.uvIndex / 11) * 100}%` }}
                    />
                  </div>
                  <div className="flex justify-between text-[9px] font-bold text-slate-400 uppercase">
                    <span>1 (Düşük)</span>
                    <span>6 (Orta)</span>
                    <span>11+ (Çok Yüksek)</span>
                  </div>
                </div>

                <p className={`text-xs ${isDark ? 'text-slate-300' : 'text-slate-600'} leading-relaxed pt-1`}>
                  ☀️ {weather.uvAdvice}
                </p>
              </div>

              {/* SECTION 4: 7 Günlük Hava Durumu Tahmini */}
              <div className="space-y-2">
                <div className="flex items-center justify-between px-1">
                  <h4 className="font-extrabold text-xs sm:text-sm uppercase tracking-wide flex items-center gap-2">
                    <CalendarDays className="w-4 h-4 text-sky-500" />
                    <span>7 Günlük Hava Tahmini</span>
                  </h4>
                  <span className={`text-[10px] ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                    Van İli Meteorolojik Tahminleri
                  </span>
                </div>

                <div className="space-y-2">
                  {weather.forecast7Days.map((forecast, idx) => (
                    <div
                      key={idx}
                      className={`${isDark ? 'bg-[#22242b] border-slate-700/80' : 'bg-slate-50 border-slate-200'} border rounded-2xl p-3 flex items-center justify-between hover:border-sky-300 transition-colors`}
                    >
                      {/* Day name & date */}
                      <div className="w-24 sm:w-28 shrink-0">
                        <div className={`text-xs font-bold ${idx === 0 ? 'text-sky-500' : isDark ? 'text-white' : 'text-slate-900'}`}>
                          {forecast.day}
                        </div>
                        <div className={`text-[10px] ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                          {forecast.date}
                        </div>
                      </div>

                      {/* Condition Icon & text */}
                      <div className="flex items-center gap-2 flex-1 min-w-0 px-1">
                        {renderWeatherIcon(forecast.icon, "w-5 h-5 shrink-0")}
                        <span className={`text-xs font-medium truncate ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                          {forecast.condition}
                        </span>
                      </div>

                      {/* Pop (Rain %) & Temperatures */}
                      <div className="flex items-center gap-2 sm:gap-3 shrink-0 text-right">
                        {forecast.pop > 0 && (
                          <span className="text-[9px] font-bold text-blue-500 bg-blue-50 dark:bg-blue-950/60 px-1.5 py-0.5 rounded border border-blue-200 dark:border-blue-900">
                            %{forecast.pop} yağış
                          </span>
                        )}
                        <div className="font-mono text-xs font-extrabold">
                          <span className={isDark ? 'text-white' : 'text-slate-900'}>{forecast.tempMax}°</span>
                          <span className="text-slate-400 mx-0.5">/</span>
                          <span className="text-slate-400">{forecast.tempMin}°</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

            </div>
          </div>
        </div>
      )}

      {/* 6. Ezan Vakitleri Modal (Diyanet Canlı) */}
      {activeModal === 'pray' && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4 animate-fadeIn">
          <div className={`${isDark ? 'bg-[#18191e] text-white' : 'bg-white'} w-full max-w-lg rounded-t-3xl sm:rounded-3xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden animate-slideUp`}>
            {/* Modal Header */}
            <div className="bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-700 text-white p-4 flex items-center justify-between shadow-md shrink-0">
              <div className="flex items-center gap-2.5">
                <Clock className="w-6 h-6 text-emerald-200 animate-pulse" />
                <div>
                  <h3 className="font-black text-base uppercase leading-tight tracking-wide flex items-center gap-2">
                    VAN EZAN VAKİTLERİ
                    <span className="bg-white/20 text-white text-[9px] font-extrabold px-1.5 py-0.5 rounded-full">
                      Diyanet Canlı
                    </span>
                  </h3>
                  <p className="text-[10px] text-emerald-100 font-medium">Van İli Resmi Namaz Vakitleri & Vakit Takibi</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleRefreshPrayerTimes}
                  title="Diyanet Vakitlerini Yenile"
                  className="w-8 h-8 rounded-full bg-white/20 text-white flex items-center justify-center hover:bg-white/30 transition-colors"
                >
                  <RefreshCw className={`w-4 h-4 ${isPrayerLoading ? 'animate-spin' : ''}`} />
                </button>
                <button
                  type="button"
                  onClick={() => setActiveModal(null)}
                  className="w-8 h-8 rounded-full bg-white/20 text-white flex items-center justify-center hover:bg-white/30 transition-colors font-bold"
                >
                  ✕
                </button>
              </div>
            </div>

            {/* Modal Scroll Content */}
            <div className="p-4 overflow-y-auto space-y-4 text-slate-800 dark:text-slate-100">

              {/* SECTION 1: Current Active Prayer Banner */}
              <div className={`${isDark ? 'bg-[#22242b] border-slate-700' : 'bg-gradient-to-br from-emerald-50 to-teal-50 border-emerald-100'} border rounded-2xl p-4 shadow-sm relative overflow-hidden`}>
                <div className="flex justify-between items-start">
                  <div>
                    <span className="bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-[10px] font-black px-2.5 py-0.5 rounded-full uppercase tracking-wider">
                      {prayerData?.date || 'Bugün'} • Van Merkez
                    </span>
                    <h4 className={`text-2xl sm:text-3xl font-black mt-1.5 ${isDark ? 'text-white' : 'text-slate-900'}`}>
                      {prayerData?.activeTitle || 'Öğle Vakti'}
                    </h4>
                    <p className={`text-xs font-semibold mt-1 ${isDark ? 'text-emerald-300' : 'text-emerald-800'}`}>
                      {prayerData?.nextPrayer ? `${prayerData.nextPrayer} Vaktine: ` : 'Sonraki Vakte: '}
                      <span className="font-mono font-black text-amber-600 dark:text-amber-400">{prayerData?.remainingText || 'Hesaplanıyor...'}</span>
                    </p>
                  </div>

                  <div className="flex flex-col items-end">
                    <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 text-emerald-500 flex items-center justify-center shadow-inner">
                      <Clock className="w-7 h-7" />
                    </div>
                    <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 mt-1 uppercase">
                      ● AKTİF VAKİT
                    </span>
                  </div>
                </div>

                <div className="mt-3 text-[10px] text-slate-400 flex items-center justify-between border-t border-slate-700/30 pt-2">
                  <span>Diyanet İşleri Başkanlığı Otomatik Servisi</span>
                  <span>{prayerData?.lastUpdated || 'Canlı Veri'}</span>
                </div>
              </div>

              {/* SECTION 2: 6 Detailed Daily Prayer Cards */}
              <div className="space-y-2.5">
                <h4 className="font-extrabold text-xs uppercase tracking-wider text-slate-400 px-1">
                  BUGÜNKÜ 6 NAMAZ VAKTİ (DİYANET)
                </h4>

                {[
                  { key: 'imsak', title: 'İMSAK (SABAH BAŞLANGICI)', time: prayerData?.times.imsak || PRAYER_TIMES.imsak, desc: 'Sabah namazı ve oruç başlama vaktidir.' },
                  { key: 'sabah', title: 'GÜNEŞ (SABAH SONU)', time: prayerData?.times.sabah || PRAYER_TIMES.sabah, desc: 'Güneş doğuş vaktidir, sabah namazı bu vakte kadar kılınır.' },
                  { key: 'ogle', title: 'ÖĞLE VAKTİ', time: prayerData?.times.ogle || PRAYER_TIMES.ogle, desc: 'Güneş tam tepe noktayı geçtikten sonra öğle namazı vakti girer.' },
                  { key: 'ikindi', title: 'İKİNDİ VAKTİ', time: prayerData?.times.ikindi || PRAYER_TIMES.ikindi, desc: 'Nesnelerin gölgesi uzadığında ikindi namazı vakti başlar.' },
                  { key: 'aksam', title: 'AKŞAM VAKTİ (İFTAR)', time: prayerData?.times.aksam || PRAYER_TIMES.aksam, desc: 'Güneş battığı an akşam namazı ve oruç açma (iftar) vaktidir.' },
                  { key: 'yatsi', title: 'YATSI VAKTİ', time: prayerData?.times.yatsi || PRAYER_TIMES.yatsi, desc: 'Akşam şafağının kaybolmasıyla yatsı namazı vakti başlar.' },
                ].map((item) => {
                  const isActive = prayerData ? prayerData.activeKey === item.key : item.key === 'ogle';

                  return (
                    <div
                      key={item.key}
                      className={`border rounded-2xl p-3.5 transition-all flex items-center justify-between gap-3 ${isActive
                        ? isDark
                          ? 'bg-emerald-950/40 border-emerald-500/80 shadow-lg ring-1 ring-emerald-500/40'
                          : 'bg-emerald-50/90 border-emerald-400 shadow-md ring-1 ring-emerald-300'
                        : isDark
                          ? 'bg-[#22242b] border-slate-700/80'
                          : 'bg-slate-50 border-slate-200'
                        }`}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 font-mono font-black text-sm ${isActive
                          ? 'bg-emerald-600 text-white shadow-md'
                          : isDark ? 'bg-slate-800 text-slate-300' : 'bg-slate-200 text-slate-700'
                          }`}>
                          {item.time}
                        </div>

                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <h5 className={`font-black text-xs sm:text-sm uppercase tracking-tight truncate ${isActive ? 'text-emerald-600 dark:text-emerald-400' : isDark ? 'text-white' : 'text-slate-900'
                              }`}>
                              {item.title}
                            </h5>
                          </div>
                          <p className={`text-[11px] leading-snug mt-0.5 truncate ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                            {item.desc}
                          </p>
                        </div>
                      </div>

                      <div className="shrink-0 text-right">
                        {isActive ? (
                          <span className="bg-emerald-600 text-white text-[10px] font-black px-2.5 py-1 rounded-full shadow-sm animate-pulse">
                            ŞU ANKİ VAKİT
                          </span>
                        ) : (
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${isDark ? 'bg-slate-800 text-slate-400' : 'bg-slate-200 text-slate-600'
                            }`}>
                            Vakit
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="p-3 bg-slate-500/10 rounded-xl text-[11px] text-slate-400 leading-relaxed border border-slate-700/30">
                <span className="font-bold text-slate-300">📌 Bilgi:</span> Vakitler doğrudan T.C. Diyanet İşleri Başkanlığı Namaz Vakitleri Servisi (<span className="underline">namazvakitleri.diyanet.gov.tr/tr-TR/9930/van-icin-namaz-vakti</span>) üzerinden anlık çekilmektedir.
              </div>

            </div>
          </div>
        </div>
      )}

      {/* ================= MODAL: FINANCE / CANLI DÖVİZ & ALTIN (doviz.com) ================= */}
      {activeModal === 'finance' && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 animate-fadeIn">
          <div className={`w-full max-w-2xl max-h-[90vh] flex flex-col rounded-3xl ${isDark ? 'bg-[#18191e] text-white border-slate-800' : 'bg-white border-slate-100'} border shadow-2xl overflow-hidden`}>

            {/* Modal Header */}
            <div className={`p-4 sm:p-5 border-b flex items-center justify-between ${isDark ? 'border-slate-800 bg-[#1e2029]' : 'border-slate-100 bg-white'}`}>
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-2xl bg-indigo-500/20 text-indigo-500 flex items-center justify-center shadow-inner">
                  <TrendingUp className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className={`text-sm sm:text-base font-black ${isDark ? 'text-white' : 'text-slate-900'} uppercase tracking-tight`}>
                      CANLI DÖVİZ & ALTIN PİYASASI
                    </h3>
                    <span className="bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-[10px] font-black px-2 py-0.5 rounded-full flex items-center gap-1 animate-pulse">
                      ● CANLI
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400 font-medium">
                    {currencyData?.source || 'doviz.com (https://www.doviz.com/)'} • {currencyData?.lastUpdated || 'Anlık Güncelleniyor'}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={handleRefreshCurrencies}
                  disabled={isCurrencyLoading}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 text-xs font-bold transition-all border border-indigo-500/20"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isCurrencyLoading ? 'animate-spin' : ''}`} />
                  <span className="hidden sm:inline">Yenile</span>
                </button>
                <button
                  onClick={() => setActiveModal(null)}
                  className="w-9 h-9 rounded-full bg-slate-500/10 hover:bg-slate-500/20 text-slate-400 hover:text-white flex items-center justify-center transition-all"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Modal Body */}
            <div className="p-4 sm:p-5 space-y-4 overflow-y-auto flex-1 custom-scrollbar">

              {/* Header Metric Cards */}
              <div>
                <h4 className="font-extrabold text-xs uppercase tracking-wider text-slate-400 mb-2.5 px-1">
                  ÖNE ÇIKAN KURLAR & ENSTRÜMANLAR
                </h4>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                  {isCurrencyLoading && (!currencyData?.heroRates || currencyData.heroRates.length === 0) ? (
                    // SKELETON LOADER
                    [1, 2, 3, 4, 5, 6].map((idx) => (
                      <div key={`skel-curr-${idx}`} className={`p-3 rounded-2xl border transition-all animate-pulse ${isDark ? 'bg-[#22242b] border-slate-700/80' : 'bg-slate-50 border-slate-200'}`}>
                        <div className="flex items-center justify-between mb-2">
                          <div className="w-16 h-3 bg-slate-400/20 rounded-full"></div>
                          <div className="w-8 h-4 bg-slate-400/20 rounded-md"></div>
                        </div>
                        <div className="w-24 h-5 bg-slate-400/20 rounded-full"></div>
                      </div>
                    ))
                  ) : (currencyData?.heroRates && currencyData.heroRates.length > 0
                    ? currencyData.heroRates
                    : []
                  ).map((item, idx) => (
                    <div
                      key={idx}
                      className={`p-3 rounded-2xl border transition-all ${isDark ? 'bg-[#22242b] border-slate-700/80 hover:border-indigo-500/50' : 'bg-slate-50 border-slate-200 hover:border-indigo-300'
                        }`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-[11px] font-black text-indigo-600 dark:text-indigo-400 uppercase tracking-wide">
                          {item.name} ({item.code})
                        </span>
                        <span className={`text-[10px] font-extrabold px-1.5 py-0.5 rounded-md ${item.isUp || item.status === 'up'
                          ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400'
                          : item.status === 'down'
                            ? 'bg-rose-500/15 text-rose-600 dark:text-rose-400'
                            : 'bg-slate-500/15 text-slate-400'
                          }`}>
                          {item.isUp || item.status === 'up' ? '▲' : item.status === 'down' ? '▼' : '•'} {item.change}
                        </span>
                      </div>
                      <div className={`text-lg font-mono font-black ${isDark ? 'text-white' : 'text-slate-900'}`}>
                        {item.value}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* All doviz.com Live Table Items */}
              {currencyData?.tableItems && currencyData.tableItems.length > 0 && (
                <div>
                  <h4 className="font-extrabold text-xs uppercase tracking-wider text-slate-400 mb-2.5 px-1 flex items-center justify-between">
                    <span>DÖVİZ.COM TÜM CANLI PİYASA LİSTESİ</span>
                    <span className="text-[10px] font-normal text-slate-400">({currencyData.tableItems.length} Enstrüman)</span>
                  </h4>

                  <div className={`rounded-2xl border overflow-hidden ${isDark ? 'bg-[#22242b] border-slate-700/80' : 'bg-slate-50 border-slate-200'}`}>
                    <div className="max-h-80 overflow-y-auto custom-scrollbar divide-y divide-slate-700/30">
                      {currencyData.tableItems.map((item, index) => (
                        <div
                          key={index}
                          className={`p-3 flex items-center justify-between gap-3 transition-colors ${isDark ? 'hover:bg-slate-800/50' : 'hover:bg-slate-100'
                            }`}
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            <span className="w-8 h-8 shrink-0 rounded-xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 font-mono font-black text-[11px] flex items-center justify-center uppercase border border-indigo-500/20">
                              {item.key.substring(0, 3)}
                            </span>
                            <div className="min-w-0">
                              <h5 className={`font-black text-xs sm:text-sm truncate ${isDark ? 'text-white' : 'text-slate-900'}`}>
                                {item.name}
                              </h5>
                              <p className="text-[10px] text-slate-400 font-mono">
                                Socket Key: {item.key}
                              </p>
                            </div>
                          </div>

                          <div className="shrink-0 text-right">
                            <div className={`font-mono font-black text-xs sm:text-sm ${isDark ? 'text-white' : 'text-slate-900'}`}>
                              {item.value}
                            </div>
                            <span className={`text-[10px] font-bold inline-block mt-0.5 ${item.status === 'up'
                              ? 'text-emerald-500'
                              : item.status === 'down'
                                ? 'text-rose-500'
                                : 'text-slate-400'
                              }`}>
                              {item.status === 'up' ? '▲' : item.status === 'down' ? '▼' : '•'} {item.change}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* Info Notice */}
              <div className="p-3.5 bg-indigo-500/10 rounded-2xl text-[11px] text-slate-300 leading-relaxed border border-indigo-500/20 flex items-start gap-2.5">
                <span className="text-base leading-none">🌐</span>
                <div>
                  <span className="font-bold text-indigo-400">Canlı Bağlantı Bilgisi:</span> Döviz kurları, altın fiyatları, borsa ve kripto paralar doğrudan <a href="https://www.doviz.com/" target="_blank" rel="noopener noreferrer" className="underline text-indigo-300 font-bold hover:text-white">www.doviz.com</a> adresi üzerinden web scraping yöntemiyle anlık canlı olarak çekilmektedir.
                </div>
              </div>

            </div>
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
