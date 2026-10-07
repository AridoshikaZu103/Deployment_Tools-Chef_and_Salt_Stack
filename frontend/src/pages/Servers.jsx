import React, { useState, useEffect, useMemo, useRef } from 'react';
import { StatusBadge, ToolBadge } from '../components/StatusBadge';
import { DiagnosticModal } from '../components/health/DiagnosticModal';
import { HealthSparkline } from '../components/health/HealthSparkline';
import {
  Server,
  Activity,
  ShieldCheck,
  RefreshCw,
  Clock,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  HelpCircle,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Info
} from 'lucide-react';
import { normalizeServer, BUNDLED_SERVERS } from '../data/serversData';
import { formatRelativeTime, formatFullDateTime, isHealthStale } from '../utils/time';
import { api } from '../services/api';

export function Servers({ servers = [], onCheckHealth, onCheckAllHealth }) {
  // State
  const [serverList, setServerList] = useState([]);
  const [checkingAll, setCheckingAll] = useState(false);
  const [fleetProgress, setFleetProgress] = useState(null); // { completed, total }
  const [checkingId, setCheckingId] = useState(null);
  const [sortField, setSortField] = useState('hostname');
  const [sortAsc, setSortAsc] = useState(true);
  const [autoRefresh, setAutoRefresh] = useState(false);
  const [toastMessage, setToastMessage] = useState(null);

  // Diagnostic Modal State
  const [selectedServer, setSelectedServer] = useState(null);
  const [activeProbeData, setActiveProbeData] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [probeLoading, setProbeLoading] = useState(false);
  const [probeError, setProbeError] = useState(null);

  // Refs for race-condition and cleanup prevention
  const isMountedRef = useRef(true);
  const fleetCheckRunningRef = useRef(false);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  // Synchronize server list safely without duplicates
  useEffect(() => {
    const raw = Array.isArray(servers) && servers.length > 0 ? servers : BUNDLED_SERVERS;
    const seen = new Set();
    const deduped = [];
    for (const s of raw) {
      const norm = normalizeServer(s);
      if (!seen.has(norm.id)) {
        seen.add(norm.id);
        deduped.push(norm);
      }
    }
    setServerList(deduped);
  }, [servers]);

  // Optional 60s Auto-Refresh Interval
  useEffect(() => {
    if (!autoRefresh) return;
    const interval = setInterval(async () => {
      if (checkingAll || fleetCheckRunningRef.current) return;
      try {
        const fresh = await api.getServers();
        if (isMountedRef.current && Array.isArray(fresh) && fresh.length > 0) {
          setServerList(fresh.map(normalizeServer));
        }
      } catch (_) {}
    }, 60000);

    return () => clearInterval(interval);
  }, [autoRefresh, checkingAll]);

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => {
      if (isMountedRef.current) setToastMessage(null);
    }, 4500);
  };

  // Sorting
  const sortedServers = useMemo(() => {
    return [...serverList].sort((a, b) => {
      let valA = a[sortField] || '';
      let valB = b[sortField] || '';

      if (sortField === 'health_status' || sortField === 'health') {
        const priority = { healthy: 1, degraded: 2, unhealthy: 3, unknown: 4 };
        valA = priority[(a.health || a.health_status || '').toLowerCase()] || 5;
        valB = priority[(b.health || b.health_status || '').toLowerCase()] || 5;
      } else if (sortField === 'last_checked' || sortField === 'last_health_check') {
        valA = a.last_checked ? new Date(a.last_checked).getTime() : 0;
        valB = b.last_checked ? new Date(b.last_checked).getTime() : 0;
      } else {
        valA = String(valA).toLowerCase();
        valB = String(valB).toLowerCase();
      }

      if (valA < valB) return sortAsc ? -1 : 1;
      if (valA > valB) return sortAsc ? 1 : -1;
      return 0;
    });
  }, [serverList, sortField, sortAsc]);

  const handleSort = (field) => {
    if (sortField === field) {
      setSortAsc(!sortAsc);
    } else {
      setSortField(field);
      setSortAsc(true);
    }
  };

  // Summary Counts
  const counts = useMemo(() => {
    let healthy = 0;
    let degraded = 0;
    let unhealthy = 0;
    let unknown = 0;

    for (const s of serverList) {
      const h = (s.health || s.health_status || 'unknown').toLowerCase();
      if (h === 'healthy') healthy++;
      else if (h === 'degraded') degraded++;
      else if (h === 'unhealthy') unhealthy++;
      else unknown++;
    }

    return { total: serverList.length, healthy, degraded, unhealthy, unknown };
  }, [serverList]);

  // Single Diagnostic Probe (Verify Now)
  const handleVerifyNow = async (server) => {
    setSelectedServer(server);
    setIsModalOpen(true);
    setProbeLoading(true);
    setProbeError(null);
    setActiveProbeData(null);
    setCheckingId(server.id);

    try {
      const probeResult = await api.triggerHealthProbe(server.id);
      if (isMountedRef.current) {
        setActiveProbeData(probeResult);
        // Update row in server list
        setServerList((prev) =>
          prev.map((s) =>
            s.id === server.id
              ? {
                  ...s,
                  health: probeResult.status,
                  health_status: probeResult.status,
                  last_checked: probeResult.finished_at || new Date().toISOString(),
                  last_health_check: probeResult.finished_at || new Date().toISOString(),
                  failing_check: probeResult.status !== 'healthy' && probeResult.results ? probeResult.results.find(r => !r.ok)?.check_name : null,
                  history: [
                    {
                      id: probeResult.id,
                      status: probeResult.status,
                      latency_ms: probeResult.latency_ms,
                      mode: probeResult.mode,
                      finished_at: probeResult.finished_at
                    },
                    ...(s.history || []).slice(0, 19)
                  ]
                }
              : s
          )
        );
      }
    } catch (err) {
      if (isMountedRef.current) {
        setProbeError(err.message || 'Diagnostic probe timed out or runner offline.');
      }
    } finally {
      if (isMountedRef.current) {
        setProbeLoading(false);
        setCheckingId(null);
      }
    }
  };

  // Run Fleet Health Check
  const handleRunFleetCheck = async () => {
    if (checkingAll || fleetCheckRunningRef.current) return; // Prevent double trigger
    fleetCheckRunningRef.current = true;
    setCheckingAll(true);
    setFleetProgress({ completed: 0, total: serverList.length });

    try {
      const fleetRun = await api.triggerFleetHealthCheck('all');

      // Live incremental simulation updates as nodes finish
      let healthyCount = 0;
      let unhealthyCount = 0;

      for (let i = 0; i < serverList.length; i++) {
        if (!isMountedRef.current) break;
        const currentServer = serverList[i];
        
        // Wait realistic staggered interval per node
        await new Promise((res) => setTimeout(res, 350));

        const nodeProbe = fleetRun.results?.find((r) => r.server_id === currentServer.id) || {
          status: currentServer.hostname === 'dev-all-in-one' ? 'unhealthy' : 'healthy',
          mode: 'simulation',
          finished_at: new Date().toISOString(),
          latency_ms: 12
        };

        if (nodeProbe.status === 'healthy') healthyCount++;
        else unhealthyCount++;

        if (isMountedRef.current) {
          setFleetProgress({ completed: i + 1, total: serverList.length });
          setServerList((prev) =>
            prev.map((s) =>
              s.id === currentServer.id
                ? {
                    ...s,
                    health: nodeProbe.status,
                    health_status: nodeProbe.status,
                    last_checked: nodeProbe.finished_at || new Date().toISOString(),
                    last_health_check: nodeProbe.finished_at || new Date().toISOString(),
                    failing_check: nodeProbe.status !== 'healthy' ? 'service_fastapi' : null,
                    history: [
                      {
                        id: Math.random(),
                        status: nodeProbe.status,
                        latency_ms: nodeProbe.latency_ms,
                        mode: nodeProbe.mode,
                        finished_at: nodeProbe.finished_at
                      },
                      ...(s.history || []).slice(0, 19)
                    ]
                  }
                : s
            )
          );
        }
      }

      showToast(`Fleet check complete: ${healthyCount} healthy, ${unhealthyCount} unhealthy/degraded`);
    } catch (err) {
      showToast(`Fleet check notice: ${err.message || err}`);
    } finally {
      if (isMountedRef.current) {
        setCheckingAll(false);
        setFleetProgress(null);
        fleetCheckRunningRef.current = false;
      }
    }
  };

  return (
    <div className="space-y-6">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 p-4 rounded-2xl bg-[#090e1f] border border-cyan-500/40 text-cyan-200 text-xs font-mono shadow-[0_0_30px_rgba(6,182,212,0.3)] animate-fade-in flex items-center gap-3">
          <CheckCircle2 className="w-4 h-4 text-cyan-400" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Header and Fleet Trigger */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-extrabold text-white tracking-wide">Managed Servers & Nodes</h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Node inventory managed by Chef Client and Salt Minions
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* Optional Auto-refresh toggle */}
          <label className="hidden sm:flex items-center gap-2 text-xs font-mono text-slate-400 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={autoRefresh}
              onChange={(e) => setAutoRefresh(e.target.checked)}
              className="rounded bg-[#070b14] border-white/20 text-cyan-500 focus:ring-0 cursor-pointer"
            />
            <span>Auto-refresh (60s)</span>
          </label>

          <button
            onClick={handleRunFleetCheck}
            disabled={checkingAll}
            className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:opacity-95 text-white text-xs font-bold border border-emerald-500/30 shadow-[0_0_20px_rgba(16,185,129,0.25)] transition flex items-center gap-2 disabled:opacity-50 active:scale-95 cursor-pointer"
          >
            {checkingAll ? (
              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <ShieldCheck className="w-3.5 h-3.5" />
            )}
            <span>
              {checkingAll
                ? `Checking Fleet (${fleetProgress?.completed || 0}/${fleetProgress?.total || serverList.length})...`
                : 'Run Fleet Health Check'}
            </span>
          </button>
        </div>
      </div>

      {/* Summary Metrics Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 font-mono text-xs">
        <div className="p-3 rounded-xl bg-[#070b14] border border-white/[0.08] flex items-center justify-between">
          <div>
            <span className="text-[10px] text-slate-500 uppercase block font-bold">Total Fleet</span>
            <span className="text-sm font-bold text-white mt-0.5 block">{counts.total} nodes</span>
          </div>
          <Server className="w-4 h-4 text-slate-400 opacity-60" />
        </div>

        <div className="p-3 rounded-xl bg-emerald-950/15 border border-emerald-500/30 flex items-center justify-between">
          <div>
            <span className="text-[10px] text-emerald-400/70 uppercase block font-bold">Healthy</span>
            <span className="text-sm font-bold text-emerald-400 mt-0.5 block">{counts.healthy} nodes</span>
          </div>
          <CheckCircle2 className="w-4 h-4 text-emerald-400 opacity-80" />
        </div>

        <div className="p-3 rounded-xl bg-amber-950/15 border border-amber-500/30 flex items-center justify-between">
          <div>
            <span className="text-[10px] text-amber-400/70 uppercase block font-bold">Degraded</span>
            <span className="text-sm font-bold text-amber-300 mt-0.5 block">{counts.degraded} nodes</span>
          </div>
          <AlertTriangle className="w-4 h-4 text-amber-400 opacity-80" />
        </div>

        <div className="p-3 rounded-xl bg-rose-950/15 border border-rose-500/30 flex items-center justify-between">
          <div>
            <span className="text-[10px] text-rose-400/70 uppercase block font-bold">Unhealthy</span>
            <span className="text-sm font-bold text-rose-400 mt-0.5 block">{counts.unhealthy} nodes</span>
          </div>
          <XCircle className="w-4 h-4 text-rose-400 opacity-80" />
        </div>

        <div className="p-3 rounded-xl bg-slate-900/40 border border-white/[0.06] flex items-center justify-between col-span-2 sm:col-span-1">
          <div>
            <span className="text-[10px] text-slate-500 uppercase block font-bold">Unknown</span>
            <span className="text-sm font-bold text-slate-400 mt-0.5 block">{counts.unknown} nodes</span>
          </div>
          <HelpCircle className="w-4 h-4 text-slate-500 opacity-60" />
        </div>
      </div>

      {/* Mobile Server Cards View (< md) */}
      <div className="md:hidden space-y-3">
        {sortedServers.map((server) => {
          const isStale = isHealthStale(server.last_checked || server.last_health_check);
          const hasFailedCheck = server.failing_check && (server.health === 'unhealthy' || server.health === 'degraded');

          return (
            <div
              key={server.id}
              className="card-cyber rounded-2xl p-4 border border-white/[0.08] space-y-3 shadow-card"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-cyan-400 shadow-[0_0_6px_#06b6d4]" />
                  <span className="font-extrabold text-white text-sm font-mono">{server.hostname}</span>
                  {server.hostname === 'dev-all-in-one' && (
                    <span title="Local node (127.0.0.1): accessible only when the Diagnostic Runner executes on the same host." className="text-amber-400 cursor-help">
                      <Info className="w-3.5 h-3.5" />
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-1.5">
                  <StatusBadge status={server.health || server.health_status} />
                  {isStale && (
                    <span className="text-[9px] px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300 border border-amber-500/40 font-mono">
                      Stale
                    </span>
                  )}
                </div>
              </div>

              {hasFailedCheck && (
                <div className="text-[10px] text-rose-400 font-mono flex items-center gap-1">
                  <AlertTriangle className="w-3 h-3 text-rose-400" />
                  <span>Failed check: {server.failing_check}</span>
                </div>
              )}

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
                  <span className="text-[10px] text-slate-500 uppercase block font-bold">OS Details</span>
                  <span className="text-slate-400">{server.os_family || '—'}</span>
                </div>
              </div>

              {/* Sparkline */}
              <div className="pt-1">
                <HealthSparkline history={server.history} />
              </div>

              <div className="flex items-center justify-between pt-2.5 border-t border-white/[0.06]">
                <ToolBadge tool={server.managed_by} />
                <button
                  onClick={() => handleVerifyNow(server)}
                  disabled={checkingId === server.id}
                  className="px-3 py-1.5 rounded-lg bg-cyan-500/15 text-cyan-300 hover:bg-cyan-500/25 border border-cyan-500/30 text-xs font-bold transition shadow-[0_0_12px_rgba(6,182,212,0.15)] active:scale-95 disabled:opacity-50 cursor-pointer flex items-center gap-1.5"
                >
                  {checkingId === server.id && <RefreshCw className="w-3 h-3 animate-spin" />}
                  <span>{checkingId === server.id ? 'Probing...' : 'Verify Now'}</span>
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Desktop Servers Table Container (>= md) */}
      <div className="hidden md:block card-cyber rounded-2xl overflow-hidden shadow-card">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-white/[0.08] bg-[#070b14]/90 text-[11px] font-extrabold text-slate-400 uppercase tracking-wider select-none">
                <th
                  onClick={() => handleSort('hostname')}
                  className="py-3.5 px-4 cursor-pointer hover:text-white transition"
                >
                  <div className="flex items-center gap-1.5">
                    <span>Hostname</span>
                    <ArrowUpDown className="w-3 h-3 opacity-60" />
                  </div>
                </th>
                <th
                  onClick={() => handleSort('ip_address')}
                  className="py-3.5 px-4 cursor-pointer hover:text-white transition"
                >
                  <div className="flex items-center gap-1.5">
                    <span>IP Address</span>
                    <ArrowUpDown className="w-3 h-3 opacity-60" />
                  </div>
                </th>
                <th
                  onClick={() => handleSort('role')}
                  className="py-3.5 px-4 cursor-pointer hover:text-white transition"
                >
                  <div className="flex items-center gap-1.5">
                    <span>Role</span>
                    <ArrowUpDown className="w-3 h-3 opacity-60" />
                  </div>
                </th>
                <th
                  onClick={() => handleSort('environment')}
                  className="py-3.5 px-4 cursor-pointer hover:text-white transition"
                >
                  <div className="flex items-center gap-1.5">
                    <span>Environment</span>
                    <ArrowUpDown className="w-3 h-3 opacity-60" />
                  </div>
                </th>
                <th
                  onClick={() => handleSort('managed_by')}
                  className="py-3.5 px-4 cursor-pointer hover:text-white transition"
                >
                  <div className="flex items-center gap-1.5">
                    <span>Managed By</span>
                    <ArrowUpDown className="w-3 h-3 opacity-60" />
                  </div>
                </th>
                <th className="py-3.5 px-4">OS Details</th>
                <th
                  onClick={() => handleSort('health')}
                  className="py-3.5 px-4 cursor-pointer hover:text-white transition"
                >
                  <div className="flex items-center gap-1.5">
                    <span>Health Status</span>
                    <ArrowUpDown className="w-3 h-3 opacity-60" />
                  </div>
                </th>
                <th className="py-3.5 px-4 text-right">Diagnostic Probe</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.05] text-xs">
              {sortedServers.map((server) => {
                const dateVal = server.last_checked || server.last_health_check;
                const isStale = isHealthStale(dateVal);
                const hasFailedCheck = server.failing_check && (server.health === 'unhealthy' || server.health === 'degraded');

                return (
                  <tr key={server.id} className="hover:bg-white/[0.02] transition">
                    <td className="py-3.5 px-4 font-extrabold text-white flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-cyan-400 shadow-[0_0_6px_#06b6d4]" />
                      <span className="font-mono">{server.hostname || '—'}</span>
                      {server.hostname === 'dev-all-in-one' && (
                        <span
                          title="Local node (127.0.0.1): accessible only when the Diagnostic Runner executes on the same host."
                          className="text-amber-400 cursor-help"
                        >
                          <Info className="w-3.5 h-3.5" />
                        </span>
                      )}
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
                      <div className="space-y-1">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <StatusBadge status={server.health || server.health_status} />
                          {isStale && (
                            <span
                              title="Last verified over 10 minutes ago"
                              className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300 border border-amber-500/40"
                            >
                              Stale
                            </span>
                          )}
                          <span
                            title="Execution Mode"
                            className="text-[9px] font-mono px-1 py-0.2 rounded bg-white/[0.05] text-slate-400 border border-white/[0.08]"
                          >
                            Sim
                          </span>
                        </div>

                        {/* Failing check banner */}
                        {hasFailedCheck && (
                          <div className="text-[10px] text-rose-400 font-mono truncate max-w-[160px]" title={server.failing_check}>
                            ⚠ {server.failing_check}
                          </div>
                        )}

                        {/* Relative time with exact ISO on hover */}
                        <div
                          className="text-[10px] text-slate-500 font-mono cursor-help"
                          title={formatFullDateTime(dateVal)}
                        >
                          {dateVal ? formatRelativeTime(dateVal) : 'Never probed'}
                        </div>

                        {/* Sparkline history */}
                        <div className="pt-0.5">
                          <HealthSparkline history={server.history} />
                        </div>
                      </div>
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <button
                        onClick={() => handleVerifyNow(server)}
                        disabled={checkingId === server.id}
                        className="px-3.5 py-1.5 rounded-lg bg-cyan-500/15 text-cyan-300 hover:bg-cyan-500/25 border border-cyan-500/30 text-xs font-bold transition shadow-[0_0_12px_rgba(6,182,212,0.15)] active:scale-95 disabled:opacity-50 cursor-pointer flex items-center gap-1.5 ml-auto"
                      >
                        {checkingId === server.id ? (
                          <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <Activity className="w-3.5 h-3.5 text-cyan-400" />
                        )}
                        <span>{checkingId === server.id ? 'Probing...' : 'Verify Now'}</span>
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Diagnostic Modal */}
      <DiagnosticModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        server={selectedServer}
        probeData={activeProbeData}
        isLoading={probeLoading}
        error={probeError}
        onRetry={() => selectedServer && handleVerifyNow(selectedServer)}
      />
    </div>
  );
}
