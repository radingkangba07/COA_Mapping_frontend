import React from 'react';
import Svg, { Path } from 'react-native-svg';

interface EditPencilIconProps {
  readonly size?: number;
  readonly color: string;
}

/**
 * DA-376's Actions-column "Edit proposed target" pencil. The reference's
 * geometry (`M12 20h9` + `M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z`) is
 * an older lucide "Edit" design — the installed lucide-react-native
 * (v0.577.0) redrew `Pencil`/`PenLine` with a different silhouette, so
 * drawn directly here to match the reference exactly (same convention as
 * `UnsortedIcon`).
 */
export function EditPencilIcon({ size = 14, color }: EditPencilIconProps): React.JSX.Element {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M12 20h9" />
      <Path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z" />
    </Svg>
  );
}
