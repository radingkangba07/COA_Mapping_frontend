/* eslint-disable no-undef */
// ---------------------------------------------------------------------------
// Jest setup file for the COA Migration Expo project.
// Mocks platform-specific Expo modules and NativeWind so tests run in Node.
// ---------------------------------------------------------------------------

const matchers = require('@testing-library/react-native/matchers');
expect.extend(matchers);

// ---------------------------------------------------------------------------
// expo-secure-store
// ---------------------------------------------------------------------------
jest.mock('expo-secure-store', () => ({
  getItemAsync: jest.fn().mockResolvedValue(null),
  setItemAsync: jest.fn().mockResolvedValue(undefined),
  deleteItemAsync: jest.fn().mockResolvedValue(undefined),
}));

// ---------------------------------------------------------------------------
// expo-document-picker
// ---------------------------------------------------------------------------
jest.mock('expo-document-picker', () => ({
  getDocumentAsync: jest.fn().mockResolvedValue({
    canceled: true,
    assets: [],
  }),
}));

// ---------------------------------------------------------------------------
// expo-font
// ---------------------------------------------------------------------------
jest.mock('expo-font', () => ({
  loadAsync: jest.fn().mockResolvedValue(undefined),
  isLoaded: jest.fn().mockReturnValue(true),
  useFonts: jest.fn().mockReturnValue([true, null]),
}));

// ---------------------------------------------------------------------------
// react-native-toast-message
// ---------------------------------------------------------------------------
jest.mock('react-native-toast-message', () => {
  const React = require('react');
  const ToastComponent = React.forwardRef(function Toast(_props, _ref) {
    return null;
  });
  ToastComponent.show = jest.fn();
  ToastComponent.hide = jest.fn();
  return {
    __esModule: true,
    default: ToastComponent,
    show: jest.fn(),
    hide: jest.fn(),
  };
});

// ---------------------------------------------------------------------------
// NativeWind — stub the styled wrapper as an identity passthrough
// ---------------------------------------------------------------------------
jest.mock('nativewind', () => ({
  styled: (component) => component,
  useColorScheme: jest.fn().mockReturnValue({
    colorScheme: 'light',
    setColorScheme: jest.fn(),
    toggleColorScheme: jest.fn(),
  }),
}));

// ---------------------------------------------------------------------------
// react-native-css-interop — NativeWind v4 uses this under the hood
// ---------------------------------------------------------------------------
jest.mock('react-native-css-interop', () => ({
  cssInterop: (component) => component,
  remapProps: (component) => component,
}));

// ---------------------------------------------------------------------------
// react-native-reanimated — use the built-in mock
// ---------------------------------------------------------------------------
jest.mock('react-native-reanimated', () => {
  try {
    return require('react-native-reanimated/mock');
  } catch {
    return {};
  }
});

// ---------------------------------------------------------------------------
// Silence noisy warnings in test output
// ---------------------------------------------------------------------------
const originalWarn = console.warn;
console.warn = (...args) => {
  const message = typeof args[0] === 'string' ? args[0] : '';
  if (message.includes('Animated:')) return;
  if (message.includes('NativeWind')) return;
  originalWarn.apply(console, args);
};
