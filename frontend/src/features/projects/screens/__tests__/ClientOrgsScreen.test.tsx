import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { createOrgId } from '@/shared/types/common.types';
import type { AppError } from '@/shared/types/result.types';
import type { ClientOrg } from '../../types/org.types';

// ─── Mocks ──────────────────────────────────────────────────────────────────

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

jest.mock('react-native-safe-area-context', () => ({
  SafeAreaView: ({ children, ...props }: Record<string, unknown>) => {
    const { View } = require('react-native');
    return <View {...props}>{children as React.ReactNode}</View>;
  },
  SafeAreaProvider: ({ children }: { children: React.ReactNode }) => children,
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));

jest.mock('@/shared/utils/platform.utils', () => ({ isWeb: true, isNative: false }));
jest.mock('@/config/theme', () => ({
  colors: { primaryForeground: '#FAFAFA', foreground: '#09090B', mutedForeground: '#9E9E9E' },
}));

const mockNavigate = jest.fn();
jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ navigate: mockNavigate }),
}));

const mockRefetch = jest.fn();
let mockClientOrgs: ClientOrg[] = [];
let mockIsLoading = false;
let mockError: AppError | null = null;

jest.mock('../../hooks/useClientOrgs', () => ({
  useClientOrgs: () => ({
    clientOrgs: mockClientOrgs,
    isLoading: mockIsLoading,
    error: mockError,
    refetch: mockRefetch,
  }),
}));

let mockActiveOrgId: string | null = createOrgId('employer-001');
jest.mock('@/shared/store/app.store', () => ({
  useAppStore: (selector: (s: Record<string, unknown>) => unknown) =>
    selector({ activeOrgId: mockActiveOrgId }),
}));
jest.mock('@/shared/store/app.selectors', () => ({
  selectActiveOrgId: (s: Record<string, unknown>) => s.activeOrgId,
}));

jest.mock('../../components/ClientOrgCard', () => ({
  ClientOrgCard: ({
    clientOrg,
    onPress,
    testID,
  }: {
    clientOrg: ClientOrg;
    onPress: (o: ClientOrg) => void;
    testID?: string;
  }) => {
    const { View, Text, Pressable } = require('react-native');
    return (
      <Pressable testID={testID} onPress={() => onPress(clientOrg)}>
        <Text>{clientOrg.name}</Text>
      </Pressable>
    );
  },
}));

jest.mock('../../components/CreateClientOrgDialog', () => ({
  CreateClientOrgDialog: ({ visible, testID }: { visible: boolean; testID?: string }) => {
    const { View, Text } = require('react-native');
    return visible ? <View testID={testID}><Text>CreateDialog</Text></View> : null;
  },
}));

jest.mock('@/shared/components/feedback/EmptyState', () => ({
  EmptyState: ({
    title,
    testID,
    action,
  }: {
    title: string;
    testID?: string;
    action?: { label: string; onPress: () => void };
  }) => {
    const { View, Text, Pressable } = require('react-native');
    return (
      <View testID={testID}>
        <Text>{title}</Text>
        {action && <Pressable testID="empty-action-btn" onPress={action.onPress}><Text>{action.label}</Text></Pressable>}
      </View>
    );
  },
}));

jest.mock('@/shared/components/feedback/NetworkErrorFallback', () => ({
  NetworkErrorFallback: ({ testID }: { testID?: string }) => {
    const { View, Text } = require('react-native');
    return <View testID={testID}><Text>Network Error</Text></View>;
  },
}));

jest.mock('@/shared/components/ui/Skeleton', () => ({
  Skeleton: (props: Record<string, unknown>) => {
    const { View } = require('react-native');
    return <View testID="skeleton" {...props} />;
  },
}));

// ─── Import (after mocks) ────────────────────────────────────────────────────

import { ClientOrgsScreen } from '../ClientOrgsScreen';

// ─── Fixtures ───────────────────────────────────────────────────────────────

const CLIENT_ORG_1: ClientOrg = {
  id: createOrgId('client-001'),
  name: 'Retail Corp',
  slug: 'retail-corp',
  description: null,
  orgType: 'client',
  parentOrgId: createOrgId('employer-001'),
  createdAt: '2026-03-01T10:00:00Z',
  updatedAt: '2026-03-01T10:00:00Z',
};

const CLIENT_ORG_2: ClientOrg = {
  id: createOrgId('client-002'),
  name: 'Finance Ltd',
  slug: 'finance-ltd',
  description: null,
  orgType: 'client',
  parentOrgId: createOrgId('employer-001'),
  createdAt: '2026-04-01T08:00:00Z',
  updatedAt: '2026-04-01T08:00:00Z',
};

// ─── Helpers ────────────────────────────────────────────────────────────────

function renderScreen() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <ClientOrgsScreen />
    </QueryClientProvider>,
  );
}

// ─── Tests ──────────────────────────────────────────────────────────────────

describe('ClientOrgsScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockClientOrgs = [];
    mockIsLoading = false;
    mockError = null;
    mockActiveOrgId = createOrgId('employer-001');
  });

  it('renders screen with testID', () => {
    renderScreen();
    expect(screen.getByTestId('client-orgs-screen')).toBeTruthy();
  });

  it('shows loading skeletons when isLoading', () => {
    mockIsLoading = true;
    renderScreen();
    expect(screen.getAllByTestId('skeleton').length).toBeGreaterThan(0);
  });

  it('shows empty state when no clients exist', () => {
    renderScreen();
    expect(screen.getByTestId('client-orgs-empty')).toBeTruthy();
    expect(screen.getByText('No client workspaces yet')).toBeTruthy();
  });

  it('shows error fallback when error exists and no clients', () => {
    mockError = { code: 'HTTP_500', message: 'Server error' };
    renderScreen();
    expect(screen.getByTestId('client-orgs-error')).toBeTruthy();
    expect(screen.getByText('Network Error')).toBeTruthy();
  });

  it('renders a card for each client org', () => {
    mockClientOrgs = [CLIENT_ORG_1, CLIENT_ORG_2];
    renderScreen();
    expect(screen.getByText('Retail Corp')).toBeTruthy();
    expect(screen.getByText('Finance Ltd')).toBeTruthy();
  });

  it('shows correct client count in header', () => {
    mockClientOrgs = [CLIENT_ORG_1, CLIENT_ORG_2];
    renderScreen();
    expect(screen.getByText('2 clients')).toBeTruthy();
  });

  it('shows "1 client" (singular) when exactly one client', () => {
    mockClientOrgs = [CLIENT_ORG_1];
    renderScreen();
    expect(screen.getByText('1 client')).toBeTruthy();
  });

  it('navigates to ClientOrgDetail when a card is pressed', () => {
    mockClientOrgs = [CLIENT_ORG_1];
    renderScreen();

    fireEvent.press(screen.getByTestId(`client-org-card-${CLIENT_ORG_1.id}`));

    expect(mockNavigate).toHaveBeenCalledWith('ClientOrgDetail', {
      clientOrgId: CLIENT_ORG_1.id,
    });
  });

  it('opens CreateClientOrgDialog when New Client button is pressed', () => {
    renderScreen();

    fireEvent.press(screen.getByTestId('create-client-org-btn'));

    expect(screen.getByTestId('create-client-org-dialog')).toBeTruthy();
  });

  it('opens CreateClientOrgDialog from empty state action', () => {
    renderScreen();

    fireEvent.press(screen.getByTestId('empty-action-btn'));

    expect(screen.getByTestId('create-client-org-dialog')).toBeTruthy();
  });
});
