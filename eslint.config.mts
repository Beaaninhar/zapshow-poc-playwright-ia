import js from "@eslint/js";
import tseslint from "typescript-eslint";

export default [
  {
    ignores: [
      "node_modules/**",
      "dist/**",
      "build/**",
      ".tmp/no-code-tests/**",
    ],
  },

  js.configs.recommended,
  ...tseslint.configs.recommended,
];
