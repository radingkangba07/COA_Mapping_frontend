import React from 'react';
import { View } from 'react-native';
import { cn } from '@/shared/utils/string.utils';
import { type GapSize, GAP_MAP } from '@/shared/components/layout/layout.constants';

type ColumnCount = 1 | 2 | 3 | 4;

interface ResponsiveColumns {
  sm?: ColumnCount;
  md?: ColumnCount;
  lg?: ColumnCount;
}

interface ResponsiveGridProps {
  cols?: ResponsiveColumns;
  gap?: GapSize;
  className?: string;
  children: React.ReactNode;
  testID?: string;
}

const WIDTH_CLASS_MAP: Record<ColumnCount, string> = {
  1: 'w-full',
  2: 'w-1/2',
  3: 'w-1/3',
  4: 'w-1/4',
};

const BREAKPOINT_PREFIX: Record<keyof ResponsiveColumns, string> = {
  sm: '',
  md: 'md:',
  lg: 'lg:',
};

function buildChildClasses(cols: ResponsiveColumns): string {
  const smCols = cols.sm ?? 1;
  const mdCols = cols.md;
  const lgCols = cols.lg;

  const classes: string[] = [WIDTH_CLASS_MAP[smCols]];

  if (mdCols !== undefined) {
    classes.push(`${BREAKPOINT_PREFIX['md']}${WIDTH_CLASS_MAP[mdCols]}`);
  }

  if (lgCols !== undefined) {
    classes.push(`${BREAKPOINT_PREFIX['lg']}${WIDTH_CLASS_MAP[lgCols]}`);
  }

  return classes.join(' ');
}

export const ResponsiveGrid = ({
  cols = { sm: 1, md: 2, lg: 3 },
  gap = 0,
  className,
  children,
  testID,
}: ResponsiveGridProps): React.JSX.Element => {
  const childWidthClasses = buildChildClasses(cols);

  return (
    <View
      className={cn('flex-row flex-wrap', GAP_MAP[gap], className)}
      testID={testID}
    >
      {React.Children.map(children, (child) => {
        if (!React.isValidElement(child)) return child;

        return (
          <View className={childWidthClasses}>
            {child}
          </View>
        );
      })}
    </View>
  );
};
