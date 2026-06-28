import { useCallback, useMemo } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { useERPConfig } from '@/features/erp-config/hooks/useERPConfig';
import type { ConnectionMethod } from '../types/project-scope.types';
import { useProjectScopeStore } from '../store/project-scope.store';
import { selectProjectSummary } from '../store/project-scope.selectors';

// ─── Connection Method Labels ─────────────────────────────────────────────────

const CONNECTION_METHOD_LABELS: Record<ConnectionMethod, string> = {
  mcp: 'MCP',
  csv: 'CSV Upload',
};

// ─── ViewModel Contract ───────────────────────────────────────────────────────

export interface ProjectSummaryDisplay {
  readonly source: string | null;
  readonly target: string | null;
  readonly method: string | null;
  readonly masterData: string;
  readonly openingBalances: string;
  readonly members: string;
}

export interface ProjectSummaryViewModel {
  readonly summary: ProjectSummaryDisplay;
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

/**
 * Adapts the raw `selectProjectSummary` aggregation into the resolved display
 * props consumed by `ProjectSummaryBar`. Subscribes reactively so the bar
 * updates as any section of the draft changes.
 */
export function useProjectSummaryViewModel(): ProjectSummaryViewModel {
  const raw = useProjectScopeStore(useShallow(selectProjectSummary));
  const { erpSystems } = useERPConfig();

  // Mirrors useProjectScopeViewModel.resolveName: id null -> null;
  // else resolve label by id, falling back to the id string.
  const resolveErp = useCallback(
    (id: string | null): string | null => {
      if (id === null) {
        return null;
      }
      const match = erpSystems.find((erp) => erp.id === id);
      return match?.name ?? id;
    },
    [erpSystems],
  );

  const summary = useMemo<ProjectSummaryDisplay>(
    () => ({
      source: resolveErp(raw.source),
      target: resolveErp(raw.target),
      method: CONNECTION_METHOD_LABELS[raw.method] ?? null,
      masterData: `${raw.masterDataCount} of ${raw.masterDataTotal} selected`,
      openingBalances: `${raw.openingBalancesCount} of ${raw.openingBalancesTotal} selected`,
      members: String(raw.members),
    }),
    [raw, resolveErp],
  );

  return { summary };
}
