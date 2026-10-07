/**
 * Time and Duration Utilities for DevOps Deployment Workflows.
 * Provides human-friendly relative times, duration calculations,
 * live timers, and estimated time remaining (ETA).
 */

export function parseDate(dateInput) {
  if (!dateInput) return null;
  if (dateInput instanceof Date) return isNaN(dateInput.getTime()) ? null : dateInput;

  let str = String(dateInput).trim();
  // Ensure UTC parsing when timezone offset is not specified in ISO string
  if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(str) && !str.endsWith('Z') && !/[+-]\d{2}:\d{2}$/.test(str)) {
    str += 'Z';
  } else if (/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}/.test(str)) {
    str = str.replace(' ', 'T') + 'Z';
  }

  const d = new Date(str);
  return isNaN(d.getTime()) ? null : d;
}

/**
 * Returns human-readable relative time (e.g., "Just now", "2m ago", "1h ago").
 */
export function formatRelativeTime(dateInput) {
  const date = parseDate(dateInput);
  if (!date) return '—';

  const now = new Date();
  const diffInSeconds = Math.max(0, Math.floor((now.getTime() - date.getTime()) / 1000));

  if (diffInSeconds < 30) return 'Just now';
  if (diffInSeconds < 60) return `${diffInSeconds}s ago`;

  const diffInMinutes = Math.floor(diffInSeconds / 60);
  if (diffInMinutes < 60) return `${diffInMinutes}m ago`;

  const diffInHours = Math.floor(diffInMinutes / 60);
  if (diffInHours < 24) return `${diffInHours}h ago`;

  const diffInDays = Math.floor(diffInHours / 24);
  if (diffInDays === 1) return 'Yesterday';
  if (diffInDays < 30) return `${diffInDays}d ago`;

  return date.toLocaleDateString();
}

/**
 * Formats duration between two timestamps into readable "3m 24s", "45s", or "1h 12m".
 */
export function formatDuration(startInput, endInput) {
  const start = parseDate(startInput);
  if (!start) return '—';

  const end = parseDate(endInput) || new Date();
  const diffInSeconds = Math.max(1, Math.round((end.getTime() - start.getTime()) / 1000));

  if (diffInSeconds < 60) {
    return `${diffInSeconds}s`;
  }

  const mins = Math.floor(diffInSeconds / 60);
  const secs = diffInSeconds % 60;

  if (mins < 60) {
    return secs > 0 ? `${mins}m ${secs}s` : `${mins}m`;
  }

  const hours = Math.floor(mins / 60);
  const remainingMins = mins % 60;
  return remainingMins > 0 ? `${hours}h ${remainingMins}m` : `${hours}h`;
}

/**
 * Formats seconds into digital timer hh:mm:ss or mm:ss (e.g., "01:45" or "01:23:45").
 */
export function formatDigitalTimer(seconds) {
  const safeSeconds = Math.max(0, Math.floor(seconds || 0));
  const hours = Math.floor(safeSeconds / 3600);
  const mins = Math.floor((safeSeconds % 3600) / 60);
  const secs = safeSeconds % 60;

  if (hours > 0) {
    return `${String(hours).padStart(2, '0')}:${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  }
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}

export function calculateEstimatedRemaining(startInput, progress = 0) {
  if (progress >= 100) return '0s';
  const remainingRatio = Math.max(0, (100 - progress) / 100);

  const start = parseDate(startInput);
  if (!start) {
    const estSec = Math.max(3, Math.round(remainingRatio * 60));
    return `~${estSec}s`;
  }

  const now = new Date();
  const elapsedSec = Math.max(1, Math.round((now.getTime() - start.getTime()) / 1000));

  if (progress <= 5) {
    return '~1m 30s';
  }

  // If task has been running for > 5 mins (e.g., stale or old seed),
  // calculate remaining time based on remaining stage weight, not giant historical elapsed time.
  let remainingSec;
  if (elapsedSec > 300) {
    remainingSec = Math.max(3, Math.round(remainingRatio * 45));
  } else {
    const totalEstSec = elapsedSec / (progress / 100);
    remainingSec = Math.max(3, Math.round(totalEstSec - elapsedSec));
  }

  if (remainingSec < 60) {
    return `~${remainingSec}s`;
  }

  const mins = Math.floor(remainingSec / 60);
  const secs = remainingSec % 60;
  return secs > 0 ? `~${mins}m ${secs}s` : `~${mins}m`;
}

/**
 * Formats full timestamp for tooltips and audit inspect (e.g., "Oct 6, 2026, 2:32:09 AM").
 */
export function formatFullDateTime(dateInput) {
  const date = parseDate(dateInput);
  if (!date) return 'No timestamp available';
  return date.toLocaleString(undefined, {
    dateStyle: 'medium',
    timeStyle: 'medium',
  });
}

/**
 * Safe date formatter returning "Unknown" when date is invalid or missing.
 * Prevents "Invalid Date" errors in UI.
 */
export function formatDate(dateInput) {
  if (!dateInput) return 'Unknown';
  if (typeof dateInput === 'string' && (dateInput.toLowerCase() === 'just now' || dateInput.includes('ago'))) {
    return dateInput;
  }
  const date = parseDate(dateInput);
  if (!date || isNaN(date.getTime())) return 'Unknown';
  try {
    return date.toLocaleString(undefined, {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  } catch (_) {
    return 'Unknown';
  }
}

export function isHealthStale(dateInput, maxMinutes = 10) {
  const date = parseDate(dateInput);
  if (!date) return true;
  return (Date.now() - date.getTime()) > maxMinutes * 60 * 1000;
}

