import React, { useCallback, useState } from 'react';
import { View, Text } from 'react-native';
import { Info } from 'lucide-react-native';
import { Collapsible } from '@/shared/components/ui/Collapsible';
import { Badge } from '@/shared/components/ui/Badge';
import { Tooltip } from '@/shared/components/ui/Tooltip';
import { colors } from '@/config/theme';
import {
  createInitialMcpForm,
  type McpConnectionForm,
} from '../services/mcp.service';

const INFO_ICON_SIZE = 16;

const TOOLTIP_CONTENT =
  'Configure an MCP server connection to fetch Chart of Accounts directly from the source/target ERP.';

interface MCPConnectionPanelProps {
  value?: McpConnectionForm;
  onChange?: (next: McpConnectionForm) => void;
  testID?: string;
}

export const MCPConnectionPanel = ({
  value,
  onChange,
  testID = 'mcp-connection-panel',
}: MCPConnectionPanelProps): React.JSX.Element => {
  const [isOpen, setIsOpen] = useState(true);
  const [form, setForm] = useState<McpConnectionForm>(
    () => value ?? createInitialMcpForm(),
  );

  const handleToggle = useCallback((): void => {
    setIsOpen((prev) => !prev);
  }, []);

  const applyPatch = useCallback(
    (patch: Partial<McpConnectionForm>): void => {
      setForm((prev) => {
        const next: McpConnectionForm = { ...prev, ...patch };
        onChange?.(next);
        return next;
      });
    },
    [onChange],
  );

  const title = (
    <View className="flex-row items-center gap-2">
      <Text className="font-heading text-base font-semibold text-card-foreground">
        MCP Connection Details
      </Text>
      <Badge variant="success" testID={`${testID}-enabled-badge`}>
        Enabled
      </Badge>
      <Tooltip content={TOOLTIP_CONTENT} testID={`${testID}-info-tooltip`}>
        <View
          accessibilityRole="image"
          accessibilityLabel={TOOLTIP_CONTENT}
        >
          <Info size={INFO_ICON_SIZE} color={colors.mutedForeground} />
        </View>
      </Tooltip>
    </View>
  );

  return (
    <Collapsible
      isOpen={isOpen}
      onToggle={handleToggle}
      title={title}
      testID={testID}
    >
      <View className="gap-2" testID={`${testID}-body`}>
        <Text className="font-body text-sm text-muted-foreground">
          Connection settings
        </Text>
      </View>
    </Collapsible>
  );
};
