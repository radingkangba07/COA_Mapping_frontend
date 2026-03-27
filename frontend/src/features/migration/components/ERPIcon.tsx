import { memo } from 'react';
import { View, Text } from 'react-native';

import { getERPBrand } from '@/shared/constants/erp-colors';

interface ERPIconProps {
  erpId: string;
  size?: number;
  testID?: string;
}

export const ERPIcon = memo(function ERPIcon({ erpId, size = 36, testID }: ERPIconProps) {
  const brand = getERPBrand(erpId);
  const fontSize = Math.round(size * 0.4);

  return (
    <View
      testID={testID}
      className="rounded-full items-center justify-center"
      style={{
        width: size,
        height: size,
        backgroundColor: brand.bgColor,
      }}
    >
      <Text
        className="font-heading font-bold"
        style={{ fontSize, color: brand.textColor }}
      >
        {brand.abbreviation}
      </Text>
    </View>
  );
});
