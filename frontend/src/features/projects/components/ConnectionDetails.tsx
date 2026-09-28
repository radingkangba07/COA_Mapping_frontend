import React, { useCallback } from 'react';
import { View } from 'react-native';
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

  // Both sides are MCP — two independent panels so source and target each create
  // their own backend connection record and test independently without sharing state.
  if (sourceIsMcp && targetIsMcp) {
    return (
      <View className="flex-1 gap-4" testID={testID}>
        <MCPConnectionPanel
          key="source"
          className="flex-1"
          value={seedForm(connection, 'source')}
          fixedScope="source"
          testID="mcp-panel-source"
        />
        <MCPConnectionPanel
          key="target"
          className="flex-1"
          value={seedForm(connection, 'target')}
          fixedScope="target"
          testID="mcp-panel-target"
        />
      </View>
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
