const BASE = 'https://eutils.ncbi.nlm.nih.gov/entrez/eutils';
const TERM = '(hypertrophy OR "resistance training" OR "strength training") AND humans[MeSH Terms]';

async function getJson(url) {
  const res = await fetch(url, { signal: AbortSignal.timeout(20000), headers: { 'User-Agent': 'CapMuscu-collector/1.0' } });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

function parseDate(value) {
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? new Date().toISOString().slice(0, 10) : d.toISOString().slice(0, 10);
}

export async function collectPubmed(limit = 8) {
  const search = await getJson(
    `${BASE}/esearch.fcgi?db=pubmed&retmode=json&sort=pub_date&retmax=${limit}&reldate=60&datetype=pdat&term=${encodeURIComponent(TERM)}`,
  );
  const ids = search?.esearchresult?.idlist ?? [];
  if (ids.length === 0) throw new Error('aucun résultat');
  const summary = await getJson(`${BASE}/esummary.fcgi?db=pubmed&retmode=json&id=${ids.join(',')}`);
  const items = [];
  for (const id of ids) {
    const doc = summary?.result?.[id];
    if (!doc?.title) continue;
    const title = String(doc.title).replace(/\.$/, '').trim();
    items.push({
      id: `pubmed-${id}`,
      type: 'etude',
      title,
      summary: `Étude publiée dans « ${doc.source ?? 'revue scientifique'} ». Résumé et texte original en anglais sur PubMed.`,
      url: `https://pubmed.ncbi.nlm.nih.gov/${id}/`,
      source: 'PubMed',
      date: parseDate(doc.sortpubdate ?? doc.pubdate),
    });
  }
  if (items.length === 0) throw new Error('réponse inexploitable');
  return items;
}
