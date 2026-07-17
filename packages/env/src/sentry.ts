import { createEnv } from '@t3-oss/env-core';
import { z } from 'zod';

import { envSkipValidation, parseEnvFlagValue } from './base';

/**
 * Resolve traces sample rate for Sentry.
 * Explicit `SENTRY_TRACES_SAMPLE_RATE` wins; otherwise 1.0 in development, 0.1 in production.
 */
export function resolveSentryTracesSampleRate(
    raw: string | undefined,
    nodeEnv: string | undefined,
): number {
    const trimmed = raw?.trim();
    if (trimmed) {
        const parsed = Number(trimmed);
        if (Number.isFinite(parsed) && parsed >= 0 && parsed <= 1) {
            return parsed;
        }
    }
    return nodeEnv === 'development' ? 1 : 0.1;
}

/** Session Replay: fraction of all sessions (client only). Default 0.1. */
export function resolveSentryReplaysSessionSampleRate(raw: string | undefined): number {
    const trimmed = raw?.trim();
    if (trimmed) {
        const parsed = Number(trimmed);
        if (Number.isFinite(parsed) && parsed >= 0 && parsed <= 1) {
            return parsed;
        }
    }
    return 0.1;
}

/** Session Replay: fraction of sessions with an error (client only). Default 1.0. */
export function resolveSentryReplaysOnErrorSampleRate(raw: string | undefined): number {
    const trimmed = raw?.trim();
    if (trimmed) {
        const parsed = Number(trimmed);
        if (Number.isFinite(parsed) && parsed >= 0 && parsed <= 1) {
            return parsed;
        }
    }
    return 1;
}

export function isSentryEnabled(dsn: string | undefined, enabledFlag?: string): boolean {
    if (!dsn?.trim()) {
        return false;
    }
    // Explicit disable via SENTRY_ENABLED=false|0|off
    if (enabledFlag !== undefined && enabledFlag !== '') {
        return parseEnvFlagValue(enabledFlag, true);
    }
    return true;
}

const SENTRY_LOG_SEVERITY_LEVELS = ['trace', 'debug', 'info', 'warn', 'error', 'fatal'] as const;
export type SentryLogSeverityLevel = (typeof SENTRY_LOG_SEVERITY_LEVELS)[number];

/**
 * Which Winston→Sentry log severities to forward.
 * Explicit `SENTRY_LOG_LEVELS` (comma-separated) wins; otherwise:
 * - development: info,warn,error
 * - production: warn,error (volume-safe default)
 */
export function resolveSentryLogLevels(
    raw: string | undefined,
    nodeEnv: string | undefined,
): SentryLogSeverityLevel[] {
    const trimmed = raw?.trim();
    if (trimmed) {
        const parsed = trimmed
            .split(',')
            .map((part) => part.trim().toLowerCase())
            .filter((part): part is SentryLogSeverityLevel =>
                (SENTRY_LOG_SEVERITY_LEVELS as readonly string[]).includes(part),
            );
        if (parsed.length > 0) {
            return [...new Set(parsed)];
        }
    }
    return nodeEnv === 'development' ? ['info', 'warn', 'error'] : ['warn', 'error'];
}

/** Shared server-side Sentry vars (API + Next.js server/edge). */
export function sentryServerEnv() {
    return createEnv({
        server: {
            SENTRY_DSN: z.string().url().optional(),
            SENTRY_ENVIRONMENT: z.string().min(1).optional(),
            SENTRY_RELEASE: z.string().min(1).optional(),
            SENTRY_TRACES_SAMPLE_RATE: z.string().optional(),
            /** Comma-separated: trace,debug,info,warn,error,fatal */
            SENTRY_LOG_LEVELS: z.string().optional(),
            /** Opt-out switch; unset + DSN = enabled. */
            SENTRY_ENABLED: z.string().optional(),
            /** Temporary verify route (`/debug-sentry`). Never enable in public prod long-term. */
            SENTRY_VERIFY: z.string().optional(),
        },
        runtimeEnv: {
            SENTRY_DSN: process.env.SENTRY_DSN,
            SENTRY_ENVIRONMENT: process.env.SENTRY_ENVIRONMENT,
            SENTRY_RELEASE: process.env.SENTRY_RELEASE,
            SENTRY_TRACES_SAMPLE_RATE: process.env.SENTRY_TRACES_SAMPLE_RATE,
            SENTRY_LOG_LEVELS: process.env.SENTRY_LOG_LEVELS,
            SENTRY_ENABLED: process.env.SENTRY_ENABLED,
            SENTRY_VERIFY: process.env.SENTRY_VERIFY,
        },
        emptyStringAsUndefined: true,
        skipValidation: envSkipValidation(),
    });
}
