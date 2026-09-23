import { getEntityPack } from '../../services/entity-pack.service';
import { buildMappingCards, mappingRowCount, toMappingReadiness, deriveInterimReadiness } from '../mapping';
import type { EntityMapping } from '../../dp-kit/types/entity';

describe('buildMappingCards', () => {
  it('computes the 5 card counts from the real items fixture (locks in DA-359\'s tallies)', async () => {
    const result = await getEntityPack('items');
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    const cards = buildMappingCards(result.data.mapping);
    const byId = Object.fromEntries(cards.map((c) => [c.id, c]));

    expect(byId.high?.value).toBe('3');
    expect(byId.high?.tone).toBe('ok');
    expect(byId.review?.value).toBe('4');
    expect(byId.review?.tone).toBe('warn');
    expect(byId.none?.value).toBe('17');
    expect(byId.none?.tone).toBe('blocker');
    expect(byId.missing?.value).toBe('1');
    expect(byId.missing?.tone).toBe('blocker');
    expect(byId.excluded?.value).toBe('21');
    expect(byId.excluded?.tone).toBe('muted');

    // Every card has a non-empty tooltip.
    expect(cards.every((c) => c.tip.length > 0)).toBe(true);
  });

  it('computes correct card counts for the customers fixture\'s own (smaller) mapping block', async () => {
    // customers.entity.json has its own illustrative mapping block (9
    // proposals + 1 missing target) — not empty, and not the items
    // fixture's numbers. This proves the function recomputes per-pack
    // rather than assuming a fixed shape.
    const result = await getEntityPack('customers');
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    const cards = buildMappingCards(result.data.mapping);
    const byId = Object.fromEntries(cards.map((c) => [c.id, c]));

    expect(byId.high?.value).toBe('3');
    expect(byId.review?.value).toBe('4');
    expect(byId.none?.value).toBe('1');
    expect(byId.missing?.value).toBe('1');
    expect(byId.excluded?.value).toBe('1');
  });

  it('returns an empty list when the pack has no mapping block at all', () => {
    expect(buildMappingCards(undefined)).toEqual([]);
  });
});

describe('mappingRowCount', () => {
  it('totals proposals + missingTargets for the real items fixture (45 + 1)', async () => {
    const result = await getEntityPack('items');
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(mappingRowCount(result.data.mapping)).toBe(46);
  });

  it('totals proposals + missingTargets for the real customers fixture (9 + 1)', async () => {
    const result = await getEntityPack('customers');
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(mappingRowCount(result.data.mapping)).toBe(10);
  });

  it('returns 0 when the pack has no mapping block at all', () => {
    expect(mappingRowCount(undefined)).toBe(0);
  });
});

describe('toMappingReadiness', () => {
  it('reshapes the real items fixture\'s mapping readiness into EntityReadiness', async () => {
    const result = await getEntityPack('items');
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    const readiness = toMappingReadiness(result.data.mapping?.readiness);
    expect(readiness).not.toBeNull();
    expect(readiness?.headline).toBe('Mapping readiness: Needs attention');
    expect(readiness?.tone).toBe('warn');
    expect(readiness?.recommendedOrder).toHaveLength(3);
    expect(readiness?.recommendedOrder?.[0]).toEqual({ label: 'Confirm the identifier mappings', target: 'f3' });
    expect(readiness?.evidence).toEqual([]);
  });

  it('returns null when there is no readiness block', () => {
    expect(toMappingReadiness(undefined)).toBeNull();
  });

  it('drops malformed recommendedOrder/evidence entries instead of passing them through', () => {
    // `EntityMapping['readiness']`'s recommendedOrder/evidence are typed as
    // Record<string, unknown>[] (a generated-type gap — see toMappingReadiness's
    // own doc comment), so genuinely malformed entries (a bare string, a
    // wrong-typed field) can't be constructed as a plain object literal
    // without help. This cast exists specifically to feed runtime-invalid
    // data past that loose type and exercise toMappingReadiness's own
    // narrowing guard — the function under test, not this cast, is what's
    // actually verified here.
    const malformed = {
      headline: 'Test',
      recommendedOrder: [{ label: 'ok' }, { noLabel: true }, 'not-an-object'],
      evidence: [{ value: '5', label: 'ok' }, { value: 5, label: 'bad-type' }],
    } as unknown as EntityMapping['readiness'];

    const readiness = toMappingReadiness(malformed);

    expect(readiness?.recommendedOrder).toEqual([{ label: 'ok' }]);
    expect(readiness?.evidence).toEqual([{ value: '5', label: 'ok' }]);
  });
});

describe('deriveInterimReadiness', () => {
  // Same `review`/`none` card->statuses shape the real backend's own
  // toEntityMapping mapper supplies (mapping.service.ts) — deriveInterimReadiness
  // reads counts through these, never a hardcoded status literal.
  const TEST_CARDS: EntityMapping['cards'] = [
    { id: 'review', label: 'Needs review', statuses: ['Review required'] },
    { id: 'none', label: 'No safe target', statuses: ['Blocked'] },
  ];

  it('returns a neutral all-clear summary when nothing needs review and nothing is unsafe', () => {
    const mapping: EntityMapping = {
      proposals: [{ id: 'p1', name: 'Name', status: 'Suggested' }, { id: 'p2', name: 'Notes', status: 'Excluded' }],
      cards: TEST_CARDS,
    };

    expect(deriveInterimReadiness(mapping)).toEqual({
      headline: 'Ready to continue',
      tone: 'neutral',
      narrative: 'No fields need review — every proposed mapping has a safe target.',
    });
  });

  it('returns a warn summary naming the review count when only review-required rows exist', () => {
    const mapping: EntityMapping = {
      proposals: [
        { id: 'p1', name: 'A', status: 'Review required' },
        { id: 'p2', name: 'B', status: 'Review required' },
        { id: 'p3', name: 'C', status: 'Suggested' },
      ],
      cards: TEST_CARDS,
    };

    expect(deriveInterimReadiness(mapping)).toEqual({
      headline: 'Review recommended before continuing',
      tone: 'warn',
      narrative: '2 fields need review before this migration is ready.',
    });
  });

  it('returns a blocker summary when any row has no safe target, even alongside review-required rows (blocker takes priority)', () => {
    const mapping: EntityMapping = {
      proposals: [
        { id: 'p1', name: 'A', status: 'Blocked' },
        { id: 'p2', name: 'B', status: 'Review required' },
      ],
      cards: TEST_CARDS,
    };

    expect(deriveInterimReadiness(mapping)).toEqual({
      headline: 'Needs attention before continuing',
      tone: 'blocker',
      narrative: '1 field has no safe target, and 1 more needs review.',
    });
  });

  it('singular/plural narrative and no trailing review clause when there is no review count', () => {
    const mapping: EntityMapping = {
      proposals: [
        { id: 'p1', name: 'A', status: 'Blocked' },
        { id: 'p2', name: 'B', status: 'Blocked' },
      ],
      cards: TEST_CARDS,
    };

    expect(deriveInterimReadiness(mapping)?.narrative).toBe('2 fields have no safe target.');
  });

  it('derives real blocker counts from the items fixture (17 no-safe-target, 4 review — locks in DA-359\'s tallies)', async () => {
    const result = await getEntityPack('items');
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(deriveInterimReadiness(result.data.mapping)).toEqual({
      headline: 'Needs attention before continuing',
      tone: 'blocker',
      narrative: '17 fields have no safe target, and 4 more need review.',
    });
  });

  it('returns null when there is no mapping block at all', () => {
    expect(deriveInterimReadiness(undefined)).toBeNull();
  });
});
