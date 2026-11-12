import { defineConfig } from 'vitest/config';

// M24: Unit test yapılandırması. environment 'node' — bu paket yalnızca saf
// fonksiyonları ve mock'lu servis katmanını test eder; bileşen render testleri
// (jsdom + React Testing Library) HomeView bölünmesi sonrası eklenecek.
export default defineConfig({
  test: {
    environment: 'node',
    include: ['src/**/*.test.{ts,tsx}', 'server/**/*.test.ts'],
  },
});
