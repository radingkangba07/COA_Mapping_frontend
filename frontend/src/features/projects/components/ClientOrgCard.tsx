import React from 'react';
import { View, Text, Pressable } from 'react-native';
import { Building2, ChevronRight } from 'lucide-react-native';
import { Card } from '@/shared/components/ui/Card';
import { colors } from '@/config/theme';
import { formatDate } from '@/shared/utils/date.utils';
import type { ClientOrg } from '../types/org.types';

interface ClientOrgCardProps {
  readonly clientOrg: ClientOrg;
  readonly onPress: (clientOrg: ClientOrg) => void;
  readonly testID?: string;
}

export function ClientOrgCard({
  clientOrg,
  onPress,
  testID,
}: ClientOrgCardProps): React.JSX.Element {
  return (
    <Card testID={testID}>
      <Pressable
        className="flex-row items-center px-4 py-4"
        onPress={() => onPress(clientOrg)}
        testID={testID !== undefined ? `${testID}-press` : undefined}
        accessibilityRole="button"
        accessibilityLabel={`Open ${clientOrg.name}`}
      >
        <View className="h-10 w-10 items-center justify-center rounded-full bg-accent/10 mr-3">
          <Building2 size={20} color={colors.accent} />
        </View>

        <View className="flex-1">
          <Text
            className="font-body text-sm font-semibold text-foreground"
            numberOfLines={1}
          >
            {clientOrg.name}
          </Text>
          {clientOrg.description !== null && (
            <Text
              className="font-body text-xs text-muted-foreground mt-0.5"
              numberOfLines={1}
            >
              {clientOrg.description}
            </Text>
          )}
          <Text className="font-body text-xs text-muted-foreground mt-0.5">
            Created {formatDate(clientOrg.createdAt)}
          </Text>
        </View>

        <ChevronRight size={16} color={colors.mutedForeground} />
      </Pressable>
    </Card>
  );
}
