import React, { useState } from 'react';
import { StatusBadge, ToolBadge } from '../components/StatusBadge';
import { ExecutionTimer } from '../components/ExecutionTimer';
import { formatRelativeTime, formatFullDateTime } from '../utils/time';
import { Plus, FileText, Play, CheckCircle2, XCircle, Trash2 } from 'lucide-react';

export function Deployments({
  deployments,
  onOpenDeployModal,
  onViewLogs,
  onExecuteDeploy,
  onCompleteDeploy,
  onCancelDeploy,
  onDeleteDeploy
}) {
  const [filterTool, setFilterTool] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterEnv, setFilterEnv] = useState('all');

  const filtered = deployments.filter((d) => {
    if (filterTool !== 'all' && (d.tool || '').toLowerCase() !== filterTool.toLowerCase()) return false;
    if (filterStatus !== 'all' && (d.status || '').toLowerCase() !== filterStatus.toLowerCase()) return false;
    if (filterEnv !== 'all' && (d.environment || '').toLowerCase() !== filterEnv.toLowerCase()) return false;
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Header and Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-extrabold text-white tracking-wide">Deployments</h2>
          <p className="text-xs text-slate-400 mt-0.5">Manage and execute configuration workflows</p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {/* Environment filter */}
          <select
            value={filterEnv}
            onChange={(e) => setFilterEnv(e.target.value)}
            className="bg-[#0b101d] border border-white/[0.1] rounded-xl px-3 py-1.5 text-xs text-slate-300 focus:outline-none focus:border-cyan-400 transition"
          >
            <option value="all">All Envs</option>
            <option value="production">Production</option>
            <option value="staging">Staging</option>
            <option value="development">Development</option>
          </select>

          {/* Tool filter */}
          <select
            value={filterTool}
            onChange={(e) => setFilterTool(e.target.value)}
            className="bg-[#0b101d] border border-white/[0.1] rounded-xl px-3 py-1.5 text-xs text-slate-300 focus:outline-none focus:border-cyan-400 transition"
          >
            <option value="all">All Tools</option>
            <option value="chef">Chef (Ruby)</option>
            <option value="salt">SaltStack (YAML)</option>
            <option value="both">Hybrid (Both)</option>
          </select>

          {/* Status filter */}
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="bg-[#0b101d] border border-white/[0.1] rounded-xl px-3 py-1.5 text-xs text-slate-300 focus:outline-none focus:border-cyan-400 transition"
          >
            <option value="all">All Statuses</option>
            <option value="running">Running</option>
            <option value="pending">Pending</option>
            <option value="success">Success</option>
            <option value="failed">Failed</option>
          </select>

          <button
            onClick={onOpenDeployModal}
            className="px-4 py-2 rounded-xl bg-gradient-to-r from-orange-500 via-amber-500 to-cyan-500 hover:opacity-95 text-white text-xs font-extrabold shadow-[0_0_20px_rgba(249,115,22,0.3)] active:scale-95 transition flex items-center gap-1.5 cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Create Deployment</span>
          </button>
        </div>
      </div>

      {/* Mobile Deployment Cards (< md) */}
      <div className="md:hidden space-y-3">
        {filtered.map((dep) => (
          <div
            key={dep.id}
            className="card-cyber rounded-2xl p-4 border border-white/[0.08] space-y-3 shadow-card"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="font-mono text-xs text-slate-500 font-bold">#{dep.id}</span>
                <h4 className="text-sm font-bold text-white tracking-wide">{dep.name}</h4>
              </div>
              <StatusBadge status={dep.status} />
            </div>

            <p className="text-xs text-slate-400 leading-relaxed font-normal">{dep.description}</p>

            <div className="flex flex-wrap items-center gap-2 text-xs">
              <span className="capitalize px-2.5 py-0.5 rounded-md bg-white/[0.05] border border-white/[0.08] font-bold text-slate-300 text-[11px]">
                {dep.environment}
              </span>
              <ToolBadge tool={dep.tool} />
              <span className="text-[11px] font-mono text-slate-400 bg-[#070b14] px-2 py-0.5 rounded border border-white/[0.06]">
                Target: {dep.target_hosts}
              </span>
            </div>

            {/* Progress bar */}
            <div className="space-y-1">
              <div className="flex items-center justify-between text-[10px] font-mono text-slate-400">
                <span>Progress</span>
                <span>{dep.progress || 0}%</span>
              </div>
              <div className="w-full bg-[#070b14] h-2 rounded-full overflow-hidden border border-white/[0.05]">
                <div
                  className={`h-2 rounded-full transition-all duration-500 ${
                    (dep.status || '').toLowerCase() === 'failed'
                      ? 'bg-rose-500'
                      : ['success', 'succeeded'].includes((dep.status || '').toLowerCase())
                      ? 'bg-emerald-400'
                      : (dep.status || '').toLowerCase() === 'running'
                      ? 'bg-gradient-to-r from-orange-400 to-cyan-400 progress-active-stripes shadow-[0_0_10px_#06b6d4]'
                      : (dep.status || '').toLowerCase() === 'cancelled'
                      ? 'bg-slate-600'
                      : 'bg-slate-700'
                  }`}
                  style={{ width: `${dep.progress || 0}%` }}
                />
              </div>
            </div>

            {/* Timing */}
            <div className="text-[11px] font-mono text-slate-400 pt-1">
              <ExecutionTimer
                status={dep.status}
                startedAt={dep.started_at}
                completedAt={dep.completed_at}
                createdAt={dep.created_at}
                progress={dep.progress}
                variant="compact"
              />
            </div>

            {/* Actions */}
            <div className="flex items-center justify-end gap-2 pt-2 border-t border-white/[0.06]">
              {['pending', 'queued'].includes((dep.status || '').toLowerCase()) && (
                <button
                  onClick={() => onExecuteDeploy(dep.id)}
                  className="px-2.5 py-1 rounded-lg bg-cyan-500/15 text-cyan-300 hover:bg-cyan-500/25 border border-cyan-500/30 text-xs font-bold transition cursor-pointer"
                >
                  Run
                </button>
              )}
              {(dep.status || '').toLowerCase() === 'running' && onCompleteDeploy && (
                <button
                  onClick={() => onCompleteDeploy(dep.id)}
                  className="px-2.5 py-1 rounded-lg bg-emerald-500/15 text-emerald-300 hover:bg-emerald-500/25 border border-emerald-500/30 text-xs font-bold transition cursor-pointer"
                >
                  Complete
                </button>
              )}
              {['running', 'pending', 'queued'].includes((dep.status || '').toLowerCase()) && (
                <button
                  onClick={() => onCancelDeploy(dep.id)}
                  className="px-2.5 py-1 rounded-lg bg-rose-500/15 text-rose-300 hover:bg-rose-500/25 border border-rose-500/30 text-xs font-bold transition cursor-pointer"
                >
                  Cancel
                </button>
              )}
              <button
                onClick={() => onViewLogs(dep)}
                className="px-3 py-1.5 rounded-lg bg-white/[0.05] text-slate-300 hover:bg-white/[0.1] border border-white/[0.08] text-xs font-semibold transition cursor-pointer flex items-center gap-1.5"
              >
                <FileText className="w-3 h-3" />
                <span>Logs</span>
              </button>
              {onDeleteDeploy && !['running'].includes((dep.status || '').toLowerCase()) && (
                <button
                  onClick={() => onDeleteDeploy(dep.id)}
                  className="px-3 py-1.5 rounded-lg bg-rose-500/10 text-rose-400 hover:bg-rose-500/20 border border-rose-500/20 text-xs font-semibold transition cursor-pointer flex items-center gap-1.5"
                  title="Delete deployment"
                >
                  <Trash2 className="w-3 h-3" />
                  <span>Delete</span>
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Desktop Deployments Table Container (>= md) */}
      <div className="hidden md:block card-cyber rounded-2xl overflow-hidden shadow-card">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-white/[0.08] bg-[#070b14]/90 text-[11px] font-extrabold text-slate-400 uppercase tracking-wider">
                <th className="py-3.5 px-4 font-mono">ID</th>
                <th className="py-3.5 px-4">Deployment</th>
                <th className="py-3.5 px-4">Environment</th>
                <th className="py-3.5 px-4">Engine</th>
                <th className="py-3.5 px-4">Targets</th>
                <th className="py-3.5 px-4">Status & Progress</th>
                <th className="py-3.5 px-4">Timing & Duration</th>
                <th className="py-3.5 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.05] text-xs">
              {filtered.map((dep) => (
                <tr key={dep.id} className="hover:bg-white/[0.02] transition">
                  <td className="py-3.5 px-4 font-mono text-slate-500 font-bold">#{dep.id}</td>
                  <td className="py-3.5 px-4">
                    <div className="font-bold text-white tracking-wide">{dep.name}</div>
                    <div className="text-[11px] text-slate-400 font-normal">{dep.description}</div>
                  </td>
                  <td className="py-3.5 px-4">
                    <span className="capitalize px-2.5 py-0.5 rounded-md bg-white/[0.05] border border-white/[0.08] font-bold text-slate-300 text-[11px]">
                      {dep.environment}
                    </span>
                  </td>
                  <td className="py-3.5 px-4">
                    <ToolBadge tool={dep.tool} />
                  </td>
                  <td className="py-3.5 px-4 font-mono text-slate-300 font-medium">
                    {dep.target_hosts}
                  </td>
                  <td className="py-3.5 px-4">
                    <div className="space-y-1.5 w-32">
                      <StatusBadge status={dep.status} />
                      <div className="w-full bg-[#070b14] h-2 rounded-full overflow-hidden border border-white/[0.05]">
                        <div
                          className={`h-2 rounded-full transition-all duration-500 ${
                            (dep.status || '').toLowerCase() === 'failed'
                              ? 'bg-rose-500'
                              : ['success', 'succeeded'].includes((dep.status || '').toLowerCase())
                              ? 'bg-emerald-400'
                              : (dep.status || '').toLowerCase() === 'running'
                              ? 'bg-gradient-to-r from-orange-400 to-cyan-400 progress-active-stripes shadow-[0_0_10px_#06b6d4]'
                              : (dep.status || '').toLowerCase() === 'cancelled'
                              ? 'bg-slate-600'
                              : 'bg-slate-700'
                          }`}
                          style={{ width: `${dep.progress || 0}%` }}
                        />
                      </div>
                    </div>
                  </td>
                  <td className="py-3.5 px-4 font-mono text-[11px]">
                    <ExecutionTimer
                      status={dep.status}
                      startedAt={dep.started_at}
                      completedAt={dep.completed_at}
                      createdAt={dep.created_at}
                      progress={dep.progress}
                      variant="compact"
                    />
                    <div
                      className="text-[10px] text-slate-500 font-sans mt-0.5 cursor-help"
                      title={`Triggered: ${formatFullDateTime(dep.created_at)}`}
                    >
                      Triggered {formatRelativeTime(dep.created_at)}
                    </div>
                  </td>
                  <td className="py-3.5 px-4 text-right">
                    <div className="inline-flex items-center gap-1.5">
                      {['pending', 'queued'].includes((dep.status || '').toLowerCase()) && (
                        <button
                          onClick={() => onExecuteDeploy(dep.id)}
                          className="px-2.5 py-1 rounded-lg bg-cyan-500/15 text-cyan-300 hover:bg-cyan-500/25 border border-cyan-500/30 font-bold transition cursor-pointer"
                        >
                          Run
                        </button>
                      )}
                      {(dep.status || '').toLowerCase() === 'running' && onCompleteDeploy && (
                        <button
                          onClick={() => onCompleteDeploy(dep.id)}
                          className="px-2.5 py-1 rounded-lg bg-emerald-500/15 text-emerald-300 hover:bg-emerald-500/25 border border-emerald-500/30 font-bold transition cursor-pointer"
                        >
                          Complete
                        </button>
                      )}
                      {['running', 'pending', 'queued'].includes((dep.status || '').toLowerCase()) && (
                        <button
                          onClick={() => onCancelDeploy(dep.id)}
                          className="px-2.5 py-1 rounded-lg bg-rose-500/15 text-rose-300 hover:bg-rose-500/25 border border-rose-500/30 font-bold transition cursor-pointer"
                        >
                          Cancel
                        </button>
                      )}
                      <button
                        onClick={() => onViewLogs(dep)}
                        className="px-2.5 py-1 rounded-lg bg-white/[0.05] text-slate-300 hover:bg-white/[0.1] border border-white/[0.08] font-semibold transition cursor-pointer flex items-center gap-1"
                      >
                        <FileText className="w-3 h-3" />
                        <span>Logs</span>
                      </button>
                      {onDeleteDeploy && !['running'].includes((dep.status || '').toLowerCase()) && (
                        <button
                          onClick={() => onDeleteDeploy(dep.id)}
                          className="px-2.5 py-1 rounded-lg bg-rose-500/10 text-rose-400 hover:bg-rose-500/20 border border-rose-500/20 font-semibold transition cursor-pointer flex items-center gap-1"
                          title="Delete deployment"
                        >
                          <Trash2 className="w-3 h-3" />
                          <span>Delete</span>
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
