import React from 'react';
import { useWindowDimensions } from 'react-native';
import { BREAKPOINTS } from '@/shared/utils/platform.utils';
import { AppTabs } from './tabs/AppTabs';
import { AppDrawer } from './drawers/AppDrawer';

export const ResponsiveAppNavigator = (): React.JSX.Element => {
  const { width } = useWindowDimensions();

  if (width < BREAKPOINTS.md) {
    return <AppTabs />;
  }

  return <AppDrawer />;
};
