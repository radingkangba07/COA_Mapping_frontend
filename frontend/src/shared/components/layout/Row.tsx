import React from 'react';
import { View } from 'react-native';
import { cn } from '@/shared/utils/string.utils';
import { type GapSize, type Alignment, GAP_MAP, ALIGN_MAP } from '@/shared/components/layout/layout.constants';

type Justification = 'start' | 'center' | 'end' | 'between' | 'around';

const JUSTIFY_MAP: Record<Justification, string> = {
  start: 'justify-start',
  center: 'justify-center',
  end: 'justify-end',
  between: 'justify-between',
  around: 'justify-around',
};

interface RowProps {
  gap?: GapSize;
  align?: Alignment;
  justify?: Justification;
  responsive?: boolean;
  className?: string;
  children: React.ReactNode;
  testID?: string;
}

export const Row = ({
  gap = 0,
  align,
  justify,
  responsive = false,
  className,
  children,
  testID,
}: RowProps): React.JSX.Element => (
  <View
    className={cn(
      responsive ? 'flex-col md:flex-row' : 'flex-row',
      GAP_MAP[gap],
      align !== undefined && ALIGN_MAP[align],
      justify !== undefined && JUSTIFY_MAP[justify],
      className,
    )}
    testID={testID}
  >
    {children}
  </View>
);
