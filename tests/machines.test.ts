import { describe, expect, it } from 'vitest';
import { gymMachines } from '../src/data/gym-machines';
import { exercises } from '../src/lib/data';

describe('gym machine directory', () => {
  it('lists every machine from the gym checklist', () => {
    expect(gymMachines).toHaveLength(34);
    expect(new Set(gymMachines.map((machine) => machine.name)).size).toBe(34);
  });

  it('links only to exercise fiches that exist', () => {
    const slugs = new Set(exercises.map((exercise) => exercise.slug));
    for (const machine of gymMachines) {
      expect(machine.searchTerms.length, machine.name).toBeGreaterThan(0);
      if (machine.exerciseSlug) expect(slugs.has(machine.exerciseSlug), machine.name).toBe(true);
    }
  });
});
