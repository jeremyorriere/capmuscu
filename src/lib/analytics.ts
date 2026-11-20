export type AnalyticsEventType =
  | 'page_view'
  | 'exercise_view'
  | 'session_generated'
  | 'session_completed'
  | 'exercise_swap'
  | 'calculator_used';

const CONSENT_KEY = 'capmuscu-analytics-consent';
const VISITOR_KEY = 'capmuscu-analytics-visitor';

function visitorId(): string | null {
  try {
    const saved = localStorage.getItem(VISITOR_KEY);
    if (saved && /^[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}$/i.test(saved)) return saved;
    const created = crypto.randomUUID();
    localStorage.setItem(VISITOR_KEY, created);
    return created;
  } catch {
    return null;
  }
}

export function trackAnalytics(type: AnalyticsEventType, entityIds: string[] = []): void {
  try {
    if (localStorage.getItem(CONSENT_KEY) !== 'accepted') return;
  } catch {
    return;
  }

  const id = visitorId();
  if (!id) return;

  void fetch('/api/analytics', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ visitorId: id, consent: true, type, entityIds }),
    keepalive: true,
  }).then((response) => {
    if (!response.ok) console.warn('CapMuscu : envoi des statistiques indisponible.');
  }).catch(() => {
    console.warn('CapMuscu : envoi des statistiques indisponible.');
  });
}

export function ensureAnalyticsVisitor(): string | null {
  return visitorId();
}

export function getAnalyticsConsent(): 'accepted' | 'rejected' | null {
  try {
    const consent = localStorage.getItem(CONSENT_KEY);
    return consent === 'accepted' || consent === 'rejected' ? consent : null;
  } catch {
    return null;
  }
}

export function setAnalyticsConsent(consent: 'accepted' | 'rejected'): void {
  localStorage.setItem(CONSENT_KEY, consent);
}

export function clearAnalyticsVisitor(): void {
  localStorage.removeItem(VISITOR_KEY);
}

export function currentAnalyticsVisitor(): string | null {
  try {
    return localStorage.getItem(VISITOR_KEY);
  } catch {
    return null;
  }
}
