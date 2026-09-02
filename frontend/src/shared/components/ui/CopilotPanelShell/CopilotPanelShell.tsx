import React, { useEffect, useRef, useState } from 'react';
import { Modal, Pressable, ScrollView, Text, TextInput, View, type LayoutRectangle } from 'react-native';
import { ChevronLeft, ChevronRight, History, SquarePen, Trash2 } from 'lucide-react-native';
import { colors } from '@/config/theme';
import { cn } from '@/shared/utils/string.utils';
import { isWeb } from '@/shared/utils/platform.utils';
import { formatDateTime } from '@/shared/utils/date.utils';
import { useAppStore } from '@/shared/store/app.store';
import { useConfirm } from '@/shared/hooks/useConfirm';
import { useToast } from '@/shared/hooks/useToast';
import { Dialog } from '@/shared/components/ui/Dialog';
import { Button } from '@/shared/components/ui/Button';
import { badgeTint } from '@/features/master-data-wizard/dp-kit/native/dp-theme';
import { BORDERED_CHIP_WIDTH } from '@/features/master-data-wizard/utils/style';
import { SparkleIcon } from '@/shared/components/icons/SparkleIcon';
import { SendIcon } from '@/shared/components/icons/SendIcon';
import { useCopilotChatStore } from '@/features/master-data-wizard/store/copilotChat.store';
import { clearThread, archiveThread, createThread, listArchivedThreads, getThreadMessages } from '@/features/master-data-wizard/services/copilotChat.service';
import { ChatMessageBubble } from './ChatMessageBubble';
import { CopilotHistoryDropdown, type HistoryEntryView } from './CopilotHistoryDropdown';
import type { EntityPack } from '@/features/master-data-wizard/dp-kit/types/entity';

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
 * copilotChat.service). Clear/New Chat/thread-history (DA-343, ported from
 * DA-232) are implemented; fix-suggestion cards are not — that's real,
 * non-trivial functionality tied to a fix-application pipeline (autofix)
 * that doesn't exist in this feature yet, not a quick add.
 * `sendMessage`/`getCannedReply` are async specifically so swapping in a
 * real reply source later is a body change, not a rewrite.
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

export const CopilotPanelShell = ({ pack, defaultOpen = false, testID }: CopilotPanelShellProps): React.JSX.Element => {
  // Forces re-render on theme toggle so colors.* below reads fresh values —
  // colors is a plain proxy, not a hook, so nothing else here re-renders
  // this component when the theme changes.
  useAppStore((s) => s.theme);
  const [isOpen, setIsOpen] = useState(defaultOpen);
  const [expandHovered, setExpandHovered] = useState(false);
  const [collapseHovered, setCollapseHovered] = useState(false);
  const [historyHovered, setHistoryHovered] = useState(false);
  const [newChatHovered, setNewChatHovered] = useState(false);
  const [clearHovered, setClearHovered] = useState(false);
  const [sendHovered, setSendHovered] = useState(false);
  const [hoveredPromptId, setHoveredPromptId] = useState<string | null>(null);
  const [historyEntries, setHistoryEntries] = useState<readonly HistoryEntryView[]>([]);
  const [historyAnchor, setHistoryAnchor] = useState<LayoutRectangle | null>(null);
  const historyButtonRef = useRef<View>(null);
  const prompts = (pack.copilotPrompts ?? []).map(normalizePrompt);
  const messages = useCopilotChatStore((s) => s.messages);
  const draft = useCopilotChatStore((s) => s.draft);
  const threadId = useCopilotChatStore((s) => s.threadId);
  const viewingThreadId = useCopilotChatStore((s) => s.viewingThreadId);
  const viewingMessages = useCopilotChatStore((s) => s.viewingMessages);
  const historyOpen = useCopilotChatStore((s) => s.historyOpen);
  const setDraft = useCopilotChatStore((s) => s.setDraft);
  const sendMessage = useCopilotChatStore((s) => s.sendMessage);
  const runPrompt = useCopilotChatStore((s) => s.runPrompt);
  const clearMessages = useCopilotChatStore((s) => s.clearMessages);
  const startNewThread = useCopilotChatStore((s) => s.startNewThread);
  const toggleHistory = useCopilotChatStore((s) => s.toggleHistory);
  const closeHistory = useCopilotChatStore((s) => s.closeHistory);
  const viewArchivedThread = useCopilotChatStore((s) => s.viewArchivedThread);
  const returnToActiveThread = useCopilotChatStore((s) => s.returnToActiveThread);
  const scrollRef = useRef<ScrollView>(null);
  const { confirm, isVisible: confirmVisible, confirmOptions, onConfirm: handleConfirmOk, onCancel: handleConfirmCancel } = useConfirm();
  const { showSuccess } = useToast();
  const hasChat = messages.length > 0;

  // Discriminant for live-vs-archived view — not a separate boolean that
  // could disagree with `viewingThreadId`.
  const isReadOnly = viewingThreadId !== null;
  const displayedMessages = isReadOnly ? viewingMessages : messages;

  useEffect(() => {
    if (displayedMessages.length > 0) scrollRef.current?.scrollToEnd({ animated: true });
  }, [displayedMessages.length]);

  const handleClearChat = (): void => {
    void (async () => {
      const confirmed = await confirm({
        title: 'Clear this conversation?',
        message: "This can't be undone. All messages in this conversation will be permanently deleted.",
        confirmText: 'Clear',
        cancelText: 'Cancel',
      });
      if (!confirmed) return;
      await clearThread(threadId);
      clearMessages();
      showSuccess('Conversation cleared');
    })();
  };

  const handleNewChat = (): void => {
    void (async () => {
      await archiveThread(threadId, messages);
      const { threadId: newThreadId } = await createThread();
      startNewThread(newThreadId);
      showSuccess('Started a new chat');
    })();
  };

  const handleToggleHistory = (): void => {
    void (async () => {
      if (!historyOpen) {
        const summaries = await listArchivedThreads();
        setHistoryEntries(
          summaries.map((entry) => ({
            id: entry.id,
            endedAtLabel: formatDateTime(entry.endedAt),
            preview: entry.lastMessagePreview || entry.firstMessagePreview,
          })),
        );
        historyButtonRef.current?.measureInWindow((x, y, width, height) => {
          setHistoryAnchor({ x, y, width, height });
        });
      }
      toggleHistory();
    })();
  };

  const handleSelectHistoryEntry = (id: string): void => {
    void (async () => {
      const entryMessages = await getThreadMessages(id);
      if (!entryMessages) return;
      viewArchivedThread(id, entryMessages);
    })();
  };

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
          <View ref={historyButtonRef}>
            <Pressable
              onPress={handleToggleHistory}
              onHoverIn={() => setHistoryHovered(true)}
              onHoverOut={() => setHistoryHovered(false)}
              accessibilityRole="button"
              accessibilityLabel="Conversation history"
              hitSlop={8}
              className="h-[30px] w-[30px] items-center justify-center rounded-[7px] border border-border"
              style={{ backgroundColor: historyHovered ? colors.surfaceHighlight : colors.surface, opacity: isReadOnly ? 0.4 : 1 }}
              disabled={isReadOnly}
              testID={testID ? `${testID}-history-button` : undefined}
            >
              <History size={15} color={historyHovered ? colors.foreground : colors.mutedForeground} />
            </Pressable>
          </View>
          <Pressable
            onPress={handleNewChat}
            onHoverIn={() => setNewChatHovered(true)}
            onHoverOut={() => setNewChatHovered(false)}
            accessibilityRole="button"
            accessibilityLabel="New chat"
            hitSlop={8}
            className="h-[30px] w-[30px] items-center justify-center rounded-[7px] border border-border"
            style={{ backgroundColor: newChatHovered ? colors.surfaceHighlight : colors.surface, opacity: isReadOnly ? 0.4 : 1 }}
            disabled={isReadOnly}
            testID={testID ? `${testID}-new-chat-button` : undefined}
          >
            <SquarePen size={15} color={newChatHovered ? colors.foreground : colors.mutedForeground} />
          </Pressable>
          <Pressable
            onPress={handleClearChat}
            onHoverIn={() => setClearHovered(true)}
            onHoverOut={() => setClearHovered(false)}
            accessibilityRole="button"
            accessibilityLabel="Clear conversation"
            hitSlop={8}
            className="h-[30px] w-[30px] items-center justify-center rounded-[7px] border border-border"
            style={{ backgroundColor: clearHovered ? colors.surfaceHighlight : colors.surface, opacity: isReadOnly ? 0.4 : 1 }}
            disabled={isReadOnly}
            testID={testID ? `${testID}-clear-button` : undefined}
          >
            <Trash2 size={15} color={clearHovered ? colors.foreground : colors.mutedForeground} />
          </Pressable>
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

      {isReadOnly ? (
        <View className="flex-row items-center justify-between border-b border-border bg-surface px-[18px] py-2">
          <Text className="font-body text-[11.5px] text-muted-foreground">Viewing an earlier conversation</Text>
          <Pressable onPress={returnToActiveThread} testID={testID ? `${testID}-back-to-active` : undefined}>
            <Text className="font-body text-[11.5px] font-semibold text-accent">Back to current chat</Text>
          </Pressable>
        </View>
      ) : null}

      <Modal visible={historyOpen} transparent animationType={isWeb ? 'none' : 'fade'} onRequestClose={closeHistory}>
        <Pressable className={cn('flex-1', isWeb ? 'bg-transparent' : 'bg-black/20')} onPress={closeHistory}>
          <View
            className="absolute"
            style={historyAnchor ? { top: historyAnchor.y + historyAnchor.height + 4, left: Math.max(8, historyAnchor.x + historyAnchor.width - 288) } : undefined}
            onStartShouldSetResponder={() => true}
          >
            <CopilotHistoryDropdown
              entries={historyEntries}
              onSelectEntry={handleSelectHistoryEntry}
              testID={testID ? `${testID}-history-dropdown` : undefined}
            />
          </View>
        </Pressable>
      </Modal>

      {confirmVisible && confirmOptions !== null ? (
        <Dialog visible={confirmVisible} onClose={handleConfirmCancel} testID={testID ? `${testID}-clear-confirm` : undefined}>
          <Dialog.Header>
            <Dialog.Title>{confirmOptions.title}</Dialog.Title>
          </Dialog.Header>
          <Dialog.Content>
            <Text className="font-body text-sm text-foreground">{confirmOptions.message}</Text>
          </Dialog.Content>
          <Dialog.Footer>
            <Button variant="outline" onPress={handleConfirmCancel} testID={testID ? `${testID}-clear-confirm-cancel` : undefined}>
              <Text className="text-sm font-medium text-foreground">{confirmOptions.cancelText ?? 'Cancel'}</Text>
            </Button>
            <Button variant="destructive" onPress={handleConfirmOk} testID={testID ? `${testID}-clear-confirm-ok` : undefined}>
              <Text className="text-sm font-semibold text-destructive-foreground">{confirmOptions.confirmText ?? 'Confirm'}</Text>
            </Button>
          </Dialog.Footer>
        </Dialog>
      ) : null}

      <ScrollView ref={scrollRef} className="flex-1" contentContainerStyle={{ padding: 16, gap: 14 }}>
        {displayedMessages.length === 0 ? (
          <View className="items-center rounded-xl border border-dashed border-border px-4 py-[18px]">
            <Text className="text-center font-body text-[12.5px] leading-5 text-muted-foreground">
              {isReadOnly
                ? 'This archived conversation has no messages.'
                : 'Ask the Copilot about your data, or pick a suggested question below. Visual filters apply ' +
                  'instantly; changes to your migration config always ask for approval.'}
            </Text>
          </View>
        ) : (
          displayedMessages.map((message) => <ChatMessageBubble key={message.id} message={message} pack={pack} />)
        )}
      </ScrollView>

      {!isReadOnly ? (
        <>
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
        </>
      ) : null}
    </View>
  );
};
