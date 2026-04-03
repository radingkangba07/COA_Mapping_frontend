import React, { useCallback, useEffect } from 'react';
import { View, Text, Pressable, type LayoutChangeEvent } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
} from 'react-native-reanimated';
import { ChevronDown } from 'lucide-react-native';
import { cn } from '@/shared/utils/string.utils';
import { colors } from '@/config/theme';

const ANIMATION_DURATION = 250;
const CHEVRON_ROTATION_OPEN = 180;
const CHEVRON_ROTATION_CLOSED = 0;
const CHEVRON_SIZE = 18;

interface CollapsibleProps {
  isOpen: boolean;
  onToggle: () => void;
  title: string | React.ReactNode;
  children: React.ReactNode;
  className?: string;
  testID?: string;
}

function useChevronRotation(isOpen: boolean): {
  animatedStyle: ReturnType<typeof useAnimatedStyle>;
} {
  const rotation = useSharedValue(isOpen ? CHEVRON_ROTATION_OPEN : CHEVRON_ROTATION_CLOSED);

  useEffect(() => {
    rotation.value = withTiming(
      isOpen ? CHEVRON_ROTATION_OPEN : CHEVRON_ROTATION_CLOSED,
      { duration: ANIMATION_DURATION },
    );
  }, [isOpen, rotation]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${rotation.value}deg` }],
  }));

  return { animatedStyle };
}

function useContentHeight(isOpen: boolean): {
  animatedContentStyle: ReturnType<typeof useAnimatedStyle>;
  handleContentLayout: (event: LayoutChangeEvent) => void;
} {
  const measuredHeight = useSharedValue(0);
  const contentHeight = useSharedValue(isOpen ? 1 : 0);

  useEffect(() => {
    contentHeight.value = withTiming(isOpen ? 1 : 0, {
      duration: ANIMATION_DURATION,
    });
  }, [isOpen, contentHeight]);

  const animatedContentStyle = useAnimatedStyle(() => ({
    opacity: contentHeight.value,
    maxHeight: contentHeight.value * measuredHeight.value,
    overflow: 'hidden' as const,
  }));

  const handleContentLayout = useCallback(
    (event: LayoutChangeEvent) => {
      const { height } = event.nativeEvent.layout;
      if (height > 0) {
        measuredHeight.value = height;
      }
    },
    [measuredHeight],
  );

  return { animatedContentStyle, handleContentLayout };
}

export const Collapsible = React.forwardRef<View, CollapsibleProps>(
  ({ isOpen, onToggle, title, children, className, testID }, ref) => {
    const { animatedStyle: chevronStyle } = useChevronRotation(isOpen);
    const { animatedContentStyle, handleContentLayout } = useContentHeight(isOpen);

    const triggerTestID = testID !== undefined ? `${testID}-trigger` : undefined;
    const contentTestID = testID !== undefined ? `${testID}-content` : undefined;

    return (
      <View
        ref={ref}
        className={cn('overflow-hidden rounded-lg border border-border bg-card', className)}
        testID={testID}
      >
        <Pressable
          onPress={onToggle}
          className="flex-row items-center justify-between p-4 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 focus:ring-offset-background rounded-md"
          testID={triggerTestID}
          accessibilityRole="button"
          accessibilityState={{ expanded: isOpen }}
        >
          {typeof title === 'string' ? (
            <Text className="flex-1 font-heading text-base font-semibold text-card-foreground">
              {title}
            </Text>
          ) : (
            <View className="flex-1">{title}</View>
          )}

          <Animated.View style={chevronStyle}>
            <ChevronDown size={CHEVRON_SIZE} color={colors.mutedForeground} />
          </Animated.View>
        </Pressable>

        <Animated.View style={animatedContentStyle}>
          <View onLayout={handleContentLayout} testID={contentTestID}>
            <View className="border-t border-border px-4 pb-4 pt-3">
              {children}
            </View>
          </View>
        </Animated.View>
      </View>
    );
  },
);

Collapsible.displayName = 'Collapsible';
