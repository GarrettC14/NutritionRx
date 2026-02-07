module.exports = {
  root: true,
  parser: '@typescript-eslint/parser',
  parserOptions: {
    ecmaFeatures: { jsx: true },
    ecmaVersion: 'latest',
    sourceType: 'module',
  },
  plugins: [
    '@typescript-eslint',
    'react',
    'react-hooks',
    'react-native-a11y',
  ],
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended',
    'plugin:react/recommended',
    'plugin:react-hooks/recommended',
    'plugin:react-native-a11y/all',
  ],
  settings: {
    react: { version: 'detect' },
  },
  globals: {
    __DEV__: 'readonly',
  },
  rules: {
    // React 17+ JSX transform doesn't require React in scope
    'react/react-in-jsx-scope': 'off',

    // Relax TS rules that conflict with existing codebase patterns
    '@typescript-eslint/no-explicit-any': 'warn',
    '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
    '@typescript-eslint/no-require-imports': 'off',

    // Accessibility rules - enforce as warnings to start, promote to errors over time
    'react-native-a11y/has-accessibility-hint': 'off', // hints are optional
    'react-native-a11y/has-valid-accessibility-role': 'warn',
    'react-native-a11y/has-valid-accessibility-state': 'warn',
    'react-native-a11y/has-valid-accessibility-value': 'warn',
    'react-native-a11y/no-nested-touchables': 'warn',
    'react-native-a11y/has-valid-accessibility-descriptors': 'warn',
    'react-native-a11y/has-valid-accessibility-ignores-invert-colors': 'off',
    'react-native-a11y/has-valid-accessibility-live-region': 'warn',
  },
  ignorePatterns: [
    'node_modules/',
    'android/',
    'ios/',
    '.expo/',
    'babel.config.js',
    'metro.config.js',
    'jest.config.ts',
    '*.test.ts',
    '*.test.tsx',
    '__tests__/',
  ],
};
