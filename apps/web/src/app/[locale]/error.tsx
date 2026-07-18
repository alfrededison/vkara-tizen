'use client';

import { useErrorBoundaryRecovery } from '@/hooks/use-error-boundary-recovery';
import { RecoveryShell } from '@/components/sentry/recovery-shell';
import { useI18n } from '@/locales/client';

/**
 * Segment error boundary — reports to Sentry, then auto-recovers silently.
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

    const label =
        phase === 'redirecting'
            ? t('error.boundary.redirecting')
            : phase === 'retrying'
              ? t('error.boundary.retrying')
              : t('error.boundary.reporting');

    return <RecoveryShell phase={phase} label={label} />;
}
