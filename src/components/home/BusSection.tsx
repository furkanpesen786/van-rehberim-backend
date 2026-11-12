import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { BusRoute } from '../../types';
import { fetchLiveBusSchedules } from '../../services/busService';
import {
  Bus,
  RefreshCw,
  X,
  Info,
  ExternalLink,
  Search,
  Navigation,
  Clock,
  MapPin,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';

interface BusSectionProps {
  isDark: boolean;
  searchQuery: string;
  isModalOpen: boolean;
  onOpen: () => void;
  onClose: () => void;
}

export const BusSection: React.FC<BusSectionProps> = ({ isDark, searchQuery, isModalOpen, onOpen, onClose }) => {
  // Live van.bel.tr Bus Schedules & Stops State
  const [busRoutes, setBusRoutes] = useState<BusRoute[]>([]);
  const [isBusLoading, setIsBusLoading] = useState<boolean>(true);
  const [busSource, setBusSource] = useState<string>('van.bel.tr (VAN BELVAN Ulaşım)');
  const [busLastUpdated, setBusLastUpdated] = useState<string>('');
  const [busIsLive, setBusIsLive] = useState<boolean>(false);
  const [busSearchQuery, setBusSearchQuery] = useState<string>('');
  const [selectedBusCategory, setSelectedBusCategory] = useState<string>('Tümü');
  const [activeBusId, setActiveBusId] = useState<string | null>(null);

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
    handleRefreshBusSchedules();
  }, []);

  // Dynamic theme class helpers
  const cardBg = isDark ? 'bg-[#1b1c21] border-slate-800 text-white' : 'bg-white border-slate-100 text-slate-800';
  const cardTitleText = isDark ? 'text-amber-400' : 'text-amber-950';
  const cardSubText = isDark ? 'text-slate-400' : 'text-slate-600';
  const buttonStyle = isDark
    ? 'bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-700'
    : 'bg-gradient-to-r from-slate-200 via-slate-300 to-slate-200 hover:from-slate-300 hover:to-slate-300 text-slate-800 border-slate-300/50';

  // Filter card if search is active
  const q = searchQuery.toLowerCase().trim();
  const showCard = (keywords: string[]) => {
    if (!q) return true;
    return keywords.some(k => k.toLowerCase().includes(q) || q.includes(k.toLowerCase()));
  };

  return (
    <>
      {/* 2. Otobüs Saatleri ve Durakları Card */}
      {showCard(['otobüs', 'saat', 'durak', 'ulaşım', 'belvan', 'hat']) && (
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
              onClick={() => onOpen()}
              className={`mt-2.5 w-full ${buttonStyle} text-xs font-bold py-2 px-3 rounded-full transition-all shadow-sm flex items-center justify-center gap-1 active:scale-95 border`}
            >
              TÜM LİSTEYİ GÖR ({busRoutes.length} HAT) &rarr;
            </button>
          </div>
        </div>
      )}

      {/* 3. Otobüs Saatleri Modal */}
      {isModalOpen && createPortal(
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
                  onClick={onClose}
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
        </div>,
        document.body
      )}
    </>
  );
};
