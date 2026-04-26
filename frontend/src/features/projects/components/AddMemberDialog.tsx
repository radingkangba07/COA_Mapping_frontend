import React, { useCallback, useEffect } from 'react';
import { View, Text } from 'react-native';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import type { ProjectId } from '@/shared/types/common.types';
import { Dialog } from '@/shared/components/ui/Dialog';
import { Input } from '@/shared/components/ui/Input';
import { Select, type SelectOption } from '@/shared/components/ui/Select';
import { Button } from '@/shared/components/ui/Button';
import { Badge } from '@/shared/components/ui/Badge';
import { Spinner } from '@/shared/components/ui/Spinner';
import { PROJECT_PERMISSIONS, type ProjectPermission } from '../types/project-access.types';
import { useProjectAccess } from '../hooks/useProjectAccess';
import { useAuthStore } from '@/features/auth/store/auth.store';
import { MemberBadge } from './MemberBadge';

// ─── Schema ──────────────────────────────────────────────────────────────────

const addMemberSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
  permission: z.enum(PROJECT_PERMISSIONS),
});

type AddMemberFormValues = z.infer<typeof addMemberSchema>;

// ─── Constants ───────────────────────────────────────────────────────────────

const PERMISSION_OPTIONS: SelectOption[] = PROJECT_PERMISSIONS.map((p) => ({
  label: p.charAt(0).toUpperCase() + p.slice(1),
  value: p,
}));

const DEFAULT_VALUES: AddMemberFormValues = {
  email: '',
  permission: 'viewer',
};

const ROLE_VARIANT = {
  viewer: 'secondary',
  editor: 'accent',
  approver: 'warning',
  admin: 'success',
} as const satisfies Record<ProjectPermission, 'secondary' | 'accent' | 'warning' | 'success'>;

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
  const { grantAsync, isGranting, members, isLoading, error, currentUserId } =
    useProjectAccess(projectId);
  const currentUserEmail = useAuthStore((s) => s.user?.email ?? null);

  const {
    control,
    handleSubmit,
    reset,
    setError,
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
      const submittedEmail = values.email.trim().toLowerCase();
      // Catch obvious "already a member" cases on the client so the user gets
      // an inline error instead of a generic 409 toast from the backend.
      if (
        currentUserEmail !== null &&
        submittedEmail === currentUserEmail.toLowerCase()
      ) {
        setError('email', {
          type: 'manual',
          message: 'You are already a member of this project. You cannot add yourself.',
        });
        return;
      }
      const alreadyMember = members.some(
        (m) => m.email.trim().toLowerCase() === submittedEmail,
      );
      if (alreadyMember) {
        setError('email', {
          type: 'manual',
          message: 'This user is already a member of this project.',
        });
        return;
      }

      try {
        const result = await grantAsync({
          email: values.email,
          permission: values.permission,
        });
        if (result.ok) {
          onClose();
          return;
        }
        // Surface the server error inline under the email field so the user
        // doesn't have to look at the floating toast.
        setError('email', { type: 'manual', message: result.error.message });
      } catch (caught) {
        const message =
          caught instanceof Error ? caught.message : 'Failed to add member';
        setError('email', { type: 'manual', message });
      }
    },
    [grantAsync, onClose, currentUserEmail, members, setError],
  );

  return (
    <Dialog visible={visible} onClose={onClose} testID={testID}>
      <Dialog.Header>
        <Dialog.Title>Project Members</Dialog.Title>
        <Dialog.Close onPress={onClose} testID="add-member-dialog-close" />
      </Dialog.Header>

      <Dialog.Content>
        <View className="gap-4">
          {/* Current members */}
          <View className="gap-2" testID="add-member-dialog-list">
            <Text className="font-body text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
              Current Members
            </Text>
            {isLoading ? (
              <Spinner testID="add-member-dialog-list-spinner" />
            ) : error !== null ? (
              <Text className="font-body text-xs text-destructive">
                Could not load members
              </Text>
            ) : members.length === 0 ? (
              <Text className="font-body text-xs text-muted-foreground">
                No members yet
              </Text>
            ) : (
              <View className="gap-2">
                {members.map((member) => (
                  <View
                    key={member.userId}
                    className="flex-row items-center gap-3"
                    testID={`add-member-dialog-row-${member.userId}`}
                  >
                    <MemberBadge name={member.name} size="sm" />
                    <View className="flex-1 min-w-0">
                      <Text
                        className="font-body text-sm font-medium text-foreground"
                        numberOfLines={1}
                      >
                        {member.name}
                        {member.userId === currentUserId ? ' (you)' : ''}
                      </Text>
                      <Text
                        className="font-body text-xs text-muted-foreground"
                        numberOfLines={1}
                      >
                        {member.email}
                      </Text>
                    </View>
                    <Badge variant={ROLE_VARIANT[member.permission]}>
                      {member.permission}
                    </Badge>
                  </View>
                ))}
              </View>
            )}
          </View>

          <View className="h-px bg-border" />

          {/* Invite form */}
          <Text className="font-body text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
            Invite Member
          </Text>
          <Controller
            control={control}
            name="email"
            render={({ field: { onChange, onBlur, value } }) => (
              <Input
                label="Email address"
                placeholder="colleague@company.com"
                value={value}
                onChangeText={onChange}
                onBlur={onBlur}
                error={errors.email?.message}
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
