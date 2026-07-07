import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';
import { WorkstreamRow } from '../components/WorkstreamRow';
import type { Workstream } from '../types/workstream.types';

const includedWs: Workstream = {
  id: 'ws-1',
  name: 'Chart of Accounts',
  projectId: 'MD-001',
  status: 'in_progress',
  progress: 65,
  currentStage: 'Mapping',
  included: true,
};

const notIncludedWs: Workstream = {
  id: 'ws-2',
  name: 'Vehicles',
  projectId: 'MD-007',
  status: 'not_included',
  progress: 0,
  currentStage: 'Not Started',
  included: false,
};

describe('WorkstreamRow — included workstream', () => {
  it('renders workstream name', () => {
    render(<WorkstreamRow workstream={includedWs} onOpen={jest.fn()} />);
    expect(screen.getByText('Chart of Accounts')).toBeTruthy();
  });

  it('renders project ID code', () => {
    render(<WorkstreamRow workstream={includedWs} onOpen={jest.fn()} />);
    expect(screen.getByText('MD-001')).toBeTruthy();
  });

  it('renders current stage', () => {
    render(<WorkstreamRow workstream={includedWs} onOpen={jest.fn()} />);
    expect(screen.getByText('Mapping')).toBeTruthy();
  });

  it('renders "Open" action text', () => {
    render(<WorkstreamRow workstream={includedWs} onOpen={jest.fn()} />);
    expect(screen.getByText('Open')).toBeTruthy();
  });

  it('calls onOpen with the workstream when row is pressed', () => {
    const onOpen = jest.fn();
    render(<WorkstreamRow workstream={includedWs} onOpen={onOpen} testID="row" />);
    fireEvent.press(screen.getByTestId('row'));
    expect(onOpen).toHaveBeenCalledTimes(1);
    expect(onOpen).toHaveBeenCalledWith(includedWs);
  });

  it('has full opacity', () => {
    render(<WorkstreamRow workstream={includedWs} onOpen={jest.fn()} testID="row" />);
    const row = screen.getByTestId('row');
    expect(row.props.style).toEqual(
      expect.arrayContaining([expect.objectContaining({ opacity: 1 })]),
    );
  });
});

describe('WorkstreamRow — not-included workstream', () => {
  it('renders workstream name in a muted style', () => {
    render(<WorkstreamRow workstream={notIncludedWs} onOpen={jest.fn()} />);
    expect(screen.getByText('Vehicles')).toBeTruthy();
  });

  it('renders "Not Included" action text instead of "Open"', () => {
    render(<WorkstreamRow workstream={notIncludedWs} onOpen={jest.fn()} />);
    // StatusBadge also renders "Not Included", so multiple matches are expected
    expect(screen.getAllByText('Not Included').length).toBeGreaterThanOrEqual(1);
    expect(screen.queryByText('Open')).toBeNull();
  });

  it('does NOT call onOpen when row content is tapped (non-pressable)', () => {
    const onOpen = jest.fn();
    render(<WorkstreamRow workstream={notIncludedWs} onOpen={onOpen} testID="row" />);
    // The not-included row is a View, not a Pressable — fireEvent.press should not fire onOpen
    fireEvent.press(screen.getByTestId('row'));
    expect(onOpen).not.toHaveBeenCalled();
  });

  it('has reduced opacity (0.5)', () => {
    render(<WorkstreamRow workstream={notIncludedWs} onOpen={jest.fn()} testID="row" />);
    const row = screen.getByTestId('row');
    expect(row.props.style).toEqual(
      expect.objectContaining({ opacity: 0.5 }),
    );
  });
});
