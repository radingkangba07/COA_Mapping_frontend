import React, { useCallback, useMemo, useState } from 'react';
import { Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { ChevronDown, Plus } from 'lucide-react-native';
import { Input } from '@/shared/components/ui/Input';
import { Button } from '@/shared/components/ui/Button';
import { FormField } from '@/shared/components/forms/FormField';
import { colors } from '@/config/theme';
import type { ProjectCreate, ProjectGroup } from '../types/projects.types';

const newProjectSchema = z.object({
  companyId: z.string().optional(),
  companyName: z.string().optional(),
  name: z.string().min(1, 'Project name is required'),
  description: z.string().optional(),
});

type NewProjectFormData = z.infer<typeof newProjectSchema>;
type CompanyOrgType = 'employer' | 'client';

// ─── Company Dropdown ──────────────────────────────────────────────────────

interface CompanyOption {
  id: string;
  label: string;
  orgType?: CompanyOrgType;
}

const COMPANY_TYPE_META: Record<CompanyOrgType, { label: string; backgroundColor: string; color: string }> = {
  client: {
    label: 'Client',
    backgroundColor: 'rgba(0, 102, 204, 0.10)',
    color: '#0057AD',
  },
  employer: {
    label: 'Employer',
    backgroundColor: 'rgba(88, 64, 0, 0.12)',
    color: '#6B4E00',
  },
};

function CompanyTypeBadge({ orgType }: { orgType?: CompanyOrgType }): React.JSX.Element | null {
  if (orgType === undefined) return null;

  const meta = COMPANY_TYPE_META[orgType];
  return (
    <View
      className="rounded-full px-2 py-0.5"
      style={{ backgroundColor: meta.backgroundColor }}
    >
      <Text className="font-body text-xs font-semibold" style={{ color: meta.color }}>
        {meta.label}
      </Text>
    </View>
  );
}

interface CompanyDropdownProps {
  options: CompanyOption[];
  selectedId: string;
  selectedLabel: string;
  onSelect: (id: string) => void;
  testID?: string;
}

function CompanyDropdown({ options, selectedId, selectedLabel, onSelect, testID }: CompanyDropdownProps): React.JSX.Element {
  const [open, setOpen] = useState(false);
  const [searchText, setSearchText] = useState('');

  const filtered = useMemo(() => {
    if (searchText.trim() === '') return options;
    const q = searchText.toLowerCase();
    return options.filter((o) => {
      const typeLabel = o.orgType !== undefined ? COMPANY_TYPE_META[o.orgType].label : '';
      return `${o.label} ${typeLabel}`.toLowerCase().includes(q);
    });
  }, [options, searchText]);

  const selectedOption = useMemo(
    () => options.find((o) => o.id === selectedId),
    [options, selectedId],
  );

  return (
    <View testID={testID}>
      <Pressable
        onPress={() => setOpen(!open)}
        className="h-10 flex-row items-center justify-between rounded-md border border-input bg-background px-3"
      >
        <View className="min-w-0 flex-1 flex-row items-center gap-2">
          <Text
            className="font-body text-sm"
            numberOfLines={1}
            style={{ color: selectedLabel !== '' ? colors.foreground : colors.mutedForeground }}
          >
            {selectedLabel !== '' ? selectedLabel : 'Select company...'}
          </Text>
          <CompanyTypeBadge orgType={selectedOption?.orgType} />
        </View>
        <ChevronDown size={14} color={colors.mutedForeground} />
      </Pressable>

      {open && (
        <View className="mt-1 rounded-md border border-border bg-card" style={{ maxHeight: 220 }}>
          <View className="border-b border-border px-3 py-1.5">
            <TextInput
              value={searchText}
              onChangeText={setSearchText}
              placeholder="Search companies..."
              placeholderTextColor={colors.mutedForeground}
              className="font-body text-sm text-foreground h-8 focus:outline-none"
              autoFocus
            />
          </View>
          <ScrollView style={{ maxHeight: 160 }}>
            {filtered.map((item) => (
              <Pressable
                key={item.id}
                onPress={() => {
                  onSelect(item.id);
                  setOpen(false);
                  setSearchText('');
                }}
                className="flex-row items-center justify-between gap-3 px-3 py-2.5"
                style={item.id === selectedId ? { backgroundColor: 'rgba(0,51,153,0.08)' } : undefined}
              >
                <Text className="min-w-0 flex-1 font-body text-sm text-foreground" numberOfLines={1}>
                  {item.label}
                </Text>
                <CompanyTypeBadge orgType={item.orgType} />
              </Pressable>
            ))}
            {filtered.length === 0 && (
              <View className="px-3 py-2.5">
                <Text className="font-body text-sm text-muted-foreground">No companies found</Text>
              </View>
            )}
          </ScrollView>
        </View>
      )}
    </View>
  );
}

// ─── Form ──────────────────────────────────────────────────────────────────

interface ProjectFormProps {
  onSubmit: (data: ProjectCreate) => void;
  isPending: boolean;
  onCancel?: () => void;
  onCreateCompany?: () => void;
  defaultCompanyId?: string;
  companyOptions?: ProjectGroup[];
  testID?: string;
}

export const ProjectForm = ({
  onSubmit,
  isPending,
  onCancel,
  onCreateCompany,
  defaultCompanyId,
  companyOptions = [],
  testID,
}: ProjectFormProps): React.JSX.Element => {
  const { control, handleSubmit, setValue, watch, formState: { errors } } = useForm<NewProjectFormData>({
    resolver: zodResolver(newProjectSchema),
    defaultValues: {
      companyId: defaultCompanyId ?? '',
      companyName: '',
      name: '',
      description: '',
    },
  });

  const selectedCompanyId = watch('companyId');

  const dropdownOptions = useMemo((): CompanyOption[] => {
    return companyOptions
      .filter((g) => g.companyId !== null)
      .map((g) => ({
        id: g.companyId as string,
        label: g.companyName,
        orgType: g.companyOrgType,
      }));
  }, [companyOptions]);

  const selectedLabel = useMemo(() => {
    if (selectedCompanyId === undefined || selectedCompanyId === '') return '';
    return dropdownOptions.find((o) => o.id === selectedCompanyId)?.label ?? '';
  }, [selectedCompanyId, dropdownOptions]);

  const handleCompanySelect = useCallback(
    (id: string) => {
      setValue('companyId', id);
      setValue('companyName', '');
    },
    [setValue],
  );

  const handleFormSubmit = useCallback(
    (data: NewProjectFormData) => {
      onSubmit({
        name: data.name,
        companyId: data.companyId || undefined,
        description: data.description || undefined,
      });
    },
    [onSubmit],
  );

  return (
    <View className="gap-4" testID={testID}>
      <FormField label="Company">
        <View className="gap-2">
          <CompanyDropdown
            options={dropdownOptions}
            selectedId={selectedCompanyId ?? ''}
            selectedLabel={selectedLabel}
            onSelect={handleCompanySelect}
            testID="new-project-company-dropdown"
          />
          {onCreateCompany !== undefined && (
            <Button
              variant="ghost"
              size="sm"
              onPress={onCreateCompany}
              className="self-start px-0"
              testID="new-project-create-company-btn"
            >
              <View className="flex-row items-center gap-1">
                <Plus size={14} color={colors.primary} />
                <Text className="text-xs font-medium text-primary">New company</Text>
              </View>
            </Button>
          )}
        </View>
      </FormField>

      <Controller
        control={control}
        name="name"
        render={({ field: { onChange, onBlur, value } }) => (
          <FormField label="Project Name" error={errors.name?.message}>
            <Input
              placeholder="e.g., Q1 2024 Migration"
              value={value}
              onChangeText={onChange}
              onBlur={onBlur}
              testID="new-project-name-input"
            />
          </FormField>
        )}
      />

      <Controller
        control={control}
        name="description"
        render={({ field: { onChange, onBlur, value } }) => (
          <FormField label="Description">
            <Input
              placeholder="Optional description..."
              value={value}
              onChangeText={onChange}
              onBlur={onBlur}
              testID="new-project-description"
            />
          </FormField>
        )}
      />

      <View className="flex-row items-center justify-end gap-2 mt-2">
        {onCancel !== undefined && (
          <Button variant="outline" onPress={onCancel}>
            Cancel
          </Button>
        )}
        <Button
          onPress={handleSubmit(handleFormSubmit)}
          isLoading={isPending}
          testID="create-project-submit-btn"
        >
          Create Project
        </Button>
      </View>
    </View>
  );
};
