import React from 'react';
import { View, Text } from 'react-native';
import { FolderOpen, Building2, CheckCircle } from 'lucide-react-native';
import { colors } from '@/config/theme';

interface StatCardProps {
  icon: React.ReactElement;
  value: number;
  label: string;
  testID?: string;
}

function StatCard({ icon, value, label, testID }: StatCardProps) {
  return (
    <View
      className="flex-1 bg-card rounded-xl border border-border px-5 py-4"
      testID={testID}
    >
      <View className="flex-row items-center justify-between">
        <Text className="font-body text-xs font-medium text-muted-foreground uppercase tracking-wide">
          {label}
        </Text>
        {icon}
      </View>
      <Text className="font-heading text-3xl font-bold text-foreground mt-2">
        {value}
      </Text>
    </View>
  );
}

interface DashboardStatsProps {
  totalProjects: number;
  totalCompanies: number;
  completedProjects: number;
  testID?: string;
}

export function DashboardStats({
  totalProjects,
  totalCompanies,
  completedProjects,
  testID,
}: DashboardStatsProps) {
  return (
    <View className="flex-row gap-4" testID={testID}>
      <StatCard
        icon={<FolderOpen size={16} color={colors.mutedForeground} />}
        value={totalProjects}
        label="Projects"
        testID={testID ? `${testID}-projects` : undefined}
      />
      <StatCard
        icon={<Building2 size={16} color={colors.mutedForeground} />}
        value={totalCompanies}
        label="Companies"
        testID={testID ? `${testID}-companies` : undefined}
      />
      <StatCard
        icon={<CheckCircle size={16} color={colors.mutedForeground} />}
        value={completedProjects}
        label="Completed"
        testID={testID ? `${testID}-completed` : undefined}
      />
    </View>
  );
}
