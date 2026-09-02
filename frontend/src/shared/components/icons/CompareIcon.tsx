import React from 'react';
import Svg, { Rect } from 'react-native-svg';

interface CompareIconProps {
  readonly size?: number;
  readonly color: string;
}

// Reproduces the reference HTML's "add to comparison" icon — three 7x7
// rounded squares (top-left, top-right, bottom-left). No installed
// lucide-react-native icon matches this exact 3-square arrangement.
export function CompareIcon({ size = 16, color }: CompareIconProps): React.JSX.Element {
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
    >
      <Rect x="3" y="3" width="7" height="7" rx="1" />
      <Rect x="14" y="3" width="7" height="7" rx="1" />
      <Rect x="3" y="14" width="7" height="7" rx="1" />
    </Svg>
  );
}
