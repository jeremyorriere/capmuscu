import { describe, expect, it } from 'vitest';
import { existsSync, statSync } from 'node:fs';
import { join } from 'node:path';
import mediaJson from '../src/data/exercise-media.json';
import { exercises } from '../src/lib/data';
import { bodyMapSvg } from '../src/lib/bodymap';
import { motionHtml, movementSchema } from '../src/lib/motion';
import { icon, ZONE_ICON } from '../src/lib/icons';
import { levelHue, muscleHue } from '../src/lib/ui';


const publicDir = join(__dirname, '..', 'public');

describe('images des exercices', () => {
  const withImages = exercises.filter((e) => e.images);

  it('référence deux images locales existantes et non vides', () => {
    expect(withImages.length).toBeGreaterThan(0);
    for (const e of withImages) {
      expect(e.images, e.id).toHaveLength(2);
      for (const p of e.images!) {
        expect(p.startsWith('/images/exercises/'), `${e.id}: ${p}`).toBe(true);
        const file = join(publicDir, p);
        expect(existsSync(file), `image manquante : ${p}`).toBe(true);
        expect(statSync(file).size, p).toBeGreaterThan(1000);
      }
    }
  });

  it('le mapping free-exercise-db ne cite que des exercices existants', () => {
    const ids = new Set(exercises.map((e) => e.id));
    const mapping = (mediaJson as { mapping?: Record<string, string> }).mapping ?? (mediaJson as Record<string, string>);
    for (const id of Object.keys(mapping)) expect(ids.has(id), id).toBe(true);
  });
});

describe('composants visuels', () => {
  it('les badges ont une teinte pour chaque muscle et niveau', () => {
    expect(new Set(exercises.map((e) => muscleHue(e.primaryMuscle))).size).toBeGreaterThanOrEqual(10);
    expect(new Set(['Débutant', 'Intermédiaire', 'Avancé'].map(levelHue)).size).toBe(3);
  });

  it('les icônes Lucide sont des SVG décoratifs', () => {
    for (const name of Object.values(ZONE_ICON)) expect(icon(name)).toMatch(/^<svg aria-hidden="true"/);
  });

  it('la silhouette propose des infobulles pour chaque muscle', () => {
    expect(bodyMapSvg('Dos')).toContain('<title>Dorsaux</title>');
  });

  it('la silhouette distingue muscle principal et secondaires, avec légende', () => {
    const svg = bodyMapSvg('Pectoraux', ['Triceps', 'Épaules']);
    expect(svg).toContain('bm-p');
    expect(svg).toContain('bm-s');
    expect(svg).toContain('Muscle principal');
    expect(svg).toContain('Muscles secondaires');
  });

  it('chaque exercice a un repli vectoriel, avec ou sans photos', () => {
    for (const e of exercises) {
      expect(movementSchema(e)).toContain('cm-schema');
      const html = motionHtml(e);
      expect(html).toContain('data-motion-toggle');
      expect(html).toContain('cm-fallback');
      expect(html.includes('<img')).toBe(Boolean(e.images));
    }
  });
});
