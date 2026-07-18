'use client';

import { useEffect, useRef, useState } from 'react';
import * as Sentry from '@sentry/nextjs';

const STORAGE_KEY = 'vkara_error_recovery';
const AUTO_RESET_MS = 1200;
const HARD_RECOVER_MS = 2800;
const MAX_SOFT_RESETS = 2;

type RecoveryBucket = {
    fingerprint: string;
    attempts: number;
    lastAt: number;
};

function fingerprintError(error: Error & { digest?: string }): string {
    return error.digest || `${error.name}:${error.message}`.slice(0, 160);
}

function readBucket(fingerprint: string): RecoveryBucket {
    if (typeof window === 'undefined') {
        return { fingerprint, attempts: 0, lastAt: 0 };
    }
    try {
        const raw = sessionStorage.getItem(STORAGE_KEY);
        if (!raw) {
            return { fingerprint, attempts: 0, lastAt: 0 };
        }
        const parsed = JSON.parse(raw) as RecoveryBucket;
        // Reset counter if this is a different error or stale (>5 min).
        if (
            parsed.fingerprint !== fingerprint ||
            Date.now() - parsed.lastAt > 5 * 60 * 1000
        ) {
            return { fingerprint, attempts: 0, lastAt: 0 };
        }
        return parsed;
    } catch {
        return { fingerprint, attempts: 0, lastAt: 0 };
    }
}

function writeBucket(bucket: RecoveryBucket): void {
    if (typeof window === 'undefined') return;
    try {
        sessionStorage.setItem(STORAGE_KEY, JSON.stringify(bucket));
    } catch {
        /* storage disabled */
    }
}

function clearBucket(): void {
    if (typeof window === 'undefined') return;
    try {
        sessionStorage.removeItem(STORAGE_KEY);
    } catch {
        /* storage disabled */
    }
}

export type ErrorRecoveryPhase = 'reporting' | 'retrying' | 'redirecting';

/**
 * Self-heal Next.js error boundaries:
 * 1. Report to Sentry once per error instance
 * 2. Soft `reset()` a few times automatically (no click)
 * 3. If the segment keeps crashing, hard-navigate home / reload
 */
export function useErrorBoundaryRecovery(
    error: Error & { digest?: string },
    reset?: () => void,
    options?: {
        /** Absolute path for hard recovery (default `/`). */
        homeHref?: string;
    },
): ErrorRecoveryPhase {
    const homeHref = options?.homeHref ?? '/';
    const reportedRef = useRef<string | null>(null);
    const [phase, setPhase] = useState<ErrorRecoveryPhase>('reporting');

    useEffect(() => {
        const fingerprint = fingerprintError(error);

        if (reportedRef.current !== fingerprint) {
            reportedRef.current = fingerprint;
            Sentry.captureException(error, {
                tags: {
                    error_boundary: 'auto_recovery',
                    recovery_fingerprint: fingerprint.slice(0, 64),
                },
            });
        }

        const bucket = readBucket(fingerprint);
        const nextAttempts = bucket.attempts + 1;
        writeBucket({ fingerprint, attempts: nextAttempts, lastAt: Date.now() });

        // Too many soft resets for the same error → leave the broken segment.
        if (nextAttempts > MAX_SOFT_RESETS || typeof reset !== 'function') {
            setPhase('redirecting');
            const hardTimer = window.setTimeout(() => {
                clearBucket();
                // Full navigation clears React tree state that soft reset cannot.
                window.location.replace(homeHref);
            }, HARD_RECOVER_MS);
            return () => window.clearTimeout(hardTimer);
        }

        setPhase('retrying');
        const softTimer = window.setTimeout(() => {
            try {
                reset();
            } catch (resetError) {
                Sentry.captureException(resetError, {
                    tags: { error_boundary: 'reset_failed' },
                });
                clearBucket();
                window.location.replace(homeHref);
            }
        }, AUTO_RESET_MS);

        return () => window.clearTimeout(softTimer);
    }, [error, reset, homeHref]);

    return phase;
}

/** Call after a successful interactive session so a later unrelated crash starts fresh. */
export function clearErrorRecoveryState(): void {
    clearBucket();
}
