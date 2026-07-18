'use client';

import Link from 'next/link';
import * as Sentry from '@sentry/nextjs';

import { Button } from '@/components/ui/button';
import { useErrorBoundaryRecovery } from '@/hooks/use-error-boundary-recovery';
import { useI18n } from '@/locales/client';

/**
 * Segment error boundary — reports to Sentry, then auto-recovers without requiring a click.
 * Soft `reset()` first; if the segment keeps crashing, navigates home.
 */
export default function LocaleError({
    error,
    reset,
}: {
    error: Error & { digest?: string };
    reset: () => void;
}) {
    const t = useI18n();
    const phase = useErrorBoundaryRecovery(error, reset);

    const statusText =
        phase === 'redirecting'
            ? t('error.boundary.redirecting')
            : phase === 'retrying'
              ? t('error.boundary.retrying')
              : t('error.boundary.reporting');

    return (
        <div
            className="flex min-h-[40vh] flex-col items-center justify-center gap-3 px-6 py-12 text-center"
            role="status"
            aria-live="polite"
        >
            <div
                className="size-5 animate-spin rounded-full border-2 border-muted-foreground/30 border-t-foreground"
                aria-hidden
            />
            <p className="max-w-sm text-sm text-muted-foreground">{statusText}</p>
            {error.digest ? (
                <p className="font-mono text-[11px] text-muted-foreground/70">
                    {t('error.boundary.digest', { digest: error.digest })}
                </p>
            ) : null}
            {/* Escape hatches only — recovery is automatic. */}
            <div className="mt-4 flex flex-wrap items-center justify-center gap-2 opacity-70">
                <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    onClick={() => {
                        Sentry.addBreadcrumb({
                            category: 'error_boundary',
                            message: 'manual_reset',
                            level: 'info',
                        });
                        reset();
                    }}
                >
                    {t('error.boundary.retry')}
                </Button>
                <Button type="button" size="sm" variant="ghost" asChild>
                    <Link href="/">{t('error.boundary.home')}</Link>
                </Button>
            </div>
        </div>
    );
}
