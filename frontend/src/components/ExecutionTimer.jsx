import React, { useState, useEffect } from 'react';
import {
  formatRelativeTime,
  formatDuration,
  formatDigitalTimer,
  calculateEstimatedRemaining,
  formatFullDateTime,
  parseDate
} from '../utils/time';
import { Clock, Hourglass, AlertTriangle } from 'lucide-react';

/**
 * ExecutionTimer Component
 * Renders live elapsed timers, execution durations, ETAs, and relative timestamps.
 */
export function ExecutionTimer({
  status,
  startedAt,
  completedAt,
  createdAt,
  progress = 0,
  variant = 'badge', // 'badge' | 'inline' | 'compact'
  showEta = true
}) {
  const [elapsedSeconds, setElapsedSeconds] = useState(() => {
    const start = parseDate(startedAt) || parseDate(createdAt);
    if (!start) return 0;
    return Math.max(0, Math.floor((Date.now() - start.getTime()) / 1000));
  });

  // Live tick effect for running executions
  useEffect(() => {
    if (status !== 'running') return;

    const start = parseDate(startedAt) || parseDate(createdAt);
    if (!start) return;

    const updateTimer = () => {
      setElapsedSeconds(Math.max(0, Math.floor((Date.now() - start.getTime()) / 1000)));
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [status, startedAt, createdAt]);

  const eta = calculateEstimatedRemaining(startedAt || createdAt, progress);
  const createdTooltip = formatFullDateTime(createdAt);
  const startedTooltip = formatFullDateTime(startedAt);
  const completedTooltip = formatFullDateTime(completedAt);

  // 1. Running State: Live ticking timer + ETA
  if (status === 'running') {
    if (variant === 'compact') {
      return (
        <span
          className="inline-flex items-center gap-1.5 font-mono text-[11px] text-cyan-400 bg-cyan-500/10 px-2 py-0.5 rounded border border-cyan-500/20"
          title={`Started: ${startedTooltip} | Triggered: ${createdTooltip}`}
        >
          <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse"></span>
          <span>{formatDigitalTimer(elapsedSeconds)}</span>
          {showEta && progress > 0 && (
            <span className="text-slate-400 font-sans text-[10px]">({eta} left)</span>
          )}
        </span>
      );
    }

    return (
      <div className="inline-flex flex-wrap items-center gap-2">
        <div
          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-cyan-500/10 border border-cyan-500/25 text-cyan-300 font-mono text-xs font-bold shadow-[0_0_10px_rgba(6,182,212,0.15)]"
          title={`Started: ${startedTooltip} (${formatRelativeTime(startedAt || createdAt)})`}
        >
          <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping"></span>
          <span>Elapsed: {formatDigitalTimer(elapsedSeconds)}</span>
        </div>

        {showEta && progress > 0 && progress < 100 && (
          <div
            className="inline-flex items-center gap-1.5 px-2 py-1 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-300 text-xs font-semibold"
            title="Estimated time remaining based on convergence speed"
          >
            <Hourglass className="w-3 h-3 text-amber-400" />
            <span>Est. Remaining: <strong>{eta}</strong></span>
          </div>
        )}
      </div>
    );
  }

  // 2. Completed / Success State: Finished duration + completion relative time
  if (status === 'success') {
    const duration = formatDuration(startedAt || createdAt, completedAt);
    const finishedAgo = formatRelativeTime(completedAt || startedAt);

    if (variant === 'compact') {
      return (
        <span
          className="inline-flex items-center gap-1 font-mono text-[11px] text-emerald-400"
          title={`Duration: ${duration} | Completed: ${completedTooltip}`}
        >
          <Clock className="w-3 h-3 text-emerald-400 inline" />
          <span>{duration}</span>
        </span>
      );
    }

    return (
      <div className="inline-flex flex-wrap items-center gap-2">
        <span
          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-xs font-semibold font-mono"
          title={`Started: ${startedTooltip} → Finished: ${completedTooltip}`}
        >
          <Clock className="w-3.5 h-3.5 text-emerald-400" />
          <span>Duration: <strong>{duration}</strong></span>
        </span>

        <span
          className="text-slate-400 text-xs font-normal cursor-help"
          title={completedTooltip}
        >
          Finished {finishedAgo}
        </span>
      </div>
    );
  }

  // 3. Failed State
  if (status === 'failed') {
    const duration = formatDuration(startedAt || createdAt, completedAt);
    const failedAgo = formatRelativeTime(completedAt || startedAt);

    return (
      <div className="inline-flex flex-wrap items-center gap-2">
        <span
          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs font-semibold font-mono"
          title={`Failed at: ${completedTooltip}`}
        >
          <AlertTriangle className="w-3.5 h-3.5 text-rose-400" />
          <span>Failed after: {duration}</span>
        </span>
        <span className="text-slate-400 text-xs cursor-help" title={completedTooltip}>
          {failedAgo}
        </span>
      </div>
    );
  }

  // 4. Pending / Queued State
  const queuedAgo = formatRelativeTime(createdAt);
  return (
    <div className="inline-flex items-center gap-2 text-xs text-amber-400/90 font-medium">
      <span
        className="px-2 py-0.5 rounded bg-amber-500/10 border border-amber-500/20 font-mono text-[11px] flex items-center gap-1"
        title={`Queued at: ${createdTooltip}`}
      >
        <Hourglass className="w-3 h-3 text-amber-400" />
        <span>In Queue ({queuedAgo})</span>
      </span>
    </div>
  );
}
