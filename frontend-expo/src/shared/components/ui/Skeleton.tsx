import React, { useEffect, useRef } from 'react';
import { Animated, type ViewProps } from 'react-native';
import { cn } from '@/shared/utils/string.utils';

type SkeletonVariant = 'rectangle' | 'circle';

interface SkeletonProps extends ViewProps {
  variant?: SkeletonVariant;
  width?: number;
  height?: number;
  className?: string;
  testID?: string;
}

export const Skeleton = React.forwardRef<React.ComponentRef<typeof Animated.View>, SkeletonProps>(
  ({ variant = 'rectangle', width, height, className, testID, style, ...props }, ref) => {
    const opacity = useRef(new Animated.Value(0.3)).current;

    useEffect(() => {
      const animation = Animated.loop(
        Animated.sequence([
          Animated.timing(opacity, {
            toValue: 1.0,
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

      return () => {
        animation.stop();
      };
    }, [opacity]);

    const isCircle = variant === 'circle';
    const resolvedSize = isCircle
      ? { width: width ?? height ?? 40, height: height ?? width ?? 40 }
      : { width, height };

    return (
      <Animated.View
        ref={ref}
        testID={testID}
        className={cn(
          'bg-muted',
          isCircle ? 'rounded-full' : 'rounded-md',
          className,
        )}
        style={[{ opacity }, resolvedSize, style]}
        {...props}
      />
    );
  },
);

Skeleton.displayName = 'Skeleton';
