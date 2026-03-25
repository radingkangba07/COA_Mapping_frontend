import type { ERPConfigStore, ERPSystem } from '../types/erp-config.types';
import type { AppError } from '@/shared/types/result.types';

export const selectERPSystems = (state: ERPConfigStore): ERPSystem[] =>
  state.erpSystems;

export const selectSelectedERP = (state: ERPConfigStore): ERPSystem | null =>
  state.selectedERP;

export const selectERPById = (id: string) => (state: ERPConfigStore): ERPSystem | undefined =>
  state.erpSystems.find((erp) => erp.id === id);

export const selectERPConfigLoading = (state: ERPConfigStore): boolean =>
  state.isLoading;

export const selectERPConfigError = (state: ERPConfigStore): AppError | null =>
  state.error;
