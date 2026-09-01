import type { ChatMessage } from '../store/copilotChat.store';

export type ThreadId = string;

export interface ArchivedThreadSummary {
  readonly id: ThreadId;
  readonly endedAt: Date;
  readonly firstMessagePreview: string;
  readonly lastMessagePreview: string;
}

// Thread lifecycle (Clear/New Chat/history) has no real backend either —
// client-side only, same convention as `sourceProfile.store.ts`'s decisions
// log. An in-memory Map survives SPA navigation but resets on a full page
// reload; not scoped per-project since this preview only ever has one
// profile open at a time (matches the reference's own DA-232 stub, which
// has this identical limitation despite accepting a projectId param it
// never actually used to scope the Map).
interface StoredThread {
  readonly id: ThreadId;
  readonly messages: readonly ChatMessage[];
  readonly endedAt: Date;
}
const ARCHIVED_THREADS = new Map<ThreadId, StoredThread>();
let threadSeq = 0;

function previewOf(message: ChatMessage | undefined): string {
  return message ? message.text : '';
}

// No-op stub — clearing never archives, and there's nothing else to
// contact. The seam exists so a real backend swap later is a body change,
// not a signature change at every call site.
export async function clearThread(_threadId: ThreadId): Promise<void> {
  return undefined;
}

export async function archiveThread(threadId: ThreadId, messages: readonly ChatMessage[]): Promise<void> {
  ARCHIVED_THREADS.set(threadId, { id: threadId, messages, endedAt: new Date() });
}

export async function createThread(): Promise<{ threadId: ThreadId }> {
  threadSeq += 1;
  return { threadId: `thread-${threadSeq}` };
}

export async function listArchivedThreads(): Promise<readonly ArchivedThreadSummary[]> {
  return Array.from(ARCHIVED_THREADS.values())
    .map((thread) => ({
      id: thread.id,
      endedAt: thread.endedAt,
      firstMessagePreview: previewOf(thread.messages[0]),
      lastMessagePreview: previewOf(thread.messages[thread.messages.length - 1]),
    }))
    .sort((a, b) => b.endedAt.getTime() - a.endedAt.getTime());
}

export async function getThreadMessages(threadId: ThreadId): Promise<readonly ChatMessage[] | null> {
  return ARCHIVED_THREADS.get(threadId)?.messages ?? null;
}

// The reference's own exact freeform-reply sentence (`sendInput`'s
// assistant message) — used verbatim both as the freeform fallback and as
// the fallback for any prompt id with no matching `copilotResponses` entry
// (e.g. the customers fixture's synthetic prompt ids).
export const GENERIC_REPLY =
  'I can filter the table, explain any inferred role, compare two fields, or propose fixes — try a suggested question. ' +
  'Every visual action is reversible, and anything that changes your migration config asks for approval first.';

/**
 * Dummy reply source for freeform (non-suggested-prompt) messages — same
 * convention as the reference's own chat service (also a stub; real
 * LLM-backed replies are a later ticket there too, so there's no backend
 * to integrate with yet). Suggested prompts get their own, specific reply
 * from `pack.copilotResponses` (see `copilotChat.store.ts`'s `runPrompt`) —
 * this generic reply is only for typed-freeform text, matching the
 * reference's own `sendInput` behaviour exactly.
 */
export async function getCannedReply(_prompt: string): Promise<string> {
  return GENERIC_REPLY;
}
