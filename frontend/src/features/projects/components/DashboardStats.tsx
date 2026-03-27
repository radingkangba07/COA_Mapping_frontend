import React from 'react';
import { View, Text } from 'react-native';
import { FolderOpen, Building2, CheckCircle } from 'lucide-react-native';
import { colors } from '@/config/theme';

interface StatCardProps {
  icon: React.ReactNode;
  value: number;
  label: string;
  testID?: string;
}

function StatCard({ icon, value, label, testID }: StatCardProps) {
  return (
    <View
      className="flex-1 rounded-lg border border-border bg-card p-4 flex-row items-center gap-3"
      testID={testID}
    >
      {icon}
      <View>
        <Text className="text-2xl font-bold text-foreground">{value}</Text>
        <Text className="text-sm text-muted-foreground">{label}</Text>
      </View>
    </View>
  );
}

interface DashboardStatsProps {
  totalProjects: number;
  totalCompanies: number;
  completedProjects: number;
  testID?: string;
}

const PURPLE = '#7C3AED';

export function DashboardStats({
  totalProjects,
  totalCompanies,
  completedProjects,
  testID,
}: DashboardStatsProps) {
  const accentColor = colors.accent;
  const successColor = colors.success;

  return (
    <View className="flex-row gap-4" testID={testID}>
      <StatCard
        icon={
          <View
            className="h-10 w-10 rounded-full items-center justify-center"
            style={{ backgroundColor: `${accentColor}26` }}
          >
            <FolderOpen size={20} color={accentColor} />
          </View>
        }
        value={totalProjects}
        label="Projects"
        testID={testID ? `${testID}-projects` : undefined}
      />
      <StatCard
        icon={
          <View
            className="h-10 w-10 rounded-full items-center justify-center"
            style={{ backgroundColor: `${PURPLE}26` }}
          >
            <Building2 size={20} color={PURPLE} />
          </View>
        }
        value={totalCompanies}
        label="Companies"
        testID={testID ? `${testID}-companies` : undefined}
      />
      <StatCard
        icon={
          <View
            className="h-10 w-10 rounded-full items-center justify-center"
            style={{ backgroundColor: `${successColor}26` }}
          >
            <CheckCircle size={20} color={successColor} />
          </View>
        }
        value={completedProjects}
        label="Completed"
        testID={testID ? `${testID}-completed` : undefined}
      />
    </View>
  );
}
