import { describe, expect, it } from 'vitest';
import { exercises } from '../src/lib/data';
import { EXERCISE_PAGE_SIZE, filterExerciseIndex, getExercisePage, type ExerciseSearchItem } from '../src/lib/exercise-directory';

const index: ExerciseSearchItem[] = [
  { slug: 'presse-cuisses', name: 'Presse à cuisses', description: 'Presse guidée', muscle: 'Quadriceps', zone: 'jambes', equipment: 'Salle de sport', difficulty: 'Débutant' },
  { slug: 'squat', name: 'Squat', description: 'Squat au poids du corps', muscle: 'Quadriceps', zone: 'jambes', equipment: 'Poids du corps', difficulty: 'Débutant' },
  { slug: 'pompes', name: 'Pompes', description: 'Poussée au sol', muscle: 'Pectoraux', zone: 'haut-du-corps', equipment: 'Poids du corps', difficulty: 'Intermédiaire' },
];

describe('annuaire des exercices', () => {
  it('répartit le catalogue en pages complètes sans doublon ni perte', () => {
    const first = getExercisePage(exercises, 1);
    const last = getExercisePage(exercises, first.pageCount);
    expect(EXERCISE_PAGE_SIZE).toBe(24);
    expect(first.items).toHaveLength(EXERCISE_PAGE_SIZE);
    expect(last.items.length).toBeGreaterThan(0);
    expect(last.items.length).toBeLessThanOrEqual(EXERCISE_PAGE_SIZE);
    expect(first.pageCount).toBe(Math.ceil(exercises.length / EXERCISE_PAGE_SIZE));
    expect(getExercisePage(exercises, first.pageCount + 10).items).toEqual(last.items);
    expect(getExercisePage(exercises, 0).items).toEqual(first.items);
    expect([...first.items, ...getExercisePage(exercises, 2).items]).toHaveLength(EXERCISE_PAGE_SIZE * 2);
  });

  it('recherche sans tenir compte des accents et combine les filtres', () => {
    expect(filterExerciseIndex(index, { query: 'presse a', muscle: '', equipment: '', difficulty: '', zone: '' }).map((item) => item.slug))
      .toEqual(['presse-cuisses']);
    expect(filterExerciseIndex(index, { query: '', muscle: 'Quadriceps', equipment: 'Poids du corps', difficulty: '', zone: 'jambes' }).map((item) => item.slug))
      .toEqual(['squat']);
    expect(filterExerciseIndex(index, { query: '', muscle: '', equipment: '', difficulty: '', zone: 'absente' })).toEqual([]);
  });
});
