import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { fetchLiveCurrencies, LiveCurrencyResponse } from '../../services/currencyService';
import { TrendingUp, RefreshCw, X } from 'lucide-react';
import { useBackButtonClose } from '../../utils/backButtonStack';

interface CurrencySectionProps {
  isDark: boolean;
  searchQuery: string;
  isModalOpen: boolean;
  onOpen: () => void;
  onClose: () => void;
}

export const CurrencySection: React.FC<CurrencySectionProps> = ({ isDark, searchQuery, isModalOpen, onOpen, onClose }) => {
  // M32: Android geri tuşu açık modali kapatır
  useBackButtonClose(isModalOpen, onClose);

  // Live doviz.com Exchange & Gold Rates State
  const [currencyData, setCurrencyData] = useState<LiveCurrencyResponse | null>(null);
  const [isCurrencyLoading, setIsCurrencyLoading] = useState<boolean>(true);

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

  useEffect(() => {
    handleRefreshCurrencies();

    // Refresh currencies every minute
    const interval = setInterval(() => {
      handleRefreshCurrencies();
    }, 60000);

    return () => clearInterval(interval);
  }, []);

  // Dynamic theme class helpers
  const cardBg = isDark ? 'bg-[#1b1c21] border-slate-800 text-white' : 'bg-white border-slate-100 text-slate-800';
  const cardTitleText = isDark ? 'text-amber-400' : 'text-amber-950';

  // Filter card if search is active
  const q = searchQuery.toLowerCase().trim();
  const showCard = (keywords: string[]) => {
    if (!q) return true;
    return keywords.some(k => k.toLowerCase().includes(q) || q.includes(k.toLowerCase()));
  };

  return (
    <>
      {/* 3. Döviz Kuru Card (doviz.com Canlı) */}
      {showCard(['döviz', 'kur', 'altın', 'dolar', 'euro', 'finans', 'para']) && (
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
                onClick={() => onOpen()}
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
                onClick={() => onOpen()}
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
      )}

      {/* ================= MODAL: FINANCE / CANLI DÖVİZ & ALTIN (doviz.com) ================= */}
      {isModalOpen && createPortal(
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
                  onClick={onClose}
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
        </div>,
        document.body
      )}
    </>
  );
};
