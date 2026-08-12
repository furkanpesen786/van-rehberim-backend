import React, { useState, useEffect, useMemo } from 'react';
import { DEALS, PLACES_TO_VISIT } from '../data/mockData';
import { Deal, PlaceToVisit } from '../types';
import { useAuth } from '../context/AuthContext';
import { auth } from '../lib/firebase';
import { deleteUser } from 'firebase/auth';
import { NotificationService, NotificationSettings } from '../services/notificationService';
import { LocalNotifications } from '@capacitor/local-notifications';
import {
  Bell,
  Vibrate,
  Heart,
  HelpCircle,
  Star,
  ShieldCheck,
  Info,
  LogOut,
  Trash2,
  ChevronRight,
  ChevronDown,
  User,
  Check,
  Smartphone,
  Sun,
  Moon,
  Palette,
  Lock,
  FileText,
  ShieldAlert,
  X,
  Building2,
  MapPin,
  PhoneCall,
  ExternalLink,
  Bookmark,
  Sparkles,
  Store,
  Calendar,
  Tag,
  Compass,
} from 'lucide-react';

interface SettingsViewProps {
  theme?: 'light' | 'dark';
  onThemeChange?: (theme: 'light' | 'dark') => void;
}

export const SettingsView: React.FC<SettingsViewProps> = ({
  theme: propsTheme,
  onThemeChange,
}) => {
  const { currentUser, setShowAuthModal, logout } = useAuth();
  const [localTheme, setLocalTheme] = useState<'light' | 'dark'>('light');

  const [isDeletingAccount, setIsDeletingAccount] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const [notificationsEnabled, setNotificationsEnabled] = useState(false);
  const [dailyRemindersEnabled, setDailyRemindersEnabled] = useState(false);
  const [deathNoticeAlerts, setDeathNoticeAlerts] = useState(false);
  const [vibrationDisabled, setVibrationDisabled] = useState(false);

  useEffect(() => {
    const settings = NotificationService.getSettings();
    setNotificationsEnabled(settings.newsEnabled);
    setDailyRemindersEnabled(settings.prayerEnabled);
    setDeathNoticeAlerts(settings.obituaryEnabled);
    setVibrationDisabled(!settings.vibrationEnabled);
    NotificationService.requestPermissions();
  }, []);

  const [isInitialLoad, setIsInitialLoad] = useState(true);
  useEffect(() => {
    if (isInitialLoad) {
      setIsInitialLoad(false);
      return;
    }
    const settings: NotificationSettings = {
      newsEnabled: notificationsEnabled,
      obituaryEnabled: deathNoticeAlerts,
      prayerEnabled: dailyRemindersEnabled,
      vibrationEnabled: !vibrationDisabled
    };
    NotificationService.saveSettings(settings);
  }, [notificationsEnabled, deathNoticeAlerts, dailyRemindersEnabled, vibrationDisabled, isInitialLoad]);

  const [isLoggedOut, setIsLoggedOut] = useState(false);
  const [isPoliciesOpen, setIsPoliciesOpen] = useState(true);
  const [selectedPolicy, setSelectedPolicy] = useState<null | 'privacy' | 'terms' | 'kvkk'>(null);

  // Favorilerim State
  const [isFavoritesOpen, setIsFavoritesOpen] = useState(false);
  const [favoritesTab, setFavoritesTab] = useState<'businesses' | 'places'>('businesses');
  const [selectedBusiness, setSelectedBusiness] = useState<Deal | null>(null);

  const [savedDealIds, setSavedDealIds] = useState<string[]>(() => {
    try {
      const stored = localStorage.getItem('saved_deals_van');
      if (stored) return JSON.parse(stored);
    } catch (e) {
      console.error(e);
    }
    return ['d-1', 'd-4']; // Default favorite sample businesses
  });

  const [savedPlaceIds, setSavedPlaceIds] = useState<string[]>(() => {
    try {
      const stored = localStorage.getItem('saved_places_van');
      if (stored) return JSON.parse(stored);
    } catch (e) {
      console.error(e);
    }
    return ['place-1', 'place-3'];
  });

  useEffect(() => {
    const syncSavedDeals = () => {
      try {
        const stored = localStorage.getItem('saved_deals_van');
        if (stored) setSavedDealIds(JSON.parse(stored));
        const storedPlaces = localStorage.getItem('saved_places_van');
        if (storedPlaces) setSavedPlaceIds(JSON.parse(storedPlaces));
      } catch (e) {
        console.error(e);
      }
    };
    window.addEventListener('van_saved_deals_changed', syncSavedDeals);
    window.addEventListener('storage', syncSavedDeals);
    return () => {
      window.removeEventListener('van_saved_deals_changed', syncSavedDeals);
      window.removeEventListener('storage', syncSavedDeals);
    };
  }, []);

  const allDeals = useMemo(() => {
    try {
      const stored = localStorage.getItem('user_deals_van');
      if (stored) {
        const customDeals: Deal[] = JSON.parse(stored);
        const existingIds = new Set(DEALS.map(d => d.id));
        const filtered = customDeals.filter(d => !existingIds.has(d.id));
        return [...filtered, ...DEALS];
      }
    } catch (e) {
      console.error(e);
    }
    return DEALS;
  }, []);

  const savedBusinesses = useMemo(() => {
    return allDeals.filter(deal => savedDealIds.includes(deal.id));
  }, [allDeals, savedDealIds]);

  const savedPlaces = useMemo(() => {
    return PLACES_TO_VISIT.filter(place => savedPlaceIds.includes(place.id));
  }, [savedPlaceIds]);

  const toggleSaveDeal = (dealId: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    const updated = savedDealIds.includes(dealId)
      ? savedDealIds.filter(id => id !== dealId)
      : [...savedDealIds, dealId];
    setSavedDealIds(updated);
    try {
      localStorage.setItem('saved_deals_van', JSON.stringify(updated));
      window.dispatchEvent(new Event('van_saved_deals_changed'));
    } catch (err) {
      console.error(err);
    }
  };

  const toggleSavePlace = (placeId: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    const updated = savedPlaceIds.includes(placeId)
      ? savedPlaceIds.filter(id => id !== placeId)
      : [...savedPlaceIds, placeId];
    setSavedPlaceIds(updated);
    try {
      localStorage.setItem('saved_places_van', JSON.stringify(updated));
    } catch (err) {
      console.error(err);
    }
  };

  const addSampleBusinesses = () => {
    const sampleIds = ['d-1', 'd-2', 'd-3', 'd-4'];
    setSavedDealIds(sampleIds);
    try {
      localStorage.setItem('saved_deals_van', JSON.stringify(sampleIds));
      window.dispatchEvent(new Event('van_saved_deals_changed'));
    } catch (err) {
      console.error(err);
    }
  };

  const currentTheme = propsTheme || localTheme;
  const isDark = currentTheme === 'dark';

  const handleThemeSelect = (newTheme: 'light' | 'dark') => {
    setLocalTheme(newTheme);
    if (onThemeChange) {
      onThemeChange(newTheme);
    }
  };

  const cardBg = isDark ? 'bg-[#1b1c21] border-slate-800' : 'bg-white border-slate-100';
  const textPrimary = isDark ? 'text-white' : 'text-slate-900';
  const textSecondary = isDark ? 'text-slate-400' : 'text-slate-500';

  return (
    <div className={`min-h-screen pb-28 font-sans transition-colors duration-200 ${isDark ? 'bg-[#141518] text-white' : 'bg-slate-50 text-slate-800'}`}>

      {/* Header */}
      <div className={`px-5 py-4 border-b sticky top-0 z-30 shadow-sm transition-colors duration-200 ${isDark ? 'bg-[#1b1c21]/95 border-slate-800' : 'bg-white border-slate-200'}`}>
        <h1 className="text-2xl font-black text-emerald-600 tracking-tight">
          Ayarlar
        </h1>
      </div>

      {/* Floating Filtered Error Toast / Glassmorphism */}
      {deleteError && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 w-[90%] max-w-md z-50 animate-slideDown">
          <div className="mx-auto bg-white/70 dark:bg-[#121316]/80 backdrop-blur-3xl border border-white/60 dark:border-white/10 shadow-2xl rounded-3xl p-4 flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-rose-500/10 flex items-center justify-center shrink-0 shadow-inner">
                <ShieldAlert className="w-5 h-5 text-rose-500" />
              </div>
              <span className="text-xs font-bold text-slate-800 dark:text-white leading-snug drop-shadow-sm pr-2">{deleteError}</span>
            </div>
            <button
              onClick={() => setDeleteError(null)}
              className="w-8 h-8 rounded-full bg-slate-100/50 hover:bg-slate-200/80 dark:bg-slate-800/50 dark:hover:bg-slate-700/80 shrink-0 flex items-center justify-center text-slate-500 transition-colors backdrop-blur-sm"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Glassmorphism Delete Spinner UI */}
      {isDeletingAccount && (
        <div className="fixed inset-0 z-50 bg-white/40 dark:bg-black/60 backdrop-blur-md flex flex-col items-center justify-center animate-fadeIn">
          <div className="bg-white/80 dark:bg-[#121316]/80 p-6 rounded-[2rem] shadow-2xl flex flex-col items-center gap-4 border border-white/50 dark:border-white/5 backdrop-blur-xl">
            <div className="w-10 h-10 border-4 border-rose-500 border-r-transparent border-t-transparent rounded-full animate-spin shadow-sm"></div>
            <span className="text-sm font-black text-slate-800 dark:text-white tracking-widest drop-shadow-sm uppercase">İşleniyor...</span>
          </div>
        </div>
      )}

      <div className="max-w-md mx-auto px-4 pt-4 space-y-4 animate-fadeIn">

        {/* User Profile Card */}
        {currentUser ? (
          <div className={`${cardBg} rounded-3xl p-4 shadow-sm border flex flex-col gap-3 transition-colors duration-200`}>
            <div className="flex items-center gap-3">
              <div className="w-14 h-14 rounded-full bg-emerald-600 text-white font-black text-2xl flex items-center justify-center shadow-md shrink-0 uppercase">
                {currentUser.email ? currentUser.email[0] : 'U'}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5">
                  <h2 className={`text-base font-bold leading-snug truncate ${textPrimary}`}>
                    {currentUser.displayName || currentUser.email?.split('@')[0] || 'Van Kullanıcısı'}
                  </h2>
                  <span className="bg-emerald-500/20 text-emerald-400 text-[9px] font-black px-1.5 py-0.5 rounded-md uppercase">
                    Firebase
                  </span>
                </div>
                <p className={`text-xs font-medium truncate ${textSecondary}`}>
                  {currentUser.email}
                </p>
                <p className="text-[10px] text-emerald-500 font-semibold mt-0.5 flex items-center gap-1">
                  <ShieldCheck className="w-3 h-3 shrink-0" />
                  <span>Firebase Bulut Platformu Bağlı</span>
                </p>
              </div>
            </div>

            <div className={`grid grid-cols-2 gap-2 pt-2 border-t ${isDark ? 'border-slate-800' : 'border-slate-100'}`}>
              <button
                onClick={async () => {
                  try {
                    await logout();
                    window.location.href = '/'; // Hard reload nükleer çözüm
                  } catch (e) { }
                }}
                className="py-2 px-3 border border-rose-500/30 text-rose-500 hover:bg-rose-500/10 rounded-full font-bold text-xs flex items-center justify-center gap-1.5 transition-colors"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Çıkış Yap</span>
              </button>

              <button
                onClick={async () => {
                  setDeleteError(null);
                  setIsDeletingAccount(true);
                  try {
                    // Yalnızca auth.currentUser varsa native silme işlemi dene, yoksa (mock auth) uyarı ile sil
                    if (auth.currentUser) {
                      await deleteUser(auth.currentUser);
                    }

                    // React state'inin güvenle render edilebilmesi için bloklayan işlemleri biraz erteliyoruz.
                    setTimeout(async () => {
                      alert("Hesabınız ve ona bağlı tüm verileriniz başarıyla silinmiştir.");
                      await logout(); // Session sıfırla
                      window.location.href = '/'; // Hard reload nükleer çözüm
                    }, 50);
                  } catch (err: any) {
                    if (err.code === 'auth/requires-recent-login') {
                      setDeleteError("Güvenlik kuralı: Hesabı silebilmek için oturum tazelemeniz gerekiyor. Lütfen yeniden giriş yapın.");
                      setTimeout(async () => {
                        await logout();
                        window.location.href = '/'; // Hard reload nükleer çözüm
                      }, 2500); // Uyarıyı okuması için süre
                    } else {
                      setDeleteError(err.message || 'Hesabınız silinirken bir donanımsal ağ hatası oluştu.');
                    }
                  } finally {
                    setIsDeletingAccount(false); // KESİNLİKLE kapanması garanti altına alınır
                  }
                }}
                disabled={isDeletingAccount}
                className={`py-2 px-3 border rounded-full font-bold text-xs flex items-center justify-center gap-1.5 transition-colors ${isDark ? 'border-slate-700 text-slate-400 hover:bg-slate-800' : 'border-slate-200 text-slate-600 hover:bg-slate-100'
                  }`}
              >
                <Trash2 className="w-3.5 h-3.5 text-slate-400" />
                <span>Hesabı Sil</span>
              </button>
            </div>
          </div>
        ) : (
          <div className={`${cardBg} rounded-3xl p-4 shadow-sm border flex items-center justify-between`}>
            <div className="flex flex-col">
              <span className={`text-xs font-bold ${textPrimary}`}>Firebase Oturumu Kapalı</span>
              <span className={`text-[11px] ${textSecondary}`}>E-posta veya Google hesabı ile giriş yapın</span>
            </div>
            <button
              onClick={() => setShowAuthModal(true)}
              className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold py-2 px-4 rounded-full shadow-md flex items-center gap-1.5 active:scale-95 transition-all"
            >
              <ShieldCheck className="w-4 h-4" />
              <span>Giriş Yap</span>
            </button>
          </div>
        )}

        {/* Theme Selector Option */}
        <div className={`${cardBg} rounded-3xl p-4 shadow-sm border flex flex-col gap-3 transition-colors duration-200`}>
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-2xl flex items-center justify-center ${isDark ? 'bg-purple-950/60 text-purple-400' : 'bg-purple-50 text-purple-600'}`}>
              <Palette className="w-5 h-5" />
            </div>
            <div>
              <h3 className={`text-xs sm:text-sm font-bold ${textPrimary}`}>Uygulama Teması</h3>
              <p className={`text-[11px] ${textSecondary}`}>Açık ve koyu tema arasında geçiş yapın</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2 pt-1">
            <button
              type="button"
              onClick={() => handleThemeSelect('light')}
              className={`py-2.5 px-3 rounded-2xl font-bold text-xs flex items-center justify-center gap-2 border transition-all ${currentTheme === 'light'
                ? 'bg-emerald-600 text-white border-emerald-500 shadow-sm'
                : isDark
                  ? 'bg-slate-800/80 text-slate-300 border-slate-700 hover:bg-slate-700'
                  : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                }`}
            >
              <Sun className="w-4 h-4 text-amber-500 fill-amber-500/20" />
              <span>Açık Tema</span>
            </button>

            <button
              type="button"
              onClick={() => handleThemeSelect('dark')}
              className={`py-2.5 px-3 rounded-2xl font-bold text-xs flex items-center justify-center gap-2 border transition-all ${currentTheme === 'dark'
                ? 'bg-emerald-600 text-white border-emerald-500 shadow-sm'
                : isDark
                  ? 'bg-slate-800/80 text-slate-300 border-slate-700 hover:bg-slate-700'
                  : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                }`}
            >
              <Moon className="w-4 h-4 text-indigo-400 fill-indigo-400/20" />
              <span>Koyu Tema</span>
            </button>
          </div>
        </div>

        {/* Settings List */}
        <div className="space-y-3">

          {/* Bildirimleri Al Toggle */}
          <div className={`${cardBg} rounded-3xl p-4 shadow-sm border flex items-center justify-between`}>
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-2xl flex items-center justify-center ${isDark ? 'bg-emerald-950/60 text-emerald-400' : 'bg-emerald-50 text-emerald-600'}`}>
                <Bell className="w-5 h-5" />
              </div>
              <div>
                <h3 className={`text-xs sm:text-sm font-bold ${textPrimary}`}>Bildirimleri Al</h3>
                <p className={`text-[11px] ${textSecondary}`}>Duyuruları alıyorsunuz</p>
              </div>
            </div>

            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={notificationsEnabled}
                onChange={() => setNotificationsEnabled(!notificationsEnabled)}
                className="sr-only peer"
              />
              <div className="w-12 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-500"></div>
            </label>
          </div>

          {/* Günlük Hatırlatmalar Toggle */}
          <div className={`${cardBg} rounded-3xl p-4 shadow-sm border flex items-center justify-between`}>
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-2xl flex items-center justify-center ${isDark ? 'bg-sky-950/60 text-sky-400' : 'bg-sky-50 text-sky-600'}`}>
                <Smartphone className="w-5 h-5" />
              </div>
              <div>
                <h3 className={`text-xs sm:text-sm font-bold ${textPrimary}`}>Günlük Hatırlatmalar</h3>
                <p className={`text-[11px] ${textSecondary}`}>Gün içinde öneriler alıyorsunuz</p>
              </div>
            </div>

            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={dailyRemindersEnabled}
                onChange={() => setDailyRemindersEnabled(!dailyRemindersEnabled)}
                className="sr-only peer"
              />
              <div className="w-12 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-500"></div>
            </label>
          </div>



          {/* Titreşimleri Kapat Toggle */}
          <div className={`${cardBg} rounded-3xl p-4 shadow-sm border flex items-center justify-between`}>
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-2xl flex items-center justify-center ${isDark ? 'bg-amber-950/60 text-amber-400' : 'bg-amber-50 text-amber-600'}`}>
                <Vibrate className="w-5 h-5" />
              </div>
              <div>
                <h3 className={`text-xs sm:text-sm font-bold ${textPrimary}`}>Titreşimleri Kapat</h3>
                <p className={`text-[11px] ${textSecondary}`}>Baskı titreşimleri açık</p>
              </div>
            </div>

            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={vibrationDisabled}
                onChange={() => setVibrationDisabled(!vibrationDisabled)}
                className="sr-only peer"
              />
              <div className="w-12 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-slate-700"></div>
            </label>
          </div>

          {/* Favorilerim Link */}
          <div
            onClick={() => setIsFavoritesOpen(true)}
            className={`${cardBg} rounded-3xl p-4 shadow-sm border flex items-center justify-between hover:border-rose-300 dark:hover:border-rose-800 transition-all cursor-pointer select-none group`}
          >
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-2xl flex items-center justify-center transition-transform group-hover:scale-105 ${isDark ? 'bg-rose-950/60 text-rose-400 border border-rose-900/40' : 'bg-rose-50 text-rose-500 border border-rose-100'
                }`}>
                <Heart className="w-5 h-5 fill-rose-500/20" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className={`text-xs sm:text-sm font-bold ${textPrimary}`}>Favorilerim</h3>
                  <span className="bg-rose-500 text-white text-[10px] font-black px-2 py-0.5 rounded-full shadow-xs">
                    {savedBusinesses.length} İşletme
                  </span>
                </div>
                <p className={`text-[11px] ${textSecondary}`}>
                  {savedBusinesses.length > 0
                    ? `${savedBusinesses.length} adet kaydedilmiş işletme ve dükkan fırsatı`
                    : 'Kaydettiğiniz işletmeler, esnaflar ve mekanlar'}
                </p>
              </div>
            </div>
            <ChevronRight className="w-5 h-5 text-slate-400 group-hover:translate-x-1 transition-transform" />
          </div>

          {/* Yardım & Destek Link */}
          <div
            onClick={() => window.location.href = 'mailto:furkanpesen786@gmail.com?subject=Van%20Rehberim%20-%20Destek%20Talebi'}
            className={`${cardBg} rounded-3xl p-4 shadow-sm border flex items-center justify-between hover:opacity-90 transition-opacity cursor-pointer`}
          >
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-2xl flex items-center justify-center ${isDark ? 'bg-sky-950/60 text-sky-400' : 'bg-sky-50 text-sky-500'}`}>
                <HelpCircle className="w-5 h-5" />
              </div>
              <div>
                <h3 className={`text-xs sm:text-sm font-bold ${textPrimary}`}>Yardım & Destek</h3>
                <p className={`text-[11px] ${textSecondary}`}>Bize ulaşın</p>
              </div>
            </div>
            <ChevronRight className="w-5 h-5 text-slate-400" />
          </div>

          {/* Uygulamayı Değerlendir Link */}
          <div
            onClick={() => window.open('market://details?id=com.vanrehberim.app', '_system')}
            className={`${cardBg} rounded-3xl p-4 shadow-sm border flex items-center justify-between hover:opacity-90 transition-opacity cursor-pointer`}
          >
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-2xl flex items-center justify-center ${isDark ? 'bg-amber-950/60 text-amber-400' : 'bg-amber-50 text-amber-500'}`}>
                <Star className="w-5 h-5" />
              </div>
              <div>
                <h3 className={`text-xs sm:text-sm font-bold ${textPrimary}`}>Uygulamayı Değerlendir</h3>
                <p className={`text-[11px] ${textSecondary}`}>Play Store'da puanlayın</p>
              </div>
            </div>
            <ChevronRight className="w-5 h-5 text-slate-400" />
          </div>

          {/* Politikalar Link & Sub-items */}
          <div className={`${cardBg} rounded-3xl p-4 shadow-sm border transition-colors duration-200 flex flex-col gap-3`}>
            <div
              onClick={() => setIsPoliciesOpen(!isPoliciesOpen)}
              className="flex items-center justify-between cursor-pointer select-none"
            >
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-2xl flex items-center justify-center ${isDark ? 'bg-emerald-950/60 text-emerald-400' : 'bg-emerald-50 text-emerald-600'}`}>
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <div>
                  <h3 className={`text-xs sm:text-sm font-bold ${textPrimary}`}>Politikalar</h3>
                  <p className={`text-[11px] ${textSecondary}`}>Gizlilik, kullanım koşulları ve KVKK metni</p>
                </div>
              </div>
              {isPoliciesOpen ? (
                <ChevronDown className="w-5 h-5 text-slate-400" />
              ) : (
                <ChevronRight className="w-5 h-5 text-slate-400" />
              )}
            </div>

            {isPoliciesOpen && (
              <div className={`pt-2 space-y-1.5 border-t ${isDark ? 'border-slate-800' : 'border-slate-100'}`}>
                {/* Gizlilik Politikası */}
                <button
                  type="button"
                  onClick={() => setSelectedPolicy('privacy')}
                  className={`w-full p-2.5 rounded-2xl text-left flex items-center justify-between transition-colors ${isDark ? 'hover:bg-slate-800/70 text-slate-200' : 'hover:bg-slate-100/80 text-slate-700'
                    }`}
                >
                  <div className="flex items-center gap-2.5">
                    <div className={`w-7 h-7 rounded-xl flex items-center justify-center ${isDark ? 'bg-emerald-950/80 text-emerald-400' : 'bg-emerald-50 text-emerald-600'
                      }`}>
                      <Lock className="w-3.5 h-3.5" />
                    </div>
                    <div>
                      <div className={`text-xs font-bold ${isDark ? 'text-slate-200' : 'text-slate-800'}`}>Gizlilik Politikası</div>
                      <div className={`text-[10px] ${textSecondary}`}>Veri güvenliği ve çerez politikası</div>
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-slate-400" />
                </button>

                {/* Kullanım Koşulları */}
                <button
                  type="button"
                  onClick={() => setSelectedPolicy('terms')}
                  className={`w-full p-2.5 rounded-2xl text-left flex items-center justify-between transition-colors ${isDark ? 'hover:bg-slate-800/70 text-slate-200' : 'hover:bg-slate-100/80 text-slate-700'
                    }`}
                >
                  <div className="flex items-center gap-2.5">
                    <div className={`w-7 h-7 rounded-xl flex items-center justify-center ${isDark ? 'bg-sky-950/80 text-sky-400' : 'bg-sky-50 text-sky-600'
                      }`}>
                      <FileText className="w-3.5 h-3.5" />
                    </div>
                    <div>
                      <div className={`text-xs font-bold ${isDark ? 'text-slate-200' : 'text-slate-800'}`}>Kullanım Koşulları</div>
                      <div className={`text-[10px] ${textSecondary}`}>Uygulama kullanım esasları ve haklar</div>
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-slate-400" />
                </button>

                {/* KVKK Aydınlatma Metni */}
                <button
                  type="button"
                  onClick={() => setSelectedPolicy('kvkk')}
                  className={`w-full p-2.5 rounded-2xl text-left flex items-center justify-between transition-colors ${isDark ? 'hover:bg-slate-800/70 text-slate-200' : 'hover:bg-slate-100/80 text-slate-700'
                    }`}
                >
                  <div className="flex items-center gap-2.5">
                    <div className={`w-7 h-7 rounded-xl flex items-center justify-center ${isDark ? 'bg-amber-950/80 text-amber-400' : 'bg-amber-50 text-amber-600'
                      }`}>
                      <ShieldAlert className="w-3.5 h-3.5" />
                    </div>
                    <div>
                      <div className={`text-xs font-bold ${isDark ? 'text-slate-200' : 'text-slate-800'}`}>KVKK Aydınlatma Metni</div>
                      <div className={`text-[10px] ${textSecondary}`}>6698 Sayılı Kanun bilgilendirmesi</div>
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-slate-400" />
                </button>
              </div>
            )}
          </div>

          {/* Uygulama Hakkında Link */}
          <div className={`${cardBg} rounded-3xl p-4 shadow-sm border flex items-center justify-between hover:opacity-90 transition-opacity cursor-pointer`}>
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-2xl flex items-center justify-center ${isDark ? 'bg-slate-800 text-slate-400' : 'bg-slate-100 text-slate-600'}`}>
                <Info className="w-5 h-5" />
              </div>
              <div>
                <h3 className={`text-xs sm:text-sm font-bold ${textPrimary}`}>Uygulama Hakkında</h3>
                <p className={`text-[11px] ${textSecondary}`}>Van Rehberim v1.0.10</p>
              </div>
            </div>
            <ChevronRight className="w-5 h-5 text-slate-400" />
          </div>

        </div>

      </div>

      {/* Policy Details Modal */}
      {selectedPolicy && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
          <div className={`w-full max-w-lg max-h-[80vh] flex flex-col rounded-3xl p-5 shadow-2xl border transition-colors duration-200 ${isDark ? 'bg-[#1b1c21] border-slate-800 text-slate-100' : 'bg-white border-slate-200 text-slate-800'
            }`}>
            {/* Modal Header */}
            <div className={`flex items-center justify-between pb-3 border-b shrink-0 ${isDark ? 'border-slate-800' : 'border-slate-100'
              }`}>
              <div className="flex items-center gap-2.5">
                {selectedPolicy === 'privacy' && <Lock className={`w-5 h-5 ${isDark ? 'text-emerald-400' : 'text-emerald-600'}`} />}
                {selectedPolicy === 'terms' && <FileText className={`w-5 h-5 ${isDark ? 'text-sky-400' : 'text-sky-600'}`} />}
                {selectedPolicy === 'kvkk' && <ShieldAlert className={`w-5 h-5 ${isDark ? 'text-amber-400' : 'text-amber-600'}`} />}
                <h2 className={`text-base font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>
                  {selectedPolicy === 'privacy' && 'Gizlilik Politikası'}
                  {selectedPolicy === 'terms' && 'Kullanım Koşulları'}
                  {selectedPolicy === 'kvkk' && 'KVKK Aydınlatma Metni'}
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setSelectedPolicy(null)}
                className={`p-1.5 rounded-full transition-colors ${isDark
                  ? 'hover:bg-slate-800 text-slate-400 hover:text-slate-200'
                  : 'hover:bg-slate-100 text-slate-400 hover:text-slate-600'
                  }`}
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Scrollable Body */}
            <div className={`py-4 overflow-y-auto space-y-3.5 text-xs leading-relaxed pr-1 my-1 ${isDark ? 'text-slate-300' : 'text-slate-600'
              }`}>
              {selectedPolicy === 'privacy' && (
                <>
                  <p className={`font-semibold ${isDark ? 'text-slate-100' : 'text-slate-900'}`}>
                    Van Rehberim olarak gizliliğinize büyük önem veriyoruz. İşbu Gizlilik Politikası, uygulamamızı kullandığınızda verilerinizin nasıl toplandığını, kullanıldığını ve korunduğunu açıklamaktadır.
                  </p>
                  <div>
                    <h4 className={`font-bold mb-1 ${isDark ? 'text-slate-100' : 'text-slate-900'}`}>1. Toplanan Veriler</h4>
                    <p>Uygulamamız, hizmetlerimizi sunabilmek, kullanıcı deneyimini iyileştirmek ve kişiselleştirilmiş içerik sağlamak amacıyla e-posta adresi, kullanıcı tercihleri (tema, bildirim izinleri) ve cihaz erişim kayıtları gibi temel verileri toplayabilir.</p>
                  </div>
                  <div>
                    <h4 className={`font-bold mb-1 ${isDark ? 'text-slate-100' : 'text-slate-900'}`}>2. Verilerin Kullanımı</h4>
                    <p>Toplanan veriler; uygulama içi ayarlarınızın saklanması, favorilerinizin senkronize edilmesi, duyuru, yerel haber, indirim ve vefat ilanlarının tarafınıza bildirim olarak iletilmesi amacıyla işlenir.</p>
                  </div>
                  <div>
                    <h4 className={`font-bold mb-1 ${isDark ? 'text-slate-100' : 'text-slate-900'}`}>3. Veri Güvenliği ve Paylaşım</h4>
                    <p>Verileriniz endüstri standardı güvenlik protokolleri ve şifreleme yöntemleri ile korunmaktadır. Üçüncü şahıslarla açık izniniz olmadan veya yasal yükümlülükler haricinde kesinlikle paylaşılmaz.</p>
                  </div>
                  <div>
                    <h4 className={`font-bold mb-1 ${isDark ? 'text-slate-100' : 'text-slate-900'}`}>4. Çerezler ve Yerel Depolama</h4>
                    <p>Uygulamamız tema tercihleriniz, oturum durumunuz ve favori içerikleriniz için cihazınızda güvenli yerel depolama (LocalStorage) teknolojilerini kullanır.</p>
                  </div>
                </>
              )}

              {selectedPolicy === 'terms' && (
                <>
                  <p className={`font-semibold ${isDark ? 'text-slate-100' : 'text-slate-900'}`}>
                    Van Rehberim uygulamasını kullanarak aşağıdaki şart ve koşulları kabul etmiş sayılırsınız.
                  </p>
                  <div>
                    <h4 className={`font-bold mb-1 ${isDark ? 'text-slate-100' : 'text-slate-900'}`}>1. Hizmet Kapsamı</h4>
                    <p>Van Rehberim; şehir rehberi, gezilecek yerler, yerel esnaf indirimleri, vefat ilanları, nöbetçi eczaneler ve güncel duyuruları sunan bilgilendirme amaçlı bir mobil şehir rehberi platformudur.</p>
                  </div>
                  <div>
                    <h4 className={`font-bold mb-1 ${isDark ? 'text-slate-100' : 'text-slate-900'}`}>2. Kullanıcı Yükümlülükleri</h4>
                    <p>Kullanıcılar uygulamayı hukuka, genel ahlaka ve kamu düzenine uygun şekilde kullanmayı kabul eder. Uygulamanın çalışmasını engelleyecek, sunuculara aşırı yük bindirecek veya tersine mühendislik içerecek eylemlerde bulunmak yasaktır.</p>
                  </div>
                  <div>
                    <h4 className={`font-bold mb-1 ${isDark ? 'text-slate-100' : 'text-slate-900'}`}>3. Fikri Mülkiyet Hakları</h4>
                    <p>Uygulama içerisinde yer alan tüm tasarım, arayüz, amblem, metin ve görsel içeriklerin telif hakları saklıdır. Yazılı izin alınmaksızın ticari amaçlarla kopyalanamaz veya dağıtılamaz.</p>
                  </div>
                  <div>
                    <h4 className={`font-bold mb-1 ${isDark ? 'text-slate-100' : 'text-slate-900'}`}>4. Sorumluluk Sınırı</h4>
                    <p>Van Rehberim, dükkan ve işletmelerin sunduğu indirim oranlarında veya açılış-kapanış saatlerinde yapabileceği anlık değişikliklerden sorumlu tutulamaz.</p>
                  </div>
                </>
              )}

              {selectedPolicy === 'kvkk' && (
                <>
                  <p className={`font-semibold ${isDark ? 'text-slate-100' : 'text-slate-900'}`}>
                    6698 Sayılı Kişisel Verilerin Korunması Kanunu ("KVKK") Uyarınca Kişisel Verilerin Korunması ve İşlenmesi Aydınlatma Metni
                  </p>
                  <div>
                    <h4 className={`font-bold mb-1 ${isDark ? 'text-slate-100' : 'text-slate-900'}`}>1. Veri Sorumlusu</h4>
                    <p>Van Rehberim olarak kişisel verilerinizi 6698 sayılı KVKK ve ilgili mevzuata uygun olarak veri sorumlusu sıfatıyla işlemekteyiz.</p>
                  </div>
                  <div>
                    <h4 className={`font-bold mb-1 ${isDark ? 'text-slate-100' : 'text-slate-900'}`}>2. Kişisel Verilerin İşlenme Amaçları</h4>
                    <p>Verileriniz; üyelik işlemlerinin gerçekleştirilmesi, kişiselleştirilmiş şehir rehberi sunulması, yerel duyuru ve bildirimlerin iletilmesi ve yasal yükümlülüklerin yerine getirilmesi amacıyla işlenir.</p>
                  </div>
                  <div>
                    <h4 className={`font-bold mb-1 ${isDark ? 'text-slate-100' : 'text-slate-900'}`}>3. Verilerin Aktarılması ve Saklanması</h4>
                    <p>Kişisel verileriniz KVKK'nın 8. ve 9. maddelerine uygun olarak, yalnızca kanunen yetkili kamu kurumlarına yasal zorunluluk halinde aktarılabilir. Verileriniz yurt içinde güvenli sunucularda muhafaza edilmektedir.</p>
                  </div>
                  <div>
                    <h4 className={`font-bold mb-1 ${isDark ? 'text-slate-100' : 'text-slate-900'}`}>4. KVKK Madde 11 Kapsamındaki Haklarınız</h4>
                    <p>KVKK Madde 11 uyarınca; verilerinizin işlenip işlenmediğini öğrenme, işlenmişse bilgi talep etme, verilerinizin düzeltilmesini veya silinmesini isteme hakkına sahipsiniz.</p>
                  </div>
                </>
              )}
            </div>

            {/* Modal Footer */}
            <div className={`pt-3 border-t flex justify-end shrink-0 ${isDark ? 'border-slate-800' : 'border-slate-100'
              }`}>
              <button
                type="button"
                onClick={() => setSelectedPolicy(null)}
                className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-full shadow-md transition-colors"
              >
                Anladım
              </button>
            </div>
          </div>
        </div>
      )}

      {/* FAVORİLERİM MODAL */}
      {isFavoritesOpen && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4 animate-fadeIn">
          <div className={`${isDark ? 'bg-[#18191e] text-white' : 'bg-white text-slate-900'} w-full max-w-lg rounded-t-3xl sm:rounded-3xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden animate-slideUp`}>

            {/* Modal Header */}
            <div className="bg-gradient-to-r from-rose-600 to-pink-600 text-white p-4 flex items-center justify-between shadow-md shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center shrink-0">
                  <Heart className="w-6 h-6 text-white fill-white/20" />
                </div>
                <div>
                  <h3 className="font-black text-base uppercase leading-tight tracking-wide">FAVORİLERİM</h3>
                  <p className="text-[11px] text-rose-100 font-medium">Kaydettiğiniz işletmeler, esnaflar ve yerler</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsFavoritesOpen(false)}
                className="w-8 h-8 rounded-full bg-white/20 text-white flex items-center justify-center hover:bg-white/30 transition-colors"
              >
                ✕
              </button>
            </div>

            {/* Modal Category Tabs */}
            <div className={`flex border-b p-2 gap-2 ${isDark ? 'bg-[#1e2026] border-slate-800' : 'bg-slate-50 border-slate-200'} shrink-0`}>
              <button
                type="button"
                onClick={() => setFavoritesTab('businesses')}
                className={`flex-1 py-2 px-3 rounded-2xl font-bold text-xs flex items-center justify-center gap-2 transition-all ${favoritesTab === 'businesses'
                  ? 'bg-rose-500 text-white shadow-md'
                  : isDark ? 'text-slate-400 hover:text-white hover:bg-slate-800' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
                  }`}
              >
                <Building2 className="w-4 h-4" />
                <span>KAYDEDİLEN İŞLETMELER</span>
                <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-black ${favoritesTab === 'businesses' ? 'bg-white/30 text-white' : 'bg-slate-300 dark:bg-slate-700 text-slate-700 dark:text-slate-300'
                  }`}>
                  {savedBusinesses.length}
                </span>
              </button>

              <button
                type="button"
                onClick={() => setFavoritesTab('places')}
                className={`flex-1 py-2 px-3 rounded-2xl font-bold text-xs flex items-center justify-center gap-2 transition-all ${favoritesTab === 'places'
                  ? 'bg-rose-500 text-white shadow-md'
                  : isDark ? 'text-slate-400 hover:text-white hover:bg-slate-800' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
                  }`}
              >
                <MapPin className="w-4 h-4" />
                <span>GEZİLECEK YERLER</span>
                <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-black ${favoritesTab === 'places' ? 'bg-white/30 text-white' : 'bg-slate-300 dark:bg-slate-700 text-slate-700 dark:text-slate-300'
                  }`}>
                  {savedPlaces.length}
                </span>
              </button>
            </div>

            {/* Modal Scrollable Content */}
            <div className="p-4 overflow-y-auto space-y-3 flex-1">

              {/* TAB 1: KAYDEDİLEN İŞLETMELER */}
              {favoritesTab === 'businesses' && (
                <>
                  {savedBusinesses.length === 0 ? (
                    <div className="text-center py-10 px-4 space-y-3">
                      <div className="w-16 h-16 rounded-3xl bg-rose-500/10 text-rose-500 mx-auto flex items-center justify-center">
                        <Building2 className="w-8 h-8" />
                      </div>
                      <h4 className="font-extrabold text-base">Henüz Kaydedilmiş İşletme Yok</h4>
                      <p className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-500'} max-w-xs mx-auto leading-relaxed`}>
                        İşletmeler ve esnaf indirimleri sayfasında beğendiğiniz dükkanları kaydederek burada hızlıca erişebilirsiniz.
                      </p>
                      <button
                        type="button"
                        onClick={addSampleBusinesses}
                        className="mt-2 inline-flex items-center gap-2 bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs py-2.5 px-4 rounded-full shadow-md transition-all active:scale-95"
                      >
                        <Sparkles className="w-4 h-4" />
                        <span>Örnek Van İşletmelerini Ekle</span>
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {savedBusinesses.map((deal) => (
                        <div
                          key={deal.id}
                          className={`${isDark ? 'bg-[#22242b] border-slate-800' : 'bg-slate-50 border-slate-200'} border rounded-3xl p-3 shadow-sm hover:border-rose-400 transition-all flex flex-col gap-2.5 relative group`}
                        >
                          <div className="flex items-start gap-3">
                            {/* Business Image */}
                            <div className="w-20 h-20 rounded-2xl overflow-hidden shrink-0 bg-slate-200 relative shadow-sm">
                              <img
                                src={deal.image}
                                alt={deal.storeName}
                                className="w-full h-full object-cover"
                              />
                              <span className="absolute bottom-1 left-1 bg-rose-600 text-white text-[9px] font-black px-1.5 py-0.5 rounded-md shadow-xs">
                                {deal.discountRate}
                              </span>
                            </div>

                            {/* Business Info */}
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center justify-between gap-1">
                                <span className="text-[10px] font-extrabold uppercase tracking-wide text-rose-500 bg-rose-500/10 px-2 py-0.5 rounded-full">
                                  {deal.category}
                                </span>
                                <button
                                  type="button"
                                  onClick={(e) => toggleSaveDeal(deal.id, e)}
                                  className="text-slate-400 hover:text-rose-500 p-1 rounded-full transition-colors"
                                  title="Favorilerden Çıkar"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </div>

                              <h4 className={`text-sm font-black mt-1 truncate ${isDark ? 'text-white' : 'text-slate-900'}`}>
                                {deal.storeName}
                              </h4>

                              <p className={`text-xs font-semibold ${isDark ? 'text-slate-300' : 'text-slate-700'} line-clamp-1 mt-0.5`}>
                                {deal.dealTitle}
                              </p>

                              <div className={`flex items-center gap-1 text-[11px] ${isDark ? 'text-slate-400' : 'text-slate-500'} mt-1 truncate`}>
                                <MapPin className="w-3.5 h-3.5 text-rose-500 shrink-0" />
                                <span className="truncate">{deal.address || deal.locationName}</span>
                              </div>
                            </div>
                          </div>

                          {/* Action Bar */}
                          <div className={`pt-2 border-t flex items-center justify-between gap-2 ${isDark ? 'border-slate-800' : 'border-slate-200/80'}`}>
                            <div className="text-[10px] font-medium text-slate-400 flex items-center gap-1">
                              <Calendar className="w-3 h-3 text-slate-400" />
                              <span>Son: {deal.endDate}</span>
                            </div>

                            <div className="flex items-center gap-2">
                              {deal.phone && (
                                <a
                                  href={`tel:${deal.phone.replace(/\s+/g, '')}`}
                                  className="p-1.5 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/20 rounded-xl transition-colors flex items-center gap-1 text-[11px] font-bold"
                                  title="İşletmeyi Ara"
                                >
                                  <PhoneCall className="w-3.5 h-3.5" />
                                  <span className="hidden sm:inline">Ara</span>
                                </a>
                              )}

                              <button
                                type="button"
                                onClick={() => setSelectedBusiness(deal)}
                                className="px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white font-bold text-[11px] rounded-xl shadow-xs transition-all active:scale-95 flex items-center gap-1"
                              >
                                <span>İncele</span>
                                <ChevronRight className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </>
              )}

              {/* TAB 2: GEZİLECEK YERLER */}
              {favoritesTab === 'places' && (
                <>
                  {savedPlaces.length === 0 ? (
                    <div className="text-center py-10 px-4 space-y-3">
                      <div className="w-16 h-16 rounded-3xl bg-cyan-500/10 text-cyan-500 mx-auto flex items-center justify-center">
                        <Compass className="w-8 h-8" />
                      </div>
                      <h4 className="font-extrabold text-base">Henüz Kaydedilmiş Mekan Yok</h4>
                      <p className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-500'} max-w-xs mx-auto leading-relaxed`}>
                        Gezilecek Yerler sayfasındaki turistik ve tarihi mekanları kaydederek favorilerinize ekleyebilirsiniz.
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {savedPlaces.map((place) => (
                        <div
                          key={place.id}
                          className={`${isDark ? 'bg-[#22242b] border-slate-800' : 'bg-slate-50 border-slate-200'} border rounded-3xl p-3 shadow-sm flex items-center justify-between gap-3`}
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <img
                              src={place.image}
                              alt={place.title}
                              className="w-14 h-14 rounded-2xl object-cover shrink-0 bg-slate-200"
                            />
                            <div className="min-w-0">
                              <span className="text-[9px] font-extrabold uppercase text-cyan-500 bg-cyan-500/10 px-1.5 py-0.5 rounded-full">
                                {place.category}
                              </span>
                              <h4 className={`text-xs font-black truncate mt-0.5 ${isDark ? 'text-white' : 'text-slate-900'}`}>
                                {place.title}
                              </h4>
                              <p className={`text-[11px] ${isDark ? 'text-slate-400' : 'text-slate-500'} truncate mt-0.5`}>
                                {place.shortDesc}
                              </p>
                            </div>
                          </div>

                          <button
                            type="button"
                            onClick={(e) => toggleSavePlace(place.id, e)}
                            className="p-2 text-rose-500 hover:bg-rose-500/10 rounded-full transition-colors shrink-0"
                            title="Favorilerden Çıkar"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </>
              )}

            </div>
          </div>
        </div>
      )}

      {/* İŞLETME DETAY MODAL */}
      {selectedBusiness && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-fadeIn">
          <div className={`${isDark ? 'bg-[#1b1c21] text-white border-slate-800' : 'bg-white text-slate-900'} w-full max-w-md rounded-3xl border shadow-2xl overflow-hidden flex flex-col max-h-[90vh] animate-scaleUp`}>

            {/* Header Image */}
            <div className="relative h-48 w-full bg-slate-900 shrink-0">
              <img
                src={selectedBusiness.image}
                alt={selectedBusiness.storeName}
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />

              <button
                type="button"
                onClick={() => setSelectedBusiness(null)}
                className="absolute top-3 right-3 w-8 h-8 rounded-full bg-black/60 text-white flex items-center justify-center hover:bg-black/80 transition-colors z-10"
              >
                ✕
              </button>

              <div className="absolute bottom-3 left-3 right-3 text-white">
                <span className="bg-rose-600 text-white text-[10px] font-black px-2 py-0.5 rounded-full uppercase tracking-wider">
                  {selectedBusiness.category}
                </span>
                <h3 className="text-xl font-black mt-1 leading-tight text-white drop-shadow-md">
                  {selectedBusiness.storeName}
                </h3>
              </div>
            </div>

            {/* Content Body */}
            <div className="p-4 overflow-y-auto space-y-3">
              <div className="bg-rose-500/10 border border-rose-500/20 rounded-2xl p-3 flex items-center justify-between">
                <div>
                  <div className="text-[10px] font-bold text-rose-500 uppercase tracking-wide">Özel Kampanya Fırsatı</div>
                  <div className="text-sm font-black text-rose-600 dark:text-rose-400">{selectedBusiness.dealTitle}</div>
                </div>
                <span className="bg-rose-500 text-white font-black text-xs px-2.5 py-1 rounded-xl shadow-xs">
                  {selectedBusiness.discountRate}
                </span>
              </div>

              <div className="space-y-1.5 text-xs">
                <h4 className={`font-extrabold text-xs uppercase tracking-wide ${isDark ? 'text-rose-300' : 'text-rose-950'}`}>
                  Hizmet & Kampanya Açıklaması
                </h4>
                <p className={`leading-relaxed p-3.5 rounded-2xl border transition-colors ${isDark ? 'bg-[#22242b] border-slate-700/80 text-slate-200' : 'bg-rose-50/50 border-rose-100 text-slate-800'
                  }`}>
                  {selectedBusiness.description}
                </p>
              </div>

              <div className={`p-3 rounded-2xl border ${isDark ? 'bg-[#22242b] border-slate-800' : 'bg-slate-50 border-slate-200'} space-y-2 text-xs`}>
                <div className="flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-rose-500 shrink-0" />
                  <span className="font-medium">{selectedBusiness.address || selectedBusiness.locationName}</span>
                </div>
                <div className="flex items-center gap-2 text-slate-400 text-[11px]">
                  <Calendar className="w-4 h-4 text-slate-400 shrink-0" />
                  <span>Geçerlilik: {selectedBusiness.startDate} - {selectedBusiness.endDate}</span>
                </div>
              </div>

              {/* Footer Buttons */}
              <div className="pt-2 flex items-center gap-2">
                {selectedBusiness.phone && (
                  <a
                    href={`tel:${selectedBusiness.phone.replace(/\s+/g, '')}`}
                    className="flex-1 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-2xl text-center shadow-md transition-all active:scale-95 flex items-center justify-center gap-2"
                  >
                    <PhoneCall className="w-4 h-4" />
                    <span>Hemen Ara</span>
                  </a>
                )}

                <button
                  type="button"
                  onClick={() => toggleSaveDeal(selectedBusiness.id)}
                  className={`py-3 px-4 rounded-2xl font-bold text-xs flex items-center justify-center gap-2 border transition-all ${savedDealIds.includes(selectedBusiness.id)
                    ? 'bg-rose-500/10 border-rose-500/30 text-rose-500'
                    : 'bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
                    }`}
                >
                  <Trash2 className="w-4 h-4" />
                  <span>{savedDealIds.includes(selectedBusiness.id) ? 'Favorilerden Çıkar' : 'Kaydet'}</span>
                </button>
              </div>
            </div>

          </div>
        </div>
      )}

    </div>
  );
};

