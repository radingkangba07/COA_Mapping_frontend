import React from 'react';
import { View, Text, ScrollView, type ViewProps } from 'react-native';
import { cn } from '@/shared/utils/string.utils';
import { isWeb } from '@/shared/utils/platform.utils';

interface TableRootProps extends ViewProps {
  className?: string;
  testID?: string;
}

const TableRoot = React.forwardRef<ScrollView, TableRootProps>(
  ({ className, children, testID, ...props }, ref) => {
    // overflow: 'auto' is web-only CSS; cast needed for RN ViewStyle
    const webOverflow = isWeb
      ? { overflow: 'auto' as 'scroll' }
      : undefined;

    return (
      <ScrollView
        ref={ref}
        horizontal={false}
        className={cn('border border-border rounded-lg', className)}
        style={webOverflow}
        testID={testID}
        {...props}
      >
        {children}
      </ScrollView>
    );
  },
);
TableRoot.displayName = 'Table';

interface TableHeaderProps extends ViewProps {
  className?: string;
}

const Header = React.forwardRef<View, TableHeaderProps>(
  ({ className, children, ...props }, ref) => {
    // position: 'sticky' is web-only CSS; not valid in React Native ViewStyle
    const stickyStyle = isWeb
      ? ({ position: 'sticky' as unknown as 'relative', top: 0, zIndex: 1 })
      : undefined;

    return (
      <View
        ref={ref}
        className={cn('flex-row bg-muted border-b border-border', className)}
        style={stickyStyle}
        {...props}
      >
        {children}
      </View>
    );
  },
);
Header.displayName = 'TableHeader';

interface TableRowProps extends ViewProps {
  className?: string;
}

const Row = React.forwardRef<View, TableRowProps>(
  ({ className, children, ...props }, ref) => (
    <View
      ref={ref}
      className={cn('flex-row border-b border-border', className)}
      {...props}
    >
      {children}
    </View>
  ),
);
Row.displayName = 'TableRow';

interface TableHeaderCellProps extends ViewProps {
  className?: string;
  width?: number;
  children?: React.ReactNode;
}

const HeaderCell = React.forwardRef<View, TableHeaderCellProps>(
  ({ className, width, children, ...props }, ref) => (
    <View
      ref={ref}
      className={cn('px-4 py-3', width === undefined && 'flex-1', className)}
      style={width !== undefined ? { width } : undefined}
      {...props}
    >
      {typeof children === 'string' || typeof children === 'number' ? (
        <Text className="text-xs font-semibold text-muted-foreground uppercase">
          {children}
        </Text>
      ) : (
        children
      )}
    </View>
  ),
);
HeaderCell.displayName = 'TableHeaderCell';

interface TableCellProps extends ViewProps {
  className?: string;
  width?: number;
  children?: React.ReactNode;
}

const Cell = React.forwardRef<View, TableCellProps>(
  ({ className, width, children, ...props }, ref) => {
    const isTextChild =
      typeof children === 'string' || typeof children === 'number';

    return (
      <View
        ref={ref}
        className={cn('px-4 py-3', width === undefined && 'flex-1', className)}
        style={width !== undefined ? { width } : undefined}
        {...props}
      >
        {isTextChild ? (
          <Text className="text-sm text-foreground">{children}</Text>
        ) : (
          children
        )}
      </View>
    );
  },
);
Cell.displayName = 'TableCell';

export const Table = Object.assign(TableRoot, {
  Header,
  Row,
  Cell,
  HeaderCell,
});
