import js from "@eslint/js";
import { defineConfig } from "eslint/config";
import globals from "globals";
import tseslint from "typescript-eslint";

export default defineConfig([
  { ignores: ["dist", "coverage"] },
  { files: ["src/**/*.ts"], languageOptions: { globals: globals.node } },
  { files: ["src/**/*.js"], plugins: { js }, extends: ["js/recommended"] },
  tseslint.configs.recommended,
]);
