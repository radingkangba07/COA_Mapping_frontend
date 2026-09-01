import React from 'react';
import { View, Text, ScrollView, type ViewProps } from 'react-native';
import { cn } from '@/shared/utils/string.utils';
import { isWeb } from '@/shared/utils/platform.utils';

interface TableRootProps extends ViewProps {
  className?: string;
  testID?: string;
  /**
   * Enables horizontal scrolling on this ScrollView directly, instead of the
   * caller wrapping Table in a second, outer ScrollView. Two nested
   * overflow:auto containers means sticky-positioned descendants (e.g. a
   * frozen leading column) anchor to the inner one, which never actually
   * receives the scroll gesture on web — found and fixed via FieldsTable's
   * frozen-columns work; keep table horizontal-scrolling on this single
   * ScrollView rather than reintroducing an outer wrapper.
   */
  horizontal?: boolean;
  /**
   * Set false when this Table is nested inside a caller-owned bordered
   * card (e.g. one that also contains a pagination footer below the
   * table, sharing a single border/rounded corner) instead of drawing its
   * own border. Defaults true for standalone usage.
   */
  bordered?: boolean;
  /**
   * Caps the table's own height and lets it scroll vertically past that —
   * on the SAME ScrollView as the horizontal scroll (see the `horizontal`
   * doc above on why this can't be a second, outer wrapper: sticky
   * columns need this element to stay the single scrolling ancestor).
   * `overflow:'auto'` already applies to both axes, so bounding height is
   * the only piece needed for a vertical scrollbar to appear; the
   * sticky-top header (Table.Header) starts actually sticking once there
   * is a bounded scroll box for it to stick within. Web-only (RN's own
   * ScrollView is single-axis; native callers keep today's behaviour of
   * the page's own scroll carrying an unbounded table).
   */
  maxHeight?: number;
}

const TableRoot = React.forwardRef<ScrollView, TableRootProps>(
  ({ className, children, testID, horizontal = false, bordered = true, maxHeight, ...props }, ref) => {
    // overflow: 'auto' is web-only CSS; cast needed for RN ViewStyle
    const webOverflow = isWeb
      ? { overflow: 'auto' as 'scroll', ...(maxHeight !== undefined ? { maxHeight } : undefined) }
      : undefined;

    return (
      <ScrollView
        ref={ref}
        horizontal={horizontal}
        // RN's horizontal ScrollView defaults its content container to
        // flexDirection:'row' — without this override, the table's rows
        // would lay out side-by-side instead of stacking vertically while
        // still scrolling horizontally for overflow.
        contentContainerStyle={horizontal ? { flexDirection: 'column' } : undefined}
        className={cn(bordered && 'border border-border rounded-lg', className)}
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
        className={cn('flex-row bg-surface border-b border-border', className)}
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
  ({ className, width, children, style, ...props }, ref) => (
    <View
      ref={ref}
      className={cn('px-4 py-3', width === undefined && 'flex-1', className)}
      style={[width !== undefined ? { width } : undefined, style]}
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
  ({ className, width, children, style, ...props }, ref) => {
    const isTextChild =
      typeof children === 'string' || typeof children === 'number';

    return (
      <View
        ref={ref}
        className={cn('px-4 py-3', width === undefined && 'flex-1', className)}
        style={[width !== undefined ? { width } : undefined, style]}
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
