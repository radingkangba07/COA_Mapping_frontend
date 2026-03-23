import React from 'react';
import { View, Text } from 'react-native';
import { Button } from '@/shared/components/ui/Button';

interface ErrorBoundaryProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  private handleReset = (): void => {
    this.setState({ hasError: false, error: null });
  };

  override render(): React.ReactNode {
    if (!this.state.hasError) {
      return this.props.children;
    }

    if (this.props.fallback !== undefined) {
      return this.props.fallback;
    }

    return (
      <View
        className="flex-1 items-center justify-center bg-background px-6"
        testID="error-boundary-fallback"
      >
        <Text className="mb-2 text-center font-heading text-xl font-semibold text-foreground">
          Something went wrong
        </Text>
        {this.state.error !== null && (
          <Text className="mb-6 text-center font-body text-sm text-muted-foreground">
            {this.state.error.message}
          </Text>
        )}
        <Button onPress={this.handleReset} testID="error-boundary-retry">
          Try Again
        </Button>
      </View>
    );
  }
}
