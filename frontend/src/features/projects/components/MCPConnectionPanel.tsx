import React, { useCallback, useState } from 'react';
import { View, Text } from 'react-native';
import { Info } from 'lucide-react-native';
import { Collapsible } from '@/shared/components/ui/Collapsible';
import { Badge } from '@/shared/components/ui/Badge';
import { Tooltip } from '@/shared/components/ui/Tooltip';
import { Tabs } from '@/shared/components/ui/Tabs';
import { colors } from '@/config/theme';
import {
  createInitialMcpForm,
  type McpActiveTab,
  type McpConfigureScope,
  type McpConnectionForm,
} from '../services/mcp.service';
import { McpScopeSelector } from './McpScopeSelector';

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

  const handleScopeChange = useCallback(
    (scope: McpConfigureScope): void => {
      if (scope === 'source' || scope === 'target') {
        applyPatch({ scope, activeTab: scope });
      } else {
        applyPatch({ scope });
      }
    },
    [applyPatch],
  );

  const handleTabChange = useCallback(
    (tab: string): void => {
      // Tabs primitive emits `string`; our only triggers are the two
      // McpActiveTab values, so this narrowing cast is safe at the boundary.
      applyPatch({ activeTab: tab as McpActiveTab });
    },
    [applyPatch],
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
      <View className="gap-4" testID={`${testID}-body`}>
        <McpScopeSelector
          value={form.scope}
          onChange={handleScopeChange}
          testID="mcp-scope"
        />

        <Tabs
          value={form.activeTab}
          onValueChange={handleTabChange}
          testID="mcp-tabs"
        >
          {form.scope === 'both' && (
            <Tabs.List>
              <Tabs.Trigger value="source" testID="mcp-tab-source">
                Source
              </Tabs.Trigger>
              <Tabs.Trigger value="target" testID="mcp-tab-target">
                Target
              </Tabs.Trigger>
            </Tabs.List>
          )}

          <Tabs.Content value="source">
            <View
              className="rounded-md border border-border bg-muted/30 p-3"
              testID="mcp-fields-source"
            >
              <Text className="font-body text-sm text-muted-foreground">
                Connection fields for source
              </Text>
            </View>
          </Tabs.Content>

          <Tabs.Content value="target">
            <View
              className="rounded-md border border-border bg-muted/30 p-3"
              testID="mcp-fields-target"
            >
              <Text className="font-body text-sm text-muted-foreground">
                Connection fields for target
              </Text>
            </View>
          </Tabs.Content>
        </Tabs>
      </View>
    </Collapsible>
  );
};
