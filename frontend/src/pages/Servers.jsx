import React, { useState } from 'react';
import { StatusBadge, ToolBadge } from '../components/StatusBadge';
import { Server, Activity, ShieldCheck, RefreshCw } from 'lucide-react';
import { normalizeServer, BUNDLED_SERVERS } from '../data/serversData';
import { formatDate } from '../utils/time';

export function Servers({ servers = [], onCheckHealth, onCheckAllHealth }) {
  const [checkingAll, setCheckingAll] = useState(false);
  const [checkingId, setCheckingId] = useState(null);

  const rawList = Array.isArray(servers) && servers.length > 0 ? servers : BUNDLED_SERVERS;
  const safeServers = rawList.map(normalizeServer);

  const handleCheckAll = async () => {
    setCheckingAll(true);
    if (onCheckAllHealth) await onCheckAllHealth();
    setCheckingAll(false);
  };

  const handleCheckSingle = async (id) => {
    setCheckingId(id);
    if (onCheckHealth) await onCheckHealth(id);
    setCheckingId(null);
  };

  return (
    <div className="space-y-6">
      {/* Header and Fleet Trigger */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-extrabold text-white tracking-wide">Managed Servers & Nodes</h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Node inventory managed by Chef Client and Salt Minions
          </p>
        </div>

        <button
          onClick={handleCheckAll}
          disabled={checkingAll}
          className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:opacity-95 text-white text-xs font-bold border border-emerald-500/30 shadow-[0_0_20px_rgba(16,185,129,0.25)] transition flex items-center gap-2 disabled:opacity-50 active:scale-95 cursor-pointer"
        >
          {checkingAll ? (
            <RefreshCw className="w-3.5 h-3.5 animate-spin" />
          ) : (
            <ShieldCheck className="w-3.5 h-3.5" />
          )}
          <span>{checkingAll ? 'Probing Fleet...' : 'Run Fleet Health Check'}</span>
        </button>
      </div>

      {/* Mobile Server Cards View (< md) */}
      <div className="md:hidden space-y-3">
        {safeServers.map((server) => (
          <div
            key={server.id}
            className="card-cyber rounded-2xl p-4 border border-white/[0.08] space-y-3 shadow-card"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-cyan-400 shadow-[0_0_6px_#06b6d4]" />
                <span className="font-extrabold text-white text-sm font-mono">{server.hostname}</span>
              </div>
              <StatusBadge status={server.health_status} />
            </div>

            <div className="grid grid-cols-2 gap-2 text-xs">
              <div>
                <span className="text-[10px] text-slate-500 uppercase block font-bold">IP Address</span>
                <span className="font-mono text-slate-300">{server.ip_address || '—'}</span>
              </div>
              <div>
                <span className="text-[10px] text-slate-500 uppercase block font-bold">Role</span>
                <span className="font-mono text-slate-300 uppercase">{server.role || '—'}</span>
              </div>
              <div>
                <span className="text-[10px] text-slate-500 uppercase block font-bold">Environment</span>
                <span className="capitalize text-slate-300">{server.environment || '—'}</span>
              </div>
              <div>
                <span className="text-[10px] text-slate-500 uppercase block font-bold">OS Family</span>
                <span className="text-slate-400">{server.os_family || '—'}</span>
              </div>
            </div>

            <div className="flex items-center justify-between pt-2.5 border-t border-white/[0.06]">
              <ToolBadge tool={server.managed_by} />
              <button
                onClick={() => handleCheckSingle(server.id)}
                disabled={checkingId === server.id}
                className="px-3 py-1.5 rounded-lg bg-cyan-500/15 text-cyan-300 hover:bg-cyan-500/25 border border-cyan-500/30 text-xs font-bold transition shadow-[0_0_12px_rgba(6,182,212,0.15)] active:scale-95 disabled:opacity-50 cursor-pointer flex items-center gap-1.5"
              >
                {checkingId === server.id && <RefreshCw className="w-3 h-3 animate-spin" />}
                <span>{checkingId === server.id ? 'Probing...' : 'Verify'}</span>
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Desktop Servers Table Container (>= md) */}
      <div className="hidden md:block card-cyber rounded-2xl overflow-hidden shadow-card">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-white/[0.08] bg-[#070b14]/90 text-[11px] font-extrabold text-slate-400 uppercase tracking-wider">
                <th className="py-3.5 px-4">Hostname</th>
                <th className="py-3.5 px-4">IP Address</th>
                <th className="py-3.5 px-4">Role</th>
                <th className="py-3.5 px-4">Environment</th>
                <th className="py-3.5 px-4">Managed By</th>
                <th className="py-3.5 px-4">OS Details</th>
                <th className="py-3.5 px-4">Health Status</th>
                <th className="py-3.5 px-4 text-right">Diagnostic Probe</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.05] text-xs">
              {safeServers.map((server) => (
                <tr key={server.id} className="hover:bg-white/[0.02] transition">
                  <td className="py-3.5 px-4 font-extrabold text-white flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-cyan-400 shadow-[0_0_6px_#06b6d4]" />
                    <span className="font-mono">{server.hostname || '—'}</span>
                  </td>
                  <td className="py-3.5 px-4 font-mono text-slate-300 font-medium">
                    {server.ip_address || '—'}
                  </td>
                  <td className="py-3.5 px-4">
                    <span className="px-2.5 py-0.5 rounded-md bg-white/[0.05] border border-white/[0.08] font-bold text-slate-300 text-[11px] uppercase font-mono">
                      {server.role || '—'}
                    </span>
                  </td>
                  <td className="py-3.5 px-4 capitalize text-slate-300 font-medium">
                    {server.environment || '—'}
                  </td>
                  <td className="py-3.5 px-4">
                    <ToolBadge tool={server.managed_by} />
                  </td>
                  <td className="py-3.5 px-4 text-slate-400 font-normal">
                    {server.os_family || '—'}
                  </td>
                  <td className="py-3.5 px-4">
                    <div className="space-y-0.5">
                      <StatusBadge status={server.health_status} />
                      <div className="text-[10px] text-slate-500 font-mono">
                        {formatDate(server.last_health_check)}
                      </div>
                    </div>
                  </td>
                  <td className="py-3.5 px-4 text-right">
                    <button
                      onClick={() => handleCheckSingle(server.id)}
                      disabled={checkingId === server.id}
                      className="px-3 py-1.5 rounded-lg bg-cyan-500/15 text-cyan-300 hover:bg-cyan-500/25 border border-cyan-500/30 font-bold transition shadow-[0_0_12px_rgba(6,182,212,0.15)] active:scale-95 disabled:opacity-50 cursor-pointer"
                    >
                      {checkingId === server.id ? 'Probing...' : 'Verify Now'}
                    </button>
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
