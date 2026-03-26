import React, { useEffect, useState } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { NavigationContainer } from '@react-navigation/native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import Toast from 'react-native-toast-message';
import { toastConfig } from '@/shared/components/feedback/Toast';
import { OfflineBanner } from '@/shared/components/feedback/OfflineBanner';
import { useNetworkStatus } from '@/shared/hooks/useNetworkStatus';
import { useAppStore } from '@/shared/store/app.store';
import { storageService } from '@/shared/services/storage/storage.service';
import { STORAGE_KEYS } from '@/shared/services/storage/storage.types';
import { ThemeSynchronizer } from '@/bootstrap/providers/ThemeSynchronizer';

interface AppProvidersProps {
  children: React.ReactNode;
}

export function AppProviders({ children }: AppProvidersProps): React.JSX.Element | null {
  const [isThemeReady, setIsThemeReady] = useState(false);
  useNetworkStatus();

  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            retry: 2,
            staleTime: 5 * 60 * 1000,
          },
        },
      }),
  );

  // Restore persisted theme on app launch before rendering
  useEffect(() => {
    async function restoreTheme(): Promise<void> {
      const stored = await storageService.get(STORAGE_KEYS.THEME);
      if (stored === 'dark' || stored === 'light') {
        useAppStore.getState().setTheme(stored);
      }
      setIsThemeReady(true);
    }
    void restoreTheme();
  }, []);

  if (!isThemeReady) {
    return null;
  }

  return (
    <QueryClientProvider client={queryClient}>
      <SafeAreaProvider>
        <ThemeSynchronizer isReady={isThemeReady} />
        <OfflineBanner />
        <NavigationContainer>
          {children}
        </NavigationContainer>
        <Toast config={toastConfig} />
      </SafeAreaProvider>
    </QueryClientProvider>
  );
}
