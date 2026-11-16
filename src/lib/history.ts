export const KEY_HISTORY = 'capmuscu-historique';
export const KEY_LAST_EXPORT = 'capmuscu-dernier-export';
export const EXPORT_REMINDER_EVERY = 4;

export interface HistoryItem {
  exerciseId: string;
  name: string;
  muscle: string;
  sets: number;
  setsDone: number;
  reps: string;
  weight?: number;
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
    && (i.weight === undefined || Number.isFinite(i.weight));
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
  points: { date: string; weight: number }[];
}

/** Évolution de la charge par exercice (au moins une charge saisie), du plus ancien au plus récent. */
export function loadProgress(entries: HistoryEntry[]): ExerciseProgress[] {
  const map = new Map<string, ExerciseProgress>();
  for (const e of [...entries].sort((a, b) => Date.parse(a.date) - Date.parse(b.date))) {
    for (const it of e.items) {
      if (it.weight === undefined || it.weight <= 0 || it.setsDone === 0) continue;
      const p = map.get(it.exerciseId) ?? { exerciseId: it.exerciseId, name: it.name, points: [] };
      p.points.push({ date: e.date, weight: it.weight });
      map.set(it.exerciseId, p);
    }
  }
  return [...map.values()].sort((a, b) => b.points.length - a.points.length);
}

export function totalSets(entries: HistoryEntry[]): number {
  return entries.reduce((n, e) => n + e.items.reduce((m, i) => m + i.setsDone, 0), 0);
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
