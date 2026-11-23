import type { Exercise } from './types';

export const EXERCISE_PAGE_SIZE = 24;

export interface ExerciseSearchItem {
  slug: string;
  name: string;
  description: string;
  muscle: string;
  zone: string;
  equipment: Exercise['equipment'];
  difficulty: Exercise['difficulty'];
}

export interface ExerciseFilters {
  query: string;
  muscle: string;
  equipment: string;
  difficulty: string;
  zone: string;
}

export function getExercisePage<T>(items: T[], page: number, pageSize = EXERCISE_PAGE_SIZE) {
  const pageCount = Math.max(1, Math.ceil(items.length / pageSize));
  const currentPage = Number.isFinite(page) ? Math.min(pageCount, Math.max(1, Math.floor(page))) : 1;
  const start = (currentPage - 1) * pageSize;
  return { items: items.slice(start, start + pageSize), currentPage, pageCount };
}

function normalize(value: string): string {
  return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
}

export function filterExerciseIndex(items: ExerciseSearchItem[], filters: ExerciseFilters): ExerciseSearchItem[] {
  const query = normalize(filters.query);
  return items.filter((item) =>
    (!query || normalize(`${item.name} ${item.muscle} ${item.equipment} ${item.description}`).includes(query)) &&
    (!filters.muscle || item.muscle === filters.muscle) &&
    (!filters.equipment || item.equipment === filters.equipment) &&
    (!filters.difficulty || item.difficulty === filters.difficulty) &&
    (!filters.zone || item.zone === filters.zone),
  );
}
