import React from 'react';
import { Text, View } from 'react-native';
import { semantic, type SemanticFamily } from '../../dp-kit/native/dp-theme';
import { useAppStore } from '@/shared/store/app.store';
import { cn } from '@/shared/utils/string.utils';

interface SemanticBadgeProps {
  readonly family: SemanticFamily;
  readonly state: string;
  readonly children: React.ReactNode;
  /**
   * `impact` renders at three distinct reference sizes: the fields table's
   * "Migration impact" column is `padding:4px 10px;font-size:12px` (the
   * `'md'` default here); the field drawer's header badge is smaller and
   * bolder — `padding:3px 9px;font-size:10.5px;font-weight:700` (`'sm'`);
   * the field-name-cell CONFIRMED/FIXED decision tags are a small square
   * (not pill) tag — `border-radius:4px;padding:1px 5px;font-size:10px;
   * font-weight:700` (`'tag'`). `find` has three: the main table's
   * findings chip (`'md'` default, `border-radius:6px;padding:2px 7px;
   * font-size:12px`), the Invalid-values table's tighter status pill
   * (`'sm'`, `border-radius:5px;padding:2px 6px;font-size:10px`), and the
   * Issues tab's own findings chip (`'compact'`, `border-radius:6px;
   * padding:3px 9px;font-size:11px`).
   */
  readonly size?: 'sm' | 'md' | 'compact' | 'tag';
  /** Overrides alignment only — e.g. `self-center` for a table cell that centres its content. Defaults to self-start. */
  readonly className?: string;
  readonly testID?: string;
}

/**
 * Colour-pill for a taxonomy state — never a hardcoded colour, see semantic().
 * `impact` states really are full pills in the reference (border-radius:9999px).
 * `find` states are a tighter rounded rectangle instead (border-radius:6px,
 * padding:2px 7px) — not a pill, so it gets its own shape here rather than
 * reusing the pill's.
 */
export const SemanticBadge = ({ family, state, children, size = 'md', className, testID }: SemanticBadgeProps): React.JSX.Element => {
  const mode = useAppStore((s) => s.theme);
  const { fg, bg } = semantic(family, state, mode);
  const isFind = family === 'find';

  const shapeClass = isFind
    ? size === 'sm'
      ? 'rounded-[5px] px-1.5 py-0.5'
      : size === 'compact'
        ? 'rounded-[6px] px-[9px] py-[3px]'
        : 'rounded-[6px] px-[7px] py-0.5'
    : size === 'tag'
      ? 'rounded-[4px] px-[5px] py-px'
      : size === 'sm'
        ? 'rounded-full px-[9px] py-[3px]'
        : 'rounded-full px-2.5 py-1';

  const textClass =
    size === 'tag'
      ? 'text-[10px] font-bold'
      : size === 'sm'
        ? isFind
          ? 'text-[10px] font-semibold'
          : 'text-[10.5px] font-bold'
        : size === 'compact'
          ? 'text-[11px] font-semibold'
          // Reference: the 'md' default is `font-weight:500` for both
          // families (Migration-impact pill and the main findings chip) —
          // previously left as a disclosed, unflagged 600 deviation; a
          // fuller audit confirmed it's a real, fixable mismatch.
          : 'text-xs font-medium';

  return (
    <View
      className={cn('flex-row items-center self-start', shapeClass, className)}
      style={{ backgroundColor: bg }}
      testID={testID}
    >
      <Text className={cn('font-body', textClass)} style={{ color: fg }}>
        {children}
      </Text>
    </View>
  );
};
