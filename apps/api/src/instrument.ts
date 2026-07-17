/**
 * Sentry must initialize before any other application modules.
 * Loaded via `import './instrument'` (compiled binary).
 */
import * as Sentry from '@sentry/elysia';

import {
    isSentryEnabled,
    resolveSentryTracesSampleRate,
} from '@vkara/env/sentry';

const dsn = process.env.SENTRY_DSN;
const nodeEnv = process.env.NODE_ENV;
const enabled = isSentryEnabled(dsn, process.env.SENTRY_ENABLED);
const isProduction = nodeEnv === 'production';

/** Keys that must never leave the process as log attributes. */
const REDACT_ATTR_KEY =
    /pass(word|wd)?|secret|token|authorization|cookie|api[_-]?key|private[_-]?key|redis_password/i;

Sentry.init({
    dsn,
    enabled,
    environment: process.env.SENTRY_ENVIRONMENT ?? nodeEnv ?? 'development',
    release: process.env.SENTRY_RELEASE,
    sendDefaultPii: true,
    tracesSampleRate: resolveSentryTracesSampleRate(process.env.SENTRY_TRACES_SAMPLE_RATE, nodeEnv),
    enableLogs: true,
    beforeSendLog: (log) => {
        // Belt-and-suspenders with Winston transport levels — never ship debug/trace from prod.
        if (isProduction && (log.level === 'debug' || log.level === 'trace')) {
            return null;
        }

        if (log.attributes) {
            for (const key of Object.keys(log.attributes)) {
                if (REDACT_ATTR_KEY.test(key)) {
                    log.attributes[key] = '[Redacted]';
                }
            }
        }

        return log;
    },
});

if (enabled) {
    Sentry.getGlobalScope().setAttributes({
        'service.name': 'vkara-api',
        'service.component': 'api',
    });
}
