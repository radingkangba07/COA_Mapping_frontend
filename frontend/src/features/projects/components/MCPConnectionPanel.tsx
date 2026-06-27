import React, { useCallback, useState } from 'react';
import { View } from 'react-native';
import { Collapsible } from '@/shared/components/ui/Collapsible';
import { Tabs } from '@/shared/components/ui/Tabs';
import { Input } from '@/shared/components/ui/Input';
import {
  createInitialMcpForm,
  isValidMcpUrl,
  type McpActiveTab,
  type McpConfigureScope,
  type McpConnectionForm,
} from '../services/mcp.service';
import { McpScopeSelector } from './McpScopeSelector';
import { McpAuthFields } from './McpAuthFields';
import { McpHeadersEditor } from './McpHeadersEditor';
import { McpAdvancedSettings } from './McpAdvancedSettings';
import { McpPanelTitle } from './McpPanelTitle';
import type { McpFormHeader } from '../services/mcp.service';

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
  const [urlTouched, setUrlTouched] = useState(false);
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

  const handleUrlChange = useCallback(
    (url: string): void => {
      applyPatch({ url });
    },
    [applyPatch],
  );

  const handleUrlBlur = useCallback((): void => {
    setUrlTouched(true);
  }, []);

  const handleHeadersChange = useCallback(
    (headers: readonly McpFormHeader[]): void => {
      applyPatch({ headers });
    },
    [applyPatch],
  );

  const urlError =
    urlTouched && form.url.length > 0 && !isValidMcpUrl(form.url)
      ? 'Enter a valid http(s) URL'
      : undefined;

  const renderFields = useCallback(
    (context: McpActiveTab): React.JSX.Element => (
      <View
        className="gap-3 rounded-md border border-border bg-muted/30 p-3"
        testID={`mcp-fields-${context}`}
      >
        <Input
          label="MCP Server URL"
          placeholder="https://mcp.example.com"
          value={form.url}
          onChangeText={handleUrlChange}
          onBlur={handleUrlBlur}
          error={urlError}
          autoCapitalize="none"
          keyboardType="url"
          testID="mcp-url-input"
        />
        <McpAuthFields
          form={form}
          onPatch={applyPatch}
          testID="mcp-auth-fields"
        />
        <McpHeadersEditor
          headers={form.headers}
          onChange={handleHeadersChange}
          testID="mcp-headers"
        />
      </View>
    ),
    [
      form,
      handleUrlChange,
      handleUrlBlur,
      applyPatch,
      urlError,
      handleHeadersChange,
    ],
  );

  return (
    <Collapsible
      isOpen={isOpen}
      onToggle={handleToggle}
      title={<McpPanelTitle testID={testID} />}
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

          <Tabs.Content value="source">{renderFields('source')}</Tabs.Content>

          <Tabs.Content value="target">{renderFields('target')}</Tabs.Content>
        </Tabs>

        <McpAdvancedSettings
          skipSSL={form.skipSSL}
          proxy={form.proxy}
          timeout={form.timeout}
          onPatch={applyPatch}
          testID="mcp-advanced"
        />
      </View>
    </Collapsible>
  );
};
