import { useEffect } from 'react';
import { Platform } from 'react-native';
import { useAppStore } from '@/shared/store/app.store';

export function useNetworkStatus(): void {
  const setOnline = useAppStore((s) => s.setOnline);

  useEffect(() => {
    if (Platform.OS === 'web') {
      const handleOnline = (): void => setOnline(true);
      const handleOffline = (): void => setOnline(false);

      setOnline(navigator.onLine);

      window.addEventListener('online', handleOnline);
      window.addEventListener('offline', handleOffline);

      return () => {
        window.removeEventListener('online', handleOnline);
        window.removeEventListener('offline', handleOffline);
      };
    }

    // Native platforms: add @react-native-community/netinfo for network detection
    return undefined;
  }, [setOnline]);
}
