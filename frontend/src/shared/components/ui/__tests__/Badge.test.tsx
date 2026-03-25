import React from 'react';
import { View } from 'react-native';
import { render, screen } from '@testing-library/react-native';
import { Badge } from '../Badge';

describe('Badge', () => {
  it('renders string children as text', () => {
    render(<Badge>Active</Badge>);
    expect(screen.getByText('Active')).toBeTruthy();
  });

  it('renders ReactNode children', () => {
    render(
      <Badge>
        <View testID="custom-node" />
      </Badge>,
    );
    expect(screen.getByTestId('custom-node')).toBeTruthy();
  });

  it.each([
    'default',
    'secondary',
    'destructive',
    'outline',
    'success',
    'warning',
  ] as const)('renders variant=%s without crashing', (variant) => {
    render(
      <Badge variant={variant} testID={`badge-${variant}`}>
        {variant}
      </Badge>,
    );
    expect(screen.getByTestId(`badge-${variant}`)).toBeTruthy();
  });

  it('passes testID prop through', () => {
    render(<Badge testID="my-badge">Tag</Badge>);
    expect(screen.getByTestId('my-badge')).toBeTruthy();
  });

  it('accepts className prop', () => {
    render(
      <Badge testID="badge" className="ml-2">
        Extra
      </Badge>,
    );
    const badge = screen.getByTestId('badge');
    const classNameProp: string = badge.props.className ?? '';
    expect(classNameProp).toContain('ml-2');
  });
});
