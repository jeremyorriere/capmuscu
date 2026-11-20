import { hashVisitorId } from './analytics';
import { deletePrivateBlobs, listPrivateBlobs } from './storage';

const SESSION_COOKIE = '__Host-capmuscu-admin';
export const SESSION_MAX_AGE_SECONDS = 8 * 60 * 60;

interface SessionPayload {
  expiresAt: number;
  nonce: string;
}

function base64UrlEncode(value: Uint8Array): string {
  let binary = '';
  for (const byte of value) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
}

function base64UrlDecode(value: string): Uint8Array {
  const base64 = value.replace(/-/g, '+').replace(/_/g, '/');
  const binary = atob(base64 + '='.repeat((4 - base64.length % 4) % 4));
  return Uint8Array.from(binary, (char) => char.charCodeAt(0));
}

async function signingKey(secret: string): Promise<CryptoKey> {
  return crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign', 'verify'],
  );
}

export async function createAdminSessionToken(secret: string, now = Date.now()): Promise<string> {
  const payload: SessionPayload = {
    expiresAt: Math.floor(now / 1000) + SESSION_MAX_AGE_SECONDS,
    nonce: crypto.randomUUID(),
  };
  const encoded = base64UrlEncode(new TextEncoder().encode(JSON.stringify(payload)));
  const signature = await crypto.subtle.sign('HMAC', await signingKey(secret), new TextEncoder().encode(encoded));
  return `${encoded}.${base64UrlEncode(new Uint8Array(signature))}`;
}

export function adminSessionCookie(token: string): string {
  return `${SESSION_COOKIE}=${token}; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=${SESSION_MAX_AGE_SECONDS}`;
}

export function clearAdminSessionCookie(): string {
  return `${SESSION_COOKIE}=; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=0`;
}

function cookieValue(request: Request): string | null {
  const cookies = request.headers.get('Cookie')?.split(';') ?? [];
  for (const cookie of cookies) {
    const [name, ...parts] = cookie.trim().split('=');
    if (name === SESSION_COOKIE) return parts.join('=');
  }
  return null;
}

export async function isAdminSession(request: Request, secret: string): Promise<boolean> {
  const token = cookieValue(request);
  if (!token || token.length > 1024) return false;
  const [encoded, signature, extra] = token.split('.');
  if (!encoded || !signature || extra !== undefined) return false;

  try {
    const payload = JSON.parse(new TextDecoder().decode(base64UrlDecode(encoded))) as Partial<SessionPayload>;
    if (!Number.isSafeInteger(payload.expiresAt) || (payload.expiresAt ?? 0) <= Date.now() / 1000) return false;
    if (typeof payload.nonce !== 'string' || !/^[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}$/i.test(payload.nonce)) return false;
    const signatureBytes = base64UrlDecode(signature);
    const signatureBuffer = new ArrayBuffer(signatureBytes.byteLength);
    new Uint8Array(signatureBuffer).set(signatureBytes);
    return crypto.subtle.verify(
      'HMAC',
      await signingKey(secret),
      signatureBuffer,
      new TextEncoder().encode(encoded),
    );
  } catch {
    return false;
  }
}

export async function passwordMatches(password: string, expected: string): Promise<boolean> {
  const [actualHash, expectedHash] = await Promise.all([
    crypto.subtle.digest('SHA-256', new TextEncoder().encode(password)),
    crypto.subtle.digest('SHA-256', new TextEncoder().encode(expected)),
  ]);
  const actual = new Uint8Array(actualHash);
  const target = new Uint8Array(expectedHash);
  let difference = 0;
  for (let index = 0; index < actual.length; index += 1) difference |= actual[index]! ^ target[index]!;
  return difference === 0;
}

export async function loginAttemptPrefix(request: Request, secret: string): Promise<string> {
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown';
  return `admin/login-attempts/${await hashVisitorId(`login:${ip}`, secret)}/`;
}

export async function clearLoginAttempts(request: Request, secret: string): Promise<void> {
  await deletePrivateBlobs(await listPrivateBlobs(await loginAttemptPrefix(request, secret), 100));
}
