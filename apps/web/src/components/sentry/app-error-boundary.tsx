'use client';

import { type ReactNode, useCallback, useEffect, useState } from 'react';
import * as Sentry from '@sentry/nextjs';

import { useI18n } from '@/locales/client';

type FallbackProps = {
    error: unknown;
    resetError: () => void;
};

function AutoRecoverFallback({ error, resetError }: FallbackProps) {
    const t = useI18n();
    const [phase, setPhase] = useState<'retrying' | 'redirecting'>('retrying');

    useEffect(() => {
        Sentry.captureException(error, {
            tags: { error_boundary: 'react_tree' },
        });

        const soft = window.setTimeout(() => {
            try {
                resetError();
            } catch {
                setPhase('redirecting');
                window.location.replace('/');
            }
        }, 1000);

        // If soft reset somehow leaves us here, hard-navigate.
        const hard = window.setTimeout(() => {
            setPhase('redirecting');
            window.location.replace('/');
        }, 4000);

        return () => {
            window.clearTimeout(soft);
            window.clearTimeout(hard);
        };
    }, [error, resetError]);

    return (
        <div
            className="flex min-h-[30vh] flex-col items-center justify-center gap-3 px-6 py-10 text-center"
            role="status"
            aria-live="polite"
        >
            <div
                className="size-5 animate-spin rounded-full border-2 border-muted-foreground/30 border-t-foreground"
                aria-hidden
            />
            <p className="text-sm text-muted-foreground">
                {phase === 'redirecting'
                    ? t('error.boundary.redirecting')
                    : t('error.boundary.retrying')}
            </p>
        </div>
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
