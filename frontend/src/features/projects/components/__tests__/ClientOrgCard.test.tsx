import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';
import { createOrgId } from '@/shared/types/common.types';
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

jest.mock('@/config/theme', () => ({
  colors: { accent: '#2563EB', mutedForeground: '#9E9E9E' },
}));

jest.mock('@/shared/utils/date.utils', () => ({
  formatDate: (d: string) => `formatted:${d}`,
}));

jest.mock('@/shared/components/ui/Card', () => ({
  Card: ({ children, testID }: { children: React.ReactNode; testID?: string }) => {
    const { View } = require('react-native');
    return <View testID={testID}>{children}</View>;
  },
}));

// ─── Import (after mocks) ────────────────────────────────────────────────────

import { ClientOrgCard } from '../ClientOrgCard';

// ─── Fixtures ───────────────────────────────────────────────────────────────

const PARENT_ORG_ID = createOrgId('employer-001');

const mockClientOrg: ClientOrg = {
  id: createOrgId('client-001'),
  name: 'Retail Corp',
  slug: 'retail-corp',
  description: 'A retail client',
  orgType: 'client',
  parentOrgId: PARENT_ORG_ID,
  createdAt: '2026-03-01T10:00:00Z',
  updatedAt: '2026-03-02T11:00:00Z',
};

const mockClientOrgNoDescription: ClientOrg = {
  ...mockClientOrg,
  id: createOrgId('client-002'),
  name: 'Finance Ltd',
  description: null,
};

// ─── Tests ──────────────────────────────────────────────────────────────────

describe('ClientOrgCard', () => {
  const mockOnPress = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders the client org name', () => {
    render(
      <ClientOrgCard clientOrg={mockClientOrg} onPress={mockOnPress} testID="card" />,
    );

    expect(screen.getByText('Retail Corp')).toBeTruthy();
  });

  it('renders the description when present', () => {
    render(
      <ClientOrgCard clientOrg={mockClientOrg} onPress={mockOnPress} />,
    );

    expect(screen.getByText('A retail client')).toBeTruthy();
  });

  it('does not render description when null', () => {
    render(
      <ClientOrgCard clientOrg={mockClientOrgNoDescription} onPress={mockOnPress} />,
    );

    expect(screen.queryByText('A retail client')).toBeNull();
  });

  it('renders a formatted created date', () => {
    render(
      <ClientOrgCard clientOrg={mockClientOrg} onPress={mockOnPress} />,
    );

    expect(screen.getByText('Created formatted:2026-03-01T10:00:00Z')).toBeTruthy();
  });

  it('calls onPress with the clientOrg when pressed', () => {
    render(
      <ClientOrgCard
        clientOrg={mockClientOrg}
        onPress={mockOnPress}
        testID="card"
      />,
    );

    fireEvent.press(screen.getByTestId('card-press'));

    expect(mockOnPress).toHaveBeenCalledTimes(1);
    expect(mockOnPress).toHaveBeenCalledWith(mockClientOrg);
  });

  it('applies testID to the pressable element', () => {
    render(
      <ClientOrgCard clientOrg={mockClientOrg} onPress={mockOnPress} testID="my-card" />,
    );

    expect(screen.getByTestId('my-card-press')).toBeTruthy();
  });
});
