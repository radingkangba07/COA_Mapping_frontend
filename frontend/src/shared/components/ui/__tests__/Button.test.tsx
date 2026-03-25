import React from 'react';
import { Text, View } from 'react-native';
import { render, screen, fireEvent } from '@testing-library/react-native';
import { Button } from '../Button';

describe('Button', () => {
  it('renders string children as text', () => {
    render(<Button>Click me</Button>);
    expect(screen.getByText('Click me')).toBeTruthy();
  });

  it('renders custom ReactNode children', () => {
    render(
      <Button>
        <View testID="custom-child" />
      </Button>,
    );
    expect(screen.getByTestId('custom-child')).toBeTruthy();
  });

  it('shows ActivityIndicator when isLoading is true', () => {
    render(<Button isLoading>Submit</Button>);
    expect(screen.queryByText('Submit')).toBeNull();
  });

  it('fires onPress callback', () => {
    const onPress = jest.fn();
    render(<Button onPress={onPress}>Press</Button>);
    fireEvent.press(screen.getByText('Press'));
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('is disabled when disabled prop is true', () => {
    const onPress = jest.fn();
    render(
      <Button disabled onPress={onPress} testID="btn">
        Disabled
      </Button>,
    );
    const button = screen.getByTestId('btn');
    expect(button.props.accessibilityState).toEqual(
      expect.objectContaining({ disabled: true }),
    );
    fireEvent.press(button);
    expect(onPress).not.toHaveBeenCalled();
  });

  it('is disabled when isLoading is true', () => {
    render(
      <Button isLoading testID="btn">
        Loading
      </Button>,
    );
    const button = screen.getByTestId('btn');
    expect(button.props.accessibilityState).toEqual(
      expect.objectContaining({ disabled: true }),
    );
  });

  it('applies opacity-50 class when disabled', () => {
    render(
      <Button disabled testID="btn">
        Disabled
      </Button>,
    );
    const button = screen.getByTestId('btn');
    const classNameProp: string = button.props.className ?? '';
    expect(classNameProp).toContain('opacity-50');
  });

  it.each([
    'default',
    'destructive',
    'outline',
    'secondary',
    'ghost',
    'link',
  ] as const)('renders variant=%s without crashing', (variant) => {
    render(
      <Button variant={variant} testID={`btn-${variant}`}>
        {variant}
      </Button>,
    );
    expect(screen.getByTestId(`btn-${variant}`)).toBeTruthy();
  });

  it.each(['default', 'sm', 'lg', 'icon'] as const)(
    'renders size=%s without crashing',
    (size) => {
      render(
        <Button size={size} testID={`btn-${size}`}>
          {size === 'icon' ? <Text>X</Text> : size}
        </Button>,
      );
      expect(screen.getByTestId(`btn-${size}`)).toBeTruthy();
    },
  );

  it('passes testID prop through', () => {
    render(<Button testID="my-button">Test</Button>);
    expect(screen.getByTestId('my-button')).toBeTruthy();
  });

  it('has accessibilityRole="button"', () => {
    render(<Button testID="btn">Click</Button>);
    expect(screen.getByTestId('btn').props.accessibilityRole).toBe('button');
  });
});
