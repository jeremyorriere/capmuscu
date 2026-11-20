import { hashVisitorId, isSameOrigin, jsonResponse, type ServerEnv } from '../src/lib/server/analytics.js';
import { readJsonBody } from '../src/lib/server/read-body.js';
import { readPrivateJson, writePrivateJson } from '../src/lib/server/storage.js';

interface NewsletterRequest {
  email?: unknown;
  newsletterConsent?: unknown;
  accountUpdatesConsent?: unknown;
  website?: unknown;
}

interface Subscriber {
  email: string;
  createdAt: string;
  updatedAt: string;
  newsletterConsent: true;
  accountUpdatesConsent: boolean;
  consentAt: string;
}

export async function POST(request: Request): Promise<Response> {
  if (request.method !== 'POST') return jsonResponse(405, { error: 'Méthode non autorisée.' });
  if (!isSameOrigin(request)) return jsonResponse(403, { error: 'Requête refusée.' });
  const contentType = request.headers.get('Content-Type')?.split(';', 1)[0]?.trim().toLowerCase();
  if (contentType !== 'application/json') return jsonResponse(415, { error: 'Format de requête invalide.' });

  const body = await readJsonBody(request);
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return jsonResponse(400, { error: 'Informations invalides.' });
  }
  const payload = body as NewsletterRequest;
  if (typeof payload.website === 'string' && payload.website.trim()) {
    return jsonResponse(202, { accepted: true });
  }
  const email = typeof payload.email === 'string' ? payload.email.trim().toLowerCase() : '';
  if (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return jsonResponse(400, { error: 'Adresse email invalide.' });
  }
  if (payload.newsletterConsent !== true) return jsonResponse(400, { error: 'Le consentement à la newsletter est requis.' });
  if (payload.accountUpdatesConsent !== undefined && typeof payload.accountUpdatesConsent !== 'boolean') {
    return jsonResponse(400, { error: 'Informations invalides.' });
  }

  const env = process.env as ServerEnv;
  if (!env.ANALYTICS_HASH_SECRET || env.ANALYTICS_HASH_SECRET.length < 32) {
    return jsonResponse(503, { error: 'Service d’inscription momentanément indisponible.' });
  }

  try {
    const emailHash = await hashVisitorId(`newsletter:${email}`, env.ANALYTICS_HASH_SECRET);
    const pathname = `newsletter/subscribers/${emailHash}.json`;
    const existing = await readPrivateJson<Partial<Subscriber>>(pathname);
    const now = new Date().toISOString();
    const record: Subscriber = {
      email,
      createdAt: typeof existing?.createdAt === 'string' ? existing.createdAt : now,
      updatedAt: now,
      newsletterConsent: true,
      accountUpdatesConsent: payload.accountUpdatesConsent === true,
      consentAt: now,
    };
    await writePrivateJson(pathname, record, { allowOverwrite: true });
    return jsonResponse(202, { accepted: true });
  } catch {
    console.error('CapMuscu: private newsletter file operation failed.');
    return jsonResponse(503, { error: 'Service d’inscription momentanément indisponible.' });
  }
}
