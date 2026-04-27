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

interface DialogRootProps {
  visible: boolean;
  onClose: () => void;
  className?: string;
  testID?: string;
  children?: React.ReactNode;
}

const DialogRoot = React.forwardRef<View, DialogRootProps>(
  ({ visible, onClose, className, testID, children }, ref) => (
    <Modal
      visible={visible}
      transparent={true}
      animationType="fade"
      onRequestClose={onClose}
      testID={testID}
    >
      <View className="flex-1 items-center justify-center">
        <Pressable
          className="absolute inset-0 bg-black/50"
          onPress={onClose}
          accessibilityRole="button"
          accessibilityLabel="Close dialog"
        />

        <Pressable
          ref={ref}
          onPress={(e) => e.stopPropagation()}
          accessibilityRole="none"
          className={cn(
            'z-10 rounded-lg border border-border bg-card shadow-lg',
            isWeb ? 'max-w-lg w-full' : 'mx-4 w-full',
            className,
          )}
        >
          {children}
        </Pressable>
      </View>
    </Modal>
  ),
);
DialogRoot.displayName = 'Dialog';

interface DialogSectionProps extends ViewProps {
  className?: string;
}

const DialogHeader = React.forwardRef<View, DialogSectionProps>(
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
DialogHeader.displayName = 'DialogHeader';

interface DialogTextProps extends TextProps {
  className?: string;
}

const DialogTitle = React.forwardRef<Text, DialogTextProps>(
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
DialogTitle.displayName = 'DialogTitle';

const DialogContent = React.forwardRef<View, DialogSectionProps>(
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
DialogContent.displayName = 'DialogContent';

const DialogFooter = React.forwardRef<View, DialogSectionProps>(
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
DialogFooter.displayName = 'DialogFooter';

interface DialogCloseProps {
  onPress: () => void;
  className?: string;
  testID?: string;
  size?: number;
}

const DialogClose = React.forwardRef<View, DialogCloseProps>(
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
DialogClose.displayName = 'DialogClose';

export const Dialog = Object.assign(DialogRoot, {
  Header: DialogHeader,
  Title: DialogTitle,
  Content: DialogContent,
  Footer: DialogFooter,
  Close: DialogClose,
});
