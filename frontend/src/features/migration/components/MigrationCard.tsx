import React, { useCallback } from 'react';
import { View, Text, Pressable } from 'react-native';
import { ArrowRight } from 'lucide-react-native';
import { Card } from '@/shared/components/ui/Card';
import { Badge } from '@/shared/components/ui/Badge';
import { colors } from '@/config/theme';
import type { ProjectStatus } from '@/features/projects/types/projects.types';

const STATUS_VARIANT: Record<
  ProjectStatus,
  { label: string; variant: 'secondary' | 'warning' | 'outline' | 'success' }
> = {
  draft: { label: 'Draft', variant: 'secondary' },
  in_progress: { label: 'In Progress', variant: 'warning' },
  pending_review: { label: 'Pending Review', variant: 'outline' },
  completed: { label: 'Completed', variant: 'success' },
};

export interface MigrationCardData {
  readonly projectId: string;
  readonly name: string;
  readonly sourceErp: string;
  readonly targetErp: string;
  readonly status: ProjectStatus;
}

interface MigrationCardProps {
  readonly item: MigrationCardData;
  readonly onPress: (projectId: string) => void;
}

export const MigrationCard = React.memo(
  ({ item, onPress }: MigrationCardProps): React.JSX.Element => {
    const handlePress = useCallback((): void => {
      onPress(item.projectId);
    }, [onPress, item.projectId]);

    const badge = STATUS_VARIANT[item.status];

    return (
      <Pressable onPress={handlePress} testID={`migration-card-${item.projectId}`}>
        <Card className="mb-3">
          <Card.Content>
            <View className="flex-row items-center justify-between">
              <View className="flex-1 mr-3">
                <Text className="font-heading text-base font-semibold text-card-foreground">
                  {item.name}
                </Text>
                <View className="mt-1 flex-row items-center">
                  <Text className="font-mono text-xs text-muted-foreground">
                    {item.sourceErp}
                  </Text>
                  <ArrowRight
                    size={12}
                    color={colors.mutedForeground}
                    style={{ marginHorizontal: 4 }}
                  />
                  <Text className="font-mono text-xs text-muted-foreground">
                    {item.targetErp}
                  </Text>
                </View>
              </View>
              <Badge variant={badge.variant} testID={`status-${item.projectId}`}>
                {badge.label}
              </Badge>
            </View>
          </Card.Content>
        </Card>
      </Pressable>
    );
  },
);

MigrationCard.displayName = 'MigrationCard';
