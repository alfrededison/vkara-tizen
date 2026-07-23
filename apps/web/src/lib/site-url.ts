import { env } from '@/env';

/** Canonical site URL for metadata, manifest, and Open Graph. */
export function getSiteUrl(): URL {
    const fromEnv = env.NEXT_PUBLIC_APP_URL?.trim();
    if (fromEnv) {
        return new URL(fromEnv.endsWith('/') ? fromEnv : `${fromEnv}/`);
    }

    // VERCEL_URL is a server-only key; t3-env throws if a client component
    // ever reaches this fallback, so only consult it on the server.
    const vercel = typeof window === 'undefined' ? env.VERCEL_URL?.trim() : undefined;
    if (vercel) {
        return new URL(`https://${vercel}/`);
    }

    return new URL('http://localhost:3000/');
}
