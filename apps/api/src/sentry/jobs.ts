import type { Redis } from 'ioredis';
import type { Worker } from 'bullmq';
import * as Sentry from '@sentry/elysia';
import { isSentryCronMonitorAllowed } from '@vkara/env/sentry';

import { createContextLogger } from '@/utils/logger';

import { captureUnexpected } from './capture';

const redisLogger = createContextLogger('Redis');

const watchedRedis = new WeakSet<object>();

/**
 * Attach a one-shot Redis `error` listener that logs + opens a Sentry Issue.
 * Idempotent per client instance.
 */
export function watchRedisClient(client: Redis, name: string): Redis {
    if (watchedRedis.has(client)) {
        return client;
    }
    watchedRedis.add(client);

    client.on('error', (error: Error) => {
        redisLogger.error('Redis client error', { error, redis_client: name });
        captureUnexpected(error, {
            tags: { area: 'redis', redis_client: name },
        });
    });

    return client;
}

export type CronMonitorConfig = {
    /** Sentry monitor slug (stable id in the Crons UI). */
    slug: string;
    /** Crontab schedule matching the BullMQ repeat pattern. */
    crontab: string;
    /** Minutes of grace before a missed check-in alerts. */
    checkinMarginMinutes?: number;
    /** Minutes before a long-running job is marked timed out. */
    maxRuntimeMinutes?: number;
    timezone?: string;
};

/**
 * Wrap a BullMQ processor with Sentry Cron check-ins (`withMonitor`).
 *
 * Skips upsert/check-in when the slug is not in `SENTRY_CRON_MONITORS`
 * (Developer plan = 1 active cron monitor; extras stay disabled forever).
 */
export function withCronMonitor<T>(
    config: CronMonitorConfig,
    work: () => Promise<T>,
): Promise<T> {
    if (
        !Sentry.isInitialized() ||
        !Sentry.isEnabled() ||
        !isSentryCronMonitorAllowed(config.slug)
    ) {
        return work();
    }

    return Sentry.withMonitor(config.slug, work, {
        schedule: { type: 'crontab', value: config.crontab },
        checkinMargin: config.checkinMarginMinutes ?? 5,
        maxRuntime: config.maxRuntimeMinutes ?? 15,
        timezone: config.timezone ?? 'UTC',
        failureIssueThreshold: 1,
        recoveryThreshold: 1,
    });
}

/**
 * Open a Sentry Issue when a BullMQ worker permanently fails a job.
 */
export function attachWorkerFailureCapture(
    worker: Worker,
    tags: { queue: string; area?: string },
): void {
    worker.on('failed', (job, error) => {
        captureUnexpected(error, {
            tags: {
                area: tags.area ?? 'queue',
                queue: tags.queue,
                ...(job?.name ? { job_name: job.name } : {}),
            },
            extras: {
                jobId: job?.id,
                attemptsMade: job?.attemptsMade,
            },
        });
    });
}
