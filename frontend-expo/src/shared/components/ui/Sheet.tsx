import React from 'react';
import {
  Modal,
  Pressable,
  View,
  Text,
  type ViewProps,
  type TextProps,
} from 'react-native';
import { X } from 'lucide-react-native';
import { cn } from '@/shared/utils/string.utils';
import { isWeb } from '@/shared/utils/platform.utils';
import { colors } from '@/config/theme';

type SheetSide = 'bottom' | 'right';

const defaultSide: SheetSide = isWeb ? 'right' : 'bottom';

interface SheetRootProps {
  visible: boolean;
  onClose: () => void;
  side?: SheetSide;
  className?: string;
  testID?: string;
  children?: React.ReactNode;
}

const SheetRoot = React.forwardRef<View, SheetRootProps>(
  ({ visible, onClose, side = defaultSide, className, testID, children }, ref) => (
    <Modal
      visible={visible}
      transparent={true}
      animationType="slide"
      onRequestClose={onClose}
      testID={testID}
    >
      <Pressable
        className={cn(
          'flex-1 bg-black/50',
          side === 'bottom' ? 'justify-end' : 'flex-row justify-end',
        )}
        onPress={onClose}
        accessibilityRole="button"
        accessibilityLabel="Close sheet"
      >
        <Pressable
          ref={ref}
          onPress={(e) => e.stopPropagation()}
          className={cn(
            'border-border bg-card',
            side === 'bottom'
              ? 'w-full max-h-[80%] rounded-t-xl border-t'
              : 'h-full w-80 border-l',
            className,
          )}
        >
          {children}
        </Pressable>
      </Pressable>
    </Modal>
  ),
);
SheetRoot.displayName = 'Sheet';

interface SheetSectionProps extends ViewProps {
  className?: string;
}

const SheetHeader = React.forwardRef<View, SheetSectionProps>(
  ({ className, children, ...props }, ref) => (
    <View
      ref={ref}
      className={cn('flex-row items-center justify-between p-6 pb-0', className)}
      {...props}
    >
      {children}
    </View>
  ),
);
SheetHeader.displayName = 'SheetHeader';

interface SheetTextProps extends TextProps {
  className?: string;
}

const SheetTitle = React.forwardRef<Text, SheetTextProps>(
  ({ className, children, ...props }, ref) => (
    <Text
      ref={ref}
      className={cn(
        'flex-1 font-heading text-lg font-semibold text-card-foreground',
        className,
      )}
      {...props}
    >
      {children}
    </Text>
  ),
);
SheetTitle.displayName = 'SheetTitle';

const SheetContent = React.forwardRef<View, SheetSectionProps>(
  ({ className, children, ...props }, ref) => (
    <View
      ref={ref}
      className={cn('p-6', className)}
      {...props}
    >
      {children}
    </View>
  ),
);
SheetContent.displayName = 'SheetContent';

interface SheetCloseProps {
  onPress: () => void;
  className?: string;
  testID?: string;
  size?: number;
}

const SheetClose = React.forwardRef<View, SheetCloseProps>(
  ({ onPress, className, testID, size = 20 }, ref) => (
    <Pressable
      ref={ref}
      onPress={onPress}
      className={cn(
        'items-center justify-center rounded-sm p-1 opacity-70 active:opacity-100',
        className,
      )}
      accessibilityRole="button"
      accessibilityLabel="Close"
      testID={testID}
    >
      <X size={size} color={colors.mutedForeground} />
    </Pressable>
  ),
);
SheetClose.displayName = 'SheetClose';

const SheetFooter = React.forwardRef<View, SheetSectionProps>(
  ({ className, children, ...props }, ref) => (
    <View
      ref={ref}
      className={cn('flex-row items-center justify-end gap-2 p-6 pt-0', className)}
      {...props}
    >
      {children}
    </View>
  ),
);
SheetFooter.displayName = 'SheetFooter';

export const Sheet = Object.assign(SheetRoot, {
  Header: SheetHeader,
  Title: SheetTitle,
  Content: SheetContent,
  Footer: SheetFooter,
  Close: SheetClose,
});
