import type { MigrationStackParamList } from '@/navigation/types';

export const MIGRATION_STEPS = {
  ERP_SELECT: 0,
  UPLOAD: 1,
  TYPE_MAPPING: 2,
  VALIDATION: 3,
  FINAL_PREVIEW: 4,
  PREVIEW: 5,
} as const;

export type MigrationStepValue = (typeof MIGRATION_STEPS)[keyof typeof MIGRATION_STEPS];

export const STEP_TO_SCREEN: Record<MigrationStepValue, keyof MigrationStackParamList> = {
  [MIGRATION_STEPS.ERP_SELECT]: 'ERPSelect',
  [MIGRATION_STEPS.UPLOAD]: 'Upload',
  [MIGRATION_STEPS.TYPE_MAPPING]: 'Mapping',
  [MIGRATION_STEPS.VALIDATION]: 'Validation',
  [MIGRATION_STEPS.FINAL_PREVIEW]: 'FinalPreview',
  [MIGRATION_STEPS.PREVIEW]: 'Preview',
};

export function completedStepsForStep(step: MigrationStepValue): MigrationStepValue[] {
  // Safe cast: i is always in [0, step), which is a subset of MigrationStepValue
  return Array.from({ length: step }, (_, i) => i as MigrationStepValue);
}
