import { config as baseConfig } from '@repo/eslint-config/base';

/** @type {import('eslint').Linter.Config[]} */
export default [
  ...baseConfig,
  {
    languageOptions: {
      parserOptions: {
        project: true,
      },
    },
  },
];

