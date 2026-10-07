import React from 'react';

/**
 * HealthSparkline - Displays last up to 20 health check results per node
 */
export function HealthSparkline({ history = [] }) {
  if (!history || history.length === 0) {
    return (
      <div className="flex items-center gap-1 opacity-40 text-[10px] text-slate-500 font-mono">
        <span>No probe history</span>
      </div>
    );
  }

  // Display in chronological order left-to-right (oldest -> newest)
  const items = [...history].reverse().slice(-14);

  const getDotColor = (status) => {
    const s = (status || '').toLowerCase();
    if (s === 'healthy' || s === 'ok' || s === 'pass') return 'bg-emerald-400 shadow-[0_0_6px_#10b981]';
    if (s === 'degraded' || s === 'warn') return 'bg-amber-400 shadow-[0_0_6px_#f59e0b]';
    if (s === 'unhealthy' || s === 'fail') return 'bg-rose-500 shadow-[0_0_6px_#f43f5e]';
    return 'bg-slate-500';
  };

  return (
    <div className="flex items-center gap-1.5" title={`Health history: ${items.length} checks recorded`}>
      <span className="text-[9px] font-mono text-slate-500 uppercase tracking-wider mr-0.5">Hist:</span>
      <div className="flex items-center gap-1">
        {items.map((item, idx) => (
          <div
            key={item.id || idx}
            className={`w-1.5 h-3 rounded-sm transition-all hover:scale-125 ${getDotColor(item.status)}`}
            title={`Probe #${item.id || idx + 1}: ${item.status?.toUpperCase()} (${item.latency_ms || 0}ms) [${item.mode || 'sim'}]`}
          />
        ))}
      </div>
    </div>
  );
}
