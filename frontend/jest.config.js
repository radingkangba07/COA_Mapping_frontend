/** @type {import('jest').Config} */
module.exports = {
  preset: 'jest-expo',

  testPathIgnorePatterns: ['/node_modules/', '<rootDir>/e2e/'],

  setupFilesAfterEnv: ['./jest.setup.js'],

  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
  },

  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json'],

  transformIgnorePatterns: [
    'node_modules/(?!(' +
      'react-native' +
      '|@react-native' +
      '|@react-navigation' +
      '|expo' +
      '|@expo' +
      '|expo-.*' +
      '|@expo/.*' +
      '|nativewind' +
      '|react-native-css-interop' +
      '|react-native-reanimated' +
      '|react-native-safe-area-context' +
      '|react-native-screens' +
      '|react-native-svg' +
      '|react-native-toast-message' +
      '|react-native-web' +
      '|lucide-react-native' +
      '|class-variance-authority' +
      '|clsx' +
      '|tailwind-merge' +
      '|zustand' +
      '|immer' +
      ')/)',
  ],

  collectCoverageFrom: [
    'src/**/*.{ts,tsx}',
    '!src/**/*.d.ts',
    '!src/**/types/**',
    '!src/**/*.types.ts',
  ],
};
