import React from 'react';
import { View } from 'react-native';
import { Card } from '@/shared/components/ui/Card';
import { Skeleton } from '@/shared/components/ui/Skeleton';

interface ProjectListSkeletonProps {
  count?: number;
  testID?: string;
}

export const ProjectListSkeleton = ({
  count = 3,
  testID,
}: ProjectListSkeletonProps): React.JSX.Element => (
  <View className="px-4 gap-3" testID={testID}>
    {Array.from({ length: count }, (_, i) => (
      <Card key={i} testID={`${testID ?? 'skeleton'}-card-${i}`}>
        <Card.Content className="gap-3">
          <Skeleton height={20} className="w-3/4 rounded" />
          <Skeleton height={14} className="w-1/2 rounded" />
          <View className="flex-row gap-2 mt-1">
            <Skeleton height={24} className="w-16 rounded-full" />
            <Skeleton height={24} className="w-20 rounded-full" />
          </View>
        </Card.Content>
      </Card>
    ))}
  </View>
);
