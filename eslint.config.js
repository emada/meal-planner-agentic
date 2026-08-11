import js from '@eslint/js';
import { defineConfig, globalIgnores } from 'eslint/config';
import prettier from 'eslint-config-prettier';
import importPlugin from 'eslint-plugin-import';
import jsxA11y from 'eslint-plugin-jsx-a11y';
import react from 'eslint-plugin-react';
import reactHooks from 'eslint-plugin-react-hooks';
import globals from 'globals';
import tseslint from 'typescript-eslint';

/**
 * Architectural rules from PLAN.md are enforced here rather than by review.
 *
 * Dependency direction:
 *   domain  -> (nothing)
 *   api     -> (nothing internal)
 *   storage -> domain
 *   ui      -> api, domain, storage
 *
 * `target` may not import from `from`.
 */
const boundaryZones = [
  { target: './src/domain', from: './src/api' },
  { target: './src/domain', from: './src/storage' },
  { target: './src/domain', from: './src/ui' },
  { target: './src/api', from: './src/domain' },
  { target: './src/api', from: './src/storage' },
  { target: './src/api', from: './src/ui' },
  { target: './src/storage', from: './src/api' },
  { target: './src/storage', from: './src/ui' },
];

export default defineConfig([
  globalIgnores(['dist/**', 'coverage/**', 'playwright-report/**', 'test-results/**']),

  js.configs.recommended,

  {
    files: ['**/*.{ts,tsx}'],
    extends: [tseslint.configs.strictTypeChecked, tseslint.configs.stylisticTypeChecked],
    languageOptions: {
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
      globals: { ...globals.browser },
    },
    settings: {
      react: { version: 'detect' },
      // Without this, eslint-plugin-import cannot parse imported .ts files, so
      // graph rules such as no-cycle silently pass instead of reporting.
      'import/parsers': {
        '@typescript-eslint/parser': ['.ts', '.tsx'],
      },
      'import/resolver': {
        typescript: { alwaysTryTypes: true },
      },
    },
    plugins: {
      react,
      'react-hooks': reactHooks,
      'jsx-a11y': jsxA11y,
      import: importPlugin,
    },
    rules: {
      ...react.configs.flat.recommended.rules,
      ...react.configs.flat['jsx-runtime'].rules,
      ...jsxA11y.flatConfigs.recommended.rules,

      'react-hooks/rules-of-hooks': 'error',
      'react-hooks/exhaustive-deps': 'error',

      // Third-party recipe text must never be interpreted as markup (SPEC security constraint).
      'react/no-danger': 'error',

      // Outbound links to third-party content must not leak the opener.
      'react/jsx-no-target-blank': ['error', { allowReferrer: false }],

      // Architecture: no cycles, no boundary violations (PLAN.md module boundaries).
      'import/no-cycle': ['error', { maxDepth: Infinity }],
      'import/no-restricted-paths': ['error', { zones: boundaryZones }],

      '@typescript-eslint/consistent-type-imports': 'error',
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],
      'no-console': ['error', { allow: ['warn', 'error'] }],
    },
  },

  // Node context: build tooling, scripts, and browser-test files.
  {
    files: ['*.config.ts', 'e2e/**/*.ts', 'scripts/**/*.mjs'],
    languageOptions: { globals: { ...globals.node } },
  },

  // Tests may lean on non-null assertions for fixture setup.
  {
    files: ['**/*.test.{ts,tsx}', 'src/test/**', 'e2e/**'],
    rules: {
      '@typescript-eslint/no-non-null-assertion': 'off',
    },
  },

  // This file is JavaScript, so the type-aware config above (scoped to
  // ts/tsx) never applies to it. It only needs Node globals.
  {
    files: ['eslint.config.js'],
    languageOptions: { globals: { ...globals.node } },
  },

  prettier,
]);
