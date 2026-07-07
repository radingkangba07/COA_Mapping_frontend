// Header row for the MCP Connection Details collapsible (DA-49).
// Presentational: title + Enabled badge + info tooltip. No store access.

import React from 'react';
import { View, Text } from 'react-native';
import { Info } from 'lucide-react-native';
import { Badge } from '@/shared/components/ui/Badge';
import { Tooltip } from '@/shared/components/ui/Tooltip';
import { colors } from '@/config/theme';

const INFO_ICON_SIZE = 16;

const TOOLTIP_CONTENT =
  'Configure an MCP server connection to fetch Chart of Accounts directly from the source/target ERP.';

interface McpPanelTitleProps {
  testID?: string;
}

export const McpPanelTitle = ({
  testID = 'mcp-connection-panel',
}: McpPanelTitleProps): React.JSX.Element => (
  <View className="flex-row items-center gap-2">
    <Text className="font-heading text-base font-semibold text-card-foreground">
      MCP Connection Details
    </Text>
    <Badge
      variant="outline"
      className="rounded-md border-0 bg-[#EBF7F2] px-2.5 py-0.5"
      textClassName="text-[#4D9A87]"
      testID={`${testID}-enabled-badge`}
    >
      Enabled
    </Badge>
    <Tooltip content={TOOLTIP_CONTENT} testID={`${testID}-info-tooltip`}>
      <View accessibilityRole="image" accessibilityLabel={TOOLTIP_CONTENT}>
        <Info size={INFO_ICON_SIZE} color={colors.mutedForeground} />
      </View>
    </Tooltip>
  </View>
);
