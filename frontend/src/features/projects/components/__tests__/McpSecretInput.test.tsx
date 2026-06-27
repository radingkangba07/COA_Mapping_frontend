import React from 'react';
import {
  render,
  screen,
  fireEvent,
  within,
} from '@testing-library/react-native';

type HostElement = ReturnType<typeof screen.getByTestId>;

jest.mock('@/config/theme', () => ({
  colors: {
    foreground: '#09090B',
    mutedForeground: '#71717A',
  },
}));

import { McpSecretInput } from '../McpSecretInput';

function secretTextInput(): HostElement {
  const [input] = within(screen.getByTestId('secret')).UNSAFE_getAllByType(
    'TextInput' as unknown as React.ComponentType,
  );
  return input;
}

describe('McpSecretInput', () => {
  it('is masked by default with a "Show" toggle label', () => {
    render(
      <McpSecretInput
        label="Access Token"
        value="abc"
        onChangeText={jest.fn()}
        secretLabel="token"
        testID="secret"
      />,
    );

    expect(secretTextInput()).toHaveProp('secureTextEntry', true);
    expect(screen.getByTestId('secret-toggle')).toHaveProp(
      'accessibilityLabel',
      'Show token',
    );
  });

  it('reveals the value and flips the toggle label on press', () => {
    render(
      <McpSecretInput
        label="Access Token"
        value="abc"
        onChangeText={jest.fn()}
        secretLabel="token"
        testID="secret"
      />,
    );

    fireEvent.press(screen.getByTestId('secret-toggle'));

    expect(secretTextInput()).toHaveProp('secureTextEntry', false);
    expect(screen.getByTestId('secret-toggle')).toHaveProp(
      'accessibilityLabel',
      'Hide token',
    );

    // Toggling back re-masks.
    fireEvent.press(screen.getByTestId('secret-toggle'));
    expect(secretTextInput()).toHaveProp('secureTextEntry', true);
  });

  it('forwards typed text to onChangeText', () => {
    const onChangeText = jest.fn();
    render(
      <McpSecretInput
        label="Access Token"
        value=""
        onChangeText={onChangeText}
        testID="secret"
      />,
    );

    fireEvent.changeText(secretTextInput(), 'new-secret');
    expect(onChangeText).toHaveBeenCalledWith('new-secret');
  });
});
