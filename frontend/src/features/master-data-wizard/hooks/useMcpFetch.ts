import { useCallback, useEffect, useRef, useState } from 'react';
import { httpClient } from '@/shared/services/http/http.instance';
import { toAppError } from '@/shared/services/http/http.client';
import { useProjectScopeStore } from '@/features/projects/store/project-scope.store';
import { encryptCredentials } from '@/shared/services/crypto/credentials.crypto';

interface McpFetchResponse {
  readonly scope: string;
  readonly records: Record<string, unknown>[];
  readonly fields: string[];
  readonly total: number;
  readonly snapshot_id?: string;
  readonly storage_path?: string;
}

interface McpFetchViewModel {
  readonly records: Record<string, unknown>[];
  readonly fields: string[];
  readonly total: number;
  readonly isFetching: boolean;
  readonly error: string | null;
  readonly snapshotStoragePath: string | null;
  /** True only when the user explicitly clicked Fetch in this session (not auto-loaded from snapshot). */
  readonly hasFetchedInSession: boolean;
  readonly fetch: () => Promise<void>;
}

// MCP adapter YAML keys scopes in kebab-case (e.g. fixed-assets), while
// dp-kit entity IDs are camelCase (fixedAssets). Pipeline uses snake_case and
// is handled by toBackendScope inside entity-pack.service. Only the two MCP
// adapter endpoints (fetch-records, snapshot) need this conversion.
function toMcpScope(entityId: string): string {
  return entityId.replace(/[A-Z]/g, (c) => `-${c.toLowerCase()}`);
}

export function useMcpFetch(
  connectionId: string | null,
  credentials: Record<string, string> | null,
  scope: string,
  workstreamId?: string | null,
): McpFetchViewModel {
  const cacheKey = workstreamId ? `${workstreamId}:${scope}` : scope;
  const cached = useProjectScopeStore((s) => s.mcpFetchData[cacheKey]);
  const setMcpFetchData = useProjectScopeStore((s) => s.setMcpFetchData);

  const [records, setRecords] = useState<Record<string, unknown>[]>(cached?.records ?? []);
  const [fields, setFields] = useState<string[]>(cached?.fields ?? []);
  const [total, setTotal] = useState<number>(cached?.total ?? 0);
  const [isFetching, setIsFetching] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [snapshotStoragePath, setSnapshotStoragePath] = useState<string | null>(cached?.storagePath ?? null);
  const [hasFetchedInSession, setHasFetchedInSession] = useState(false);
  const autoFetchedRef = useRef(false);

  const applyData = useCallback(
    (data: McpFetchResponse) => {
      setRecords(data.records);
      setFields(data.fields);
      setTotal(data.total);
      if (data.storage_path) setSnapshotStoragePath(data.storage_path);
      setMcpFetchData(cacheKey, {
        records: data.records,
        fields: data.fields,
        total: data.total,
        storagePath: data.storage_path,
      });
    },
    [cacheKey, setMcpFetchData],
  );

  // Load snapshot from server (no credentials needed — reads from DO Spaces).
  const loadSnapshot = useCallback(async (): Promise<boolean> => {
    if (!workstreamId) return false;
    try {
      const { data } = await httpClient.get<McpFetchResponse>(
        `/api/v1/mcp-clients/snapshot?workstream_id=${workstreamId}&scope=${toMcpScope(scope)}`,
      );
      applyData(data);
      return true;
    } catch {
      return false;
    }
  }, [workstreamId, applyData, scope]);

  // Live fetch from ERP — requires valid credentials/token.
  const fetch = useCallback(async (): Promise<void> => {
    if (connectionId === null || credentials === null) {
      setError('No MCP connection available');
      return;
    }

    setIsFetching(true);
    setError(null);

    try {
      const encryptedCreds = await encryptCredentials(credentials);
      const { data } = await httpClient.post<McpFetchResponse>(
        `/api/v1/mcp-clients/${connectionId}/fetch-records`,
        { encrypted_credentials: encryptedCreds, scope: toMcpScope(scope), workstream_id: workstreamId ?? null },
      );
      applyData(data);
      setHasFetchedInSession(true);
    } catch (e: unknown) {
      setError(toAppError(e).message);
    } finally {
      setIsFetching(false);
    }
  }, [connectionId, credentials, scope, workstreamId, applyData]);

  // On mount: use Zustand cache → try snapshot → live fetch (in that priority order).
  useEffect(() => {
    if (autoFetchedRef.current) return;
    autoFetchedRef.current = true;

    if (cached) return;

    void (async () => {
      const loaded = await loadSnapshot();
      if (loaded) return;
      // Intentional: if no snapshot exists yet, trigger a live fetch automatically
      // so the user sees data without having to press the Fetch button first.
      if (connectionId !== null && credentials !== null) {
        void fetch();
      }
    })();
  }, [cached, connectionId, credentials, fetch, loadSnapshot]);

  return { records, fields, total, isFetching, error, snapshotStoragePath, hasFetchedInSession, fetch };
}
