import { usePlatform } from '@/shared/hooks/usePlatform';

interface ResponsiveConfig<T> {
  sm: T;
  md?: T;
  lg?: T;
}

export function useResponsiveValue<T>(config: ResponsiveConfig<T>): T {
  const { breakpoint } = usePlatform();

  if (breakpoint === 'lg' || breakpoint === 'xl') {
    return config.lg ?? config.md ?? config.sm;
  }

  if (breakpoint === 'md') {
    return config.md ?? config.sm;
  }

  return config.sm;
}
