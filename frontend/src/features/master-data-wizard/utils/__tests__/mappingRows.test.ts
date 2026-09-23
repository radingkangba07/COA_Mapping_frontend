import { getEntityPack } from '../../services/entity-pack.service';
import { buildMappingRows, mappingSortValue, canBulkAccept, toBulkAcceptField, type MappingRow } from '../mappingRows';

describe('buildMappingRows', () => {
  it('concatenates proposals + missingTargets and shapes each row (real items fixture)', async () => {
    const result = await getEntityPack('items');
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    const rows = buildMappingRows(result.data.mapping, null);
    expect(rows).toHaveLength(46);

    const f1 = rows.find((r) => r.id === 'f1');
    expect(f1).toEqual({
      id: 'f1',
      name: 'Inactive',
      sdtype: 'Boolean',
      role: 'Flag',
      samples: ['No'],
      sampleLine: 'No',
      status: 'Excluded',
      targetId: undefined,
      targetLabel: 'Not mapped',
      targetDtype: '',
      handoff: undefined,
      handoffFind: 'info',
      evidence: [{ code: 'samples', short: 'Values', label: 'Sample values' }],
      conf: undefined,
      validation: '—',
      validationImpact: 'na',
      statusImpact: 'na',
    });

    // m1 (missingTargets) omits name/sdtype/role/samples entirely in the
    // fixture — no fallback for `name` (nothing to show), but sdtype/role
    // fall back to '—' and an empty sample list falls back to '—' too.
    // `targetId` is present and required — a "missing target" row is
    // defined by needing one, so it always resolves to a real target.
    const m1 = rows.find((r) => r.id === 'm1');
    expect(m1).toEqual({
      id: 'm1',
      name: undefined,
      sdtype: '—',
      role: '—',
      samples: [],
      sampleLine: '—',
      status: 'Missing target',
      targetId: 'invoice_policy',
      targetLabel: 'Invoicing Policy',
      targetDtype: 'Selection',
      handoff: undefined,
      handoffFind: 'info',
      evidence: [{ code: 'required', short: 'Required', label: 'Required target' }],
      conf: undefined,
      validation: '—',
      validationImpact: 'na',
      // "Missing target" is one of the two statuses that map to 'blocker'.
      statusImpact: 'blocker',
      why: 'No source column addresses how invoicing quantity is determined — Odoo\'s Invoicing Policy has no candidate in this file.',
    });
  });

  it('resolves a real proposed target through mapping.targetFields, and its handoff chip tone', async () => {
    const result = await getEntityPack('items');
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    const rows = buildMappingRows(result.data.mapping, null);
    const f3 = rows.find((r) => r.id === 'f3');
    expect(f3).toMatchObject({
      targetId: 'default_code',
      targetLabel: 'Internal Reference',
      targetDtype: 'Char',
      handoff: 'Ready',
      handoffFind: 'ok',
    });
  });

  it("shapes the customers fixture's missingTargets row, which already stores literal '—' values (not omitted keys)", async () => {
    const result = await getEntityPack('customers');
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    const rows = buildMappingRows(result.data.mapping, null);
    expect(rows).toHaveLength(10);

    const cm1 = rows.find((r) => r.id === 'cm1');
    expect(cm1).toEqual({
      id: 'cm1',
      name: '—',
      sdtype: '—',
      role: 'Required target',
      samples: [],
      sampleLine: '—',
      status: 'Missing target',
      // cm1's real handoff value is a literal JSON `null` (not omitted) —
      // confirms the null -> undefined normalization actually fires, not
      // just the already-omitted-key case items' fixture happens to use.
      targetId: 'customer_rank',
      targetLabel: 'Customer Rank',
      targetDtype: 'Integer',
      handoff: undefined,
      handoffFind: 'info',
      evidence: [{ code: 'required', short: 'Required', label: 'Required target' }],
      // cm1's real conf value is also a literal JSON `null`, same
      // null -> undefined normalization as handoff/targetId above.
      conf: undefined,
      validation: '—',
      validationImpact: 'na',
      statusImpact: 'blocker',
      why: 'customer_rank is required for a partner to behave as a customer in Odoo. No source field supplies it; set a project-wide default of 1.',
    });
  });

  it('applies the active card filter as a hard filter (removes non-matching rows, never dims)', async () => {
    const result = await getEntityPack('items');
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(buildMappingRows(result.data.mapping, 'high')).toHaveLength(3);
    expect(buildMappingRows(result.data.mapping, 'review')).toHaveLength(4);
    expect(buildMappingRows(result.data.mapping, 'none')).toHaveLength(17);
    expect(buildMappingRows(result.data.mapping, 'missing')).toHaveLength(1);
    expect(buildMappingRows(result.data.mapping, 'excluded')).toHaveLength(21);
  });

  it('returns every row when the card id matches no real card (e.g. null for "All fields")', async () => {
    const result = await getEntityPack('items');
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(buildMappingRows(result.data.mapping, null)).toHaveLength(46);
    expect(buildMappingRows(result.data.mapping, 'not-a-real-card')).toHaveLength(46);
  });

  it('returns an empty list when the pack has no mapping block at all', () => {
    expect(buildMappingRows(undefined, null)).toEqual([]);
  });
});

describe('mappingSortValue', () => {
  const row = {
    id: 'r1',
    name: 'Zebra',
    sdtype: 'Char',
    role: 'Identifier',
    samples: ['Beta', 'Alpha'],
    sampleLine: 'Beta  ·  Alpha',
    status: 'Suggested',
    targetId: 'name',
    targetLabel: 'Customer Name',
    targetDtype: 'Char',
    handoff: 'Ready',
    handoffFind: 'ok',
    evidence: [{ code: 'name', short: 'Name', label: 'Field name' }],
    conf: 88,
    validation: 'Compatible',
    validationImpact: 'clean' as const,
    statusImpact: 'clean' as const,
    why: undefined,
  };

  it('sorts by the first raw sample, never the joined sampleLine', () => {
    expect(mappingSortValue(row, 'sample')).toBe('beta');
  });

  it('sorts by name and role, lowercased', () => {
    expect(mappingSortValue(row, 'name')).toBe('zebra');
    expect(mappingSortValue(row, 'role')).toBe('identifier');
  });

  it('falls back to a stable empty string for a row missing the sorted field', () => {
    const noSamples = { ...row, samples: [] };
    expect(mappingSortValue(noSamples, 'sample')).toBe('');
    expect(mappingSortValue({ ...row, name: undefined }, 'name')).toBe('');
  });

  it('returns empty string for null (unsorted)', () => {
    expect(mappingSortValue(row, null)).toBe('');
  });

  it('sorts by targetLabel, and an unmapped target sorts last ("zzz")', () => {
    expect(mappingSortValue(row, 'target')).toBe('customer name');
    expect(mappingSortValue({ ...row, targetId: undefined }, 'target')).toBe('zzz');
  });

  it('sorts evidence by count, confidence numerically (unscored lowest)', () => {
    expect(mappingSortValue(row, 'evidence')).toBe(1);
    expect(mappingSortValue({ ...row, evidence: [] }, 'evidence')).toBe(0);
    expect(mappingSortValue(row, 'conf')).toBe(88);
    expect(mappingSortValue({ ...row, conf: undefined }, 'conf')).toBe(-1);
  });

  it('sorts validation/status by severity rank, not alphabetically', () => {
    const blockerRow = { ...row, validationImpact: 'blocker' as const, statusImpact: 'blocker' as const };
    const cleanRank = mappingSortValue(row, 'validation');
    const blockerRank = mappingSortValue(blockerRow, 'validation');
    expect(blockerRank).toBeGreaterThan(cleanRank as number);
    expect(mappingSortValue(row, 'status')).toBe(mappingSortValue(row, 'validation'));
  });
});

function makeMappingRow(overrides: Partial<MappingRow> = {}): MappingRow {
  return {
    id: 'f1',
    name: 'Item Name',
    sdtype: 'Text',
    role: 'Display name',
    samples: ['Hex Bolt M10', 'Flat Washer'],
    sampleLine: 'Hex Bolt M10  ·  Flat Washer',
    status: 'Suggested',
    targetId: 'default_code',
    targetLabel: 'Internal Reference',
    targetDtype: 'Char',
    handoff: undefined,
    handoffFind: 'info',
    evidence: [{ code: 'name', short: 'Name', label: 'Field name match' }],
    conf: 96,
    validation: 'Compatible',
    validationImpact: 'clean',
    statusImpact: 'clean',
    why: undefined,
    ...overrides,
  };
}

describe('canBulkAccept', () => {
  it('allows Suggested and Review required rows with a proposed target', () => {
    expect(canBulkAccept(makeMappingRow({ status: 'Suggested' }))).toBe(true);
    expect(canBulkAccept(makeMappingRow({ status: 'Review required' }))).toBe(true);
  });

  it('rejects a row with no proposed target, even if status looks acceptable', () => {
    expect(canBulkAccept(makeMappingRow({ status: 'Suggested', targetId: undefined, targetLabel: 'Not mapped' }))).toBe(false);
  });

  it('rejects settled/blocked statuses', () => {
    expect(canBulkAccept(makeMappingRow({ status: 'Excluded' }))).toBe(false);
    expect(canBulkAccept(makeMappingRow({ status: 'Blocked', targetId: undefined }))).toBe(false);
    expect(canBulkAccept(makeMappingRow({ status: 'Missing target' }))).toBe(false);
  });
});

describe('toBulkAcceptField', () => {
  it('renames fields 1:1, same scale/case as MappingRow', () => {
    const row = makeMappingRow();
    expect(toBulkAcceptField(row)).toEqual({
      fieldId: 'f1',
      sourceField: 'Item Name',
      targetFieldId: 'default_code',
      targetFieldLabel: 'Internal Reference',
      targetDtype: 'Char',
      confidence: 96,
      validation: 'Compatible',
      evidence: ['name'],
    });
  });

  it('normalizes placeholder values ("Not mapped", "—", empty dtype) to undefined', () => {
    const row = makeMappingRow({ targetLabel: 'Not mapped', targetDtype: '', validation: '—' });
    const field = toBulkAcceptField(row);
    expect(field.targetFieldLabel).toBeUndefined();
    expect(field.targetDtype).toBeUndefined();
    expect(field.validation).toBeUndefined();
  });
});
