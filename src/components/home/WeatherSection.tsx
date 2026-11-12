import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { VanWeatherData } from '../../types';
import { fetchLiveVanWeather } from '../../services/weatherService';
import { VAN_WEATHER } from '../../data/mockData';
import {
  ChevronRight,
  CloudSun,
  Sun,
  Cloud,
  CloudRain,
  Wind,
  RefreshCw,
  Droplets,
  Compass,
  CalendarDays,
} from 'lucide-react';

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

interface WeatherSectionProps {
  isDark: boolean;
  searchQuery: string;
  isModalOpen: boolean;
  onOpen: () => void;
  onClose: () => void;
}

export const WeatherSection: React.FC<WeatherSectionProps> = ({ isDark, searchQuery, isModalOpen, onOpen, onClose }) => {
  // Live Weather State
  const [weather, setWeather] = useState<VanWeatherData>(VAN_WEATHER);
  const [isWeatherLoading, setIsWeatherLoading] = useState<boolean>(false);

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

  useEffect(() => {
    handleRefreshWeather();
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
      {/* 0. Van Hava Durumu Card */}
      {showCard(['hava', 'durum', 'sıcak', 'mgm', 'derece', 'güneş']) && (
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
                <div className="text-xs font-bold truncate">{weather.aqi != null ? `${weather.aqi} AQI • ${weather.aqiStatus.split(' ')[0]}` : weather.aqiStatus}</div>
              </div>
            </div>

            <div className={`p-2 rounded-2xl border flex items-center gap-2 ${isDark ? 'bg-amber-950/40 border-amber-900/50 text-amber-300' : 'bg-amber-50/80 border-amber-100 text-amber-800'
              }`}>
              <Sun className="w-4 h-4 text-amber-500 shrink-0" />
              <div className="min-w-0">
                <div className="text-[9px] font-extrabold uppercase tracking-wide opacity-80">UV İndeksi</div>
                <div className="text-xs font-bold truncate">{weather.uvIndex != null ? `${weather.uvIndex} • ${weather.uvStatus.split(' ')[0]}` : weather.uvStatus}</div>
              </div>
            </div>
          </div>

          <button
            onClick={() => onOpen()}
            className={`w-full ${buttonStyle} text-xs font-bold py-2 px-3 rounded-full transition-all shadow-sm flex items-center justify-center gap-1 active:scale-95 border`}
          >
            <span>7 GÜNLÜK TAHMİN & DETAYLAR</span>
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* 5. Van Hava Durumu Modal */}
      {isModalOpen && createPortal(
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
                  onClick={onClose}
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
                    {weather.aqi != null ? `${weather.aqi} AQI - ${weather.aqiStatus}` : weather.aqiStatus}
                  </span>
                </div>

                {/* Visual bar for AQI */}
                <div className="space-y-1">
                  <div className="w-full h-2.5 bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden p-0.5">
                    <div
                      className="h-full bg-emerald-500 rounded-full transition-all duration-500"
                      style={{ width: weather.aqi != null ? `${Math.min(100, (weather.aqi / 150) * 100)}%` : '0%' }}
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
                    {weather.uvIndex != null ? `${weather.uvIndex} / 11 (${weather.uvStatus})` : weather.uvStatus}
                  </span>
                </div>

                {/* Visual bar for UV */}
                <div className="space-y-1">
                  <div className="w-full h-2.5 bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden p-0.5">
                    <div
                      className="h-full bg-gradient-to-r from-amber-400 to-orange-500 rounded-full transition-all duration-500"
                      style={{ width: weather.uvIndex != null ? `${Math.min(100, (weather.uvIndex / 11) * 100)}%` : '0%' }}
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
        </div>,
        document.body
      )}
    </>
  );
};
