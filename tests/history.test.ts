import { describe, expect, it } from 'vitest';
import { buildExport, loadProgress, mergeEntries, needsExportReminder, parseExport, totalSets, type HistoryEntry } from '../src/lib/history';

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
  });

  it('compte les séries faites', () => {
    expect(totalSets([entry('1', '2026-01-01T10:00:00Z', 40, 3), entry('2', '2026-01-02T10:00:00Z', 40, 2)])).toBe(5);
  });

  it('propose un rappel d\'export après 4 séances non sauvegardées', () => {
    const list = ['1', '2', '3', '4'].map((i) => entry(i, `2026-01-0${i}T10:00:00Z`));
    expect(needsExportReminder(list, null)).toBe(true);
    expect(needsExportReminder(list, '2026-01-10T00:00:00Z')).toBe(false);
    expect(needsExportReminder([], null)).toBe(false);
  });
});
