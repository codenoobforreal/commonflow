import globals from "globals";
import pluginJs from "@eslint/js";
import tseslint from "typescript-eslint";
import eslintprettier from "eslint-config-prettier";

/** @type {import('eslint').Linter.Config[]} */
export default [
  {
    ignores: ["dist"],
  },
  pluginJs.configs.recommended,
  ...tseslint.configs.recommended,
  { files: ["src/**/*.ts"] },
  { languageOptions: { globals: { ...globals.browser, ...globals.node } } },
  eslintprettier,
];
