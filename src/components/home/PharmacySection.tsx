import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Pharmacy } from '../../types';
import { fetchLivePharmacies } from '../../services/pharmacyService';
import {
  HeartPulse,
  RefreshCw,
  MapPin,
  Navigation,
  PhoneCall,
} from 'lucide-react';

interface PharmacySectionProps {
  isDark: boolean;
  searchQuery: string;
  isModalOpen: boolean;
  onOpen: () => void;
  onClose: () => void;
}

export const PharmacySection: React.FC<PharmacySectionProps> = ({ isDark, searchQuery, isModalOpen, onOpen, onClose }) => {
  // Live Duty Pharmacies State (Fetched from vaneczaciodasi.org.tr)
  const [pharmacies, setPharmacies] = useState<Pharmacy[]>([]);
  const [pharmacyDutyDate, setPharmacyDutyDate] = useState<string>('Bugün');
  const [pharmacyLastUpdated, setPharmacyLastUpdated] = useState<string>('');
  const [isPharmaciesLoading, setIsPharmaciesLoading] = useState<boolean>(true);
  const [selectedPharmacyCityFilter, setSelectedPharmacyCityFilter] = useState<'Tümü' | 'Van' | 'Diğer'>('Van');

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

  useEffect(() => {
    handleRefreshPharmacies();
  }, []);

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

  // Filter card if search is active
  const q = searchQuery.toLowerCase().trim();
  const showCard = (keywords: string[]) => {
    if (!q) return true;
    return keywords.some(k => k.toLowerCase().includes(q) || q.includes(k.toLowerCase()));
  };

  return (
    <>
      {/* 1. Nöbetçi Eczaneler Card */}
      {showCard(['eczane', 'nöbet', 'sağlık', 'ilaç']) && (
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
              onClick={() => onOpen()}
              className={`mt-2.5 w-full ${buttonStyle} text-xs font-bold py-2 px-3 rounded-full transition-all shadow-sm flex items-center justify-center gap-1 active:scale-95 border`}
            >
              TÜM LİSTEYİ GÖR &rarr;
            </button>
          </div>
        </div>
      )}

      {/* 1. Nöbetçi Eczaneler Modal */}
      {isModalOpen && createPortal(
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
                  onClick={onClose}
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
        </div>,
        document.body
      )}
    </>
  );
};
