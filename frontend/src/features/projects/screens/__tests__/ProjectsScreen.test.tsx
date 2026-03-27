import React from 'react';
import { render, screen } from '@testing-library/react-native';
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
  return {
    Plus: icon('Plus'),
    __esModule: true,
  };
});

jest.mock('@/shared/utils/platform.utils', () => ({
  isWeb: true,
  isNative: false,
}));

jest.mock('@/config/theme', () => ({
  colors: { primaryForeground: '#FAFAFA' },
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

jest.mock('../../components/NewProjectDialog', () => ({
  NewProjectDialog: ({
    visible,
    testID,
  }: {
    visible: boolean;
    onClose: () => void;
    testID: string;
  }) => {
    const { View, Text } = require('react-native');
    return (
      <View testID={testID}>
        {visible ? <Text testID="dialog-content">Dialog Open</Text> : null}
      </View>
    );
  },
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

// ─── Tests ──────────────────────────────────────────────────────────────────

describe('ProjectsScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseProjectsViewModel.mockReturnValue({ ...defaultViewModel });
  });

  it('renders the screen with testID', () => {
    render(<ProjectsScreen />);
    expect(screen.getByTestId('projects-screen')).toBeTruthy();
  });

  it('shows "Dashboard" heading when projects are loaded', () => {
    render(<ProjectsScreen />);
    expect(screen.getByText('Dashboard')).toBeTruthy();
  });

  it('renders the dashboard stats', () => {
    render(<ProjectsScreen />);
    expect(screen.getByTestId('dashboard-stats')).toBeTruthy();
  });

  it('renders the project list', () => {
    render(<ProjectsScreen />);
    expect(screen.getByTestId('projects-list')).toBeTruthy();
  });

  it('renders the new project dialog container', () => {
    render(<ProjectsScreen />);
    expect(screen.getByTestId('new-project-dialog')).toBeTruthy();
  });

  it('shows loading skeleton when isLoading and no projects', () => {
    mockUseProjectsViewModel.mockReturnValue({
      ...defaultViewModel,
      isLoading: true,
      projects: [],
    });

    render(<ProjectsScreen />);
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

    render(<ProjectsScreen />);
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

    render(<ProjectsScreen />);
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

    render(<ProjectsScreen />);
    expect(screen.getByText('Dashboard')).toBeTruthy();
    expect(screen.queryByTestId('projects-skeleton')).toBeNull();
  });
});
