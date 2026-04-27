import type { TypeMappingRow } from '@/features/migration/types/migration.types';

// ─── Scoring Constants ──────────────────────────────────────────────────────

const SCORE_EXACT = 100;
const SCORE_ALL_WORDS = 95;
const SCORE_PARTIAL_BASE = 60;
const SCORE_PARTIAL_WEIGHT = 30;
const SCORE_PARTIAL_CAP = 90;
const SCORE_CONTAINMENT = 80;
const SCORE_KNOWN_TARGET = 70;
const SCORE_FALLBACK = 40;

// ─── Helpers ────────────────────────────────────────────────────────────────

function splitWords(text: string): string[] {
  return text.toLowerCase().trim().split(/\s+/);
}

// ─── Type Matching ──────────────────────────────────────────────────────────

/**
 * Match source account types to target types using fuzzy scoring.
 * Scoring strategy: exact=100, containment=80, word overlap=proportional (capped at 70).
 * Port of App.js:1277-1355 (initializeTypeMappingRowsWithTargets).
 */
export function matchTypesToTargets(
  sourceTypes: readonly string[],
  targetTypes: readonly string[],
): TypeMappingRow[] {
  return sourceTypes.map((sourceType, idx) => {
    let bestMatch = '';
    let bestScore = 0;

    const sourceTypeLower = sourceType.toLowerCase();
    const sourceWords = splitWords(sourceType);

    for (const targetType of targetTypes) {
      const targetTypeLower = targetType.toLowerCase();

      // Exact match
      if (sourceTypeLower === targetTypeLower) {
        bestMatch = targetType;
        bestScore = SCORE_EXACT;
        break;
      }

      // Containment match
      if (
        sourceTypeLower.includes(targetTypeLower) ||
        targetTypeLower.includes(sourceTypeLower)
      ) {
        const score = SCORE_CONTAINMENT;
        if (score > bestScore) {
          bestMatch = targetType;
          bestScore = score;
        }
      }

      // Word overlap
      const targetWords = splitWords(targetType);
      const commonWords = sourceWords.filter((w) => targetWords.includes(w));
      if (commonWords.length > 0) {
        const score =
          (commonWords.length / Math.max(sourceWords.length, targetWords.length)) * 70;
        if (score > bestScore) {
          bestMatch = targetType;
          bestScore = score;
        }
      }
    }

    return {
      id: String(idx),
      sourceType,
      targetTypes: bestMatch.length > 0 ? [bestMatch] : [],
      isCustom: false,
    };
  });
}

// ─── Account Scoring ────────────────────────────────────────────────────────

/**
 * Calculate a 0-100 confidence score for a source→target account name mapping.
 * Scoring: exact=100, all words found=95, partial overlap=60+(common/max)*30 capped at 90,
 * containment=80, known target=70, fallback=40.
 * Port of App.js:1713-1739 (calculateAccountScore).
 */
export function calculateAccountScore(
  sourceName: string,
  targetName: string,
  targetAccountNames?: readonly string[],
): number {
  if (!targetName || targetName === 'unmatched' || targetName === '') return 0;

  const sourceNameLower = sourceName.toLowerCase().trim();
  const targetNameLower = targetName.toLowerCase().trim();

  // Exact match
  if (sourceNameLower === targetNameLower) return SCORE_EXACT;

  // Word overlap
  const sourceWords = splitWords(sourceName);
  const targetWords = splitWords(targetName);
  const commonWords = sourceWords.filter((w) => targetWords.includes(w));

  if (commonWords.length === sourceWords.length) return SCORE_ALL_WORDS;
  if (commonWords.length > 0) {
    return Math.min(
      SCORE_PARTIAL_CAP,
      SCORE_PARTIAL_BASE +
        (commonWords.length / Math.max(sourceWords.length, targetWords.length)) *
          SCORE_PARTIAL_WEIGHT,
    );
  }

  // Containment
  if (
    sourceNameLower.includes(targetNameLower) ||
    targetNameLower.includes(sourceNameLower)
  ) {
    return SCORE_CONTAINMENT;
  }

  // Known target
  if (
    targetAccountNames &&
    targetAccountNames.some((n) => n.toLowerCase() === targetNameLower)
  ) {
    return SCORE_KNOWN_TARGET;
  }

  return SCORE_FALLBACK;
}
