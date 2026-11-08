import js from '@eslint/js';
import globals from 'globals';
import react from 'eslint-plugin-react';
import reactHooks from 'eslint-plugin-react-hooks';
import jsxA11y from 'eslint-plugin-jsx-a11y';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  { ignores: ['dist', 'node_modules', 'coverage'] },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ['**/*.{js,jsx,ts,tsx}'],
    languageOptions: {
      globals: { ...globals.browser, ...globals.node },
    },
  },
  react.configs.flat.recommended,
  {
    files: ['**/*.{js,jsx,ts,tsx}'],
    rules: {
      // Vite (@vitejs/plugin-react) usa el JSX runtime automático; no hace falta importar React.
      'react/react-in-jsx-scope': 'off',
    },
  },
  {
    files: ['**/*.{js,jsx,ts,tsx}'],
    plugins: { 'react-hooks': reactHooks },
    rules: { ...reactHooks.configs['recommended-latest'].rules },
  },
  {
    files: ['**/*.{jsx,tsx}'],
    plugins: { 'jsx-a11y': jsxA11y },
    rules: { ...jsxA11y.configs.recommended.rules },
  },
  {
    files: ['**/*.{ts,tsx}'],
    languageOptions: {
      parser: tseslint.parser,
      parserOptions: {
        ecmaVersion: 2022,
        sourceType: 'module',
        ecmaFeatures: { jsx: true },
      },
    },
  },
);
