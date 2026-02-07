module.exports = {
  testEnvironment: 'node',
  roots: ['<rootDir>/src'],
  testMatch: ['**/__tests__/**/*.test.ts', '**/__tests__/**/*.test.tsx'],
  transform: {
    '^.+\\.tsx?$': [
      'ts-jest',
      {
        isolatedModules: true,
        tsconfig: {
          jsx: 'react',
        },
      },
    ],
  },
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
    '^react-native$': '<rootDir>/src/__mocks__/react-native.ts',
    '^expo-file-system$': '<rootDir>/src/__mocks__/expo-file-system.ts',
    '^expo-sharing$': '<rootDir>/src/__mocks__/expo-sharing.ts',
  },
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  transformIgnorePatterns: [
    'node_modules/(?!(react-native|@react-native|expo|expo-.*|@expo|@expo/.*|react-native-.*|@react-navigation|uuid)/)',
  ],
  collectCoverageFrom: [
    'src/**/*.{ts,tsx}',
    '!src/**/*.d.ts',
    // Expo Router screen components (src/app/) are excluded from unit test
    // coverage because they are thin UI wrappers tested via Maestro E2E flows.
    '!src/app/**/*',
    '!src/__mocks__/**/*',
  ],
};
