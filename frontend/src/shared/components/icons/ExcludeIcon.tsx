import React from 'react';
import Svg, { Path } from 'react-native-svg';

interface ExcludeIconProps {
  readonly size?: number;
  readonly color: string;
}

/**
 * DA-376's Actions-column "Exclude field" icon. The reference's geometry
 * (a diagonal slash over an open eye-arc, `M2 2l20 20` + `M6.61 6.61A13 13
 * 0 0 0 1 12s4 7 11 7a11 11 0 0 0 5.39-1.39`) doesn't match lucide's
 * `Ban`/`EyeOff` exports in the installed lucide-react-native version, so
 * drawn directly here to match the reference exactly (same convention as
 * `UnsortedIcon`).
 */
export function ExcludeIcon({ size = 14, color }: ExcludeIconProps): React.JSX.Element {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M2 2l20 20" />
      <Path d="M6.61 6.61A13 13 0 0 0 1 12s4 7 11 7a11 11 0 0 0 5.39-1.39" />
    </Svg>
  );
}
