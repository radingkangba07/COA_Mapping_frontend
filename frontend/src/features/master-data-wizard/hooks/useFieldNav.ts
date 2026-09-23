import { useCallback, useMemo } from 'react';

interface FieldNav {
  readonly onPrev: () => void;
  readonly onNext: () => void;
}

/**
 * Wrap-around prev/next over a field/row list — matching the reference's own
 * `(idx - 1 + len) % len` / `(idx + 1) % len` navigation exactly, including
 * having no disabled state at either end. Only reads `.id`, so any
 * id-carrying list works — `EntityField[]` (Profile) and `MappingRow[]`
 * (Mapping) both satisfy this without adaptation.
 */
export function useFieldNav(
  fields: readonly { id: string }[],
  activeFieldId: string | null,
  openField: (fieldId: string) => void,
): FieldNav {
  const activeIndex = useMemo(
    () => (activeFieldId !== null ? fields.findIndex((f) => f.id === activeFieldId) : -1),
    [fields, activeFieldId],
  );

  const onPrev = useCallback(() => {
    if (activeIndex < 0 || fields.length === 0) return;
    const prevIndex = (activeIndex - 1 + fields.length) % fields.length;
    const prevField = fields[prevIndex];
    if (prevField) openField(prevField.id);
  }, [activeIndex, fields, openField]);

  const onNext = useCallback(() => {
    if (activeIndex < 0 || fields.length === 0) return;
    const nextIndex = (activeIndex + 1) % fields.length;
    const nextField = fields[nextIndex];
    if (nextField) openField(nextField.id);
  }, [activeIndex, fields, openField]);

  return { onPrev, onNext };
}
