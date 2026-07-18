'use client';

import * as Sentry from '@sentry/nextjs';

import { useErrorBoundaryRecovery } from '@/hooks/use-error-boundary-recovery';

/**
 * Root layout crash boundary. Must render its own <html>/<body>.
 * Auto-reports to Sentry and hard-navigates home — never leave the user stuck.
 */
export default function GlobalError({
    error,
    reset,
}: {
    error: Error & { digest?: string };
    reset?: () => void;
}) {
    const phase = useErrorBoundaryRecovery(error, reset, { homeHref: '/' });

    const status =
        phase === 'redirecting'
            ? 'Taking you back…'
            : phase === 'retrying'
              ? 'Recovering…'
              : 'Reporting the issue…';

    return (
        <html lang="en">
            <body
                style={{
                    margin: 0,
                    minHeight: '100vh',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontFamily:
                        'ui-sans-serif, system-ui, -apple-system, Segoe UI, sans-serif',
                    background: '#0a0a0f',
                    color: '#e8e8ed',
                }}
            >
                <div
                    role="status"
                    aria-live="polite"
                    style={{ textAlign: 'center', padding: 24, maxWidth: 360 }}
                >
                    <div
                        aria-hidden
                        style={{
                            width: 20,
                            height: 20,
                            margin: '0 auto 12px',
                            borderRadius: '999px',
                            border: '2px solid rgba(232,232,237,0.25)',
                            borderTopColor: '#e8e8ed',
                            animation: 'vkara-spin 0.8s linear infinite',
                        }}
                    />
                    <p style={{ margin: 0, fontSize: 14, opacity: 0.85 }}>{status}</p>
                    {error.digest ? (
                        <p
                            style={{
                                margin: '8px 0 0',
                                fontSize: 11,
                                fontFamily: 'ui-monospace, monospace',
                                opacity: 0.5,
                            }}
                        >
                            Ref {error.digest}
                        </p>
                    ) : null}
                    <button
                        type="button"
                        onClick={() => {
                            Sentry.addBreadcrumb({
                                category: 'error_boundary',
                                message: 'manual_home',
                                level: 'info',
                            });
                            window.location.replace('/');
                        }}
                        style={{
                            marginTop: 20,
                            border: 'none',
                            background: 'transparent',
                            color: '#a8a8b3',
                            fontSize: 13,
                            cursor: 'pointer',
                            textDecoration: 'underline',
                        }}
                    >
                        Go home now
                    </button>
                </div>
                <style>{`@keyframes vkara-spin{to{transform:rotate(360deg)}}`}</style>
            </body>
        </html>
    );
}
