import React from 'react';
import { Server, ArrowDown, Activity, Cpu } from 'lucide-react';

export function DeploymentVisualizer({ servers = [] }) {
  const displayServers = servers.length > 0 ? servers : [
    { hostname: 'web-prod-01', role: 'webserver', managed_by: 'both', health: 'healthy' },
    { hostname: 'web-prod-02', role: 'webserver', managed_by: 'both', health: 'healthy' },
    { hostname: 'app-staging-01', role: 'appserver', managed_by: 'both', health: 'healthy' },
    { hostname: 'db-prod-01', role: 'database', managed_by: 'both', health: 'healthy' },
    { hostname: 'dev-all-in-one', role: 'all-in-one', managed_by: 'both', health: 'healthy' }
  ];

  return (
    <div className="p-4 rounded-2xl bg-[#070b18] border border-white/[0.08] space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Activity className="w-4 h-4 text-cyan-400 animate-pulse" />
          <h4 className="text-xs font-mono font-bold uppercase tracking-wider text-slate-200">
            Real-time Fleet Topology Flow
          </h4>
        </div>
        <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-300">
          Dual Zero-Drift Bus Active
        </span>
      </div>

      {/* Top Masters Level */}
      <div className="grid grid-cols-2 gap-3 text-xs font-mono">
        <div className="p-3 rounded-xl bg-orange-950/20 border border-orange-500/40 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-2.5 h-2.5 rounded-full bg-orange-500 shadow-[0_0_8px_#f97316] animate-pulse"></div>
            <div>
              <span className="text-white font-bold block">Chef Infra Server</span>
              <span className="text-[10px] text-orange-300">Port 443 (HTTPS Pull)</span>
            </div>
          </div>
          <span className="text-[10px] px-2 py-0.5 rounded bg-orange-500/20 text-orange-200 border border-orange-500/30">
            Run-List Bus
          </span>
        </div>

        <div className="p-3 rounded-xl bg-cyan-950/20 border border-cyan-500/40 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-2.5 h-2.5 rounded-full bg-cyan-400 shadow-[0_0_8px_#06b6d4] animate-pulse"></div>
            <div>
              <span className="text-white font-bold block">Salt Master</span>
              <span className="text-[10px] text-cyan-300">Port 4505/4506 (ZeroMQ Push)</span>
            </div>
          </div>
          <span className="text-[10px] px-2 py-0.5 rounded bg-cyan-500/20 text-cyan-200 border border-cyan-500/30">
            Event Bus
          </span>
        </div>
      </div>

      {/* Animated Connection Divider */}
      <div className="flex items-center justify-center gap-2 py-1 text-slate-600 font-mono text-[10px]">
        <span className="h-[1px] flex-1 bg-gradient-to-r from-transparent via-orange-500/30 to-cyan-500/30"></span>
        <span className="px-2 py-0.5 rounded-full bg-white/[0.04] text-slate-400 border border-white/[0.06] flex items-center gap-1">
          <ArrowDown className="w-3 h-3 text-cyan-400 animate-bounce" />
          <span>Parallel Sockets Broadcast</span>
        </span>
        <span className="h-[1px] flex-1 bg-gradient-to-r from-cyan-500/30 via-orange-500/30 to-transparent"></span>
      </div>

      {/* Target Nodes Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2">
        {displayServers.map((srv, idx) => (
          <div
            key={idx}
            className="p-2.5 rounded-xl bg-[#0b101f] border border-white/[0.08] hover:border-cyan-500/40 transition flex flex-col items-center text-center gap-1.5"
          >
            <div className="w-8 h-8 rounded-lg bg-[#070b14] border border-cyan-500/30 flex items-center justify-center">
              <Server className="w-4 h-4 text-cyan-400" />
            </div>
            <span className="text-xs font-mono font-bold text-slate-200 truncate w-full">
              {srv.hostname}
            </span>
            <div className="flex items-center gap-1 text-[10px] font-mono text-slate-400">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
              <span className="capitalize">{srv.role}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
