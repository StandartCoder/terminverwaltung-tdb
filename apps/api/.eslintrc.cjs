const { resolve } = require('node:path')

const project = resolve(__dirname, 'tsconfig.json')

/** @type {import('eslint').Linter.Config} */
module.exports = {
  root: true,
  extends: ['@terminverwaltung/eslint-config/base'],
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
  rules: {
    'no-console': ['warn', { allow: ['warn', 'error', 'log'] }],
  },
}
