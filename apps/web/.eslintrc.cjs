const { resolve } = require('node:path')

const project = resolve(__dirname, 'tsconfig.json')

/** @type {import('eslint').Linter.Config} */
module.exports = {
  root: true,
  extends: ['@terminverwaltung/eslint-config/next'],
  parserOptions: {
    project,
  },
  settings: {
    'import/resolver': {
      typescript: {
        project,
      },
    },
  },
  overrides: [
    {
      files: ['*.js', '*.cjs', '*.mjs'],
      rules: {
        '@typescript-eslint/consistent-type-imports': 'off',
        '@typescript-eslint/no-require-imports': 'off',
        'import/no-anonymous-default-export': 'off',
      },
    },
    {
      files: ['tailwind.config.ts'],
      rules: {
        '@typescript-eslint/no-require-imports': 'off',
      },
    },
    {
      // next-env.d.ts imports generated types that only exist after build
      files: ['next-env.d.ts'],
      rules: {
        'import/no-unresolved': 'off',
      },
    },
  ],
}
