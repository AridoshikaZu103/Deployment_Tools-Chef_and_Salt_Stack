import React from 'react';

export function MetricCard({ title, value, subtitle, change, icon, color = 'cyan' }) {
  const colorMap = {
    chef: {
      glow: 'from-orange-500/20 via-amber-500/5 to-transparent',
      text: 'text-orange-400',
      border: 'border-orange-500/20',
      iconBg: 'bg-orange-500/10 border-orange-500/30 text-orange-400 shadow-[0_0_15px_rgba(249,115,22,0.2)]'
    },
    salt: {
      glow: 'from-cyan-500/20 via-sky-500/5 to-transparent',
      text: 'text-cyan-400',
      border: 'border-cyan-500/20',
      iconBg: 'bg-cyan-500/10 border-cyan-500/30 text-cyan-400 shadow-[0_0_15px_rgba(6,182,212,0.2)]'
    },
    cyan: {
      glow: 'from-cyan-500/20 via-sky-500/5 to-transparent',
      text: 'text-cyan-400',
      border: 'border-cyan-500/20',
      iconBg: 'bg-cyan-500/10 border-cyan-500/30 text-cyan-400 shadow-[0_0_15px_rgba(6,182,212,0.2)]'
    },
    emerald: {
      glow: 'from-emerald-500/20 via-teal-500/5 to-transparent',
      text: 'text-emerald-400',
      border: 'border-emerald-500/20',
      iconBg: 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400 shadow-[0_0_15px_rgba(16,185,129,0.2)]'
    },
    purple: {
      glow: 'from-violet-500/20 via-purple-500/5 to-transparent',
      text: 'text-violet-400',
      border: 'border-violet-500/20',
      iconBg: 'bg-violet-500/10 border-violet-500/30 text-violet-400 shadow-[0_0_15px_rgba(139,92,246,0.2)]'
    },
  };

  const scheme = colorMap[color] || colorMap.cyan;

  return (
    <div className="card-cyber relative overflow-hidden rounded-2xl p-5 group">
      {/* Dynamic backdrop glow aura */}
      <div className={`absolute top-0 right-0 w-36 h-36 bg-gradient-to-br ${scheme.glow} rounded-full blur-2xl pointer-events-none -mr-10 -mt-10 group-hover:scale-125 transition-transform duration-500`} />
      
      <div className="flex items-center justify-between mb-3 relative z-10">
        <span className="text-[11px] font-bold tracking-wider uppercase text-slate-400">{title}</span>
        <div className={`p-2.5 rounded-xl border ${scheme.iconBg}`}>
          {icon}
        </div>
      </div>

      <div className="flex items-baseline gap-2 relative z-10">
        <span className="text-3xl font-extrabold text-white tracking-tight">{value}</span>
        {change && (
          <span className="text-[11px] font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-1.5 py-0.5 rounded-md">
            {change}
          </span>
        )}
      </div>

      {subtitle && (
        <p className="mt-1 text-xs text-slate-400 relative z-10 font-medium">{subtitle}</p>
      )}
    </div>
  );
}
