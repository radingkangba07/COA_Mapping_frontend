import React, { useCallback } from 'react';
import { Select, type SelectOption } from '@/shared/components/ui/Select';
import {
  CONNECTION_METHODS,
  type ConnectionMethod,
} from '../types/project-scope.types';

// DA-55: per-side connection-method dropdown. Two methods only for now —
// Cloud/On-Premise from the design are intentionally OUT OF SCOPE.
// Values come from CONNECTION_METHODS so the dropdown and every comparison
// share one definition.
const CONNECTION_METHOD_OPTIONS: readonly SelectOption[] = [
  { label: 'MCP Server', value: CONNECTION_METHODS.MCP },
  { label: 'CSV File Upload', value: CONNECTION_METHODS.CSV },
];

function isConnectionMethod(value: string): value is ConnectionMethod {
  return Object.values(CONNECTION_METHODS).includes(value as ConnectionMethod);
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
