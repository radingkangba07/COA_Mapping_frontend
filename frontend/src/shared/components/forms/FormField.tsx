import React from 'react';
import { View } from 'react-native';
import { cn } from '@/shared/utils/string.utils';
import { Label } from '@/shared/components/ui/Label';
import { FormError } from '@/shared/components/forms/FormError';

interface FormFieldProps {
  label?: string;
  error?: string;
  children: React.ReactNode;
  className?: string;
  testID?: string;
}

export const FormField = ({
  label,
  error,
  children,
  className,
  testID,
}: FormFieldProps): React.JSX.Element => (
  <View className={cn('gap-1.5', className)} testID={testID}>
    {label !== undefined && label.length > 0 && (
      <Label>{label}</Label>
    )}
    {children}
    <FormError message={error} />
  </View>
);
