export const CONFIDENCE_THRESHOLDS = {
  HIGH: 90,
  MEDIUM: 70,
  LOW: 0,
} as const;

// Hex values for contexts where NativeWind classes cannot be used (charts, SVG fills)
export const CONFIDENCE_COLORS = {
  HIGH: '#15803D',
  MEDIUM: '#B45309',
  LOW: '#D72222',
} as const;

export const CONFIDENCE_BG_CLASSES = {
  HIGH: 'bg-green-100',
  MEDIUM: 'bg-yellow-100',
  LOW: 'bg-red-100',
} as const;

export const CONFIDENCE_TEXT_CLASSES = {
  HIGH: 'text-green-700',
  MEDIUM: 'text-yellow-700',
  LOW: 'text-red-700',
} as const;

export type ConfidenceLevel = keyof typeof CONFIDENCE_THRESHOLDS;

export function getConfidenceLevel(score: number): ConfidenceLevel {
  if (score >= CONFIDENCE_THRESHOLDS.HIGH) return 'HIGH';
  if (score >= CONFIDENCE_THRESHOLDS.MEDIUM) return 'MEDIUM';
  return 'LOW';
}

export function getConfidenceColor(score: number): string {
  return CONFIDENCE_COLORS[getConfidenceLevel(score)];
}

export function getConfidenceBgClass(score: number): string {
  return CONFIDENCE_BG_CLASSES[getConfidenceLevel(score)];
}

export function getConfidenceTextClass(score: number): string {
  return CONFIDENCE_TEXT_CLASSES[getConfidenceLevel(score)];
}
