import React, { useCallback, useMemo, useState } from 'react';
import { View } from 'react-native';
import { Collapsible } from '@/shared/components/ui/Collapsible';
import { Input } from '@/shared/components/ui/Input';
import {
  createInitialMcpForm,
  validateConnection,
  type McpConfigureScope,
  type McpConnectionForm,
} from '../services/mcp.service';
import type { AuthFieldErrors } from './McpAuthFields.config';
import { McpScopeSelector } from './McpScopeSelector';
import { McpAuthFields } from './McpAuthFields';
import { McpHeadersEditor } from './McpHeadersEditor';
import { McpAdvancedSettings } from './McpAdvancedSettings';
import { McpPanelTitle } from './McpPanelTitle';
import type { McpFormHeader } from '../services/mcp.service';

interface MCPConnectionPanelProps {
  value?: McpConnectionForm;
  onChange?: (next: McpConnectionForm) => void;
  // When provided, the panel is locked to a single side: the scope selector is
  // hidden and the form's scope is forced to this value (DA-48 per-side mount).
  fixedScope?: McpConfigureScope;
  testID?: string;
}

export const MCPConnectionPanel = ({
  value,
  onChange,
  fixedScope,
  testID = 'mcp-connection-panel',
}: MCPConnectionPanelProps): React.JSX.Element => {
  const [isOpen, setIsOpen] = useState(true);
  const [urlTouched, setUrlTouched] = useState(false);
  const [touched, setTouched] = useState(false);
  const [form, setForm] = useState<McpConnectionForm>(() => {
    const base = value ?? createInitialMcpForm();
    return fixedScope !== undefined ? { ...base, scope: fixedScope } : base;
  });

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
      applyPatch({ scope });
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
    setTouched(true);
  }, []);

  const handleHeadersChange = useCallback(
    (headers: readonly McpFormHeader[]): void => {
      applyPatch({ headers });
    },
    [applyPatch],
  );

  const errors = useMemo(() => validateConnection(form), [form]);

  // Keep the existing touched-gated URL UX; only the message source moves to
  // the service. Empty URLs stay un-flagged until the field is blurred.
  const urlError = urlTouched && form.url.length > 0 ? errors.url : undefined;

  const authErrors = useMemo<AuthFieldErrors | undefined>(() => {
    if (!touched) {
      return undefined;
    }
    const { url: _url, ...rest } = errors;
    return rest;
  }, [touched, errors]);

  const renderFields = useCallback(
    (): React.JSX.Element => (
      <View
        className="gap-3 rounded-md border border-border bg-muted/30 p-3"
        testID="mcp-fields"
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
          errors={authErrors}
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
      authErrors,
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
        {fixedScope === undefined && (
          <McpScopeSelector
            value={form.scope}
            onChange={handleScopeChange}
            testID="mcp-scope"
          />
        )}

        {renderFields()}

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
