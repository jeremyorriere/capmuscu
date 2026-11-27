export const KEY_HISTORY = 'capmuscu-historique';
export const KEY_LAST_EXPORT = 'capmuscu-dernier-export';
export const EXPORT_REMINDER_EVERY = 4;

export interface SetDetail {
  reps?: number;
  weight?: number;
}

export interface HistoryItem {
  exerciseId: string;
  name: string;
  muscle: string;
  sets: number;
  setsDone: number;
  reps: string;
  weight?: number;
  setDetails?: SetDetail[];
}

export interface HistoryEntry {
  id: string;
  date: string;
  title: string;
  items: HistoryItem[];
}

export interface HistoryFile {
  app: 'capmuscu';
  version: 1;
  exportedAt: string;
  entries: HistoryEntry[];
}

const isItem = (x: unknown): x is HistoryItem => {
  const i = x as HistoryItem;
  return !!i && typeof i.exerciseId === 'string' && typeof i.name === 'string' && typeof i.muscle === 'string'
    && Number.isFinite(i.sets) && Number.isFinite(i.setsDone) && typeof i.reps === 'string'
    && (i.weight === undefined || Number.isFinite(i.weight))
    && (i.setDetails === undefined || (Array.isArray(i.setDetails) && i.setDetails.length <= i.sets
      && i.setDetails.every((set: unknown) => {
        if (!set || typeof set !== 'object') return false;
        const detail = set as SetDetail;
        return (detail.reps === undefined || (Number.isInteger(detail.reps) && detail.reps > 0))
          && (detail.weight === undefined || (Number.isFinite(detail.weight) && detail.weight >= 0));
      })));
};

export const isEntry = (x: unknown): x is HistoryEntry => {
  const e = x as HistoryEntry;
  return !!e && typeof e.id === 'string' && typeof e.title === 'string' && !Number.isNaN(Date.parse(e.date))
    && Array.isArray(e.items) && e.items.every(isItem);
};

/** Ajoute des séances sans doublon (même id), triées de la plus récente à la plus ancienne. */
export function mergeEntries(current: HistoryEntry[], incoming: HistoryEntry[]): HistoryEntry[] {
  const byId = new Map<string, HistoryEntry>();
  for (const e of [...current, ...incoming]) byId.set(e.id, e);
  return [...byId.values()].sort((a, b) => Date.parse(b.date) - Date.parse(a.date));
}

export function buildExport(entries: HistoryEntry[], now = new Date()): HistoryFile {
  return { app: 'capmuscu', version: 1, exportedAt: now.toISOString(), entries };
}

/** Lit un fichier d'export ; renvoie null si le contenu n'est pas valide. */
export function parseExport(text: string): HistoryEntry[] | null {
  try {
    const data = JSON.parse(text) as Partial<HistoryFile>;
    if (data?.app !== 'capmuscu' || !Array.isArray(data.entries)) return null;
    return data.entries.every(isEntry) ? data.entries : null;
  } catch {
    return null;
  }
}

export interface ExerciseProgress {
  exerciseId: string;
  name: string;
  points: { date: string; weight: number; setsDone: number; reps?: number }[];
  bestWeight: number;
  totalSets: number;
  loadVolume: number;
}

interface ExerciseProgressDraft {
  exerciseId: string;
  name: string;
  points: ExerciseProgress['points'];
}

/** Évolution de la meilleure charge enregistrée par exercice et volume calculable, du plus ancien au plus récent. */
export function loadProgress(entries: HistoryEntry[]): ExerciseProgress[] {
  const map = new Map<string, ExerciseProgressDraft>();
  for (const e of [...entries].sort((a, b) => Date.parse(a.date) - Date.parse(b.date))) {
    for (const it of e.items) {
      const details = it.setDetails?.slice(0, it.setsDone) ?? [];
      const weightedSets = details.filter((set) => set.weight !== undefined && set.weight > 0);
      const legacyWeight = it.weight !== undefined && it.weight > 0 ? it.weight : undefined;
      if (weightedSets.length === 0 && legacyWeight === undefined) continue;
      const p = map.get(it.exerciseId) ?? { exerciseId: it.exerciseId, name: it.name, points: [] };
      if (weightedSets.length > 0) {
        const bestSet = weightedSets.reduce((best, set) => set.weight! > best.weight! ? set : best);
        p.points.push({
          date: e.date,
          weight: bestSet.weight!,
          setsDone: weightedSets.length,
          ...(bestSet.reps !== undefined ? { reps: bestSet.reps } : {}),
        });
      } else {
        p.points.push({ date: e.date, weight: legacyWeight!, setsDone: it.setsDone });
      }
      map.set(it.exerciseId, p);
    }
  }
  return [...map.values()].map((progress) => ({
    ...progress,
    bestWeight: Math.max(...progress.points.map((point) => point.weight)),
    totalSets: progress.points.reduce((total, point) => total + point.setsDone, 0),
    loadVolume: entries.reduce((total, entry) => total + entry.items.reduce((subtotal, item) => {
      if (item.exerciseId !== progress.exerciseId) return subtotal;
      return subtotal + (item.setDetails ?? []).slice(0, item.setsDone).reduce(
        (setTotal, set) => set.weight !== undefined && set.reps !== undefined ? setTotal + set.weight * set.reps : setTotal,
        0,
      );
    }, 0), 0),
  })).sort((a, b) => b.points.length - a.points.length);
}

export function totalSets(entries: HistoryEntry[]): number {
  return entries.reduce((n, e) => n + e.items.reduce((m, i) => m + i.setsDone, 0), 0);
}

/** Volume calculé à partir des séries pour lesquelles charge et répétitions sont connues. */
export function totalLoadVolume(entries: HistoryEntry[]): number {
  return entries.reduce((total, entry) => total + entry.items.reduce(
    (subtotal, item) => subtotal + (item.setDetails ?? []).slice(0, item.setsDone).reduce(
      (setTotal, set) => set.weight !== undefined && set.reps !== undefined ? setTotal + set.weight * set.reps : setTotal,
      0,
    ),
    0,
  ), 0);
}

/** Nombre de semaines distinctes (lundi-dimanche) avec au moins une séance sur les 4 dernières. */
export function recentWeeks(entries: HistoryEntry[], now = new Date()): number {
  const weekOf = (d: Date) => Math.floor((d.getTime() - new Date(2024, 0, 1).getTime()) / (7 * 864e5));
  const current = weekOf(now);
  const weeks = new Set(entries.map((e) => weekOf(new Date(e.date))).filter((w) => current - w >= 0 && current - w < 4));
  return weeks.size;
}

export function needsExportReminder(entries: HistoryEntry[], lastExport: string | null): boolean {
  if (entries.length === 0) return false;
  const since = lastExport ? entries.filter((e) => Date.parse(e.date) > Date.parse(lastExport)).length : entries.length;
  return since >= EXPORT_REMINDER_EVERY;
}
