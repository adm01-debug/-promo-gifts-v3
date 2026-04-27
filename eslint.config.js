import js from '@eslint/js';
import globals from 'globals';
import react from 'eslint-plugin-react';
import reactHooks from 'eslint-plugin-react-hooks';
import typescript from '@typescript-eslint/eslint-plugin';
import typescriptParser from '@typescript-eslint/parser';
import jsxA11y from 'eslint-plugin-jsx-a11y';

// Parser options compartilhados — apontam para o tsconfig.eslint.json que
// inclui src/, e2e/, tests/ e scripts/. Isso evita o erro
// "ESLint was configured to run on `<file>` using `parserOptions.project`
//  but the file is not included" que aparecia para arquivos fora de src/
// e gerava ruído nos relatórios.
const tsParserOptions = {
  ecmaFeatures: { jsx: true },
  ecmaVersion: 'latest',
  sourceType: 'module',
  project: ['./tsconfig.eslint.json'],
  tsconfigRootDir: import.meta.dirname,
};

export default [
  {
    ignores: [
      'dist',
      'build',
      'node_modules',
      'coverage',
      'playwright-report',
      'test-results',
      'supabase/functions/**',
      '*.config.js',
      '*.config.ts',
      '.eslintrc.cjs',
      '.eslintrc.json',
    ],
  },

  // ──────────────────────────────────────────────────────────────────────
  // src/** — código de aplicação React (browser globals)
  // ──────────────────────────────────────────────────────────────────────
  {
    files: ['src/**/*.{ts,tsx}'],
    languageOptions: {
      parser: typescriptParser,
      parserOptions: tsParserOptions,
      globals: globals.browser,
    },
    plugins: {
      react,
      'react-hooks': reactHooks,
      '@typescript-eslint': typescript,
      'jsx-a11y': jsxA11y,
    },
    rules: {
      ...js.configs.recommended.rules,
      ...typescript.configs.recommended.rules,
      'react/react-in-jsx-scope': 'off',
      'react/prop-types': 'off',

      // TypeScript strict rules
      '@typescript-eslint/explicit-module-boundary-types': 'off',
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
      '@typescript-eslint/consistent-type-imports': ['error', { prefer: 'type-imports', fixStyle: 'inline-type-imports' }],
      '@typescript-eslint/no-non-null-assertion': 'warn',
      '@typescript-eslint/naming-convention': [
        'warn',
        { selector: 'interface', format: ['PascalCase'] },
        { selector: 'typeAlias', format: ['PascalCase'] },
        { selector: 'enum', format: ['PascalCase'] },
        { selector: 'enumMember', format: ['UPPER_CASE', 'PascalCase'] },
        { selector: 'variable', modifiers: ['const', 'exported'], format: ['camelCase', 'PascalCase', 'UPPER_CASE'] },
        { selector: 'function', format: ['camelCase', 'PascalCase'] },
        { selector: 'parameter', format: ['camelCase'], leadingUnderscore: 'allow' },
        { selector: 'typeLike', format: ['PascalCase'] },
      ],

      // General strict rules
      'no-console': ['warn', { allow: ['warn', 'error'] }],
      'no-debugger': 'error',
      'no-duplicate-imports': 'error',
      'no-else-return': 'warn',
      'prefer-const': 'error',
      'eqeqeq': ['error', 'always'],

      // React
      'react-hooks/rules-of-hooks': 'error',
      'react-hooks/exhaustive-deps': 'warn',
      'jsx-a11y/anchor-is-valid': 'warn',
    },
    settings: {
      react: { version: 'detect' },
    },
  },

  // ──────────────────────────────────────────────────────────────────────
  // e2e/** — Playwright specs (Node + browser globais via Playwright)
  // ──────────────────────────────────────────────────────────────────────
  {
    files: ['e2e/**/*.{ts,tsx}'],
    languageOptions: {
      parser: typescriptParser,
      parserOptions: tsParserOptions,
      globals: { ...globals.node, ...globals.browser },
    },
    plugins: { '@typescript-eslint': typescript },
    rules: {
      ...js.configs.recommended.rules,
      ...typescript.configs.recommended.rules,
      // E2E tem fixtures, helpers e selectors — relaxar regras de produção:
      '@typescript-eslint/no-explicit-any': 'warn',
      '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
      '@typescript-eslint/no-non-null-assertion': 'off',
      'no-console': 'off',
      'no-empty-pattern': 'off', // Playwright fixtures: ({}, testInfo) => ...
    },
  },

  // Guard-rails de anti-flake — proíbe padrões conhecidos por causar
  // instabilidade nas specs E2E. Helpers (e2e/helpers/**) podem usar.
  {
    files: ['e2e/**/*.spec.{ts,tsx}'],
    rules: {
      'no-restricted-syntax': [
        'error',
        {
          selector: "CallExpression[callee.property.name='waitForTimeout']",
          message:
            'Proibido `page.waitForTimeout(...)` em specs — use `waitForTestIdHidden`, `waitForTestIdVisible`, `pollUntil` ou `waitForRouteIdle` (e2e/helpers/waits.ts | nav.ts).',
        },
        {
          selector: "Literal[value='networkidle']",
          message:
            'Proibido `networkidle` em specs — use `waitForRouteIdle(page)` ou esperas por testid de estado terminal (e2e/helpers/nav.ts).',
        },
        {
          selector: "MemberExpression[object.name='page'][property.name='goto']",
          message:
            'Proibido `page.goto(...)` direto em specs — use `gotoAndSettle(page, path)` ou `loginAs(page)` (e2e/helpers/nav.ts | auth.ts).',
        },
      ],
    },
  },

  // ──────────────────────────────────────────────────────────────────────
  // tests/** — Vitest (unit + integration). Globals = vitest + node + browser.
  // ──────────────────────────────────────────────────────────────────────
  {
    files: ['tests/**/*.{ts,tsx}'],
    languageOptions: {
      parser: typescriptParser,
      parserOptions: tsParserOptions,
      globals: { ...globals.node, ...globals.browser },
    },
    plugins: {
      react,
      'react-hooks': reactHooks,
      '@typescript-eslint': typescript,
    },
    rules: {
      ...js.configs.recommended.rules,
      ...typescript.configs.recommended.rules,
      'react/react-in-jsx-scope': 'off',
      'react/prop-types': 'off',
      '@typescript-eslint/no-explicit-any': 'warn',
      '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
      '@typescript-eslint/no-non-null-assertion': 'off',
      'no-console': 'off',
      // Tests podem usar mocks/stubs com nomes não convencionais
      '@typescript-eslint/naming-convention': 'off',
    },
    settings: {
      react: { version: 'detect' },
    },
  },

  // ──────────────────────────────────────────────────────────────────────
  // scripts/** — utilitários CLI Node (.mjs/.ts). Sem TS project para .mjs.
  // ──────────────────────────────────────────────────────────────────────
  {
    files: ['scripts/**/*.ts'],
    languageOptions: {
      parser: typescriptParser,
      parserOptions: tsParserOptions,
      globals: globals.node,
    },
    plugins: { '@typescript-eslint': typescript },
    rules: {
      ...js.configs.recommended.rules,
      ...typescript.configs.recommended.rules,
      '@typescript-eslint/no-explicit-any': 'warn',
      '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
      'no-console': 'off',
    },
  },
  {
    files: ['scripts/**/*.{js,mjs,cjs}'],
    languageOptions: {
      // Scripts .mjs não passam pelo parser TS — globals Node + parser default.
      ecmaVersion: 'latest',
      sourceType: 'module',
      globals: globals.node,
    },
    rules: {
      ...js.configs.recommended.rules,
      'no-console': 'off',
      'no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
    },
  },
];
