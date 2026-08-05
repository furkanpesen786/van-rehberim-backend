import React, { useState, useEffect } from 'react';
import { PLACES_TO_VISIT } from '../data/mockData';
import { PlaceToVisit } from '../types';
import { Search, MapPin, ChevronRight, X, Star, Calendar, Clock, Compass, Heart } from 'lucide-react';

interface PlacesViewProps {
  theme?: 'light' | 'dark';
}

export const PlacesView: React.FC<PlacesViewProps> = ({ theme = 'light' }) => {
  const [currentPage, setCurrentPage] = useState<number>(0);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedPlace, setSelectedPlace] = useState<PlaceToVisit | null>(null);

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
    const syncSavedPlaces = () => {
      try {
        const stored = localStorage.getItem('saved_places_van');
        if (stored) {
          setSavedPlaceIds(JSON.parse(stored));
        }
      } catch (e) { }
    };
    window.addEventListener('van_saved_deals_changed', syncSavedPlaces);
    window.addEventListener('storage', syncSavedPlaces);
    return () => {
      window.removeEventListener('van_saved_deals_changed', syncSavedPlaces);
      window.removeEventListener('storage', syncSavedPlaces);
    };
  }, []);

  const toggleSavePlace = (placeId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const updated = savedPlaceIds.includes(placeId)
      ? savedPlaceIds.filter(id => id !== placeId)
      : [...savedPlaceIds, placeId];

    setSavedPlaceIds(updated);
    try {
      localStorage.setItem('saved_places_van', JSON.stringify(updated));
      window.dispatchEvent(new Event('van_saved_deals_changed'));
    } catch (err) {
      console.error(err);
    }
  };

  const isDark = theme === 'dark';

  const ITEMS_PER_PAGE = 5;
  const TOTAL_PAGES = Math.ceil(PLACES_TO_VISIT.length / ITEMS_PER_PAGE); // 4 pages for 20 places

  // Filter based on search query
  const filteredPlaces = PLACES_TO_VISIT.filter(p =>
    p.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.shortDesc.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.category.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Get current page slice if not searching
  const displayedPlaces = searchQuery
    ? filteredPlaces
    : PLACES_TO_VISIT.slice(currentPage * ITEMS_PER_PAGE, (currentPage + 1) * ITEMS_PER_PAGE);

  return (
    <div className={`relative min-h-screen pb-28 font-sans ${isDark ? 'text-white' : 'text-slate-800'}`}>
      {/* Background Graphic matching Screenshot */}
      <div
        className="fixed inset-0 z-0 bg-cover bg-center bg-no-repeat transition-all duration-700"
        style={{
          backgroundImage: isDark
            ? `linear-gradient(to bottom, rgba(10, 12, 18, 0.96), rgba(15, 20, 28, 0.98), rgba(8, 10, 16, 0.99)), url('https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=1200&q=80')`
            : `linear-gradient(to bottom, rgba(4, 40, 70, 0.90), rgba(6, 65, 105, 0.95), rgba(10, 85, 130, 0.98)), url('https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=1200&q=80')`
        }}
      />

      <div className="relative z-10 max-w-md mx-auto px-4 pt-5">

        {/* Header Title - "GEZİLECEK YERLER" */}
        <div className="text-center mb-4">
          <h1 className="text-2xl sm:text-3xl font-black text-cyan-300 tracking-wider uppercase drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]">
            GEZİLECEK YERLER
          </h1>
        </div>

        {/* Search Input Bar */}
        <div className="relative mb-5">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="NEREYE GİTMEK İSTERSİN ?"
            className={`w-full rounded-full py-3.5 pl-6 pr-12 text-sm font-extrabold shadow-lg focus:outline-none focus:ring-2 focus:ring-cyan-300 uppercase tracking-wide ${isDark
                ? 'bg-[#1c1e24] text-white placeholder-slate-400 border border-slate-700'
                : 'bg-white text-slate-900 placeholder-slate-800'
              }`}
          />
          <button className={`absolute right-5 top-1/2 -translate-y-1/2 font-black ${isDark ? 'text-slate-300' : 'text-slate-900'}`}>
            <Search className="w-5 h-5 stroke-[2.5]" />
          </button>
        </div>

        {/* List of Places Cards */}
        <div className="space-y-4 animate-fadeIn">
          {displayedPlaces.map((place) => (
            <div
              key={place.id}
              className={`rounded-3xl p-3 shadow-xl flex flex-col sm:flex-row gap-3 items-stretch hover:shadow-2xl transition-all border ${isDark ? 'bg-[#1c1e24] border-slate-800 text-white' : 'bg-white border-slate-100 text-slate-800'
                }`}
            >
              {/* Image Container */}
              <div className="w-full sm:w-44 h-40 shrink-0 rounded-2xl overflow-hidden shadow-inner relative group">
                <img
                  src={place.image}
                  alt={place.title}
                  referrerPolicy="no-referrer"
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                />
                <span className="absolute top-2 left-2 bg-black/60 backdrop-blur-md text-white text-[10px] font-bold px-2 py-0.5 rounded-full uppercase">
                  {place.category}
                </span>

                {/* FAVORITE BUTTON */}
                <button
                  onClick={(e) => toggleSavePlace(place.id, e)}
                  className="absolute top-2 right-2 w-8 h-8 rounded-full bg-black/40 backdrop-blur-md flex items-center justify-center hover:bg-black/60 transition-colors border border-white/20 shadow-lg z-10"
                >
                  <Heart
                    className={`w-4 h-4 transition-colors ${savedPlaceIds.includes(place.id) ? 'fill-rose-500 text-rose-500' : 'text-white'}`}
                  />
                </button>
              </div>

              {/* Text Info Container */}
              <div className="flex-1 flex flex-col justify-between py-1">
                <div>
                  <h3 className={`text-sm font-black uppercase tracking-tight leading-snug ${isDark ? 'text-white' : 'text-slate-900'}`}>
                    {place.title}
                  </h3>
                  <p className={`text-[11px] font-medium leading-tight mt-1 line-clamp-4 ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>
                    {place.shortDesc}
                  </p>
                </div>

                {/* "DAHA FAZLA ->" Button */}
                <button
                  onClick={() => setSelectedPlace(place)}
                  className={`mt-3 w-full text-xs font-black py-2 px-3 rounded-full transition-all shadow-sm flex items-center justify-center gap-1 active:scale-95 border uppercase ${isDark
                      ? 'bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-700'
                      : 'bg-gradient-to-r from-slate-200 via-slate-300 to-slate-200 hover:from-slate-300 hover:to-slate-300 text-slate-800 border-slate-300/60'
                    }`}
                >
                  DAHA FAZLA &rarr;
                </button>
              </div>
            </div>
          ))}

          {displayedPlaces.length === 0 && (
            <div className={`rounded-3xl p-8 text-center font-bold ${isDark ? 'bg-[#1c1e24] text-slate-300' : 'bg-white/90 text-slate-700'}`}>
              Aramanıza uygun gezilecek yer bulunamadı.
            </div>
          )}
        </div>

        {/* Pagination Dots and DAHA FAZLA / DAHA AZ Controls matching screenshot */}
        {!searchQuery && (
          <div className="flex items-center justify-between mt-6 px-2">
            {/* Dots */}
            <div className="flex items-center gap-1.5">
              {Array.from({ length: TOTAL_PAGES }).map((_, idx) => (
                <button
                  key={idx}
                  onClick={() => setCurrentPage(idx)}
                  className={`h-2.5 rounded-full transition-all duration-300 ${currentPage === idx ? 'w-8 bg-red-600 shadow' : 'w-2.5 bg-slate-300/70'
                    }`}
                />
              ))}
            </div>

            {/* Pagination Action */}
            <button
              onClick={() => setCurrentPage((prev) => (prev + 1) % TOTAL_PAGES)}
              className="text-xs font-black text-red-600 uppercase tracking-wider flex items-center gap-1 hover:underline"
            >
              <span>{currentPage < TOTAL_PAGES - 1 ? 'DAHA FAZLA' : 'DAHA AZ'}</span>
              <ChevronRight className={`w-4 h-4 transition-transform duration-300 ${currentPage === TOTAL_PAGES - 1 ? 'rotate-180' : ''}`} />
            </button>
          </div>
        )}

      </div>

      {/* Place Detail Modal */}
      {selectedPlace && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className={`${isDark ? 'bg-[#18191e] text-white' : 'bg-white text-slate-700'} w-full max-w-lg rounded-t-3xl sm:rounded-3xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden animate-slideUp`}>

            {/* Header Image */}
            <div className="relative h-56 sm:h-64 shrink-0">
              <img
                src={selectedPlace.image}
                alt={selectedPlace.title}
                referrerPolicy="no-referrer"
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-black/30" />

              <button
                onClick={() => setSelectedPlace(null)}
                className="absolute top-4 right-4 w-9 h-9 rounded-full bg-black/50 text-white flex items-center justify-center hover:bg-black/70 border border-white/20"
              >
                <X className="w-5 h-5" />
              </button>

              <div className="absolute bottom-4 left-4 right-4 text-white">
                <span className="bg-cyan-500 text-slate-950 font-extrabold text-[10px] px-2.5 py-0.5 rounded-full uppercase tracking-wide">
                  {selectedPlace.category}
                </span>
                <h3 className="text-xl font-black mt-1 uppercase tracking-tight leading-tight">
                  {selectedPlace.title}
                </h3>
                <p className="text-xs text-cyan-200 flex items-center gap-1 mt-1">
                  <MapPin className="w-3.5 h-3.5" />
                  <span>{selectedPlace.location} ({selectedPlace.distanceFromCenter} merkeze)</span>
                </p>
              </div>
            </div>

            {/* Body Content */}
            <div className="p-5 overflow-y-auto space-y-4">
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className={`${isDark ? 'bg-slate-800 border-slate-700' : 'bg-slate-100 border-slate-200'} p-2.5 rounded-xl border`}>
                  <span className={`${isDark ? 'text-slate-400' : 'text-slate-500'} font-bold block text-[10px] uppercase`}>En İyi Zaman</span>
                  <span className={`font-extrabold ${isDark ? 'text-white' : 'text-slate-900'}`}>{selectedPlace.bestTimeToVisit}</span>
                </div>
                <div className={`${isDark ? 'bg-slate-800 border-slate-700' : 'bg-slate-100 border-slate-200'} p-2.5 rounded-xl border`}>
                  <span className={`${isDark ? 'text-slate-400' : 'text-slate-500'} font-bold block text-[10px] uppercase`}>Giriş Ücreti</span>
                  <span className={`font-extrabold ${isDark ? 'text-white' : 'text-slate-900'}`}>{selectedPlace.entryFee}</span>
                </div>
              </div>

              <div>
                <h4 className={`font-extrabold text-sm uppercase mb-1 ${isDark ? 'text-white' : 'text-slate-900'}`}>Açıklama</h4>
                <p className={`text-xs leading-relaxed font-medium ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>
                  {selectedPlace.fullDesc}
                </p>
              </div>

              <div className={`pt-3 border-t ${isDark ? 'border-slate-800' : 'border-slate-200'} flex items-center justify-between`}>
                <div className="flex items-center gap-1 text-amber-500 font-bold text-sm">
                  <Star className="w-4 h-4 fill-amber-400" />
                  <span>{selectedPlace.rating} / 5.0</span>
                </div>

                <a
                  href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(selectedPlace.title + ' Van')}`}
                  target="_blank"
                  rel="noreferrer"
                  className="bg-cyan-600 hover:bg-cyan-700 text-white font-extrabold text-xs py-2 px-4 rounded-full flex items-center gap-1.5 shadow-md"
                >
                  <Compass className="w-4 h-4" />
                  <span>Haritada Gör</span>
                </a>
              </div>
            </div>

          </div>
        </div>
      )}

    </div>
  );
};
