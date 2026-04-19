import { z } from 'zod';
import { createWSClient } from '@/shared/services/websocket/ws-client';
import type { WSClient, WSCloseReason } from '@/shared/services/websocket/ws.types';
import { env } from '@/config/env';
import { storageService } from '@/shared/services/storage/storage.service';
import { STORAGE_KEYS } from '@/shared/services/storage/storage.types';
import type { AppError } from '@/shared/types/result.types';
import {
  toJobStatusEvent,
  type JobStatusEvent,
  type JobStatusEventDTO,
} from '@/features/migration/types/job-event.types';

// ─── Zod schema at the WS boundary ─────────────────────────────────────────

const metadataSchema = z.object({
  source_system: z.string().nullable(),
  target_system: z.string().nullable(),
});

export const jobStatusEventSchema = z.object({
  job_id: z.string(),
  project_id: z.string().nullable(),
  company_id: z.string().nullable(),
  job_type: z.string(),
  status: z.enum(['queued', 'running', 'completed', 'failed']),
  source_file_id: z.string().nullable(),
  target_file_id: z.string().nullable(),
  mapping_file_id: z.string().nullable(),
  account_type_mapping_file_id: z.string().nullable(),
  triggered_by: z.string().nullable(),
  created_at: z.string().nullable(),
  started_at: z.string().nullable(),
  completed_at: z.string().nullable(),
  event_at: z.string().nullable(),
  error_message: z.string().nullable(),
  metadata: metadataSchema,
});

// ─── URL builder ───────────────────────────────────────────────────────────

/**
 * Build the WebSocket URL for a project's job stream. Converts the HTTP
 * base URL scheme to `ws`/`wss` and appends the auth token as a query param
 * (browsers cannot set Authorization headers on WebSocket handshakes).
 */
export function buildJobStreamUrl(
  baseUrl: string,
  projectId: string,
  token: string,
): string {
  const wsBase = baseUrl
    .replace(/^https:\/\//i, 'wss://')
    .replace(/^http:\/\//i, 'ws://')
    .replace(/\/+$/, '');
  const encodedToken = encodeURIComponent(token);
  return `${wsBase}/api/v1/ws/jobs/project/${projectId}?token=${encodedToken}`;
}

// ─── Handlers ──────────────────────────────────────────────────────────────

export interface JobStreamHandlers {
  readonly onEvent: (event: JobStatusEvent) => void;
  readonly onError?: (error: AppError) => void;
  readonly onClose?: (reason: WSCloseReason | number) => void;
  readonly onOpen?: () => void;
}

export type TokenProvider = () => Promise<string | null>;

/**
 * Default token provider — reads the access token from secure storage. Used
 * when callers don't inject a custom provider (tests typically do).
 */
export const defaultTokenProvider: TokenProvider = async () => {
  return storageService.get(STORAGE_KEYS.ACCESS_TOKEN);
};

// ─── Parser ────────────────────────────────────────────────────────────────

function parseFrame(raw: string): JobStatusEvent | null {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return null;
  }
  // Pass-through for control frames — ws-client handles pong; other
  // control-shaped frames (no job_id) are ignored by the zod schema.
  if (
    typeof parsed === 'object' &&
    parsed !== null &&
    'type' in parsed &&
    (parsed as Record<string, unknown>).type === 'pong'
  ) {
    return null;
  }
  const result = jobStatusEventSchema.safeParse(parsed);
  if (!result.success) return null;
  const dto: JobStatusEventDTO = result.data;
  return toJobStatusEvent(dto);
}

// Exposed for tests
export const __jobStreamInternals = { parseFrame };

// ─── Factory ───────────────────────────────────────────────────────────────

export function createJobStream(
  projectId: string,
  tokenProvider: TokenProvider,
  handlers: JobStreamHandlers,
): WSClient {
  const client = createWSClient<JobStatusEvent>({
    url: async (): Promise<string> => {
      const token = await tokenProvider();
      if (token === null || token.length === 0) {
        throw new Error('No access token available for WebSocket connection');
      }
      return buildJobStreamUrl(env.API_BASE_URL, projectId, token);
    },
    parse: parseFrame,
    onMessage: (msg): void => handlers.onEvent(msg),
    ...(handlers.onOpen ? { onOpen: handlers.onOpen } : {}),
    ...(handlers.onClose ? { onClose: handlers.onClose } : {}),
    onError: (err): void => {
      handlers.onError?.({
        code: 'WS_ERROR',
        message: err.message,
      });
    },
  });
  return client;
}
