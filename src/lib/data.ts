import exercisesJson from '../data/exercises.json';
import musclesJson from '../data/muscles.json';
import newsJson from '../data/news.json';
import recipesJson from '../data/recipes.json';
import type { EquipmentLabel, Exercise, Muscle, NewsItem, Recipe, Zone } from './types';

export const exercises = exercisesJson as Exercise[];
export const muscles = musclesJson.muscles as Muscle[];
export const zones = musclesJson.zones as Zone[];
export const recipes = recipesJson.recipes as Recipe[];
export const news = newsJson as { updatedAt: string; checkedAt?: string; items: NewsItem[] };

export const equipmentList: { slug: string; label: EquipmentLabel; phrase: string }[] = [
  { slug: 'salle', label: 'Salle de sport', phrase: 'en salle de sport' },
  { slug: 'halteres', label: 'Haltères', phrase: 'avec des haltères' },
  { slug: 'poids-du-corps', label: 'Poids du corps', phrase: 'au poids du corps' },
  { slug: 'kettlebell', label: 'Kettlebell', phrase: 'avec un kettlebell' },
  { slug: 'elastiques', label: 'Élastiques', phrase: 'avec des élastiques' },
  { slug: 'accessoires', label: 'Accessoires', phrase: 'avec des accessoires (ballon, rouleau…)' },
];

export const difficulties = ['Débutant', 'Intermédiaire', 'Avancé'] as const;

export const muscleBySlug = (slug: string) => muscles.find((m) => m.slug === slug);
export const muscleByName = (name: string) => muscles.find((m) => m.name === name);
export const exerciseById = (id: string) => exercises.find((e) => e.id === id);
export const exercisesForMuscle = (name: string) => exercises.filter((e) => e.primaryMuscle === name);

export interface Combo {
  slug: string;
  muscle: Muscle;
  equipment: (typeof equipmentList)[number];
  items: Exercise[];
}

export const MIN_COMBO_SIZE = 2;

export function getCombos(): Combo[] {
  const combos: Combo[] = [];
  for (const muscle of muscles) {
    for (const equipment of equipmentList) {
      const items = exercises.filter((e) => e.primaryMuscle === muscle.name && e.equipment === equipment.label);
      if (items.length >= MIN_COMBO_SIZE) combos.push({ slug: `${muscle.slug}-${equipment.slug}`, muscle, equipment, items });
    }
  }
  return combos;
}

export function wordCount(text: string): number {
  return text.split(/\s+/).filter(Boolean).length;
}

export function exerciseWordCount(e: Exercise): number {
  return wordCount(
    [e.description, ...e.executionSteps, ...e.safetyTips, ...e.commonMistakes].join(' '),
  );
}

/** Date du jour (fuseau Europe/Paris) au format AAAA-MM-JJ. */
export function parisDate(date = new Date()): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Paris' }).format(date);
}

export function dailyExercise(date = parisDate()): Exercise {
  const days = Math.floor(Date.parse(`${date}T00:00:00Z`) / 86_400_000);
  return exercises[((days % exercises.length) + exercises.length) % exercises.length]!;
}

export function formatDateFr(iso: string): string {
  return new Intl.DateTimeFormat('fr-FR', { dateStyle: 'long', timeZone: 'Europe/Paris' }).format(new Date(iso));
}
