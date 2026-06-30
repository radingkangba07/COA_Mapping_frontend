import React, { useMemo } from 'react';
import { View, Text, Pressable } from 'react-native';
import { Plus } from 'lucide-react-native';
import { Input } from '@/shared/components/ui/Input';
import { Select } from '@/shared/components/ui/Select';
import type { SelectOption } from '@/shared/components/ui/Select';
import { colors } from '@/config/theme';
import type { ProjectGroup } from '../types/projects.types';

interface ProjectScopeEntryProps {
  companyId: string | null;
  name: string;
  description: string;
  companyOptions: readonly ProjectGroup[];
  onSelectCompany: (id: string) => void;
  onChangeName: (value: string) => void;
  onChangeDescription: (value: string) => void;
  onCreateCompany?: () => void;
  testID?: string;
}

export const ProjectScopeEntry = ({
  companyId,
  name,
  description,
  companyOptions,
  onSelectCompany,
  onChangeName,
  onChangeDescription,
  onCreateCompany,
  testID,
}: ProjectScopeEntryProps): React.JSX.Element => {
  const selectOptions = useMemo<SelectOption[]>(
    () =>
      companyOptions
        .filter((group) => group.companyId !== null)
        .map((group) => ({
          label: group.companyName,
          value: group.companyId as string,
        })),
    [companyOptions],
  );

  return (
    <View className="gap-4" testID={testID}>
      <View className="gap-2">
        <Select
          label="Company"
          options={selectOptions}
          value={companyId ?? undefined}
          onValueChange={onSelectCompany}
          placeholder="Select company..."
          searchable
          testID="project-scope-company"
        />
        {onCreateCompany !== undefined && (
          <Pressable
            onPress={onCreateCompany}
            className="flex-row items-center gap-1 self-start"
            testID="project-scope-create-company-btn"
          >
            <Plus size={14} color={colors.primary} />
            <Text className="font-body text-xs font-medium text-primary">
              New company
            </Text>
          </Pressable>
        )}
      </View>

      <Input
        label="Project Name"
        value={name}
        onChangeText={onChangeName}
        placeholder="e.g., Q1 2024 Migration"
        testID="project-scope-name-input"
      />

      <Input
        label="Description"
        value={description}
        onChangeText={onChangeDescription}
        placeholder="Optional description..."
        testID="project-scope-description-input"
      />
    </View>
  );
};
