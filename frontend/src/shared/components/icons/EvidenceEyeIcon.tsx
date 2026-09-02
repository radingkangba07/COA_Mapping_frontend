import React from 'react';
import Svg, { Circle, Path } from 'react-native-svg';

interface EvidenceEyeIconProps {
  readonly size?: number;
  readonly color: string;
}

/**
 * The reference genuinely uses two DIFFERENT eye-shaped SVGs, confirmed by
 * extracting both path strings directly from source — this is the
 * "Show/Hide supporting evidence" toggle's own icon
 * (`M2 12s3-7 10-7...`), a flatter/rounder curve than `EyeIcon.tsx`'s
 * "Open field profile" icon (`M1 12s4-8 11-8...`). They were previously
 * conflated as one shared component, which made this one wrong.
 */
export function EvidenceEyeIcon({ size = 14, color }: EvidenceEyeIconProps): React.JSX.Element {
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
      <Path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7z" />
      <Circle cx="12" cy="12" r="3" />
    </Svg>
  );
}
