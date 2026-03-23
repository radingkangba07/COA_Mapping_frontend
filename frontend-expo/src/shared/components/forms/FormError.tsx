import React, { useEffect, useRef } from 'react';
import { Animated, Text } from 'react-native';

interface FormErrorProps {
  message?: string;
  className?: string;
  testID?: string;
}

export const FormError = ({
  message,
  className,
  testID,
}: FormErrorProps): React.JSX.Element | null => {
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(-4)).current;

  useEffect(() => {
    if (message !== undefined && message.length > 0) {
      Animated.parallel([
        Animated.timing(opacity, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(translateY, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      opacity.setValue(0);
      translateY.setValue(-4);
    }
  }, [message, opacity, translateY]);

  if (message === undefined || message.length === 0) {
    return null;
  }

  return (
    <Animated.View
      style={{ opacity, transform: [{ translateY }] }}
      className={className}
      testID={testID}
    >
      <Text className="font-body text-xs text-destructive">
        {message}
      </Text>
    </Animated.View>
  );
};
