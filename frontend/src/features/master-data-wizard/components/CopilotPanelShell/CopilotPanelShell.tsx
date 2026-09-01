import React, { useEffect, useRef, useState } from 'react';
import { Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { ChevronLeft, ChevronRight } from 'lucide-react-native';
import { colors } from '@/config/theme';
import { useAppStore } from '@/shared/store/app.store';
import { badgeTint } from '../../dp-kit/native/dp-theme';
import { BORDERED_CHIP_WIDTH } from '../../utils/style';
import { SparkleIcon } from '../icons/SparkleIcon';
import { SendIcon } from '../icons/SendIcon';
import { useCopilotChatStore } from '../../store/copilotChat.store';
import { ChatMessageBubble } from './ChatMessageBubble';
import type { EntityPack } from '../../dp-kit/types/entity';

interface CopilotPrompt {
  readonly id: string;
  readonly text: string;
}

interface CopilotPanelShellProps {
  readonly pack: EntityPack;
  readonly defaultOpen?: boolean;
  readonly testID?: string;
}

// Reference collapses this panel to a 52px vertical rail rather than
// animating its width — literal pixels (not a round Tailwind-scale number)
// to match the reference exactly, same precedent as ProjectAsidePanel's
// own `WIDTH = 236`.
const COLLAPSED_WIDTH = 52;
const EXPANDED_WIDTH = 384;

/**
 * Header, intro copy, and suggested-prompt chips read from
 * pack.copilotPrompts. Chat is a lightweight local loop (copilotChat.store +
 * copilotChat.service) — deliberately not the full DA-231/DA-232 port
 * (fix-suggestion cards, thread history, Clear/New Chat): those are real,
 * non-trivial features tied to `item-master`'s own store/type system, not a
 * quick add. `sendMessage`/`getCannedReply` are async specifically so
 * swapping in a real reply source later is a body change, not a rewrite.
 *
 * Note: the two fixtures disagree on copilotPrompts' shape — confirmed this
 * session by rendering both. items.entity.json stores {id, text}[];
 * customers.entity.json stores plain string[], which is what entity.d.ts
 * actually declares. This is a fixture inconsistency to raise, not an
 * entity-specific case to branch on — normalised here so both render.
 */
function normalizePrompt(raw: unknown, index: number): CopilotPrompt {
  if (typeof raw === 'string') return { id: `prompt-${index}`, text: raw };
  const obj = raw as Partial<CopilotPrompt>;
  return { id: obj.id ?? `prompt-${index}`, text: obj.text ?? '' };
}

export const CopilotPanelShell = ({ pack, defaultOpen = true, testID }: CopilotPanelShellProps): React.JSX.Element => {
  // Forces re-render on theme toggle so colors.* below reads fresh values —
  // colors is a plain proxy, not a hook, so nothing else here re-renders
  // this component when the theme changes.
  useAppStore((s) => s.theme);
  const [isOpen, setIsOpen] = useState(defaultOpen);
  const [expandHovered, setExpandHovered] = useState(false);
  const [collapseHovered, setCollapseHovered] = useState(false);
  const [sendHovered, setSendHovered] = useState(false);
  const [hoveredPromptId, setHoveredPromptId] = useState<string | null>(null);
  const prompts = (pack.copilotPrompts ?? []).map(normalizePrompt);
  const messages = useCopilotChatStore((s) => s.messages);
  const draft = useCopilotChatStore((s) => s.draft);
  const setDraft = useCopilotChatStore((s) => s.setDraft);
  const sendMessage = useCopilotChatStore((s) => s.sendMessage);
  const runPrompt = useCopilotChatStore((s) => s.runPrompt);
  const scrollRef = useRef<ScrollView>(null);
  const hasChat = messages.length > 0;

  useEffect(() => {
    if (messages.length > 0) scrollRef.current?.scrollToEnd({ animated: true });
  }, [messages.length]);

  if (!isOpen) {
    return (
      <View
        className="items-center gap-3.5 border-l border-border bg-card py-3.5"
        style={{ width: COLLAPSED_WIDTH, flexGrow: 0, flexShrink: 0 }}
        testID={testID ? `${testID}-collapsed` : undefined}
      >
        <Pressable
          onPress={() => setIsOpen(true)}
          onHoverIn={() => setExpandHovered(true)}
          onHoverOut={() => setExpandHovered(false)}
          accessibilityRole="button"
          accessibilityLabel="Open Mig"
          hitSlop={8}
          className="h-[34px] w-[34px] items-center justify-center rounded-lg border border-border"
          style={{
            // Reference: `style-hover="background:var(--surface-hi);"` —
            // ONLY the background brightens on hover; no colour/border
            // change at all (this button's icon is `var(--fg)` even at
            // rest, so there's nothing further for it to brighten to).
            // An earlier pass introduced an accent-tinted background and
            // accent border here while fixing an unrelated "too dark"
            // complaint — neither exists in the reference for this button.
            backgroundColor: expandHovered ? colors.surfaceHighlight : colors.surface,
          }}
          testID={testID ? `${testID}-expand-button` : undefined}
        >
          <ChevronLeft size={16} color={colors.foreground} />
        </Pressable>
        <View
          className="h-[32px] w-[32px] items-center justify-center rounded-lg"
          style={{ backgroundColor: badgeTint(colors.accent) }}
        >
          <SparkleIcon size={16} color={colors.accent} />
        </View>
        <View className="w-[18px] items-center justify-center overflow-hidden" style={{ height: 40 }}>
          <Text
            style={{ width: 40, transform: [{ rotate: '-90deg' }] }}
            className="text-center font-heading text-[13px] font-semibold tracking-[0.5px] text-muted-foreground"
          >
            Mig
          </Text>
        </View>
        {hasChat ? <View className="h-[7px] w-[7px] rounded-full" style={{ backgroundColor: colors.accent }} /> : null}
      </View>
    );
  }

  return (
    <View
      className="border-l border-border bg-card"
      style={{ width: EXPANDED_WIDTH, flexGrow: 0, flexShrink: 0 }}
      testID={testID}
    >
      <View className="border-b border-border px-[18px] py-[15px]">
        <View className="flex-row items-center gap-[9px]">
          <View
            className="h-[30px] w-[30px] items-center justify-center rounded-lg"
            style={{ backgroundColor: badgeTint(colors.accent) }}
          >
            <SparkleIcon size={16} color={colors.accent} />
          </View>
          <View className="flex-1">
            <View className="flex-row items-center gap-[7px]">
              <Text className="font-heading text-base font-semibold text-foreground">Mig</Text>
              <View className="flex-row items-center gap-[5px]">
                <View className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: colors.success }} />
                <Text className="font-body text-[10.5px]" style={{ color: colors.success }}>online</Text>
              </View>
            </View>
            <Text className="font-mono text-[10.5px] text-muted-foreground">Migration Copilot</Text>
          </View>
          <Pressable
            onPress={() => setIsOpen(false)}
            onHoverIn={() => setCollapseHovered(true)}
            onHoverOut={() => setCollapseHovered(false)}
            accessibilityRole="button"
            accessibilityLabel="Collapse"
            hitSlop={8}
            className="h-[30px] w-[30px] items-center justify-center rounded-[7px] border border-border"
            style={{
              // Reference: `style-hover="background:var(--surface-hi);
              // color:var(--fg);"` — background brightens and the icon
              // goes from muted to full foreground; border never changes.
              // Same accent-tint/accent-border overcorrection as the
              // expand button above, now reverted to match.
              backgroundColor: collapseHovered ? colors.surfaceHighlight : colors.surface,
            }}
            testID={testID ? `${testID}-collapse-button` : undefined}
          >
            <ChevronRight size={15} color={collapseHovered ? colors.foreground : colors.mutedForeground} />
          </Pressable>
        </View>
      </View>

      <ScrollView ref={scrollRef} className="flex-1" contentContainerStyle={{ padding: 16, gap: 14 }}>
        {messages.length === 0 ? (
          <View className="items-center rounded-xl border border-dashed border-border px-4 py-[18px]">
            <Text className="text-center font-body text-[12.5px] leading-5 text-muted-foreground">
              Ask the Copilot about your data, or pick a suggested question below. Visual filters apply
              instantly; changes to your migration config always ask for approval.
            </Text>
          </View>
        ) : (
          messages.map((message) => <ChatMessageBubble key={message.id} message={message} pack={pack} />)
        )}
      </ScrollView>

      <View className="flex-row flex-wrap gap-[7px] border-t border-border px-3.5 py-2.5">
        {prompts.map((prompt) => {
          const isHovered = hoveredPromptId === prompt.id;
          return (
            <Pressable
              key={prompt.id}
              onPress={() => runPrompt(prompt.id, prompt.text, pack)}
              onHoverIn={() => setHoveredPromptId(prompt.id)}
              onHoverOut={() => setHoveredPromptId((current) => (current === prompt.id ? null : current))}
              className="rounded-full px-[11px] py-1.5"
              style={{
                // Reference: `style-hover="border-color:var(--accent);
                // background:var(--surface-hi);"` — exactly two properties
                // change on hover, both instantly (no `transition` in the
                // reference's own inline styles), and border WIDTH never
                // varies between rest/hover — a per-state jump was the
                // earlier "pop"/animation complaint, now fixed by keeping
                // this one constant regardless of hover. The constant
                // itself is 1.5 (not the reference's literal 1px): at this
                // component's actual rendered size a literal 1px reads as
                // too thin to register as a visible border at all — a
                // disclosed, deliberate legibility bump, not a fidelity
                // miss — shared with the KPI tiles via `utils/style.ts`
                // so every bordered chip/tile moves together.
                borderWidth: BORDERED_CHIP_WIDTH,
                borderColor: isHovered ? colors.accent : colors.border,
                backgroundColor: isHovered ? colors.surfaceHighlight : colors.surface,
              }}
              testID={testID !== undefined ? `${testID}-prompt-${prompt.id}` : undefined}
            >
              <Text className="font-body text-xs font-medium text-foreground">{prompt.text}</Text>
            </Pressable>
          );
        })}
      </View>

      <View className="flex-row items-center gap-2 border-t border-border px-3.5 py-[11px]">
        <TextInput
          value={draft}
          onChangeText={setDraft}
          onSubmitEditing={() => sendMessage(draft)}
          placeholder="Ask the Copilot…"
          placeholderTextColor={colors.mutedForeground}
          className="flex-1 rounded-[9px] border border-border bg-surface px-3 py-[9px] font-body text-[13px] text-foreground focus:outline-none"
          testID={testID ? `${testID}-composer-input` : undefined}
        />
        <Pressable
          onPress={() => sendMessage(draft)}
          onHoverIn={() => setSendHovered(true)}
          onHoverOut={() => setSendHovered(false)}
          accessibilityRole="button"
          accessibilityLabel="Send"
          className="h-[38px] w-[38px] items-center justify-center rounded-[9px] bg-primary"
          style={{ opacity: sendHovered ? 0.9 : 1 }}
          testID={testID ? `${testID}-composer-send` : undefined}
        >
          <SendIcon size={16} color={colors.primaryForeground} />
        </Pressable>
      </View>
    </View>
  );
};
