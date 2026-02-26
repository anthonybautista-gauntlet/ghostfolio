const baseConfig = require('../../eslint.config.cjs');

module.exports = [
  {
    ignores: ['**/dist']
  },
  ...baseConfig,
  {
    files: ['**/*.ts', '**/*.tsx', '**/*.js', '**/*.jsx'],
    rules: {},
    languageOptions: {
      parserOptions: {
        project: ['libs/ghostagent-evals/tsconfig.*?.json']
      }
    }
  },
  {
    files: ['**/*.ts', '**/*.tsx'],
    rules: {
      '@typescript-eslint/prefer-nullish-coalescing': 'error'
    }
  },
  {
    files: ['**/*.js', '**/*.jsx'],
    rules: {}
  }
];
