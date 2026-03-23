import { Dimensions, Platform } from 'react-native';

export const isWeb = Platform.OS === 'web';
export const isNative = Platform.OS !== 'web';
export const isIOS = Platform.OS === 'ios';
export const isAndroid = Platform.OS === 'android';

export const BREAKPOINTS = {
  sm: 640,
  md: 768,
  lg: 1024,
  xl: 1280,
} as const;

export type Breakpoint = keyof typeof BREAKPOINTS;

/** Returns current window width. This is a snapshot, not reactive — use useWindowDimensions() in components. */
export function getWindowWidth(): number {
  return Dimensions.get('window').width;
}

export function isAtLeast(breakpoint: Breakpoint): boolean {
  return getWindowWidth() >= BREAKPOINTS[breakpoint];
}

/** Snapshot check — not reactive. Use useWindowDimensions() in components for responsive layout. */
export function isMobile(): boolean {
  return !isAtLeast('md');
}

/** Snapshot check — not reactive. Use useWindowDimensions() in components for responsive layout. */
export function isTablet(): boolean {
  return isAtLeast('md') && !isAtLeast('lg');
}

/** Snapshot check — not reactive. Use useWindowDimensions() in components for responsive layout. */
export function isDesktop(): boolean {
  return isAtLeast('lg');
}
