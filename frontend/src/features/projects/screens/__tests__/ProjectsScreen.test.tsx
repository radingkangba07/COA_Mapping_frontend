import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { AppError } from '@/shared/types/result.types';

// ─── Mocks ──────────────────────────────────────────────────────────────────

jest.mock('react-native-safe-area-context', () => {
  const { View } = require('react-native');
  return {
    SafeAreaView: ({ children, ...props }: Record<string, unknown>) => (
      <View {...props}>{children as React.ReactNode}</View>
    ),
    SafeAreaProvider: ({ children }: { children: React.ReactNode }) => children,
    useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
  };
});

jest.mock('lucide-react-native', () => {
  const { View } = require('react-native');
  const icon =
    (name: string) =>
    (props: Record<string, unknown>) => <View testID={`${name}-icon`} {...props} />;
  return new Proxy(
    { __esModule: true },
    {
      get: (target: Record<string, unknown>, prop: string) =>
        prop in target ? target[prop] : icon(prop),
    },
  );
});

jest.mock('@/shared/utils/platform.utils', () => ({
  isWeb: true,
  isNative: false,
}));

jest.mock('@/config/theme', () => ({
  colors: { primaryForeground: '#FAFAFA', mutedForeground: '#71717A', foreground: '#09090B' },
}));

const mockNavigate = jest.fn();
jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ navigate: mockNavigate }),
}));

jest.mock('@/shared/hooks/useOnlineGuard', () => ({
  useOnlineGuard: () => ({ isOnline: true }),
}));

const mockRefetch = jest.fn();
const mockSelectProject = jest.fn();

const defaultViewModel = {
  projects: [] as Array<{ projectId: string; name: string; status: string }>,
  total: 0,
  isLoading: false,
  error: null as AppError | null,
  refetch: mockRefetch,
  selectProject: mockSelectProject,
  selectedProject: null,
};

const mockUseProjectsViewModel = jest.fn(() => ({ ...defaultViewModel }));

jest.mock('../../hooks/useProjectsViewModel', () => ({
  useProjectsViewModel: () => mockUseProjectsViewModel(),
}));

jest.mock('../../hooks/useOrgsViewModel', () => ({
  useOrgsViewModel: () => ({
    orgs: [],
    employerOrgs: [],
    clientOrgs: [],
    activeOrg: null,
    activeOrgId: null,
    activeOrgType: null,
    isLoading: false,
    error: null,
    setActiveOrg: jest.fn(),
    refetch: jest.fn(),
  }),
}));

// Mock child components as simple stubs
jest.mock('../../components/ProjectList', () => ({
  ProjectList: (props: Record<string, unknown>) => {
    const { View } = require('react-native');
    return <View testID={props.testID as string} />;
  },
}));

jest.mock('../../components/ProjectListSkeleton', () => ({
  ProjectListSkeleton: (props: Record<string, unknown>) => {
    const { View } = require('react-native');
    return <View testID={props.testID as string} />;
  },
}));

jest.mock('../../components/DashboardStats', () => ({
  DashboardStats: (props: Record<string, unknown>) => {
    const { View } = require('react-native');
    return <View testID={props.testID as string} />;
  },
}));

jest.mock('@/shared/components/feedback/EmptyState', () => ({
  EmptyState: (props: Record<string, unknown>) => {
    const { View, Text, Pressable } = require('react-native');
    const action = props.action as
      | { label: string; onPress: () => void }
      | undefined;
    return (
      <View testID={props.testID as string}>
        <Text>{props.title as string}</Text>
        {action !== undefined ? (
          <Pressable testID="projects-empty-action" onPress={action.onPress}>
            <Text>{action.label}</Text>
          </Pressable>
        ) : null}
      </View>
    );
  },
}));

jest.mock('@/shared/constants/migration-steps', () => ({
  STEP_TO_SCREEN: {},
  MIGRATION_STEPS: { ERP_SELECT: 0 },
}));

jest.mock('@/shared/components/feedback/NetworkErrorFallback', () => ({
  NetworkErrorFallback: (props: Record<string, unknown>) => {
    const { View, Text } = require('react-native');
    return (
      <View testID={props.testID as string}>
        <Text>Network Error</Text>
      </View>
    );
  },
}));

jest.mock('@/shared/components/ui/Skeleton', () => ({
  Skeleton: (props: Record<string, unknown>) => {
    const { View } = require('react-native');
    return <View testID="skeleton" {...props} />;
  },
}));

// ─── Imports (after mocks) ──────────────────────────────────────────────────

import { ProjectsScreen } from '../ProjectsScreen';

// ─── Helpers ────────────────────────────────────────────────────────────────

function renderScreen(): ReturnType<typeof render> {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <ProjectsScreen />
    </QueryClientProvider>,
  );
}

// ─── Tests ──────────────────────────────────────────────────────────────────

describe('ProjectsScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseProjectsViewModel.mockReturnValue({ ...defaultViewModel });
  });

  it('renders the screen with testID', () => {
    renderScreen();
    expect(screen.getByTestId('projects-screen')).toBeTruthy();
  });

  it('shows empty state when no projects exist', () => {
    renderScreen();
    expect(screen.getByTestId('projects-empty')).toBeTruthy();
    expect(screen.getByText('No projects yet')).toBeTruthy();
  });

  it('shows "Dashboard" heading when projects exist', () => {
    mockUseProjectsViewModel.mockReturnValue({
      ...defaultViewModel,
      projects: [{ projectId: 'p1', name: 'Test', status: 'draft' }],
      total: 1,
    });
    renderScreen();
    expect(screen.getByText('Dashboard')).toBeTruthy();
  });

  it('renders the dashboard stats when projects exist', () => {
    mockUseProjectsViewModel.mockReturnValue({
      ...defaultViewModel,
      projects: [{ projectId: 'p1', name: 'Test', status: 'draft' }],
      total: 1,
    });
    renderScreen();
    expect(screen.getByTestId('dashboard-stats')).toBeTruthy();
  });

  it('renders the project list when projects exist', () => {
    mockUseProjectsViewModel.mockReturnValue({
      ...defaultViewModel,
      projects: [{ projectId: 'p1', name: 'Test', status: 'draft' }],
      total: 1,
    });
    renderScreen();
    expect(screen.getByTestId('projects-list')).toBeTruthy();
  });

  it('navigates to ProjectScope (no dialog) when the list Create button is pressed', () => {
    mockUseProjectsViewModel.mockReturnValue({
      ...defaultViewModel,
      projects: [{ projectId: 'p1', name: 'Test', status: 'draft' }],
      total: 1,
    });
    renderScreen();

    fireEvent.press(screen.getByTestId('new-project-btn'));

    expect(mockNavigate).toHaveBeenCalledWith('ProjectScope');
    expect(screen.queryByTestId('new-project-dialog')).toBeNull();
  });

  it('navigates to ProjectScope when the empty-state New Project action is pressed', () => {
    renderScreen();

    fireEvent.press(screen.getByTestId('projects-empty-action'));

    expect(mockNavigate).toHaveBeenCalledWith('ProjectScope');
    expect(screen.queryByTestId('new-project-dialog')).toBeNull();
  });

  it('shows loading skeleton when isLoading and no projects', () => {
    mockUseProjectsViewModel.mockReturnValue({
      ...defaultViewModel,
      isLoading: true,
      projects: [],
    });

    renderScreen();
    expect(screen.getByTestId('projects-screen')).toBeTruthy();
    expect(screen.getByTestId('projects-skeleton')).toBeTruthy();
    expect(screen.queryByText('Dashboard')).toBeNull();
  });

  it('shows error fallback when error exists and no projects', () => {
    mockUseProjectsViewModel.mockReturnValue({
      ...defaultViewModel,
      error: { code: 'NETWORK', message: 'Connection failed' } as AppError,
      projects: [],
    });

    renderScreen();
    expect(screen.getByTestId('projects-screen')).toBeTruthy();
    expect(screen.getByTestId('projects-error')).toBeTruthy();
    expect(screen.getByText('Network Error')).toBeTruthy();
    expect(screen.queryByText('Dashboard')).toBeNull();
  });

  it('shows normal view when projects exist even with error', () => {
    mockUseProjectsViewModel.mockReturnValue({
      ...defaultViewModel,
      error: { code: 'NETWORK', message: 'Stale error' } as AppError,
      projects: [{ projectId: 'p1', name: 'Test', status: 'draft' }],
      total: 1,
    });

    renderScreen();
    expect(screen.getByText('Dashboard')).toBeTruthy();
    expect(screen.getByTestId('projects-list')).toBeTruthy();
  });

  it('shows normal view when loading with existing projects', () => {
    mockUseProjectsViewModel.mockReturnValue({
      ...defaultViewModel,
      isLoading: true,
      projects: [{ projectId: 'p1', name: 'Test', status: 'draft' }],
      total: 1,
    });

    renderScreen();
    expect(screen.getByText('Dashboard')).toBeTruthy();
    expect(screen.queryByTestId('projects-skeleton')).toBeNull();
  });
});
