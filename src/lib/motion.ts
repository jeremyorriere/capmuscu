import { bodyMapSvg, esc } from './bodymap';
import type { Exercise } from './types';

type Seg = [number, number, number, number];
interface Pose { head: [number, number]; lines: Seg[] }
interface Move { label: string; a: Pose; b: Pose }

const stand = (dy = 0): Seg[] => [[50, 24 + dy, 50, 62 + dy], [50, 62 + dy, 50, 114]];

/** Schémas vectoriels simplifiés (vue de profil, 100 × 120) : position de départ (a) et d'arrivée (b). */
const MOVES: Record<string, Move> = {
  squat: {
    label: 'Fléchir les genoux et les hanches, puis remonter',
    a: { head: [50, 16], lines: [...stand(), [50, 32, 66, 34]] },
    b: { head: [41, 38], lines: [[40, 48, 30, 82], [30, 82, 56, 82], [56, 82, 50, 114], [40, 50, 62, 52]] },
  },
  charniere: {
    label: "Pousser les hanches en arrière en gardant le dos plat, puis se redresser",
    a: { head: [50, 16], lines: [...stand(), [50, 32, 50, 62]] },
    b: { head: [86, 46], lines: [[40, 64, 76, 50], [40, 64, 44, 90], [44, 90, 46, 114], [76, 50, 74, 88]] },
  },
  poussee: {
    label: 'Fléchir les coudes puis repousser le sol',
    a: { head: [90, 52], lines: [[14, 108, 82, 62], [82, 62, 82, 108]] },
    b: { head: [90, 88], lines: [[14, 108, 82, 96], [82, 96, 70, 104], [70, 104, 82, 108]] },
  },
  curl: {
    label: 'Plier le coude pour monter la charge, puis redescendre lentement',
    a: { head: [50, 16], lines: [...stand(), [50, 32, 50, 58], [50, 58, 50, 84]] },
    b: { head: [50, 16], lines: [...stand(), [50, 32, 50, 58], [50, 58, 66, 36]] },
  },
  developpe: {
    label: 'Pousser les bras vers le haut, puis redescendre',
    a: { head: [50, 16], lines: [...stand(), [50, 32, 32, 40], [32, 40, 32, 18], [50, 32, 68, 40], [68, 40, 68, 18]] },
    b: { head: [50, 16], lines: [...stand(), [50, 32, 38, 6], [50, 32, 62, 6]] },
  },
  crunch: {
    label: 'Enrouler le haut du corps vers les genoux, puis redescendre',
    a: { head: [14, 98], lines: [[20, 102, 56, 102], [56, 102, 72, 78], [72, 78, 90, 102]] },
    b: { head: [34, 78], lines: [[38, 90, 56, 102], [56, 102, 72, 78], [72, 78, 90, 102]] },
  },
  mollets: {
    label: 'Monter sur la pointe des pieds, puis redescendre',
    a: { head: [50, 16], lines: [...stand(), [50, 114, 62, 114]] },
    b: { head: [50, 6], lines: [[50, 14, 50, 52], [50, 52, 50, 106], [50, 106, 60, 114]] },
  },
  pont: {
    label: 'Pousser dans les talons pour monter le bassin, puis redescendre',
    a: { head: [12, 98], lines: [[20, 102, 52, 102], [52, 102, 68, 80], [68, 80, 82, 102]] },
    b: { head: [12, 98], lines: [[20, 102, 52, 76], [52, 76, 68, 80], [68, 80, 82, 102]] },
  },
  fente: {
    label: 'Descendre en fente, puis revenir debout',
    a: { head: [50, 16], lines: [...stand(), [50, 32, 50, 58]] },
    b: { head: [50, 28], lines: [[50, 36, 50, 70], [50, 70, 68, 72], [68, 72, 66, 108], [50, 70, 34, 96], [34, 96, 22, 112]] },
  },
};

const BY_MUSCLE: Record<string, string> = {
  Pectoraux: 'poussee', Triceps: 'poussee', Dos: 'curl', Biceps: 'curl', Épaules: 'developpe',
  Quadriceps: 'squat', Fessiers: 'squat', 'Ischio-jambiers': 'charniere', Mollets: 'mollets',
  Abdominaux: 'crunch', 'Corps entier': 'squat', 'Avant-bras': 'curl',
};

const BY_SLUG: Record<string, string> = {
  'pompes-pike': 'poussee', burpees: 'poussee', 'pompes-diamant': 'poussee',
  'curl-biceps-serviette': 'curl', 'mollets-pointes-pieds': 'mollets', 'mollets-une-jambe': 'mollets',
  'hip-thrust-haltere': 'pont', 'curl-ischio-serviette': 'pont', 'pont-fessier': 'pont', 'pont-fessier-un-pied': 'pont',
  'inclinaison-buste-halteres': 'charniere', 'bonjour-poids-du-corps': 'charniere', 'balancier-halteres': 'charniere',
  'fentes-arriere-halteres': 'fente', 'squat-bulgare': 'fente', 'anges-au-mur': 'developpe', thruster: 'squat',
  'thruster-halteres': 'squat',
};

export function moveFor(e: Pick<Exercise, 'slug' | 'primaryMuscle'>): Move {
  return MOVES[BY_SLUG[e.slug] ?? BY_MUSCLE[e.primaryMuscle] ?? 'squat']!;
}

function poseSvg(pose: Pose, cls: string): string {
  const lines = pose.lines.map(([x1, y1, x2, y2]) => `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}"/>`).join('');
  return `<svg class="cm-pose ${cls}" viewBox="0 0 100 120" aria-hidden="true" focusable="false"><line class="cm-floor" x1="4" y1="116" x2="96" y2="116"/><g class="cm-stroke">${lines}<circle cx="${pose.head[0]}" cy="${pose.head[1]}" r="8" class="cm-head"/></g></svg>`;
}

/** Schéma vectoriel du mouvement : alternance départ / arrivée. */
export function movementSchema(e: Pick<Exercise, 'slug' | 'primaryMuscle'>): string {
  const m = moveFor(e);
  return `<div class="cm-schema"><div class="cm-schema-stage">${poseSvg(m.a, 'cm-a')}${poseSvg(m.b, 'cm-b cm-anim')}</div><p class="cm-schema-label">Schéma du mouvement : ${esc(m.label)}.</p></div>`;
}

export interface MotionOptions {
  /** Affiche la silhouette animée dans le repli (inutile quand la silhouette est déjà montrée à côté). */
  bodyMapInFallback?: boolean;
}

/**
 * Démonstration animée (départ ↔ arrivée toutes les 0,9 s) avec bouton Pause / Lecture.
 * Photos de free-exercise-db si disponibles ; sinon (ou si une image ne charge pas) : silhouette + schéma vectoriel.
 */
export function motionHtml(e: Exercise, opts: MotionOptions = {}): string {
  const { bodyMapInFallback = true } = opts;
  const name = esc(e.name);
  const hasPhotos = Array.isArray(e.images) && e.images.length === 2;
  const fallback = `<div class="cm-fallback${hasPhotos ? '' : ' cm-show'}">${bodyMapInFallback ? bodyMapSvg(e.primaryMuscle, e.secondaryMuscles) : ''}${movementSchema(e)}</div>`;
  const photos = hasPhotos
    ? `<div class="cm-photos"><img class="cm-img" src="${esc(e.images![0])}" alt="Position de départ : ${name}" loading="lazy" decoding="async" width="850" height="567" /><img class="cm-img cm-anim cm-img-b" src="${esc(e.images![1])}" alt="" loading="lazy" decoding="async" width="850" height="567" /></div>`
    : '';
  return `<figure class="cm-motion" data-motion><p class="cm-label"><span class="cm-dot" aria-hidden="true"></span>Animation du mouvement</p><div class="cm-stage">${photos}${fallback}</div><figcaption class="cm-caption"><button type="button" class="btn btn-primary cm-toggle" data-motion-toggle aria-label="Mettre la démonstration en pause : ${name}"><span aria-hidden="true" data-motion-icon>⏸</span> <span data-motion-text>Pause</span></button><span class="cm-hint">Départ ↔ arrivée, toutes les 0,9 s</span></figcaption></figure>`;
}
