import React from 'react';
import { StatusBadge, ToolBadge } from '../components/StatusBadge';
import { ExecutionTimer } from '../components/ExecutionTimer';
import { formatRelativeTime, formatFullDateTime } from '../utils/time';
import { Clock, Hourglass, Check, ArrowRight, FileText } from 'lucide-react';

export function History({ deployments, onViewLogs, onCompleteDeploy }) {
  return (
    <div className="space-y-6">
      {/* Header with quick legend explaining time metrics */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-extrabold text-white tracking-wide">Deployment History & Audit Log</h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Historical audit log of infrastructure runs, execution timers, and convergence results
          </p>
        </div>

        {/* Quick Help Guide for Timers */}
        <div className="hidden lg:flex items-center gap-3 text-[11px] text-slate-400 bg-white/[0.03] px-3.5 py-1.5 rounded-xl border border-white/[0.06]">
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse"></span>
            <strong className="text-slate-200">Elapsed:</strong> Active runtime
          </span>
          <span className="text-slate-600">•</span>
          <span className="flex items-center gap-1.5">
            <Hourglass className="w-3 h-3 text-cyan-400" />
            <strong className="text-slate-200">Est. Remaining:</strong> Time to finish
          </span>
          <span className="text-slate-600">•</span>
          <span className="flex items-center gap-1.5">
            <Clock className="w-3 h-3 text-slate-400" />
            <strong className="text-slate-200">Duration:</strong> Total convergence time
          </span>
        </div>
      </div>

      <div className="space-y-3">
        {deployments.map((dep) => (
          <div
            key={dep.id}
            className="card-cyber p-5 rounded-2xl shadow-card flex flex-col md:flex-row md:items-center justify-between gap-4"
          >
            <div className="space-y-2.5 max-w-3xl">
              {/* Header: ID, Name, Badges */}
              <div className="flex flex-wrap items-center gap-2.5">
                <span className="font-mono text-xs text-slate-500 font-bold px-2 py-0.5 rounded bg-white/[0.04]">
                  #{dep.id}
                </span>
                <h3 className="text-sm font-bold text-white tracking-wide">{dep.name}</h3>
                <StatusBadge status={dep.status} />
                <ToolBadge tool={dep.tool} />
              </div>

              <p className="text-xs text-slate-300 font-normal leading-relaxed">{dep.description}</p>

              {/* Enhanced Time & Targets Metadata Bar */}
              <div className="flex flex-wrap items-center gap-3 text-[11px] pt-1">
                {/* Live Timer / Duration */}
                <ExecutionTimer
                  status={dep.status}
                  startedAt={dep.started_at}
                  completedAt={dep.completed_at}
                  createdAt={dep.created_at}
                  progress={dep.progress}
                />

                <span className="text-slate-600 hidden sm:inline">•</span>

                {/* Target Nodes */}
                <div className="font-mono text-slate-400 flex items-center gap-1">
                  <span>TARGETS:</span>
                  <span className="text-slate-200 font-semibold">{dep.target_hosts}</span>
                </div>

                <span className="text-slate-600 hidden sm:inline">•</span>

                {/* Created / Triggered At with Hover Tooltip */}
                <div
                  className="text-slate-400 cursor-help flex items-center gap-1"
                  title={`Triggered at: ${formatFullDateTime(dep.created_at)}`}
                >
                  <span>Triggered:</span>
                  <span className="text-slate-300 underline decoration-dotted underline-offset-2">
                    {formatRelativeTime(dep.created_at)}
                  </span>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center gap-2 self-end md:self-center">
              {dep.status === 'running' && onCompleteDeploy && (
                <button
                  onClick={() => onCompleteDeploy(dep.id)}
                  className="px-3.5 py-2 rounded-xl bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/30 text-emerald-300 text-xs font-bold transition shadow-sm active:scale-95 flex items-center gap-1.5 cursor-pointer"
                >
                  <Check className="w-3.5 h-3.5" />
                  <span>Complete Run</span>
                </button>
              )}
              <button
                onClick={() => onViewLogs(dep)}
                className="px-4 py-2 rounded-xl bg-white/[0.05] hover:bg-white/[0.1] border border-white/[0.08] text-slate-200 text-xs font-bold transition shadow-sm hover:border-cyan-500/30 active:scale-95 flex items-center gap-1.5 cursor-pointer"
              >
                <FileText className="w-3.5 h-3.5" />
                <span>Inspect Logs</span>
                <ArrowRight className="w-3.5 h-3.5 text-slate-400" />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
