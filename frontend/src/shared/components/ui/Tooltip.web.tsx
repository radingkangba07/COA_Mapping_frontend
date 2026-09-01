import React, { useState, useCallback, useRef, useEffect } from 'react';
import { View, Text, Pressable } from 'react-native';
import { createPortal } from 'react-dom';
import { cn } from '@/shared/utils/string.utils';
import {
  SHOW_DELAY_MS,
  TOOLTIP_GAP,
  TOOLTIP_BG,
  TOOLTIP_FG,
  TOOLTIP_Z_INDEX,
  TOOLTIP_WIDTH,
  type TooltipAnchorRect,
  type TooltipProps,
} from './Tooltip.shared';

/**
 * Web implementation — Metro picks this file over `Tooltip.tsx` for web
 * bundles automatically (its `.web.tsx` suffix), so the native/default
 * file never has to know about any of this.
 *
 * Rendered into a `document.body` portal instead of inline, because
 * react-native-web gives every plain `View` a baseline CSS of
 * `position:relative; z-index:0` — which makes EACH ONE its own stacking
 * context. That means a z-index set on a tooltip nested a few `View`s
 * deep inside one table row can never rise above a LATER SIBLING row: the
 * row itself is just another `z-index:0` box, and among sibling stacking
 * contexts at the same z-index, later DOM order always wins — no matter
 * how high a z-index something buried inside the earlier row carries.
 * Confirmed live: the previous inline version already computed
 * `zIndex:9999` correctly on the tooltip box, but sat nested inside
 * several `position:relative` ancestors that each silently opened a
 * fresh stacking context, trapping it — visible as the tooltip's lower
 * portion painting underneath the very next table row.
 *
 * This is the same class of problem `Select`'s own dropdown already
 * solves in this codebase, via React Native's `Modal` (which
 * react-native-web itself portals to `document.body`). `Modal` is the
 * wrong tool here, though: react-native-web's `Modal` wraps its content
 * in a focus trap that immediately steals keyboard focus into itself the
 * moment it becomes visible (real behaviour, confirmed by reading
 * `ModalFocusTrap.js`) — fine for an actual dialog a user opened on
 * purpose, disastrous for a tooltip that pops open on every incidental
 * hover, since it would yank focus out of whatever the user was
 * genuinely interacting with (a text input mid-edit, etc.). A raw DOM
 * portal has none of that ceremony — it's purely visual, exactly what a
 * hover tooltip needs.
 */
export const Tooltip = React.forwardRef<View, TooltipProps>(
  function TooltipInner(
    { content, children, position = 'top', className, testID, onPress },
    ref,
  ) {
    const [isVisible, setIsVisible] = useState(false);
    const [anchor, setAnchor] = useState<TooltipAnchorRect | null>(null);
    const triggerRef = useRef<View>(null);
    const showTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    // Guards the async `measureInWindow` callback below against a stale
    // resolution. `measureInWindow` defers via `setTimeout(..., 0)` (see
    // react-native-web's own `UIManager.measureInWindow`), so a fast
    // hover-in-then-out — entirely normal on a wide element like a KPI
    // tile — can call `hide()` before the measurement from the ORIGINAL
    // `show()` resolves. Without this guard that stale callback still
    // fires afterward and sets `isVisible(true)` regardless, reopening
    // the tooltip with no further hover-out left to close it — confirmed
    // as the actual cause of a real "tooltip stuck open" report.
    const showTokenRef = useRef(0);

    const clearShowTimer = useCallback((): void => {
      if (showTimerRef.current !== null) {
        clearTimeout(showTimerRef.current);
        showTimerRef.current = null;
      }
    }, []);

    useEffect(() => clearShowTimer, [clearShowTimer]);

    const show = useCallback((): void => {
      clearShowTimer();
      // Native tooltips don't pop open the instant the cursor lands — the
      // reference's own tooltip is a plain `title=` attribute with no
      // literal timing to copy (that delay is the browser/OS's, not the
      // page's), but the same lingering-hover behaviour it stands in for
      // still applies here. A hover-out before this timer fires cancels
      // it via `clearShowTimer` below, so a routine pass-over never
      // triggers a measurement at all.
      showTimerRef.current = setTimeout(() => {
        const token = ++showTokenRef.current;
        // Same `measureInWindow` call Select.tsx already uses to position
        // its own portal-rendered dropdown against its trigger.
        triggerRef.current?.measureInWindow((x, y, width, height) => {
          if (showTokenRef.current !== token) return;
          setAnchor({ x, y, width, height });
          setIsVisible(true);
        });
      }, SHOW_DELAY_MS);
    }, [clearShowTimer]);

    const hide = useCallback((): void => {
      clearShowTimer();
      showTokenRef.current++;
      setIsVisible(false);
    }, [clearShowTimer]);

    const isTop = position === 'top';

    return (
      <View ref={ref} className={cn('relative', className)} testID={testID}>
        <Pressable ref={triggerRef} onPress={onPress} onHoverIn={show} onHoverOut={hide}>
          {children}
        </Pressable>

        {isVisible && anchor && typeof document !== 'undefined'
          ? createPortal(
              <View
                // `measureInWindow` gives viewport-relative coordinates —
                // the same coordinate space `position:'fixed'` positions
                // against, so these compose directly with no extra scroll
                // math. `bottom` (not `top`) for the "top" case sidesteps
                // needing the tooltip's own (not-yet-rendered) height to
                // anchor it growing upward from the trigger.
                style={{
                  // `position:'fixed'` is valid web CSS but not part of
                  // RN's `ViewStyle` position union — same cast pattern
                  // already used elsewhere in this codebase (e.g.
                  // `Table.tsx`'s `overflow:'auto' as 'scroll'`) for
                  // web-only style values RN's own types don't model.
                  position: 'fixed' as 'relative',
                  left: anchor.x,
                  width: TOOLTIP_WIDTH,
                  zIndex: TOOLTIP_Z_INDEX,
                  ...(isTop
                    ? { bottom: window.innerHeight - anchor.y + TOOLTIP_GAP }
                    : { top: anchor.y + anchor.height + TOOLTIP_GAP }),
                }}
                pointerEvents="none"
              >
                <View className="rounded-md px-3 py-2 shadow-lg" style={{ backgroundColor: TOOLTIP_BG }}>
                  <Text className="text-left font-body text-xs leading-4" style={{ color: TOOLTIP_FG }}>
                    {content}
                  </Text>
                </View>
              </View>,
              document.body,
            )
          : null}
      </View>
    );
  },
);

Tooltip.displayName = 'Tooltip';
