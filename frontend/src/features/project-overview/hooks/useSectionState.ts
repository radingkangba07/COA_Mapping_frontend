import { useState, useEffect, useCallback } from 'react';
import { storageService } from '@/shared/services/storage/storage.service';
import { STORAGE_KEYS } from '@/shared/services/storage/storage.types';

type CollapsedMap = Record<string, boolean>;

/**
 * Persisted expand/collapse state keyed by section identifier.
 * Survives navigation and app restarts.
 * Toggling one section never affects another.
 */
export function useSectionState(): [
  collapsed: CollapsedMap,
  toggle: (key: string) => void,
] {
  const [collapsed, setCollapsed] = useState<CollapsedMap>({});

  useEffect(() => {
    storageService.get(STORAGE_KEYS.SECTION_STATE).then((raw) => {
      if (!raw) return;
      try {
        const parsed = JSON.parse(raw) as CollapsedMap;
        setCollapsed(parsed);
      } catch {
        // discard malformed persisted data
      }
    });
  }, []);

  const toggle = useCallback((key: string) => {
    setCollapsed((prev) => {
      const next: CollapsedMap = { ...prev, [key]: !prev[key] };
      storageService.set(STORAGE_KEYS.SECTION_STATE, JSON.stringify(next));
      return next;
    });
  }, []);

  return [collapsed, toggle];
}
