import React from 'react';
import { TabType } from '../types';
import { Newspaper, Navigation, Home, Store, User, Briefcase } from 'lucide-react';

interface BottomNavProps {
  activeTab: TabType;
  setActiveTab: (tab: TabType) => void;
  theme?: 'light' | 'dark';
}

export const BottomNav: React.FC<BottomNavProps> = ({ activeTab, setActiveTab, theme = 'light' }) => {
  const isDark = theme === 'dark';

  return (
    <div className="fixed bottom-3 left-1/2 -translate-x-1/2 w-[95%] max-w-lg z-40">
      <div className={`rounded-full px-2 py-1.5 shadow-2xl flex items-center justify-around border backdrop-blur-md transition-colors duration-500 ${isDark
          ? 'bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 border-slate-700/60 shadow-black/80'
          : 'bg-gradient-to-r from-indigo-600 via-sky-500 to-cyan-500 border-white/40'
        }`}>

        {/* Home Tab */}
        <button
          onClick={() => setActiveTab('home')}
          className={`flex flex-col items-center justify-center w-10 h-10 sm:w-11 sm:h-11 rounded-full transition-all duration-300 ${activeTab === 'home'
              ? isDark
                ? 'bg-slate-800 text-white shadow-xl scale-110 font-bold border border-slate-700'
                : 'bg-white text-slate-900 shadow-xl scale-110 font-bold'
              : 'text-white hover:bg-white/20'
            }`}
          title="Ana Sayfa"
        >
          <Home className="w-5 h-5 stroke-[2.2]" />
          <span className="sr-only">Ana Sayfa</span>
        </button>

        {/* Jobs Tab (Yeni İş İlanları) */}
        <button
          onClick={() => setActiveTab('jobs')}
          className={`flex flex-col items-center justify-center w-10 h-10 sm:w-11 sm:h-11 rounded-full transition-all duration-300 relative ${activeTab === 'jobs'
              ? isDark
                ? 'bg-slate-800 text-amber-400 shadow-lg scale-110 border border-slate-700'
                : 'bg-white text-indigo-700 shadow-lg scale-110'
              : 'text-white hover:bg-white/20'
            }`}
          title="İş İlanları & Usta Rehberi"
        >
          <Briefcase className="w-5 h-5 stroke-[2.2]" />
          <span className="sr-only">İş İlanları</span>
        </button>

        {/* Deals / Store Tab */}
        <button
          onClick={() => setActiveTab('deals')}
          className={`flex flex-col items-center justify-center w-10 h-10 sm:w-11 sm:h-11 rounded-full transition-all duration-300 ${activeTab === 'deals'
              ? isDark
                ? 'bg-slate-800 text-teal-400 shadow-lg scale-110 border border-slate-700'
                : 'bg-white text-teal-700 shadow-lg scale-110'
              : 'text-white hover:bg-white/20'
            }`}
          title="İndirimler & Esnaf"
        >
          <Store className="w-5 h-5 stroke-[2.2]" />
          <span className="sr-only">İndirimler</span>
        </button>

        {/* Places / Keşfet Tab */}
        <button
          onClick={() => setActiveTab('places')}
          className={`flex flex-col items-center justify-center w-10 h-10 sm:w-11 sm:h-11 rounded-full transition-all duration-300 ${activeTab === 'places'
              ? isDark
                ? 'bg-slate-800 text-sky-400 shadow-lg scale-110 border border-slate-700'
                : 'bg-white text-sky-700 shadow-lg scale-110'
              : 'text-white hover:bg-white/20'
            }`}
          title="Gezilecek Yerler"
        >
          <Navigation className="w-5 h-5 stroke-[2.2] rotate-45" />
          <span className="sr-only">Gezilecek Yerler</span>
        </button>

        {/* News Tab */}
        <button
          onClick={() => setActiveTab('news')}
          className={`flex flex-col items-center justify-center w-10 h-10 sm:w-11 sm:h-11 rounded-full transition-all duration-300 ${activeTab === 'news'
              ? isDark
                ? 'bg-slate-800 text-indigo-400 shadow-lg scale-110 border border-slate-700'
                : 'bg-white text-indigo-700 shadow-lg scale-110'
              : 'text-white hover:bg-white/20'
            }`}
          title="Haberler"
        >
          <Newspaper className="w-5 h-5 stroke-[2.2]" />
          <span className="sr-only">Haberler</span>
        </button>

        {/* Settings / Profile Tab */}
        <button
          onClick={() => setActiveTab('settings')}
          className={`flex flex-col items-center justify-center w-10 h-10 sm:w-11 sm:h-11 rounded-full transition-all duration-300 ${activeTab === 'settings'
              ? isDark
                ? 'bg-slate-800 text-blue-400 shadow-lg scale-110 border border-slate-700'
                : 'bg-white text-blue-700 shadow-lg scale-110'
              : 'text-white hover:bg-white/20'
            }`}
          title="Ayarlar & Profil"
        >
          <User className="w-5 h-5 stroke-[2.2]" />
          <span className="sr-only">Ayarlar</span>
        </button>

      </div>
    </div>
  );
};
