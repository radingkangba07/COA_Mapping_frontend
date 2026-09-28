import React, { useCallback, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { Check } from 'lucide-react-native';
import { colors } from '@/config/theme';
import { useProjectScopeStore } from '../store/project-scope.store';
import {
  CONNECTION_METHODS,
  type ConnectionMethod,
  type MCPConnection,
} from '../types/project-scope.types';
import {
  createInitialMcpForm,
  type McpConfigureScope,
  type McpConnectionForm,
} from '../services/mcp.service';
import { mcpFormToConnection } from '../services/mcp-connection.mapper';
import { MCPConnectionPanel } from './MCPConnectionPanel';

interface ConnectionDetailsProps {
  readonly sourceMethod: ConnectionMethod;
  readonly targetMethod: ConnectionMethod;
  readonly connection: MCPConnection;
  readonly onConnectionChange: (connection: MCPConnection) => void;
  readonly testID?: string;
}

function seedForm(connection: MCPConnection, scope: McpConfigureScope): McpConnectionForm {
  return { ...createInitialMcpForm(), url: connection.url, skipSSL: connection.skipSSL, scope };
}

// ─── Both-MCP panel ───────────────────────────────────────────────────────────
// Renders a single MCPConnectionPanel with a Source / Target scope toggle.
// Each side holds its own isolated form state so switching scope never
// carries credentials from one side to the other.

interface DualMcpPanelProps {
  readonly connection: MCPConnection;
  readonly onConnectionChange: (connection: MCPConnection) => void;
  readonly testID?: string;
}

function DualMcpPanel({
  connection,
  onConnectionChange,
  testID,
}: DualMcpPanelProps): React.JSX.Element {
  const [activeScope, setActiveScope] = useState<'source' | 'target'>('source');

  // Separate form state per side — switching scope never mixes credentials.
  const [sourceForm, setSourceForm] = useState<McpConnectionForm>(() =>
    seedForm(connection, 'source'),
  );
  const [targetForm, setTargetForm] = useState<McpConnectionForm>(() =>
    seedForm(connection, 'target'),
  );

  // Read per-side test status from the store so each toggle button can show
  // whether that side has a validated connection, even when it is not active.
  const sourceReady = useProjectScopeStore((s) => s.sourceConnectionReady);
  const targetReady = useProjectScopeStore((s) => s.targetConnectionReady);
  const statusByScope = { source: sourceReady, target: targetReady } as const;

  const handleChange = useCallback(
    (next: McpConnectionForm): void => {
      if (activeScope === 'source') {
        setSourceForm(next);
        onConnectionChange(mcpFormToConnection(next, 'source'));
      } else {
        setTargetForm(next);
        onConnectionChange(mcpFormToConnection(next, 'target'));
      }
    },
    [activeScope, onConnectionChange],
  );

  return (
    <View className="flex-1 gap-3" testID={testID}>
      {/* Scope toggle — each button shows a green tick when that side is tested */}
      <View className="flex-row gap-2">
        {(['source', 'target'] as const).map((scope) => {
          const isActive = activeScope === scope;
          const isReady = statusByScope[scope];
          return (
            <Pressable
              key={scope}
              onPress={() => setActiveScope(scope)}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: 6,
                borderWidth: 1,
                borderColor: isReady
                  ? colors.success
                  : isActive
                    ? colors.accent
                    : colors.border,
                backgroundColor: isReady
                  ? colors.success + '12'
                  : isActive
                    ? colors.accent + '15'
                    : 'transparent',
                borderRadius: 6,
                paddingHorizontal: 12,
                paddingVertical: 6,
              }}
              testID={`mcp-scope-btn-${scope}`}
            >
              {isReady ? (
                <Check size={12} color={colors.success} />
              ) : null}
              <Text
                style={{
                  fontFamily: 'Inter',
                  fontSize: 13,
                  fontWeight: isActive ? '600' : '400',
                  color: isReady
                    ? colors.success
                    : isActive
                      ? colors.accent
                      : colors.foreground,
                  textTransform: 'capitalize',
                }}
              >
                {scope}
              </Text>
            </Pressable>
          );
        })}
      </View>

      {/* Single panel — re-mounts on scope switch so each side starts fresh */}
      <MCPConnectionPanel
        key={activeScope}
        className="flex-1"
        value={activeScope === 'source' ? sourceForm : targetForm}
        fixedScope={activeScope}
        onChange={handleChange}
        testID={`mcp-panel-${activeScope}`}
      />
    </View>
  );
}

// ─── ConnectionDetails ────────────────────────────────────────────────────────

export const ConnectionDetails = ({
  sourceMethod,
  targetMethod,
  connection,
  onConnectionChange,
  testID,
}: ConnectionDetailsProps): React.JSX.Element => {
  const sourceIsMcp = sourceMethod === CONNECTION_METHODS.MCP;
  const targetIsMcp = targetMethod === CONNECTION_METHODS.MCP;

  const handleSourceChange = useCallback(
    (next: McpConnectionForm): void => {
      onConnectionChange(mcpFormToConnection(next, 'source'));
    },
    [onConnectionChange],
  );

  const handleTargetChange = useCallback(
    (next: McpConnectionForm): void => {
      onConnectionChange(mcpFormToConnection(next, 'target'));
    },
    [onConnectionChange],
  );

  // Both sides are MCP — single panel with Source/Target scope toggle.
  // Each side's form state is isolated inside DualMcpPanel.
  if (sourceIsMcp && targetIsMcp) {
    return (
      <DualMcpPanel
        connection={connection}
        onConnectionChange={onConnectionChange}
        testID={testID}
      />
    );
  }

  // Only source is MCP — single panel locked to source.
  if (sourceIsMcp) {
    return (
      <View className="flex-1" testID={testID}>
        <MCPConnectionPanel
          key="source-only"
          className="flex-1"
          value={seedForm(connection, 'source')}
          fixedScope="source"
          onChange={handleSourceChange}
          testID="mcp-panel"
        />
      </View>
    );
  }

  // Only target is MCP — single panel locked to target.
  if (targetIsMcp) {
    return (
      <View className="flex-1" testID={testID}>
        <MCPConnectionPanel
          key="target-only"
          className="flex-1"
          value={seedForm(connection, 'target')}
          fixedScope="target"
          onChange={handleTargetChange}
          testID="mcp-panel"
        />
      </View>
    );
  }

  // Neither side is MCP — disabled placeholder.
  return (
    <View className="flex-1" testID={testID}>
      <MCPConnectionPanel
        key="disabled"
        className="flex-1"
        value={seedForm(connection, 'source')}
        isDisabled
        testID="mcp-panel"
      />
    </View>
  );
};
