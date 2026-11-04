// eslint.config.js – ESM version compatible with "type": "module"
import { defineConfig } from "eslint-define-config";
import tseslint from "@typescript-eslint/eslint-plugin";

export default defineConfig({
  files: ["src/**/*.js", "src/**/*.jsx", "src/**/*.ts", "src/**/*.tsx"],
  languageOptions: {
    ecmaVersion: 2022,
    sourceType: "module",
    parserOptions: {
      project: "./tsconfig.json"
    }
  },
  plugins: {
    "@typescript-eslint": tseslint
  },
  rules: {}
});
