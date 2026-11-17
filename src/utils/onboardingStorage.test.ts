import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  hasCompletedOnboarding,
  completeOnboarding,
  ONBOARDING_DONE_KEY,
} from './onboardingStorage';

// M36: onboarding işaretinin kalıcılığı — regresyon = tanıtım ya her
// açılışta yeniden çıkar (işaret yazılmıyor) ya da hiç çıkmaz (yanlış
// okuma). savedItemsStorage.test.ts deseni: sahte localStorage.

function createFakeLocalStorage() {
  const store = new Map<string, string>();
  return {
    getItem: (key: string) => store.get(key) ?? null,
    setItem: (key: string, value: string) => void store.set(key, value),
    removeItem: (key: string) => void store.delete(key),
    clear: () => store.clear(),
    key: (index: number) => [...store.keys()][index] ?? null,
    get length() {
      return store.size;
    },
  };
}

beforeEach(() => {
  vi.stubGlobal('localStorage', createFakeLocalStorage());
});

describe('onboardingStorage', () => {
  it('depoda işaret yoksa onboarding gösterilir (false)', () => {
    expect(hasCompletedOnboarding()).toBe(false);
  });

  it('işaret "true" ise tamamlanmış sayılır', () => {
    localStorage.setItem(ONBOARDING_DONE_KEY, 'true');
    expect(hasCompletedOnboarding()).toBe(true);
  });

  it('completeOnboarding sonrası okuma kalıcı olarak true döner', () => {
    expect(hasCompletedOnboarding()).toBe(false);
    completeOnboarding();
    // "Yeniden açılış" — bileşen yeniden mount olsa bile depodan okunur.
    expect(hasCompletedOnboarding()).toBe(true);
  });

  it('başka değerler (eski/bozuk veri) tamamlanmış sayılmaz', () => {
    localStorage.setItem(ONBOARDING_DONE_KEY, 'yes');
    expect(hasCompletedOnboarding()).toBe(false);
  });
});
