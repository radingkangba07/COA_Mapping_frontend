import type { ReactNode } from 'react';

export const AUTO_HIDE_DELAY_MS = 2000;
// The reference's own tooltip is a plain native `title=` attribute (see
// the `<span title="...">` markup — no styling, no JS), so there is no
// literal show-delay value to extract from it: that delay is entirely
// controlled by the browser/OS, not the page. What the reference DOES
// establish is the *behaviour* every native tooltip has — it doesn't pop
// open the instant the cursor touches the trigger, only after it lingers.
// Explicit, requested value standing in for that: 3s of continuous hover.
export const SHOW_DELAY_MS = 3000;
export const TOOLTIP_GAP = 6;
// A native OS/browser tooltip (what this component stands in for — see
// Tooltip.web.tsx's own doc comment) never inverts with the host page's
// own light/dark theme; it's chrome the browser draws, not page content.
// `colors.foreground`/`colors.background` DO invert with this app's theme
// (dark mode: foreground is light, background is dark), which would flip
// this to a light tooltip with dark text in dark mode — the opposite of
// the reference's consistently-dark tooltip. Fixed, not token-derived, on
// purpose: this file lives in `shared/components/ui/`, outside the
// `master-data-wizard`-scoped "never hardcode a colour" rule (see
// CLAUDE.md), and no existing token models "always dark regardless of
// theme" — inventing one that's really just these two values wearing a
// different name wouldn't be more honest than naming them directly here.
// TOOLTIP_BG sampled directly from a live screenshot of the reference's
// own rendering (its tooltip is a plain native `title=` attribute — see
// the reference HTML's `<span title="...">` markup) rather than guessed:
// a solid mid-dark gray, `rgb(75,75,75)`, not near-black — confirmed by
// reading the pixel value out of the screenshot.
export const TOOLTIP_BG = '#4B4B4B';
export const TOOLTIP_FG = '#FFFFFF';
// A native tooltip always paints above every other page element — it's
// browser chrome, not page content, so nothing on the page can ever
// occlude it. Kept high for the same reason on both platforms.
export const TOOLTIP_Z_INDEX = 9999;
// Reference tooltips are the browser's own native `title=` attribute — a
// plain dark rectangle, left-aligned text, no pointer/arrow, anchored near
// the trigger's own corner rather than centered above/below it. A definite
// (not max-) width — an absolutely positioned box with only `left` set
// sizes itself via CSS "shrink-to-fit," bounded by its containing block's
// available width (the tiny trigger, not the page); `maxWidth` alone can
// only shrink an already-undersized box further, never grow it.
export const TOOLTIP_WIDTH = 260;

export interface TooltipAnchorRect {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
}

export interface TooltipProps {
  content: string;
  children: ReactNode;
  position?: 'top' | 'bottom';
  className?: string;
  testID?: string;
  /**
   * Optional passthrough for a click on the tooltip's trigger area. Needed
   * because the trigger is itself a `Pressable` — on web, react-native-web's
   * Pressable stops a click from bubbling to ANY ancestor (its own
   * responder-gesture handling swallows it even with no `onPress` set),
   * so wrapping cell content that used to rely on an outer row's `onPress`
   * (e.g. a whole-row "click to open" table) silently breaks that once
   * wrapped in Tooltip. Passing the same handler here re-fires it directly
   * instead of depending on a bubble that will never arrive.
   */
  onPress?: () => void;
}
