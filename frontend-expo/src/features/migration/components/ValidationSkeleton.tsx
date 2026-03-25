import React from 'react';
import { View } from 'react-native';
import { Card } from '@/shared/components/ui/Card';
import { Skeleton } from '@/shared/components/ui/Skeleton';

interface ValidationSkeletonProps {
  groups?: number;
  testID?: string;
}

export const ValidationSkeleton = ({
  groups = 3,
  testID,
}: ValidationSkeletonProps): React.JSX.Element => (
  <View className="gap-4" testID={testID}>
    <View className="flex-row gap-2">
      {Array.from({ length: 4 }, (_, i) => (
        <Skeleton key={i} height={40} className="flex-1 rounded-lg" />
      ))}
    </View>
    {Array.from({ length: groups }, (_, i) => (
      <Card key={i}>
        <Card.Content className="gap-2">
          <View className="flex-row items-center gap-2">
            <Skeleton height={18} className="w-32 rounded" />
            <Skeleton height={18} className="w-8 rounded" />
            <Skeleton height={18} className="w-32 rounded" />
            <Skeleton height={22} className="w-14 rounded-full" />
          </View>
          <Skeleton height={14} className="w-20 rounded mt-1" />
        </Card.Content>
      </Card>
    ))}
  </View>
);
