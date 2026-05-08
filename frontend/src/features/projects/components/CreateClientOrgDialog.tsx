import React, { useCallback } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Dialog } from '@/shared/components/ui/Dialog';
import { Button } from '@/shared/components/ui/Button';
import { Input } from '@/shared/components/ui/Input';
import { useToast } from '@/shared/hooks/useToast';
import { httpClient } from '@/shared/services/http/http.instance';
import { createClientOrg } from '../services/org.service';
import type { OrgId } from '@/shared/types/common.types';
import type { ClientOrg } from '../types/org.types';

// ─── Form Schema ───────────────────────────────────────────────────────────

const createClientOrgSchema = z.object({
  name: z.string().min(1, 'Client name is required').max(255, 'Name too long'),
  description: z.string().optional(),
});

type CreateClientOrgFormData = z.infer<typeof createClientOrgSchema>;

// ─── Props ──────────────────────────────────────────────────────────────────

interface CreateClientOrgDialogProps {
  readonly visible: boolean;
  readonly onClose: () => void;
  readonly parentOrgId: OrgId;
  readonly onCreated?: (clientOrg: ClientOrg) => void;
  readonly testID?: string;
}

// ─── Component ─────────────────────────────────────────────────────────────

export function CreateClientOrgDialog({
  visible,
  onClose,
  parentOrgId,
  onCreated,
  testID,
}: CreateClientOrgDialogProps): React.JSX.Element {
  const { showSuccess, showError } = useToast();
  const queryClient = useQueryClient();

  const { control, handleSubmit, reset, formState } = useForm<CreateClientOrgFormData>({
    resolver: zodResolver(createClientOrgSchema),
    defaultValues: { name: '', description: '' },
    mode: 'onChange',
  });

  const mutation = useMutation({
    mutationFn: async (data: CreateClientOrgFormData) => {
      const result = await createClientOrg(httpClient, parentOrgId, {
        name: data.name,
        description: data.description || undefined,
      });
      if (!result.ok) throw new Error(result.error.message);
      return result.data;
    },
    onSuccess: (clientOrg) => {
      showSuccess('Client workspace created', `${clientOrg.name} is ready.`);
      void queryClient.invalidateQueries({ queryKey: ['orgs', parentOrgId, 'clients'] });
      void queryClient.invalidateQueries({ queryKey: ['orgs', 'me'] });
      onCreated?.(clientOrg);
      handleClose();
    },
    onError: (error: Error) => {
      showError('Failed to create client workspace', error.message);
    },
  });

  const handleClose = useCallback(() => {
    reset();
    onClose();
  }, [reset, onClose]);

  const handlePress = useCallback((): void => {
    void handleSubmit((data) => mutation.mutate(data))();
  }, [handleSubmit, mutation]);

  return (
    <Dialog visible={visible} onClose={handleClose} testID={testID}>
      <Dialog.Header>
        <Dialog.Title>New Client Workspace</Dialog.Title>
        <Dialog.Close onPress={handleClose} testID="create-client-org-close" />
      </Dialog.Header>

      <Dialog.Content className="gap-4">
        <Controller
          control={control}
          name="name"
          render={({ field: { onChange, onBlur, value }, fieldState: { error } }) => (
            <Input
              label="Client Name"
              placeholder="e.g., Retail Corp"
              value={value}
              onChangeText={onChange}
              onBlur={onBlur}
              editable={!mutation.isPending}
              error={error?.message}
              returnKeyType="next"
              testID="client-org-name-input"
            />
          )}
        />

        <Controller
          control={control}
          name="description"
          render={({ field: { onChange, onBlur, value }, fieldState: { error } }) => (
            <Input
              label="Description"
              placeholder="Optional description..."
              value={value}
              onChangeText={onChange}
              onBlur={onBlur}
              editable={!mutation.isPending}
              error={error?.message}
              returnKeyType="done"
              onSubmitEditing={handlePress}
              testID="client-org-description-input"
            />
          )}
        />
      </Dialog.Content>

      <Dialog.Footer>
        <Button
          variant="outline"
          onPress={handleClose}
          disabled={mutation.isPending}
          testID="create-client-org-cancel-btn"
        >
          Cancel
        </Button>
        <Button
          onPress={handlePress}
          isLoading={mutation.isPending}
          disabled={mutation.isPending || !formState.isValid}
          testID="create-client-org-submit-btn"
        >
          Create
        </Button>
      </Dialog.Footer>
    </Dialog>
  );
}
