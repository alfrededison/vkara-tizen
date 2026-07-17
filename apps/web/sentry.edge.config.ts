import * as Sentry from '@sentry/nextjs';

import { isSentryEnabled, resolveSentryTracesSampleRate } from '@vkara/env/sentry';

const dsn = process.env.SENTRY_DSN ?? process.env.NEXT_PUBLIC_SENTRY_DSN;
const nodeEnv = process.env.NODE_ENV;

Sentry.init({
    dsn,
    enabled: isSentryEnabled(dsn, process.env.SENTRY_ENABLED),
    environment: process.env.SENTRY_ENVIRONMENT ?? nodeEnv ?? 'development',
    release: process.env.SENTRY_RELEASE,
    sendDefaultPii: true,
    tracesSampleRate: resolveSentryTracesSampleRate(process.env.SENTRY_TRACES_SAMPLE_RATE, nodeEnv),
    enableLogs: true,
});
