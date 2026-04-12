import React, { useEffect, useState } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import {
  NavigationContainer,
  getPathFromState as defaultGetPathFromState,
  getStateFromPath as defaultGetStateFromPath,
  type LinkingOptions,
} from '@react-navigation/native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import Toast from 'react-native-toast-message';
import { toastConfig } from '@/shared/components/feedback/Toast';
import { OfflineBanner } from '@/shared/components/feedback/OfflineBanner';
import { useNetworkStatus } from '@/shared/hooks/useNetworkStatus';
import { useAppStore } from '@/shared/store/app.store';
import { storageService } from '@/shared/services/storage/storage.service';
import { STORAGE_KEYS } from '@/shared/services/storage/storage.types';
import { ThemeSynchronizer } from '@/bootstrap/providers/ThemeSynchronizer';
import type { RootStackParamList } from '@/navigation/types';

// Deep-linking config — routes browser URLs to React Navigation screens.
// Currently scoped to the magic-link callback; other routes are unaffected
// since they have no path mapping and fall through to the default initial route.
//
// Subpath-aware linking: when Expo is built with `experiments.baseUrl` (for
// subpath deployments like `/test/` or `/staging/`), the emitted index.html
// carries `<base href="/test/">`, which makes `document.baseURI` include the
// subpath. We use this to:
//   1. Build the `prefixes` array so incoming URLs like `/test/auth/callback`
//      are correctly matched against the screen config.
//   2. Override `getPathFromState` / `getStateFromPath` so outgoing URL writes
//      (via the History API) preserve the subpath. The browser's `<base>` tag
//      only affects relative URL resolution in HTML; it does NOT affect
//      `history.pushState(..., '/absolute/path')`, which always resolves
//      against the origin. Without these overrides, logging in on `/test`
//      would push `/Projects` and take the user back to the root.
function getLinkingPrefixes(): string[] {
  const prefixes = new Set<string>();

  if (typeof document !== 'undefined' && typeof document.baseURI === 'string') {
    prefixes.add(document.baseURI.replace(/\/$/, ''));
  }

  if (typeof window !== 'undefined' && window.location?.origin) {
    prefixes.add(window.location.origin);
  }

  if (prefixes.size === 0) {
    prefixes.add('http://localhost');
  }

  return Array.from(prefixes);
}

function getBasePath(): string {
  if (typeof document === 'undefined' || typeof window === 'undefined') {
    return '';
  }
  try {
    const baseUrl = new URL(document.baseURI);
    if (baseUrl.origin !== window.location.origin) {
      return '';
    }
    return baseUrl.pathname.replace(/\/$/, '');
  } catch {
    return '';
  }
}

const basePath = getBasePath();

const linking: LinkingOptions<RootStackParamList> = {
  prefixes: getLinkingPrefixes(),
  config: {
    screens: {
      Auth: {
        screens: {
          AuthCallback: 'auth/callback',
        },
      },
    },
  },
  getPathFromState: (state, pathConfig) => {
    const path = defaultGetPathFromState(state, pathConfig);
    if (basePath === '') {
      return path;
    }
    // Avoid double-prefixing if the default already produced a prefixed path
    if (path === basePath || path.startsWith(`${basePath}/`)) {
      return path;
    }
    return `${basePath}${path}`;
  },
  getStateFromPath: (path, pathConfig) => {
    if (basePath === '' || !path.startsWith(basePath)) {
      return defaultGetStateFromPath(path, pathConfig);
    }
    const stripped = path.slice(basePath.length) || '/';
    return defaultGetStateFromPath(stripped, pathConfig);
  },
};

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
        <NavigationContainer linking={linking}>
          {children}
        </NavigationContainer>
        <Toast config={toastConfig} />
      </SafeAreaProvider>
    </QueryClientProvider>
  );
}
