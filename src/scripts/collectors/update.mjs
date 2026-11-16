// Collecte quotidienne : PubMed (études) + flux RSS (actualités) -> src/data/news.json
// En cas d'échec d'une source, les dernières données valides sont conservées.
import { readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { collectPubmed } from './pubmed.mjs';
import { collectRss } from './rss.mjs';

const NEWS_PATH = fileURLToPath(new URL('../../data/news.json', import.meta.url));
const MAX_ITEMS = 30;

const RSS_FEEDS = [
  { url: 'https://www.sciencedaily.com/rss/health_medicine/fitness.xml', source: 'ScienceDaily — Forme physique' },
  { url: 'https://www.sciencedaily.com/rss/health_medicine/sports_medicine.xml', source: 'ScienceDaily — Médecine du sport' },
  { url: 'https://www.sciencedaily.com/rss/health_medicine/nutrition.xml', source: 'ScienceDaily — Nutrition' },
];

async function readPrevious() {
  try {
    const data = JSON.parse(await readFile(NEWS_PATH, 'utf8'));
    return { updatedAt: data.updatedAt ?? null, items: Array.isArray(data.items) ? data.items : [] };
  } catch {
    return { updatedAt: null, items: [] };
  }
}

async function main() {
  const previous = await readPrevious();
  const fresh = [];
  const errors = [];

  const jobs = [
    { name: 'PubMed', run: collectPubmed },
    ...RSS_FEEDS.map((f) => ({ name: f.source, run: () => collectRss(f) })),
  ];
  for (const job of jobs) {
    try {
      const items = await job.run();
      fresh.push(...items);
      console.log(`✔ ${job.name} : ${items.length} élément(s)`);
    } catch (err) {
      errors.push(job.name);
      console.warn(`✖ ${job.name} indisponible (${err.message}) — données précédentes conservées.`);
    }
  }

  const byUrl = new Map();
  for (const item of [...fresh, ...previous.items]) if (!byUrl.has(item.url)) byUrl.set(item.url, item);
  const items = [...byUrl.values()]
    .sort((a, b) => String(b.date).localeCompare(String(a.date)))
    .slice(0, MAX_ITEMS);

  const now = new Date().toISOString();
  const output = {
    updatedAt: fresh.length > 0 ? now : previous.updatedAt ?? now,
    checkedAt: now,
    items,
  };
  await writeFile(NEWS_PATH, JSON.stringify(output, null, 2) + '\n', 'utf8');
  console.log(`news.json : ${items.length} élément(s), mise à jour ${output.updatedAt}`);
}

main().catch((err) => {
  console.error('Échec du collecteur, fichier conservé :', err.message);
  process.exit(0);
});
