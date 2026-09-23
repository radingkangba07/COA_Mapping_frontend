import React from 'react';
import { renderHook, act, waitFor } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ok, err } from '@/shared/types/result.types';
import { buildEntityKey, useWizardStore } from '../../store/wizard.store';

const mockPatchColumnMapping = jest.fn();
const mockBulkAcceptColumnMappings = jest.fn();
jest.mock('../../services/mapping.service', () => ({
  patchColumnMapping: (...args: unknown[]) => mockPatchColumnMapping(...args),
  bulkAcceptColumnMappings: (...args: unknown[]) => mockBulkAcceptColumnMappings(...args),
}));

const mockShowError = jest.fn();
jest.mock('@/shared/hooks/useToast', () => ({
  useToast: () => ({ showError: mockShowError, showSuccess: jest.fn(), showWarning: jest.fn() }),
}));

import { useApproval } from '../useApproval';

function createWrapper(): React.ComponentType<{ children: React.ReactNode }> {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } });
  return function Wrapper({ children }: { children: React.ReactNode }) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
  };
}

describe('useApproval', () => {
  beforeEach(() => {
    useWizardStore.getState().reset();
    mockPatchColumnMapping.mockReset();
    mockBulkAcceptColumnMappings.mockReset();
    mockShowError.mockReset();
  });

  it('with no pipeline run yet, confirm() only writes the local decision — no PATCH attempted', async () => {
    const { result } = renderHook(() => useApproval(), { wrapper: createWrapper() });

    act(() => {
      result.current.raise({
        entityId: 'items',
        fieldId: 'f1',
        reason: 'ai-proposal',
        proposedTargetId: 'default_code',
        previousTargetId: null,
        confidence: 90,
      });
    });
    act(() => {
      result.current.confirm();
    });

    expect(useWizardStore.getState().decisionsByEntity[buildEntityKey('', 'items')]).toEqual([
      expect.objectContaining({ fieldId: 'f1', status: 'accepted' }),
    ]);
    expect(mockPatchColumnMapping).not.toHaveBeenCalled();
  });

  it('with a pipeline run, confirm() calls the real PATCH with the accept body', async () => {
    useWizardStore.getState().setPipelineRunId('items', 'run-1');
    mockPatchColumnMapping.mockResolvedValue(ok(undefined));
    const { result } = renderHook(() => useApproval(), { wrapper: createWrapper() });

    act(() => {
      result.current.raise({
        entityId: 'items',
        fieldId: 'f1',
        reason: 'ai-proposal',
        proposedTargetId: 'default_code',
        previousTargetId: null,
        confidence: 90,
      });
    });
    act(() => {
      result.current.confirm();
    });

    await waitFor(() => {
      expect(mockPatchColumnMapping).toHaveBeenCalledWith(expect.anything(), 'run-1', 'f1', { target_field_id: 'default_code' });
    });
  });

  it('sends the picked target_field_id for a user-override confirm', async () => {
    useWizardStore.getState().setPipelineRunId('items', 'run-1');
    mockPatchColumnMapping.mockResolvedValue(ok(undefined));
    const { result } = renderHook(() => useApproval(), { wrapper: createWrapper() });

    act(() => {
      result.current.raise({
        entityId: 'items',
        fieldId: 'f1',
        reason: 'user-override',
        proposedTargetId: 'default_code',
        previousTargetId: null,
      });
    });
    act(() => {
      result.current.confirm();
    });

    await waitFor(() => {
      expect(mockPatchColumnMapping).toHaveBeenCalledWith(expect.anything(), 'run-1', 'f1', {
        target_field_id: 'default_code',
      });
    });
  });

  it('sends a null target_field_id for an exclude confirm', async () => {
    useWizardStore.getState().setPipelineRunId('items', 'run-1');
    mockPatchColumnMapping.mockResolvedValue(ok(undefined));
    const { result } = renderHook(() => useApproval(), { wrapper: createWrapper() });

    act(() => {
      result.current.raise({
        entityId: 'items',
        fieldId: 'f1',
        reason: 'exclude',
        proposedTargetId: null,
        previousTargetId: null,
      });
    });
    act(() => {
      result.current.confirm();
    });

    await waitFor(() => {
      expect(mockPatchColumnMapping).toHaveBeenCalledWith(expect.anything(), 'run-1', 'f1', { target_field_id: null });
    });
  });

  it('rolls back the optimistic local decision and shows a toast when the PATCH fails', async () => {
    useWizardStore.getState().setPipelineRunId('items', 'run-1');
    mockPatchColumnMapping.mockResolvedValue(err({ code: 'HTTP_500', message: 'Server error' }));
    const { result } = renderHook(() => useApproval(), { wrapper: createWrapper() });

    act(() => {
      result.current.raise({
        entityId: 'items',
        fieldId: 'f1',
        reason: 'exclude',
        proposedTargetId: null,
        previousTargetId: null,
      });
    });
    act(() => {
      result.current.confirm();
    });

    // Optimistic write happened immediately.
    expect(useWizardStore.getState().decisionsByEntity[buildEntityKey('', 'items')]).toEqual([
      expect.objectContaining({ fieldId: 'f1', status: 'excluded' }),
    ]);

    await waitFor(() => {
      expect(mockShowError).toHaveBeenCalled();
    });
    expect(useWizardStore.getState().decisionsByEntity[buildEntityKey('', 'items')] ?? []).toEqual([]);
  });

  describe('bulk-accept (DA-384)', () => {
    const bulkFields = [
      { fieldId: 'f1', sourceField: 'Name', targetFieldId: 'default_code', confidence: 96, validation: 'Compatible' },
      { fieldId: 'f2', sourceField: 'Category', targetFieldId: 'categ_id', confidence: 88, validation: 'Warning' },
    ];

    it('records one accepted decision per field optimistically, before any pipeline run exists', () => {
      const { result } = renderHook(() => useApproval(), { wrapper: createWrapper() });

      act(() => {
        result.current.raise({
          entityId: 'items',
          fieldId: '',
          reason: 'bulk-accept',
          proposedTargetId: null,
          previousTargetId: null,
          bulkFields,
        });
      });
      act(() => {
        result.current.confirm();
      });

      expect(useWizardStore.getState().decisionsByEntity[buildEntityKey('', 'items')]).toEqual([
        expect.objectContaining({ fieldId: 'f1', status: 'accepted', targetId: 'default_code' }),
        expect.objectContaining({ fieldId: 'f2', status: 'accepted', targetId: 'categ_id' }),
      ]);
      expect(mockBulkAcceptColumnMappings).not.toHaveBeenCalled();
    });

    it('with a pipeline run, calls bulkAcceptColumnMappings with the raised bulkFields', async () => {
      useWizardStore.getState().setPipelineRunId('items', 'run-1');
      mockBulkAcceptColumnMappings.mockResolvedValue(ok(undefined));
      const { result } = renderHook(() => useApproval(), { wrapper: createWrapper() });

      act(() => {
        result.current.raise({
          entityId: 'items',
          fieldId: '',
          reason: 'bulk-accept',
          proposedTargetId: null,
          previousTargetId: null,
          bulkFields,
        });
      });
      act(() => {
        result.current.confirm();
      });

      await waitFor(() => {
        expect(mockBulkAcceptColumnMappings).toHaveBeenCalledWith(expect.anything(), 'run-1', bulkFields);
      });
    });

    it('rolls back every field\'s optimistic decision and shows one toast when the bulk PUT fails', async () => {
      useWizardStore.getState().setPipelineRunId('items', 'run-1');
      mockBulkAcceptColumnMappings.mockResolvedValue(err({ code: 'HTTP_500', message: 'Server error' }));
      const { result } = renderHook(() => useApproval(), { wrapper: createWrapper() });

      act(() => {
        result.current.raise({
          entityId: 'items',
          fieldId: '',
          reason: 'bulk-accept',
          proposedTargetId: null,
          previousTargetId: null,
          bulkFields,
        });
      });
      act(() => {
        result.current.confirm();
      });

      expect(useWizardStore.getState().decisionsByEntity[buildEntityKey('', 'items')]).toHaveLength(2);

      await waitFor(() => {
        expect(mockShowError).toHaveBeenCalledTimes(1);
      });
      expect(useWizardStore.getState().decisionsByEntity[buildEntityKey('', 'items')] ?? []).toEqual([]);
    });

    it('describeApproval reports the batch count, not a per-field message', () => {
      const { result } = renderHook(() => useApproval(), { wrapper: createWrapper() });

      act(() => {
        result.current.raise({
          entityId: 'items',
          fieldId: '',
          reason: 'bulk-accept',
          proposedTargetId: null,
          previousTargetId: null,
          bulkFields,
        });
      });

      expect(result.current.copy?.title).toBe('Confirm bulk accept');
      expect(result.current.copy?.detail).toContain('2 mappings');
      expect(result.current.copy?.preview).toBe(
        'Before — 2 AI-suggested mappings, not yet applied.   After — all 2 confirmed and used for the migration.',
      );
    });
  });

  describe('approval preview copy (dialog parity with Profile)', () => {
    it('gives ai-proposal a Before/After preview, with and without a confidence score', () => {
      const { result } = renderHook(() => useApproval(), { wrapper: createWrapper() });

      act(() => {
        result.current.raise({
          entityId: 'items',
          fieldId: 'f1',
          reason: 'ai-proposal',
          proposedTargetId: 'default_code',
          previousTargetId: null,
          confidence: 90,
        });
      });
      expect(result.current.copy?.preview).toBe(
        'Before — AI-suggested mapping (90% confidence), not yet applied.   After — mapping confirmed and used for the migration.',
      );

      act(() => {
        result.current.raise({
          entityId: 'items',
          fieldId: 'f1',
          reason: 'ai-proposal',
          proposedTargetId: 'default_code',
          previousTargetId: null,
        });
      });
      expect(result.current.copy?.preview).toBe(
        'Before — AI-suggested mapping, not yet applied.   After — mapping confirmed and used for the migration.',
      );
    });

    it('gives user-override a Before/After preview naming both targets, or just the new one when there was no prior target', () => {
      const { result } = renderHook(() => useApproval(), { wrapper: createWrapper() });

      act(() => {
        result.current.raise({
          entityId: 'items',
          fieldId: 'f1',
          reason: 'user-override',
          proposedTargetId: 'name',
          previousTargetId: 'default_code',
        });
      });
      expect(result.current.copy?.preview).toBe(
        'Before — mapped to "default_code".   After — mapped to "name". The prior proposal is kept for audit.',
      );

      act(() => {
        result.current.raise({
          entityId: 'items',
          fieldId: 'f1',
          reason: 'user-override',
          proposedTargetId: 'name',
          previousTargetId: null,
        });
      });
      expect(result.current.copy?.preview).toBe('Before — no target set for this field.   After — mapped to "name".');
    });

    it('gives exclude a fixed Before/After preview', () => {
      const { result } = renderHook(() => useApproval(), { wrapper: createWrapper() });

      act(() => {
        result.current.raise({
          entityId: 'items',
          fieldId: 'f1',
          reason: 'exclude',
          proposedTargetId: null,
          previousTargetId: null,
        });
      });

      expect(result.current.copy?.preview).toBe(
        'Before — included in the migration.   After — excluded from all mappings and validation.',
      );
    });
  });
});
