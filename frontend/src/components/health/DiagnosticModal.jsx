import React, { useState } from 'react';
import {
  X,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  HelpCircle,
  Copy,
  Check,
  RotateCcw,
  Clock,
  Activity,
  Cpu,
  Server,
  Zap,
  ShieldCheck
} from 'lucide-react';
import { StatusBadge } from '../StatusBadge';

export function DiagnosticModal({
  isOpen,
  onClose,
  server,
  probeData,
  isLoading,
  error,
  onRetry
}) {
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const handleCopyOutput = () => {
    if (!probeData) return;
    const textOutput = JSON.stringify(
      {
        server: {
          hostname: server?.hostname,
          ip: server?.ip_address,
          role: server?.role,
          environment: server?.environment
        },
        diagnostics: probeData
      },
      null,
      2
    );
    navigator.clipboard.writeText(textOutput);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const mode = probeData?.mode || 'simulation';
  const isReal = mode === 'real';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fade-in">
      <div className="relative w-full max-w-2xl rounded-2xl bg-[#070b18] border border-white/[0.12] shadow-[0_0_50px_rgba(0,0,0,0.8)] overflow-hidden flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="flex items-center justify-between p-4 sm:p-5 border-b border-white/[0.08] bg-[#03060f]/80">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center">
              <Activity className="w-5 h-5 text-cyan-400" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-white font-mono">
                  {server?.hostname || 'Diagnostic Probe'}
                </h3>
                {server?.ip_address && (
                  <span className="text-xs font-mono text-slate-400 bg-white/[0.04] px-2 py-0.5 rounded border border-white/[0.06]">
                    {server.ip_address}
                  </span>
                )}
                {/* Mode Chip */}
                <span
                  className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-full border ${
                    isReal
                      ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/40'
                      : 'bg-purple-500/15 text-purple-300 border-purple-500/40'
                  }`}
                >
                  {isReal ? '● Real Runner' : '⚡ Simulation Mode'}
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Role: <span className="uppercase font-semibold text-slate-300">{server?.role}</span> &bull;{' '}
                Env: <span className="capitalize text-slate-300">{server?.environment}</span>
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/[0.06] transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-4 text-xs font-mono">
          {isLoading ? (
            <div className="py-16 text-center space-y-3">
              <div className="w-10 h-10 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin mx-auto" />
              <p className="text-slate-300 font-bold">Executing Diagnostic TCP & Service Probes...</p>
              <p className="text-slate-500 text-[11px]">Connecting to port 22, role ports, and evaluating health rule</p>
            </div>
          ) : error ? (
            <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 space-y-3">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-rose-400" />
                <span className="font-bold">Diagnostic Probe Failed</span>
              </div>
              <p className="text-[11px] leading-relaxed text-slate-300">
                {error.message || error || 'Runner connection timed out or unreachable.'}
              </p>
              {onRetry && (
                <button
                  onClick={onRetry}
                  className="px-3 py-1.5 rounded-lg bg-rose-500/20 text-rose-200 border border-rose-500/40 hover:bg-rose-500/30 transition flex items-center gap-1.5 text-xs font-bold cursor-pointer"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Retry Probe</span>
                </button>
              )}
            </div>
          ) : probeData ? (
            <>
              {/* Summary Metric Header */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="p-3 rounded-xl bg-[#040813] border border-white/[0.08] flex items-center justify-between">
                  <div>
                    <span className="text-[10px] text-slate-500 uppercase block font-bold">Overall Status</span>
                    <div className="mt-1">
                      <StatusBadge status={probeData.status} />
                    </div>
                  </div>
                  {probeData.status === 'healthy' ? (
                    <CheckCircle2 className="w-6 h-6 text-emerald-400 opacity-80" />
                  ) : probeData.status === 'degraded' ? (
                    <AlertTriangle className="w-6 h-6 text-amber-400 opacity-80" />
                  ) : (
                    <XCircle className="w-6 h-6 text-rose-400 opacity-80" />
                  )}
                </div>

                <div className="p-3 rounded-xl bg-[#040813] border border-white/[0.08] flex items-center justify-between">
                  <div>
                    <span className="text-[10px] text-slate-500 uppercase block font-bold">Total Duration</span>
                    <span className="text-base font-bold text-white block mt-0.5">
                      {probeData.latency_ms || 0} ms
                    </span>
                  </div>
                  <Clock className="w-6 h-6 text-cyan-400 opacity-80" />
                </div>

                <div className="p-3 rounded-xl bg-[#040813] border border-white/[0.08] flex items-center justify-between">
                  <div>
                    <span className="text-[10px] text-slate-500 uppercase block font-bold">Execution Engine</span>
                    <span className="text-xs font-bold text-slate-200 block mt-1 capitalize">
                      {isReal ? 'Real Host Probes' : 'Simulated Telemetry'}
                    </span>
                  </div>
                  <Zap className="w-6 h-6 text-purple-400 opacity-80" />
                </div>
              </div>

              {/* Status Summary Banner */}
              {probeData.summary && (
                <div className="p-3 rounded-xl bg-white/[0.02] border border-white/[0.06] text-slate-300 text-xs">
                  <span className="text-slate-500 font-bold mr-2">&gt; Summary:</span>
                  <span>{probeData.summary}</span>
                </div>
              )}

              {/* Granular Checks List */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-slate-400 pb-1 border-b border-white/[0.06] text-[11px]">
                  <span>Diagnostic Checks ({probeData.results?.length || 0})</span>
                  <span>Latency / Return Value</span>
                </div>

                <div className="space-y-1.5">
                  {(probeData.results || []).map((check, idx) => {
                    const isOk = check.ok;
                    return (
                      <div
                        key={idx}
                        className={`p-2.5 rounded-xl border transition flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 ${
                          isOk
                            ? 'bg-[#050a17] border-white/[0.06] hover:border-emerald-500/30'
                            : 'bg-rose-950/20 border-rose-500/40'
                        }`}
                      >
                        <div className="flex items-start sm:items-center gap-2">
                          {isOk ? (
                            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5 sm:mt-0" />
                          ) : (
                            <XCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5 sm:mt-0" />
                          )}
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-slate-200 text-xs">{check.check_name}</span>
                              <span
                                className={`text-[9px] font-bold px-1.5 py-0.2 rounded ${
                                  isOk
                                    ? 'bg-emerald-500/10 text-emerald-400'
                                    : 'bg-rose-500/20 text-rose-300'
                                }`}
                              >
                                {isOk ? 'PASS' : 'FAIL'}
                              </span>
                            </div>
                            {check.detail && (
                              <p className="text-[10px] text-slate-400 mt-0.5 leading-normal font-sans">
                                {check.detail}
                              </p>
                            )}
                          </div>
                        </div>

                        <div className="text-right shrink-0">
                          <span className="text-slate-300 font-bold text-xs">{check.value || '—'}</span>
                          <span className="text-[10px] text-cyan-400 block font-mono">
                            {check.latency_ms || 0} ms
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </>
          ) : (
            <div className="py-8 text-center text-slate-500">
              <span>No probe results available.</span>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-4 border-t border-white/[0.08] bg-[#03060f]/90 flex items-center justify-between">
          <div className="text-[11px] text-slate-400 font-mono">
            {server?.hostname === 'dev-all-in-one' && (
              <span className="text-amber-400">
                ⚠ Local node (127.0.0.1): requires local runner daemon.
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            {probeData && (
              <button
                onClick={handleCopyOutput}
                className="px-3 py-1.5 rounded-xl bg-white/[0.06] hover:bg-white/[0.1] text-slate-200 text-xs font-bold border border-white/[0.1] transition flex items-center gap-1.5 cursor-pointer"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copied ? 'Copied Output!' : 'Copy Output'}</span>
              </button>
            )}

            <button
              onClick={onClose}
              className="px-4 py-1.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-bold transition cursor-pointer"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
