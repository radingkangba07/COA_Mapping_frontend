import React, { useCallback } from 'react';
import { View } from 'react-native';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Input } from '@/shared/components/ui/Input';
import { Button } from '@/shared/components/ui/Button';
import { FormField } from '@/shared/components/forms/FormField';
import type { ProjectCreate } from '../types/projects.types';

const newProjectSchema = z.object({
  companyId: z.string().optional(),
  companyName: z.string().optional(),
  name: z.string().min(1, 'Project name is required'),
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
      companyId: defaultCompanyId ?? '',
      companyName: '',
      name: '',
      description: '',
    },
  });

  const handleFormSubmit = useCallback(
    (data: NewProjectFormData) => {
      onSubmit({
        name: data.name,
        companyId: data.companyId || undefined,
        companyName: data.companyName || undefined,
        description: data.description || undefined,
      });
    },
    [onSubmit],
  );

  return (
    <View className="gap-4" testID={testID}>
      <Controller
        control={control}
        name="companyId"
        render={({ field: { onChange, onBlur, value } }) => (
          <FormField label="Company ID">
            <Input
              placeholder="Enter company ID"
              value={value}
              onChangeText={onChange}
              onBlur={onBlur}
              testID="new-project-company-id"
            />
          </FormField>
        )}
      />

      <Controller
        control={control}
        name="companyName"
        render={({ field: { onChange, onBlur, value } }) => (
          <FormField label="Company Name">
            <Input
              placeholder="Enter company name"
              value={value}
              onChangeText={onChange}
              onBlur={onBlur}
              testID="new-project-company-name"
            />
          </FormField>
        )}
      />

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
