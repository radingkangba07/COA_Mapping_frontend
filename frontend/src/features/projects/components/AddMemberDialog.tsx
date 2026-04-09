import React, { useCallback, useEffect } from 'react';
import { View } from 'react-native';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import type { ProjectId } from '@/shared/types/common.types';
import { createUserId } from '@/shared/types/common.types';
import { Dialog } from '@/shared/components/ui/Dialog';
import { Input } from '@/shared/components/ui/Input';
import { Select, type SelectOption } from '@/shared/components/ui/Select';
import { Button } from '@/shared/components/ui/Button';
import { PROJECT_PERMISSIONS } from '../types/project-access.types';
import { useProjectAccess } from '../hooks/useProjectAccess';

// ─── Schema ──────────────────────────────────────────────────────────────────

const addMemberSchema = z.object({
  userId: z.string().min(1, 'User ID required'),
  permission: z.enum(PROJECT_PERMISSIONS),
});

type AddMemberFormValues = z.infer<typeof addMemberSchema>;

// ─── Constants ───────────────────────────────────────────────────────────────

const PERMISSION_OPTIONS: SelectOption[] = PROJECT_PERMISSIONS.map((p) => ({
  label: p.charAt(0).toUpperCase() + p.slice(1),
  value: p,
}));

const DEFAULT_VALUES: AddMemberFormValues = {
  userId: '',
  permission: 'viewer',
};

// ─── Props ───────────────────────────────────────────────────────────────────

interface AddMemberDialogProps {
  readonly visible: boolean;
  readonly onClose: () => void;
  readonly projectId: ProjectId;
  readonly testID?: string;
}

// ─── Component ───────────────────────────────────────────────────────────────

export function AddMemberDialog({
  visible,
  onClose,
  projectId,
  testID = 'add-member-dialog',
}: AddMemberDialogProps) {
  const { grantAsync, isGranting } = useProjectAccess(projectId);

  const {
    control,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<AddMemberFormValues>({
    resolver: zodResolver(addMemberSchema),
    defaultValues: DEFAULT_VALUES,
  });

  useEffect(() => {
    if (visible) {
      reset(DEFAULT_VALUES);
    }
  }, [visible, reset]);

  const onSubmit = useCallback(
    async (values: AddMemberFormValues): Promise<void> => {
      const result = await grantAsync({
        userId: createUserId(values.userId),
        permission: values.permission,
      });
      if (result.ok) {
        reset(DEFAULT_VALUES);
        onClose();
      }
    },
    [grantAsync, reset, onClose],
  );

  return (
    <Dialog visible={visible} onClose={onClose} testID={testID}>
      <Dialog.Header>
        <Dialog.Title>Add Member</Dialog.Title>
        <Dialog.Close onPress={onClose} testID="add-member-dialog-close" />
      </Dialog.Header>

      <Dialog.Content>
        <View className="gap-4">
          <Controller
            control={control}
            name="userId"
            render={({ field: { onChange, onBlur, value } }) => (
              <Input
                label="User"
                placeholder="User ID or email"
                value={value}
                onChangeText={onChange}
                onBlur={onBlur}
                error={errors.userId?.message}
                testID="add-member-user-input"
              />
            )}
          />

          <Controller
            control={control}
            name="permission"
            render={({ field: { onChange, value } }) => (
              <Select
                label="Permission"
                options={PERMISSION_OPTIONS}
                value={value}
                onValueChange={onChange}
                error={errors.permission?.message}
                testID="add-member-permission-select"
              />
            )}
          />
        </View>
      </Dialog.Content>

      <Dialog.Footer>
        <Button
          variant="outline"
          onPress={onClose}
          testID="add-member-cancel-btn"
        >
          Cancel
        </Button>
        <Button
          onPress={handleSubmit(onSubmit)}
          isLoading={isGranting}
          disabled={isGranting}
          testID="add-member-submit-btn"
        >
          Add
        </Button>
      </Dialog.Footer>
    </Dialog>
  );
}
