import React, { useCallback, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { AlertTriangle, CheckCircle2, Circle } from 'lucide-react-native';
import { Card } from '@/shared/components/ui/Card';
import { Button } from '@/shared/components/ui/Button';
import { Input } from '@/shared/components/ui/Input';
import { FuzzyMatchBadge } from '@/features/migration/components/FuzzyMatchBadge/FuzzyMatchBadge';
import { cn } from '@/shared/utils/string.utils';
import { colors } from '@/config/theme';

interface SuggestedTarget {
  name: string;
  score: number;
}

interface ConflictResolverProps {
  sourceName: string;
  sourceNumber: string;
  currentTargetName: string;
  suggestions: SuggestedTarget[];
  onResolve: (targetName: string) => void;
  onCancel: () => void;
  testID?: string;
}

export const ConflictResolver = ({
  sourceName,
  sourceNumber,
  currentTargetName,
  suggestions,
  onResolve,
  onCancel,
  testID,
}: ConflictResolverProps) => {
  const [selectedSuggestion, setSelectedSuggestion] = useState<string | null>(null);
  const [manualInput, setManualInput] = useState('');

  const resolvedValue = manualInput.trim().length > 0
    ? manualInput.trim()
    : selectedSuggestion;

  const isConfirmDisabled = resolvedValue === null || resolvedValue.length === 0;

  const handleSuggestionPress = useCallback((name: string) => {
    setSelectedSuggestion(name);
    setManualInput('');
  }, []);

  const handleManualChange = useCallback((text: string) => {
    setManualInput(text);
    if (text.trim().length > 0) {
      setSelectedSuggestion(null);
    }
  }, []);

  const handleConfirm = useCallback(() => {
    if (resolvedValue !== null && resolvedValue.length > 0) {
      onResolve(resolvedValue);
    }
  }, [resolvedValue, onResolve]);

  return (
    <Card testID={testID}>
      <Card.Header>
        <View className="flex-row items-center gap-2">
          <AlertTriangle size={20} color={colors.warning} />
          <Card.Title>Resolve Mapping Conflict</Card.Title>
        </View>
      </Card.Header>

      <Card.Content className="gap-4">
        <View className="rounded-md bg-muted px-3 py-2">
          <Text className="font-body text-sm text-muted-foreground">
            Source: <Text className="font-mono font-medium text-foreground">{sourceNumber}</Text>
            {' - '}
            <Text className="font-medium text-foreground">{sourceName}</Text>
          </Text>
        </View>

        {currentTargetName.length > 0 && (
          <View className="gap-1">
            <Text className="font-body text-xs font-medium text-muted-foreground">
              Current Target
            </Text>
            <Text className="font-body text-sm text-foreground">{currentTargetName}</Text>
          </View>
        )}

        <View className="gap-2">
          <Text className="font-body text-sm font-medium text-foreground">
            Suggested Targets
          </Text>
          {suggestions.map((suggestion) => {
            const isSelected = selectedSuggestion === suggestion.name
              && manualInput.trim().length === 0;

            return (
              <Pressable
                key={suggestion.name}
                onPress={() => handleSuggestionPress(suggestion.name)}
                className={cn(
                  'flex-row items-center justify-between rounded-md border px-3 py-2.5',
                  isSelected
                    ? 'border-primary bg-primary/5'
                    : 'border-border bg-background',
                )}
                testID={testID !== undefined ? `${testID}-suggestion-${suggestion.name}` : undefined}
              >
                <View className="flex-row items-center gap-2.5 flex-1">
                  {isSelected ? (
                    <CheckCircle2 size={18} color={colors.primary} />
                  ) : (
                    <Circle size={18} color={colors.mutedForeground} />
                  )}
                  <Text
                    className="font-body text-sm text-foreground flex-shrink"
                    numberOfLines={1}
                  >
                    {suggestion.name}
                  </Text>
                </View>
                <FuzzyMatchBadge score={suggestion.score} size="sm" showLabel={false} />
              </Pressable>
            );
          })}
        </View>

        <Input
          label="Or enter manually:"
          value={manualInput}
          onChangeText={handleManualChange}
          placeholder="Type a custom target name"
          testID={testID !== undefined ? `${testID}-manual-input` : undefined}
        />
      </Card.Content>

      <Card.Footer className="justify-end gap-3">
        <Button
          variant="ghost"
          onPress={onCancel}
          testID={testID !== undefined ? `${testID}-cancel` : undefined}
        >
          Cancel
        </Button>
        <Button
          variant="default"
          onPress={handleConfirm}
          disabled={isConfirmDisabled}
          testID={testID !== undefined ? `${testID}-confirm` : undefined}
        >
          Confirm
        </Button>
      </Card.Footer>
    </Card>
  );
};
