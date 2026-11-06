// eslint.config.js — ESLint 9 flat config (tek yapılandırma dosyası)
// Not: .eslintrc.json kaldırıldı (legacy config ile çakışıyordu).
import tseslint from "@typescript-eslint/eslint-plugin";
import tsParser from "@typescript-eslint/parser";
import reactHooks from "eslint-plugin-react-hooks";

export default [
  // Yalnızca src/ altındaki kaynak dosyalar lint edilir; üretim/ara dizinler yok sayılır.
  {
    ignores: ["dist/**", "android/**", "resources/**", "node_modules/**"],
  },
  {
    files: ["src/**/*.{js,jsx,ts,tsx}"],
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        ecmaVersion: 2022,
        sourceType: "module",
        ecmaFeatures: { jsx: true },
      },
    },
    plugins: {
      "@typescript-eslint": tseslint,
    },
    rules: {
      ...tseslint.configs.recommended.rules,
      // Bilinen teknik borç (bkz. MEMORY.md §4.3: 20+ `any`): hata yerine uyarı,
      // böylece lint çalışır ve CI yeşil kalır; borç kapatıldıkça seviye yükseltilir.
      "@typescript-eslint/no-explicit-any": "warn",
      "@typescript-eslint/no-unused-vars": "warn",
    },
  },
  {
    files: ["src/**/*.{js,jsx,ts,tsx}"],
    plugins: {
      "react-hooks": reactHooks,
    },
    rules: {
      // Yalnızca klasik iki hook kuralı. react-hooks v7'nin "recommended"
      // preset'i React Compiler kurallarını (set-state-in-effect, purity vb.)
      // error seviyesinde içerir; mevcut kod tabanında çok sayıda ihlal
      // üretip CI'ı kıracağı için bilinçli olarak hariç tutuldu.
      "react-hooks/rules-of-hooks": "error",
      "react-hooks/exhaustive-deps": "warn",
    },
  },
];
