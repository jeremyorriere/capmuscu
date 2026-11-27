import { describe, expect, it } from 'vitest';
import type { HistoryEntry } from '../src/lib/history';
import {
  isTrainingPlan, isWeeklyGoal, localDateKey, mondayOf, monthCalendar, plannedWorkouts, workoutsThisWeek,
} from '../src/lib/training-plans';
import type { TrainingPlan } from '../src/lib/training-plans';

const plan: TrainingPlan = {
  id: 'plan-test',
  goal: 'sante',
  equipment: 'maison',
  duration: 45,
  weeks: 4,
  weekdays: [2, 4],
  startDate: '2026-02-02',
  createdAt: '2026-02-01T10:00:00.000Z',
};

function entry(id: string, date: Date): HistoryEntry {
  return { id, date: date.toISOString(), title: 'Séance', items: [] };
}

describe('programmes et calendrier', () => {
  it('valide uniquement les plans avec une date de début lundi et 2 à 4 jours', () => {
    expect(isTrainingPlan(plan)).toBe(true);
    expect(isTrainingPlan({ ...plan, startDate: '2026-02-03' })).toBe(false);
    expect(isTrainingPlan({ ...plan, weekdays: [2] })).toBe(false);
    expect(isTrainingPlan({ ...plan, weeks: 6 })).toBe(false);
  });

  it('valide un objectif hebdomadaire de 1 à 7 séances', () => {
    expect(isWeeklyGoal(1)).toBe(true);
    expect(isWeeklyGoal(7)).toBe(true);
    expect(isWeeklyGoal(0)).toBe(false);
    expect(isWeeklyGoal(2.5)).toBe(false);
  });

  it('programme les jours choisis sur chaque semaine et reconnaît les séances terminées', () => {
    const entries = [entry('tuesday', new Date(2026, 1, 3, 18)), entry('extra', new Date(2026, 1, 3, 19))];
    const workouts = plannedWorkouts(plan, entries, new Date(2026, 1, 4, 12));
    expect(workouts).toHaveLength(8);
    expect(workouts[0]).toMatchObject({ date: '2026-02-03', completed: true, future: false, historyCount: 2 });
    expect(workouts[1]).toMatchObject({ date: '2026-02-05', completed: false, future: true });
    expect(workouts.at(-1)?.date).toBe('2026-02-26');

    const extended = plannedWorkouts({ ...plan, weeks: 8 }, [], new Date(2026, 1, 4, 12));
    expect(extended).toHaveLength(16);
    expect(extended.at(-1)?.date).toBe('2026-03-26');
  });

  it('compte les séances de la semaine et génère les jours du calendrier du lundi au dimanche', () => {
    const entries = [
      entry('monday', new Date(2026, 1, 2, 18)),
      entry('wednesday', new Date(2026, 1, 4, 18)),
      entry('last-week', new Date(2026, 0, 30, 18)),
    ];
    expect(workoutsThisWeek(entries, new Date(2026, 1, 4, 12))).toBe(2);
    expect(localDateKey(mondayOf(new Date(2026, 1, 4, 12)))).toBe('2026-02-02');

    const calendar = monthCalendar(new Date(2026, 1, 1), entries, ['2026-02-05'], new Date(2026, 1, 4, 12));
    expect(calendar).toHaveLength(42);
    expect(calendar.find((day) => day.date === '2026-02-02')).toMatchObject({ inMonth: true, workouts: 1 });
    expect(calendar.find((day) => day.date === '2026-02-04')?.isToday).toBe(true);
    expect(calendar.find((day) => day.date === '2026-02-05')?.planned).toBe(true);
  });
});
