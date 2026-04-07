import { useState, useEffect, useRef, useCallback } from 'react';
import { httpClient } from '@/shared/services/http/http.instance';
import { useToast } from '@/shared/hooks/useToast';
import { resendVerification } from '../services/auth.service';

const MAX_RESENDS = 3;
const COOLDOWN_SECONDS = 60;

interface CheckEmailViewModel {
  readonly resendButtonText: string;
  readonly isResendDisabled: boolean;
  readonly isResending: boolean;
  readonly resendCount: number;
  readonly handleResend: () => Promise<void>;
}

export function useCheckEmailViewModel(email: string): CheckEmailViewModel {
  const { showSuccess, showError } = useToast();

  const [resendCount, setResendCount] = useState(0);
  const [cooldownRemaining, setCooldownRemaining] = useState(0);
  const [isResending, setIsResending] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (cooldownRemaining <= 0) return;

    const id = setInterval(() => {
      setCooldownRemaining((prev) => {
        if (prev <= 1) {
          clearInterval(id);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      clearInterval(id);
    };
    // Only re-run when cooldown transitions from 0 to positive
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cooldownRemaining > 0]);

  useEffect(() => {
    return () => {
      if (intervalRef.current !== null) {
        clearInterval(intervalRef.current);
      }
    };
  }, []);

  const handleResend = useCallback(async (): Promise<void> => {
    if (resendCount >= MAX_RESENDS || cooldownRemaining > 0 || isResending) {
      return;
    }

    setIsResending(true);
    const result = await resendVerification(httpClient, email);
    setIsResending(false);

    if (result.ok) {
      setResendCount((prev) => prev + 1);
      setCooldownRemaining(COOLDOWN_SECONDS);
      showSuccess('Verification email sent', `A new link was sent to ${email}`);
    } else {
      showError('Resend failed', result.error.message);
    }
  }, [resendCount, cooldownRemaining, isResending, email, showSuccess, showError]);

  const isResendDisabled = resendCount >= MAX_RESENDS || cooldownRemaining > 0 || isResending;

  const resendButtonText =
    resendCount >= MAX_RESENDS
      ? 'Maximum resends reached'
      : cooldownRemaining > 0
        ? `Resend in ${cooldownRemaining}s`
        : 'Resend verification email';

  return {
    resendButtonText,
    isResendDisabled,
    isResending,
    resendCount,
    handleResend,
  };
}
