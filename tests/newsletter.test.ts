import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { get, put } from '@vercel/blob';
import { POST as handler } from '../api/newsletter';

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

const request = (body: unknown, headers: Record<string, string> = {}) =>
  new Request('https://capmuscu.fr/api/newsletter', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Origin: 'https://capmuscu.fr', ...headers },
    body: JSON.stringify(body),
  });

describe('inscription newsletter avec Vercel Blob privé', () => {
  beforeEach(() => {
    vi.stubEnv('ANALYTICS_HASH_SECRET', 'test-secret-with-more-than-thirty-two-characters');
    vi.stubEnv('BLOB_READ_WRITE_TOKEN', 'test-token');
    vi.mocked(get).mockResolvedValue(null);
    vi.mocked(put).mockResolvedValue({
      url: 'https://blob.example/subscriber.json',
      downloadUrl: 'https://blob.example/subscriber.json',
      pathname: 'newsletter/subscribers/example.json',
      contentType: 'application/json',
      contentDisposition: 'inline',
      etag: 'etag',
    });
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.clearAllMocks();
  });

  it('stores the normalized email and separate consent choices in a private blob', async () => {
    const response = await handler(request({
      email: '  Test@Example.fr ',
      newsletterConsent: true,
      accountUpdatesConsent: true,
    }));

    expect(response.status).toBe(202);
    expect(get).toHaveBeenCalledWith(expect.stringMatching(/^newsletter\/subscribers\/[a-f0-9]{64}\.json$/), {
      access: 'private',
      useCache: false,
    });
    expect(put).toHaveBeenCalledWith(
      expect.stringMatching(/^newsletter\/subscribers\/[a-f0-9]{64}\.json$/),
      expect.any(String),
      expect.objectContaining({ access: 'private', allowOverwrite: true }),
    );
    const record = JSON.parse(String(vi.mocked(put).mock.calls[0]?.[1]));
    expect(record).toMatchObject({
      email: 'test@example.fr',
      newsletterConsent: true,
      accountUpdatesConsent: true,
    });
    expect(record.consentAt).toEqual(expect.any(String));
    expect(await response.json()).toEqual({ accepted: true });
  });

  it('requires a valid address and explicit newsletter consent', async () => {
    expect((await handler(request({ email: 'invalid', newsletterConsent: true }))).status).toBe(400);
    expect((await handler(request({ email: 'test@example.fr' }))).status).toBe(400);
    expect(put).not.toHaveBeenCalled();
  });

  it('does not store honeypot submissions and rejects cross-origin requests', async () => {
    const trapped = await handler(request({
      email: 'test@example.fr',
      newsletterConsent: true,
      website: 'bot',
    }));
    expect(trapped.status).toBe(202);
    const crossOrigin = await handler(request(
      { email: 'test@example.fr', newsletterConsent: true },
      { Origin: 'https://other.example' },
    ));
    expect(crossOrigin.status).toBe(403);
    expect(put).not.toHaveBeenCalled();
  });

  it('reports storage configuration and failures without exposing provider details', async () => {
    vi.stubEnv('ANALYTICS_HASH_SECRET', '');
    expect((await handler(request({ email: 'test@example.fr', newsletterConsent: true }))).status).toBe(503);

    vi.stubEnv('ANALYTICS_HASH_SECRET', 'test-secret-with-more-than-thirty-two-characters');
    vi.mocked(get).mockRejectedValueOnce(new Error('private storage details'));
    const response = await handler(request({ email: 'test@example.fr', newsletterConsent: true }));
    expect(response.status).toBe(503);
    expect(await response.text()).not.toContain('private storage details');
  });
});
