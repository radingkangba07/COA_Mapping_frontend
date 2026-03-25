import React from 'react';
import { ErrorBoundary } from './ErrorBoundary';
import { NetworkErrorFallback } from './NetworkErrorFallback';

interface QueryErrorBoundaryProps {
  children: React.ReactNode;
  onRetry?: () => void;
  testID?: string;
}

export const QueryErrorBoundary = ({
  children,
  onRetry,
  testID,
}: QueryErrorBoundaryProps): React.JSX.Element => (
  <ErrorBoundary
    fallbackRender={({ error, resetError }) => (
      <NetworkErrorFallback
        error={error}
        onRetry={() => {
          resetError();
          onRetry?.();
        }}
        testID={testID}
      />
    )}
  >
    {children}
  </ErrorBoundary>
);
