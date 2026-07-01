import React, { useCallback, useMemo, useState } from 'react';
import { View, TextInput } from 'react-native';
import { Search } from 'lucide-react-native';
import { colors } from '@/config/theme';
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
    <View
      className="flex-row flex-wrap items-center gap-3"
      testID={testID}
    >
      <View className="min-w-[12rem] flex-1 flex-row items-center gap-2 rounded-md border border-input bg-background px-3">
        <Search size={16} color={colors.mutedForeground} />
        <TextInput
          className="h-10 flex-1 font-body text-sm text-foreground focus:outline-none"
          placeholder="Search members..."
          placeholderTextColor={colors.mutedForeground}
          accessibilityLabel="Member email"
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          keyboardType="email-address"
          testID={testID !== undefined ? `${testID}-input` : undefined}
        />
      </View>
      <Select
        className="w-40"
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
