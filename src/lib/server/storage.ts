import { BlobNotFoundError, del, get, list, put, type ListBlobResultBlob } from '@vercel/blob';

const PAGE_SIZE = 1000;
const MAX_BLOBS_PER_REQUEST = 20000;

export async function listPrivateBlobs(prefix: string, maximum = MAX_BLOBS_PER_REQUEST): Promise<ListBlobResultBlob[]> {
  const blobs: ListBlobResultBlob[] = [];
  let cursor: string | undefined;

  do {
    const page = await list({ prefix, limit: PAGE_SIZE, ...(cursor ? { cursor } : {}) });
    blobs.push(...page.blobs);
    if (blobs.length > maximum) throw new Error('Private file collection exceeds the request limit.');
    cursor = page.hasMore ? page.cursor : undefined;
    if (page.hasMore && !cursor) throw new Error('Private file pagination is incomplete.');
  } while (cursor);

  return blobs;
}

export async function readPrivateJson<T>(pathname: string): Promise<T | null> {
  try {
    const blob = await get(pathname, { access: 'private', useCache: false });
    if (!blob || blob.statusCode !== 200) return null;
    return await new Response(blob.stream).json() as T;
  } catch (error) {
    if (error instanceof BlobNotFoundError) return null;
    throw error;
  }
}

export async function writePrivateJson(
  pathname: string,
  value: unknown,
  options: { allowOverwrite?: boolean; ttlDays?: number } = {},
): Promise<void> {
  await put(pathname, JSON.stringify(value), {
    access: 'private',
    addRandomSuffix: false,
    allowOverwrite: options.allowOverwrite ?? false,
    contentType: 'application/json; charset=utf-8',
    cacheControlMaxAge: 60,
    ...(options.ttlDays ? { ttlDays: options.ttlDays } : {}),
  });
}

export async function deletePrivateBlobs(blobs: Pick<ListBlobResultBlob, 'url'>[]): Promise<void> {
  for (let index = 0; index < blobs.length; index += 1000) {
    await del(blobs.slice(index, index + 1000).map((blob) => blob.url));
  }
}
