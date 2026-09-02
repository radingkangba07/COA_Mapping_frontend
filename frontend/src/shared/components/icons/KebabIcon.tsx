import React from 'react';
import Svg, { Circle } from 'react-native-svg';

interface KebabIconProps {
  readonly size?: number;
  readonly color: string;
}

/**
 * The reference's row-actions kebab is three solid, filled dots
 * (`fill="currentColor"`, `r="1.6"`, no stroke) — lucide's installed
 * `MoreVertical` is a different, stroked-ring redesign that doesn't match
 * this geometry, same "lucide redesigned this icon" class of bug already
 * fixed for `EyeIcon`/`CompareIcon`/`OpenFieldProfileIcon` elsewhere.
 */
export function KebabIcon({ size = 16, color }: KebabIconProps): React.JSX.Element {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill={color}>
      <Circle cx="12" cy="5" r="1.6" />
      <Circle cx="12" cy="12" r="1.6" />
      <Circle cx="12" cy="19" r="1.6" />
    </Svg>
  );
}
