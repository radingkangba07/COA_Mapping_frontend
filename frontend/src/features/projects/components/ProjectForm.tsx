import React, { useCallback } from 'react';
import { View } from 'react-native';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Input } from '@/shared/components/ui/Input';
import { Select, type SelectOption } from '@/shared/components/ui/Select';
import { Button } from '@/shared/components/ui/Button';
import { FormField } from '@/shared/components/forms/FormField';
import { ERP_SYSTEMS } from '@/shared/constants/erp-systems';
import type { ProjectCreate } from '../types/projects.types';

const newProjectSchema = z.object({
  name: z.string().min(1, 'Project name is required'),
  sourceErp: z.string().min(1, 'Source ERP is required'),
  targetErp: z.string().min(1, 'Target ERP is required'),
  companyId: z.string().optional(),
  description: z.string().optional(),
});

type NewProjectFormData = z.infer<typeof newProjectSchema>;

interface ProjectFormProps {
  onSubmit: (data: ProjectCreate) => void;
  isPending: boolean;
  onCancel?: () => void;
  defaultCompanyId?: string;
  testID?: string;
}

const ERP_OPTIONS: SelectOption[] = ERP_SYSTEMS.map((erp) => ({
  label: erp.name,
  value: erp.id,
}));

export const ProjectForm = ({
  onSubmit,
  isPending,
  onCancel,
  defaultCompanyId,
  testID,
}: ProjectFormProps): React.JSX.Element => {
  const { control, handleSubmit, formState: { errors } } = useForm<NewProjectFormData>({
    resolver: zodResolver(newProjectSchema),
    defaultValues: {
      name: '',
      sourceErp: '',
      targetErp: '',
      companyId: defaultCompanyId ?? '',
      description: '',
    },
  });

  const handleFormSubmit = useCallback(
    (data: NewProjectFormData) => {
      onSubmit({
        name: data.name,
        sourceErp: data.sourceErp,
        targetErp: data.targetErp,
        companyId: data.companyId || undefined,
        description: data.description || undefined,
      });
    },
    [onSubmit],
  );

  return (
    <View className="gap-4" testID={testID}>
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
        name="sourceErp"
        render={({ field: { onChange, value } }) => (
          <FormField label="Source ERP" error={errors.sourceErp?.message}>
            <Select
              options={ERP_OPTIONS}
              value={value}
              onValueChange={onChange}
              placeholder="Select source ERP..."
              testID="new-project-source-erp"
            />
          </FormField>
        )}
      />

      <Controller
        control={control}
        name="targetErp"
        render={({ field: { onChange, value } }) => (
          <FormField label="Target ERP" error={errors.targetErp?.message}>
            <Select
              options={ERP_OPTIONS}
              value={value}
              onValueChange={onChange}
              placeholder="Select target ERP..."
              testID="new-project-target-erp"
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
          <Button variant="ghost" onPress={onCancel}>
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
