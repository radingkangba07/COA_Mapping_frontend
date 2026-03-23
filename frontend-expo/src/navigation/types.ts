import type { NavigatorScreenParams } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
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
  ERPSelect: { projectId: string };
  Upload: { projectId: string };
  Mapping: { projectId: string };
  Validation: { projectId: string };
  Preview: { projectId: string };
};

// ---- Typed Navigation Hooks ----

export const useAppNavigation = (): NativeStackNavigationProp<RootStackParamList> =>
  useNavigation<NativeStackNavigationProp<RootStackParamList>>();

export const useProjectDetailRoute = (): RouteProp<ProjectsStackParamList, 'ProjectDetail'> =>
  useRoute<RouteProp<ProjectsStackParamList, 'ProjectDetail'>>();

export function useMigrationScreenRoute<T extends keyof MigrationStackParamList>(
): RouteProp<MigrationStackParamList, T> {
  return useRoute<RouteProp<MigrationStackParamList, T>>();
}
