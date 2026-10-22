/**
 * Utility for parsing and formatting UTC timestamps into accurate Indian Standard Time (IST) / local time
 * and human-friendly relative durations.
 */

export function parseUtcDate(dateStr?: string | Date | null): Date | null {
  if (!dateStr) return null;
  if (dateStr instanceof Date) {
    return isNaN(dateStr.getTime()) ? null : dateStr;
  }
  let s = dateStr.trim();
  if (!s) return null;

  // If it looks like an ISO date without timezone ('2026-10-22T12:00:00' or '2026-10-22 12:00:00'),
  // treat it as UTC by appending 'Z'
  if (s.includes(' ')) {
    s = s.replace(' ', 'T');
  }
  if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(s) && !s.endsWith('Z') && !/[+-]\d{2}:\d{2}$/.test(s)) {
    s += 'Z';
  }

  const d = new Date(s);
  return isNaN(d.getTime()) ? null : d;
}

/**
 * Returns formatted local time string, e.g. "05:45 PM"
 */
export function formatLocalTime(dateStr?: string | Date | null): string {
  const d = parseUtcDate(dateStr);
  if (!d) return 'अभी';
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true });
}

/**
 * Returns formatted local date string, e.g. "22 Oct 2026"
 */
export function formatLocalDate(dateStr?: string | Date | null): string {
  const d = parseUtcDate(dateStr);
  if (!d) return '';
  return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

/**
 * Returns human-friendly relative duration, e.g. "अभी (Just now)", "5 मिनट पहले (5m ago)", "2 घंटे पहले (2h ago)", "1 दिन पहले (1d ago)"
 */
export function formatRelativeDuration(dateStr?: string | Date | null): string {
  const d = parseUtcDate(dateStr);
  if (!d) return 'अभी (Just now)';

  const now = Date.now();
  let diffMs = now - d.getTime();
  // Handle minor clock skew between server and client
  if (diffMs < 0 && diffMs > -60000) {
    diffMs = 0;
  }

  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMins < 1) {
    return 'अभी (Just now)';
  }
  if (diffMins < 60) {
    return `${diffMins} मिनट पहले (${diffMins}m ago)`;
  }
  if (diffHours < 24) {
    return `${diffHours} घंटे पहले (${diffHours}h ago)`;
  }
  if (diffDays === 1) {
    return 'कल (Yesterday)';
  }
  if (diffDays < 7) {
    return `${diffDays} दिन पहले (${diffDays}d ago)`;
  }
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

/**
 * Returns a complete composite timestamp with date, time and relative duration.
 * Example: "आज, 05:45 PM • 2 मिनट पहले (2m ago)"
 */
export function formatFullNotificationTimestamp(dateStr?: string | Date | null): {
  date: string;
  time: string;
  duration: string;
  display: string;
} {
  const d = parseUtcDate(dateStr);
  if (!d) {
    return {
      date: 'आज',
      time: 'अभी',
      duration: 'अभी (Just now)',
      display: 'अभी (Just now)'
    };
  }

  const time = d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true });
  const date = d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
  const duration = formatRelativeDuration(d);

  // Check if it's today
  const today = new Date();
  const isToday = d.getDate() === today.getDate() && 
                  d.getMonth() === today.getMonth() && 
                  d.getFullYear() === today.getFullYear();

  const datePrefix = isToday ? 'आज' : date;
  const display = `${datePrefix}, ${time} • ${duration}`;

  return { date, time, duration, display };
}
