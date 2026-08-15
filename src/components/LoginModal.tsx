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
  const { loginWithEmail, loginWithGoogle, loginWithApple, currentUser, setShowAuthModal } = useAuth();
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

  const handleAppleSubmit = async () => {
    setError(null);
    setIsSubmitting(true);
    try {
      await loginWithApple();
      setTimeout(() => {
        setShowAuthModal(false);
        if (onClose) onClose();
      }, 50);
    } catch (err: any) {
      setError(err.message || 'Apple girişi sırasında hata oluştu.');
    } finally {
      setIsSubmitting(false);
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
            Google veya Apple hesabınızla güvenli bir şekilde anında giriş yapın.
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

          {/* Quick Apple Sign In */}
          <button
            type="button"
            onClick={handleAppleSubmit}
            disabled={isSubmitting}
            className={`w-full py-3.5 px-4 rounded-2xl border font-black text-xs flex items-center justify-center gap-3 transition-all shadow-md active:scale-98 ${isDark ? 'bg-white text-slate-900 border-white hover:bg-slate-100' : 'bg-slate-900 text-white border-slate-900 hover:bg-slate-800'}`}
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill={isDark ? '#000000' : '#ffffff'}>
              <path d="M12 2C6.47715 2 2 6.47715 2 12C2 17.5228 6.47715 22 12 22C17.5228 22 22 17.5228 22 12C22 6.47715 17.5228 2 12 2ZM13.88 7.37C14.73 7.37 15.65 6.49 15.65 5.56C15.65 4.67 14.88 3.86 14.1 3.86C13.2 3.86 12.28 4.79 12.28 5.62C12.28 6.55 13.1 7.37 13.88 7.37ZM14.97 18.06C14.36 18.06 13.9 17.7 12.98 17.7C12.06 17.7 11.45 18.06 10.94 18.06C9.28 17.95 5.76 13.8 6.06 10.74C6.16 9.87 6.64 9.1 7.28 8.64C7.79 8.23 8.35 8.05 8.93 8.05C9.69 8.05 10.38 8.44 10.96 8.5C11.64 8.58 12.59 8.1 13.43 8.1C13.93 8.1 14.49 8.23 15.02 8.5C15.65 8.84 16.32 9.53 16.7 10.51C15 11.53 15.22 13.97 16.89 15C16.48 16.14 15.7 18.06 14.97 18.06Z" />
            </svg>
            <span>Apple ile Giriş Yap</span>
          </button>




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
