import React, { useCallback, useState } from 'react';
import { View } from 'react-native';
import type { ConnectionMethod, McpScope, MCPConnection } from '../types/project-scope.types';
import {
  createInitialMcpForm,
  type McpConnectionForm,
} from '../services/mcp.service';
import { mcpFormToConnection } from '../services/mcp-connection.mapper';
import { MCPConnectionPanel } from './MCPConnectionPanel';
import { TestConnectionFlow } from './TestConnectionFlow';
import { ProjectScopeUpload } from './ProjectScopeUpload';

interface ProjectSideConnectionProps {
  readonly scope: McpScope; // 'source' | 'target'
  readonly method: ConnectionMethod;
  readonly uploadLabel: string;
  readonly onConnectionChange: (connection: MCPConnection) => void;
  readonly testID?: string;
}

// DA-56: per-side connection configuration. Renders the MCP panel + test flow
// when the side's method is 'mcp', or the reused migration file-upload control
// when it is 'csv'. The rich panel form is the UI source of truth; each edit is
// projected onto the lean draft MCPConnection via the mapper.
export const ProjectSideConnection = ({
  scope,
  method,
  uploadLabel,
  onConnectionChange,
  testID,
}: ProjectSideConnectionProps): React.JSX.Element => {
  const [form, setForm] = useState<McpConnectionForm>(() => ({
    ...createInitialMcpForm(),
    scope,
  }));

  const handleFormChange = useCallback(
    (next: McpConnectionForm): void => {
      setForm(next);
      onConnectionChange(mcpFormToConnection(next, scope));
    },
    [onConnectionChange, scope],
  );

  if (method === 'csv') {
    return <ProjectScopeUpload label={uploadLabel} testID={`upload-${scope}`} />;
  }

  return (
    <View className="gap-3" testID={testID}>
      <MCPConnectionPanel
        fixedScope={scope}
        value={form}
        onChange={handleFormChange}
        testID={`mcp-panel-${scope}`}
      />
      <TestConnectionFlow
        connection={form}
        testID={`test-connection-${scope}`}
      />
    </View>
  );
};
