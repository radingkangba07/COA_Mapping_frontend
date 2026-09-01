import React from 'react';
import { Pressable, Text, View, type ViewProps } from 'react-native';
import { cn } from '@/shared/utils/string.utils';

type TabsVariant = 'pill' | 'underline';

interface TabsContextValue {
  activeValue: string;
  onValueChange: (value: string) => void;
  variant: TabsVariant;
}

const TabsContext = React.createContext<TabsContextValue | null>(null);

function useTabsContext(): TabsContextValue {
  const context = React.useContext(TabsContext);
  if (context === null) {
    throw new Error('Tabs compound components must be used within <Tabs>');
  }
  return context;
}

interface TabsRootProps extends ViewProps {
  value?: string;
  defaultValue?: string;
  onValueChange?: (value: string) => void;
  variant?: TabsVariant;
  className?: string;
  testID?: string;
}

const TabsRoot = React.forwardRef<View, TabsRootProps>(
  ({ value, defaultValue = '', onValueChange, variant = 'pill', className, testID, children, ...props }, ref) => {
    const [internalValue, setInternalValue] = React.useState(defaultValue);
    const activeValue = value ?? internalValue;

    const handleValueChange = React.useCallback(
      (newValue: string) => {
        if (onValueChange) {
          onValueChange(newValue);
        } else {
          setInternalValue(newValue);
        }
      },
      [onValueChange],
    );

    const contextValue = React.useMemo(
      () => ({ activeValue, onValueChange: handleValueChange, variant }),
      [activeValue, handleValueChange, variant],
    );

    return (
      <TabsContext.Provider value={contextValue}>
        <View ref={ref} className={className} testID={testID} {...props}>
          {children}
        </View>
      </TabsContext.Provider>
    );
  },
);
TabsRoot.displayName = 'Tabs';

interface TabsListProps extends ViewProps {
  className?: string;
  testID?: string;
}

const TabsList = React.forwardRef<View, TabsListProps>(
  ({ className, testID, children, ...props }, ref) => {
    const { variant } = useTabsContext();
    return (
      <View
        ref={ref}
        className={cn(
          variant === 'underline'
            ? 'flex-row items-center gap-0.5'
            : 'flex-row items-center rounded-lg bg-muted p-1',
          className,
        )}
        accessibilityRole="tablist"
        testID={testID}
        {...props}
      >
        {children}
      </View>
    );
  },
);
TabsList.displayName = 'TabsList';

interface TabsTriggerProps extends Omit<React.ComponentPropsWithoutRef<typeof Pressable>, 'children'> {
  value: string;
  className?: string;
  testID?: string;
  children?: React.ReactNode;
}

const TabsTrigger = React.forwardRef<View, TabsTriggerProps>(
  ({ value, className, testID, children, ...props }, ref) => {
    const { activeValue, onValueChange, variant } = useTabsContext();
    const isActive = activeValue === value;

    return (
      <Pressable
        ref={ref}
        onPress={() => onValueChange(value)}
        className={cn(
          variant === 'underline'
            ? cn('items-center justify-center px-3 py-2.5 border-b-2', isActive ? 'border-primary' : 'border-transparent')
            : cn('flex-1 items-center justify-center rounded-md px-3 py-1.5', isActive ? 'bg-background shadow-sm' : 'bg-transparent'),
          className,
        )}
        accessibilityRole="tab"
        accessibilityState={{ selected: isActive }}
        testID={testID}
        {...props}
      >
        {typeof children === 'string' ? (
          <Text
            className={cn(
              variant === 'underline' ? 'font-body text-xs font-semibold' : 'text-sm font-medium',
              isActive
                ? 'text-foreground'
                : variant === 'underline'
                  ? 'text-muted-foreground hover:text-foreground'
                  : 'text-muted-foreground',
            )}
          >
            {children}
          </Text>
        ) : (
          children
        )}
      </Pressable>
    );
  },
);
TabsTrigger.displayName = 'TabsTrigger';

interface TabsContentProps extends ViewProps {
  value: string;
  className?: string;
  testID?: string;
}

const TabsContent = React.forwardRef<View, TabsContentProps>(
  ({ value, className, testID, children, ...props }, ref) => {
    const { activeValue } = useTabsContext();
    if (activeValue !== value) return null;

    return (
      <View
        ref={ref}
        className={cn('mt-2', className)}
        role="tabpanel"
        testID={testID}
        {...props}
      >
        {children}
      </View>
    );
  },
);
TabsContent.displayName = 'TabsContent';

export const Tabs = Object.assign(TabsRoot, {
  List: TabsList,
  Trigger: TabsTrigger,
  Content: TabsContent,
});
