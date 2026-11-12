import { describe, it, expect } from 'vitest';
import { getErrorMessage, getErrorCode, isPurchaseCancelled } from './errors';

// M27 (16/17): strict modda catch değişkenleri unknown gelir; tüm catch
// blokları bu yardımcılara dayanır. Regresyon = hata mesajları uygulamada
// kaybolur / yanlış gösterilir.

describe('getErrorMessage', () => {
  it('Error instanceından .message alır', () => {
    expect(getErrorMessage(new Error('Ağ hatası'))).toBe('Ağ hatası');
  });

  it('string hata için kendisini döner', () => {
    expect(getErrorMessage('basit metin')).toBe('basit metin');
  });

  it('Error olmayan nesne için String() gösterimi verir', () => {
    expect(getErrorMessage({ code: 5 })).toBe('[object Object]');
    expect(getErrorMessage(42)).toBe('42');
  });
});

describe('getErrorCode', () => {
  it('Firebase Auth hatasından kod okur', () => {
    expect(getErrorCode({ code: 'auth/requires-recent-login' })).toBe(
      'auth/requires-recent-login'
    );
  });

  it('kod yoksa veya string değilse undefined döner', () => {
    expect(getErrorCode(new Error('plain'))).toBeUndefined();
    expect(getErrorCode({ code: 401 })).toBeUndefined();
    expect(getErrorCode(null)).toBeUndefined();
    expect(getErrorCode('str')).toBeUndefined();
  });
});

describe('isPurchaseCancelled', () => {
  it('userCancelled: true olan hatada iptal sayar (web/legacy)', () => {
    expect(isPurchaseCancelled({ userCancelled: true })).toBe(true);
  });

  it("code '1' (PURCHASE_CANCELLED_ERROR) olan hatada iptal sayar", () => {
    expect(isPurchaseCancelled({ code: '1', message: 'cancelled' })).toBe(true);
  });

  it('diğer hatalarda iptal saymaz', () => {
    expect(isPurchaseCancelled({ code: '4', message: 'invalid purchase' })).toBe(false);
    expect(isPurchaseCancelled(new Error('network down'))).toBe(false);
    expect(isPurchaseCancelled(null)).toBe(false);
    expect(isPurchaseCancelled(undefined)).toBe(false);
  });
});
