import React from 'react';
import Svg, { Path } from 'react-native-svg';

interface UnsortedIconProps {
  readonly size?: number;
  readonly color: string;
}

/**
 * The reference's "sortable but not currently sorted" column-header
 * affordance is two separate chevron paths at 40% opacity — lucide's
 * installed `ChevronsUpDown` (`m7 15 5 5 5-5` / `m7 9 5-5 5 5`) is a
 * different, more rounded redesign that doesn't match this geometry.
 */
export function UnsortedIcon({ size = 12, color }: UnsortedIconProps): React.JSX.Element {
  return (
    <Svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      opacity={0.4}
    >
      <Path d="m8 9 4-4 4 4" />
      <Path d="m16 15-4 4-4-4" />
    </Svg>
  );
}
