import React, { useCallback, useState } from 'react';
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
  const [form, setForm] = useState<McpConnectionForm>(() => {
    const scope: McpConfigureScope =
      sourceMethod === CONNECTION_METHODS.MCP && targetMethod === CONNECTION_METHODS.MCP
        ? 'both'
        : targetMethod === CONNECTION_METHODS.MCP
          ? 'target'
          : 'source';
    return seedForm(connection, scope);
  });

  const handleFormChange = useCallback(
    (next: McpConnectionForm): void => {
      setForm(next);
      onConnectionChange(mcpFormToConnection(next, next.scope));
    },
    [onConnectionChange],
  );

  const isMcpSelected =
    sourceMethod === CONNECTION_METHODS.MCP || targetMethod === CONNECTION_METHODS.MCP;

  return (
    <View className="flex-1" testID={testID}>
      <MCPConnectionPanel
        className="flex-1"
        value={form}
        onChange={handleFormChange}
        isDisabled={!isMcpSelected}
        testID="mcp-panel"
      />
    </View>
  );
};
