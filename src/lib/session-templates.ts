import type { SetDetail } from './history';
import type { SessionItem, SessionParams } from './session';

export interface SavedSessionTemplate {
  id: string;
  params: SessionParams;
  items: SessionItem[];
  createdAt: string;
  done?: boolean[];
  sets?: number[];
  weights?: number[];
  setDetails?: SetDetail[][];
}

export function restartTemplate<T extends SavedSessionTemplate>(template: T, createdAt = new Date().toISOString()): T {
  return {
    ...template,
    params: { ...template.params, zones: [...template.params.zones] },
    items: template.items.map((item) => ({ ...item })),
    createdAt,
    done: [],
    sets: [],
    weights: [...(template.weights ?? [])],
    setDetails: [],
  };
}
