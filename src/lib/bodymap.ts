/** Silhouette anatomique SVG (face + dos), partagée entre le rendu serveur (Astro) et le navigateur (/seance). */

type Key =
  | 'pectoraux' | 'dorsaux' | 'trapezes' | 'epaules' | 'biceps' | 'triceps' | 'avantbras'
  | 'abdominaux' | 'quadriceps' | 'ischio' | 'fessiers' | 'mollets';

const ALL_KEYS: Key[] = ['pectoraux', 'dorsaux', 'trapezes', 'epaules', 'biceps', 'triceps', 'avantbras', 'abdominaux', 'quadriceps', 'ischio', 'fessiers', 'mollets'];

const MUSCLE_KEYS: Record<string, Key[]> = {
  Pectoraux: ['pectoraux'],
  Dos: ['dorsaux', 'trapezes'],
  Épaules: ['epaules'],
  Biceps: ['biceps'],
  Triceps: ['triceps'],
  'Avant-bras': ['avantbras'],
  Abdominaux: ['abdominaux'],
  Quadriceps: ['quadriceps'],
  'Ischio-jambiers': ['ischio'],
  Fessiers: ['fessiers'],
  Mollets: ['mollets'],
  'Corps entier': ALL_KEYS,
};

interface Part {
  key: Key;
  view: 'face' | 'dos';
  mirror: boolean;
  shape: (cls: string) => string;
}

const ell = (cx: number, cy: number, rx: number, ry: number, rot = 0) => (cls: string) =>
  `<ellipse class="${cls}" cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}"${rot ? ` transform="rotate(${rot} ${cx} ${cy})"` : ''}/>`;
const path = (d: string) => (cls: string) => `<path class="${cls}" d="${d}"/>`;

// Coordonnées locales d'une vue : 200 de large, axe central x = 100. Les parties « mirror » sont dessinées côté gauche puis reflétées.
const PARTS: Part[] = [
  { key: 'epaules', view: 'face', mirror: true, shape: ell(59, 65, 9, 11, -10) },
  { key: 'pectoraux', view: 'face', mirror: true, shape: path('M72 54 Q88 49 99 57 L99 82 Q84 90 70 80 Q66 66 72 54Z') },
  { key: 'abdominaux', view: 'face', mirror: false, shape: path('M87 90 L113 90 L111 132 Q100 139 89 132Z') },
  { key: 'biceps', view: 'face', mirror: true, shape: ell(55, 88, 7, 15, 12) },
  { key: 'avantbras', view: 'face', mirror: true, shape: ell(44, 127, 6, 18, 12) },
  { key: 'quadriceps', view: 'face', mirror: true, shape: ell(84, 174, 12, 29) },
  { key: 'mollets', view: 'face', mirror: true, shape: ell(83, 232, 8, 20) },
  { key: 'trapezes', view: 'dos', mirror: false, shape: path('M100 45 L86 52 L88 76 L100 94 L112 76 L114 52Z') },
  { key: 'epaules', view: 'dos', mirror: true, shape: ell(59, 65, 9, 11, -10) },
  { key: 'dorsaux', view: 'dos', mirror: true, shape: path('M86 80 L99 96 L99 126 L88 124 Q80 106 86 80Z') },
  { key: 'triceps', view: 'dos', mirror: true, shape: ell(55, 88, 7, 15, 12) },
  { key: 'avantbras', view: 'dos', mirror: true, shape: ell(44, 127, 6, 18, 12) },
  { key: 'fessiers', view: 'dos', mirror: true, shape: ell(86, 150, 13, 14) },
  { key: 'ischio', view: 'dos', mirror: true, shape: ell(84, 187, 12, 24) },
  { key: 'mollets', view: 'dos', mirror: true, shape: ell(83, 232, 8, 20) },
];

const LABEL: Record<Key, string> = {
  pectoraux: 'Pectoraux', dorsaux: 'Dorsaux', trapezes: 'Trapèzes', epaules: 'Épaules', biceps: 'Biceps', triceps: 'Triceps',
  avantbras: 'Avant-bras', abdominaux: 'Abdominaux', quadriceps: 'Quadriceps', ischio: 'Ischio-jambiers', fessiers: 'Fessiers', mollets: 'Mollets',
};

const MIRROR = 'transform="translate(200 0) scale(-1 1)"';

// Demi-silhouette gauche, tracé ouvert qui se referme sur l'axe central (x = 100) : le contour n'est donc pas dessiné au milieu.
const HALF =
  'M100 34 L94 34 L94 45 Q80 47 66 52 Q54 56 50 70 L44 104 Q42 114 38 128 L34 146 Q32 155 38 157 Q45 157 46 148 L50 128 L58 100 L66 80 ' +
  'Q71 100 74 120 Q72 134 70 146 Q68 172 74 204 Q73 222 76 236 Q75 250 78 262 L66 272 L90 274 L88 262 Q86 246 90 232 Q93 218 92 204 Q97 178 100 152';

const BODY = (): string =>
  `<g class="bm-body"><path d="${HALF}"/><path d="${HALF}" ${MIRROR}/></g><circle class="bm-head" cx="100" cy="20" r="14"/>`;

export const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

export function bodyMapSvg(primaryMuscle: string, secondaryMuscles: string[] = [], opts: { legend?: boolean } = {}): string {
  const state = new Map<Key, 'p' | 's'>();
  for (const m of secondaryMuscles) for (const k of MUSCLE_KEYS[m] ?? []) state.set(k, 's');
  for (const k of MUSCLE_KEYS[primaryMuscle] ?? []) state.set(k, 'p');

  const views = (['face', 'dos'] as const)
    .map((view, i) => {
      const parts = PARTS.filter((p) => p.view === view)
        .map((p) => {
          const cls = `bm bm-${state.get(p.key) ?? 'n'}`;
          const one = `<g><title>${LABEL[p.key]}</title>${p.shape(cls)}</g>`;
          return p.mirror ? `${one}<g ${MIRROR}>${one}</g>` : one;
        })
        .join('');
      return `<g transform="translate(${i * 210} 0)">${BODY()}${parts}<text x="100" y="294" text-anchor="middle" class="bm-label">${view === 'face' ? 'Vue de face' : 'Vue de dos'}</text></g>`;
    })
    .join('');

  const secondaryText = secondaryMuscles.length ? ` Muscles secondaires : ${secondaryMuscles.join(', ')}.` : '';
  const label = `Silhouette du corps, vue de face et de dos. Muscle principal : ${primaryMuscle}.${secondaryText}`;
  const legend =
    opts.legend === false
      ? ''
      : `<ul class="bm-legend">
<li><span class="bm-swatch bm-swatch-p" aria-hidden="true"></span><span>Muscle principal : <strong>${esc(primaryMuscle)}</strong></span></li>
${secondaryMuscles.length ? `<li><span class="bm-swatch bm-swatch-s" aria-hidden="true"></span><span>Muscles secondaires : <strong>${esc(secondaryMuscles.join(', '))}</strong></span></li>` : ''}
</ul>`;
  return `<div class="bm-wrap"><svg class="bm-svg" viewBox="0 0 420 300" role="img" aria-label="${esc(label)}" focusable="false">${views}</svg>${legend}</div>`;
}