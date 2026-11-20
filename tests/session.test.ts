import { describe, expect, it } from 'vitest';
import { exercises, zones } from '../src/lib/data';
import { allowedEquipment, createRng, generateSession, prescribe, replaceExercise, targetMuscles } from '../src/lib/session';
import type { SessionParams } from '../src/lib/session';
import { computeNutrition, estimate1RM } from '../src/lib/tools';
import { muscleBySlug } from '../src/lib/data';

const modes = ['salle', 'halteres', 'corps'] as const;

describe('générateur de séance', () => {
  it('prescrit le gainage de Copenhague en durée', () => {
    const exercise = exercises.find((e) => e.id === 'gainage-copenhagen')!;
    expect(prescribe(exercise, 'muscle', 45).reps).toBe('30 à 45 secondes');
  });

  for (const mode of modes) {
    for (const zone of [[], ...zones.map((z) => [z.slug])]) {
      it(`${mode} / ${zone.join('+') || 'complet'} : 4 à 6 exercices compatibles`, () => {
        for (const duration of [30, 45, 60] as const) {
          const params: SessionParams = { goal: 'muscle', zones: zone, equipment: mode, duration };
          const names = targetMuscles(zones, zone).map((s) => muscleBySlug(s)?.name ?? s);
          const items = generateSession(exercises, names, params, createRng(42 + duration));
          expect(items.length).toBeGreaterThanOrEqual(4);
          expect(items.length).toBeLessThanOrEqual(6);
          expect(new Set(items.map((i) => i.exerciseId)).size).toBe(items.length);
          for (const i of items) {
            const e = exercises.find((x) => x.id === i.exerciseId)!;
            expect(allowedEquipment(mode)).toContain(e.equipment);
            expect(i.sets).toBeGreaterThan(0);
            expect(i.sets).toBeLessThanOrEqual(4);
          }
        }
      });
    }
  }

  it('remplace un exercice par un autre du même muscle principal avec le matériel choisi', () => {
    for (const mode of modes) {
      const params: SessionParams = { goal: 'sante', zones: [], equipment: mode, duration: 45 };
      const rng = createRng(7);
      const items = generateSession(exercises, targetMuscles(zones, []).map((s) => muscleBySlug(s)?.name ?? s), params, rng);
      items.forEach((item, idx) => {
        const next = replaceExercise(exercises, items, idx, params, rng);
        if (!next) return;
        const before = exercises.find((e) => e.id === item.exerciseId)!;
        const after = exercises.find((e) => e.id === next.exerciseId)!;
        expect(after.id).not.toBe(before.id);
        expect(after.primaryMuscle).toBe(before.primaryMuscle);
        expect(allowedEquipment(mode)).toContain(after.equipment);
      });
    }
  });

  it('propose une alternative pour chaque exercice de chaque mode (sauf indisponibilité réelle)', () => {
    for (const mode of modes) {
      for (const e of exercises.filter((x) => !x.category && allowedEquipment(mode).includes(x.equipment))) {
        const params: SessionParams = { goal: 'muscle', zones: [], equipment: mode, duration: 45 };
        const session = [{ exerciseId: e.id, sets: 3, reps: '10', restSeconds: 60 }];
        const next = replaceExercise(exercises, session, 0, params, createRng(1));
        expect(next, `${mode}: ${e.id}`).not.toBeNull();
      }
    }
  });
});

describe('outils', () => {
  it('estime le 1RM (Epley)', () => {
    expect(estimate1RM(100, 1)).toBe(100);
    expect(Math.round(estimate1RM(60, 8))).toBe(76);
  });
  it('calcule calories et protéines cohérentes', () => {
    const r = computeNutrition({ sex: 'homme', age: 30, weightKg: 80, heightCm: 180, activity: 'modere', goal: 'maintien' });
    expect(r.calories).toBeGreaterThan(2400);
    expect(r.calories).toBeLessThan(3100);
    expect(r.protein).toBeGreaterThanOrEqual(80);
  });
});
