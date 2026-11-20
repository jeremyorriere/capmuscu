import { del } from '@vercel/blob';
import { hashVisitorId, isSameOrigin, jsonResponse, validVisitorId, type ServerEnv } from '../src/lib/server/analytics.js';
import { readJsonBody } from '../src/lib/server/read-body.js';
import { listPrivateBlobs, writePrivateJson } from '../src/lib/server/storage.js';

interface AnalyticsPayload {
  visitorId?: unknown;
  consent?: unknown;
  type?: unknown;
  entityIds?: unknown;
}

const eventTypes = new Set([
  'page_view',
  'exercise_view',
  'session_generated',
  'session_completed',
  'exercise_swap',
  'calculator_used',
]);

const validEntity = (value: unknown, type: string): value is string => {
  if (typeof value !== 'string' || value.length > 200) return false;
  if (type === 'page_view') return value.startsWith('/') && !value.includes('?') && !value.includes('#');
  if (type === 'calculator_used') return value === 'nutrition' || value === 'one_rm';
  return /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(value);
};

function payloadOf(value: unknown): AnalyticsPayload | null {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as AnalyticsPayload : null;
}

async function handler(request: Request): Promise<Response> {
  const env = process.env as ServerEnv;
  if (request.method !== 'POST' && request.method !== 'DELETE') {
    return jsonResponse(405, { error: 'Méthode non autorisée.' });
  }

  if (!isSameOrigin(request)) return jsonResponse(403, { error: 'Requête refusée.' });
  const contentType = request.headers.get('Content-Type')?.split(';', 1)[0]?.trim().toLowerCase();
  if (contentType !== 'application/json') return jsonResponse(415, { error: 'Format de requête invalide.' });

  const payload = payloadOf(await readJsonBody(request));
  if (!payload || !validVisitorId(payload.visitorId)) return jsonResponse(400, { error: 'Identifiant invalide.' });
  const secret = env.ANALYTICS_HASH_SECRET;
  if (!secret || secret.length < 32) return jsonResponse(503, { error: 'Statistiques momentanément indisponibles.' });

  try {
    const visitorHash = await hashVisitorId(`visitor:${payload.visitorId}`, secret);
    if (request.method === 'DELETE') {
      const now = new Date();
      const months = Array.from({ length: 15 }, (_, index) =>
        new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - index, 1))
          .toISOString().slice(0, 7),
      );
      const blobs = (await Promise.all(months.map((month) =>
        listPrivateBlobs(`analytics/events/${month}-`),
      ))).flat();
      const matchingBlobs = blobs.filter((blob) => blob.pathname.split('/')[4] === visitorHash);
      for (let index = 0; index < matchingBlobs.length; index += 1000) {
        await del(matchingBlobs.slice(index, index + 1000).map((blob) => blob.url));
      }
      return jsonResponse(200, { deleted: true });
    }

    if (payload.consent !== true || typeof payload.type !== 'string' || !eventTypes.has(payload.type)) {
      return jsonResponse(400, { error: 'Consentement ou événement invalide.' });
    }
    if (!Array.isArray(payload.entityIds) || payload.entityIds.length > 40 ||
        !payload.entityIds.every((id) => validEntity(id, payload.type as string))) {
      return jsonResponse(400, { error: 'Éléments invalides.' });
    }
    if (payload.type === 'page_view' && payload.entityIds.length !== 1) {
      return jsonResponse(400, { error: 'Page invalide.' });
    }
    if (['exercise_view', 'exercise_swap', 'calculator_used'].includes(payload.type) && payload.entityIds.length > 1) {
      return jsonResponse(400, { error: 'Événement invalide.' });
    }
    const entities = [...new Set(payload.entityIds)];
    if (entities.length === 0) return jsonResponse(202, { accepted: true });

    const date = new Date().toISOString().slice(0, 10);
    const eventId = crypto.randomUUID();
    await Promise.all(entities.map((entity) =>
      writePrivateJson(
        `analytics/events/${date}/${payload.type}/${visitorHash}/${eventId}/${encodeURIComponent(entity as string)}.json`,
        { createdAt: new Date().toISOString() },
        { ttlDays: 400 },
      ),
    ));
    return jsonResponse(202, { accepted: true });
  } catch {
    console.error('CapMuscu: private analytics file operation failed.');
    return jsonResponse(503, { error: 'Statistiques momentanément indisponibles.' });
  }
}

export const POST = handler;
export const DELETE = handler;
