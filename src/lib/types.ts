export type Difficulty = 'Débutant' | 'Intermédiaire' | 'Avancé';
export type Mechanics = 'Polyarticulaire' | 'Isolation';
export type EquipmentLabel = 'Salle de sport' | 'Haltères' | 'Poids du corps';

export interface Exercise {
  id: string;
  slug: string;
  name: string;
  description: string;
  primaryMuscle: string;
  secondaryMuscles: string[];
  equipment: EquipmentLabel;
  difficulty: Difficulty;
  mechanics: Mechanics;
  executionSteps: string[];
  safetyTips: string[];
  commonMistakes: string[];
  alternatives: string[];
  /** Chemins publics (/images/exercises/...) de la paire 0.jpg / 1.jpg, si disponibles. */
  images?: [string, string];
}

export interface Muscle {
  slug: string;
  name: string;
  description: string;
  benefit: string;
}

export interface Zone {
  slug: string;
  name: string;
  emoji: string;
  muscles: string[];
}

export interface NewsItem {
  id: string;
  type: 'etude' | 'actu';
  title: string;
  summary: string;
  url: string;
  source: string;
  date: string;
}

export interface Recipe {
  id: string;
  slug: string;
  name: string;
  description: string;
  prepMinutes: number;
  servings: number;
  proteinGrams: number;
  calories: number;
  ingredients: string[];
  steps: string[];
  tags: string[];
}

export type Goal = 'sante' | 'muscle' | 'force';
export type EquipmentMode = 'salle' | 'halteres' | 'corps';
export type Duration = 30 | 45 | 60;
