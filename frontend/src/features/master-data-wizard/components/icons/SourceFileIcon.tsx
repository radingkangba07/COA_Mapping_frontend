import React from 'react';
import Svg, { Path } from 'react-native-svg';

interface SourceFileIconProps {
  readonly size?: number;
  readonly color: string;
}

// Reproduces the reference HTML's exact file icon (a plain page with a
// folded top-right corner) — lucide's current `File`/`FileText` icons use a
// different, more rounded path and don't match.
export function SourceFileIcon({ size = 15, color }: SourceFileIconProps): React.JSX.Element {
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
      <Path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z" />
      <Path d="M14 2v5h6" />
    </Svg>
  );
}
