import React from 'react';
import { Dimensions } from 'react-native';
import { render, screen } from '@testing-library/react-native';

// ─── Mocks ──────────────────────────────────────────────────────────────────

jest.mock('@/shared/utils/platform.utils', () => ({
  isWeb: true,
  isNative: false,
  BREAKPOINTS: { sm: 640, md: 768, lg: 1024, xl: 1280 },
}));

jest.mock('../tabs/AppTabs', () => {
  const { View } = require('react-native');
  return {
    AppTabs: () => <View testID="app-tabs" />,
  };
});

jest.mock('../drawers/AppDrawer', () => {
  const { View } = require('react-native');
  return {
    AppDrawer: () => <View testID="app-drawer" />,
  };
});

import { ResponsiveAppNavigator } from '../ResponsiveAppNavigator';

// ─── Helpers ────────────────────────────────────────────────────────────────

function setMockWidth(width: number): void {
  jest.spyOn(Dimensions, 'get').mockReturnValue({
    width,
    height: 800,
    scale: 1,
    fontScale: 1,
  });
}

// ─── Tests ──────────────────────────────────────────────────────────────────

describe('ResponsiveAppNavigator', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('renders AppTabs at 375px (mobile)', () => {
    setMockWidth(375);
    render(<ResponsiveAppNavigator />);
    expect(screen.getByTestId('app-tabs')).toBeTruthy();
    expect(screen.queryByTestId('app-drawer')).toBeNull();
  });

  it('renders AppDrawer at 1200px (desktop)', () => {
    setMockWidth(1200);
    render(<ResponsiveAppNavigator />);
    expect(screen.getByTestId('app-drawer')).toBeTruthy();
    expect(screen.queryByTestId('app-tabs')).toBeNull();
  });

  it('renders AppTabs at exactly 767px (just below breakpoint)', () => {
    setMockWidth(767);
    render(<ResponsiveAppNavigator />);
    expect(screen.getByTestId('app-tabs')).toBeTruthy();
  });

  it('renders AppDrawer at exactly 768px (at breakpoint)', () => {
    setMockWidth(768);
    render(<ResponsiveAppNavigator />);
    expect(screen.getByTestId('app-drawer')).toBeTruthy();
  });
});
