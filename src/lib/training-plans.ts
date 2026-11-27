import type { HistoryEntry } from './history';
import type { Duration, EquipmentMode, Goal } from './types';

export const KEY_TRAINING_PLAN = 'capmuscu-programme-actif';
export const KEY_WEEKLY_GOAL = 'capmuscu-objectif-hebdomadaire';

export const WEEKDAYS = [
  { value: 1, label: 'Lundi', short: 'lun.' },
  { value: 2, label: 'Mardi', short: 'mar.' },
  { value: 3, label: 'Mercredi', short: 'mer.' },
  { value: 4, label: 'Jeudi', short: 'jeu.' },
  { value: 5, label: 'Vendredi', short: 'ven.' },
  { value: 6, label: 'Samedi', short: 'sam.' },
  { value: 7, label: 'Dimanche', short: 'dim.' },
] as const;

export interface TrainingPlan {
  id: string;
  goal: Goal;
  equipment: Exclude<EquipmentMode, 'halteres'>;
  duration: Duration;
  weeks: 4 | 8;
  weekdays: number[];
  startDate: string;
  createdAt: string;
}

export interface PlannedWorkout {
  date: string;
  week: number;
  weekday: number;
  completed: boolean;
  future: boolean;
  historyCount: number;
}

export interface CalendarDay {
  date: string;
  day: number;
  inMonth: boolean;
  isToday: boolean;
  workouts: number;
  planned: boolean;
  completed: boolean;
}

const isDateKey = (value: string): boolean => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [year, month, day] = value.split('-').map(Number);
  const date = new Date(year!, month! - 1, day!);
  return date.getFullYear() === year && date.getMonth() === month! - 1 && date.getDate() === day;
};

export function isTrainingPlan(value: unknown): value is TrainingPlan {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  const plan = value as Partial<TrainingPlan>;
  const keys = Object.keys(value);
  return keys.every((key) => ['id', 'goal', 'equipment', 'duration', 'weeks', 'weekdays', 'startDate', 'createdAt'].includes(key))
    && typeof plan.id === 'string' && plan.id.length > 0 && plan.id.length <= 100
    && ['sante', 'muscle', 'force'].includes(String(plan.goal))
    && ['salle', 'maison', 'corps'].includes(String(plan.equipment))
    && [30, 45, 60].includes(Number(plan.duration))
    && [4, 8].includes(Number(plan.weeks))
    && Array.isArray(plan.weekdays)
    && plan.weekdays.length >= 2 && plan.weekdays.length <= 4
    && plan.weekdays.every((day) => Number.isInteger(day) && day >= 1 && day <= 7)
    && new Set(plan.weekdays).size === plan.weekdays.length
    && typeof plan.startDate === 'string' && isDateKey(plan.startDate)
    && new Date(plan.startDate + 'T12:00:00').getDay() === 1
    && typeof plan.createdAt === 'string' && !Number.isNaN(Date.parse(plan.createdAt));
}

export function isWeeklyGoal(value: unknown): value is number {
  return Number.isInteger(value) && Number(value) >= 1 && Number(value) <= 7;
}

export function localDateKey(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function mondayOf(date: Date): Date {
  const monday = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const weekday = monday.getDay() || 7;
  monday.setDate(monday.getDate() - weekday + 1);
  return monday;
}

export function addLocalDays(date: Date, count: number): Date {
  const next = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  next.setDate(next.getDate() + count);
  return next;
}

function entryDates(entries: HistoryEntry[]): Map<string, number> {
  const counts = new Map<string, number>();
  for (const entry of entries) {
    const date = new Date(entry.date);
    if (Number.isNaN(date.getTime())) continue;
    const key = localDateKey(date);
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  return counts;
}

export function plannedWorkouts(plan: TrainingPlan, entries: HistoryEntry[], today = new Date()): PlannedWorkout[] {
  const start = new Date(`${plan.startDate}T12:00:00`);
  const end = addLocalDays(start, plan.weeks * 7);
  const counts = entryDates(entries);
  const todayKey = localDateKey(today);
  const result: PlannedWorkout[] = [];

  for (let week = 0; week < plan.weeks; week++) {
    for (const weekday of plan.weekdays) {
      const date = addLocalDays(start, week * 7 + weekday - 1);
      const key = localDateKey(date);
      result.push({
        date: key,
        week: week + 1,
        weekday,
        completed: (counts.get(key) ?? 0) > 0,
        future: key > todayKey,
        historyCount: counts.get(key) ?? 0,
      });
    }
  }

  return result.filter((workout) => workout.date < localDateKey(end));
}

export function workoutsThisWeek(entries: HistoryEntry[], today = new Date()): number {
  const monday = localDateKey(mondayOf(today));
  const nextMonday = localDateKey(addLocalDays(mondayOf(today), 7));
  return [...entryDates(entries)].filter(([date]) => date >= monday && date < nextMonday).reduce((total, [, count]) => total + count, 0);
}

export function monthCalendar(
  month: Date,
  entries: HistoryEntry[],
  plannedDates: string[] = [],
  today = new Date(),
): CalendarDay[] {
  const first = new Date(month.getFullYear(), month.getMonth(), 1);
  const mondayOffset = (first.getDay() + 6) % 7;
  const gridStart = addLocalDays(first, -mondayOffset);
  const counts = entryDates(entries);
  const planSet = new Set(plannedDates);
  const todayKey = localDateKey(today);

  return Array.from({ length: 42 }, (_, index) => {
    const date = addLocalDays(gridStart, index);
    const key = localDateKey(date);
    const workouts = counts.get(key) ?? 0;
    return {
      date: key,
      day: date.getDate(),
      inMonth: date.getMonth() === month.getMonth(),
      isToday: key === todayKey,
      workouts,
      planned: planSet.has(key),
      completed: workouts > 0,
    };
  });
}
