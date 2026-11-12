import { describe, it, expect, vi, afterEach } from 'vitest';
import { calculatePrayerStatus } from './prayerService';

// calculatePrayerStatus içinde `new Date()` çağrıldığı için sahte sistem
// saatiyle deterministik test edilir.
const TIMES = {
  imsak: '05:00',
  sabah: '07:00',
  ogle: '12:00',
  ikindi: '15:00',
  aksam: '17:00',
  yatsi: '19:00',
};

afterEach(() => {
  vi.useRealTimers();
});

describe('calculatePrayerStatus', () => {
  it('sabah vakti içindeyken imsak aktif, sıradaki Güneş', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 10, 11, 6, 0)); // 06:00
    const s = calculatePrayerStatus(TIMES);
    expect(s.activeKey).toBe('imsak');
    expect(s.activeTitle).toBe('İmsak (Sabah Vakti)');
    expect(s.nextTitle).toBe('Güneş');
    expect(s.remainingMinutes).toBe(60);
  });

  it('öğleden sonra öğle vakti aktif, sıradaki İkindi', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 10, 11, 14, 0)); // 14:00
    const s = calculatePrayerStatus(TIMES);
    expect(s.activeKey).toBe('ogle');
    expect(s.nextTitle).toBe('İkindi');
    expect(s.remainingMinutes).toBe(60);
  });

  it('yatsıdan sonra yatsı aktif, sıradaki İmsak (ertesi gün)', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 10, 11, 20, 0)); // 20:00
    const s = calculatePrayerStatus(TIMES);
    expect(s.activeKey).toBe('yatsi');
    expect(s.nextTitle).toBe('İmsak');
    // (24:00 - 20:00) + 05:00 = 540 dk
    expect(s.remainingMinutes).toBe(540);
    expect(s.remainingText).toBe('9 sa 0 dk kaldı');
  });

  it('imsaktan önce (gece) yatsı aktif kalır, imsaka kalan dakika hesaplanır', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 10, 11, 3, 0)); // 03:00
    const s = calculatePrayerStatus(TIMES);
    expect(s.activeKey).toBe('yatsi');
    expect(s.remainingMinutes).toBe(120); // 05:00 - 03:00
  });

  it('sabit vakitlerde sınır dakikaları doğru vakte düşer', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 10, 11, 15, 0)); // tam ikindi
    const s = calculatePrayerStatus(TIMES);
    expect(s.activeKey).toBe('ikindi');
    expect(s.remainingMinutes).toBe(120); // akşama 17:00 - 15:00
  });
});
