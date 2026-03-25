import React from 'react';
import { View } from 'react-native';
import { Card } from '@/shared/components/ui/Card';
import { Skeleton } from '@/shared/components/ui/Skeleton';

interface MappingTableSkeletonProps {
  rows?: number;
  testID?: string;
}

export const MappingTableSkeleton = ({
  rows = 4,
  testID,
}: MappingTableSkeletonProps): React.JSX.Element => (
  <View className="gap-4" testID={testID}>
    <Skeleton height={48} className="w-full rounded-lg" />
    <Card>
      <Card.Content className="gap-3">
        {Array.from({ length: rows }, (_, i) => (
          <View key={i} className="flex-row items-center gap-3 py-2">
            <Skeleton height={16} className="flex-1 rounded" />
            <Skeleton height={16} className="w-8 rounded" />
            <Skeleton height={16} className="flex-1 rounded" />
            <Skeleton height={24} className="w-16 rounded" />
          </View>
        ))}
      </Card.Content>
    </Card>
  </View>
);
