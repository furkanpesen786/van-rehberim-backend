import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { fetchLivePrayerTimes, LivePrayerTimesResponse, calculatePrayerStatus } from '../../services/prayerService';
import { PRAYER_TIMES } from '../../data/mockData';
import { Clock, RefreshCw } from 'lucide-react';

interface PrayerSectionProps {
  isDark: boolean;
  searchQuery: string;
  isModalOpen: boolean;
  onOpen: () => void;
  onClose: () => void;
}

export const PrayerSection: React.FC<PrayerSectionProps> = ({ isDark, searchQuery, isModalOpen, onOpen, onClose }) => {
  // Live Diyanet Prayer Times State (Fetched from namazvakitleri.diyanet.gov.tr)
  const [prayerData, setPrayerData] = useState<LivePrayerTimesResponse | null>(null);
  const [isPrayerLoading, setIsPrayerLoading] = useState<boolean>(true);

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

  useEffect(() => {
    handleRefreshPrayerTimes();

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
      {/* 2. Ezan Vakitleri Card */}
      {showCard(['ezan', 'vakit', 'namaz', 'diyanet', 'imsak', 'sabah', 'öğle', 'ikindi', 'akşam', 'yatsı']) && (
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
                onClick={() => onOpen()}
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
                  onClick={() => onOpen()}
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
      )}

      {/* 6. Ezan Vakitleri Modal (Diyanet Canlı) */}
      {isModalOpen && createPortal(
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
                  onClick={onClose}
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
        </div>,
        document.body
      )}
    </>
  );
};
