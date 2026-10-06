import React, { useState, useEffect } from 'react';
import { StatusBadge, ToolBadge } from './StatusBadge';
import { ExecutionTimer } from './ExecutionTimer';
import { formatFullDateTime } from '../utils/time';
import { Check, X, Copy } from 'lucide-react';

export function LogViewerModal({
  deployment,
  isOpen,
  onClose,
  onCompleteDeploy,
  onCancelDeploy
}) {
  if (!isOpen || !deployment) return null;

  const [copied, setCopied] = useState(false);

  // ── Keyboard Listener (Close on ESC) ────────────────────────
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  const copyLogs = () => {
    navigator.clipboard.writeText(deployment.log_output || '');
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const isRunning = deployment.status === 'running';

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fade-in cursor-pointer"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="card-cyber-elevated relative w-full max-w-4xl max-h-[85vh] rounded-2xl flex flex-col overflow-hidden border border-white/[0.1] cursor-default"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Terminal Header */}
        <div className="p-4 px-6 border-b border-white/[0.08] flex items-center justify-between bg-[#070b14]/90">
          <div className="flex items-center gap-3">
            <span className="font-mono text-xs px-2.5 py-1 rounded-md bg-white/[0.05] text-cyan-300 border border-white/[0.08] font-bold">
              #{deployment.id}
            </span>
            <h3 className="text-sm font-extrabold text-white tracking-wide">{deployment.name}</h3>
            <StatusBadge status={deployment.status} />
            <ToolBadge tool={deployment.tool} />
          </div>

          <div className="flex items-center gap-2">
            {isRunning && onCompleteDeploy && (
              <button
                onClick={() => onCompleteDeploy(deployment.id)}
                className="text-xs text-emerald-300 hover:text-white px-3 py-1.5 rounded-lg bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/30 font-bold transition flex items-center gap-1.5 cursor-pointer"
              >
                <Check className="w-3.5 h-3.5" />
                <span>Complete Run</span>
              </button>
            )}

            {isRunning && onCancelDeploy && (
              <button
                onClick={() => onCancelDeploy(deployment.id)}
                className="text-xs text-rose-300 hover:text-white px-3 py-1.5 rounded-lg bg-rose-500/15 hover:bg-rose-500/25 border border-rose-500/30 font-bold transition flex items-center gap-1.5 cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
                <span>Cancel Run</span>
              </button>
            )}

            <button
              onClick={copyLogs}
              className="text-xs text-slate-300 hover:text-white px-3 py-1.5 rounded-lg bg-white/[0.06] hover:bg-white/[0.1] border border-white/[0.08] font-medium transition flex items-center gap-1.5 cursor-pointer"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-300" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? 'Copied' : 'Copy Output'}</span>
            </button>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-xl flex items-center justify-center text-slate-400 hover:text-white hover:bg-white/[0.08] transition text-base cursor-pointer"
              title="Close"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Progress bar line with active stripes and shimmer */}
        <div className="w-full bg-[#070b14] h-2">
          <div
            className={`h-2 transition-all duration-500 ${
              deployment.status === 'failed'
                ? 'bg-rose-500'
                : deployment.status === 'success'
                ? 'bg-emerald-400'
                : 'bg-gradient-to-r from-orange-500 via-cyan-400 to-blue-500 shadow-[0_0_12px_#06b6d4] progress-active-stripes'
            }`}
            style={{ width: `${deployment.progress}%` }}
          />
        </div>

        {/* Target & Real-Time Execution Meta Ribbon */}
        <div className="px-6 py-3 bg-[#090d18] border-b border-white/[0.06] flex flex-wrap items-center justify-between gap-3 text-[11px] text-slate-400 font-mono">
          <div className="flex items-center gap-4">
            <div>
              <span className="text-slate-500">TARGETS: </span>
              <span className="text-slate-200 font-bold">{deployment.target_hosts}</span>
            </div>
            <div>
              <span className="text-slate-500">ENV: </span>
              <span className="capitalize text-slate-200 font-bold">{deployment.environment}</span>
            </div>
          </div>

          {/* Live Timer / Duration / Est Remaining / Animated Progress */}
          <div className="flex items-center gap-4">
            <ExecutionTimer
              status={deployment.status}
              startedAt={deployment.started_at}
              completedAt={deployment.completed_at}
              createdAt={deployment.created_at}
              progress={deployment.progress}
              variant="compact"
            />

            <div className="flex items-center gap-1.5">
              <span className="text-slate-500">PROGRESS: </span>
              <span className={`font-bold ${isRunning ? 'text-cyan-400 animate-pulse' : 'text-slate-200'}`}>
                {deployment.progress}%
              </span>
              {isRunning && (
                <span className="inline-block w-2 h-2 rounded-full bg-cyan-400 animate-ping ml-1" />
              )}
            </div>
          </div>
        </div>

        {/* Console / Terminal Body */}
        <div className="flex-1 p-5 bg-[#05070d] overflow-y-auto font-mono text-xs leading-relaxed text-slate-300 whitespace-pre-wrap select-text border-t border-black">
          {deployment.log_output || '// No execution logs recorded for this task.'}
        </div>
      </div>
    </div>
  );
}
