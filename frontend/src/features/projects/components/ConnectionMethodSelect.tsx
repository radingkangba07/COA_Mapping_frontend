import React, { useCallback } from 'react';
import { Select, type SelectOption } from '@/shared/components/ui/Select';
import type { ConnectionMethod } from '../types/project-scope.types';

// DA-55: per-side connection-method dropdown. Two methods only for now —
// Cloud/On-Premise from the design are intentionally OUT OF SCOPE.
const CONNECTION_METHOD_OPTIONS: readonly SelectOption[] = [
  { label: 'MCP Server', value: 'mcp' },
  { label: 'CSV File Upload', value: 'csv' },
];

function isConnectionMethod(value: string): value is ConnectionMethod {
  return value === 'mcp' || value === 'csv';
}

interface ConnectionMethodSelectProps {
  readonly value: ConnectionMethod;
  readonly onChange: (method: ConnectionMethod) => void;
  readonly testID?: string;
}

export const ConnectionMethodSelect = ({
  value,
  onChange,
  testID,
}: ConnectionMethodSelectProps): React.JSX.Element => {
  const handleValueChange = useCallback(
    (next: string): void => {
      if (isConnectionMethod(next)) {
        onChange(next);
      }
    },
    [onChange],
  );

  return (
    <Select
      label="Connection Method"
      options={[...CONNECTION_METHOD_OPTIONS]}
      value={value}
      onValueChange={handleValueChange}
      testID={testID}
    />
  );
};
