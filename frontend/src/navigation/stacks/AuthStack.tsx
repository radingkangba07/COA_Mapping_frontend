import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { colors } from '@/config/theme';
import { LoginScreen } from '@/features/auth/screens/LoginScreen';
import { RegisterScreen } from '@/features/auth/screens/RegisterScreen';
import { CheckEmailScreen } from '@/features/auth/screens/CheckEmailScreen';
import { PlaceholderScreen } from '../screens/PlaceholderScreen';
import type { AuthStackParamList } from '../types';

const Stack = createNativeStackNavigator<AuthStackParamList>();

const ForgotPasswordScreen = (): React.JSX.Element => (
  <PlaceholderScreen name="Forgot Password" testID="forgot-password-screen" />
);

export const AuthStack = (): React.JSX.Element => {
  const headerStyle = { backgroundColor: colors.background } as const;

  return (
  <Stack.Navigator
    screenOptions={{
      headerStyle,
      headerTintColor: colors.foreground,
      headerShadowVisible: false,
    }}
  >
    <Stack.Screen
      name="Login"
      component={LoginScreen}
      options={{ headerShown: false }}
    />
    <Stack.Screen
      name="Register"
      component={RegisterScreen}
      options={{ title: 'Create Account' }}
    />
    <Stack.Screen
      name="CheckEmail"
      component={CheckEmailScreen}
      options={{ title: 'Verify Email', headerBackVisible: false }}
    />
    <Stack.Screen
      name="ForgotPassword"
      component={ForgotPasswordScreen}
      options={{ title: 'Reset Password' }}
    />
  </Stack.Navigator>
  );
};
