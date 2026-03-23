import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { colors } from '@/config/theme';
import { PlaceholderScreen } from '../screens/PlaceholderScreen';
import type { AuthStackParamList } from '../types';

const Stack = createNativeStackNavigator<AuthStackParamList>();

const LoginScreen = (): React.JSX.Element => (
  <PlaceholderScreen name="Login" testID="login-screen" />
);

const RegisterScreen = (): React.JSX.Element => (
  <PlaceholderScreen name="Register" testID="register-screen" />
);

const ForgotPasswordScreen = (): React.JSX.Element => (
  <PlaceholderScreen name="Forgot Password" testID="forgot-password-screen" />
);

const HEADER_STYLE = { backgroundColor: colors.background } as const;

export const AuthStack = (): React.JSX.Element => (
  <Stack.Navigator
    screenOptions={{
      headerStyle: HEADER_STYLE,
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
      name="ForgotPassword"
      component={ForgotPasswordScreen}
      options={{ title: 'Reset Password' }}
    />
  </Stack.Navigator>
);
