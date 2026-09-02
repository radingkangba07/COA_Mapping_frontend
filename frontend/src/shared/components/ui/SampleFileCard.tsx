/* ============================================================================
   SampleFileCard.tsx  ·  Read-only sample-file preview row with Load/Download
   ----------------------------------------------------------------------------
   The sample content itself (spec.sample vs. a caller-owned fallback) stays
   resolved by the caller — this component only renders the name/description
   and forwards the two button presses.
   ========================================================================= */

import React from 'react';
import { View, Text, Pressable } from 'react-native';

interface SampleFileCardProps {
  sampleName: string;
  sampleDesc: string;
  onLoad: () => void;
  onDownload: () => void;
}

export function SampleFileCard({
  sampleName,
  sampleDesc,
  onLoad,
  onDownload,
}: SampleFileCardProps): React.JSX.Element {
  return (
    <View className="border-t border-border mt-5 pt-4">
      <Text className="text-[15px] font-bold mb-0.5 font-heading text-foreground">Sample File</Text>
      <Text className="text-xs mb-3 font-body text-muted-foreground">
        Preview or download a sample source file for testing
      </Text>
      <View className="flex-row items-center gap-3.5 mt-[13px] flex-wrap">
        <View className="w-[30px] h-[30px] rounded-[7px] items-center justify-center shrink-0 bg-surface">
          <Text className="text-[9px] font-bold font-mono text-muted-foreground">CSV</Text>
        </View>
        <Text className="flex-1 min-w-[120px] text-[13px] font-semibold font-body text-foreground">{sampleName}</Text>
        <Text className="flex-[1.4] min-w-[160px] text-xs font-body text-muted-foreground" numberOfLines={2}>
          {sampleDesc}
        </Text>
        <View className="flex-row gap-[9px]">
          <Pressable
            onPress={onLoad}
            className="flex-row items-center justify-center border border-border rounded-[8px] px-3.5 py-2 bg-card"
          >
            <Text className="text-xs font-medium font-body text-foreground">Load</Text>
          </Pressable>
          <Pressable
            onPress={onDownload}
            className="flex-row items-center justify-center border border-border rounded-[8px] px-3.5 py-2 bg-card"
          >
            <Text className="text-xs font-medium font-body text-foreground">Download</Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
}
