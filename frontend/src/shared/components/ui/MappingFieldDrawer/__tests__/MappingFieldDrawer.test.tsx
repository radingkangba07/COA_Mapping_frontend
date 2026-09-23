import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';
import { MappingFieldDrawer } from '../MappingFieldDrawer';
import type { MappingRow } from '@/features/master-data-wizard/utils/mappingRows';

function makeRow(overrides: Partial<MappingRow> = {}): MappingRow {
  return {
    id: 'f1',
    name: 'Item Name',
    sdtype: 'Text',
    role: 'Display name',
    samples: ['Hex Bolt M10', 'Flat Washer'],
    sampleLine: 'Hex Bolt M10  ·  Flat Washer',
    status: 'Review required',
    targetId: 'name',
    targetLabel: 'Name',
    targetDtype: 'Char',
    handoff: undefined,
    handoffFind: 'info',
    evidence: [{ code: 'name', short: 'Name', label: 'Field name match' }],
    conf: 82,
    validation: 'Compatible',
    validationImpact: 'clean',
    statusImpact: 'review',
    why: undefined,
    ...overrides,
  };
}

const noop = (): void => {};

describe('MappingFieldDrawer', () => {
  it('renders nothing (no title) when there is no open row', () => {
    render(
      <MappingFieldDrawer
        row={null}
        onClose={noop}
        onPrev={noop}
        onNext={noop}
        isAccepted={false}
        isExcluded={false}
        onAccept={noop}
        onExclude={noop}
        testID="drawer"
      />,
    );
    expect(screen.queryByTestId('drawer-title')).toBeNull();
  });

  it('renders the header summary line and status badge', () => {
    render(
      <MappingFieldDrawer
        row={makeRow()}
        onClose={noop}
        onPrev={noop}
        onNext={noop}
        isAccepted={false}
        isExcluded={false}
        onAccept={noop}
        onExclude={noop}
        testID="drawer"
      />,
    );
    expect(screen.getByTestId('drawer-title').props.children).toBe('Item Name');
    expect(screen.getByText('Review required')).toBeTruthy();
    expect(screen.getByTestId('drawer-summary').props.children.join('')).toBe('Text → Name (Char) · 82% confidence');
  });

  it('shows the AI interpretation block only when row.why is present', () => {
    const { rerender } = render(
      <MappingFieldDrawer
        row={makeRow({ why: undefined })}
        onClose={noop}
        onPrev={noop}
        onNext={noop}
        isAccepted={false}
        isExcluded={false}
        onAccept={noop}
        onExclude={noop}
        testID="drawer"
      />,
    );
    expect(screen.queryByText('AI interpretation')).toBeNull();

    rerender(
      <MappingFieldDrawer
        row={makeRow({ why: 'Column name closely matches the target field.' })}
        onClose={noop}
        onPrev={noop}
        onNext={noop}
        isAccepted={false}
        isExcluded={false}
        onAccept={noop}
        onExclude={noop}
        testID="drawer"
      />,
    );
    expect(screen.getByText('AI interpretation')).toBeTruthy();
    expect(screen.getByText('Column name closely matches the target field.')).toBeTruthy();
  });

  it('shows the handoff badge only when row.handoff is present', () => {
    const { rerender } = render(
      <MappingFieldDrawer
        row={makeRow({ handoff: undefined })}
        onClose={noop}
        onPrev={noop}
        onNext={noop}
        isAccepted={false}
        isExcluded={false}
        onAccept={noop}
        onExclude={noop}
        testID="drawer"
      />,
    );
    expect(screen.queryByTestId('drawer-handoff')).toBeNull();

    rerender(
      <MappingFieldDrawer
        row={makeRow({ handoff: 'Format conversion required', handoffFind: 'warn' })}
        onClose={noop}
        onPrev={noop}
        onNext={noop}
        isAccepted={false}
        isExcluded={false}
        onAccept={noop}
        onExclude={noop}
        testID="drawer"
      />,
    );
    expect(screen.getByTestId('drawer-handoff')).toBeTruthy();
    expect(screen.getByText('Format conversion required')).toBeTruthy();
  });

  it('renders evidence and sample-value chips', () => {
    render(
      <MappingFieldDrawer
        row={makeRow()}
        onClose={noop}
        onPrev={noop}
        onNext={noop}
        isAccepted={false}
        isExcluded={false}
        onAccept={noop}
        onExclude={noop}
        testID="drawer"
      />,
    );
    expect(screen.getByTestId('drawer-evidence')).toBeTruthy();
    expect(screen.getByText('Hex Bolt M10')).toBeTruthy();
    expect(screen.getByText('Flat Washer')).toBeTruthy();
  });

  it('calls the same onAccept/onExclude handlers the row actions use, and gates them the same way', () => {
    const onAccept = jest.fn();
    const onExclude = jest.fn();
    render(
      <MappingFieldDrawer
        row={makeRow({ status: 'Suggested' })}
        onClose={noop}
        onPrev={noop}
        onNext={noop}
        isAccepted={false}
        isExcluded={false}
        onAccept={onAccept}
        onExclude={onExclude}
        testID="drawer"
      />,
    );

    fireEvent.press(screen.getByTestId('drawer-accept'));
    expect(onAccept).toHaveBeenCalledTimes(1);

    fireEvent.press(screen.getByTestId('drawer-exclude'));
    expect(onExclude).toHaveBeenCalledTimes(1);
  });

  it('shows settled text instead of a button once accepted or excluded', () => {
    render(
      <MappingFieldDrawer
        row={makeRow({ status: 'Suggested' })}
        onClose={noop}
        onPrev={noop}
        onNext={noop}
        isAccepted={true}
        isExcluded={false}
        onAccept={noop}
        onExclude={noop}
        testID="drawer"
      />,
    );
    expect(screen.queryByTestId('drawer-accept')).toBeNull();
    expect(screen.getByText('Accepted')).toBeTruthy();
  });

  it('hides Accept when the status cannot be accepted (already Excluded)', () => {
    render(
      <MappingFieldDrawer
        row={makeRow({ status: 'Excluded' })}
        onClose={noop}
        onPrev={noop}
        onNext={noop}
        isAccepted={false}
        isExcluded={true}
        onAccept={noop}
        onExclude={noop}
        testID="drawer"
      />,
    );
    expect(screen.queryByTestId('drawer-accept')).toBeNull();
    expect(screen.queryByTestId('drawer-exclude')).toBeNull();
  });

  it('fires onPrev/onNext/onClose from the header nav buttons', () => {
    const onPrev = jest.fn();
    const onNext = jest.fn();
    const onClose = jest.fn();
    render(
      <MappingFieldDrawer
        row={makeRow()}
        onClose={onClose}
        onPrev={onPrev}
        onNext={onNext}
        isAccepted={false}
        isExcluded={false}
        onAccept={noop}
        onExclude={noop}
        testID="drawer"
      />,
    );
    fireEvent.press(screen.getByTestId('drawer-prev'));
    fireEvent.press(screen.getByTestId('drawer-next'));
    fireEvent.press(screen.getByTestId('drawer-close'));
    expect(onPrev).toHaveBeenCalledTimes(1);
    expect(onNext).toHaveBeenCalledTimes(1);
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
