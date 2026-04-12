import React, { useEffect, useRef } from 'react';
import { View, Text, Platform } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Screen } from '@/shared/components/layout/Screen';
import { Spinner } from '@/shared/components/ui/Spinner';
import { useAuthStore } from '../store/auth.store';
import type { AuthStackParamList } from '@/navigation/types';

type Props = NativeStackScreenProps<AuthStackParamList, 'AuthCallback'>;

function readTokensFromWindow(): { access_token?: string; refresh_token?: string } {
  if (Platform.OS !== 'web' || typeof window === 'undefined') {
    return {};
  }
  const params = new URLSearchParams(window.location.search);
  return {
    access_token: params.get('access_token') ?? undefined,
    refresh_token: params.get('refresh_token') ?? undefined,
  };
}

function clearUrlQueryString(): void {
  if (Platform.OS !== 'web' || typeof window === 'undefined') {
    return;
  }
  window.history.replaceState(null, '', window.location.pathname);
}

// Note: the primary magic-link callback flow is handled in useSessionGuard,
// which reads tokens directly from window.location before any navigation
// renders. This screen is a fallback in case someone navigates here
// programmatically or the URL is matched via a future linking config.
export const AuthCallbackScreen = ({ route, navigation }: Props): React.JSX.Element => {
  const hasRunRef = useRef(false);

  useEffect(() => {
    if (hasRunRef.current) {
      return;
    }
    hasRunRef.current = true;

    const fromParams = route.params ?? {};
    const fromUrl = readTokensFromWindow();

    const accessToken = fromParams.access_token ?? fromUrl.access_token;
    const refreshToken = fromParams.refresh_token ?? fromUrl.refresh_token;

    if (accessToken === undefined || refreshToken === undefined) {
      navigation.reset({ index: 0, routes: [{ name: 'Login' }] });
      return;
    }

    void (async (): Promise<void> => {
      await useAuthStore.getState().handleAuthCallback({ accessToken, refreshToken });

      clearUrlQueryString();

      const { user, accessToken: storedToken } = useAuthStore.getState();
      if (user === null || storedToken === null) {
        navigation.reset({ index: 0, routes: [{ name: 'Login' }] });
      }
    })();
  }, [route.params, navigation]);

  return (
    <Screen className="bg-background" testID="auth-callback-screen">
      <View className="flex-1 items-center justify-center px-4">
        <Spinner size="lg" />
        <Text className="mt-4 font-body text-sm text-muted-foreground">
          Signing you in...
        </Text>
      </View>
    </Screen>
  );
};
