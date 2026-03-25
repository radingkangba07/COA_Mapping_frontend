export type ValidationSeverity = 'error' | 'warning';

export interface ValidationIssue {
  readonly severity: ValidationSeverity;
  readonly message: string;
  readonly groupIndex: number;
  readonly accountIndex?: number | undefined;
  readonly sourceType: string;
  readonly sourceNumber?: string | undefined;
}

export interface ValidationResult {
  readonly issues: readonly ValidationIssue[];
  readonly errorCount: number;
  readonly warningCount: number;
  readonly isValid: boolean;
}
