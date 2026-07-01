import React, { useCallback, useMemo, useState } from 'react';
import { View } from 'react-native';
import { Input } from '@/shared/components/ui/Input';
import { Select, type SelectOption } from '@/shared/components/ui/Select';
import { Button } from '@/shared/components/ui/Button';
import type { ProjectPermission } from '../types/project-access.types';
import type { ProjectScopeMember } from '../types/project-scope.types';
import { SCOPE_MEMBER_ROLES } from './MemberRoles.config';

interface MemberAddControlProps {
  readonly onAdd: (member: ProjectScopeMember) => void;
  readonly testID?: string;
}

export function MemberAddControl({
  onAdd,
  testID,
}: MemberAddControlProps): React.JSX.Element {
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<ProjectPermission | null>(null);

  const trimmedEmail = email.trim();
  const isDisabled =
    trimmedEmail.length === 0 || !trimmedEmail.includes('@') || role === null;

  const roleOptions = useMemo<SelectOption[]>(
    () =>
      SCOPE_MEMBER_ROLES.map((option) => ({
        label: option.label,
        value: option.value,
      })),
    [],
  );

  const handleRoleChange = useCallback((value: string): void => {
    const next = SCOPE_MEMBER_ROLES.find((option) => option.value === value);
    setRole(next !== undefined ? next.value : null);
  }, []);

  const handleAdd = useCallback((): void => {
    if (role === null) {
      return;
    }
    const normalizedEmail = trimmedEmail;
    if (normalizedEmail.length === 0 || !normalizedEmail.includes('@')) {
      return;
    }
    const atIndex = normalizedEmail.indexOf('@');
    const name =
      atIndex > 0 ? normalizedEmail.slice(0, atIndex) : normalizedEmail;
    const member: ProjectScopeMember = {
      id: normalizedEmail.toLowerCase(),
      name,
      email: normalizedEmail,
      role,
    };
    onAdd(member);
    setEmail('');
    setRole(null);
  }, [onAdd, role, trimmedEmail]);

  return (
    <View className="gap-3" testID={testID}>
      <Input
        label="Member"
        placeholder="name@company.com"
        accessibilityLabel="Member email"
        value={email}
        onChangeText={setEmail}
        autoCapitalize="none"
        keyboardType="email-address"
        testID={testID !== undefined ? `${testID}-input` : undefined}
      />
      <Select
        label="Role"
        placeholder="Select role"
        options={roleOptions}
        value={role ?? undefined}
        onValueChange={handleRoleChange}
        testID={testID !== undefined ? `${testID}-role` : undefined}
      />
      <Button
        onPress={handleAdd}
        disabled={isDisabled}
        accessibilityState={{ disabled: isDisabled }}
        testID={testID !== undefined ? `${testID}-add` : undefined}
      >
        Add Member
      </Button>
    </View>
  );
}
