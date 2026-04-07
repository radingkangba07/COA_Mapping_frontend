import type { NavigatorScreenParams } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { DrawerNavigationProp } from '@react-navigation/drawer';
import type { RouteProp } from '@react-navigation/native';
import { useNavigation, useRoute } from '@react-navigation/native';

// ---- Param Lists ----

export type RootStackParamList = {
  Auth: NavigatorScreenParams<AuthStackParamList>;
  App: NavigatorScreenParams<AppTabsParamList>;
};

export type AuthStackParamList = {
  Login: undefined;
  Register: undefined;
  CheckEmail: { email: string };
  AuthCallback: { accessToken?: string; refreshToken?: string; error?: string };
  ForgotPassword: undefined;
};

export type AppTabsParamList = {
  ProjectsTab: undefined;
  MigrationTab: NavigatorScreenParams<MigrationStackParamList>;
  SettingsTab: undefined;
};

export type ProjectsStackParamList = {
  ProjectsList: undefined;
  ProjectDetail: { projectId: string };
  NewProject: undefined;
};

export type MigrationStackParamList = {
  MigrationList: undefined;
  ERPSelect: { projectId: string };
  Upload: { projectId: string };
  Mapping: { projectId: string };
  Validation: { projectId: string };
  FinalPreview: { projectId: string };
  Preview: { projectId: string };
};

export type AppDrawerParamList = AppTabsParamList;

// ---- Typed Navigation Hooks ----

export const useAppNavigation = (): NativeStackNavigationProp<RootStackParamList> =>
  useNavigation<NativeStackNavigationProp<RootStackParamList>>();

export const useAppDrawerNavigation = (): DrawerNavigationProp<AppDrawerParamList> =>
  useNavigation<DrawerNavigationProp<AppDrawerParamList>>();

export const useProjectDetailRoute = (): RouteProp<ProjectsStackParamList, 'ProjectDetail'> =>
  useRoute<RouteProp<ProjectsStackParamList, 'ProjectDetail'>>();

export function useMigrationScreenRoute<T extends keyof MigrationStackParamList>(
): RouteProp<MigrationStackParamList, T> {
  return useRoute<RouteProp<MigrationStackParamList, T>>();
}
