import React, { useEffect, useRef, useState } from 'react';
import {
  Modal,
  Pressable,
  View,
  Text,
  Animated,
  Dimensions,
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
  /** Right-side only. Additive override for callers that need a wider
   *  panel than the default 320px (e.g. FieldDetailDrawer's 480px) —
   *  ignored for side="bottom". */
  width?: number;
  className?: string;
  testID?: string;
  children?: React.ReactNode;
}

const SheetRoot = React.forwardRef<View, SheetRootProps>(
  ({ visible, onClose, side = defaultSide, width, className, testID, children }, ref) => {
    // RN's Modal `animationType="slide"` only ever slides vertically (up
    // from the bottom edge) — there's no built-in horizontal variant. A
    // side="right" sheet using it was correctly positioned on the right but
    // always animated in/out like a bottom sheet (down-to-up / up-to-down)
    // instead of sliding in from the right edge. Animate `translateX`
    // ourselves for side="right"; side="bottom" keeps Modal's native
    // vertical slide, which is the intended motion there.
    const isRight = side === 'right';
    const translateX = useRef(new Animated.Value(Dimensions.get('window').width)).current;
    // Modal's `visible` unmounts its content the instant it flips false —
    // delay that until the close animation actually finishes, so the panel
    // slides off-screen instead of vanishing mid-slide.
    const [isMounted, setIsMounted] = useState(visible);
    const isMountedRef = useRef(true);
    useEffect(() => () => { isMountedRef.current = false; }, []);

    useEffect(() => {
      if (!isRight) return;
      if (visible) {
        setIsMounted(true);
        translateX.setValue(Dimensions.get('window').width);
        Animated.timing(translateX, {
          toValue: 0,
          duration: 280,
          useNativeDriver: !isWeb,
        }).start();
      } else {
        Animated.timing(translateX, {
          toValue: Dimensions.get('window').width,
          duration: 220,
          useNativeDriver: !isWeb,
        }).start(({ finished }) => {
          if (finished && isMountedRef.current) setIsMounted(false);
        });
      }
    }, [visible, isRight, translateX]);

    const modalVisible = isRight ? isMounted : visible;

    return (
      <Modal
        visible={modalVisible}
        transparent={true}
        animationType={isRight ? 'none' : 'slide'}
        onRequestClose={onClose}
        testID={testID}
      >
        <Pressable
          className={cn(
            'flex-1 bg-black/40',
            side === 'bottom' ? 'justify-end' : 'flex-row justify-end',
          )}
          onPress={onClose}
          accessibilityRole="button"
          accessibilityLabel="Close sheet"
        >
          <Animated.View style={isRight ? { height: '100%', transform: [{ translateX }] } : undefined}>
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
              style={[
                side === 'right' && width !== undefined
                  ? { width, ...(isWeb ? { maxWidth: '96vw' as unknown as number } : undefined) }
                  : undefined,
                // Reference: `box-shadow:-8px 0 30px rgba(0,0,0,.2)` on the
                // sliding right-side panel.
                side === 'right' && isWeb ? { boxShadow: '-8px 0 30px rgba(0,0,0,.2)' } : undefined,
              ]}
            >
              {children}
            </Pressable>
          </Animated.View>
        </Pressable>
      </Modal>
    );
  },
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
  /** Additive — every existing consumer keeps the default muted icon colour. */
  iconColor?: string;
}

const SheetClose = React.forwardRef<View, SheetCloseProps>(
  ({ onPress, className, testID, size = 20, iconColor = colors.mutedForeground }, ref) => (
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
      <X size={size} color={iconColor} />
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
