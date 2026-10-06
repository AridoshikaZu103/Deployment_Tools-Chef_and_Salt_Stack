import React from 'react';

export function StatusBadge({ status }) {
  const normalized = (status || 'unknown').toLowerCase();

  const styles = {
    success: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30 shadow-[0_0_12px_rgba(16,185,129,0.15)]',
    healthy: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30 shadow-[0_0_12px_rgba(16,185,129,0.15)]',
    running: 'bg-cyan-500/15 text-cyan-300 border-cyan-500/40 shadow-[0_0_15px_rgba(6,182,212,0.25)] animate-pulse',
    degraded: 'bg-amber-500/10 text-amber-300 border-amber-500/30 shadow-[0_0_12px_rgba(245,158,11,0.15)]',
    pending: 'bg-violet-500/10 text-violet-300 border-violet-500/30 shadow-[0_0_12px_rgba(139,92,246,0.15)]',
    failed: 'bg-rose-500/10 text-rose-400 border-rose-500/30 shadow-[0_0_12px_rgba(244,63,94,0.15)]',
    unhealthy: 'bg-rose-500/10 text-rose-400 border-rose-500/30 shadow-[0_0_12px_rgba(244,63,94,0.15)]',
    cancelled: 'bg-slate-500/10 text-slate-400 border-slate-600/30',
    unknown: 'bg-slate-500/10 text-slate-400 border-slate-600/30',
  };

  const dots = {
    success: 'bg-emerald-400',
    healthy: 'bg-emerald-400',
    running: 'bg-cyan-400 animate-ping',
    degraded: 'bg-amber-400',
    pending: 'bg-violet-400',
    failed: 'bg-rose-400',
    unhealthy: 'bg-rose-400',
    cancelled: 'bg-slate-400',
    unknown: 'bg-slate-400',
  };

  const currentStyle = styles[normalized] || styles.unknown;
  const currentDot = dots[normalized] || dots.unknown;

  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold border ${currentStyle} tracking-wide`}>
      <span className={`w-1.5 h-1.5 rounded-full ${currentDot}`} />
      <span className="capitalize">{status}</span>
    </span>
  );
}

export function ToolBadge({ tool }) {
  const t = (tool || '').toLowerCase();
  
  if (t === 'chef') {
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold bg-orange-500/15 text-orange-400 border border-orange-500/30 shadow-[0_0_15px_rgba(249,115,22,0.2)]">
        <span className="w-2 h-2 rounded-full bg-orange-500 shadow-[0_0_8px_#f97316]"></span>
        Chef (Ruby)
      </span>
    );
  }
  
  if (t === 'salt') {
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold bg-cyan-500/15 text-cyan-300 border border-cyan-500/30 shadow-[0_0_15px_rgba(6,182,212,0.2)]">
        <span className="w-2 h-2 rounded-full bg-cyan-400 shadow-[0_0_8px_#06b6d4]"></span>
        SaltStack (YAML)
      </span>
    );
  }
  
  return (
    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold bg-violet-500/15 text-violet-300 border border-violet-500/30 shadow-[0_0_15px_rgba(139,92,246,0.2)]">
      <span className="w-2 h-2 rounded-full bg-gradient-to-r from-orange-400 to-cyan-400"></span>
      Hybrid (Chef + Salt)
    </span>
  );
}
