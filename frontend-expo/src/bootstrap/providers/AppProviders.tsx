import React, { useState } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { NavigationContainer } from '@react-navigation/native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import Toast from 'react-native-toast-message';
import { toastConfig } from '@/shared/components/feedback/Toast';
import { OfflineBanner } from '@/shared/components/feedback/OfflineBanner';
import { useNetworkStatus } from '@/shared/hooks/useNetworkStatus';

interface AppProvidersProps {
  children: React.ReactNode;
}

export function AppProviders({ children }: AppProvidersProps): React.JSX.Element {
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

  return (
    <QueryClientProvider client={queryClient}>
      <SafeAreaProvider>
        <OfflineBanner />
        <NavigationContainer>
          {children}
        </NavigationContainer>
        <Toast config={toastConfig} />
      </SafeAreaProvider>
    </QueryClientProvider>
  );
}
