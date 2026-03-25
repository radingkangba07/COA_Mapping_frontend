import { useIsOnline } from '@/shared/store/app.selectors';

interface OnlineGuard {
  readonly isOnline: boolean;
  readonly disabledProps: { disabled: true } | Record<string, never>;
}

export function useOnlineGuard(): OnlineGuard {
  const isOnline = useIsOnline();

  return {
    isOnline,
    disabledProps: isOnline ? {} : { disabled: true as const },
  };
}
