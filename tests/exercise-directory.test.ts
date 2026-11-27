import { describe, expect, it } from 'vitest';
import { exercises } from '../src/lib/data';
import { EXERCISE_PAGE_SIZE, filterExerciseIndex, getExercisePage, readExerciseFilters, writeExerciseFilters, type ExerciseSearchItem } from '../src/lib/exercise-directory';

const index: ExerciseSearchItem[] = [
  { slug: 'presse-cuisses', name: 'Presse à cuisses', description: 'Presse guidée', muscle: 'Quadriceps', zone: 'jambes', equipment: 'Salle de sport', difficulty: 'Débutant' },
  { slug: 'squat', name: 'Squat', description: 'Squat au poids du corps', muscle: 'Quadriceps', zone: 'jambes', equipment: 'Poids du corps', difficulty: 'Débutant' },
  { slug: 'pompes', name: 'Pompes', description: 'Poussée au sol', muscle: 'Pectoraux', zone: 'haut-du-corps', equipment: 'Poids du corps', difficulty: 'Intermédiaire' },
];

describe('annuaire des exercices', () => {
  it('restaure et sérialise tous les filtres partageables', () => {
    const options = {
      muscles: ['Pectoraux'],
      equipment: ['Haltères'],
      difficulties: ['Débutant'],
      zones: ['haut-du-corps'],
    };
    const filters = readExerciseFilters('?q=d%C3%A9velopp%C3%A9&muscle=Pectoraux&equipment=Halt%C3%A8res&difficulty=D%C3%A9butant&zone=haut-du-corps', options);
    expect(filters).toEqual({
      query: 'développé',
      muscle: 'Pectoraux',
      equipment: 'Haltères',
      difficulty: 'Débutant',
      zone: 'haut-du-corps',
    });
    expect(readExerciseFilters(`?${writeExerciseFilters(filters)}`, options)).toEqual(filters);
  });

  it('ignore les valeurs de filtres invalides et omet les filtres vides', () => {
    const options = { muscles: ['Dos'], equipment: ['Haltères'], difficulties: ['Débutant'], zones: ['haut-du-corps'] };
    expect(readExerciseFilters('?muscle=Inconnu&zone=bad&difficulty=Avancé&q=squat', options)).toEqual({
      query: 'squat', muscle: '', equipment: '', difficulty: '', zone: '',
    });
    expect(writeExerciseFilters({ query: '  ', muscle: '', equipment: '', difficulty: '', zone: '' })).toBe('');
  });

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
