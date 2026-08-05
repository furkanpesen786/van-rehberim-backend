import React, { useState, useEffect } from 'react';
import { NewsItem, DeathNotice } from '../types';
import { fetchLiveVanNews } from '../services/newsService';
import { fetchLiveTaziyeler } from '../services/taziyeService';
import {
  Clock,
  Info,
  ExternalLink,
  X,
  PhoneCall,
  Heart,
  Newspaper,
  RefreshCw,
  Building2,
  Sparkles,
  Globe,
  Radio,
} from 'lucide-react';

interface NewsViewProps {
  theme?: 'light' | 'dark';
}

const TOP_7_VAN_CHANNELS = [
  { name: 'Tümü', domain: 'all' },
  { name: 'Şehrivan Gazetesi', url: 'https://www.sehrivan.com' },
  { name: 'Wan Haber', url: 'https://www.wanhaber.com' },
  { name: 'Van Olay', url: 'https://www.vanolay.com' },
  { name: 'Van Postası', url: 'https://www.vanpostasi.com' },
  { name: 'Van Havadis', url: 'https://www.vanhavadis.com' },
  { name: 'Gazete Van', url: 'https://www.gazetevan.com' },
  { name: 'Van Ekspres', url: 'https://www.vanekspres.com' },
];

export const NewsView: React.FC<NewsViewProps> = ({ theme = 'light' }) => {
  const [activeTab, setActiveTab] = useState<'news' | 'death'>('news');
  const [selectedNews, setSelectedNews] = useState<NewsItem | null>(null);

  // Live News State
  const [newsList, setNewsList] = useState<NewsItem[]>([]);
  const [isNewsLoading, setIsNewsLoading] = useState<boolean>(true);
  const [newsSourceInfo, setNewsSourceInfo] = useState<string>('Van 7 Büyük Haber Portalı');
  const [selectedChannel, setSelectedChannel] = useState<string>('Tümü');

  // Live Taziyeler State
  const [taziyeList, setTaziyeList] = useState<DeathNotice[]>([]);
  const [isTaziyeLoading, setIsTaziyeLoading] = useState<boolean>(true);
  const [taziyeSourceInfo, setTaziyeSourceInfo] = useState<string>('van.bel.tr (Van Büyükşehir Belediyesi)');

  const isDark = theme === 'dark';

  const loadNewsData = async () => {
    setIsNewsLoading(true);
    try {
      const res = await fetchLiveVanNews();
      setNewsList(res.news);
      if (res.source) setNewsSourceInfo(res.source);
    } catch (e) {
      console.error('Error fetching live Van news:', e);
    } finally {
      setIsNewsLoading(false);
    }
  };

  const loadTaziyeData = async () => {
    setIsTaziyeLoading(true);
    try {
      const res = await fetchLiveTaziyeler();
      setTaziyeList(res.notices);
      if (res.source) setTaziyeSourceInfo(res.source);
    } catch (e) {
      console.error('Error fetching live Taziyeler:', e);
    } finally {
      setIsTaziyeLoading(false);
    }
  };

  useEffect(() => {
    loadNewsData();
    loadTaziyeData();
  }, []);

  const filteredNews = selectedChannel === 'Tümü'
    ? newsList
    : newsList.filter(n => n.source.toLowerCase().includes(selectedChannel.toLowerCase()));

  const handleOpenSourceUrl = (url?: string, defaultSource?: string) => {
    if (url) {
      window.open(url, '_blank', 'noopener,noreferrer');
      return;
    }
    const match = TOP_7_VAN_CHANNELS.find(c => defaultSource && c.name.toLowerCase().includes(defaultSource.toLowerCase()));
    if (match && match.url) {
      window.open(match.url, '_blank', 'noopener,noreferrer');
    } else {
      window.open('https://www.google.com/search?q=Van+haber', '_blank', 'noopener,noreferrer');
    }
  };

  return (
    <div className={`min-h-screen pb-28 font-sans ${isDark ? 'bg-[#141518] text-white' : 'bg-slate-50 text-slate-800'}`}>
      
      {/* Top Bar Header */}
      <div className={`px-5 py-4 flex items-center justify-between border-b sticky top-0 z-30 shadow-sm ${
        isDark ? 'bg-[#1b1c21] border-slate-800 text-white' : 'bg-white border-slate-200 text-slate-900'
      }`}>
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-2xl bg-emerald-500/20 text-emerald-500 flex items-center justify-center font-black">
            <Newspaper className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl font-black text-emerald-500 tracking-tight leading-none">
              VAN HABER & VEFAT İLANLARI
            </h1>
            <p className={`text-[11px] font-semibold mt-0.5 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
              Canlı Haber Portalları & van.bel.tr
            </p>
          </div>
        </div>

        <button
          onClick={() => {
            if (activeTab === 'news') loadNewsData();
            else loadTaziyeData();
          }}
          title="Yenile"
          className={`p-2 rounded-xl border transition-all active:scale-95 ${
            isDark ? 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700' : 'bg-slate-100 text-slate-700 border-slate-200 hover:bg-slate-200'
          }`}
        >
          <RefreshCw className={`w-4 h-4 ${isNewsLoading || isTaziyeLoading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      <div className="max-w-xl mx-auto px-4 pt-4 space-y-4">

        {/* Category Switcher: Haberler / Vefat İlanları */}
        <div className={`flex p-1.5 rounded-2xl font-bold text-xs border ${
          isDark ? 'bg-[#1b1c21] border-slate-800' : 'bg-slate-200/80 border-slate-300/60'
        }`}>
          <button
            onClick={() => setActiveTab('news')}
            className={`flex-1 py-2.5 rounded-xl transition-all flex items-center justify-center gap-1.5 ${
              activeTab === 'news' 
                ? isDark ? 'bg-emerald-500 text-slate-950 font-black shadow-md' : 'bg-emerald-600 text-white font-black shadow-md' 
                : isDark ? 'text-slate-400 hover:text-white' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Globe className="w-4 h-4" />
            <span>Güncel Van Haberleri ({newsList.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('death')}
            className={`flex-1 py-2.5 rounded-xl transition-all flex items-center justify-center gap-1.5 ${
              activeTab === 'death' 
                ? isDark ? 'bg-emerald-500 text-slate-950 font-black shadow-md' : 'bg-emerald-600 text-white font-black shadow-md' 
                : isDark ? 'text-slate-400 hover:text-white' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Heart className="w-4 h-4" />
            <span>Vefat İlanları ({taziyeList.length})</span>
          </button>
        </div>

        {/* NEWS TAB CONTENT */}
        {activeTab === 'news' && (
          <div className="space-y-4 animate-fadeIn">
            
            {/* Top 7 Van Channels Header Info */}
            <div className={`p-4 rounded-2xl border space-y-3 ${
              isDark ? 'bg-[#1b1c21] border-slate-800' : 'bg-white border-slate-200 shadow-sm'
            }`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Radio className="w-4 h-4 text-emerald-500 animate-pulse" />
                  <span className="text-xs font-black uppercase tracking-wider text-emerald-500">
                    VAN'IN İLK 7 HABER KANALI
                  </span>
                </div>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
                  Canlı Takip
                </span>
              </div>

              {/* Top 7 Channel Filter Chips */}
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none text-[11px] font-bold">
                {TOP_7_VAN_CHANNELS.map((ch) => (
                  <button
                    key={ch.name}
                    onClick={() => setSelectedChannel(ch.name)}
                    className={`px-3 py-1.5 rounded-xl shrink-0 transition-all border ${
                      selectedChannel === ch.name
                        ? 'bg-emerald-500 text-slate-950 border-emerald-500 font-black shadow-sm'
                        : isDark
                          ? 'bg-slate-800 text-slate-300 border-slate-700 hover:border-slate-600'
                          : 'bg-slate-100 text-slate-700 border-slate-200 hover:bg-slate-200'
                    }`}
                  >
                    {ch.name}
                  </button>
                ))}
              </div>
            </div>

            {/* News Feed Cards */}
            {isNewsLoading ? (
              <div className={`p-8 rounded-3xl text-center border space-y-3 ${
                isDark ? 'bg-[#1b1c21] border-slate-800' : 'bg-white border-slate-200'
              }`}>
                <RefreshCw className="w-8 h-8 text-emerald-500 animate-spin mx-auto" />
                <p className="text-xs font-bold text-slate-400">Van haber kanallarından canlı haberler yükleniyor...</p>
              </div>
            ) : filteredNews.length === 0 ? (
              <div className={`p-8 rounded-3xl text-center border space-y-2 ${
                isDark ? 'bg-[#1b1c21] border-slate-800' : 'bg-white border-slate-200'
              }`}>
                <p className="text-xs font-bold text-slate-400">Seçilen kanalda henüz kayıtlı haber bulunamadı.</p>
              </div>
            ) : (
              filteredNews.map((item) => (
                <div
                  key={item.id}
                  className={`rounded-3xl overflow-hidden shadow-lg border flex flex-col transition-all hover:border-emerald-500/40 ${
                    isDark ? 'bg-[#1b1c21] border-slate-800 text-white' : 'bg-white border-slate-200 text-slate-800'
                  }`}
                >
                  {/* Feature Image & Channel Badge */}
                  <div className="relative h-52 w-full overflow-hidden bg-slate-900">
                    <img
                      src={item.image}
                      alt={item.title}
                      referrerPolicy="no-referrer"
                      className="w-full h-full object-cover transition-transform duration-500 hover:scale-105"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
                    
                    {/* News Channel Name Badge */}
                    <span className="absolute top-3 left-3 bg-slate-950/90 backdrop-blur-md text-amber-400 font-black text-[11px] px-3 py-1 rounded-xl shadow-md border border-amber-400/30 flex items-center gap-1.5">
                      <Radio className="w-3 h-3 text-emerald-400" />
                      <span>{item.source}</span>
                    </span>

                    {/* Category */}
                    <span className="absolute top-3 right-3 bg-emerald-500 text-slate-950 font-black text-[10px] px-2.5 py-1 rounded-xl shadow-md uppercase">
                      {item.category}
                    </span>
                  </div>

                  {/* Content */}
                  <div className="p-5 flex flex-col flex-1 space-y-3">
                    <h2 className={`text-base font-extrabold leading-snug tracking-tight ${isDark ? 'text-white' : 'text-slate-900'}`}>
                      {item.title}
                    </h2>

                    <p className={`text-xs font-medium leading-relaxed ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>
                      {item.summary}
                    </p>

                    <div className={`flex items-center justify-between text-[11px] font-medium pt-1 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                      <div className="flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5 text-emerald-500" />
                        <span>{item.date} - {item.time}</span>
                      </div>
                      <span className="font-bold text-emerald-500">Kaynak: {item.source}</span>
                    </div>

                    {/* Buttons: Haberi Oku & Direct News Source Link */}
                    <div className="pt-2 flex items-center gap-2">
                      <button
                        onClick={() => setSelectedNews(item)}
                        className={`flex-1 font-extrabold text-xs py-2.5 px-3 rounded-xl flex items-center justify-center gap-1.5 transition-all shadow-sm border active:scale-95 ${
                          isDark 
                            ? 'bg-slate-800 hover:bg-slate-700 text-white border-slate-700' 
                            : 'bg-slate-100 hover:bg-slate-200 text-slate-800 border-slate-300'
                        }`}
                      >
                        <Info className="w-4 h-4 text-emerald-500" />
                        <span>Detayını Oku</span>
                      </button>

                      <button
                        onClick={() => handleOpenSourceUrl(item.sourceUrl, item.source)}
                        className="flex-1 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs py-2.5 px-3 rounded-xl flex items-center justify-center gap-1.5 shadow-md active:scale-95 transition-all border border-emerald-400/30 shrink-0"
                      >
                        <ExternalLink className="w-4 h-4 stroke-[2.5]" />
                        <span className="truncate">Haber Kaynağına Git</span>
                      </button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* VEFAT İLANLARI (TAZİYELER) TAB CONTENT */}
        {activeTab === 'death' && (
          <div className="space-y-4 animate-fadeIn">
            
            {/* van.bel.tr Official Source Header Banner */}
            <div className={`p-4 rounded-3xl border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 ${
              isDark ? 'bg-[#1b1c21] border-slate-800' : 'bg-gradient-to-r from-emerald-50 to-teal-50 border-emerald-200'
            }`}>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-emerald-500 text-slate-950 flex items-center justify-center font-black shrink-0 shadow-md">
                  <Building2 className="w-6 h-6" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className={`font-black text-sm uppercase ${isDark ? 'text-white' : 'text-slate-900'}`}>
                      VAN BÜYÜKŞEHİR BELEDİYESİ
                    </h3>
                    <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-500 border border-emerald-500/30">
                      van.bel.tr Canlı
                    </span>
                  </div>
                  <p className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-600'} font-medium mt-0.5`}>
                    Günlük Taziye & Vefat İlanları Portalı
                  </p>
                </div>
              </div>

              <a
                href="https://van.bel.tr/Taziyeler.html"
                target="_blank"
                rel="noopener noreferrer"
                className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-black py-2 px-3.5 rounded-xl flex items-center gap-1.5 shadow-md shrink-0 active:scale-95 transition-all border border-emerald-400/30"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                <span>van.bel.tr Sayfasına Git</span>
              </a>
            </div>

            {/* Taziyeler List */}
            {isTaziyeLoading ? (
              <div className={`p-8 rounded-3xl text-center border space-y-3 ${
                isDark ? 'bg-[#1b1c21] border-slate-800' : 'bg-white border-slate-200'
              }`}>
                <RefreshCw className="w-8 h-8 text-emerald-500 animate-spin mx-auto" />
                <p className="text-xs font-bold text-slate-400">van.bel.tr güncel vefat ilanları yükleniyor...</p>
              </div>
            ) : taziyeList.length === 0 ? (
              <div className={`p-8 rounded-3xl text-center border space-y-2 ${
                isDark ? 'bg-[#1b1c21] border-slate-800' : 'bg-white border-slate-200'
              }`}>
                <p className="text-xs font-bold text-slate-400">Bugün yayınlanmış vefat kaydı bulunamadı.</p>
              </div>
            ) : (
              taziyeList.map((notice) => (
                <div
                  key={notice.id}
                  className={`rounded-3xl p-5 shadow-md border space-y-3 transition-all hover:border-emerald-500/40 ${
                    isDark ? 'bg-[#1b1c21] border-slate-800 text-white' : 'bg-white border-slate-200 text-slate-800'
                  }`}
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <span className={`text-[10px] font-black px-2.5 py-0.5 rounded-full uppercase tracking-wider ${
                        isDark ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-emerald-100 text-emerald-800'
                      }`}>
                        {notice.date}
                      </span>
                      <h3 className={`text-base font-black mt-1.5 ${isDark ? 'text-white' : 'text-slate-900'}`}>
                        {notice.fullName} {typeof notice.age === 'number' ? `(${notice.age} Yaşında)` : ''}
                      </h3>
                    </div>
                    <Heart className="w-5 h-5 text-rose-500 fill-rose-500/20 shrink-0" />
                  </div>

                  <div className={`text-xs space-y-1.5 font-medium p-3 rounded-2xl border ${
                    isDark ? 'bg-[#15161b] border-slate-800/80 text-slate-300' : 'bg-slate-50 border-slate-200/80 text-slate-700'
                  }`}>
                    <p>
                      <strong className={isDark ? 'text-amber-400' : 'text-slate-900'}>Aile / Akrabalar:</strong> {notice.family}
                    </p>
                    <p>
                      <strong className={isDark ? 'text-amber-400' : 'text-slate-900'}>Cenaze / Namaz:</strong> {notice.funeralPlace}
                    </p>
                    <p>
                      <strong className={isDark ? 'text-amber-400' : 'text-slate-900'}>Taziye Adresi:</strong> {notice.condolenceAddress}
                    </p>
                  </div>

                  <div className="pt-1 flex items-center justify-between gap-2">
                    <a
                      href={`tel:${notice.contactPhone}`}
                      className={`text-xs font-bold py-2 px-3.5 rounded-xl flex items-center gap-1.5 shadow-sm active:scale-95 transition-all ${
                        isDark ? 'bg-slate-800 text-slate-100 hover:bg-slate-700 border border-slate-700' : 'bg-slate-900 text-white hover:bg-slate-800'
                      }`}
                    >
                      <PhoneCall className="w-3.5 h-3.5 text-emerald-400" />
                      <span>Taziye Telefonu ({notice.contactPhone})</span>
                    </a>

                    <a
                      href="https://van.bel.tr/Taziyeler.html"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[11px] font-bold text-emerald-500 hover:underline flex items-center gap-1"
                    >
                      <span>van.bel.tr Kaynağı</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

      </div>

      {/* Full News Modal */}
      {selectedNews && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4 animate-fadeIn">
          <div className={`${isDark ? 'bg-[#18191e] text-white border-slate-800' : 'bg-white text-slate-800 border-slate-200'} w-full max-w-lg rounded-t-3xl sm:rounded-3xl max-h-[90vh] flex flex-col border shadow-2xl overflow-hidden animate-slideUp`}>
            
            <div className="relative h-60 shrink-0 bg-slate-950">
              <img
                src={selectedNews.image}
                alt={selectedNews.title}
                referrerPolicy="no-referrer"
                className="w-full h-full object-cover"
              />
              <button
                onClick={() => setSelectedNews(null)}
                className="absolute top-4 right-4 w-9 h-9 rounded-full bg-black/60 text-white flex items-center justify-center hover:bg-black/80 transition-all"
              >
                <X className="w-5 h-5" />
              </button>

              <span className="absolute bottom-3 left-4 bg-slate-950/90 text-amber-400 font-black text-xs px-3 py-1 rounded-xl border border-amber-400/30">
                {selectedNews.source}
              </span>
            </div>

            <div className="p-5 overflow-y-auto space-y-3 flex-1">
              <span className="bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 font-black text-xs px-2.5 py-0.5 rounded-full uppercase">
                {selectedNews.category}
              </span>

              <h2 className={`text-lg font-black leading-snug ${isDark ? 'text-white' : 'text-slate-900'}`}>
                {selectedNews.title}
              </h2>

              <p className={`text-xs font-medium flex items-center justify-between border-b pb-3 ${isDark ? 'text-slate-400 border-slate-800' : 'text-slate-400 border-slate-100'}`}>
                <span>{selectedNews.source}</span>
                <span>{selectedNews.date} - {selectedNews.time}</span>
              </p>

              <div className={`text-xs leading-relaxed font-medium pt-1 space-y-3 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                <p>{selectedNews.content}</p>
                <p>{selectedNews.summary}</p>
              </div>
            </div>

            {/* Footer Direct Redirect Button */}
            <div className={`p-4 border-t flex items-center justify-between ${isDark ? 'bg-[#15161b] border-slate-800' : 'bg-slate-50 border-slate-200'}`}>
              <span className="text-xs font-bold text-slate-400">
                {selectedNews.source} Resmi Sayfası
              </span>

              <button
                onClick={() => handleOpenSourceUrl(selectedNews.sourceUrl, selectedNews.source)}
                className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs py-2.5 px-4 rounded-xl flex items-center gap-1.5 shadow-md active:scale-95 transition-all"
              >
                <ExternalLink className="w-4 h-4 stroke-[2.5]" />
                <span>Haber Kaynağına Git &rarr;</span>
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
};
