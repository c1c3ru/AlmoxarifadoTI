import js from "@eslint/js";
import globals from "globals";
import tseslint from "typescript-eslint";
import reactHooks from "eslint-plugin-react-hooks";
import reactRefresh from "eslint-plugin-react-refresh";

export default tseslint.config(
  {
    ignores: [
      "dist/**",
      "node_modules/**",
      "server/public/**",
      "attached_assets/**",
      "docs/**",
      ".local/**",
      "**/*.d.ts",
    ],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ["**/*.{ts,tsx}"],
    rules: {
      "@typescript-eslint/no-unused-vars": [
        "error",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_", caughtErrors: "none", ignoreRestSiblings: true },
      ],
      // `declare global { namespace Express { ... } }` é a forma padrão de
      // estender os tipos do Express.
      "@typescript-eslint/no-namespace": ["error", { allowDeclarations: true }],
      "no-empty": ["error", { allowEmptyCatch: true }],
      // O código atual tem vários `any`; fica como aviso para ser reduzido aos poucos
      // sem bloquear o CI. Código novo deve evitar.
      "@typescript-eslint/no-explicit-any": "warn",
    },
  },
  // Frontend (React, navegador)
  {
    files: ["client/**/*.{ts,tsx}"],
    languageOptions: { globals: globals.browser },
    plugins: { "react-hooks": reactHooks, "react-refresh": reactRefresh },
    rules: {
      ...reactHooks.configs.recommended.rules,
      // Regras do React Compiler (eslint-plugin-react-hooks 7). O código atual
      // tem ocorrências antigas; ficam como aviso até serem revisadas.
      "react-hooks/immutability": "warn",
      "react-hooks/set-state-in-effect": "warn",
      "react-refresh/only-export-components": ["warn", { allowConstantExport: true }],
    },
  },
  // Backend, scripts e configuração (Node)
  {
    files: ["server/**/*.ts", "api/**/*.ts", "scripts/**/*.ts", "shared/**/*.ts", "*.{js,ts}"],
    languageOptions: { globals: globals.node },
  },
);
