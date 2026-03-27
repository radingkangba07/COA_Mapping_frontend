import React from 'react';
import { View } from 'react-native';
import { Skeleton } from '@/shared/components/ui/Skeleton';

interface ProjectListSkeletonProps {
  testID?: string;
}

function SkeletonGroup({
  groupIndex,
  testID,
}: {
  groupIndex: number;
  testID: string;
}): React.JSX.Element {
  return (
    <View testID={`${testID}-group-${groupIndex}`}>
      <Skeleton height={24} className="w-48 rounded mb-4" />
      <Skeleton height={96} className="w-full rounded-lg mb-2" />
      <Skeleton height={96} className="w-full rounded-lg mb-2" />
    </View>
  );
}

export const ProjectListSkeleton = ({
  testID = 'project-list-skeleton',
}: ProjectListSkeletonProps): React.JSX.Element => (
  <View className="px-4" testID={testID}>
    <SkeletonGroup groupIndex={0} testID={testID} />
    <View className="mt-6">
      <SkeletonGroup groupIndex={1} testID={testID} />
    </View>
  </View>
);
