import React, { useCallback } from 'react';
import { View, Text } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import * as Font from 'expo-font';
import * as SplashScreen from 'expo-splash-screen';
import { AppProviders } from './providers/AppProviders';
import { RootNavigator } from '@/navigation/RootNavigator';
import { useSessionGuard } from '@/features/auth/hooks/useSessionGuard';
import { SessionExpiredModal } from '@/features/auth/components/SessionExpiredModal';
import { useAppStore } from '@/shared/store/app.store';
import { Spinner } from '@/shared/components/ui/Spinner';

import '../global.css';

SplashScreen.preventAutoHideAsync();

function AppContent(): React.JSX.Element | null {
  const { isRestoring } = useSessionGuard();
  const theme = useAppStore((s) => s.theme);

  if (isRestoring) {
    return (
      <View className="flex-1 items-center justify-center bg-background">
        <Spinner size="lg" />
        <Text className="mt-4 font-body text-sm text-muted-foreground">
          Loading...
        </Text>
      </View>
    );
  }

  return (
    <>
      <RootNavigator />
      <SessionExpiredModal />
      <StatusBar style={theme === 'dark' ? 'light' : 'dark'} />
    </>
  );
}

export function App(): React.JSX.Element | null {
  const [fontsLoaded, fontError] = Font.useFonts({
    Chivo: require('../../assets/fonts/Chivo-Regular.ttf'),
    'Chivo-Bold': require('../../assets/fonts/Chivo-Bold.ttf'),
    Inter: require('../../assets/fonts/Inter-Regular.ttf'),
    'Inter-Medium': require('../../assets/fonts/Inter-Medium.ttf'),
    'Inter-SemiBold': require('../../assets/fonts/Inter-SemiBold.ttf'),
    JetBrainsMono: require('../../assets/fonts/JetBrainsMono-Regular.ttf'),
  });

  const onLayoutRootView = useCallback(async () => {
    if (fontsLoaded || fontError) {
      if (fontError) {
        console.warn('Failed to load fonts:', fontError);
      }
      await SplashScreen.hideAsync();
    }
  }, [fontsLoaded, fontError]);

  if (!fontsLoaded && !fontError) {
    return null;
  }

  return (
    <View className="flex-1 bg-background" onLayout={onLayoutRootView}>
      <AppProviders>
        <AppContent />
      </AppProviders>
    </View>
  );
}
