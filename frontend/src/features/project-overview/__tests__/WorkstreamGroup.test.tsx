import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';
import { WorkstreamGroup } from '../components/WorkstreamGroup';
import type { Workstream } from '../types/workstream.types';

const ws = (overrides: Partial<Workstream>): Workstream => ({
  id: 'ws-1',
  name: 'Chart of Accounts',
  projectId: 'MD-001',
  status: 'in_progress',
  progress: 65,
  currentStage: 'Mapping',
  included: true,
  ...overrides,
});

const WORKSTREAMS: Workstream[] = [
  ws({ id: 'a', name: 'Chart of Accounts', included: true }),
  ws({ id: 'b', name: 'Customers',          included: true }),
  ws({ id: 'c', name: 'Contacts',           included: false, status: 'not_included' }),
];

describe('WorkstreamGroup', () => {
  it('renders the group title', () => {
    render(
      <WorkstreamGroup title="Master Data" workstreams={WORKSTREAMS} onOpen={jest.fn()} expanded />,
    );
    expect(screen.getByText('Master Data')).toBeTruthy();
  });

  it('shows correct "X of Y selected" badge (included vs total)', () => {
    render(
      <WorkstreamGroup title="Master Data" workstreams={WORKSTREAMS} onOpen={jest.fn()} expanded />,
    );
    // 2 included out of 3 total
    expect(screen.getByText('2 of 3 selected')).toBeTruthy();
  });

  it('renders workstream rows when expanded=true', () => {
    render(
      <WorkstreamGroup title="Master Data" workstreams={WORKSTREAMS} onOpen={jest.fn()} expanded testID="grp" />,
    );
    expect(screen.getByTestId('grp-table')).toBeTruthy();
    expect(screen.getByText('Chart of Accounts')).toBeTruthy();
  });

  it('hides workstream rows when expanded=false', () => {
    render(
      <WorkstreamGroup title="Master Data" workstreams={WORKSTREAMS} onOpen={jest.fn()} expanded={false} testID="grp" />,
    );
    expect(screen.queryByTestId('grp-table')).toBeNull();
    expect(screen.queryByText('Chart of Accounts')).toBeNull();
  });

  it('calls onToggle when header is pressed (controlled mode)', () => {
    const onToggle = jest.fn();
    render(
      <WorkstreamGroup
        title="Master Data"
        workstreams={WORKSTREAMS}
        onOpen={jest.fn()}
        expanded
        onToggle={onToggle}
        testID="grp"
      />,
    );
    fireEvent.press(screen.getByTestId('grp-header'));
    expect(onToggle).toHaveBeenCalledTimes(1);
  });

  it('toggles internally when no onToggle provided (uncontrolled)', () => {
    render(
      <WorkstreamGroup title="Master Data" workstreams={WORKSTREAMS} onOpen={jest.fn()} testID="grp" />,
    );
    // Starts expanded by default
    expect(screen.getByTestId('grp-table')).toBeTruthy();
    // Press to collapse
    fireEvent.press(screen.getByTestId('grp-header'));
    expect(screen.queryByTestId('grp-table')).toBeNull();
    // Press again to expand
    fireEvent.press(screen.getByTestId('grp-header'));
    expect(screen.getByTestId('grp-table')).toBeTruthy();
  });

  it('passes onOpen through to workstream rows', () => {
    const onOpen = jest.fn();
    render(
      <WorkstreamGroup title="G" workstreams={WORKSTREAMS} onOpen={onOpen} expanded testID="grp" />,
    );
    // Press an included row
    fireEvent.press(screen.getByTestId('grp-row-a'));
    expect(onOpen).toHaveBeenCalledWith(WORKSTREAMS[0]);
  });

  it('not-included rows do not trigger onOpen', () => {
    const onOpen = jest.fn();
    render(
      <WorkstreamGroup title="G" workstreams={WORKSTREAMS} onOpen={onOpen} expanded testID="grp" />,
    );
    fireEvent.press(screen.getByTestId('grp-row-c'));
    expect(onOpen).not.toHaveBeenCalled();
  });

  it('renders table column headers when expanded', () => {
    render(
      <WorkstreamGroup title="G" workstreams={WORKSTREAMS} onOpen={jest.fn()} expanded />,
    );
    expect(screen.getByText('Workstream')).toBeTruthy();
    expect(screen.getByText('Status')).toBeTruthy();
    expect(screen.getByText('Progress')).toBeTruthy();
    expect(screen.getByText('Action')).toBeTruthy();
  });
});
