/** @type {import('eslint').Linter.Config} */
module.exports = {
  root: true,
  extends: ['@terminverwaltung/eslint-config/base'],
  overrides: [
    {
      files: ['prisma/seed.ts'],
      rules: {
        'no-console': 'off',
      },
    },
  ],
}
