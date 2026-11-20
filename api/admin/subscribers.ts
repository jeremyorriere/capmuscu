import { del } from '@vercel/blob';
import { isAdminSession } from '../../src/lib/server/admin-auth.js';
import { isSameOrigin, jsonResponse, type ServerEnv } from '../../src/lib/server/analytics.js';
import { readJsonBody } from '../../src/lib/server/read-body.js';
import { listPrivateBlobs, readPrivateJson } from '../../src/lib/server/storage.js';

interface Subscriber {
  email: string;
  createdAt: string;
  updatedAt: string;
  newsletterConsent: true;
  accountUpdatesConsent: boolean;
  consentAt: string;
}

async function handler(request: Request): Promise<Response> {
  const env = process.env as ServerEnv;
  if (!env.ADMIN_AUTH_SECRET || !(await isAdminSession(request, env.ADMIN_AUTH_SECRET))) {
    return jsonResponse(401, { error: 'Accès admin requis.' });
  }

  if (request.method === 'DELETE') {
    if (!isSameOrigin(request)) return jsonResponse(403, { error: 'Requête refusée.' });
    const body = await readJsonBody(request);
    const id = body && typeof body === 'object' ? (body as { id?: unknown }).id : null;
    if (typeof id !== 'string' || !/^[a-f0-9]{64}$/.test(id)) return jsonResponse(400, { error: 'Inscription invalide.' });
    try {
      const pathname = `newsletter/subscribers/${id}.json`;
      const match = (await listPrivateBlobs('newsletter/subscribers/', 5000))
        .find((candidate) => candidate.pathname === pathname);
      if (match) await del(match.url);
      return jsonResponse(200, { deleted: true });
    } catch {
      console.error('CapMuscu: private subscriber deletion failed.');
      return jsonResponse(503, { error: 'Suppression momentanément indisponible.' });
    }
  }

  if (request.method !== 'GET') return jsonResponse(405, { error: 'Méthode non autorisée.' });

  try {
    const blobs = await listPrivateBlobs('newsletter/subscribers/', 5000);
    const subscribers: {
      id: string;
      email: string;
      createdAt: string;
      updatedAt: string;
      accountUpdatesConsent: boolean;
      consentAt: string;
    }[] = [];
    for (let index = 0; index < blobs.length; index += 25) {
      const batch = await Promise.all(blobs.slice(index, index + 25).map(async (blob) => {
        const id = blob.pathname.slice('newsletter/subscribers/'.length).replace(/\.json$/, '');
        if (!/^[a-f0-9]{64}$/.test(id)) return null;
        const subscriber = await readPrivateJson<Partial<Subscriber>>(blob.pathname);
        if (!subscriber || typeof subscriber.email !== 'string' || subscriber.newsletterConsent !== true) return null;
        return {
          id,
          email: subscriber.email,
          createdAt: typeof subscriber.createdAt === 'string' ? subscriber.createdAt : blob.uploadedAt.toISOString(),
          updatedAt: typeof subscriber.updatedAt === 'string' ? subscriber.updatedAt : blob.uploadedAt.toISOString(),
          accountUpdatesConsent: subscriber.accountUpdatesConsent === true,
          consentAt: typeof subscriber.consentAt === 'string' ? subscriber.consentAt : blob.uploadedAt.toISOString(),
        };
      }));
      subscribers.push(...batch.filter((subscriber): subscriber is NonNullable<typeof subscriber> => subscriber !== null));
    }
    subscribers.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
    return jsonResponse(200, { subscribers });
  } catch {
    console.error('CapMuscu: private subscriber listing failed.');
    return jsonResponse(503, { error: 'Impossible de charger les inscriptions.' });
  }
}

export const GET = handler;
export const DELETE = handler;
