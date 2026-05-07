import React, { useCallback, useMemo } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Dialog } from '@/shared/components/ui/Dialog';
import { Button } from '@/shared/components/ui/Button';
import { Input } from '@/shared/components/ui/Input';
import { Select } from '@/shared/components/ui/Select';
import { useToast } from '@/shared/hooks/useToast';
import { useMembersViewModel } from '../hooks/useMembersViewModel';
import type { OrgType } from '../types/org.types';

// ─── Role options per org type ──────────────────────────────────────────────

const EMPLOYER_ROLE_OPTIONS = [
  { label: 'Member', value: 'member' },
  { label: 'Admin', value: 'admin' },
];

const CLIENT_ROLE_OPTIONS = [
  { label: 'Client Member', value: 'client_member' },
  { label: 'Client Admin', value: 'client_admin' },
];

// ─── Props ──────────────────────────────────────────────────────────────────

interface InviteMemberDialogProps {
  readonly visible: boolean;
  readonly onClose: () => void;
  readonly orgType?: OrgType;
  readonly testID?: string;
}

// ─── Component ─────────────────────────────────────────────────────────────

export const InviteMemberDialog = ({
  visible,
  onClose,
  orgType = 'employer',
  testID,
}: InviteMemberDialogProps): React.JSX.Element => {
  const { invite, isInviting } = useMembersViewModel();
  const { showSuccess, showError } = useToast();

  const isClientOrg = orgType === 'client';

  const inviteSchema = useMemo(
    () =>
      z.object({
        email: z.string().min(1, 'Email is required').email('Please enter a valid email'),
        role: isClientOrg
          ? z.enum(['client_admin', 'client_member'])
          : z.enum(['admin', 'member']),
      }),
    [isClientOrg],
  );

  type InviteFormData = z.infer<typeof inviteSchema>;

  const defaultRole = isClientOrg ? 'client_member' : 'member';
  const roleOptions = isClientOrg ? CLIENT_ROLE_OPTIONS : EMPLOYER_ROLE_OPTIONS;

  const { control, handleSubmit, setError, reset, formState } =
    useForm<InviteFormData>({
      resolver: zodResolver(inviteSchema),
      defaultValues: { email: '', role: defaultRole as InviteFormData['role'] },
      mode: 'onChange',
    });

  const handleClose = useCallback(() => {
    reset();
    onClose();
  }, [reset, onClose]);

  const onSubmit = useCallback(
    async (data: InviteFormData): Promise<void> => {
      const result = await invite({ email: data.email, role: data.role });

      if (result.ok) {
        showSuccess('Invitation sent', `Invitation sent to ${data.email}`);
        handleClose();
        return;
      }

      if (result.error.code === 'INVITATION_ALREADY_PENDING') {
        setError('email', { message: result.error.message });
        return;
      }

      showError('Invitation failed', result.error.message);
    },
    [invite, showSuccess, showError, setError, handleClose],
  );

  const handlePress = useCallback((): void => {
    void handleSubmit(onSubmit)();
  }, [handleSubmit, onSubmit]);

  return (
    <Dialog visible={visible} onClose={handleClose} testID={testID}>
      <Dialog.Header>
        <Dialog.Title>
          {isClientOrg ? 'Invite Client Member' : 'Invite Member'}
        </Dialog.Title>
        <Dialog.Close onPress={handleClose} testID="invite-dialog-close" />
      </Dialog.Header>

      <Dialog.Content className="gap-4">
        <Controller
          control={control}
          name="email"
          render={({
            field: { onChange, onBlur, value },
            fieldState: { error },
          }) => (
            <Input
              label="Email"
              placeholder="colleague@example.com"
              value={value}
              onChangeText={onChange}
              onBlur={onBlur}
              editable={!isInviting}
              error={error?.message}
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="email-address"
              returnKeyType="done"
              onSubmitEditing={handlePress}
              testID="invite-email-input"
            />
          )}
        />

        <Controller
          control={control}
          name="role"
          render={({ field: { onChange, value }, fieldState: { error } }) => (
            <Select
              label="Role"
              options={roleOptions}
              value={value}
              onValueChange={onChange}
              disabled={isInviting}
              error={error?.message}
              testID="invite-role-select"
            />
          )}
        />
      </Dialog.Content>

      <Dialog.Footer>
        <Button
          variant="outline"
          onPress={handleClose}
          disabled={isInviting}
          testID="invite-cancel-btn"
        >
          Cancel
        </Button>
        <Button
          onPress={handlePress}
          isLoading={isInviting}
          disabled={isInviting || !formState.isValid}
          testID="invite-submit-btn"
        >
          Send Invite
        </Button>
      </Dialog.Footer>
    </Dialog>
  );
};
