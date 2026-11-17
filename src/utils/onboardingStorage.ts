// M36: onboarding (ilk açılış tanıtım) ekranının kalıcılık işareti.
// Saf fonksiyonlar — App.tsx bunların üzerinden okur/yazar (M28 deseni).
// İşaret 'true' olduğunda tanıtım bu cihazda bir daha gösterilmez.

export const ONBOARDING_DONE_KEY = 'van_onboarding_done';

/**
 * Onboarding bu cihazda tamamlandıysa (veya atlandıysa) true döner.
 * localStorage okunamıyorsa true döner: depolama kalıcı olarak bozuksa
 * kullanıcıyı HER açılışta tanıtıma zorlamak daha kötü bir deneyimdir.
 */
export function hasCompletedOnboarding(): boolean {
  try {
    return localStorage.getItem(ONBOARDING_DONE_KEY) === 'true';
  } catch (e) {
    console.error('[Onboarding] localStorage okuma hatası:', e);
    return true;
  }
}

/**
 * Onboarding'i tamamlandı olarak işaretler — sonraki açılışlarda
 * gösterilmez. Yazma başarısızsa sessizce geçilir (yalnızca kalıcılık
 * kaybolur; uygulamanın geri kalanı etkilenmez).
 */
export function completeOnboarding(): void {
  try {
    localStorage.setItem(ONBOARDING_DONE_KEY, 'true');
  } catch (e) {
    console.error('[Onboarding] localStorage yazma hatası:', e);
  }
}
