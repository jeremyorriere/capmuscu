import { describe, expect, it } from 'vitest';
import exercisesJson from '../src/data/exercises.json';
import musclesJson from '../src/data/muscles.json';
import recipesJson from '../src/data/recipes.json';
import newsJson from '../src/data/news.json';
import { exercises, getCombos, exerciseWordCount, wordCount } from '../src/lib/data';

const MIN_WORDS = 105;
const filled = (v: unknown): boolean => {
  if (typeof v === 'string') return v.trim().length > 0;
  if (Array.isArray(v)) return v.length > 0 && v.every(filled);
  return v !== null && v !== undefined;
};

describe('exercises.json', () => {
  it('contient   au moins 900 exercices', () => {
      expect(exercisesJson.length).toBeGreaterThanOrEqual(900);
  });

  it('a des identifiants et slugs uniques, valides et cohérents', () => {
    const ids = new Set(exercises.map((e) => e.id));
    const slugs = new Set(exercises.map((e) => e.slug));
    expect(ids.size).toBe(exercises.length);
    expect(slugs.size).toBe(exercises.length);
    for (const e of exercises) {
      expect(e.slug).toMatch(/^[a-z0-9]+(-[a-z0-9]+)*$/);
      expect(e.id).toBe(e.slug);
    }
  });

  it("n'a aucun champ vide et respecte la structure", () => {
    const keys = ['id', 'slug', 'name', 'description', 'primaryMuscle', 'secondaryMuscles', 'equipment', 'difficulty', 'mechanics', 'executionSteps', 'safetyTips', 'commonMistakes', 'alternatives'];
    for (const e of exercises) {
      expect(Object.keys(e).filter((k) => k !== 'images' && k !== 'category').sort()).toEqual([...keys].sort());
      for (const k of keys) {
        if (k === 'secondaryMuscles') {
          expect(Array.isArray(e.secondaryMuscles)).toBe(true);
          expect(e.secondaryMuscles.every(filled)).toBe(true);
        } else {
          expect(filled((e as unknown as Record<string, unknown>)[k]), `${e.id}.${k}`).toBe(true);
        }
      }
      expect(['Débutant', 'Intermédiaire', 'Avancé']).toContain(e.difficulty);
      expect(['Polyarticulaire', 'Isolation']).toContain(e.mechanics);
      expect(['Salle de sport', 'Haltères', 'Poids du corps', 'Kettlebell', 'Élastiques', 'Accessoires']).toContain(e.equipment);
      if (e.category) expect(['Étirement', 'Cardio']).toContain(e.category);
      expect(e.executionSteps.length).toBeGreaterThanOrEqual(4);
    }
  });

  it('référence des muscles principaux existants', () => {
    const names = new Set(musclesJson.muscles.map((m) => m.name));
    for (const e of exercises) expect(names.has(e.primaryMuscle), `${e.id}: ${e.primaryMuscle}`).toBe(true);
    for (const m of musclesJson.muscles) expect(exercises.some((e) => e.primaryMuscle === m.name), m.name).toBe(true);
  });

  it('a des alternatives valides (existantes, distinctes, même muscle principal)', () => {
    for (const e of exercises) {
      expect(e.alternatives.length, e.id).toBeGreaterThanOrEqual(2);
      expect(new Set(e.alternatives).size).toBe(e.alternatives.length);
      for (const id of e.alternatives) {
        const alt = exercises.find((x) => x.id === id);
        expect(alt, `${e.id} -> ${id}`).toBeDefined();
        expect(id).not.toBe(e.id);
        expect(alt!.primaryMuscle).toBe(e.primaryMuscle);
      }
    }
  });

  it('propose des alternatives de même catégorie pour les étirements quand elles existent', () => {
    for (const e of exercises.filter((exercise) => exercise.category === 'Étirement')) {
      const stretchOptions = exercises.filter((candidate) =>
        candidate.id !== e.id && candidate.primaryMuscle === e.primaryMuscle && candidate.category === e.category,
      );
      if (stretchOptions.length < 2) continue;
      for (const id of e.alternatives) {
        expect(exercises.find((candidate) => candidate.id === id)?.category, `${e.id} -> ${id}`).toBe(e.category);
      }
    }
  });

  it('a au moins trois conseils de sécurité distincts par exercice', () => {
    for (const e of exercises) {
      expect(e.safetyTips.length, e.id).toBeGreaterThanOrEqual(3);
      expect(new Set(e.safetyTips.map((tip) => tip.trim().toLocaleLowerCase('fr-FR'))).size, e.id).toBe(e.safetyTips.length);
    }
  });

  it(`a un contenu SEO d'au moins ${MIN_WORDS} mots par exercice`, () => {
    for (const e of exercises) expect(exerciseWordCount(e), e.id).toBeGreaterThanOrEqual(MIN_WORDS);
  });

  it('dépasse 150 mots de contenu utile par fiche (contenu + présentation du muscle)', () => {
    for (const e of exercises) {
      const m = musclesJson.muscles.find((x) => x.name === e.primaryMuscle)!;
      expect(exerciseWordCount(e) + wordCount(`${m.description} ${m.benefit}`), e.id).toBeGreaterThan(150);
    }
  });

  it('a des descriptions uniques', () => {
    expect(new Set(exercises.map((e) => e.description)).size).toBe(exercises.length);
  });

  it('couvre chaque muscle avec du matériel de salle, haltères et poids du corps', () => {
    for (const m of musclesJson.muscles) {
      const list = exercises.filter((e) => e.primaryMuscle === m.name);
      expect(list.some((e) => e.equipment === 'Poids du corps'), `${m.name} poids du corps`).toBe(true);
      expect(list.filter((e) => e.equipment !== 'Salle de sport').length, `${m.name} haltères/corps`).toBeGreaterThanOrEqual(2);
    }
  });

  it('génère des pages croisées sans collision avec les slugs des exercices', () => {
    const combos = getCombos();
    expect(combos.length).toBeGreaterThan(10);
    const slugs = new Set(exercises.map((e) => e.slug));
    for (const c of combos) expect(slugs.has(c.slug), c.slug).toBe(false);
    expect(new Set(combos.map((c) => c.slug)).size).toBe(combos.length);
  });
});

describe('muscles.json', () => {
  it('a des muscles et zones complets et cohérents', () => {
    for (const m of musclesJson.muscles) {
      expect(filled(m.slug) && filled(m.name) && filled(m.description) && filled(m.benefit)).toBe(true);
      expect(wordCount(m.description)).toBeGreaterThanOrEqual(25);
    }
    const slugs = new Set(musclesJson.muscles.map((m) => m.slug));
    for (const z of musclesJson.zones) for (const s of z.muscles) expect(slugs.has(s), `${z.slug}:${s}`).toBe(true);
  });
});

describe('recipes.json', () => {
  it('contient 3 exemples complets', () => {
    expect(recipesJson.recipes.length).toBeGreaterThanOrEqual(3);
    for (const r of recipesJson.recipes) {
      expect(filled(r.name) && filled(r.slug) && filled(r.description) && filled(r.ingredients) && filled(r.steps)).toBe(true);
      expect(r.proteinGrams).toBeGreaterThan(0);
    }
  });
});

describe('news.json', () => {
  it('a une date de mise à jour et des éléments valides', () => {
    expect(Number.isNaN(Date.parse(newsJson.updatedAt))).toBe(false);
    expect(newsJson.items.length).toBeGreaterThan(0);
    for (const n of newsJson.items) {
      expect(filled(n.title) && filled(n.summary) && filled(n.source)).toBe(true);
      expect(n.url).toMatch(/^https:\/\//);
      expect(['etude', 'actu']).toContain(n.type);
    }
  });
});
