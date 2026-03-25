import React, { useEffect, useRef } from 'react';
import { Animated } from 'react-native';
import { cn } from '@/shared/utils/string.utils';

interface SkeletonProps {
  className?: string;
  width?: number | `${number}%` | 'auto';
  height?: number | `${number}%` | 'auto';
  borderRadius?: number;
  testID?: string;
}

export const Skeleton = ({
  className,
  width,
  height,
  borderRadius = 4,
  testID,
}: SkeletonProps): React.JSX.Element => {
  const opacity = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, {
          toValue: 1,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 0.3,
          duration: 800,
          useNativeDriver: true,
        }),
      ]),
    );
    animation.start();
    return () => animation.stop();
  }, [opacity]);

  return (
    <Animated.View
      style={[{ opacity, width, height, borderRadius }]}
      className={cn('bg-muted', className)}
      testID={testID}
      accessibilityRole="none"
      accessibilityLabel="Loading"
    />
  );
};
