/** Teintes (HSL) des badges : un code couleur stable par groupe musculaire et par niveau. */
const MUSCLE_HUE: Record<string, number> = {
  Pectoraux: 350,
  Dos: 215,
  Épaules: 28,
  Biceps: 262,
  Triceps: 310,
  'Avant-bras': 175,
  Abdominaux: 45,
  Quadriceps: 145,
  'Ischio-jambiers': 190,
  Fessiers: 330,
  Mollets: 100,
  'Corps entier': 240,
};

const LEVEL_HUE: Record<string, number> = { Débutant: 150, Intermédiaire: 215, Avancé: 38 };

export const muscleHue = (name: string): number => MUSCLE_HUE[name] ?? 215;
export const levelHue = (level: string): number => LEVEL_HUE[level] ?? 215;

/** Attribut `style` à poser sur un élément `.badge.tint`. */
export const tintStyle = (hue: number): string => `--h:${hue}`;
