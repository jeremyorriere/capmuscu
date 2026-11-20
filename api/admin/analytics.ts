import { isAdminSession } from '../../src/lib/server/admin-auth';
import { listPrivateBlobs } from '../../src/lib/server/storage';
import { jsonResponse, type ServerEnv } from '../../src/lib/server/analytics';

interface EventRecord {
  date: string;
  type: string;
  visitor: string;
  eventId: string;
  entityId: string;
}

const eventTypes = new Set([
  'page_view',
  'exercise_view',
  'session_generated',
  'session_completed',
  'exercise_swap',
  'calculator_used',
]);

function eventFromPath(pathname: string): EventRecord | null {
  const parts = pathname.split('/');
  if (parts.length !== 7 || parts[0] !== 'analytics' || parts[1] !== 'events') return null;
  const [, , date, type, visitor, eventId, filename] = parts;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date!) || !eventTypes.has(type!) ||
      !/^[a-f0-9]{64}$/.test(visitor!) || !/^[0-9a-f-]{36}$/i.test(eventId!) ||
      !filename!.endsWith('.json')) return null;
  try {
    return { date: date!, type: type!, visitor: visitor!, eventId: eventId!, entityId: decodeURIComponent(filename!.slice(0, -5)) };
  } catch {
    return null;
  }
}

function emptyDaily(date: string) {
  return { event_date: date, visitors: new Set<string>(), pageViews: 0, sessionsGenerated: new Set<string>(), sessionsCompleted: new Set<string>() };
}

export async function GET(request: Request): Promise<Response> {
  const env = process.env as ServerEnv;
  if (request.method !== 'GET') return jsonResponse(405, { error: 'Méthode non autorisée.' });
  if (!env.ADMIN_AUTH_SECRET || !(await isAdminSession(request, env.ADMIN_AUTH_SECRET))) {
    return jsonResponse(401, { error: 'Accès admin requis.' });
  }

  try {
    const now = new Date();
    const today = now.toISOString().slice(0, 10);
    const monthStart = `${today.slice(0, 7)}-01`;
    const yearStart = `${today.slice(0, 4)}-01-01`;
    const monthStarts = Array.from({ length: 13 }, (_, index) =>
      new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - index, 1)).toISOString().slice(0, 7),
    );
    const blobs = (await Promise.all(monthStarts.map((month) =>
      listPrivateBlobs(`analytics/events/${month}-`),
    ))).flat();
    const events = blobs.map((blob) => eventFromPath(blob.pathname)).filter((event): event is EventRecord => event !== null);
    const filtered = events.filter((event) => event.date >= monthStarts[12]! + '-01');
    const allVisitors = (from: string) => new Set(filtered.filter((event) => event.date >= from).map((event) => event.visitor)).size;
    const sessionCount = (type: 'session_generated' | 'session_completed', from: string) =>
      new Set(filtered.filter((event) => event.date >= from && event.type === type).map((event) =>
        `${event.date}:${event.visitor}:${event.eventId}`,
      )).size;
    const visitorsToday = new Set(filtered.filter((event) => event.date === today).map((event) => event.visitor)).size;
    const viewsToday = filtered.filter((event) => event.date === today && event.type === 'page_view').length;
    const daily = new Map<string, ReturnType<typeof emptyDaily>>();
    for (let offset = 0; offset < 30; offset += 1) {
      const date = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - offset)).toISOString().slice(0, 10);
      daily.set(date, emptyDaily(date));
    }
    const monthly = new Map(monthStarts.map((month) => [month, { month, visitors: new Set<string>(), page_views: 0 }]));
    const exerciseStats = new Map<string, { views: number; generated: Set<string>; completed: Set<string>; replacements: number }>();
    const pageStats = new Map<string, number>();
    const toolStats = new Map<string, number>();

    for (const event of filtered) {
      const month = monthly.get(event.date.slice(0, 7));
      if (month) {
        month.visitors.add(event.visitor);
        if (event.type === 'page_view') month.page_views += 1;
      }
      const day = daily.get(event.date);
      day?.visitors.add(event.visitor);
      if (day && event.type === 'page_view') day.pageViews += 1;
      if (day && event.type === 'session_generated') day.sessionsGenerated.add(`${event.visitor}:${event.eventId}`);
      if (day && event.type === 'session_completed') day.sessionsCompleted.add(`${event.visitor}:${event.eventId}`);

      if (event.type === 'page_view') pageStats.set(event.entityId, (pageStats.get(event.entityId) ?? 0) + 1);
      if (event.type === 'calculator_used') toolStats.set(event.entityId, (toolStats.get(event.entityId) ?? 0) + 1);
      if (['exercise_view', 'session_generated', 'session_completed', 'exercise_swap'].includes(event.type)) {
        const stats = exerciseStats.get(event.entityId) ?? { views: 0, generated: new Set<string>(), completed: new Set<string>(), replacements: 0 };
        if (event.type === 'exercise_view') stats.views += 1;
        if (event.type === 'session_generated') stats.generated.add(`${event.visitor}:${event.eventId}`);
        if (event.type === 'session_completed') stats.completed.add(`${event.visitor}:${event.eventId}`);
        if (event.type === 'exercise_swap') stats.replacements += 1;
        exerciseStats.set(event.entityId, stats);
      }
    }

    const exercises = [...exerciseStats].map(([entity_id, stats]) => ({
      entity_id, views: stats.views, generated: stats.generated.size, completed: stats.completed.size, replacements: stats.replacements,
    })).sort((a, b) => b.views + b.generated + b.completed + b.replacements - (a.views + a.generated + a.completed + a.replacements)).slice(0, 20);
    const pages = [...pageStats].map(([entity_id, views]) => ({ entity_id, views }))
      .sort((a, b) => b.views - a.views).slice(0, 12);
    const tools = [...toolStats].map(([entity_id, uses]) => ({ entity_id, uses }))
      .sort((a, b) => b.uses - a.uses);

    return jsonResponse(200, {
      generatedAt: now.toISOString(),
      retentionMonths: 13,
      summary: {
        visitors_today: visitorsToday,
        visitors_month: allVisitors(monthStart),
        visitors_year: allVisitors(yearStart),
        views_today: viewsToday,
        sessions_month: sessionCount('session_generated', monthStart),
        completed_month: sessionCount('session_completed', monthStart),
      },
      daily: [...daily.values()].reverse().map((day) => ({
        event_date: day.event_date,
        visitors: day.visitors.size,
        page_views: day.pageViews,
        sessions_generated: day.sessionsGenerated.size,
        sessions_completed: day.sessionsCompleted.size,
      })),
      monthly: [...monthly.values()].reverse().map((month) => ({
        month: month.month, visitors: month.visitors.size, page_views: month.page_views,
      })),
      exercises,
      pages,
      tools,
    });
  } catch {
    console.error('CapMuscu: private analytics listing failed.');
    return jsonResponse(503, { error: 'Impossible de charger les statistiques.' });
  }
}
