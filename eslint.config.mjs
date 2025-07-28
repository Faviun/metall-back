module.exports = {
  root: true,
  parser: '@typescript-eslint/parser',
  parserOptions: {
    project: ['./tsconfig.json'],
    sourceType: 'module',
    ecmaVersion: 2020,
  },
  plugins: ['@typescript-eslint', 'prettier'],
  extends: [
    'plugin:@typescript-eslint/recommended',
    'plugin:prettier/recommended', // включает eslint-config-prettier и eslint-plugin-prettier
  ],
  rules: {
    // 🔧 кастомные правила
    '@typescript-eslint/no-explicit-any': 'warn',
    '@typescript-eslint/explicit-function-return-type': 'off',
    '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
    'prettier/prettier': ['warn', { endOfLine: 'auto' }],
  },
  ignorePatterns: ['dist/', 'node_modules/'],
};
