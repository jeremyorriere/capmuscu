export interface ServerEnv {
  ANALYTICS_HASH_SECRET?: string;
  ADMIN_AUTH_SECRET?: string;
  ADMIN_PASSWORD?: string;
  BLOB_STORE_ID?: string;
  BLOB_READ_WRITE_TOKEN?: string;
  VERCEL_OIDC_TOKEN?: string;
}

export const jsonResponse = (status: number, body: unknown): Response =>
  new Response(JSON.stringify(body), {
    status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store',
      'X-Content-Type-Options': 'nosniff',
    },
  });

export function isSameOrigin(request: Request): boolean {
  const origin = request.headers.get('Origin');
  return !origin || origin === new URL(request.url).origin;
}

export function validVisitorId(value: unknown): value is string {
  return typeof value === 'string' && /^[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}$/i.test(value);
}

export async function hashVisitorId(value: string, secret: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const digest = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(value.toLowerCase()));
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, '0')).join('');
}

export function hasPrivateBlobConfiguration(env: ServerEnv): boolean {
  return !!((env.VERCEL_OIDC_TOKEN && env.BLOB_STORE_ID) || env.BLOB_READ_WRITE_TOKEN);
}
