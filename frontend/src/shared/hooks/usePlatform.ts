import { useState, useEffect } from 'react';
import { Platform, Dimensions } from 'react-native';

type Breakpoint = 'sm' | 'md' | 'lg' | 'xl';

interface PlatformInfo {
  isWeb: boolean;
  isNative: boolean;
  isIOS: boolean;
  isAndroid: boolean;
  screenWidth: number;
  breakpoint: Breakpoint;
}

const BREAKPOINTS = {
  SM: 640,
  MD: 768,
  LG: 1024,
} as const;

function getBreakpoint(width: number): Breakpoint {
  if (width < BREAKPOINTS.SM) return 'sm';
  if (width < BREAKPOINTS.MD) return 'md';
  if (width < BREAKPOINTS.LG) return 'lg';
  return 'xl';
}

function buildPlatformInfo(width: number): PlatformInfo {
  return {
    isWeb: Platform.OS === 'web',
    isNative: Platform.OS === 'ios' || Platform.OS === 'android',
    isIOS: Platform.OS === 'ios',
    isAndroid: Platform.OS === 'android',
    screenWidth: width,
    breakpoint: getBreakpoint(width),
  };
}

export function usePlatform(): PlatformInfo {
  const [info, setInfo] = useState<PlatformInfo>(() =>
    buildPlatformInfo(Dimensions.get('window').width),
  );

  useEffect(() => {
    const subscription = Dimensions.addEventListener('change', ({ window }) => {
      setInfo(buildPlatformInfo(window.width));
    });

    return () => {
      subscription.remove();
    };
  }, []);

  return info;
}
