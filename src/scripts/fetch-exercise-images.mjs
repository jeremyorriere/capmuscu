// Télécharge les paires d'images 0.jpg / 1.jpg de yuhonas/free-exercise-db (licence Unlicense, domaine public)
// vers public/images/exercises/<slug>/ puis renseigne le champ "images" de chaque exercice dans exercises.json.
// Les exercices dont le téléchargement échoue n'ont pas de champ "images" : le site affiche alors le schéma de repli.
//
// Usage : npm run fetch-images
// Si Node signale un certificat introuvable (proxy d'entreprise) : NODE_OPTIONS=--use-system-ca npm run fetch-images
import { mkdir, readFile, writeFile, access } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

const root = new URL('../../', import.meta.url);
const EXERCISES = fileURLToPath(new URL('src/data/exercises.json', root));
const MEDIA = fileURLToPath(new URL('src/data/exercise-media.json', root));
const BASE = 'https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises';

const exists = (p) => access(p).then(() => true, () => false);

async function download(url, dest) {
  const res = await fetch(url, { signal: AbortSignal.timeout(30000) });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const buf = Buffer.from(await res.arrayBuffer());
  if (buf.length < 1000) throw new Error('image invalide');
  await writeFile(dest, buf);
}

const exercises = JSON.parse(await readFile(EXERCISES, 'utf8'));
const media = JSON.parse(await readFile(MEDIA, 'utf8'));
let ok = 0;
let failed = 0;

for (const ex of exercises) {
  const source = media[ex.id];
  if (!source) { delete ex.images; continue; }
  const dir = fileURLToPath(new URL(`public/images/exercises/${ex.slug}/`, root));
  await mkdir(dir, { recursive: true });
  try {
    for (const n of [0, 1]) {
      const dest = `${dir}${n}.jpg`;
      if (!(await exists(dest))) await download(`${BASE}/${source}/${n}.jpg`, dest);
    }
    ex.images = [`/images/exercises/${ex.slug}/0.jpg`, `/images/exercises/${ex.slug}/1.jpg`];
    ok++;
  } catch (err) {
    console.warn(`✖ ${ex.slug} (${source}) : ${err.message}`);
    delete ex.images;
    failed++;
  }
}

await writeFile(EXERCISES, JSON.stringify(exercises, null, 2) + '\n', 'utf8');
console.log(`Images : ${ok} exercice(s) avec photos, ${failed} échec(s), ${exercises.length - ok - failed} sans correspondance (schéma de repli).`);
