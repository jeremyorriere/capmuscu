const decode = (s) =>
  s
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')
    .replace(/<[^>]+>/g, '')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#0?39;|&apos;/g, "'")
    .replace(/\s+/g, ' ')
    .trim();

const tag = (block, name) => {
  const m = block.match(new RegExp(`<${name}[^>]*>([\\s\\S]*?)</${name}>`, 'i'));
  return m ? decode(m[1]) : '';
};

export async function collectRss({ url, source }, limit = 5) {
  const res = await fetch(url, { signal: AbortSignal.timeout(20000), headers: { 'User-Agent': 'CapMuscu-collector/1.0' } });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const xml = await res.text();
  const blocks = xml.match(/<item[\s>][\s\S]*?<\/item>/gi) ?? [];
  const items = [];
  for (const block of blocks.slice(0, limit)) {
    const title = tag(block, 'title');
    const link = tag(block, 'link');
    if (!title || !/^https?:\/\//.test(link)) continue;
    const description = tag(block, 'description');
    const date = new Date(tag(block, 'pubDate'));
    items.push({
      id: `rss-${Buffer.from(link).toString('base64url').slice(-16)}`,
      type: 'actu',
      title,
      summary: description.length > 220 ? `${description.slice(0, 217).trimEnd()}…` : description,
      url: link,
      source,
      date: (Number.isNaN(date.getTime()) ? new Date() : date).toISOString().slice(0, 10),
    });
  }
  if (items.length === 0) throw new Error('flux vide');
  return items;
}
