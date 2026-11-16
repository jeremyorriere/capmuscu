export type Sex = 'femme' | 'homme';
export type Activity = 'sedentaire' | 'leger' | 'modere' | 'intense';
export type NutritionGoal = 'perte' | 'maintien' | 'prise';

export const ACTIVITY_FACTORS: Record<Activity, number> = { sedentaire: 1.2, leger: 1.375, modere: 1.55, intense: 1.725 };

export interface NutritionInput {
  sex: Sex;
  age: number;
  weightKg: number;
  heightCm: number;
  activity: Activity;
  goal: NutritionGoal;
}

/** Formule de Mifflin-St Jeor. */
export function computeNutrition(i: NutritionInput) {
  const base = 10 * i.weightKg + 6.25 * i.heightCm - 5 * i.age + (i.sex === 'homme' ? 5 : -161);
  const maintenance = base * ACTIVITY_FACTORS[i.activity];
  const adjust = i.goal === 'perte' ? -0.15 : i.goal === 'prise' ? 0.1 : 0;
  const calories = Math.round((maintenance * (1 + adjust)) / 10) * 10;
  // Les besoins en protéines sont un peu plus élevés après 60 ans.
  const perKg = i.age >= 60 ? (i.goal === 'prise' ? 1.6 : 1.3) : i.goal === 'prise' ? 1.8 : i.goal === 'perte' ? 1.8 : i.activity === 'sedentaire' ? 1.0 : 1.4;
  const protein = Math.round(perKg * i.weightKg);
  return { calories, maintenance: Math.round(maintenance / 10) * 10, protein, proteinPerKg: perKg };
}

/** Formule d'Epley. */
export function estimate1RM(weight: number, reps: number): number {
  if (reps <= 1) return weight;
  return weight * (1 + reps / 30);
}

export const WORK_PERCENTS = [
  { pct: 60, reps: '15 à 20', use: 'Échauffement, endurance musculaire' },
  { pct: 70, reps: '10 à 12', use: 'Tonification, santé' },
  { pct: 75, reps: '8 à 10', use: 'Prise de muscle' },
  { pct: 80, reps: '6 à 8', use: 'Prise de muscle et force' },
  { pct: 85, reps: '4 à 6', use: 'Force' },
  { pct: 90, reps: '2 à 4', use: 'Force maximale' },
  { pct: 95, reps: '1 à 2', use: 'Tentative proche du maximum' },
];

export function roundLoad(kg: number, step = 0.5): number {
  return Math.round(kg / step) * step;
}
