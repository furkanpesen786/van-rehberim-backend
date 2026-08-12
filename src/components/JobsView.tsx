import React, { useState, useEffect } from 'react';
import { JOB_CATEGORIES, JOB_DURATION_OPTIONS, JOB_LISTINGS } from '../data/mockData';
import { JobListing } from '../types';
import { useAuth } from '../context/AuthContext';
import { subscribeJobListings, addJobListingToFirestore } from '../lib/firebase';
import {
  Wrench,
  Sparkles,
  Truck,
  GraduationCap,
  Scissors,
  Laptop,
  Car,
  Camera,
  Shirt,
  HeartHandshake,
  Search,
  PlusCircle,
  PhoneCall,
  MapPin,
  Calendar,
  Clock,
  CheckCircle2,
  X,
  Upload,
  Image as ImageIcon,
  ChevronRight,
  UserCheck,
  ShieldCheck,
  Briefcase,
  AlertCircle,
  Trash2,
  Share2,
  ArrowRight,
  ChevronLeft,
  Megaphone,
  Star,
} from 'lucide-react';
import { PurchaseService, PACKAGE_IDS } from '../services/purchaseService';

interface JobsViewProps {
  theme?: 'light' | 'dark';
}

// Icon helper function for 10 categories
const renderCategoryIcon = (categoryName: string, className = "w-4 h-4") => {
  switch (categoryName) {
    case 'Usta & Tamirat':
      return <Wrench className={className} />;
    case 'Ev & Ofis Temizliği':
      return <Sparkles className={className} />;
    case 'Nakliyat & Taşımacılık':
      return <Truck className={className} />;
    case 'Özel Ders & Eğitim':
      return <GraduationCap className={className} />;
    case 'Güzellik & Bakım':
      return <Scissors className={className} />;
    case 'Yazılım & Bilişim':
      return <Laptop className={className} />;
    case 'Oto Tamir & Yol Yardım':
      return <Car className={className} />;
    case 'Organizasyon & Fotoğraf':
      return <Camera className={className} />;
    case 'Terzi, Moda & Dikiş':
      return <Shirt className={className} />;
    case 'Sağlık & Bakım Hizmetleri':
      return <HeartHandshake className={className} />;
    default:
      return <Briefcase className={className} />;
  }
};

const SAMPLE_PRESET_PHOTOS = [
  { label: 'Ustalık & Tamirat', url: 'https://images.unsplash.com/photo-1621905251189-08b45d6a269e?auto=format&fit=crop&w=800&q=80' },
  { label: 'Nakliyat & Araç', url: 'https://images.unsplash.com/photo-1600518464441-9154a4dea21b?auto=format&fit=crop&w=800&q=80' },
  { label: 'Eğitim & Ders', url: 'https://images.unsplash.com/photo-1434030216411-0b793f4b4173?auto=format&fit=crop&w=800&q=80' },
  { label: 'Temizlik & Bakım', url: 'https://images.unsplash.com/photo-1581578731548-c64695cc6952?auto=format&fit=crop&w=800&q=80' },
  { label: 'Fotoğraf & Çekim', url: 'https://images.unsplash.com/photo-1537633552985-df8429e8048b?auto=format&fit=crop&w=800&q=80' },
  { label: 'Oto & Sanayi', url: 'https://images.unsplash.com/photo-1619642751034-765dfdf7c58e?auto=format&fit=crop&w=800&q=80' },
];

export const JobsView: React.FC<JobsViewProps> = ({ theme = 'light' }) => {
  const isDark = theme === 'dark';
  const { currentUser, setShowAuthModal } = useAuth();

  // State
  const [jobsList, setJobsList] = useState<JobListing[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Subscribe to Firebase Firestore live jobListings
  useEffect(() => {
    const unsub = subscribeJobListings((firestoreJobs) => {
      if (firestoreJobs) {
        setJobsList(firestoreJobs as JobListing[]);
      }
      setIsLoading(false);
    });
    return () => unsub();
  }, []);

  const [selectedCategory, setSelectedCategory] = useState<string>('Tümü');
  const [selectedDistrict, setSelectedDistrict] = useState<string>('Tümü');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedJob, setSelectedJob] = useState<JobListing | null>(null);
  const [isPostModalOpen, setIsPostModalOpen] = useState(false);
  const [successToast, setSuccessToast] = useState<string | null>(null);
  const [showPlayModal, setShowPlayModal] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  // Form State
  const [formData, setFormData] = useState({
    title: '',
    providerName: '',
    category: JOB_CATEGORIES[0].name,
    district: 'İpekyolu / Van',
    address: '',
    phone: '',
    description: '',
    photo: '',
    durationDays: 7 as 1 | 3 | 7 | 15 | 30,
    experienceYears: '1+ Yıl Deneyim',
  });

  const [customPhotoInput, setCustomPhotoInput] = useState('');

  // Filtered Jobs
  const filteredJobs = jobsList.filter((job) => {
    const matchesCategory = selectedCategory === 'Tümü' || job.category === selectedCategory;
    const matchesDistrict = selectedDistrict === 'Tümü' || job.district.toLowerCase().includes(selectedDistrict.toLowerCase());
    const query = searchQuery.toLowerCase();
    const matchesSearch =
      job.title.toLowerCase().includes(query) ||
      job.providerName.toLowerCase().includes(query) ||
      job.description.toLowerCase().includes(query) ||
      job.category.toLowerCase().includes(query);

    return matchesCategory && matchesDistrict && matchesSearch;
  });

  // Calculate selected duration price
  const selectedDurationObj = JOB_DURATION_OPTIONS.find((opt) => opt.days === formData.durationDays) || JOB_DURATION_OPTIONS[2];

  const [formError, setFormError] = useState<string | null>(null);

  // Submit Job Listing
  const handlePostSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!formData.title.trim() || !formData.providerName.trim() || !formData.phone.trim() || !formData.description.trim()) {
      setFormError('Lütfen zorunlu alanları (Başlık, İsim, Telefon, Açıklama) eksiksiz doldurunuz.');
      return;
    }

    setShowPlayModal(true);
  };

  const handleFinalPurchase = async () => {
    setIsProcessing(true);

    try {
      const purchased = await PurchaseService.purchasePackage({
        product: {
          identifier: formData.durationDays >= 15 ? PACKAGE_IDS.ONE_CIKAN_30_GUN : PACKAGE_IDS.ILAN_30_GUN
        }
      });
      if (!purchased) {
        setIsProcessing(false);
        return;
      }
    } catch (e: any) {
      alert(e.message);
      setIsProcessing(false);
      return;
    }

    const jobPayload = {
      title: formData.title.trim(),
      providerName: formData.providerName.trim(),
      category: formData.category,
      district: formData.district,
      address: formData.address.trim(),
      phone: formData.phone.trim(),
      description: formData.description.trim(),
      photo: formData.photo || customPhotoInput || undefined,
      durationDays: formData.durationDays,
      pricePaid: selectedDurationObj.price,
      createdAt: new Date().toLocaleDateString('tr-TR', { day: '2-digit', month: '2-digit', year: 'numeric' }),
      isFeatured: formData.durationDays >= 15,
      experienceYears: formData.experienceYears,
      userEmail: currentUser?.email || 'anonim@van.rehberim',
      userId: currentUser?.uid || '',
    };

    try {
      await addJobListingToFirestore(jobPayload);

      const newJob: JobListing = {
        id: `job-user-${Date.now()}`,
        ...jobPayload,
      };
      setJobsList((prev) => [newJob, ...prev]);

      setIsProcessing(false);
      setShowPlayModal(false);
      setIsPostModalOpen(false);

      setFormData({
        title: '',
        providerName: '',
        category: JOB_CATEGORIES[0].name,
        district: 'İpekyolu / Van',
        address: '',
        phone: '',
        description: '',
        photo: '',
        durationDays: 7,
        experienceYears: '1+ Yıl Deneyim',
      });
      setCustomPhotoInput('');

      setSuccessToast(`Tebrikler! İlanınız Firebase bulut veri tabanına kaydedildi ve ${newJob.durationDays} gün yayınlandı.`);
      setTimeout(() => setSuccessToast(null), 4000);
    } catch (err: any) {
      setIsProcessing(false);
      alert('Firebase veritabanına kaydedilirken bir hata oluştu: ' + (err.message || err));
    }
  };

  // UI Theme Classes
  const cardBg = isDark ? 'bg-[#1b1c21] border-slate-800' : 'bg-white border-slate-200/80';
  const textPrimary = isDark ? 'text-white' : 'text-slate-900';
  const textSecondary = isDark ? 'text-slate-400' : 'text-slate-600';
  const inputBg = isDark ? 'bg-[#22242b] border-slate-700 text-white placeholder-slate-500' : 'bg-slate-50 border-slate-200 text-slate-900 placeholder-slate-400';

  return (
    <div className={`min-h-screen pb-28 pt-4 px-3 sm:px-6 max-w-4xl mx-auto space-y-5 transition-colors duration-200`}>

      {/* Toast Notification */}
      {successToast && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 bg-emerald-600 text-white font-bold text-xs sm:text-sm py-3 px-5 rounded-full shadow-2xl flex items-center gap-2 animate-bounce">
          <CheckCircle2 className="w-5 h-5 text-emerald-200 shrink-0" />
          <span>{successToast}</span>
        </div>
      )}

      {/* HEADER BANNER */}
      <div className={`rounded-3xl p-5 sm:p-6 shadow-xl relative overflow-hidden ${isDark
        ? 'bg-gradient-to-r from-indigo-950 via-slate-900 to-indigo-900 border border-indigo-900/60'
        : 'bg-gradient-to-r from-indigo-600 via-sky-600 to-blue-700 text-white'
        }`}>
        {/* Background decorative elements */}
        <div className="absolute -right-6 -bottom-6 w-32 h-32 bg-white/10 rounded-full blur-2xl pointer-events-none" />

        <div className="relative z-10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="space-y-1 max-w-lg">
            <div className="inline-flex items-center gap-1.5 bg-white/15 backdrop-blur-md px-3 py-1 rounded-full text-[11px] font-extrabold uppercase tracking-wider text-sky-200">
              <Briefcase className="w-3.5 h-3.5" />
              <span>Van Usta & İlan Rehberi</span>
            </div>
            <h1 className="text-xl sm:text-2xl font-black text-white leading-tight">
              VAN İŞ İLANLARI & HİZMET VERENLER
            </h1>
            <p className="text-xs sm:text-sm text-sky-100/90 font-medium leading-relaxed">
              Van'da hizmet veren tüm ustalar, uzmanlar ve esnaflar burada! Kendi meslek ve hizmet ilanınızı dakikalar içinde yayınlayın.
            </p>
          </div>

          <button
            type="button"
            onClick={() => setIsPostModalOpen(true)}
            className="w-full sm:w-auto shrink-0 bg-amber-400 hover:bg-amber-300 text-slate-950 font-black text-xs sm:text-sm py-3 px-5 rounded-2xl shadow-lg transition-all active:scale-95 flex items-center justify-center gap-2 border border-amber-300"
          >
            <PlusCircle className="w-5 h-5 stroke-[2.5]" />
            <span>İş / Hizmet İlanı Ver</span>
          </button>
        </div>
      </div>

      {/* SEARCH & DISTRICT FILTER BAR */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {/* Search Input */}
        <div className="sm:col-span-2 relative">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Meslek, usta adı veya hizmet ara (Ör: Elektrikçi, Temizlik)..."
            className={`w-full pl-10 pr-4 py-3 rounded-2xl text-xs sm:text-sm border transition-all focus:outline-none focus:ring-2 focus:ring-indigo-500 ${inputBg}`}
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs font-bold"
            >
              ✕
            </button>
          )}
        </div>

        {/* District Selector */}
        <select
          value={selectedDistrict}
          onChange={(e) => setSelectedDistrict(e.target.value)}
          className={`w-full py-3 px-3 rounded-2xl text-xs sm:text-sm font-bold border focus:outline-none focus:ring-2 focus:ring-indigo-500 ${inputBg}`}
        >
          <option value="Tümü">📍 Tüm Van İlçeleri</option>
          <option value="İpekyolu">📍 İpekyolu</option>
          <option value="Edremit">📍 Edremit</option>
          <option value="Tuşba">📍 Tuşba</option>
          <option value="Erciş">📍 Erciş</option>
          <option value="Gevaş">📍 Gevaş</option>
          <option value="Muradiye">📍 Muradiye</option>
          <option value="Özalp">📍 Özalp</option>
        </select>
      </div>

      {/* 10 JOB CATEGORIES HORIZONTAL SCROLL BAR */}
      <div className="space-y-2">
        <div className="flex items-center justify-between px-1">
          <h2 className={`text-xs sm:text-sm font-extrabold ${textPrimary} uppercase tracking-wider flex items-center gap-1.5`}>
            <span>Hizmet Kategorileri</span>
            <span className="text-[10px] bg-indigo-500/10 text-indigo-500 px-2 py-0.5 rounded-full font-black">10 Kategori</span>
          </h2>
          {selectedCategory !== 'Tümü' && (
            <button
              onClick={() => setSelectedCategory('Tümü')}
              className="text-[11px] font-bold text-indigo-500 hover:underline"
            >
              Filtreyi Temizle
            </button>
          )}
        </div>

        <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none no-scrollbar">
          {/* Tümü Button */}
          <button
            onClick={() => setSelectedCategory('Tümü')}
            className={`shrink-0 py-2.5 px-4 rounded-2xl text-xs font-bold transition-all flex items-center gap-2 ${selectedCategory === 'Tümü'
              ? 'bg-indigo-600 text-white shadow-md scale-105'
              : isDark
                ? 'bg-[#1b1c21] text-slate-300 border border-slate-800 hover:border-slate-700'
                : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-50'
              }`}
          >
            <Briefcase className="w-4 h-4" />
            <span>Tüm İlanlar ({jobsList.length})</span>
          </button>

          {/* 10 Categories */}
          {JOB_CATEGORIES.map((cat) => {
            const isSelected = selectedCategory === cat.name;
            const count = jobsList.filter((j) => j.category === cat.name).length;

            return (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.name)}
                className={`shrink-0 py-2.5 px-3.5 rounded-2xl text-xs font-bold transition-all flex items-center gap-2 border ${isSelected
                  ? 'bg-indigo-600 text-white border-indigo-600 shadow-md scale-105'
                  : isDark
                    ? 'bg-[#1b1c21] text-slate-300 border-slate-800 hover:border-slate-700'
                    : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                  }`}
              >
                <span className={`p-1 rounded-lg ${isSelected ? 'bg-white/20 text-white' : `${cat.color} text-white`}`}>
                  {renderCategoryIcon(cat.name, "w-3.5 h-3.5")}
                </span>
                <span>{cat.name}</span>
                <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-black ${isSelected ? 'bg-white/30 text-white' : isDark ? 'bg-slate-800 text-slate-400' : 'bg-slate-100 text-slate-600'
                  }`}>
                  {count}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* JOB LISTINGS GRID */}
      <div className="space-y-3">
        <div className="flex items-center justify-between px-1">
          <p className={`text-xs font-bold ${textSecondary}`}>
            {filteredJobs.length} ilan gösteriliyor
          </p>
          <span className="text-[10px] font-semibold text-slate-400">
            En Yeni İlanlar Üstte
          </span>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className={`${cardBg} rounded-3xl p-4 border shadow-sm flex flex-col justify-between gap-3 animate-pulse`}>
                <div className="flex items-start gap-3">
                  <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl bg-slate-200 dark:bg-slate-700/50"></div>
                  <div className="flex-1 space-y-2 py-1">
                    <div className="h-3 bg-slate-200 dark:bg-slate-700/50 rounded-full w-1/4"></div>
                    <div className="h-4 bg-slate-200 dark:bg-slate-700/50 rounded-full w-3/4"></div>
                    <div className="h-3 bg-slate-200 dark:bg-slate-700/50 rounded-full w-1/2 mt-2"></div>
                  </div>
                </div>
                <div className="h-10 bg-slate-200 dark:bg-slate-700/50 rounded-2xl mt-2"></div>
              </div>
            ))}
          </div>
        ) : filteredJobs.length === 0 ? (
          <div className={`${cardBg} rounded-3xl p-8 text-center space-y-3 border`}>
            <div className="w-16 h-16 rounded-3xl bg-indigo-500/10 text-indigo-500 mx-auto flex items-center justify-center">
              <Briefcase className="w-8 h-8" />
            </div>
            <h3 className={`text-base font-extrabold ${textPrimary}`}>İlan Bulunamadı</h3>
            <p className={`text-xs ${textSecondary} max-w-xs mx-auto`}>
              Arama kriterlerinize uygun ilan bulunamadı. İlk ilanı siz yayınlamak ister misiniz?
            </p>
            <button
              onClick={() => setIsPostModalOpen(true)}
              className="mt-2 inline-flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs py-2.5 px-4 rounded-full shadow-md transition-all active:scale-95"
            >
              <PlusCircle className="w-4 h-4" />
              <span>İlan Ver</span>
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredJobs.map((job) => (
              <div
                key={job.id}
                className={`${cardBg} rounded-3xl p-4 border shadow-sm hover:shadow-md transition-all flex flex-col justify-between gap-3 group relative overflow-hidden`}
              >
                {job.isFeatured && (
                  <div className="absolute top-0 right-0 bg-gradient-to-l from-amber-500 to-orange-500 text-white text-[9px] font-black px-3 py-1 rounded-bl-xl uppercase tracking-wider shadow-xs flex items-center gap-1">
                    <Sparkles className="w-3 h-3 fill-white" />
                    <span>ÖNE ÇIKAN İLAN</span>
                  </div>
                )}

                <div className="space-y-3">
                  {/* Top row: Photo (if available) + Details */}
                  <div className="flex items-start gap-3">
                    {job.photo ? (
                      <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl overflow-hidden shrink-0 bg-slate-200 relative border border-slate-200 dark:border-slate-800">
                        <img
                          src={job.photo}
                          alt={job.title}
                          onError={(e) => {
                            const target = e.target as HTMLImageElement;
                            target.onerror = null; // prevents looping
                            target.style.display = 'none';
                            if (target.parentElement) {
                              target.parentElement.innerHTML = `<div class="w-full h-full flex items-center justify-center bg-indigo-50 text-indigo-500"><svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/><polyline points="14 2 14 8 20 8"/></svg></div>`;
                            }
                          }}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                      </div>
                    ) : (
                      <div className={`w-20 h-20 sm:w-24 sm:h-24 rounded-2xl shrink-0 flex flex-col items-center justify-center gap-1 p-2 ${isDark ? 'bg-indigo-950/40 border border-indigo-900/50 text-indigo-400' : 'bg-indigo-50 border border-indigo-100 text-indigo-600'
                        }`}>
                        {renderCategoryIcon(job.category, "w-7 h-7")}
                        <span className="text-[9px] font-bold text-center leading-tight line-clamp-1">{job.category}</span>
                      </div>
                    )}

                    <div className="flex-1 min-w-0 pr-8">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 text-[10px] font-black px-2 py-0.5 rounded-full uppercase">
                          {job.category}
                        </span>
                        {job.experienceYears && (
                          <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full ${isDark ? 'bg-slate-800 text-slate-300' : 'bg-slate-100 text-slate-700'}`}>
                            {job.experienceYears}
                          </span>
                        )}
                      </div>

                      <h3 className={`text-sm sm:text-base font-black mt-1 leading-snug line-clamp-2 ${textPrimary}`}>
                        {job.title}
                      </h3>

                      <div className="flex items-center gap-1.5 text-xs font-bold text-slate-700 dark:text-slate-300 mt-1">
                        <UserCheck className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
                        <span className="truncate">{job.providerName}</span>
                      </div>

                      <div className={`flex items-center gap-1 text-[11px] ${textSecondary} mt-0.5 truncate`}>
                        <MapPin className="w-3.5 h-3.5 text-rose-500 shrink-0" />
                        <span className="truncate">{job.district}</span>
                      </div>
                    </div>
                  </div>

                  {/* Description preview */}
                  <p className={`text-xs line-clamp-2 leading-relaxed p-2.5 rounded-2xl border transition-colors ${isDark
                    ? 'bg-[#22242b] border-slate-700/80 text-slate-200'
                    : 'bg-indigo-50/50 border-indigo-100 text-slate-800 font-medium'
                    }`}>
                    {job.description}
                  </p>
                </div>

                {/* Bottom Bar: Call Button & Detail trigger */}
                <div className={`pt-2 border-t flex items-center justify-between gap-2 ${isDark ? 'border-slate-800' : 'border-slate-100'}`}>
                  <div className="text-[10px] font-medium text-slate-400 flex items-center gap-1">
                    <Clock className="w-3 h-3 text-slate-400" />
                    <span>{job.durationDays} Günlük İlan • {job.createdAt}</span>
                  </div>

                  <div className="flex items-center gap-2">
                    <a
                      href={`tel:${job.phone.replace(/\s+/g, '')}`}
                      className="py-1.5 px-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[11px] rounded-xl shadow-xs transition-all active:scale-95 flex items-center gap-1.5"
                    >
                      <PhoneCall className="w-3.5 h-3.5" />
                      <span>Ara</span>
                    </a>

                    <button
                      type="button"
                      onClick={() => setSelectedJob(job)}
                      className={`py-1.5 px-3 font-bold text-[11px] rounded-xl border transition-all active:scale-95 flex items-center gap-1 ${isDark ? 'bg-slate-800 hover:bg-slate-700 text-white border-slate-700' : 'bg-slate-100 hover:bg-slate-200 text-slate-800 border-slate-200'
                        }`}
                    >
                      <span>Detay</span>
                      <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ========================================================= */}
      {/* MODAL 1: İŞ / HİZMET İLANI YAYINLA (POST JOB MODAL) */}
      {/* ========================================================= */}
      {isPostModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4 animate-fadeIn">
          <div className={`${isDark ? 'bg-[#18191e] text-white border-slate-800' : 'bg-white text-slate-900'} w-full max-w-xl rounded-t-3xl sm:rounded-3xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden animate-slideUp border`}>

            {/* Modal Header */}
            <div className="bg-gradient-to-r from-indigo-600 via-sky-600 to-blue-700 text-white p-4 flex items-center justify-between shadow-md shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center shrink-0">
                  <Briefcase className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h3 className="font-black text-base uppercase leading-tight tracking-wide">İŞ / HİZMET İLANI YAYINLA</h3>
                  <p className="text-[10px] text-sky-100 font-medium">Van genelinde binlerce kişiye ulaşın</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsPostModalOpen(false)}
                className="w-8 h-8 rounded-full bg-white/20 text-white flex items-center justify-center hover:bg-white/30 transition-colors"
              >
                ✕
              </button>
            </div>

            {/* Modal Form Scroll Content */}
            <form onSubmit={handlePostSubmit} className="p-4 sm:p-5 overflow-y-auto space-y-4 flex-1 text-xs sm:text-sm">

              {formError && (
                <div className="bg-rose-50 border border-rose-200 text-rose-700 px-4 py-3 rounded-2xl text-xs font-semibold flex items-center gap-2">
                  <span className="text-xl leading-none">!</span>
                  <span>{formError}</span>
                </div>
              )}

              {/* 1. MESLEK / İLAN BAŞLIĞI */}
              <div className="space-y-1.5">
                <label className="font-extrabold uppercase tracking-wide text-xs flex items-center justify-between">
                  <span>Meslek / İlan Başlığı <span className="text-rose-500">*</span></span>
                  <span className="text-[10px] text-slate-400 font-normal">Max 50 kr.</span>
                </label>
                <input
                  type="text"
                  required
                  maxLength={50}
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="Yaptığınız iş veya mesleğinizi yazınız..."
                  className={`w-full p-3 rounded-2xl border text-xs sm:text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500 ${inputBg}`}
                />
              </div>

              {/* 2. AD SOYAD / FİRMA ADI & KATEGORİ SEÇİMİ (Grid) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="font-extrabold uppercase tracking-wide text-xs">
                    Ad Soyad / Firma / Usta Adı <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    maxLength={50}
                    value={formData.providerName}
                    onChange={(e) => setFormData({ ...formData, providerName: e.target.value })}
                    placeholder="Örn: Mehmet Usta veya Güven Temizlik"
                    className={`w-full p-3 rounded-2xl border text-xs sm:text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500 ${inputBg}`}
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="font-extrabold uppercase tracking-wide text-xs">
                    İş Kategorisi (10 Kategori) <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    className={`w-full p-3 rounded-2xl border text-xs sm:text-sm font-bold focus:outline-none focus:ring-2 focus:ring-indigo-500 ${inputBg}`}
                  >
                    {JOB_CATEGORIES.map((cat) => (
                      <option key={cat.id} value={cat.name}>
                        {cat.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* 3. KONUM / İLÇE & TELEFON NUMARASI */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="font-extrabold uppercase tracking-wide text-xs">
                    Konum / İlçe <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={formData.district}
                    onChange={(e) => setFormData({ ...formData, district: e.target.value })}
                    className={`w-full p-3 rounded-2xl border text-xs sm:text-sm font-bold focus:outline-none focus:ring-2 focus:ring-indigo-500 ${inputBg}`}
                  >
                    <option value="İpekyolu / Van">📍 İpekyolu / Van</option>
                    <option value="Edremit / Van">📍 Edremit / Van</option>
                    <option value="Tuşba / Van">📍 Tuşba / Van</option>
                    <option value="Erciş / Van">📍 Erciş / Van</option>
                    <option value="Gevaş / Van">📍 Gevaş / Van</option>
                    <option value="Muradiye / Van">📍 Muradiye / Van</option>
                    <option value="Tüm Van Geneli">📍 Tüm Van Geneli</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="font-extrabold uppercase tracking-wide text-xs">
                    Telefon Numarası <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="tel"
                    required
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    placeholder="05xx xxx xx xx"
                    className={`w-full p-3 rounded-2xl border text-xs sm:text-sm font-mono font-bold focus:outline-none focus:ring-2 focus:ring-indigo-500 ${inputBg}`}
                  />
                </div>
              </div>

              {/* 4. AÇIKLAMA */}
              <div className="space-y-1.5">
                <label className={`font-extrabold uppercase tracking-wide text-xs flex items-center justify-between ${isDark ? 'text-slate-200' : 'text-slate-800'}`}>
                  <span className="flex items-center gap-1.5">
                    <Briefcase className="w-3.5 h-3.5 text-indigo-500" />
                    <span>Hizmet & İş Açıklaması</span>
                    <span className="text-rose-500">*</span>
                  </span>
                  <span className={`text-[10px] font-normal ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Verdiğiniz hizmet detayları</span>
                </label>
                <textarea
                  required
                  rows={3}
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Yaptığınız işi, tecrübenizi, çalışma saatlerinizi ve hizmet verdiğiniz bölgeleri yazınız..."
                  className={`w-full p-3 rounded-2xl border text-xs sm:text-sm font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-colors ${inputBg}`}
                />
              </div>

              {/* 5. FOTOĞRAF EKLEME (İSTEĞE BAĞLI - MAKS 1 TANE) */}
              <div className={`p-3.5 rounded-3xl border ${isDark ? 'bg-[#22242b] border-slate-700' : 'bg-indigo-50/50 border-indigo-100'} space-y-2.5`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <ImageIcon className="w-4 h-4 text-indigo-500" />
                    <span className="font-extrabold text-xs uppercase tracking-wide">Fotoğraf Ekle (İsteğe Bağlı - 1 Adet)</span>
                  </div>
                  <span className="text-[10px] font-bold text-slate-400">Max 1 Fotoğraf</span>
                </div>

                {formData.photo || customPhotoInput ? (
                  <div className="relative rounded-2xl overflow-hidden h-32 w-full bg-slate-900 border border-indigo-200 dark:border-indigo-900">
                    <img
                      src={formData.photo || customPhotoInput}
                      alt="İlan Görseli"
                      className="w-full h-full object-cover"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        setFormData({ ...formData, photo: '' });
                        setCustomPhotoInput('');
                      }}
                      className="absolute top-2 right-2 bg-rose-600 text-white p-1.5 rounded-full shadow-md text-xs hover:bg-rose-700"
                      title="Fotoğrafı Kaldır"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <input
                        type="url"
                        value={customPhotoInput}
                        onChange={(e) => setCustomPhotoInput(e.target.value)}
                        placeholder="Fotoğraf URL yapıştırın (ör. https://...)"
                        className={`flex-1 p-2.5 rounded-xl border text-xs font-semibold focus:outline-none ${inputBg}`}
                      />
                      {customPhotoInput && (
                        <button
                          type="button"
                          onClick={() => setFormData({ ...formData, photo: customPhotoInput })}
                          className="px-3 py-2.5 bg-indigo-600 text-white font-bold text-xs rounded-xl"
                        >
                          Ekle
                        </button>
                      )}
                    </div>

                    <p className="text-[10px] text-slate-400 font-semibold">veya hazır örnek görsellerden seçin:</p>
                    <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                      {SAMPLE_PRESET_PHOTOS.map((preset, idx) => (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => setFormData({ ...formData, photo: preset.url })}
                          className="h-14 rounded-xl overflow-hidden border border-slate-300 dark:border-slate-700 hover:border-indigo-500 relative group transition-transform active:scale-95"
                        >
                          <img src={preset.url} alt={preset.label} className="w-full h-full object-cover" />
                          <span className="absolute inset-0 bg-black/40 text-white text-[9px] font-bold flex items-center justify-center text-center p-0.5 opacity-90">
                            {preset.label}
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* 6. İLAN SÜRESİ VE ÜCRET SEÇİMİ (1, 3, 7, 15, 30 Gün) */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="font-extrabold uppercase tracking-wide text-xs flex items-center gap-1.5">
                    <Calendar className="w-4 h-4 text-amber-500" />
                    <span>İlan Yayın Süresi ve Ücreti</span>
                  </label>
                  <span className="text-[10px] font-extrabold text-amber-500 bg-amber-500/10 px-2 py-0.5 rounded-full">
                    Süreye Göre Fiyatlandırılır
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                  {JOB_DURATION_OPTIONS.map((option) => {
                    const isSelected = formData.durationDays === option.days;

                    return (
                      <button
                        key={option.days}
                        type="button"
                        onClick={() => setFormData({ ...formData, durationDays: option.days as 1 | 3 | 7 | 15 | 30 })}
                        className={`p-2.5 rounded-2xl border flex flex-col items-center justify-center gap-1 text-center transition-all ${isSelected
                          ? 'bg-gradient-to-br from-indigo-600 to-blue-600 text-white border-indigo-600 shadow-md scale-105'
                          : isDark
                            ? 'bg-[#22242b] text-slate-300 border-slate-700 hover:border-slate-600'
                            : 'bg-slate-50 text-slate-800 border-slate-200 hover:bg-slate-100'
                          }`}
                      >
                        <span className={`text-[9px] font-black px-1.5 py-0.2 rounded-full uppercase ${isSelected ? 'bg-white/20 text-white' : 'bg-amber-500/10 text-amber-600 dark:text-amber-400'
                          }`}>
                          {option.badge}
                        </span>
                        <div className="font-extrabold text-xs">{option.days} Gün</div>
                        <div className="font-black text-sm font-mono text-amber-400">₺{option.price}</div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* 7. ÖDEME VE ÖZET BANNER */}
              <div className="bg-slate-900 text-white p-3.5 rounded-2xl flex items-center justify-between border border-slate-700 shadow-inner">
                <div>
                  <div className="text-[10px] text-slate-400 font-bold uppercase">SEÇİLEN PAKET ÖZETİ</div>
                  <div className="text-xs font-extrabold text-sky-300">
                    {selectedDurationObj.label} ({selectedDurationObj.days} Gün Aktif Kalacak)
                  </div>
                </div>

                <div className="text-right">
                  <div className="text-xs text-slate-400">Toplam Ücret</div>
                  <div className="text-lg font-black font-mono text-amber-400">₺{selectedDurationObj.price}</div>
                </div>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                className="w-full py-3.5 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-sm rounded-2xl shadow-lg transition-all active:scale-95 flex items-center justify-center gap-2 uppercase tracking-wide"
              >
                <CheckCircle2 className="w-5 h-5" />
                <span>₺{selectedDurationObj.price} Öde ve İlanı Yayınla</span>
              </button>
            </form>

          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL 2: İŞ İLANI DETAY MODALI */}
      {/* ========================================================= */}
      {selectedJob && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 animate-fadeIn">
          <div className={`${isDark ? 'bg-[#1b1c21] text-white border-slate-800' : 'bg-white text-slate-900'} w-full max-w-lg rounded-3xl border shadow-2xl overflow-hidden flex flex-col max-h-[90vh] animate-scaleUp`}>

            {/* Header / Photo */}
            <div className="relative h-48 w-full bg-slate-900 shrink-0">
              {selectedJob.photo ? (
                <img src={selectedJob.photo} alt={selectedJob.title} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full bg-gradient-to-br from-indigo-900 to-slate-900 flex flex-col items-center justify-center text-indigo-300 gap-2">
                  {renderCategoryIcon(selectedJob.category, "w-12 h-12")}
                  <span className="font-extrabold text-sm uppercase">{selectedJob.category}</span>
                </div>
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/30 to-transparent" />

              <button
                type="button"
                onClick={() => setSelectedJob(null)}
                className="absolute top-3 right-3 w-8 h-8 rounded-full bg-black/60 text-white flex items-center justify-center hover:bg-black/80 transition-colors z-10"
              >
                ✕
              </button>

              <div className="absolute bottom-3 left-3 right-3 text-white">
                <span className="bg-indigo-600 text-white text-[10px] font-black px-2.5 py-0.5 rounded-full uppercase tracking-wider">
                  {selectedJob.category}
                </span>
                <h3 className="text-lg sm:text-xl font-black mt-1 leading-tight text-white drop-shadow-md">
                  {selectedJob.title}
                </h3>
              </div>
            </div>

            {/* Content Scrollable */}
            <div className="p-4 sm:p-5 overflow-y-auto space-y-4 text-xs sm:text-sm">

              {/* Provider Info Card */}
              <div className={`p-3.5 rounded-2xl border ${isDark ? 'bg-[#22242b] border-slate-700' : 'bg-slate-50 border-slate-200'} flex items-center justify-between`}>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-indigo-600 text-white flex items-center justify-center font-black text-base shrink-0">
                    {selectedJob.providerName.charAt(0)}
                  </div>
                  <div>
                    <div className="font-black text-sm text-slate-900 dark:text-white">{selectedJob.providerName}</div>
                    <div className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">
                      {selectedJob.experienceYears || 'Van Yetkili Hizmet Veren'}
                    </div>
                  </div>
                </div>

                <span className="text-[10px] font-extrabold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 px-2.5 py-1 rounded-full flex items-center gap-1">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  <span>Onaylı Usta</span>
                </span>
              </div>

              {/* Description */}
              <div className="space-y-1.5">
                <h4 className={`font-extrabold text-xs uppercase tracking-wide flex items-center gap-1.5 ${isDark ? 'text-indigo-300' : 'text-indigo-900'}`}>
                  <Briefcase className="w-3.5 h-3.5 text-indigo-500" />
                  <span>Hizmet Detayı & Açıklama</span>
                </h4>
                <p className={`leading-relaxed whitespace-pre-line text-xs sm:text-sm p-3.5 rounded-2xl border transition-colors ${isDark
                  ? 'bg-[#22242b] border-slate-700/80 text-slate-200'
                  : 'bg-indigo-50/50 border-indigo-100 text-slate-800'
                  }`}>
                  {selectedJob.description}
                </p>
              </div>

              {/* Location & Details */}
              <div className={`p-3.5 rounded-2xl border ${isDark ? 'bg-[#22242b] border-slate-700' : 'bg-slate-50 border-slate-200'} space-y-2 text-xs`}>
                <div className="flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-rose-500 shrink-0" />
                  <span className="font-bold">{selectedJob.district}</span>
                  {selectedJob.address && <span className="text-slate-400">• {selectedJob.address}</span>}
                </div>
                <div className="flex items-center gap-2 text-slate-400 text-[11px]">
                  <Clock className="w-4 h-4 text-slate-400 shrink-0" />
                  <span>İlan Yayın Tarihi: {selectedJob.createdAt} ({selectedJob.durationDays} Gün Aktif)</span>
                </div>
              </div>

              {/* Bottom Action Buttons */}
              <div className="pt-2 flex items-center gap-2">
                <a
                  href={`tel:${selectedJob.phone.replace(/\s+/g, '')}`}
                  className="flex-1 py-3.5 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs sm:text-sm rounded-2xl text-center shadow-md transition-all active:scale-95 flex items-center justify-center gap-2 uppercase tracking-wide"
                >
                  <PhoneCall className="w-4 h-4" />
                  <span>Hemen Usta / Firmayı Ara</span>
                </a>

                <button
                  type="button"
                  onClick={() => {
                    if (navigator.share) {
                      navigator.share({ title: selectedJob.title, text: `${selectedJob.title} - ${selectedJob.providerName}`, url: window.location.href });
                    } else {
                      alert('İlan bağlantısı kopyalandı!');
                    }
                  }}
                  className={`p-3.5 rounded-2xl border font-bold text-xs flex items-center justify-center ${isDark ? 'bg-slate-800 border-slate-700 text-white' : 'bg-slate-100 border-slate-200 text-slate-800'
                    }`}
                  title="Paylaş"
                >
                  <Share2 className="w-4 h-4" />
                </button>
              </div>

            </div>

          </div>
        </div>
      )}

      {/* In-App Purchase Modal (Brown Corporate & Gold Theme) */}
      {showPlayModal && (
        <div className="fixed inset-0 z-[60] bg-[#1A0F0D]/80 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4 animate-fadeIn">
          <div className="w-full max-w-md bg-gradient-to-b from-[#3E2723] to-[#2D1B15] border border-[#5D4037] sm:rounded-[2.5rem] rounded-t-[2.5rem] p-7 shadow-2xl space-y-6 animate-slideUp">
            <div className="flex items-center justify-between border-b border-[#5D4037]/50 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#D4AF37] to-[#AA7C11] flex items-center justify-center shadow-lg">
                  <Star className="w-4 h-4 text-white fill-white" />
                </div>
                <span className="text-base font-bold tracking-wider text-[#F5E6D3] uppercase">Güvenli Ödeme</span>
              </div>
              <button
                type="button"
                onClick={() => setShowPlayModal(false)}
                className="w-8 h-8 rounded-full bg-[#4E342E] flex items-center justify-center text-[#D4AF37] hover:bg-[#5D4037] transition-colors"
                title="İptal"
              >
                ✕
              </button>
            </div>
            <div className="flex items-start justify-between bg-[#402A23] p-4 rounded-3xl border border-[#5D4037] shadow-inner">
              <div className="flex gap-4">
                <div className="w-14 h-14 bg-gradient-to-tr from-[#D4AF37] to-[#F3E5AB] rounded-2xl flex items-center justify-center shrink-0">
                  <Megaphone className="w-7 h-7 text-[#3E2723]" />
                </div>
                <div>
                  <h3 className="text-sm font-black leading-snug text-[#F5E6D3]">
                    İş / Hizmet İlanı ({formData.durationDays} Gün)
                    {formData.durationDays >= 15 ? ` \n+ Premium Vitrin` : ''}
                  </h3>
                  <p className="text-[11px] font-bold text-[#D4AF37] mt-1 tracking-wide uppercase">Van Rehberim Premium</p>
                </div>
              </div>
              <div className="text-right">
                <div className="text-xl font-black text-[#D4AF37]">₺{selectedDurationObj.price.toString().replace('.', ',')}</div>
              </div>
            </div>
            <div className="p-4 rounded-3xl flex flex-col gap-2 bg-[#402A23]/50 border border-[#4E342E] text-xs">
              <div className="flex justify-between items-center text-[#EFEBE9]">
                <span className="font-medium text-[#BCAAA4]">Hesap:</span>
                <span className="font-bold">{currentUser?.email || 'Anonim Kullanıcı'}</span>
              </div>
              <div className="flex justify-between items-center text-[#EFEBE9]">
                <span className="font-medium text-[#BCAAA4]">Ödeme Yöntemi:</span>
                <span className="font-bold text-[#D4AF37] flex items-center gap-1">
                  Google Play <ChevronLeft className="w-3 h-3 rotate-180" />
                </span>
              </div>
            </div>
            <p className="text-[10px] text-center leading-relaxed text-[#A1887F]">
              Google Play In-App Purchase aracılığıyla ödeme yapılmaktadır. İlanınız ödeme onayından hemen sonra yayınlanacaktır.
            </p>
            <button
              type="button"
              onClick={handleFinalPurchase}
              disabled={isProcessing}
              className="w-full bg-gradient-to-r from-[#D4AF37] to-[#AA7C11] hover:from-[#E5C158] hover:to-[#C69A27] active:scale-[0.98] text-[#2D1B15] font-black text-sm py-4 rounded-full shadow-[0_8px_20px_rgba(212,175,55,0.2)] transition-all flex items-center justify-center gap-2 tracking-wide uppercase"
            >
              {isProcessing ? (
                <span>İşlem Yapılıyor...</span>
              ) : (
                <>
                  <span>Ödemeyi Tamamla</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </div>
        </div>
      )}

    </div>
  );
};
