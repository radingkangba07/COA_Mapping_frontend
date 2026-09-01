import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import { getCannedReply, GENERIC_REPLY } from '../services/copilotChat.service';
import { applyCopilotPromptAction } from '../utils/copilotPromptActions';
import type { EntityPack } from '../dp-kit/types/entity';

export type MessageFeedback = 'helpful' | 'incorrect' | 'missing' | null;

export interface ChatMessage {
  readonly id: string;
  readonly role: 'user' | 'assistant';
  readonly text: string;
  // Only meaningful for assistant messages — the reference's own `feedback`
  // state is one mutually-exclusive slot per message, not three
  // independent booleans (`setFeedback` toggles the slot off if the same
  // kind is clicked again, matching the reference exactly).
  readonly feedback: MessageFeedback;
}

interface CopilotChatState {
  readonly messages: readonly ChatMessage[];
  readonly draft: string;
  // Which message (if any) currently shows the "Replace the AI's
  // selection" inline correction panel — unrelated to `feedback`.
  readonly correctionForId: string | null;
}

interface CopilotChatActions {
  setDraft: (text: string) => void;
  sendMessage: (text: string) => Promise<void>;
  runPrompt: (promptId: string, promptText: string, pack: EntityPack) => void;
  setFeedback: (messageId: string, kind: 'helpful' | 'incorrect' | 'missing') => void;
  startCorrect: (messageId: string) => void;
  cancelCorrect: () => void;
  saveCorrect: () => void;
  reset: () => void;
}

let msgSeq = 0;

const initialState: CopilotChatState = { messages: [], draft: '', correctionForId: null };

/**
 * Client-side only, same as `sourceProfile.store.ts`'s decisions log — no
 * backend to persist to yet. `sendMessage` is async even though
 * `getCannedReply` resolves instantly today, so swapping in a real reply
 * source later is a body change to that one function, not a signature
 * change at every call site.
 */
export const useCopilotChatStore = create<CopilotChatState & CopilotChatActions>()(
  immer((set) => ({
    ...initialState,

    setDraft: (text) => {
      set((state) => {
        state.draft = text;
      });
    },

    sendMessage: async (text) => {
      const trimmed = text.trim();
      if (!trimmed) return;

      set((state) => {
        state.messages.push({ id: `msg-${msgSeq++}`, role: 'user', text: trimmed, feedback: null });
        state.draft = '';
      });

      const reply = await getCannedReply(trimmed);

      set((state) => {
        state.messages.push({ id: `msg-${msgSeq++}`, role: 'assistant', text: reply, feedback: null });
      });
    },

    // Synchronous, unlike sendMessage — the reply is fixture data already
    // in memory via `pack`, not a plausible future network call.
    runPrompt: (promptId, promptText, pack) => {
      const reply = pack.copilotResponses?.[promptId]?.text ?? GENERIC_REPLY;
      set((state) => {
        state.messages.push({ id: `msg-${msgSeq++}`, role: 'user', text: promptText, feedback: null });
        state.messages.push({ id: `msg-${msgSeq++}`, role: 'assistant', text: reply, feedback: null });
      });
      applyCopilotPromptAction(promptId);
    },

    setFeedback: (messageId, kind) => {
      set((state) => {
        const message = state.messages.find((m) => m.id === messageId);
        if (!message) return;
        message.feedback = message.feedback === kind ? null : kind;
      });
    },

    startCorrect: (messageId) => {
      set((state) => {
        state.correctionForId = messageId;
      });
    },

    cancelCorrect: () => {
      set((state) => {
        state.correctionForId = null;
      });
    },

    saveCorrect: () => {
      set((state) => {
        state.correctionForId = null;
      });
    },

    reset: () => set(() => initialState),
  })),
);
