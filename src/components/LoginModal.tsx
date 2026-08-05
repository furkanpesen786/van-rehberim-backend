import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import {
  Mail,
  User,
  LogIn,
  X,
  Sparkles,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react';

interface LoginModalProps {
  isOpen: boolean;
  onClose?: () => void;
  theme?: 'light' | 'dark';
}

export const LoginModal: React.FC<LoginModalProps> = ({
  isOpen,
  onClose,
  theme = 'light',
}) => {
  const { loginWithEmail, loginWithGoogle, currentUser, setShowAuthModal } = useAuth();
  const [email, setEmail] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const isDark = theme === 'dark';

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!email || !email.includes('@')) {
      setError('Lütfen geçerli bir e-posta adresi giriniz.');
      return;
    }

    setIsSubmitting(true);
    try {
      await loginWithEmail(email, displayName);
      setTimeout(() => {
        setShowAuthModal(false);
        if (onClose) onClose();
      }, 50);
    } catch (err: any) {
      setError(err.message || 'Giriş yapılırken bir hata oluştu.');
    } finally {
      setIsSubmitting(false); // KESİNLİKLE spinner'ı kapat
    }
  };

  const handleGoogleSubmit = async () => {
    setError(null);
    setIsSubmitting(true);
    try {
      await loginWithGoogle();
      setTimeout(() => {
        setShowAuthModal(false);
        if (onClose) onClose();
      }, 50);
    } catch (err: any) {
      setError(err.message || 'Google girişi sırasında hata oluştu.');
    } finally {
      setIsSubmitting(false); // KESİNLİKLE spinner'ı kapat
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 animate-fadeIn">
      <div
        className={`w-full max-w-md rounded-3xl border shadow-2xl overflow-hidden relative ${isDark ? 'bg-[#18191e] border-slate-800 text-white' : 'bg-white border-slate-200 text-slate-900'
          }`}
      >
        {/* Header decoration */}
        <div className="bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-500 p-6 text-slate-950 relative overflow-hidden">
          {onClose && (
            <button
              onClick={onClose}
              className="absolute top-4 right-4 w-8 h-8 rounded-full bg-slate-950/20 text-slate-950 flex items-center justify-center hover:bg-slate-950/40 transition-all"
            >
              <X className="w-4 h-4" />
            </button>
          )}

          <div className="flex items-center gap-2 mb-1">
            <span className="bg-slate-950 text-emerald-400 font-black text-[10px] px-2.5 py-0.5 rounded-full uppercase tracking-wider flex items-center gap-1">
              <ShieldCheck className="w-3 h-3 text-emerald-400" />
              Firebase Bulut Güvenlikli
            </span>
          </div>

          <h2 className="text-2xl font-black tracking-tight text-slate-950">
            VAN REHBERİM'E HOŞ GELDİNİZ
          </h2>
          <p className="text-xs font-bold text-slate-950/80 mt-1">
            Şifresiz sadece e-posta adresinizle veya Google ile anında giriş yapın.
          </p>
        </div>

        <div className="p-6 space-y-5">
          {/* Inline error removed to be replaced by floating Toast */}

          {/* Quick Google Sign In */}
          <button
            type="button"
            onClick={handleGoogleSubmit}
            disabled={isSubmitting}
            className="w-full py-3.5 px-4 rounded-2xl border font-black text-xs flex items-center justify-center gap-3 transition-all shadow-md active:scale-98 bg-white text-slate-900 border-slate-300 hover:bg-slate-50 hover:shadow-lg"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24">
              <path
                fill="#4285F4"
                d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.17z"
              />
              <path
                fill="#34A853"
                d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.29v3.15C3.26 21.3 7.31 24 12 24z"
              />
              <path
                fill="#FBBC05"
                d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.29C.47 8.21 0 10.05 0 12s.47 3.79 1.29 5.42l3.99-3.15z"
              />
              <path
                fill="#EA4335"
                d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.31 0 3.26 2.7 1.29 6.58l3.99 3.15c.95-2.83 3.6-4.98 6.72-4.98z"
              />
            </svg>
            <span>Google Hesabı ile Giriş Yap</span>
          </button>

          <div className="flex items-center gap-3 my-2">
            <div className={`flex-1 h-px ${isDark ? 'bg-slate-800' : 'bg-slate-200'}`} />
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">
              VEYA E-POSTA İLE
            </span>
            <div className={`flex-1 h-px ${isDark ? 'bg-slate-800' : 'bg-slate-200'}`} />
          </div>

          {/* Direct Email Form */}
          <form onSubmit={handleEmailSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-extrabold text-emerald-500 uppercase tracking-wider flex items-center gap-1.5">
                <Mail className="w-3.5 h-3.5" />
                <span>E-posta Adresiniz (Şifresiz Giriş)</span>
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="ornek@domain.com"
                className={`w-full px-4 py-3 rounded-2xl text-xs font-bold border transition-all focus:outline-none focus:ring-2 focus:ring-emerald-500 ${isDark
                  ? 'bg-[#121316] border-slate-700 text-white placeholder-slate-500'
                  : 'bg-slate-50 border-slate-300 text-slate-900 placeholder-slate-400'
                  }`}
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-extrabold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                <User className="w-3.5 h-3.5" />
                <span>Adınız Soyadınız (İsteğe Bağlı)</span>
              </label>
              <input
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="Ahmet Yılmaz"
                className={`w-full px-4 py-3 rounded-2xl text-xs font-bold border transition-all focus:outline-none focus:ring-2 focus:ring-emerald-500 ${isDark
                  ? 'bg-[#121316] border-slate-700 text-white placeholder-slate-500'
                  : 'bg-slate-50 border-slate-300 text-slate-900 placeholder-slate-400'
                  }`}
              />
            </div>

            <button
              type="submit"
              onClick={handleEmailSubmit}
              disabled={isSubmitting}
              className="w-full py-3.5 px-4 rounded-2xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs flex items-center justify-center gap-2 transition-all shadow-lg active:scale-98 border border-emerald-400/30"
            >
              <LogIn className="w-4 h-4 stroke-[2.5]" />
              <span>E-posta ile Giriş Yap &rarr;</span>
            </button>
          </form>

          <div className={`p-3 rounded-2xl border text-[11px] font-medium leading-relaxed flex items-start gap-2 ${isDark ? 'bg-slate-900/60 border-slate-800 text-slate-400' : 'bg-slate-50 border-slate-200 text-slate-600'
            }`}>
            <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
            <span>
              Verileriniz Firebase Bulut Platformunda uçtan uca güvenle saklanır. Şifre hatırlama derdi olmadan e-posta ile ilan ve fırsat paylaşabilirsiniz.
            </span>
          </div>

        </div>

        {/* Floating Glassmorphism Error Toast */}
        {error && (
          <div className="absolute top-4 left-1/2 -translate-x-1/2 w-11/12 z-20 animate-slideDown">
            <div className="mx-auto bg-white/70 dark:bg-[#121316]/70 backdrop-blur-2xl border border-white/60 dark:border-white/10 shadow-lg rounded-2xl p-3.5 flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-rose-500/10 flex items-center justify-center shrink-0">
                <AlertCircle className="w-4 h-4 text-rose-500" />
              </div>
              <span className="text-xs font-bold text-slate-800 dark:text-white leading-snug">{error}</span>
            </div>
          </div>
        )}

        {/* Transparent Transparent Spinner Overlay */}
        {isSubmitting && (
          <div className="absolute inset-0 z-30 bg-white/40 dark:bg-black/40 backdrop-blur-md flex flex-col items-center justify-center animate-fadeIn rounded-3xl">
            <div className="bg-white/80 dark:bg-[#121316]/80 p-5 rounded-3xl shadow-xl flex flex-col items-center gap-3 border border-white/50 backdrop-blur-2xl">
              <div className="w-8 h-8 border-4 border-emerald-500 border-r-transparent border-t-transparent rounded-full animate-spin shadow-sm"></div>
              <span className="text-xs font-black text-slate-800 dark:text-white tracking-widest drop-shadow-sm uppercase">İşleniyor...</span>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};
