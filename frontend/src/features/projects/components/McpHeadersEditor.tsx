import React, { useCallback, useRef } from 'react';
import { Pressable, Text, View } from 'react-native';
import { Plus, Trash2 } from 'lucide-react-native';
import { Button } from '@/shared/components/ui/Button';
import { Input } from '@/shared/components/ui/Input';
import { colors } from '@/config/theme';
import type { McpFormHeader } from '../services/mcp.service';

const ICON_SIZE = 16;

interface McpHeadersEditorProps {
  headers: readonly McpFormHeader[];
  onChange: (headers: readonly McpFormHeader[]) => void;
  testID?: string;
}

interface HeaderRowProps {
  header: McpFormHeader;
  index: number;
  testID: string;
  onUpdate: (id: string, patch: Partial<McpFormHeader>) => void;
  onRemove: (id: string) => void;
}

const HeaderRow = ({
  header,
  index,
  testID,
  onUpdate,
  onRemove,
}: HeaderRowProps): React.JSX.Element => {
  const handleKeyChange = useCallback(
    (key: string): void => {
      onUpdate(header.id, { key });
    },
    [onUpdate, header.id],
  );

  const handleValueChange = useCallback(
    (value: string): void => {
      onUpdate(header.id, { value });
    },
    [onUpdate, header.id],
  );

  const handleRemove = useCallback((): void => {
    onRemove(header.id);
  }, [onRemove, header.id]);

  return (
    <View
      className="flex-row items-end gap-2"
      testID={`${testID}-row-${index}`}
    >
      <Input
        value={header.key}
        onChangeText={handleKeyChange}
        placeholder="X-Custom-Header"
        autoCapitalize="none"
        className="flex-1"
        testID={`${testID}-key-${index}`}
      />
      <Input
        value={header.value}
        onChangeText={handleValueChange}
        placeholder="value"
        autoCapitalize="none"
        className="flex-1"
        testID={`${testID}-value-${index}`}
      />
      <Pressable
        onPress={handleRemove}
        accessibilityRole="button"
        accessibilityLabel="Remove header"
        className="h-10 w-10 items-center justify-center rounded-md border border-input bg-background"
        testID={`${testID}-delete-${index}`}
      >
        <Trash2 size={ICON_SIZE} color={colors.destructive} />
      </Pressable>
    </View>
  );
};

export const McpHeadersEditor = ({
  headers,
  onChange,
  testID = 'mcp-headers',
}: McpHeadersEditorProps): React.JSX.Element => {
  // Monotonic counter for stable, deterministic ids. Seeded past the count of
  // incoming headers to avoid colliding with any pre-existing `h-N` ids.
  const idCounter = useRef<number>(headers.length);

  const handleUpdate = useCallback(
    (id: string, patch: Partial<McpFormHeader>): void => {
      onChange(
        headers.map((header) =>
          header.id === id ? { ...header, ...patch } : header,
        ),
      );
    },
    [headers, onChange],
  );

  const handleRemove = useCallback(
    (id: string): void => {
      onChange(headers.filter((header) => header.id !== id));
    },
    [headers, onChange],
  );

  const handleAdd = useCallback((): void => {
    const next: McpFormHeader = {
      id: `h-${idCounter.current}`,
      key: '',
      value: '',
    };
    idCounter.current += 1;
    onChange([...headers, next]);
  }, [headers, onChange]);

  return (
    <View className="gap-2" testID={testID}>
      <View className="flex-row items-center justify-between">
        <Text className="font-heading text-sm font-medium text-card-foreground">
          Headers (Optional)
        </Text>
        <Button
          variant="outline"
          size="sm"
          onPress={handleAdd}
          className="gap-1"
          testID={`${testID}-add`}
        >
          <Plus size={ICON_SIZE} color={colors.foreground} />
          <Text className="font-body text-xs font-medium text-foreground">
            Add Header
          </Text>
        </Button>
      </View>

      {headers.length > 0 && (
        <View className="flex-row gap-2 px-0.5">
          <Text className="flex-1 font-body text-xs font-medium text-muted-foreground">
            Header Key
          </Text>
          <Text className="flex-1 font-body text-xs font-medium text-muted-foreground">
            Header Value
          </Text>
          <View className="w-10" />
        </View>
      )}

      {headers.length === 0 ? (
        <Text
          className="font-body text-xs text-muted-foreground"
          testID={`${testID}-empty`}
        >
          No custom headers
        </Text>
      ) : (
        headers.map((header, index) => (
          <HeaderRow
            key={header.id}
            header={header}
            index={index}
            testID={testID}
            onUpdate={handleUpdate}
            onRemove={handleRemove}
          />
        ))
      )}
    </View>
  );
};
