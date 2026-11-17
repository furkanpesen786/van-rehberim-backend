import React, { useState } from 'react';
import {
  CloudSun,
  Pill,
  MoonStar,
  Coins,
  MapPin,
  Bus,
  Newspaper,
  Car,
  Briefcase,
  Percent,
  Heart,
  Bell,
  ChevronRight,
  ChevronLeft,
  CheckCircle2,
  Sparkles,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { useBackButtonClose } from '../utils/backButtonStack';
import { completeOnboarding } from '../utils/onboardingStorage';

// M36: ilk açılışta (cihazda onboarding tamamlanmamışsa) gösterilen tam
// ekran tanıtım. Tamamlanınca / atlanınca localStorage'a işaret yazılır
// (onboardingStorage) ve bir daha çıkmaz. M32 deseni: Android geri tuşu
// önce önceki slayta gider, ilk slaytta tanıtımı kapatır.

interface OnboardingViewProps {
  isOpen: boolean;
  onComplete: () => void;
  theme: 'light' | 'dark';
}

interface SlideFeature {
  icon: LucideIcon;
  label: string;
  desc: string;
}

interface Slide {
  icon: LucideIcon;
  iconBg: string;
  title: string;
  desc: string;
  features: SlideFeature[];
  isFinal?: boolean;
}

const SLIDES: Slide[] = [
  {
    icon: Sparkles,
    iconBg: 'from-amber-400 to-amber-600',
    title: "Van Rehberim'e Hoş Geldin",
    desc: "Van'daki günlük yaşam, işletmeler ve fırsatlar — hepsi tek uygulamada, ücretsiz.",
    features: [],
  },
  {
    icon: CloudSun,
    iconBg: 'from-sky-400 to-blue-600',
    title: 'Günlük Yaşam',
    desc: 'Şehirde güne başlarken ihtiyacın olan her şey anlık ve canlı veriyle:',
    features: [
      { icon: CloudSun, label: 'Hava Durumu', desc: 'Anlık hava ve 5 günlük tahmin' },
      { icon: Pill, label: 'Nöbetçi Eczane', desc: 'Günlük nöbetçi eczane listesi' },
      { icon: MoonStar, label: 'Namaz Vakitleri', desc: 'Diyanet vakitleri ve ezan bildirimi' },
      { icon: Coins, label: 'Döviz & Altın', desc: 'Güncel kur fiyatları' },
    ],
  },
  {
    icon: MapPin,
    iconBg: 'from-emerald-400 to-teal-600',
    title: 'Şehir Rehberi',
    desc: 'Van’ı keşfet ve şehirde yolunu hiç kaybetme:',
    features: [
      { icon: MapPin, label: 'Gezilecek Yerler', desc: 'Van’ın tarihi ve doğal güzellikleri' },
      { icon: Bus, label: 'Otobüs Saatleri', desc: 'Tüm hatların güzergâh ve saatleri' },
      { icon: Newspaper, label: 'Yerel Haberler', desc: 'Van kaynaklarından güncel haberler' },
      { icon: Car, label: 'Taksi Durakları', desc: 'Taksi durakları ve iletişim bilgileri' },
    ],
  },
  {
    icon: Briefcase,
    iconBg: 'from-violet-400 to-purple-600',
    title: 'İlanlar ve Favoriler',
    desc: 'Fırsatları yakala, beğendiklerini sakla:',
    features: [
      { icon: Briefcase, label: 'İş İlanları', desc: 'Van’daki iş fırsatları' },
      { icon: Percent, label: 'İndirim & Fırsatlar', desc: 'İşletme kampanyaları' },
      { icon: Heart, label: 'Favoriler', desc: 'Beğendiğini kaydet, sonra kolayca bul' },
      { icon: Bell, label: 'Yerel Bildirimler', desc: 'Ezan ve haber bildirimleri' },
    ],
  },
  {
    icon: CheckCircle2,
    iconBg: 'from-emerald-400 to-teal-600',
    title: 'Hazırsan Başlayalım!',
    desc: 'İlan paylaşmak istersen Ayarlar’dan Google veya Apple hesabınla giriş yapabilirsin. Keyifli kullanımlar!',
    features: [],
    isFinal: true,
  },
];

export const OnboardingView: React.FC<OnboardingViewProps> = ({
  isOpen,
  onComplete,
  theme,
}) => {
  const [step, setStep] = useState(0);
  const isDark = theme === 'dark';
  const slide = SLIDES[step];
  const isFinalSlide = slide.isFinal === true;

  const finish = () => {
    completeOnboarding();
    onComplete();
  };

  const goNext = () => {
    if (isFinalSlide) {
      finish();
    } else {
      setStep((s) => Math.min(s + 1, SLIDES.length - 1));
    }
  };

  const goPrev = () => {
    if (step > 0) {
      setStep((s) => s - 1);
    } else {
      finish(); // ilk slaytta geri = tanıtımı kapat (atla)
    }
  };

  // M32/M36: Android geri tuşu — önceki slayta gider, ilk slaytta kapatır.
  // onCloseRef her render'da güncellendiği için güncel step'i görür.
  useBackButtonClose(isOpen, goPrev);

  if (!isOpen) return null;

  return (
    <div
      className={`fixed inset-0 z-50 flex flex-col animate-fadeIn transition-colors duration-200 ${
        isDark ? 'bg-[#141518] text-white' : 'bg-slate-50 text-slate-800'
      }`}
    >
      {/* Üst bar: atla düğmesi */}
      <div className="flex items-center justify-end px-5 pt-5">
        {!isFinalSlide && (
          <button
            type="button"
            onClick={finish}
            className={`px-4 py-2 rounded-full text-xs font-black uppercase tracking-widest transition-colors ${
              isDark
                ? 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                : 'text-slate-500 hover:text-slate-700 hover:bg-slate-200'
            }`}
          >
            Atla
          </button>
        )}
      </div>

      {/* Slayt içeriği */}
      <div className="flex-1 flex items-center justify-center px-6 overflow-y-auto">
        <div key={step} className="w-full max-w-sm text-center animate-fadeIn py-6">
          {step === 0 ? (
            // Karşılama slaytı: splash ekranıyla aynı marka kimliği.
            <div className="flex flex-col items-center">
              <img
                src="/logo.png"
                alt="Van Rehberim Logo"
                className="w-36 h-36 sm:w-40 sm:h-40 object-contain drop-shadow-sm mb-4"
              />
              <div className="w-16 h-1 bg-amber-500 rounded-full mb-4 opacity-80" />
            </div>
          ) : (
            <div
              className={`mx-auto w-24 h-24 rounded-3xl bg-gradient-to-br ${slide.iconBg} flex items-center justify-center shadow-xl mb-6`}
            >
              <slide.icon className="w-12 h-12 text-white" />
            </div>
          )}

          <h1
            className={`text-2xl font-black tracking-tight mb-3 ${
              step === 0 ? (isDark ? 'text-white' : 'text-[#0c2f58] uppercase tracking-widest') : ''
            }`}
          >
            {slide.title}
          </h1>
          <p
            className={`text-sm font-semibold leading-relaxed mb-8 ${
              isDark ? 'text-slate-400' : 'text-slate-500'
            }`}
          >
            {slide.desc}
          </p>

          {slide.features.length > 0 && (
            <div className="space-y-3 text-left">
              {slide.features.map((f) => (
                <div
                  key={f.label}
                  className={`flex items-center gap-4 p-3.5 rounded-2xl border ${
                    isDark
                      ? 'bg-[#18191e] border-slate-800'
                      : 'bg-white border-slate-200 shadow-sm'
                  }`}
                >
                  <div
                    className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 ${
                      isDark ? 'bg-slate-800' : 'bg-slate-100'
                    }`}
                  >
                    <f.icon className="w-5.5 h-5.5 text-amber-500" />
                  </div>
                  <div className="min-w-0">
                    <p className="font-black text-sm">{f.label}</p>
                    <p
                      className={`text-xs font-semibold ${
                        isDark ? 'text-slate-400' : 'text-slate-500'
                      }`}
                    >
                      {f.desc}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Alt bar: ilerleme noktaları + gezinme düğmeleri */}
      <div className="px-6 pb-8 pt-2">
        <div className="flex items-center justify-center gap-2 mb-5">
          {SLIDES.map((s, i) => (
            <span
              key={s.title}
              className={`h-2 rounded-full transition-all duration-300 ${
                i === step
                  ? 'w-7 bg-amber-500'
                  : isDark
                    ? 'w-2 bg-slate-700'
                    : 'w-2 bg-slate-300'
              }`}
            />
          ))}
        </div>

        <div className="flex items-center gap-3">
          {step > 0 && (
            <button
              type="button"
              onClick={goPrev}
              aria-label="Geri"
              className={`w-12 h-12 rounded-2xl border flex items-center justify-center shrink-0 transition-all active:scale-95 ${
                isDark
                  ? 'bg-[#18191e] border-slate-800 text-slate-300 hover:bg-slate-800'
                  : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-100 shadow-sm'
              }`}
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
          )}

          <button
            type="button"
            onClick={goNext}
            className={`flex-1 h-12 rounded-2xl font-black text-sm uppercase tracking-wider flex items-center justify-center gap-2 transition-all active:scale-98 shadow-lg ${
              isFinalSlide
                ? 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white'
                : 'bg-gradient-to-r from-amber-500 to-amber-600 text-slate-950'
            }`}
          >
            {isFinalSlide ? 'Başla' : 'İleri'}
            {!isFinalSlide && <ChevronRight className="w-4 h-4" />}
          </button>
        </div>
      </div>
    </div>
  );
};
