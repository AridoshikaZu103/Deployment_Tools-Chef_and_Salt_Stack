import React from 'react';
import { Activity, Zap, Cpu, Clock, CheckCircle } from 'lucide-react';

export function LiveMetrics() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs font-mono">
      {/* Chef Activity Meter (Orange) */}
      <div className="p-3.5 rounded-2xl bg-[#090e1c] border border-orange-500/30 space-y-2.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-orange-500 shadow-[0_0_8px_#f97316] animate-pulse"></span>
            <span className="font-bold text-orange-300">Chef Telemetry</span>
          </div>
          <span className="text-[10px] px-2 py-0.5 rounded bg-orange-500/20 text-orange-200 border border-orange-500/30">
            Client Pull
          </span>
        </div>

        <div className="space-y-1.5 text-[11px] text-slate-300">
          <div className="flex justify-between">
            <span className="text-slate-400">Converged Nodes:</span>
            <span className="text-white font-bold">5 / 5 (100%)</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-400">Idempotency Rate:</span>
            <span className="text-emerald-400 font-bold">99.8%</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-400">Run Interval:</span>
            <span className="text-slate-200">15 min periodic</span>
          </div>
        </div>

        {/* Activity Bar */}
        <div className="space-y-1 pt-1">
          <div className="flex justify-between text-[10px] text-slate-400">
            <span>Client Convergence Sync</span>
            <span className="text-orange-400 font-bold">Optimal</span>
          </div>
          <div className="w-full bg-[#05070d] h-1.5 rounded-full overflow-hidden">
            <div className="h-full bg-gradient-to-r from-orange-600 to-amber-400 w-[96%]" />
          </div>
        </div>
      </div>

      {/* SaltStack Activity Meter (Cyan) */}
      <div className="p-3.5 rounded-2xl bg-[#090e1c] border border-cyan-500/30 space-y-2.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-cyan-400 shadow-[0_0_8px_#06b6d4] animate-pulse"></span>
            <span className="font-bold text-cyan-300">SaltStack Telemetry</span>
          </div>
          <span className="text-[10px] px-2 py-0.5 rounded bg-cyan-500/20 text-cyan-200 border border-cyan-500/30">
            ZeroMQ Push
          </span>
        </div>

        <div className="space-y-1.5 text-[11px] text-slate-300">
          <div className="flex justify-between">
            <span className="text-slate-400">Active Minions:</span>
            <span className="text-white font-bold">5 / 5 (100%)</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-400">ZeroMQ Socket Latency:</span>
            <span className="text-cyan-400 font-bold">1.8 ms</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-400">Event Bus Throughput:</span>
            <span className="text-slate-200">4,200 msg/s</span>
          </div>
        </div>

        {/* Activity Bar */}
        <div className="space-y-1 pt-1">
          <div className="flex justify-between text-[10px] text-slate-400">
            <span>ZeroMQ Bus Health</span>
            <span className="text-cyan-400 font-bold">Sub-millisecond</span>
          </div>
          <div className="w-full bg-[#05070d] h-1.5 rounded-full overflow-hidden">
            <div className="h-full bg-gradient-to-r from-cyan-600 to-blue-400 w-[99%]" />
          </div>
        </div>
      </div>
    </div>
  );
}
