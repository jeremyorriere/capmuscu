import { describe, expect, it } from 'vitest';
import { restartTemplate, type SavedSessionTemplate } from '../src/lib/session-templates';

const template: SavedSessionTemplate = {
  id: 'template-1',
  params: { goal: 'muscle', zones: ['haut-du-corps'], equipment: 'salle', duration: 45 },
  items: [{ exerciseId: 'developpe-couche', sets: 4, reps: '8 à 12', restSeconds: 90 }],
  createdAt: '2026-01-01T10:00:00.000Z',
  done: [true],
  sets: [4],
  weights: [60],
  setDetails: [[{ reps: 8, weight: 60 }]],
};

describe('modèles de séance', () => {
  it('relance un modèle sans progression ancienne et conserve les préférences', () => {
    const restarted = restartTemplate(template, '2026-02-01T10:00:00.000Z');
    expect(restarted).toMatchObject({
      id: 'template-1',
      createdAt: '2026-02-01T10:00:00.000Z',
      done: [],
      sets: [],
      weights: [60],
      setDetails: [],
      params: template.params,
      items: template.items,
    });
    expect(template.done).toEqual([true]);
    expect(template.setDetails).toEqual([[{ reps: 8, weight: 60 }]]);
    expect(restarted.items).not.toBe(template.items);
  });
});
