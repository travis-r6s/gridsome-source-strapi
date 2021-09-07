module.exports = {
  extends: ['travisreynolds-node-ts'],
  rules: {
    'no-use-before-define': 'off',
    '@typescript-eslint/no-use-before-define': ['error']
  }
}
