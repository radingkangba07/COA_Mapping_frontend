import React, { useRef, useState } from 'react';
import { Pressable, View, type LayoutRectangle } from 'react-native';
import { Pencil } from 'lucide-react-native';
import { colors } from '@/config/theme';
import { OpenFieldProfileIcon } from '@/shared/components/icons/OpenFieldProfileIcon';
import { KebabIcon } from '@/shared/components/icons/KebabIcon';
import { RowActionsMenu } from './RowActionsMenu';
import type { EntityField } from '@/features/master-data-wizard/dp-kit/types/entity';

interface HoverIconButtonProps {
  readonly onPress?: () => void;
  readonly icon: (color: string) => React.ReactNode;
  readonly accessibilityLabel?: string;
  readonly testID?: string;
}

// This codebase's one existing convention for a hover-tinted Pressable on
// web (see ERPOptionItem.tsx / Tooltip.tsx) — reused here since neither
// row-action button had any hover styling at all before, which is why an
// unstyled browser default (not an authored colour) was showing on hover.
function HoverIconButton({ onPress, icon, accessibilityLabel, testID }: HoverIconButtonProps): React.JSX.Element {
  const [hovered, setHovered] = useState(false);
  return (
    <Pressable
      onPress={onPress}
      onHoverIn={() => setHovered(true)}
      onHoverOut={() => setHovered(false)}
      hitSlop={6}
      className="h-[28px] w-[28px] items-center justify-center rounded-[7px]"
      style={{ backgroundColor: hovered ? colors.surfaceHighlight : 'transparent' }}
      accessibilityLabel={accessibilityLabel}
      testID={testID}
    >
      {icon(hovered ? colors.foreground : colors.mutedForeground)}
    </Pressable>
  );
}

interface RowActionsCellProps {
  readonly field: EntityField;
  readonly isSelected: boolean;
  readonly onOpen: () => void;
  readonly onEdit: () => void;
  readonly onToggleCompare: () => void;
  readonly testID?: string;
}

export function RowActionsCell({
  field,
  isSelected,
  onOpen,
  onEdit,
  onToggleCompare,
  testID,
}: RowActionsCellProps): React.JSX.Element {
  const [menuOpen, setMenuOpen] = useState(false);
  const [anchor, setAnchor] = useState<LayoutRectangle | null>(null);
  const kebabRef = useRef<View>(null);

  const handleOpenMenu = (): void => {
    kebabRef.current?.measureInWindow((x, y, width, height) => {
      setAnchor({ x, y, width, height });
      setMenuOpen(true);
    });
  };

  return (
    <View className="flex-row items-center justify-center gap-[2px]">
      <HoverIconButton
        onPress={onEdit}
        icon={(color) => <Pencil size={16} color={color} />}
        accessibilityLabel="Edit field"
        testID={testID !== undefined ? `${testID}-edit-${field.id}` : undefined}
      />
      <HoverIconButton
        onPress={onOpen}
        icon={(color) => <OpenFieldProfileIcon size={16} color={color} />}
        accessibilityLabel="Open field profile"
        testID={testID !== undefined ? `${testID}-open-${field.id}` : undefined}
      />
      <View ref={kebabRef}>
        <HoverIconButton
          onPress={handleOpenMenu}
          icon={(color) => <KebabIcon size={16} color={color} />}
          testID={testID !== undefined ? `${testID}-kebab-${field.id}` : undefined}
        />
      </View>
      <RowActionsMenu
        visible={menuOpen}
        anchor={anchor}
        field={field}
        isSelected={isSelected}
        onOpenProfile={onOpen}
        onToggleCompare={onToggleCompare}
        onClose={() => setMenuOpen(false)}
        testID={testID !== undefined ? `${testID}-menu-${field.id}` : undefined}
      />
    </View>
  );
}
