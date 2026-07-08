import React, { useCallback, useMemo, useState } from 'react';
import { View, Text, TextInput } from 'react-native';
import { Search } from 'lucide-react-native';
import { colors } from '@/config/theme';
import { Select, type SelectOption } from '@/shared/components/ui/Select';
import { Button } from '@/shared/components/ui/Button';
import type { ProjectPermission } from '../types/project-access.types';
import type { ProjectScopeMember } from '../types/project-scope.types';
import { SCOPE_MEMBER_ROLES } from './MemberRoles.config';
import { MembersTable } from './MembersTable';

interface AddMembersSectionProps {
  readonly onAddMember: (member: ProjectScopeMember) => void;
  readonly members: readonly ProjectScopeMember[];
  readonly onUpdateMemberRole: (id: string, role: ProjectPermission) => void;
  readonly onRemoveMember: (id: string) => void;
  readonly testID?: string;
}

export function AddMembersSection({
  onAddMember,
  members,
  onUpdateMemberRole,
  onRemoveMember,
  testID,
}: AddMembersSectionProps): React.JSX.Element {
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<ProjectPermission | null>(null);

  const trimmedEmail = email.trim();
  const isDisabled =
    trimmedEmail.length === 0 || !trimmedEmail.includes('@') || role === null;

  const roleOptions = useMemo<SelectOption[]>(
    () => SCOPE_MEMBER_ROLES.map((o) => ({ label: o.label, value: o.value })),
    [],
  );

  const handleRoleChange = useCallback((value: string): void => {
    const next = SCOPE_MEMBER_ROLES.find((o) => o.value === value);
    setRole(next !== undefined ? next.value : null);
  }, []);

  const handleAdd = useCallback((): void => {
    if (role === null || trimmedEmail.length === 0 || !trimmedEmail.includes('@')) return;
    const atIndex = trimmedEmail.indexOf('@');
    const name = atIndex > 0 ? trimmedEmail.slice(0, atIndex) : trimmedEmail;
    onAddMember({ id: trimmedEmail.toLowerCase(), name, email: trimmedEmail, role });
    setEmail('');
    setRole(null);
  }, [onAddMember, role, trimmedEmail]);

  const controlTestID = testID !== undefined ? `${testID}-control` : undefined;

  return (
    <View
      className="rounded-lg border border-border bg-card pt-2 px-4 pb-4"
      style={{ shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.08, shadowRadius: 4, elevation: 2 }}
      testID={testID !== undefined ? `section-${testID}` : undefined}
    >
      {/* Single header row — 4 percentage columns */}
      <View className="flex-row items-center" testID={controlTestID}>
        {/* 35% — title + description */}
        <View className="w-[40%] pr-1.5">
          <Text className="font-heading text-base font-semibold text-card-foreground">
            3. Add Members
          </Text>
          <Text className="font-body text-sm text-muted-foreground mt-0.5">
            Add project members and assign their roles.
          </Text>
        </View>

        {/* 25% — search / email input */}
        <View className="w-[22%] px-1">
          <View className="h-10 flex-row items-center gap-1 rounded-md border border-input bg-background px-1.5">
            <Search size={16} color={colors.mutedForeground} />
            <TextInput
              className="flex-1 font-body text-sm text-foreground focus:outline-none"
              placeholder="Search members..."
              placeholderTextColor={colors.mutedForeground}
              accessibilityLabel="Member email"
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              keyboardType="email-address"
              testID={controlTestID !== undefined ? `${controlTestID}-input` : undefined}
            />
          </View>
        </View>

        {/* 25% — role select */}
        <View className="w-[22%] px-1">
          <Select
            placeholder="Select role"
            options={roleOptions}
            value={role ?? undefined}
            onValueChange={handleRoleChange}
            testID={controlTestID !== undefined ? `${controlTestID}-role` : undefined}
          />
        </View>

        {/* flex-1 (~15%) — add button */}
        <View className="flex-1 items-end pl-1">
          <Button
            onPress={handleAdd}
            disabled={isDisabled}
            accessibilityState={{ disabled: isDisabled }}
            className="w-[80%] bg-[#F4F4F5]"
            textClassName="text-[#3758bd]"
            testID={controlTestID !== undefined ? `${controlTestID}-add` : undefined}
          >
            Add Member
          </Button>
        </View>
      </View>

      {/* Members table */}
      <View className="mt-1.5 pb-2">
        <MembersTable
          members={members}
          onUpdateRole={onUpdateMemberRole}
          onRemove={onRemoveMember}
          testID={testID !== undefined ? `${testID}-table` : undefined}
        />
      </View>
    </View>
  );
}
