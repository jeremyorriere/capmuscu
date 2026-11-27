import { describe, expect, it } from 'vitest';
import { buildExport, isEntry, loadProgress, mergeEntries, needsExportReminder, parseExport, totalLoadVolume, totalSets, type HistoryEntry } from '../src/lib/history';

const entry = (id: string, date: string, weight?: number, setsDone = 3): HistoryEntry => ({
  id, date, title: 'Séance test',
  items: [{ exerciseId: 'ex1', name: 'Développé couché', muscle: 'Pectoraux', sets: 3, setsDone, reps: '8 à 12', weight }],
});

describe('historique', () => {
  it('fusionne sans doublon, du plus récent au plus ancien', () => {
    const a = entry('1', '2026-01-01T10:00:00Z');
    const b = entry('2', '2026-02-01T10:00:00Z');
    const merged = mergeEntries([a], [a, b]);
    expect(merged.map((e) => e.id)).toEqual(['2', '1']);
  });

  it('export puis import redonne les mêmes séances', () => {
    const entries = [entry('1', '2026-01-01T10:00:00Z', 40)];
    expect(parseExport(JSON.stringify(buildExport(entries)))).toEqual(entries);
  });

  it('refuse un fichier invalide', () => {
    expect(parseExport('pas du json')).toBeNull();
    expect(parseExport('{"app":"autre","entries":[]}')).toBeNull();
    expect(parseExport(JSON.stringify({ app: 'capmuscu', entries: [{ id: 1 }] }))).toBeNull();
  });

  it('calcule la progression des charges dans l\'ordre chronologique', () => {
    const p = loadProgress([entry('2', '2026-02-01T10:00:00Z', 45), entry('1', '2026-01-01T10:00:00Z', 40), entry('3', '2026-03-01T10:00:00Z')]);
    expect(p).toHaveLength(1);
    expect(p[0]!.points.map((x) => x.weight)).toEqual([40, 45]);
    expect(p[0]).toMatchObject({ bestWeight: 45, totalSets: 6, loadVolume: 0 });
  });

  it('compte les séries faites', () => {
    expect(totalSets([entry('1', '2026-01-01T10:00:00Z', 40, 3), entry('2', '2026-01-02T10:00:00Z', 40, 2)])).toBe(5);
  });

  it('calcule le volume à partir des répétitions et charges de chaque série', () => {
    const training = entry('1', '2026-01-01T10:00:00Z');
    training.items[0]!.setDetails = [
      { reps: 10, weight: 40 },
      { reps: 8, weight: 42.5 },
      { reps: 7 },
    ];
    expect(totalLoadVolume([training])).toBe(740);
    expect(loadProgress([training])[0]).toMatchObject({ bestWeight: 42.5, totalSets: 2, loadVolume: 740 });
  });

  it('accepte les anciens historiques et rejette les détails de série invalides', () => {
    const old = entry('1', '2026-01-01T10:00:00Z', 40);
    expect(isEntry(old)).toBe(true);
    expect(isEntry({ ...old, items: [{ ...old.items[0], setDetails: [{ reps: 0 }] }] })).toBe(false);
    expect(isEntry({ ...old, items: [{ ...old.items[0], setDetails: [null] }] })).toBe(false);
  });

  it('propose un rappel d\'export après 4 séances non sauvegardées', () => {
    const list = ['1', '2', '3', '4'].map((i) => entry(i, `2026-01-0${i}T10:00:00Z`));
    expect(needsExportReminder(list, null)).toBe(true);
    expect(needsExportReminder(list, '2026-01-10T00:00:00Z')).toBe(false);
    expect(needsExportReminder([], null)).toBe(false);
  });
});
