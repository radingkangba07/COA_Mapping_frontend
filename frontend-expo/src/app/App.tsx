import React, { useCallback } from 'react';
import { Text, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import * as Font from 'expo-font';
import * as SplashScreen from 'expo-splash-screen';
import { AppProviders } from './providers/AppProviders';

import '../global.css';

SplashScreen.preventAutoHideAsync();

export function App() {
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
    <AppProviders>
      <View
        className="flex-1 items-center justify-center bg-background"
        onLayout={onLayoutRootView}
      >
        <Text className="font-heading text-2xl font-bold text-foreground">
          COA Migration System
        </Text>
        <Text className="mt-2 font-body text-sm text-muted-foreground">
          Hello World
        </Text>
        <StatusBar style="auto" />
      </View>
    </AppProviders>
  );
}
