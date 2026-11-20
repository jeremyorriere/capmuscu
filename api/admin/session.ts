import {
  adminSessionCookie,
  clearAdminSessionCookie,
  clearLoginAttempts,
  createAdminSessionToken,
  isAdminSession,
  loginAttemptPrefix,
  passwordMatches,
} from '../../src/lib/server/admin-auth.js';
import { hasPrivateBlobConfiguration, isSameOrigin, jsonResponse, type ServerEnv } from '../../src/lib/server/analytics.js';
import { readJsonBody } from '../../src/lib/server/read-body.js';
import { deletePrivateBlobs, listPrivateBlobs, writePrivateJson } from '../../src/lib/server/storage.js';

const MAX_ATTEMPTS = 5;
const WINDOW_MS = 15 * 60 * 1000;

function configured(env: ServerEnv): boolean {
  return hasPrivateBlobConfiguration(env)
    && !!env.ADMIN_PASSWORD && env.ADMIN_PASSWORD.length >= 16
    && !!env.ADMIN_AUTH_SECRET && env.ADMIN_AUTH_SECRET.length >= 32;
}

async function handler(request: Request): Promise<Response> {
  const env = process.env as ServerEnv;
  if (request.method === 'GET') {
    return jsonResponse(200, {
      authenticated: !!env.ADMIN_AUTH_SECRET && await isAdminSession(request, env.ADMIN_AUTH_SECRET),
    });
  }

  if (request.method === 'DELETE') {
    if (!isSameOrigin(request)) return jsonResponse(403, { error: 'Requête refusée.' });
    return new Response(JSON.stringify({ authenticated: false }), {
      status: 200,
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
        'Cache-Control': 'no-store',
        'Set-Cookie': clearAdminSessionCookie(),
      },
    });
  }
  if (request.method !== 'POST') return jsonResponse(405, { error: 'Méthode non autorisée.' });
  if (!isSameOrigin(request)) return jsonResponse(403, { error: 'Requête refusée.' });
  if (request.headers.get('Content-Type')?.split(';', 1)[0]?.trim().toLowerCase() !== 'application/json') {
    return jsonResponse(415, { error: 'Format de requête invalide.' });
  }
  if (!configured(env)) return jsonResponse(503, { error: 'Connexion admin momentanément indisponible.' });

  const body = await readJsonBody(request);
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return jsonResponse(400, { error: 'Identifiants invalides.' });
  }
  const password = (body as { password?: unknown }).password;
  if (typeof password !== 'string' || password.length > 1024) {
    return jsonResponse(400, { error: 'Identifiants invalides.' });
  }

  try {
    const prefix = await loginAttemptPrefix(request, env.ADMIN_AUTH_SECRET!);
    const attempts = await listPrivateBlobs(prefix, 100);
    const recent = attempts.filter((blob) => Date.now() - blob.uploadedAt.getTime() < WINDOW_MS);
    await deletePrivateBlobs(attempts.filter((blob) => Date.now() - blob.uploadedAt.getTime() >= WINDOW_MS));
    if (recent.length >= MAX_ATTEMPTS) {
      const oldest = Math.min(...recent.map((blob) => blob.uploadedAt.getTime()));
      const retryAfter = Math.max(1, Math.ceil((oldest + WINDOW_MS - Date.now()) / 1000));
      return new Response(JSON.stringify({ error: 'Trop de tentatives. Réessayez dans quelques minutes.' }), {
        status: 429,
        headers: {
          'Content-Type': 'application/json; charset=utf-8',
          'Cache-Control': 'no-store',
          'Retry-After': String(retryAfter),
        },
      });
    }

    if (!(await passwordMatches(password, env.ADMIN_PASSWORD!))) {
      await writePrivateJson(`${prefix}${crypto.randomUUID()}.json`, { attemptedAt: new Date().toISOString() }, { ttlDays: 1 });
      return jsonResponse(401, { error: 'Mot de passe incorrect.' });
    }

    await clearLoginAttempts(request, env.ADMIN_AUTH_SECRET!);
    const token = await createAdminSessionToken(env.ADMIN_AUTH_SECRET!);
    return new Response(JSON.stringify({ authenticated: true }), {
      status: 200,
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
        'Cache-Control': 'no-store',
        'Set-Cookie': adminSessionCookie(token),
      },
    });
  } catch (error) {
    console.error('CapMuscu: private admin session file operation failed.', error instanceof Error ? error.message : 'unknown');
    return jsonResponse(503, { error: 'Connexion admin momentanément indisponible.' });
  }
}

export const GET = handler;
export const POST = handler;
export const DELETE = handler;
