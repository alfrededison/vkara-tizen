import * as Sentry from '@sentry/nextjs';

import {
    isSentryEnabled,
    readSentryEnvironmentFromProcess,
    resolveSentryReplaysOnErrorSampleRate,
    resolveSentryReplaysSessionSampleRate,
    resolveSentryTracesSampleRate,
} from '@vkara/env/sentry';

const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN;
const sentryEnvironment = readSentryEnvironmentFromProcess({
    preferPublic: true,
    runtimeHost: typeof window !== 'undefined' ? window.location.hostname : undefined,
});

Sentry.init({
    dsn,
    enabled: isSentryEnabled(dsn, process.env.SENTRY_ENABLED),
    environment: sentryEnvironment,
    release: process.env.SENTRY_RELEASE,
    sendDefaultPii: true,
    tracesSampleRate: resolveSentryTracesSampleRate(
        process.env.NEXT_PUBLIC_SENTRY_TRACES_SAMPLE_RATE ?? process.env.SENTRY_TRACES_SAMPLE_RATE,
        sentryEnvironment,
    ),
    replaysSessionSampleRate: resolveSentryReplaysSessionSampleRate(
        process.env.NEXT_PUBLIC_SENTRY_REPLAYS_SESSION_SAMPLE_RATE,
        sentryEnvironment,
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

if (isSentryEnabled(dsn, process.env.SENTRY_ENABLED)) {
    Sentry.setTag('service', 'vkara-web');
    Sentry.setTag('deploy', process.env.VERCEL_ENV ? 'vercel' : 'local');
}

export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;
