import React from 'react';
import Svg, { Path, Rect } from 'react-native-svg';

interface ProjectIconProps {
  readonly size?: number;
  readonly color: string;
}

// Reproduces the reference HTML's exact hand-drawn icon path (a flat-top
// case with a small handle tab) — not the same shape as lucide's own
// `Briefcase` icon, which draws a full handle loop with visible strap lines
// running down into the case body.
export function ProjectIcon({ size = 20, color }: ProjectIconProps): React.JSX.Element {
  return (
    <Svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <Path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" />
      <Rect width="8" height="4" x="8" y="2" rx="1" />
    </Svg>
  );
}
