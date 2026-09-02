import React, { useState } from 'react';
import { Pressable, Text, TextInput, View } from 'react-native';
import { ThumbsUp, ThumbsDown } from 'lucide-react-native';
import { colors } from '@/config/theme';
import { cn } from '@/shared/utils/string.utils';
import { badgeTint } from '@/features/master-data-wizard/dp-kit/native/dp-theme';
import { useToast } from '@/shared/hooks/useToast';
import { Select } from '@/shared/components/ui/Select';
import { Button } from '@/shared/components/ui/Button';
import { useCopilotChatStore, type ChatMessage } from '@/features/master-data-wizard/store/copilotChat.store';
import type { EntityPack } from '@/features/master-data-wizard/dp-kit/types/entity';

interface ChatMessageBubbleProps {
  readonly message: ChatMessage;
  readonly pack: EntityPack;
}

interface FeedbackButtonProps {
  readonly active: boolean;
  /** Text buttons ("Missing evidence"/"Correct") use 9px horizontal
   *  padding; icon-only buttons (Helpful/Incorrect) use 7px, per reference. */
  readonly wide?: boolean;
  readonly onPress: () => void;
  /** A plain node for text labels, or a render function for icon children
   *  so they can share this button's own active/hover colour computation. */
  readonly children: React.ReactNode | ((color: string) => React.ReactNode);
  /** Required for the icon-only (Helpful/Incorrect) buttons, which have no
   *  visible text of their own — mirrors the reference's `title="Helpful"`. */
  readonly accessibilityLabel?: string;
}

/** The reference's `[data-active="true"]{border-color:var(--accent)!important;
 *  background:color-mix(in srgb, var(--accent) 12%, transparent)!important;
 *  color:var(--accent)!important;}` rule is generic and applies uniformly
 *  to whichever of these buttons is active — one accent colour and a light
 *  accent-tinted background, not a per-kind success/destructive/warning
 *  colour (an earlier pass missed this rule existed at all) and not just
 *  a border with no background tint (a second pass added the border/text
 *  colour but still left the background untinted, so the only "blue" a
 *  click produced was the browser's own unstyled default focus ring —
 *  `focus:outline-none` below removes that so the deliberate tint is the
 *  only visual change).
 *  Separately, every one of these buttons also has its own
 *  `style-hover="color:var(--fg)"` — rest colour is muted, hovering (while
 *  not active) brightens to full foreground. */
function FeedbackButton({ active, wide, onPress, children, accessibilityLabel }: FeedbackButtonProps): React.JSX.Element {
  const [hovered, setHovered] = useState(false);
  const color = active ? colors.accent : hovered ? colors.foreground : colors.mutedForeground;
  return (
    <Pressable
      onPress={onPress}
      onHoverIn={() => setHovered(true)}
      onHoverOut={() => setHovered(false)}
      accessibilityLabel={accessibilityLabel}
      className={cn(
        'flex-row items-center gap-1 rounded-[7px] border py-1 focus:outline-none',
        wide ? 'px-[9px]' : 'px-[7px]',
      )}
      style={{
        borderColor: active ? colors.accent : colors.border,
        backgroundColor: active ? badgeTint(colors.accent) : colors.card,
      }}
    >
      {typeof children === 'function' ? (
        children(color)
      ) : typeof children === 'string' ? (
        <Text className="font-body text-[11px] font-medium" style={{ color }}>
          {children}
        </Text>
      ) : (
        children
      )}
    </Pressable>
  );
}

/** The reference's exact bubble shapes: user is right-aligned primary-fill
 *  with a sharp bottom-right corner; assistant is full-width surface-fill
 *  with a sharp bottom-left corner. Assistant messages also carry the
 *  "Was this useful?" feedback row + an inline correction panel. */
export function ChatMessageBubble({ message, pack }: ChatMessageBubbleProps): React.JSX.Element {
  const setFeedback = useCopilotChatStore((s) => s.setFeedback);
  const startCorrect = useCopilotChatStore((s) => s.startCorrect);
  const cancelCorrect = useCopilotChatStore((s) => s.cancelCorrect);
  const saveCorrect = useCopilotChatStore((s) => s.saveCorrect);
  const correctionForId = useCopilotChatStore((s) => s.correctionForId);
  const [correctionValue, setCorrectionValue] = useState<string | undefined>(undefined);
  const [correctionReason, setCorrectionReason] = useState('');
  const { showSuccess } = useToast();

  if (message.role === 'user') {
    return (
      <View className="max-w-[88%] self-end rounded-tl-[12px] rounded-tr-[12px] rounded-bl-[12px] rounded-br-[4px] bg-primary px-[13px] py-[9px]">
        <Text className="font-body text-[13px] leading-[19.5px] text-primary-foreground">{message.text}</Text>
      </View>
    );
  }

  const isCorrecting = correctionForId === message.id;

  const handleSave = (): void => {
    saveCorrect();
    setCorrectionValue(undefined);
    setCorrectionReason('');
    showSuccess('Correction sent to the model as feedback');
  };

  const handleCancel = (): void => {
    cancelCorrect();
    setCorrectionValue(undefined);
    setCorrectionReason('');
  };

  return (
    <View className="w-full self-stretch gap-2">
      <View className="rounded-tl-[12px] rounded-tr-[12px] rounded-br-[12px] rounded-bl-[4px] border border-border bg-surface px-[13px] py-[11px]">
        <Text className="font-body text-[13px] leading-5 text-foreground">{message.text}</Text>
      </View>

      <View className="flex-row flex-wrap items-center gap-[5px]">
        <Text className="mr-0.5 font-body text-[10.5px] text-muted-foreground">Was this useful?</Text>
        <FeedbackButton
          active={message.feedback === 'helpful'}
          onPress={() => setFeedback(message.id, 'helpful')}
          accessibilityLabel="Helpful"
        >
          {(color) => <ThumbsUp size={13} color={color} />}
        </FeedbackButton>
        <FeedbackButton
          active={message.feedback === 'incorrect'}
          onPress={() => setFeedback(message.id, 'incorrect')}
          accessibilityLabel="Incorrect"
        >
          {(color) => <ThumbsDown size={13} color={color} />}
        </FeedbackButton>
        <FeedbackButton
          active={message.feedback === 'missing'}
          wide
          onPress={() => setFeedback(message.id, 'missing')}
        >
          Missing evidence
        </FeedbackButton>
        <FeedbackButton active={false} wide onPress={() => startCorrect(message.id)}>
          Correct
        </FeedbackButton>
      </View>

      {isCorrecting ? (
        <View className="rounded-[10px] border border-border bg-card p-[11px]">
          <Text className="mb-[7px] font-body text-[11.5px] font-semibold text-foreground">
            Replace the AI's selection
          </Text>
          <View className="mb-[7px]">
            <Select
              options={pack.fields.map((f) => ({ label: f.name, value: f.id }))}
              value={correctionValue}
              onValueChange={setCorrectionValue}
              placeholder="Select a field"
              triggerClassName="h-auto rounded-[7px] border-border bg-surface px-[9px] py-[7px]"
              triggerTextClassName="text-[12.5px]"
            />
          </View>
          <TextInput
            value={correctionReason}
            onChangeText={setCorrectionReason}
            placeholder="Why is this correct? (optional)"
            placeholderTextColor={colors.mutedForeground}
            className="mb-[9px] rounded-[7px] border border-border bg-surface px-[9px] py-[7px] font-body text-[12.5px] text-foreground"
          />
          <View className="flex-row justify-end gap-[7px]">
            <Button variant="outline" size="sm" className="rounded-[7px] border-border bg-card" onPress={handleCancel}>
              <Text className="text-xs font-medium text-foreground">Cancel</Text>
            </Button>
            <Button variant="default" size="sm" className="rounded-[7px]" onPress={handleSave}>
              <Text className="text-xs font-semibold text-primary-foreground">Send correction</Text>
            </Button>
          </View>
        </View>
      ) : null}
    </View>
  );
}
