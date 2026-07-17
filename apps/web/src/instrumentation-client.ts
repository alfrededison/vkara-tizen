import * as Sentry from '@sentry/nextjs';

import {
    isSentryEnabled,
    resolveSentryReplaysOnErrorSampleRate,
    resolveSentryReplaysSessionSampleRate,
    resolveSentryTracesSampleRate,
} from '@vkara/env/sentry';

const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN;
const nodeEnv = process.env.NODE_ENV;

Sentry.init({
    dsn,
    enabled: isSentryEnabled(dsn, process.env.SENTRY_ENABLED),
    environment:
        process.env.NEXT_PUBLIC_SENTRY_ENVIRONMENT ??
        process.env.SENTRY_ENVIRONMENT ??
        nodeEnv ??
        'development',
    release: process.env.SENTRY_RELEASE,
    sendDefaultPii: true,
    tracesSampleRate: resolveSentryTracesSampleRate(
        process.env.NEXT_PUBLIC_SENTRY_TRACES_SAMPLE_RATE ?? process.env.SENTRY_TRACES_SAMPLE_RATE,
        nodeEnv,
    ),
    replaysSessionSampleRate: resolveSentryReplaysSessionSampleRate(
        process.env.NEXT_PUBLIC_SENTRY_REPLAYS_SESSION_SAMPLE_RATE,
    ),
    replaysOnErrorSampleRate: resolveSentryReplaysOnErrorSampleRate(
        process.env.NEXT_PUBLIC_SENTRY_REPLAYS_ON_ERROR_SAMPLE_RATE,
    ),
    enableLogs: true,
    // Propagate traces to the vkara API (distributed tracing web → api).
    tracePropagationTargets: [
        'localhost',
        /^https?:\/\/[^/]*vkara/i,
        process.env.NEXT_PUBLIC_API_URL,
        process.env.NEXT_PUBLIC_APP_URL,
    ].filter((value): value is string | RegExp => Boolean(value)),
    integrations: [Sentry.replayIntegration()],
});

export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;
