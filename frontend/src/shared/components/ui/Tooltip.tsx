import React, { useState, useCallback, useRef, useEffect } from 'react';
import { View, Text, Pressable, type ViewStyle } from 'react-native';
import { cn } from '@/shared/utils/string.utils';
import {
  AUTO_HIDE_DELAY_MS,
  TOOLTIP_GAP,
  TOOLTIP_BG,
  TOOLTIP_FG,
  TOOLTIP_Z_INDEX,
  TOOLTIP_WIDTH,
  type TooltipProps,
} from './Tooltip.shared';

/**
 * Default (native — iOS/Android) implementation. Metro resolves
 * `Tooltip.web.tsx` instead of this file for web bundles automatically
 * via its platform-extension convention, so nothing here runs on web; see
 * that file's own doc comment for why web needs a completely different
 * rendering strategy (a `document.body` portal). React Native's real,
 * per-surface layer compositing doesn't have the CSS quirk that forces
 * that on web, so this file keeps the simple inline-absolute approach —
 * a definite `width` (not `maxWidth`) is still needed here too: an
 * absolutely positioned box with only `left` set sizes itself via
 * "shrink-to-fit," bounded by its containing block's (the trigger's own)
 * available width, not the screen.
 */
export const Tooltip = React.forwardRef<View, TooltipProps>(
  function TooltipInner(
    { content, children, position = 'top', className, testID, onPress },
    ref,
  ) {
    const [isVisible, setIsVisible] = useState(false);
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

    const isTop = position === 'top';

    const tooltipContainerStyle: ViewStyle = {
      position: 'absolute',
      alignSelf: 'flex-start',
      left: 0,
      width: TOOLTIP_WIDTH,
      zIndex: TOOLTIP_Z_INDEX,
      ...(isTop
        ? { bottom: '100%', marginBottom: TOOLTIP_GAP }
        : { top: '100%', marginTop: TOOLTIP_GAP }),
    };

    return (
      <View
        ref={ref}
        className={cn('relative', className)}
        style={isVisible ? { zIndex: TOOLTIP_Z_INDEX } : undefined}
        testID={testID}
      >
        <Pressable onPress={onPress} onLongPress={handleLongPress}>
          {children}
        </Pressable>

        {isVisible && (
          <View style={tooltipContainerStyle} pointerEvents="none">
            <View className="rounded-md px-3 py-2 shadow-lg" style={{ backgroundColor: TOOLTIP_BG }}>
              <Text className="text-left font-body text-xs leading-4" style={{ color: TOOLTIP_FG }}>
                {content}
              </Text>
            </View>
          </View>
        )}
      </View>
    );
  },
);

Tooltip.displayName = 'Tooltip';
