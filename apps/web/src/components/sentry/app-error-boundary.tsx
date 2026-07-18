'use client';

import { type ReactNode, useCallback, useEffect, useState } from 'react';
import * as Sentry from '@sentry/nextjs';

import { RecoveryShell } from '@/components/sentry/recovery-shell';
import {
    AUTO_RESET_MS,
    HARD_RECOVER_MS,
    clearErrorRecoveryState,
    planRecoveryAttempt,
} from '@/hooks/use-error-boundary-recovery';
import { useI18n } from '@/locales/client';

type FallbackProps = {
    error: unknown;
    resetError: () => void;
};

function AutoRecoverFallback({ error, resetError }: FallbackProps) {
    const t = useI18n();
    const [phase, setPhase] = useState<'retrying' | 'redirecting'>('retrying');

    useEffect(() => {
        const plan = planRecoveryAttempt(error);
        Sentry.captureException(error, {
            tags: {
                error_boundary: 'react_tree',
                recovery_attempt: String(plan.attempts),
                recovery_mode: plan.mode,
            },
        });

        if (plan.mode === 'hard') {
            setPhase('redirecting');
            const hardTimer = window.setTimeout(() => {
                clearErrorRecoveryState();
                window.location.replace('/');
            }, HARD_RECOVER_MS);
            return () => window.clearTimeout(hardTimer);
        }

        setPhase('retrying');
        const softTimer = window.setTimeout(() => {
            try {
                resetError();
            } catch {
                setPhase('redirecting');
                clearErrorRecoveryState();
                window.location.replace('/');
            }
        }, AUTO_RESET_MS);

        return () => window.clearTimeout(softTimer);
    }, [error, resetError]);

    return (
        <RecoveryShell
            phase={phase}
            label={
                phase === 'redirecting'
                    ? t('error.boundary.redirecting')
                    : t('error.boundary.retrying')
            }
            className="flex min-h-[30vh] items-center justify-center px-6 py-10"
        />
    );
}

/**
 * Client-tree safety net under the locale layout.
 * Catches render errors that never reach `error.tsx`, reports to Sentry, auto-recovers.
 */
export function AppErrorBoundary({ children }: { children: ReactNode }) {
    const renderFallback = useCallback(
        (props: FallbackProps) => <AutoRecoverFallback {...props} />,
        [],
    );

    return (
        <Sentry.ErrorBoundary fallback={renderFallback} showDialog={false}>
            {children}
        </Sentry.ErrorBoundary>
    );
}
