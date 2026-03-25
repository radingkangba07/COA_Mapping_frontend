import React, { useState, useCallback, useRef, useEffect } from 'react';
import {
  View,
  Text,
  Pressable,
  type ViewStyle,
  type LayoutChangeEvent,
} from 'react-native';
import { cn } from '@/shared/utils/string.utils';
import { isWeb } from '@/shared/utils/platform.utils';

const AUTO_HIDE_DELAY_MS = 2000;
const TOOLTIP_GAP = 6;
const ARROW_SIZE = 8;
const ARROW_OFFSET = ARROW_SIZE / 2;

interface TooltipProps {
  content: string;
  children: React.ReactNode;
  position?: 'top' | 'bottom';
  className?: string;
  testID?: string;
}

export const Tooltip = React.forwardRef<View, TooltipProps>(
  function TooltipInner(
    { content, children, position = 'top', className, testID },
    ref,
  ) {
    const [isVisible, setIsVisible] = useState(false);
    const [triggerWidth, setTriggerWidth] = useState(0);
    const [tooltipWidth, setTooltipWidth] = useState(0);
    const hideTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    const clearHideTimer = useCallback((): void => {
      if (hideTimerRef.current !== null) {
        clearTimeout(hideTimerRef.current);
        hideTimerRef.current = null;
      }
    }, []);

    useEffect(() => {
      return () => clearHideTimer();
    }, [clearHideTimer]);

    const show = useCallback((): void => {
      clearHideTimer();
      setIsVisible(true);
    }, [clearHideTimer]);

    const hide = useCallback((): void => {
      clearHideTimer();
      setIsVisible(false);
    }, [clearHideTimer]);

    const handleLongPress = useCallback((): void => {
      show();
      hideTimerRef.current = setTimeout(hide, AUTO_HIDE_DELAY_MS);
    }, [show, hide]);

    const handleTriggerLayout = useCallback((event: LayoutChangeEvent): void => {
      setTriggerWidth(event.nativeEvent.layout.width);
    }, []);

    const handleTooltipLayout = useCallback((event: LayoutChangeEvent): void => {
      setTooltipWidth(event.nativeEvent.layout.width);
    }, []);

    const isTop = position === 'top';
    const offsetX = (triggerWidth - tooltipWidth) / 2;

    const tooltipContainerStyle: ViewStyle = {
      position: 'absolute',
      left: offsetX,
      ...(isTop
        ? { bottom: '100%', marginBottom: TOOLTIP_GAP }
        : { top: '100%', marginTop: TOOLTIP_GAP }),
    };

    const arrowStyle: ViewStyle = {
      width: ARROW_SIZE,
      height: ARROW_SIZE,
      transform: [{ rotate: '45deg' }],
      position: 'absolute',
      alignSelf: 'center',
      ...(isTop ? { bottom: -ARROW_OFFSET } : { top: -ARROW_OFFSET }),
    };

    const webHoverProps = isWeb
      ? { onHoverIn: show, onHoverOut: hide }
      : {};

    const nativePressProps = !isWeb
      ? { onLongPress: handleLongPress }
      : {};

    return (
      <View ref={ref} className={cn('relative', className)} testID={testID}>
        <Pressable
          onLayout={handleTriggerLayout}
          {...webHoverProps}
          {...nativePressProps}
        >
          {children}
        </Pressable>

        {isVisible && (
          <View
            style={tooltipContainerStyle}
            onLayout={handleTooltipLayout}
            pointerEvents="none"
          >
            <View className="bg-foreground rounded-md px-3 py-1.5">
              <Text className="text-xs text-background text-center" numberOfLines={2}>
                {content}
              </Text>
            </View>
            <View className="bg-foreground self-center" style={arrowStyle} />
          </View>
        )}
      </View>
    );
  },
);

Tooltip.displayName = 'Tooltip';
