import React from 'react';
import { MetricCard } from '../components/MetricCard';
import { StatusBadge, ToolBadge } from '../components/StatusBadge';
import { ExecutionTimer } from '../components/ExecutionTimer';
import { formatRelativeTime } from '../utils/time';
import {
  Activity,
  Server,
  Layers,
  ShieldCheck,
  TrendingUp,
  AlertTriangle,
  Play,
  FileText,
  Plus,
  Flame,
  CheckCircle2
} from 'lucide-react';

export function Dashboard({
  deployments,
  servers,
  toolStatus,
  onOpenDeployModal,
  onViewLogs,
  onExecuteDeploy,
  onCompleteDeploy,
  onCancelDeploy
}) {
  const activeDeployments = deployments.filter(d => d.status === 'running' || d.status === 'pending');
  const healthyServers = servers.filter(s => s.health_status === 'healthy');
  const failedDeployments = deployments.filter(d => d.status === 'failed');
  const successDeployments = deployments.filter(d => d.status === 'success');
  const successRate = deployments.length > 0
    ? Math.round((successDeployments.length / deployments.length) * 100)
    : 100;

  // Infrastructure services monitored
  const infraServices = [
    { name: 'Nginx Reverse Proxy', role: 'Web Tier', engine: 'Chef + Salt', port: '80 / 443', status: 'Healthy' },
    { name: 'FastAPI App Server', role: 'Application', engine: 'Chef + Salt', port: '8000', status: 'Healthy' },
    { name: 'PostgreSQL 15', role: 'Database', engine: 'SaltStack', port: '5432', status: 'Healthy' },
    { name: 'Prometheus & Node Exporter', role: 'Monitoring', engine: 'Chef + Salt', port: '9090 / 9100', status: 'Healthy' },
  ];

  return (
    <div className="space-y-6">
      {/* Hero Welcome Banner */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-[#0b101d] via-[#0d1424] to-[#121a2e] border border-white/[0.08] p-6 sm:p-8 shadow-card">
        {/* Ambient background glows */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-gradient-to-br from-orange-500/15 via-cyan-500/15 to-transparent rounded-full blur-3xl pointer-events-none -mr-20 -mt-20" />

        <div className="relative z-10 max-w-2xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/25 text-cyan-300 text-xs font-bold mb-3 shadow-[0_0_12px_rgba(6,182,212,0.15)]">
            <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse"></span>
            Unified SRE Automation Platform
          </div>
          <h2 className="text-2xl font-black tracking-tight text-white sm:text-3xl">
            Chef & SaltStack Orchestration
          </h2>
          <p className="mt-2.5 text-xs text-slate-300 leading-relaxed font-normal">
            Automate infrastructure provisioning across <strong className="text-white">Nginx Web Proxy</strong>, <strong className="text-white">FastAPI App Cluster</strong>, <strong className="text-white">PostgreSQL DB</strong>, and <strong className="text-white">Prometheus Telemetry</strong>.
          </p>
          <div className="mt-5 flex items-center gap-3">
            <button
              onClick={onOpenDeployModal}
              className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-orange-500 via-amber-500 to-cyan-500 hover:opacity-95 text-white text-xs font-extrabold shadow-[0_0_20px_rgba(249,115,22,0.3)] active:scale-95 transition flex items-center gap-2 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Trigger Full Stack Run</span>
            </button>
          </div>
        </div>
      </div>

      {/* Metric Cards Grid - 1 col on mobile, 2 on tablet, 4 on desktop */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          title="Active Deployments"
          value={activeDeployments.length}
          subtitle={`${deployments.length} total deployments recorded`}
          color="salt"
          icon={<Activity className="w-5 h-5 text-cyan-400" />}
        />
        <MetricCard
          title="Managed Nodes"
          value={`${healthyServers.length}/${servers.length}`}
          subtitle="Nodes verified healthy"
          change={healthyServers.length === servers.length ? "100% online" : `${servers.length - healthyServers.length} degraded`}
          color="emerald"
          icon={<ShieldCheck className="w-5 h-5 text-emerald-400" />}
        />
        <MetricCard
          title="Success Rate"
          value={`${successRate}%`}
          subtitle={failedDeployments.length > 0 ? `${failedDeployments.length} failed deployments` : "Zero failures"}
          color="purple"
          icon={<TrendingUp className="w-5 h-5 text-violet-400" />}
        />
        <MetricCard
          title="Automation Assets"
          value={`${toolStatus?.chef_cookbooks_count || 4} / ${toolStatus?.salt_states_count || 6}`}
          subtitle="Cookbooks & Salt States"
          color="chef"
          icon={<Layers className="w-5 h-5 text-orange-400" />}
        />
      </div>

      {/* Infrastructure Core Services Row */}
      <div className="card-cyber rounded-2xl p-5 border border-white/[0.08] shadow-card">
        <div className="flex items-center justify-between mb-3.5">
          <div>
            <h3 className="text-sm font-extrabold text-white tracking-wide">Core Infrastructure Stack</h3>
            <p className="text-xs text-slate-400">Nginx, FastAPI, PostgreSQL & Prometheus Service Mesh</p>
          </div>
          <span className="text-[11px] font-mono font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-0.5 rounded-lg flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
            Operational
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {infraServices.map((srv) => (
            <div
              key={srv.name}
              className="p-3.5 rounded-xl bg-[#070b14]/70 border border-white/[0.06] flex flex-col justify-between"
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold text-white">{srv.name}</span>
                <span className="w-2 h-2 rounded-full bg-emerald-400 shadow-[0_0_6px_#10b981]"></span>
              </div>
              <div className="space-y-1 text-[11px] text-slate-400 font-mono">
                <div className="flex justify-between">
                  <span>Role:</span>
                  <span className="text-slate-300">{srv.role}</span>
                </div>
                <div className="flex justify-between">
                  <span>Engine:</span>
                  <span className="text-cyan-300">{srv.engine}</span>
                </div>
                <div className="flex justify-between">
                  <span>Ports:</span>
                  <span className="text-slate-300">{srv.port}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Main Two-Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Columns: Live Deployment Activity */}
        <div className="card-cyber lg:col-span-2 rounded-2xl p-5 shadow-card">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-base font-extrabold text-white tracking-wide">Live Deployment Activity</h3>
              <p className="text-xs text-slate-400">Real-time status of infrastructure workflows</p>
            </div>
            <button
              onClick={onOpenDeployModal}
              className="text-xs font-bold text-cyan-400 hover:text-cyan-300 transition cursor-pointer"
            >
              + Create Deployment
            </button>
          </div>

          <div className="space-y-3">
            {deployments.slice(0, 4).map((dep) => (
              <div
                key={dep.id}
                className="p-4 rounded-xl bg-[#070b14]/70 border border-white/[0.06] hover:border-white/[0.12] transition"
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs text-slate-500 font-bold">#{dep.id}</span>
                    <h4 className="text-xs font-bold text-white">{dep.name}</h4>
                  </div>
                  <div className="flex items-center gap-2">
                    <StatusBadge status={dep.status} />
                    <ToolBadge tool={dep.tool} />
                  </div>
                </div>

                <p className="text-xs text-slate-400 mb-3 font-normal">{dep.description}</p>

                {/* Progress Bar */}
                <div className="w-full bg-[#0b101d] rounded-full h-2 mb-3 overflow-hidden border border-white/[0.05]">
                  <div
                    className={`h-2 rounded-full transition-all duration-500 ${
                      dep.status === 'failed'
                        ? 'bg-rose-500'
                        : dep.status === 'success'
                        ? 'bg-emerald-400'
                        : 'bg-gradient-to-r from-orange-400 to-cyan-400 progress-active-stripes shadow-[0_0_10px_#06b6d4]'
                    }`}
                    style={{ width: `${dep.progress}%` }}
                  />
                </div>

                <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] text-slate-500">
                  <div className="flex flex-wrap items-center gap-2 sm:gap-3">
                    <span>TARGETS: <strong className="text-slate-300 font-mono font-medium">{dep.target_hosts}</strong></span>
                    <span className="text-slate-600 hidden sm:inline">•</span>
                    <ExecutionTimer
                      status={dep.status}
                      startedAt={dep.started_at}
                      completedAt={dep.completed_at}
                      createdAt={dep.created_at}
                      progress={dep.progress}
                      variant="compact"
                    />
                  </div>

                  <div className="flex items-center gap-2">
                    {dep.status === 'pending' && (
                      <button
                        onClick={() => onExecuteDeploy(dep.id)}
                        className="px-2.5 py-1 rounded-lg bg-cyan-500/15 text-cyan-300 font-bold hover:bg-cyan-500/25 border border-cyan-500/30 transition cursor-pointer"
                      >
                        Run Now
                      </button>
                    )}
                    {dep.status === 'running' && onCompleteDeploy && (
                      <button
                        onClick={() => onCompleteDeploy(dep.id)}
                        className="px-2.5 py-1 rounded-lg bg-emerald-500/15 text-emerald-300 font-bold hover:bg-emerald-500/25 border border-emerald-500/30 transition cursor-pointer"
                      >
                        Complete
                      </button>
                    )}
                    <button
                      onClick={() => onViewLogs(dep)}
                      className="px-2.5 py-1 rounded-lg bg-white/[0.05] text-slate-300 font-semibold hover:bg-white/[0.1] border border-white/[0.07] transition cursor-pointer"
                    >
                      View Logs
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right Column: Cluster Node Infrastructure */}
        <div className="card-cyber rounded-2xl p-5 shadow-card flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-base font-extrabold text-white tracking-wide">Cluster Infrastructure</h3>
                <p className="text-xs text-slate-400">Node health & automation agents</p>
              </div>
              <span className="text-xs font-mono text-emerald-400 font-bold bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-md">
                {healthyServers.length}/{servers.length} Online
              </span>
            </div>

            <div className="space-y-2.5">
              {servers.map((srv) => (
                <div
                  key={srv.id}
                  className="p-3 rounded-xl bg-[#070b14]/70 border border-white/[0.06] flex items-center justify-between hover:border-white/[0.1] transition"
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-white font-mono">{srv.hostname}</span>
                      <span className="text-[10px] px-1.5 py-0.2 rounded bg-white/[0.06] text-slate-400 uppercase font-mono font-semibold">
                        {srv.role}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500 font-mono mt-0.5">{srv.ip_address}</p>
                  </div>
                  <div className="text-right">
                    <StatusBadge status={srv.health_status} />
                    <span className="block text-[10px] text-slate-500 mt-1 font-mono">
                      {srv.last_health_check ? new Date(srv.last_health_check).toLocaleTimeString() : 'Verified'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-4 p-3.5 rounded-xl bg-cyan-950/20 border border-cyan-800/30 text-xs text-slate-300">
            <div className="font-bold text-cyan-400 mb-1 flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-cyan-400"></span>
              Hybrid Automation Topology
            </div>
            <p className="text-[11px] text-slate-400 leading-normal">
              SaltStack enforces continuous highstate configurations and grains discovery. Chef Client manages complex virtual environments and reverse proxy compilation.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
