'use strict';

const js = require('@eslint/js');
const globals = require('globals');

// Enforces the project rule "one language per file" in the renderer:
// no building HTML from strings and no inline styles from JS.
const RENDERER_RESTRICTED_PROPERTIES = [
  { property: 'innerHTML', message: 'Usá <template> + cloneNode o document.createElement.' },
  { property: 'outerHTML', message: 'Usá <template> + cloneNode o document.createElement.' },
  {
    property: 'insertAdjacentHTML',
    message: 'Usá <template> + cloneNode o document.createElement.',
  },
  { property: 'style', message: 'Usá classList con clases definidas en CSS.' },
  { object: 'document', property: 'write', message: 'No escribas HTML desde JS.' },
];

module.exports = [
  { ignores: ['node_modules/', 'dist/'] },
  js.configs.recommended,
  {
    rules: {
      'no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
      'prefer-const': 'error',
      eqeqeq: ['error', 'always'],
      'no-var': 'error',
    },
  },
  {
    files: ['src/main/**/*.js', 'eslint.config.js'],
    languageOptions: { sourceType: 'commonjs', globals: { ...globals.node } },
  },
  {
    files: ['src/renderer/**/*.js'],
    languageOptions: { sourceType: 'module', globals: { ...globals.browser } },
    rules: { 'no-restricted-properties': ['error', ...RENDERER_RESTRICTED_PROPERTIES] },
  },
  {
    files: ['src/shared/**/*.mjs'],
    languageOptions: { sourceType: 'module', globals: {} },
  },
];
