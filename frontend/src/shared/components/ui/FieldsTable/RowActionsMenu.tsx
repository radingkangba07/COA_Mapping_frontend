import React, { useState } from 'react';
import { Modal, Pressable, Text, View, type LayoutRectangle } from 'react-native';
import { CircleCheck } from 'lucide-react-native';
import { colors } from '@/config/theme';
import { cn } from '@/shared/utils/string.utils';
import { isWeb } from '@/shared/utils/platform.utils';
import { useSourceProfileStore } from '@/features/master-data-wizard/store/sourceProfile.store';
import { decisionStateFor } from '@/features/master-data-wizard/utils/decisions';
import { tint } from '@/features/master-data-wizard/utils/colorMix';
import { EyeIcon } from '@/shared/components/icons/EyeIcon';
import { EyeOffIcon } from '@/shared/components/icons/EyeOffIcon';
import { CompareIcon } from '@/shared/components/icons/CompareIcon';
import type { EntityField } from '@/features/master-data-wizard/dp-kit/types/entity';

interface RowActionsMenuProps {
  readonly visible: boolean;
  readonly anchor: LayoutRectangle | null;
  readonly field: EntityField;
  readonly isSelected: boolean;
  readonly onOpenProfile: () => void;
  readonly onToggleCompare: () => void;
  readonly onClose: () => void;
  readonly testID?: string;
}

interface MenuItemProps {
  readonly label: string;
  readonly icon: (color: string) => React.ReactNode;
  readonly onPress: () => void;
  readonly disabled?: boolean;
  readonly destructive?: boolean;
  readonly testID?: string;
}

function MenuItem({ label, icon, onPress, disabled, destructive, testID }: MenuItemProps): React.JSX.Element {
  const [hovered, setHovered] = useState(false);
  const fg = destructive ? colors.destructive : colors.foreground;
  // Reference: `color-mix(in srgb, var(--error) 10%, transparent)` —
  // distinct from `badgeTint`'s fixed 13%.
  const hoverBg = destructive ? tint(colors.destructive, 10) : colors.surface;
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      onHoverIn={() => setHovered(true)}
      onHoverOut={() => setHovered(false)}
      className="flex-row items-center gap-2.5 px-2.5 py-[9px]"
      style={{ opacity: disabled ? 0.4 : 1, backgroundColor: hovered && !disabled ? hoverBg : 'transparent' }}
      testID={testID}
    >
      {icon(fg)}
      <Text className="font-body text-[13px]" style={{ color: fg }}>
        {label}
      </Text>
    </Pressable>
  );
}

export function RowActionsMenu({
  visible,
  anchor,
  field,
  isSelected,
  onOpenProfile,
  onToggleCompare,
  onClose,
  testID,
}: RowActionsMenuProps): React.JSX.Element {
  const decisions = useSourceProfileStore((s) => s.decisions);
  const openApproval = useSourceProfileStore((s) => s.openApproval);
  const undoDecision = useSourceProfileStore((s) => s.undoDecision);

  const decisionState = decisionStateFor(field.id, decisions);

  const handleOpenProfile = (): void => {
    onClose();
    onOpenProfile();
  };

  const handleToggleCompare = (): void => {
    onClose();
    onToggleCompare();
  };

  const handleConfirm = (): void => {
    onClose();
    openApproval({ kind: 'confirm', fieldId: field.id });
  };

  const handleIgnoreOrRestore = (): void => {
    onClose();
    if (decisionState.ignored && decisionState.ignoreDecisionId) {
      undoDecision(decisionState.ignoreDecisionId);
    } else {
      openApproval({ kind: 'ignore', fieldId: field.id });
    }
  };

  const panelStyle = anchor
    ? { top: anchor.y + anchor.height + 4, left: Math.max(8, anchor.x + anchor.width - 210) }
    : undefined;

  return (
    <Modal visible={visible} transparent animationType={isWeb ? 'none' : 'fade'} onRequestClose={onClose}>
      <Pressable className={cn('flex-1', isWeb ? 'bg-transparent' : 'bg-black/20')} onPress={onClose}>
        <View
          className="absolute w-[210px] overflow-hidden rounded-[10px] border border-border bg-card py-1.5 shadow-lg"
          style={panelStyle}
          onStartShouldSetResponder={() => true}
          testID={testID}
        >
          <MenuItem
            label="Open field profile"
            icon={(tint) => <EyeIcon size={15} color={tint} />}
            onPress={handleOpenProfile}
            testID={testID ? `${testID}-open` : undefined}
          />
          <MenuItem
            label={isSelected ? 'Remove from comparison' : 'Add to comparison'}
            icon={(tint) => <CompareIcon size={15} color={tint} />}
            onPress={handleToggleCompare}
            testID={testID ? `${testID}-compare` : undefined}
          />
          <MenuItem
            label="Confirm as identifier"
            icon={(tint) => <CircleCheck size={15} color={tint} />}
            onPress={handleConfirm}
            testID={testID ? `${testID}-confirm` : undefined}
          />
          <View className="mx-0.5 my-1 h-px bg-border" />
          <MenuItem
            label={decisionState.ignored ? 'Restore field' : 'Ignore field'}
            icon={(tint) => <EyeOffIcon size={15} color={tint} />}
            onPress={handleIgnoreOrRestore}
            destructive
            testID={testID ? `${testID}-ignore` : undefined}
          />
        </View>
      </Pressable>
    </Modal>
  );
}
