import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { del, get, list, put, type GetBlobResult, type ListBlobResultBlob } from '@vercel/blob';
import { POST as analyticsHandler, DELETE as deleteAnalytics } from '../api/analytics';
import { GET as adminAnalyticsHandler } from '../api/admin/analytics';
import { GET as sessionStatus, POST as sessionHandler, DELETE as logoutHandler } from '../api/admin/session';
import { GET as subscribersHandler, DELETE as deleteSubscriber } from '../api/admin/subscribers';

vi.mock('@vercel/blob', () => {
  class BlobNotFoundError extends Error {}
  return {
    BlobNotFoundError,
    get: vi.fn(),
    put: vi.fn(),
    list: vi.fn(),
    del: vi.fn(),
  };
});

const visitorId = '00000000-0000-4000-8000-000000000000';
const analyticsRequest = (body: unknown, init: RequestInit = {}) =>
  new Request('https://capmuscu.fr/api/analytics', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Origin: 'https://capmuscu.fr' },
    body: JSON.stringify(body),
    ...init,
  });

describe('statistiques et administration Vercel Blob', () => {
  beforeEach(() => {
    vi.stubEnv('ANALYTICS_HASH_SECRET', 'test-secret-with-more-than-thirty-two-characters');
    vi.stubEnv('ADMIN_AUTH_SECRET', 'admin-secret-with-more-than-thirty-two-characters');
    vi.stubEnv('ADMIN_PASSWORD', 'a-secure-test-password');
    vi.stubEnv('BLOB_READ_WRITE_TOKEN', 'test-token');
    vi.mocked(put).mockResolvedValue({
      url: 'https://blob.example/event.json',
      downloadUrl: 'https://blob.example/event.json',
      pathname: 'analytics/events/example.json',
      contentType: 'application/json',
      contentDisposition: 'inline',
      etag: 'etag',
    });
    vi.mocked(list).mockResolvedValue({ blobs: [], hasMore: false });
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.clearAllMocks();
  });

  it('rejects events without consent, valid identifiers, or same-origin requests', async () => {
    const denied = await analyticsHandler(analyticsRequest({
      visitorId, type: 'page_view', entityIds: ['/'], consent: false,
    }));
    const invalid = await analyticsHandler(analyticsRequest({
      visitorId: 'not-an-id', type: 'page_view', entityIds: ['/'], consent: true,
    }));
    const crossOrigin = await analyticsHandler(analyticsRequest(
      { visitorId, type: 'page_view', entityIds: ['/'], consent: true },
      { headers: { 'Content-Type': 'application/json', Origin: 'https://other.example' } },
    ));
    expect([denied.status, invalid.status, crossOrigin.status]).toEqual([400, 400, 403]);
    expect(put).not.toHaveBeenCalled();
  });

  it('stores pseudonymous event files with expiry and removes visitor files on consent withdrawal', async () => {
    const stored = await analyticsHandler(analyticsRequest({
      visitorId,
      type: 'session_completed',
      entityIds: ['developpe-couche', 'squat'],
      consent: true,
    }));
    expect(stored.status).toBe(202);
    expect(put).toHaveBeenCalledTimes(2);
    const [pathname, content, options] = vi.mocked(put).mock.calls[0]!;
    expect(pathname).toMatch(/^analytics\/events\/\d{4}-\d{2}-\d{2}\/session_completed\/[a-f0-9]{64}\//);
    expect(pathname).not.toContain(visitorId);
    expect(JSON.parse(String(content))).toHaveProperty('createdAt');
    expect(options).toMatchObject({ access: 'private', ttlDays: 400 });

    const removed = await deleteAnalytics(analyticsRequest(
      { visitorId },
      { method: 'DELETE' },
    ));
    expect(removed.status).toBe(200);
    expect(list).toHaveBeenCalledWith(expect.objectContaining({
      prefix: expect.stringMatching(/^analytics\/events\/\d{4}-\d{2}-$/),
    }));
  });

  it('requires a signed admin session to expose statistics', async () => {
    const denied = await adminAnalyticsHandler(new Request('https://capmuscu.fr/api/admin/analytics'));
    expect(denied.status).toBe(401);
    expect(list).not.toHaveBeenCalled();
  });

  it('authenticates with a secure cookie and then serves the dashboard', async () => {
    const response = await sessionHandler(new Request('https://capmuscu.fr/api/admin/session', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Origin: 'https://capmuscu.fr' },
      body: JSON.stringify({ password: 'a-secure-test-password' }),
    }));
    expect(response.status).toBe(200);
    const cookie = response.headers.get('Set-Cookie')!;
    expect(cookie).toContain('HttpOnly');
    expect(cookie).toContain('Secure');
    expect(cookie).toContain('SameSite=Strict');
    const result = await adminAnalyticsHandler(new Request('https://capmuscu.fr/api/admin/analytics', {
      headers: { Cookie: cookie.split(';', 1)[0]! },
    }));
    expect(result.status).toBe(200);
    expect((await result.json()).summary).toMatchObject({ visitors_today: 0 });
  });

  it('aggregates recent events and exercise usage for the authenticated dashboard', async () => {
    const visitorHash = 'a'.repeat(64);
    const date = new Date().toISOString().slice(0, 10);
    const eventId = '00000000-0000-4000-8000-000000000001';
    const makeEvent = (type: string, id: string, entity: string): ListBlobResultBlob => {
      const pathname = `analytics/events/${date}/${type}/${visitorHash}/${id}/${entity}.json`;
      const url = `https://blob.example/${pathname}`;
      return { pathname, url, downloadUrl: url, size: 10, uploadedAt: new Date(), etag: id };
    };
    const eventBlobs = [
      makeEvent('page_view', eventId, '%2Fseance%2F'),
      makeEvent('exercise_view', '00000000-0000-4000-8000-000000000002', 'developpe-couche'),
      makeEvent('session_generated', eventId, 'developpe-couche'),
    ];
    vi.mocked(list).mockImplementation(async (options) => ({
      blobs: eventBlobs.filter((blob) => blob.pathname.startsWith(options?.prefix ?? '')),
      hasMore: false,
    }));

    const login = await sessionHandler(new Request('https://capmuscu.fr/api/admin/session', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Origin: 'https://capmuscu.fr' },
      body: JSON.stringify({ password: 'a-secure-test-password' }),
    }));
    const cookie = login.headers.get('Set-Cookie')!.split(';', 1)[0]!;
    const response = await adminAnalyticsHandler(new Request('https://capmuscu.fr/api/admin/analytics', {
      headers: { Cookie: cookie },
    }));
    const dashboard = await response.json();
    expect(dashboard.summary).toMatchObject({ visitors_today: 1, views_today: 1, sessions_month: 1 });
    expect(dashboard.exercises[0]).toMatchObject({
      entity_id: 'developpe-couche',
      views: 1,
      generated: 1,
    });
  });

  it('exposes and deletes newsletter subscriptions only to an authenticated admin', async () => {
    const id = 'b'.repeat(64);
    const pathname = `newsletter/subscribers/${id}.json`;
    const url = `https://blob.example/${pathname}`;
    const subscriberBlob: ListBlobResultBlob = {
      pathname, url, downloadUrl: url, size: 100, uploadedAt: new Date(), etag: 'subscriber-etag',
    };
    vi.mocked(list).mockImplementation(async (options) => ({
      blobs: subscriberBlob.pathname.startsWith(options?.prefix ?? '') ? [subscriberBlob] : [],
      hasMore: false,
    }));
    const email = 'test@example.fr';
    const stream = new Response(JSON.stringify({
      email,
      createdAt: '2026-11-20T12:00:00.000Z',
      updatedAt: '2026-11-20T12:00:00.000Z',
      newsletterConsent: true,
      accountUpdatesConsent: false,
      consentAt: '2026-11-20T12:00:00.000Z',
    })).body!;
    const privateBlob: GetBlobResult = {
      statusCode: 200,
      stream,
      headers: new Headers(),
      blob: {
        url, downloadUrl: url, pathname, contentDisposition: 'inline', cacheControl: 'private',
        uploadedAt: new Date(), etag: 'subscriber-etag', contentType: 'application/json', size: 100,
      },
    };
    vi.mocked(get).mockResolvedValue(privateBlob);

    const unauthenticated = await subscribersHandler(new Request('https://capmuscu.fr/api/admin/subscribers'));
    expect(unauthenticated.status).toBe(401);

    const login = await sessionHandler(new Request('https://capmuscu.fr/api/admin/session', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Origin: 'https://capmuscu.fr' },
      body: JSON.stringify({ password: 'a-secure-test-password' }),
    }));
    const cookie = login.headers.get('Set-Cookie')!.split(';', 1)[0]!;
    const response = await subscribersHandler(new Request('https://capmuscu.fr/api/admin/subscribers', {
      headers: { Cookie: cookie },
    }));
    expect(await response.json()).toMatchObject({
      subscribers: [{ id, email, accountUpdatesConsent: false }],
    });

    const deleted = await deleteSubscriber(new Request('https://capmuscu.fr/api/admin/subscribers', {
      method: 'DELETE',
      headers: { Cookie: cookie, Origin: 'https://capmuscu.fr', 'Content-Type': 'application/json' },
      body: JSON.stringify({ id }),
    }));
    expect(deleted.status).toBe(200);
    expect(del).toHaveBeenCalledWith(url);
  });

  it('limits failed password attempts and permits logout', async () => {
    const storedBlobs: ListBlobResultBlob[] = [];
    vi.mocked(list).mockImplementation(async (options) => ({
      blobs: storedBlobs.filter((blob) => blob.pathname.startsWith(options?.prefix ?? '')),
      hasMore: false,
    }));
    vi.mocked(put).mockImplementation(async (pathname) => {
      const url = `https://blob.example/${pathname}`;
      const uploadedAt = new Date();
      const blob: ListBlobResultBlob = {
        pathname, url, downloadUrl: url, uploadedAt, size: 0, etag: 'etag',
      };
      storedBlobs.push(blob);
      return {
        url,
        downloadUrl: url,
        pathname,
        contentType: 'application/json',
        contentDisposition: 'inline',
        etag: 'etag',
      };
    });
    const makeLogin = () => sessionHandler(new Request('https://capmuscu.fr/api/admin/session', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Origin: 'https://capmuscu.fr' },
      body: JSON.stringify({ password: 'incorrect' }),
    }));
    for (let attempt = 0; attempt < 5; attempt += 1) expect((await makeLogin()).status).toBe(401);
    expect((await makeLogin()).status).toBe(429);

    const logout = await logoutHandler(new Request('https://capmuscu.fr/api/admin/session', {
      method: 'DELETE',
      headers: { Origin: 'https://capmuscu.fr' },
    }));
    expect(logout.status).toBe(200);
    expect(logout.headers.get('Set-Cookie')).toContain('Max-Age=0');
    expect(get).not.toHaveBeenCalled();
    expect(del).not.toHaveBeenCalled();
  });

  it('reports an unauthenticated session without creating storage files', async () => {
    const response = await sessionStatus(new Request('https://capmuscu.fr/api/admin/session'));
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ authenticated: false });
    expect(put).not.toHaveBeenCalled();
  });
});
