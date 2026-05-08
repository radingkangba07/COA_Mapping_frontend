import { adaptSuggestionsToGroupedMappings } from '../suggestion-adapter.service';
import type { SuggestionGroup } from '@/features/migration/types/suggestion.types';

function makeAccount(overrides: Partial<SuggestionGroup['accounts'][number]> = {}): SuggestionGroup['accounts'][number] {
  return {
    id: 'a1',
    suggestionId: 's1',
    sourceNumber: '1000',
    sourceName: 'Cash',
    targetName: 'Cash at Bank',
    score: 97,
    status: 'pending',
    mappingSource: 'fuzzy',
    ...overrides,
  };
}

describe('adaptSuggestionsToGroupedMappings', () => {
  it('returns an empty array for empty input', () => {
    expect(adaptSuggestionsToGroupedMappings([])).toEqual([]);
  });

  it('maps camelCase fields to snake_case GroupedMapping shape', () => {
    const groups: readonly SuggestionGroup[] = [
      {
        sourceType: 'Asset',
        targetType: 'Fixed Asset',
        confidence: 0.95,
        accounts: [makeAccount()],
      },
    ];

    const result = adaptSuggestionsToGroupedMappings(groups);

    expect(result).toHaveLength(1);
    const group = result[0];
    expect(group).toBeDefined();
    if (!group) return;
    expect(group.source_type).toBe('Asset');
    expect(group.target_type).toBe('Fixed Asset');
    expect(group.confidence).toBe(0.95);
    expect(group.accounts).toHaveLength(1);

    const account = group.accounts[0];
    expect(account).toBeDefined();
    if (!account) return;
    expect(account.source_number).toBe('1000');
    expect(account.source_name).toBe('Cash');
    expect(account.target_name).toBe('Cash at Bank');
    expect(account.score).toBe(97);
    expect(account.remark).toBe('fuzzy');
    expect(account.status).toBe('pending');
    expect(account.mapping_status).toBe('pending');
  });

  it('preserves the raw backend status as mapping_status even when it is not pending/confirmed', () => {
    const groups: readonly SuggestionGroup[] = [
      {
        sourceType: 'Asset',
        targetType: 'Fixed Asset',
        confidence: 0.6,
        accounts: [makeAccount({ sourceName: 'Petty Cash', targetName: 'Cash on Hand', score: 55, status: 'auto_matched' })],
      },
    ];

    const [group] = adaptSuggestionsToGroupedMappings(groups);
    const account = group?.accounts[0];
    expect(account?.mapping_status).toBe('auto_matched');
    expect(account?.status).toBeUndefined();
  });

  it('leaves mapping_status undefined when the backend sends an empty string', () => {
    const groups: readonly SuggestionGroup[] = [
      {
        sourceType: 'Asset',
        targetType: 'Fixed Asset',
        confidence: 0.6,
        accounts: [makeAccount({ score: 80, status: '', mappingSource: null })],
      },
    ];

    const [group] = adaptSuggestionsToGroupedMappings(groups);
    const account = group?.accounts[0];
    expect(account?.mapping_status).toBeUndefined();
  });

  it('preserves confidence on the group', () => {
    const groups: readonly SuggestionGroup[] = [
      { sourceType: 'Liability', targetType: 'Long-Term Liability', confidence: 0.42, accounts: [] },
    ];

    const [group] = adaptSuggestionsToGroupedMappings(groups);
    expect(group?.confidence).toBe(0.42);
  });

  it('keeps source_number empty when it is not provided by suggestions endpoint', () => {
    const groups: readonly SuggestionGroup[] = [
      {
        sourceType: 'Asset',
        targetType: 'Asset',
        confidence: 1,
        accounts: [makeAccount({ sourceNumber: '', status: 'confirmed', mappingSource: null })],
      },
    ];

    const [group] = adaptSuggestionsToGroupedMappings(groups);
    expect(group?.accounts[0]?.source_number).toBe('');
  });

  it('maps null mappingSource to empty-string remark', () => {
    const groups: readonly SuggestionGroup[] = [
      {
        sourceType: 'Revenue',
        targetType: 'Revenue',
        confidence: 0.8,
        accounts: [makeAccount({ id: 'r1', suggestionId: 'r1', sourceName: 'Sales', targetName: 'Sales', score: 88, mappingSource: null })],
      },
    ];

    const [group] = adaptSuggestionsToGroupedMappings(groups);
    expect(group?.accounts[0]?.remark).toBe('');
  });

  it('forwards confirmed status and drops unknown statuses', () => {
    const groups: readonly SuggestionGroup[] = [
      {
        sourceType: 'Equity',
        targetType: 'Equity',
        confidence: 0.9,
        accounts: [
          makeAccount({ id: 'e1', suggestionId: 'e1', sourceName: 'Common Stock', targetName: 'Common Stock', score: 95, status: 'confirmed', mappingSource: 'user' }),
          makeAccount({ id: 'e2', suggestionId: 'e2', sourceName: 'Retained Earnings', targetName: 'Retained Earnings', score: 90, status: 'archived', mappingSource: null }),
        ],
      },
    ];

    const [group] = adaptSuggestionsToGroupedMappings(groups);
    expect(group?.accounts[0]?.status).toBe('confirmed');
    expect(group?.accounts[1]?.status).toBeUndefined();
  });

  it('preserves group ordering', () => {
    const groups: readonly SuggestionGroup[] = [
      { sourceType: 'Asset', targetType: 'Asset', confidence: 0.9, accounts: [] },
      { sourceType: 'Liability', targetType: 'Liability', confidence: 0.8, accounts: [] },
      { sourceType: 'Equity', targetType: 'Equity', confidence: 0.7, accounts: [] },
    ];

    const result = adaptSuggestionsToGroupedMappings(groups);
    expect(result.map((g) => g.source_type)).toEqual(['Asset', 'Liability', 'Equity']);
  });
});
