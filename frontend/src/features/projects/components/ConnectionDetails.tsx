import React, { useCallback, useState } from 'react';
import { View } from 'react-native';
import type { ConnectionMethod, MCPConnection } from '../types/project-scope.types';
import {
  createInitialMcpForm,
  type McpConnectionForm,
} from '../services/mcp.service';
import { mcpFormToConnection } from '../services/mcp-connection.mapper';
import { MCPConnectionPanel } from './MCPConnectionPanel';
import { TestConnectionFlow } from './TestConnectionFlow';
import { ProjectScopeUpload } from './ProjectScopeUpload';

interface ConnectionDetailsProps {
  readonly sourceMethod: ConnectionMethod;
  readonly targetMethod: ConnectionMethod;
  readonly connection: MCPConnection;
  readonly onConnectionChange: (connection: MCPConnection) => void;
  readonly testID?: string;
}

// Seeds the editable panel form from the lean draft projection so a restored
// draft shows its previously-entered URL. The rich McpConnectionForm remains the
// UI source of truth; each edit is re-projected onto the lean MCPConnection.
function seedForm(connection: MCPConnection): McpConnectionForm {
  return { ...createInitialMcpForm(), url: connection.url, skipSSL: connection.skipSSL };
}

// Single shared connection panel (partial DA-48 revert). When either side uses
// MCP, ONE MCPConnectionPanel (with the "Configure for" scope selector) plus ONE
// Test Connection flow drive both sides; each CSV side keeps its file-upload card.
export const ConnectionDetails = ({
  sourceMethod,
  targetMethod,
  connection,
  onConnectionChange,
  testID,
}: ConnectionDetailsProps): React.JSX.Element => {
  const [form, setForm] = useState<McpConnectionForm>(() => seedForm(connection));

  const handleFormChange = useCallback(
    (next: McpConnectionForm): void => {
      setForm(next);
      onConnectionChange(mcpFormToConnection(next, next.scope));
    },
    [onConnectionChange],
  );

  const showMcp = sourceMethod === 'mcp' || targetMethod === 'mcp';

  return (
    <View className="gap-4" testID={testID}>
      {showMcp && (
        <View className="gap-3">
          <MCPConnectionPanel
            value={form}
            onChange={handleFormChange}
            testID="mcp-panel"
          />
          <TestConnectionFlow connection={form} testID="test-connection" />
        </View>
      )}

      {sourceMethod === 'csv' && (
        <ProjectScopeUpload label="Source COA File" testID="upload-source" />
      )}

      {targetMethod === 'csv' && (
        <ProjectScopeUpload label="Target COA File" testID="upload-target" />
      )}
    </View>
  );
};
