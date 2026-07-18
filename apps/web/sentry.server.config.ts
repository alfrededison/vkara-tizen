import * as Sentry from '@sentry/nextjs';

import {
    isSentryEnabled,
    readSentryEnvironmentFromProcess,
    resolveSentryTracesSampleRate,
} from '@vkara/env/sentry';

const dsn = process.env.SENTRY_DSN ?? process.env.NEXT_PUBLIC_SENTRY_DSN;
const sentryEnvironment = readSentryEnvironmentFromProcess();

Sentry.init({
    dsn,
    enabled: isSentryEnabled(dsn, process.env.SENTRY_ENABLED),
    environment: sentryEnvironment,
    release: process.env.SENTRY_RELEASE,
    sendDefaultPii: true,
    tracesSampleRate: resolveSentryTracesSampleRate(
        process.env.SENTRY_TRACES_SAMPLE_RATE,
        sentryEnvironment,
    ),
    includeLocalVariables: true,
    enableLogs: true,
});

if (isSentryEnabled(dsn, process.env.SENTRY_ENABLED)) {
    Sentry.setTag('service', 'vkara-web');
    Sentry.setTag('deploy', process.env.VERCEL_ENV ? 'vercel' : 'local');
}
