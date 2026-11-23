import type { Duration, EquipmentMode, Exercise, Goal, Zone } from './types';

export interface SessionParams {
  goal: Goal;
  zones: string[]; // slugs de zones, ou [] pour une séance complète
  equipment: EquipmentMode;
  duration: Duration;
}

export interface SessionItem {
  exerciseId: string;
  sets: number;
  reps: string;
  restSeconds: number;
}

export const EXERCISE_COUNT: Record<Duration, number> = { 30: 4, 45: 5, 60: 6 };

const FULL_BODY_MUSCLES = ['Quadriceps', 'Pectoraux', 'Dos', 'Épaules', 'Fessiers', 'Abdominaux', 'Biceps', 'Triceps', 'Ischio-jambiers', 'Mollets'];
const TIMED_SLUGS = new Set(['gainage-planche', 'gainage-lateral', 'gainage-copenhagen']);

export type Rng = () => number;

export function createRng(seed: number): Rng {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function shuffle<T>(list: T[], rng: Rng): T[] {
  const a = [...list];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j]!, a[i]!];
  }
  return a;
}

export function allowedEquipment(mode: EquipmentMode): Exercise['equipment'][] {
  if (mode === 'salle') return ['Salle de sport', 'Haltères', 'Poids du corps', 'Kettlebell', 'Élastiques', 'Accessoires'];
  if (mode === 'maison' || mode === 'halteres') return ['Haltères', 'Poids du corps', 'Kettlebell', 'Élastiques', 'Accessoires'];
  return ['Poids du corps'];
}

export function canonicalEquipmentMode(mode: EquipmentMode): Exclude<EquipmentMode, 'halteres'> {
  return mode === 'halteres' ? 'maison' : mode;
}

export function prescribe(exercise: Exercise, goal: Goal, duration: Duration): SessionItem {
  const iso = exercise.mechanics === 'Isolation';
  const sets = 4;
  let reps = '';
  let rest = 60;
  if (goal === 'sante') {
    reps = iso ? '12 à 15' : '10 à 12';
    rest = 60;
  } else if (goal === 'muscle') {
    reps = iso ? '10 à 15' : '8 à 12';
    rest = iso ? 60 : 90;
  } else {
    reps = iso ? '8 à 10' : '4 à 6';
    rest = iso ? 90 : 150;
    if (exercise.equipment === 'Poids du corps') {
      reps = '8 à 12';
      rest = 90;
    }
  }
  if (TIMED_SLUGS.has(exercise.slug)) {
    reps = goal === 'sante' ? '20 à 30 secondes' : '30 à 45 secondes';
    rest = 45;
  }
  return { exerciseId: exercise.id, sets, reps, restSeconds: rest };
}

function pool(all: Exercise[], params: SessionParams): Exercise[] {
  const allowed = allowedEquipment(params.equipment);
  const byEquip = all.filter((e) => !e.category && allowed.includes(e.equipment));
  if (params.goal === 'sante') {
    const gentle = byEquip.filter((e) => e.difficulty !== 'Avancé');
    return gentle.length > 0 ? gentle : byEquip;
  }
  return byEquip;
}

export function targetMuscles(zones: Zone[], selected: string[]): string[] {
  if (selected.length === 0) return FULL_BODY_MUSCLES;
  const names = new Set<string>();
  for (const z of zones.filter((zone) => selected.includes(zone.slug))) {
    for (const slug of z.muscles) names.add(slug);
  }
  return [...names];
}

/**
 * Génère une séance de 4 à 6 exercices. `muscleNames` : noms de muscles principaux ciblés.
 */
export function generateSession(all: Exercise[], muscleNames: string[], params: SessionParams, rng: Rng): SessionItem[] {
  const count = EXERCISE_COUNT[params.duration];
  const candidates = pool(all, params);
  const chosen: Exercise[] = [];
  const has = (e: Exercise) => chosen.some((c) => c.id === e.id);
  const order = shuffle(muscleNames, rng);

  // Variété : à muscle égal, on évite les variantes du même mouvement (même mot de tête), du même matériel et de la même mécanique.
  const family = (e: Exercise) => e.name.toLowerCase().split(/[\s-]+/)[0]!;
  const penalty = (e: Exercise) => {
    let p = 0;
    for (const c of chosen) {
      if (family(c) === family(e)) p += 3;
      if (c.equipment === e.equipment) p += 1;
      if (c.mechanics === e.mechanics && c.primaryMuscle === e.primaryMuscle) p += 1;
    }
    return p;
  };

  const take = (list: Exercise[]) => {
    const ranked = shuffle(list, rng).filter((e) => !has(e)).map((e) => [e, penalty(e)] as const);
    if (ranked.length === 0) return false;
    ranked.sort((a, b) => a[1] - b[1]);
    chosen.push(ranked[0]![0]);
    return true;
  };

  for (let round = 0; round < count && chosen.length < count; round++) {
    let progressed = false;
    for (const muscle of order) {
      if (chosen.length >= count) break;
      if (take(candidates.filter((e) => e.primaryMuscle === muscle))) progressed = true;
    }
    if (!progressed) break;
  }
  if (chosen.length < count) {
    for (const muscle of order) {
      if (chosen.length >= count) break;
      take(candidates.filter((e) => e.secondaryMuscles.includes(muscle)));
    }
  }
  while (chosen.length < count) {
    if (!take(candidates.filter((e) => e.primaryMuscle === 'Corps entier' || e.primaryMuscle === 'Abdominaux'))) break;
  }

  const sorted = [...chosen].sort((a, b) => Number(a.mechanics === 'Isolation') - Number(b.mechanics === 'Isolation'));
  return sorted.map((e) => prescribe(e, params.goal, params.duration));
}

/** Remplace un exercice par une alternative ciblant le même muscle principal. */
export function replaceExercise(
  all: Exercise[],
  session: SessionItem[],
  index: number,
  params: SessionParams,
  rng: Rng,
): SessionItem | null {
  const current = all.find((e) => e.id === session[index]?.exerciseId);
  if (!current) return null;
  const usedIds = new Set(session.map((s) => s.exerciseId));
  const candidates = pool(all, params).filter((e) => e.primaryMuscle === current.primaryMuscle && e.id !== current.id);
  const fresh = candidates.filter((e) => !usedIds.has(e.id));
  const preferred = fresh.filter((e) => current.alternatives.includes(e.id));
  const list = preferred.length > 0 ? preferred : fresh.length > 0 ? fresh : candidates;
  if (list.length === 0) return null;
  const next = list[Math.floor(rng() * list.length)]!;
  return prescribe(next, params.goal, params.duration);
}

export function sessionToText(all: Exercise[], session: SessionItem[], title: string): string {
  const lines = [title, ''];
  session.forEach((item, i) => {
    const e = all.find((x) => x.id === item.exerciseId);
    if (!e) return;
    lines.push(`${i + 1}. ${e.name} (${e.primaryMuscle}) — ${item.sets} séries × ${item.reps}, repos ${item.restSeconds} s`);
  });
  lines.push('', 'Séance créée sur https://capmuscu.fr/seance/');
  return lines.join('\n');
}
