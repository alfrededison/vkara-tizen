import { describe, expect, it } from 'vitest';

import {
    isSentryEnabled,
    resolveSentryLogLevels,
    resolveSentryReplaysOnErrorSampleRate,
    resolveSentryReplaysSessionSampleRate,
    resolveSentryTracesSampleRate,
} from '../src/sentry';

describe('resolveSentryTracesSampleRate', () => {
    it('defaults to 1 in development and 0.1 otherwise', () => {
        expect(resolveSentryTracesSampleRate(undefined, 'development')).toBe(1);
        expect(resolveSentryTracesSampleRate(undefined, 'production')).toBe(0.1);
        expect(resolveSentryTracesSampleRate(undefined, undefined)).toBe(0.1);
    });

    it('honors an explicit rate in range', () => {
        expect(resolveSentryTracesSampleRate('0.25', 'production')).toBe(0.25);
        expect(resolveSentryTracesSampleRate('1', 'production')).toBe(1);
        expect(resolveSentryTracesSampleRate('0', 'development')).toBe(0);
    });

    it('falls back when the raw value is invalid', () => {
        expect(resolveSentryTracesSampleRate('nope', 'development')).toBe(1);
        expect(resolveSentryTracesSampleRate('2', 'production')).toBe(0.1);
    });
});

describe('replay sample rates', () => {
    it('uses production-friendly defaults', () => {
        expect(resolveSentryReplaysSessionSampleRate(undefined)).toBe(0.1);
        expect(resolveSentryReplaysOnErrorSampleRate(undefined)).toBe(1);
    });
});

describe('isSentryEnabled', () => {
    it('requires a DSN', () => {
        expect(isSentryEnabled(undefined)).toBe(false);
        expect(isSentryEnabled('')).toBe(false);
        expect(
            isSentryEnabled(
                'https://9486059e287181cacf72326c9bac8a43@o4511749689901056.ingest.us.sentry.io/4511749707792384',
            ),
        ).toBe(true);
    });

    it('allows explicit opt-out', () => {
        expect(
            isSentryEnabled(
                'https://9486059e287181cacf72326c9bac8a43@o4511749689901056.ingest.us.sentry.io/4511749707792384',
                'false',
            ),
        ).toBe(false);
    });
});

describe('resolveSentryLogLevels', () => {
    it('defaults to volume-safe production levels', () => {
        expect(resolveSentryLogLevels(undefined, 'production')).toEqual(['warn', 'error']);
        expect(resolveSentryLogLevels(undefined, 'development')).toEqual(['info', 'warn', 'error']);
    });

    it('parses an explicit allow-list', () => {
        expect(resolveSentryLogLevels('error, warn, nope', 'production')).toEqual(['error', 'warn']);
    });
});
