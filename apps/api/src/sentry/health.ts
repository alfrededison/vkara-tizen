import type { Redis } from 'ioredis';

export type ServiceHealth = {
    status: 'ok' | 'degraded';
    timestamp: number;
    uptime: number;
    checks: {
        redis: 'up' | 'down';
    };
    runtime: {
        wsConnections: number;
        memory: NodeJS.MemoryUsage;
        cpu: NodeJS.CpuUsage;
    };
};

/**
 * Lightweight readiness snapshot for operators / load balancers.
 * Keeps `/health` cheap: one Redis PING + process stats (no queue scans).
 */
export async function getServiceHealth(input: {
    redis: Redis;
    wsConnections: number;
}): Promise<ServiceHealth> {
    let redisStatus: 'up' | 'down' = 'down';
    try {
        redisStatus = (await input.redis.ping()) === 'PONG' ? 'up' : 'down';
    } catch {
        redisStatus = 'down';
    }

    return {
        status: redisStatus === 'up' ? 'ok' : 'degraded',
        timestamp: Date.now(),
        uptime: process.uptime(),
        checks: { redis: redisStatus },
        runtime: {
            wsConnections: input.wsConnections,
            memory: process.memoryUsage(),
            cpu: process.cpuUsage(),
        },
    };
}
