import React from 'react';
import {
  render,
  screen,
  fireEvent,
  within,
} from '@testing-library/react-native';
import type { McpFormHeader } from '../../services/mcp.service';

type HostElement = ReturnType<typeof screen.getByTestId>;

jest.mock('@/config/theme', () => ({
  colors: {
    foreground: '#09090B',
    mutedForeground: '#71717A',
    destructive: '#DC2626',
  },
}));

import { McpHeadersEditor } from '../McpHeadersEditor';

function textInput(testID: string): HostElement {
  const [input] = within(screen.getByTestId(testID)).UNSAFE_getAllByType(
    'TextInput' as unknown as React.ComponentType,
  );
  return input;
}

describe('McpHeadersEditor', () => {
  it('renders the empty state when there are no headers', () => {
    render(<McpHeadersEditor headers={[]} onChange={jest.fn()} />);
    expect(screen.getByTestId('mcp-headers-empty')).toBeTruthy();
  });

  it('appends a new blank header immutably on add', () => {
    const onChange = jest.fn();
    render(<McpHeadersEditor headers={[]} onChange={onChange} />);

    fireEvent.press(screen.getByTestId('mcp-headers-add'));

    expect(onChange).toHaveBeenCalledTimes(1);
    expect(onChange.mock.calls[0][0]).toEqual([
      { id: 'h-0', key: '', value: '' },
    ]);
  });

  it('updates a single header without mutating the input array', () => {
    const headers: readonly McpFormHeader[] = [
      { id: 'h-0', key: '', value: '' },
    ];
    const onChange = jest.fn();
    render(<McpHeadersEditor headers={headers} onChange={onChange} />);

    fireEvent.changeText(textInput('mcp-headers-key-0'), 'X-Trace');

    expect(onChange).toHaveBeenCalledWith([
      { id: 'h-0', key: 'X-Trace', value: '' },
    ]);
    // Source array is untouched (immutable update).
    expect(headers[0]).toEqual({ id: 'h-0', key: '', value: '' });
  });

  it('removes the targeted header on delete', () => {
    const headers: readonly McpFormHeader[] = [
      { id: 'h-0', key: 'A', value: '1' },
      { id: 'h-1', key: 'B', value: '2' },
    ];
    const onChange = jest.fn();
    render(<McpHeadersEditor headers={headers} onChange={onChange} />);

    fireEvent.press(screen.getByTestId('mcp-headers-delete-0'));

    expect(onChange).toHaveBeenCalledWith([{ id: 'h-1', key: 'B', value: '2' }]);
  });
});
