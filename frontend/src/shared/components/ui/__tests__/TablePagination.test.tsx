import React from 'react';
import { View } from 'react-native';
import { render, screen, fireEvent } from '@testing-library/react-native';
import { TablePagination } from '../TablePagination';

// The Select menu opens via triggerRef.measureInWindow(callback); the test
// renderer never fires it, so patch the host View prototype to invoke it
// synchronously (mirrors ConnectionMethodSelect.test/MemberAddControl.test).
beforeAll(() => {
  (
    View.prototype as unknown as {
      measureInWindow: (
        cb: (x: number, y: number, w: number, h: number) => void,
      ) => void;
    }
  ).measureInWindow = (cb) => cb(0, 0, 100, 40);
});

function renderPagination(overrides: Partial<React.ComponentProps<typeof TablePagination>> = {}) {
  return render(
    <TablePagination
      page={0}
      pageCount={43}
      startRow={1}
      endRow={15}
      total={640}
      onPageChange={jest.fn()}
      pageSize={15}
      onPageSizeChange={jest.fn()}
      testID="pager"
      {...overrides}
    />,
  );
}

describe('TablePagination', () => {
  it('renders nothing for a single page', () => {
    const { toJSON } = renderPagination({ pageCount: 1 });
    expect(toJSON()).toBeNull();
  });

  it('renders the page-size selector with the current value', () => {
    renderPagination();
    expect(screen.getByTestId('pager-page-size')).toBeTruthy();
    expect(screen.getByText('15 per page')).toBeTruthy();
  });

  it('opens the page-size dropdown and reports a coerced number', () => {
    const onPageSizeChange = jest.fn();
    renderPagination({ onPageSizeChange });

    fireEvent.press(screen.getByTestId('pager-page-size-trigger'));
    fireEvent.press(screen.getByTestId('pager-page-size-option-50'));

    expect(onPageSizeChange).toHaveBeenCalledWith(50);
    expect(onPageSizeChange).not.toHaveBeenCalledWith('50');
  });

  it('pins page 1 and renders both ellipses for a page deep in a large list', () => {
    renderPagination({ page: 19, pageCount: 43 });

    expect(screen.getAllByText('…')).toHaveLength(2);
    expect(screen.getByTestId('pager-page-1')).toBeTruthy();
    expect(screen.getByTestId('pager-page-20')).toBeTruthy();
    expect(screen.getByTestId('pager-page-21')).toBeTruthy();
    expect(screen.getByTestId('pager-page-22')).toBeTruthy();
    expect(screen.getByTestId('pager-page-43')).toBeTruthy();
    expect(screen.queryByTestId('pager-page-19')).toBeNull();
    expect(screen.queryByTestId('pager-page-10')).toBeNull();
  });

  it('collapses total=4 down to every page, with page 1 folded in and no ellipsis', () => {
    renderPagination({ page: 2, pageCount: 4 });

    expect(screen.queryByText('…')).toBeNull();
    expect(screen.getByTestId('pager-page-1')).toBeTruthy();
    expect(screen.getByTestId('pager-page-2')).toBeTruthy();
    expect(screen.getByTestId('pager-page-3')).toBeTruthy();
    expect(screen.getByTestId('pager-page-4')).toBeTruthy();
  });

  it('folds page 1 into the window with no ellipsis when it is adjacent (page 2 of a large list)', () => {
    renderPagination({ page: 1, pageCount: 10 });

    expect(screen.getAllByText('…')).toHaveLength(1);
    expect(screen.getByTestId('pager-page-1')).toBeTruthy();
    expect(screen.getByTestId('pager-page-2')).toBeTruthy();
    expect(screen.getByTestId('pager-page-3')).toBeTruthy();
    expect(screen.getByTestId('pager-page-4')).toBeTruthy();
    expect(screen.getByTestId('pager-page-10')).toBeTruthy();
  });

  it('never duplicates page 1 when the collapsed window already starts there', () => {
    renderPagination({ page: 2, pageCount: 3 });

    expect(screen.queryByText('…')).toBeNull();
    expect(screen.getByTestId('pager-page-1')).toBeTruthy();
    expect(screen.getByTestId('pager-page-2')).toBeTruthy();
    expect(screen.getByTestId('pager-page-3')).toBeTruthy();
  });

  it('disables Prev on the first page and Next on the last page', () => {
    const { rerender } = renderPagination({ page: 0 });
    expect(screen.getByTestId('pager-prev')).toHaveProp('accessibilityState', expect.objectContaining({ disabled: true }));
    expect(screen.getByTestId('pager-next')).toHaveProp('accessibilityState', expect.objectContaining({ disabled: false }));

    rerender(
      <TablePagination
        page={42}
        pageCount={43}
        startRow={631}
        endRow={640}
        total={640}
        onPageChange={jest.fn()}
        pageSize={15}
        onPageSizeChange={jest.fn()}
        testID="pager"
      />,
    );
    expect(screen.getByTestId('pager-prev')).toHaveProp('accessibilityState', expect.objectContaining({ disabled: false }));
    expect(screen.getByTestId('pager-next')).toHaveProp('accessibilityState', expect.objectContaining({ disabled: true }));
    expect(screen.getByTestId('pager-page-1')).toBeTruthy();
    expect(screen.getByTestId('pager-page-41')).toBeTruthy();
    expect(screen.getByTestId('pager-page-42')).toBeTruthy();
    expect(screen.getByTestId('pager-page-43')).toBeTruthy();
  });

  it('keeps Next enabled on the second-to-last page even though the pair has collapsed', () => {
    renderPagination({ page: 2, pageCount: 4 });
    expect(screen.getByTestId('pager-next')).toHaveProp('accessibilityState', expect.objectContaining({ disabled: false }));
  });
});
