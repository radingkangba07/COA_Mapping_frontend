import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';
import { ConfirmedReviewModal } from '../ConfirmedReviewModal';

// ─── Mocks ──────────────────────────────────────────────────────────────────

jest.mock('lucide-react-native', () => {
  const RN = require('react-native');
  const R = require('react');
  const icon = (name: string) => {
    const Icon = (props: Record<string, unknown>) =>
      R.createElement(RN.View, { testID: `${name}-icon`, ...props });
    Icon.displayName = name;
    return Icon;
  };
  return new Proxy(
    { __esModule: true },
    { get: (_: Record<string, unknown>, prop: string) => icon(prop) },
  );
});

jest.mock('@/config/theme', () => ({
  colors: { foreground: '#09090B', primary: '#2563EB', mutedForeground: '#71717A' },
}));

jest.mock('@/shared/utils/string.utils', () => ({
  cn: (...args: (string | undefined | null | false)[]) => args.filter(Boolean).join(' '),
}));

jest.mock('@/shared/components/ui/Badge', () => {
  const R = require('react');
  const RN = require('react-native');
  return {
    Badge: ({ children, testID }: { children: React.ReactNode; testID?: string }) =>
      R.createElement(RN.View, { testID: testID ?? 'badge' }, children),
  };
});

jest.mock('@/shared/constants/mapping-confidence', () => ({
  CONFIDENCE_THRESHOLDS: { HIGH: 90, MEDIUM: 70 },
}));

// Store mock — populated per test via mockGroupedMappings
let mockGroupedMappings: unknown[] = [];

jest.mock('@/features/migration/store/migration.store', () => ({
  useMigrationStore: (selector: (s: unknown) => unknown) =>
    selector({ groupedMappings: mockGroupedMappings }),
}));

// ─── Helpers ────────────────────────────────────────────────────────────────

function makeAccount(score: number, name: string, num: string): {
  source_number: string;
  source_name: string;
  target_name: string;
  target_number: null;
  score: number;
  remark: string;
  is_active?: boolean;
  status?: string;
} {
  return { source_number: num, source_name: name, target_name: `T-${name}`, target_number: null, score, remark: '' };
}

function makeGroup(sourceType: string, targetType: string, accounts: ReturnType<typeof makeAccount>[]) {
  return { source_type: sourceType, target_type: targetType, confidence: 90, accounts };
}

// ─── Tests ──────────────────────────────────────────────────────────────────

describe('ConfirmedReviewModal', () => {
  const onClose = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    mockGroupedMappings = [
      makeGroup('Asset', 'Assets', [
        makeAccount(95, 'Cash', '1000'),       // high
        makeAccount(75, 'Debtors', '2000'),    // medium
        makeAccount(50, 'Sundry', '3000'),     // low
      ]),
    ];
  });

  it('renders nothing when visible is false', () => {
    const { toJSON } = render(
      <ConfirmedReviewModal visible={false} level={null} onClose={onClose} />,
    );
    // Modal with visible=false renders null content
    expect(screen.queryByTestId('confirmed-review-modal')).toBeNull();
  });

  it('renders the modal when visible is true', () => {
    render(<ConfirmedReviewModal visible={true} level={null} onClose={onClose} />);
    expect(screen.getByTestId('confirmed-review-modal')).toBeTruthy();
  });

  it('shows "All Confirmed Accounts" title when level is null', () => {
    render(<ConfirmedReviewModal visible={true} level={null} onClose={onClose} />);
    expect(screen.getByText('All Confirmed Accounts')).toBeTruthy();
  });

  it('shows "High Score (90%+)" title when level is high', () => {
    render(<ConfirmedReviewModal visible={true} level="high" onClose={onClose} />);
    expect(screen.getByText('High Score (90%+)')).toBeTruthy();
  });

  it('shows "Medium Score (70–89%)" title when level is medium', () => {
    render(<ConfirmedReviewModal visible={true} level="medium" onClose={onClose} />);
    expect(screen.getByText('Medium Score (70–89%)')).toBeTruthy();
  });

  it('shows "Low Score (<70%)" title when level is low', () => {
    render(<ConfirmedReviewModal visible={true} level="low" onClose={onClose} />);
    expect(screen.getByText('Low Score (<70%)')).toBeTruthy();
  });

  it('shows only high-band accounts when level is high', () => {
    render(<ConfirmedReviewModal visible={true} level="high" onClose={onClose} />);
    expect(screen.getByText('Cash')).toBeTruthy();
    expect(screen.queryByText('Debtors')).toBeNull();
    expect(screen.queryByText('Sundry')).toBeNull();
  });

  it('shows only medium-band accounts when level is medium', () => {
    render(<ConfirmedReviewModal visible={true} level="medium" onClose={onClose} />);
    expect(screen.getByText('Debtors')).toBeTruthy();
    expect(screen.queryByText('Cash')).toBeNull();
    expect(screen.queryByText('Sundry')).toBeNull();
  });

  it('shows only low-band accounts when level is low', () => {
    render(<ConfirmedReviewModal visible={true} level="low" onClose={onClose} />);
    expect(screen.getByText('Sundry')).toBeTruthy();
    expect(screen.queryByText('Cash')).toBeNull();
    expect(screen.queryByText('Debtors')).toBeNull();
  });

  it('shows only status=confirmed accounts when level is null', () => {
    mockGroupedMappings = [
      makeGroup('Asset', 'Assets', [
        { ...makeAccount(95, 'Cash', '1000'), status: 'confirmed' },
        { ...makeAccount(75, 'Debtors', '2000'), status: 'pending' },
        { ...makeAccount(50, 'Sundry', '3000'), status: 'confirmed' },
      ]),
    ];
    render(<ConfirmedReviewModal visible={true} level={null} onClose={onClose} />);
    expect(screen.getByText('Cash')).toBeTruthy();
    expect(screen.queryByText('Debtors')).toBeNull();
    expect(screen.getByText('Sundry')).toBeTruthy();
  });

  it('shows empty state when level is null and no accounts have status=confirmed', () => {
    mockGroupedMappings = [
      makeGroup('Asset', 'Assets', [
        { ...makeAccount(95, 'Cash', '1000'), status: 'pending' },
      ]),
    ];
    render(<ConfirmedReviewModal visible={true} level={null} onClose={onClose} />);
    expect(screen.getByText('No confirmed accounts found.')).toBeTruthy();
  });

  it('shows correct account count in header', () => {
    render(<ConfirmedReviewModal visible={true} level="high" onClose={onClose} />);
    expect(screen.getByText('1 accounts')).toBeTruthy();
  });

  it('shows empty state when no accounts match the band', () => {
    mockGroupedMappings = [
      makeGroup('Asset', 'Assets', [makeAccount(75, 'Debtors', '2000')]),
    ];
    render(<ConfirmedReviewModal visible={true} level="high" onClose={onClose} />);
    expect(screen.getByText('No confirmed accounts found.')).toBeTruthy();
  });

  it('shows empty state when groupedMappings is empty', () => {
    mockGroupedMappings = [];
    render(<ConfirmedReviewModal visible={true} level={null} onClose={onClose} />);
    expect(screen.getByText('No confirmed accounts found.')).toBeTruthy();
  });

  it('calls onClose when close button is pressed', () => {
    render(<ConfirmedReviewModal visible={true} level={null} onClose={onClose} />);
    fireEvent.press(screen.getByTestId('confirmed-review-modal-close'));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('excludes inactive accounts (is_active = false)', () => {
    mockGroupedMappings = [
      makeGroup('Asset', 'Assets', [
        { ...makeAccount(95, 'Cash', '1000'), is_active: false },
        makeAccount(92, 'Bank', '1001'),
      ]),
    ];
    render(<ConfirmedReviewModal visible={true} level="high" onClose={onClose} />);
    expect(screen.queryByText('Cash')).toBeNull();
    expect(screen.getByText('Bank')).toBeTruthy();
  });

  it('renders accounts from multiple groups', () => {
    mockGroupedMappings = [
      makeGroup('Asset', 'Assets', [makeAccount(95, 'Cash', '1000')]),
      makeGroup('Liability', 'Liabilities', [makeAccount(92, 'Creditors', '4000')]),
    ];
    render(<ConfirmedReviewModal visible={true} level="high" onClose={onClose} />);
    expect(screen.getByText('Cash')).toBeTruthy();
    expect(screen.getByText('Creditors')).toBeTruthy();
  });
});
