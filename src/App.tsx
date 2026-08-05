import React, { useState, useEffect } from 'react';
import { TabType } from './types';
import { BottomNav } from './components/BottomNav';
import { HomeView } from './components/HomeView';
import { PlacesView } from './components/PlacesView';
import { NewsView } from './components/NewsView';
import { DealsView } from './components/DealsView';
import { JobsView } from './components/JobsView';
import { SettingsView } from './components/SettingsView';
import { useAuth } from './context/AuthContext';
import { LoginModal } from './components/LoginModal';
import { App as CapApp } from '@capacitor/app';
import { SplashScreen as CapSplashScreen } from '@capacitor/splash-screen';

export default function App() {
  const { showAuthModal, setShowAuthModal } = useAuth();
  const [activeTab, setActiveTab] = useState<TabType>('home');
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    return (localStorage.getItem('app_theme') as 'light' | 'dark') || 'light';
  });

  const handleThemeChange = (newTheme: 'light' | 'dark') => {
    setTheme(newTheme);
    localStorage.setItem('app_theme', newTheme);
  };

  useEffect(() => {
    // Hide the native splash screen to go directly to home view
    CapSplashScreen.hide().catch(() => { });
  }, []);

  useEffect(() => {
    CapApp.addListener('backButton', ({ canGoBack }) => {
      if (activeTab === 'home') {
        CapApp.exitApp();
      } else {
        setActiveTab('home');
      }
    });
    return () => {
      CapApp.removeAllListeners();
    };
  }, [activeTab]);

  return (
    <div className={`min-h-screen font-sans select-none transition-colors duration-200 ${theme === 'dark' ? 'bg-[#141518] text-white' : 'bg-slate-50 text-slate-800'}`}>

      {/* Active View Container */}
      <main className="w-full">
        {activeTab === 'home' && (
          <HomeView
            theme={theme}
            onNavigateToPlaces={() => setActiveTab('places')}
            onNavigateToDeals={() => setActiveTab('deals')}
            onNavigateToJobs={() => setActiveTab('jobs')}
          />
        )}
        {activeTab === 'jobs' && <JobsView theme={theme} />}
        {activeTab === 'places' && <PlacesView theme={theme} />}
        {activeTab === 'news' && <NewsView theme={theme} />}
        {activeTab === 'deals' && <DealsView theme={theme} />}
        {activeTab === 'settings' && (
          <SettingsView theme={theme} onThemeChange={handleThemeChange} />
        )}
      </main>

      {/* Global Auth Modal for Email / Google Login */}
      <LoginModal
        isOpen={showAuthModal}
        onClose={() => setShowAuthModal(false)}
        theme={theme}
      />

      {/* Floating Bottom Pill Navigation Bar */}
      <BottomNav activeTab={activeTab} setActiveTab={setActiveTab} theme={theme} />
    </div>
  );
}

