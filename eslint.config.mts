import js from "@eslint/js";
import tseslint from "typescript-eslint";

export default [
  {
    ignores: [
      "node_modules/**",
      "dist/**",
      "build/**",
      "playwright-report/**",
      "test-results/**",
    ],
  },

  js.configs.recommended,
  ...tseslint.configs.recommended,
];
