import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import { describe, expect, it, vi } from 'vitest';

const serviceWorkerSource = readFileSync(new URL('../public/sw.js', import.meta.url), 'utf8');

function createWorker(fetcher: (request: { url: string }) => Promise<Response>) {
  const listeners = new Map<string, (event: WorkerEvent) => void>();
  const entries = new Map<string, Response>();
  const cache = {
    addAll: async (paths: string[]) => {
      for (const path of paths) entries.set(`https://capmuscu.fr${path}`, new Response(`cached:${path}`));
    },
    put: async (request: { url: string }, response: Response) => { entries.set(request.url, response); },
  };
  const cachesApi = {
    open: async () => cache,
    keys: async () => ['capmuscu-old', 'capmuscu-v2'],
    delete: async (key: string) => key === 'capmuscu-old',
    match: async (request: string | { url: string }) => entries.get(typeof request === 'string' ? `https://capmuscu.fr${request}` : request.url),
  };
  const self = {
    location: { origin: 'https://capmuscu.fr' },
    addEventListener: (type: string, handler: (event: WorkerEvent) => void) => listeners.set(type, handler),
    skipWaiting: vi.fn(async () => undefined),
    clients: { claim: vi.fn(async () => undefined) },
  };
  runInNewContext(serviceWorkerSource, { self, caches: cachesApi, fetch: fetcher, URL, Response, console });

  const dispatch = async (type: string, values: Record<string, unknown> = {}) => {
    const waits: Promise<unknown>[] = [];
    let response: Promise<Response> | undefined;
    const event: WorkerEvent = {
      waitUntil: (promise) => waits.push(promise),
      respondWith: (promise) => { response = promise; },
      ...values,
    };
    listeners.get(type)?.(event);
    if (response) {
      const result = await response;
      await Promise.all(waits);
      return result;
    }
    await Promise.all(waits);
    return undefined;
  };
  return { dispatch, entries, self };
}

interface WorkerEvent {
  request?: { method: string; url: string; mode: string };
  waitUntil: (promise: Promise<unknown>) => void;
  respondWith: (promise: Promise<Response>) => void;
}

describe('service worker hors ligne', () => {
  it('précharge les pages essentielles puis sert la séance comme repli hors ligne', async () => {
    const worker = createWorker(async () => { throw new Error('offline'); });
    await worker.dispatch('install');
    const response = await worker.dispatch('fetch', {
      request: { method: 'GET', url: 'https://capmuscu.fr/exercices/squat/', mode: 'navigate' },
    });
    expect(await response?.text()).toBe('cached:/seance/');
  });

  it('renvoie une réponse hors ligne explicite pour les ressources absentes du cache', async () => {
    const worker = createWorker(async () => { throw new Error('offline'); });
    const response = await worker.dispatch('fetch', {
      request: { method: 'GET', url: 'https://capmuscu.fr/assets/app.js', mode: 'no-cors' },
    });
    expect(response?.status).toBe(503);
    expect(response?.headers.get('Content-Type')).toContain('text/plain');
  });

  it('sert une page déjà visitée depuis le cache quand le réseau tombe', async () => {
    let online = true;
    const worker = createWorker(async () => {
      if (!online) throw new Error('offline');
      return new Response('fresh page');
    });
    const request = { method: 'GET', url: 'https://capmuscu.fr/muscles/pectoraux/', mode: 'navigate' };
    const first = await worker.dispatch('fetch', { request });
    expect(await first?.text()).toBe('fresh page');
    online = false;
    const second = await worker.dispatch('fetch', { request });
    expect(await second?.text()).toBe('fresh page');
  });

  it('ne détourne pas les requêtes vers l’administration', async () => {
    const fetcher = vi.fn(async () => new Response('admin'));
    const worker = createWorker(fetcher);
    const response = await worker.dispatch('fetch', {
      request: { method: 'GET', url: 'https://capmuscu.fr/admin/', mode: 'navigate' },
    });
    expect(response).toBeUndefined();
    expect(fetcher).not.toHaveBeenCalled();
  });
});
