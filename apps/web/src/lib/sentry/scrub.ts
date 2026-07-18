import type { ErrorEvent, EventHint } from '@sentry/nextjs';

/** Keys that must never leave the browser / Next server as event attributes. */
const REDACT_KEY =
    /pass(word|wd)?|secret|token|authorization|cookie|api[_-]?key|private[_-]?key|rejoin/i;

function redactRecord(record: Record<string, unknown> | undefined): void {
    if (!record) return;
    for (const key of Object.keys(record)) {
        if (REDACT_KEY.test(key)) {
            record[key] = '[Redacted]';
        }
    }
}

/**
 * Strip secrets from Sentry events while keeping useful debugging context.
 * Used by client / server / edge inits (`sendDefaultPii` stays on for IP + UA).
 */
export function scrubSentryEvent(event: ErrorEvent, _hint?: EventHint): ErrorEvent | null {
    if (event.request?.headers) {
        redactRecord(event.request.headers as Record<string, unknown>);
    }
    if (event.request?.cookies) {
        event.request.cookies = { '[Redacted]': '[Redacted]' };
    }
    if (event.request?.data && typeof event.request.data === 'object') {
        redactRecord(event.request.data as Record<string, unknown>);
    }
    if (event.extra) {
        redactRecord(event.extra as Record<string, unknown>);
    }
    if (event.contexts) {
        for (const ctx of Object.values(event.contexts)) {
            if (ctx && typeof ctx === 'object') {
                redactRecord(ctx as Record<string, unknown>);
            }
        }
    }

    return event;
}

/** Browser noise that is almost never actionable for vkara. */
export const SENTRY_IGNORE_ERRORS: Array<string | RegExp> = [
    'ResizeObserver loop limit exceeded',
    'ResizeObserver loop completed with undelivered notifications',
    'Non-Error promise rejection captured',
    /^AbortError/i,
    /Loading chunk [\d]+ failed/i,
    /ChunkLoadError/i,
];

export const SENTRY_DENY_URLS: Array<string | RegExp> = [
    /extensions\//i,
    /^chrome(?:-extension)?:\/\//i,
    /^moz-extension:\/\//i,
];
