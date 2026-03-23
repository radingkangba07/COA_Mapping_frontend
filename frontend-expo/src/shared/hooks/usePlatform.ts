import { useMemo } from 'react';
import { Platform, useWindowDimensions } from 'react-native';
import { BREAKPOINTS, type Breakpoint } from '@/shared/utils/platform.utils';

interface PlatformInfo {
  isWeb: boolean;
  isNative: boolean;
  isIOS: boolean;
  isAndroid: boolean;
  screenWidth: number;
  breakpoint: Breakpoint;
}

function getBreakpoint(width: number): Breakpoint {
  if (width >= BREAKPOINTS.xl) return 'xl';
  if (width >= BREAKPOINTS.lg) return 'lg';
  if (width >= BREAKPOINTS.md) return 'md';
  return 'sm';
}

export function usePlatform(): PlatformInfo {
  const { width } = useWindowDimensions();

  const breakpoint = useMemo(() => getBreakpoint(width), [width]);

  return useMemo(
    () => ({
      isWeb: Platform.OS === 'web',
      isNative: Platform.OS === 'ios' || Platform.OS === 'android',
      isIOS: Platform.OS === 'ios',
      isAndroid: Platform.OS === 'android',
      screenWidth: width,
      breakpoint,
    }),
    [width, breakpoint],
  );
}
