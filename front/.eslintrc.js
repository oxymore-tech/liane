module.exports = {
  root: true,
  extends: 'plugin:prettier/recommended',
  parser: '@typescript-eslint/parser',
  "parserOptions": {
    "ecmaVersion": 6,
    "sourceType": "module"
  },
  plugins: ['@typescript-eslint']
};
