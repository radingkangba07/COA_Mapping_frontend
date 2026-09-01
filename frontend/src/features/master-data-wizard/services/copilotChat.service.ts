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
