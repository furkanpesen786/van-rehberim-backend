import React from 'react';
import { TabType } from '../types';
import { useAuth } from '../context/AuthContext';
import {
  Home,
  Briefcase,
  Store,
  Navigation,
  Newspaper,
  User,
  Sun,
  Moon,
  LogIn,
} from 'lucide-react';

// Aşama 2 (duyarlı arayüz dönüşümü): tablet ve masaüstü için üst navigasyon
// barı. Mobilde (< 768px) HİÇBİR ZAMAN render edilmez (hidden md:block) —
// mobil deneyim BottomNav ile birebir korunur. Sekme state'i App.tsx'teki
// aynı activeTab'i kullanır; iş mantığına (Firebase/RevenueCat/geri tuşu
// yığını) dokunulmaz.
interface TopNavProps {
  activeTab: TabType;
  setActiveTab: (tab: TabType) => void;
  theme: 'light' | 'dark';
  onThemeChange: (theme: 'light' | 'dark') => void;
}

const TABS: { id: TabType; label: string; icon: React.ReactNode }[] = [
  { id: 'home', label: 'Ana Sayfa', icon: <Home className="w-4 h-4 stroke-[2.2]" /> },
  { id: 'jobs', label: 'İş İlanları', icon: <Briefcase className="w-4 h-4 stroke-[2.2]" /> },
  { id: 'deals', label: 'İndirimler', icon: <Store className="w-4 h-4 stroke-[2.2]" /> },
  { id: 'places', label: 'Keşfet', icon: <Navigation className="w-4 h-4 stroke-[2.2] rotate-45" /> },
  { id: 'news', label: 'Haberler', icon: <Newspaper className="w-4 h-4 stroke-[2.2]" /> },
  { id: 'settings', label: 'Ayarlar', icon: <User className="w-4 h-4 stroke-[2.2]" /> },
];

export const TopNav: React.FC<TopNavProps> = ({ activeTab, setActiveTab, theme, onThemeChange }) => {
  const { currentUser, setShowAuthModal } = useAuth();
  const isDark = theme === 'dark';

  return (
    <header
      className={`hidden md:block sticky top-0 z-40 border-b backdrop-blur-md transition-colors duration-200 ${
        isDark ? 'bg-[#141518]/90 border-slate-800' : 'bg-white/90 border-slate-200'
      }`}
    >
      <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between gap-4">
        {/* Logo — ana sayfaya döner */}
        <button
          onClick={() => setActiveTab('home')}
          className="flex items-center gap-2.5 shrink-0 group"
          title="Ana Sayfa"
        >
          <img
            src="/logo.png"
            alt="Van Rehberim"
            className="w-9 h-9 rounded-xl object-cover shadow-sm group-hover:scale-105 transition-transform"
          />
          <span
            className={`font-black tracking-widest uppercase text-sm ${
              isDark ? 'text-white' : 'text-slate-900'
            }`}
          >
            Van Rehberim
          </span>
        </button>

        {/* Sekmeler — tablette yalnızca ikon, lg+ ikon+etiket */}
        <nav className="flex items-center gap-1 min-w-0">
          {TABS.map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-3 py-2 rounded-full text-xs font-bold transition-all duration-200 whitespace-nowrap ${
                  isActive
                    ? isDark
                      ? 'bg-slate-800 text-white shadow-md'
                      : 'bg-slate-900 text-white shadow-md'
                    : isDark
                      ? 'text-slate-300 hover:bg-slate-800/70 hover:text-white'
                      : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                }`}
                title={tab.label}
              >
                {tab.icon}
                <span className="hidden lg:inline">{tab.label}</span>
              </button>
            );
          })}
        </nav>

        {/* Sağ taraf: tema düğmesi + giriş/profil */}
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={() => onThemeChange(isDark ? 'light' : 'dark')}
            className={`w-9 h-9 rounded-full flex items-center justify-center border transition-colors ${
              isDark
                ? 'bg-slate-800 border-slate-700 text-amber-400 hover:bg-slate-700'
                : 'bg-slate-100 border-slate-200 text-slate-700 hover:bg-slate-200'
            }`}
            title={isDark ? 'Açık temaya geç' : 'Koyu temaya geç'}
          >
            {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </button>

          {currentUser ? (
            <button
              onClick={() => setActiveTab('settings')}
              className={`flex items-center gap-2 px-3 py-2 rounded-full text-xs font-bold border transition-colors max-w-[220px] ${
                isDark
                  ? 'bg-slate-800 border-slate-700 text-slate-200 hover:bg-slate-700'
                  : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-100'
              }`}
              title="Ayarlar & Profil"
            >
              <User className="w-4 h-4 shrink-0" />
              <span className="hidden lg:inline truncate">{currentUser.email}</span>
            </button>
          ) : (
            <button
              onClick={() => setShowAuthModal(true)}
              className="flex items-center gap-2 px-4 py-2 rounded-full text-xs font-black bg-gradient-to-r from-indigo-600 via-sky-500 to-cyan-500 text-white shadow-md hover:opacity-90 transition-opacity whitespace-nowrap"
              title="Giriş Yap / Kayıt Ol"
            >
              <LogIn className="w-4 h-4" />
              <span className="hidden lg:inline">Giriş Yap</span>
            </button>
          )}
        </div>
      </div>
    </header>
  );
};
