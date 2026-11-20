export async function readJsonBody(request: Request): Promise<unknown | null> {
  const length = Number(request.headers.get('Content-Length') ?? 0);
  if (length > 16000) return null;
  try {
    const text = await request.text();
    if (text.length > 16000) return null;
    return JSON.parse(text) as unknown;
  } catch {
    return null;
  }
}
