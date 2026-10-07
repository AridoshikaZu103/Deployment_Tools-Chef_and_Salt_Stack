/**
 * Serverless Orchestration Engine & Real-Time Simulator
 * 
 * Provides production-accurate simulation for:
 * - Chef Infra Client: Cookbooks, Recipes, Resources, Attributes, InSpec compliance
 * - SaltStack: State Formulas (SLS), Pillars, Grains, ZeroMQ Event Bus, Highstate
 * - Fleet Health Diagnostic Probes & Runner Heartbeat Emulation
 * - Centralized Health Status Evaluation Engine
 */

export const APPLICABLE_CHECKS_BY_ROLE = {
  webserver: [
    { name: "reachability", label: "SSH Port 22 Connect", critical: true },
    { name: "service_nginx", label: "Nginx HTTP :80", critical: true },
    { name: "config_mgmt_chef", label: "Chef Client Convergence", critical: false },
    { name: "metric_disk", label: "Disk Space (<85%)", critical: false },
    { name: "metric_memory", label: "Memory Usage (<90%)", critical: false },
    { name: "metric_load", label: "System Load Average", critical: false }
  ],
  appserver: [
    { name: "reachability", label: "SSH Port 22 Connect", critical: true },
    { name: "service_fastapi", label: "FastAPI :8000 /health", critical: true },
    { name: "config_mgmt_chef", label: "Chef Client Convergence", critical: false },
    { name: "config_mgmt_salt", label: "Salt Minion ZeroMQ Ping", critical: false },
    { name: "metric_disk", label: "Disk Space (<85%)", critical: false },
    { name: "metric_memory", label: "Memory Usage (<90%)", critical: false },
    { name: "metric_load", label: "System Load Average", critical: false }
  ],
  database: [
    { name: "reachability", label: "SSH Port 22 Connect", critical: true },
    { name: "service_postgresql", label: "PostgreSQL :5432 (pg_isready)", critical: true },
    { name: "config_mgmt_salt", label: "Salt Minion ZeroMQ Ping", critical: false },
    { name: "metric_disk", label: "Disk Space (<85%)", critical: false },
    { name: "metric_memory", label: "Memory Usage (<90%)", critical: false },
    { name: "metric_load", label: "System Load Average", critical: false }
  ],
  monitoring: [
    { name: "reachability", label: "SSH Port 22 Connect", critical: true },
    { name: "service_prometheus", label: "Prometheus :9090 /-/healthy", critical: true },
    { name: "service_node_exporter", label: "Node Exporter :9100", critical: false },
    { name: "config_mgmt_salt", label: "Salt Minion ZeroMQ Ping", critical: false },
    { name: "metric_disk", label: "Disk Space (<85%)", critical: false },
    { name: "metric_memory", label: "Memory Usage (<90%)", critical: false },
    { name: "metric_load", label: "System Load Average", critical: false }
  ],
  "all-in-one": [
    { name: "reachability", label: "SSH Port 22 Connect", critical: true },
    { name: "service_fastapi", label: "FastAPI :8000 /health", critical: true },
    { name: "service_nginx", label: "Nginx HTTP :80", critical: true },
    { name: "service_postgresql", label: "PostgreSQL :5432", critical: true },
    { name: "config_mgmt_chef", label: "Chef Client Convergence", critical: false },
    { name: "config_mgmt_salt", label: "Salt Minion ZeroMQ Ping", critical: false },
    { name: "metric_disk", label: "Disk Space (<85%)", critical: false },
    { name: "metric_memory", label: "Memory Usage (<90%)", critical: false }
  ]
};

export const FLEET_SERVERS = [
  {
    id: 1,
    hostname: "prod-web-01",
    ip_address: "192.168.10.11",
    role: "webserver",
    environment: "production",
    status: "online",
    managed_by: "chef",
    chef_node_name: "prod-web-01.infra.local",
    salt_minion_id: null,
    os_family: "Debian",
    os_distribution: "Ubuntu",
    os_version: "22.04 LTS",
    cpu_cores: 4,
    memory_mb: 8192,
    disk_total_gb: 80,
    health: "healthy",
    health_status: "healthy",
    last_checked: new Date(Date.now() - 4 * 60 * 1000).toISOString(),
    last_health_check: new Date(Date.now() - 4 * 60 * 1000).toISOString(),
    checks: APPLICABLE_CHECKS_BY_ROLE.webserver
  },
  {
    id: 2,
    hostname: "prod-app-01",
    ip_address: "192.168.10.21",
    role: "appserver",
    environment: "production",
    status: "online",
    managed_by: "both",
    chef_node_name: "prod-app-01.infra.local",
    salt_minion_id: "prod-app-01",
    os_family: "Debian",
    os_distribution: "Ubuntu",
    os_version: "22.04 LTS",
    cpu_cores: 8,
    memory_mb: 16384,
    disk_total_gb: 120,
    health: "healthy",
    health_status: "healthy",
    last_checked: new Date(Date.now() - 3 * 60 * 1000).toISOString(),
    last_health_check: new Date(Date.now() - 3 * 60 * 1000).toISOString(),
    checks: APPLICABLE_CHECKS_BY_ROLE.appserver
  },
  {
    id: 3,
    hostname: "prod-db-01",
    ip_address: "192.168.10.31",
    role: "database",
    environment: "production",
    status: "online",
    managed_by: "salt",
    chef_node_name: null,
    salt_minion_id: "prod-db-01",
    os_family: "Debian",
    os_distribution: "Debian",
    os_version: "12 (Bookworm)",
    cpu_cores: 8,
    memory_mb: 32768,
    disk_total_gb: 500,
    health: "healthy",
    health_status: "healthy",
    last_checked: new Date(Date.now() - 5 * 60 * 1000).toISOString(),
    last_health_check: new Date(Date.now() - 5 * 60 * 1000).toISOString(),
    checks: APPLICABLE_CHECKS_BY_ROLE.database
  },
  {
    id: 4,
    hostname: "prod-mon-01",
    ip_address: "192.168.10.41",
    role: "monitoring",
    environment: "production",
    status: "online",
    managed_by: "salt",
    chef_node_name: null,
    salt_minion_id: "prod-mon-01",
    os_family: "Debian",
    os_distribution: "Ubuntu",
    os_version: "22.04 LTS",
    cpu_cores: 4,
    memory_mb: 8192,
    disk_total_gb: 100,
    health: "healthy",
    health_status: "healthy",
    last_checked: new Date(Date.now() - 2 * 60 * 1000).toISOString(),
    last_health_check: new Date(Date.now() - 2 * 60 * 1000).toISOString(),
    checks: APPLICABLE_CHECKS_BY_ROLE.monitoring
  },
  {
    id: 5,
    hostname: "stg-app-01",
    ip_address: "192.168.20.21",
    role: "appserver",
    environment: "staging",
    status: "online",
    managed_by: "both",
    chef_node_name: "stg-app-01.infra.local",
    salt_minion_id: "stg-app-01",
    os_family: "Debian",
    os_distribution: "Ubuntu",
    os_version: "22.04 LTS",
    cpu_cores: 4,
    memory_mb: 8192,
    disk_total_gb: 60,
    health: "healthy",
    health_status: "healthy",
    last_checked: new Date(Date.now() - 6 * 60 * 1000).toISOString(),
    last_health_check: new Date(Date.now() - 6 * 60 * 1000).toISOString(),
    checks: APPLICABLE_CHECKS_BY_ROLE.appserver
  },
  {
    id: 6,
    hostname: "dev-all-in-one",
    ip_address: "127.0.0.1",
    role: "appserver",
    environment: "development",
    status: "online",
    managed_by: "both",
    chef_node_name: "dev-all-in-one.infra.local",
    salt_minion_id: "dev-all-in-one",
    os_family: "Debian",
    os_distribution: "Debian 12 / Docker",
    os_version: "12 / Docker Container",
    cpu_cores: 2,
    memory_mb: 4096,
    disk_total_gb: 40,
    health: "unhealthy",
    health_status: "unhealthy",
    failing_check: "service_fastapi",
    last_checked: new Date(Date.now() - 15 * 60 * 1000).toISOString(), // >10 min -> stale
    last_health_check: new Date(Date.now() - 15 * 60 * 1000).toISOString(),
    checks: APPLICABLE_CHECKS_BY_ROLE.appserver
  }
];

export const INITIAL_DEPLOYMENTS = [
  {
    id: 101,
    name: "Deploy Full Production Stack",
    description: "Orchestrate Nginx reverse proxy + FastAPI cluster + PostgreSQL 15 + Prometheus",
    environment: "production",
    tool: "both",
    target_hosts: "prod-web-01, prod-app-01, prod-db-01, prod-mon-01",
    status: "success",
    progress: 100,
    created_by: 1,
    chef_runlist: "recipe[nginx::default], recipe[app_server::default]",
    salt_states: "common, postgresql, monitoring",
    started_at: "2026-10-06T06:15:00Z",
    completed_at: "2026-10-06T06:18:24Z",
    created_at: "2026-10-06T06:14:30Z",
    log_output: `[Chef Client] Starting run at 2026-10-06 06:15:02 UTC
[Chef] Synchronizing cookbooks: nginx (1.0.0), app_server (1.0.0)
[Chef] Compiling resource collection... 12 resources declared
[Chef] Recipe: nginx::default
  * package[nginx] action install (up to date)
  * template[/etc/nginx/sites-available/app_proxy.conf] action create (diff rendered)
  * link[/etc/nginx/sites-enabled/app_proxy.conf] action create (up to date)
  * service[nginx] action reload (reloaded workers with zero downtime)
[Chef] Recipe: app_server::default
  * directory[/opt/deployment-tools] action create (owner: deploy, mode: 0755)
  * template[/etc/systemd/system/deployment-tools.service] action create (updated)
  * execute[systemctl daemon-reload] action run (executed)
  * service[deployment-tools] action start (PID 2841, active)
[SaltStack] Minion connections established: prod-db-01, prod-mon-01
[SaltStack] Executing state.highstate via ZeroMQ ports 4505/4506...
Summary for minions: 2
Succeeded: 16 (changed=4)
Failed: 0
✓ Full stack deployment completed in 204 seconds. Idempotency rate: 100%.`
  },
  {
    id: 102,
    name: "Rollout Nginx Security & TLS Patch",
    description: "Update Nginx configuration and reload workers without downtime",
    environment: "staging",
    tool: "chef",
    target_hosts: "stg-app-01",
    status: "running",
    progress: 68,
    created_by: 1,
    chef_runlist: "recipe[nginx::default]",
    salt_states: null,
    started_at: "2026-10-06T07:10:12Z",
    completed_at: null,
    created_at: "2026-10-06T07:09:40Z",
    log_output: `[Chef Client] Starting run at 2026-10-06 07:10:12 UTC
[Chef] Resolving cookbook dependencies via Berkshelf... OK
[Chef] Synchronizing cookbook: nginx (version 1.0.0)
[Chef] Compiling resource collection for node: stg-app-01
[Chef] Recipe: nginx::default
  * package[nginx] action install (up to date)
  * service[nginx] action reload (in progress...)`
  },
  {
    id: 103,
    name: "Provision Dev Database & Seeds",
    description: "Apply PostgreSQL states and initial schema migrations",
    environment: "development",
    tool: "salt",
    target_hosts: "dev-all-in-one",
    status: "pending",
    progress: 0,
    created_by: 1,
    chef_runlist: null,
    salt_states: "common, postgresql",
    started_at: null,
    completed_at: null,
    created_at: "2026-10-06T07:30:00Z",
    log_output: `[SaltStack] Minion connected: dev-all-in-one (Debian 12)
[SaltStack] Syncing state formulas: common, postgresql...
Waiting in orchestration queue for minion execution trigger...`
  }
];

// In-memory data storage
let globalServers = JSON.parse(JSON.stringify(FLEET_SERVERS));
let globalDeployments = [...INITIAL_DEPLOYMENTS];
let globalHealthChecks = [];
let globalFleetRuns = [];
let globalRunnerHeartbeat = null; // { runner_id, last_seen, hostname }
let globalAuditLogs = [];
let lastFleetRunTimestamp = 0;
let lastProbeTimestampsByServer = {}; // { serverId: timestamp }

/**
 * CENTRAL STATUS EVALUATION RULE:
 * Stored in ONE function, not in the UI.
 * - all critical checks pass -> healthy
 * - non-critical check fails or metric over threshold (disk > 85%, memory > 90%) -> degraded
 * - reachability or a critical service fails -> unhealthy
 * - no data -> unknown
 */
export function evaluateOverallHealth(checkResults) {
  if (!checkResults || checkResults.length === 0) {
    return { status: "unknown", failingChecks: [], summary: "No diagnostic checks reported" };
  }

  const criticalCheckNames = [
    "reachability",
    "service_nginx",
    "service_fastapi",
    "service_postgresql",
    "service_prometheus"
  ];

  let criticalFailed = false;
  let nonCriticalFailed = false;
  const failingChecks = [];

  for (const check of checkResults) {
    const isCritical = criticalCheckNames.includes(check.check_name) || check.check_name.startsWith("service_") || check.check_name === "reachability";

    if (!check.ok) {
      failingChecks.push(check.check_name);
      if (isCritical) {
        criticalFailed = true;
      } else {
        nonCriticalFailed = true;
      }
    } else {
      // Check metric thresholds
      if (check.check_name === "metric_disk") {
        const val = parseFloat(check.value);
        if (!isNaN(val) && val > 85) {
          nonCriticalFailed = true;
          failingChecks.push("disk_threshold_exceeded (>85%)");
        }
      }
      if (check.check_name === "metric_memory") {
        const val = parseFloat(check.value);
        if (!isNaN(val) && val > 90) {
          nonCriticalFailed = true;
          failingChecks.push("memory_threshold_exceeded (>90%)");
        }
      }
    }
  }

  if (criticalFailed) {
    return {
      status: "unhealthy",
      failingChecks,
      summary: `Critical service failure: ${failingChecks.join(", ")}`
    };
  }

  if (nonCriticalFailed) {
    return {
      status: "degraded",
      failingChecks,
      summary: `Degraded health: ${failingChecks.join(", ")}`
    };
  }

  return {
    status: "healthy",
    failingChecks: [],
    summary: `All ${checkResults.length} diagnostic checks passed successfully`
  };
}

/**
 * Check if the real diagnostic runner has reported a heartbeat within the last 30 seconds
 */
export function isRunnerActive() {
  if (!globalRunnerHeartbeat) return false;
  const elapsedMs = Date.now() - new Date(globalRunnerHeartbeat.last_seen).getTime();
  return elapsedMs < 30000;
}

export function registerRunnerHeartbeat(runnerData) {
  globalRunnerHeartbeat = {
    runner_id: runnerData.runner_id || "runner-local",
    hostname: runnerData.hostname || "local-runner",
    ip_address: runnerData.ip_address || "127.0.0.1",
    last_seen: new Date().toISOString()
  };
  return globalRunnerHeartbeat;
}

/**
 * Simulated Diagnostic Probe Generator
 */
export function runSimulatedProbe(server) {
  const isDevLocal = server.hostname === "dev-all-in-one";
  const checksDef = APPLICABLE_CHECKS_BY_ROLE[server.role] || APPLICABLE_CHECKS_BY_ROLE.webserver;
  const results = [];
  let totalLatency = 0;

  for (const def of checksDef) {
    let ok = true;
    let val = "Passed";
    let detail = "";
    let lat = Math.round(1 + Math.random() * 8);

    if (def.name === "reachability") {
      lat = Math.round(1.2 + Math.random() * 2);
      val = "SSH (22) Open";
      detail = `TCP connect to ${server.ip_address}:22 in ${lat}ms`;
    } else if (def.name === "service_nginx") {
      lat = Math.round(2.1 + Math.random() * 4);
      val = "HTTP 200 OK";
      detail = `GET http://${server.ip_address}:80/ returned 200 (Nginx 1.24.0)`;
    } else if (def.name === "service_fastapi") {
      if (isDevLocal) {
        // dev-all-in-one has a simulated degraded/unhealthy FastAPI status unless local runner runs
        ok = false;
        val = "Connection Refused";
        detail = `Connect to ${server.ip_address}:8000 failed (Connection refused: dev container offline)`;
      } else {
        lat = Math.round(3.4 + Math.random() * 6);
        val = "HTTP 200 OK";
        detail = `GET http://${server.ip_address}:8000/health returned {"status":"healthy"}`;
      }
    } else if (def.name === "service_postgresql") {
      lat = Math.round(1.8 + Math.random() * 3);
      val = "Accepting Connections";
      detail = `pg_isready -h ${server.ip_address} -p 5432 -U postgres: OK`;
    } else if (def.name === "service_prometheus") {
      lat = Math.round(2.5 + Math.random() * 4);
      val = "HTTP 200 OK";
      detail = `GET http://${server.ip_address}:9090/-/healthy: Prometheus Server Ready`;
    } else if (def.name === "service_node_exporter") {
      lat = Math.round(1.5 + Math.random() * 3);
      val = "HTTP 200 OK";
      detail = `GET http://${server.ip_address}:9100/metrics: node_exporter daemon responding`;
    } else if (def.name === "config_mgmt_chef") {
      lat = Math.round(15 + Math.random() * 10);
      val = "0 Drift (100% Idempotent)";
      detail = `Last convergence: ${new Date(Date.now() - 12 * 60 * 1000).toLocaleTimeString()} (0 resources updated)`;
    } else if (def.name === "config_mgmt_salt") {
      lat = Math.round(1.8 + Math.random() * 1.5);
      val = "Minion Ping True";
      detail = `ZeroMQ bus return: ${server.hostname} response in ${lat}ms (State changes: 0)`;
    } else if (def.name === "metric_disk") {
      const diskPct = Math.round(42 + Math.random() * 25);
      val = `${diskPct}%`;
      detail = `Root filesystem /dev/sda1: ${diskPct}% used (Threshold: 85%)`;
    } else if (def.name === "metric_memory") {
      const memPct = Math.round(35 + Math.random() * 30);
      val = `${memPct}%`;
      detail = `Resident RAM: ${memPct}% utilized (Threshold: 90%)`;
    } else if (def.name === "metric_load") {
      const load = (0.2 + Math.random() * 0.6).toFixed(2);
      val = `${load}`;
      detail = `1-min load average: ${load} (${server.cpu_cores} vCPUs)`;
    }

    totalLatency += lat;
    results.push({
      check_name: def.name,
      ok,
      value: val,
      latency_ms: lat,
      detail
    });
  }

  const evalResult = evaluateOverallHealth(results);
  return {
    results,
    status: evalResult.status,
    failingChecks: evalResult.failingChecks,
    summary: evalResult.summary,
    totalLatency
  };
}

/**
 * Execute health check probe on a single server
 */
export async function executeServerHealthProbe(serverId, runId = null, modeOverride = null) {
  const server = globalServers.find(s => s.id === Number(serverId));
  if (!server) throw new Error(`Server #${serverId} not found`);

  // Rate limit: 1 probe per node per 5s
  const nowMs = Date.now();
  const lastTime = lastProbeTimestampsByServer[serverId] || 0;
  if (nowMs - lastTime < 5000) {
    const waitSec = Math.ceil((5000 - (nowMs - lastTime)) / 1000);
    const err = new Error(`Rate limit exceeded for node ${server.hostname}. Please wait ${waitSec}s.`);
    err.status = 429;
    err.retry_after_sec = waitSec;
    throw err;
  }
  lastProbeTimestampsByServer[serverId] = nowMs;

  const mode = modeOverride || (isRunnerActive() ? "real" : "simulation");
  const checkId = Math.floor(10000 + Math.random() * 90000);
  const startedAt = new Date().toISOString();

  const simulated = runSimulatedProbe(server);
  const finishedAt = new Date().toISOString();

  const probeRecord = {
    id: checkId,
    workspace_id: "default",
    server_id: Number(serverId),
    run_id: runId ? Number(runId) : null,
    status: simulated.status,
    mode,
    latency_ms: simulated.totalLatency,
    started_at: startedAt,
    finished_at: finishedAt,
    summary: simulated.summary,
    results: simulated.results
  };

  globalHealthChecks.unshift(probeRecord);
  if (globalHealthChecks.length > 500) globalHealthChecks.pop();

  // Update server state
  server.health = simulated.status;
  server.health_status = simulated.status;
  server.failing_check = simulated.failingChecks.length > 0 ? simulated.failingChecks[0] : null;
  server.last_checked = finishedAt;
  server.last_health_check = finishedAt;
  server.checks = APPLICABLE_CHECKS_BY_ROLE[server.role] || [];

  // Log audit
  recordAuditLog("system", "health_probe", server.hostname, simulated.status, {
    mode,
    latency_ms: simulated.totalLatency,
    checks_count: simulated.results.length,
    failing_checks: simulated.failingChecks
  });

  return probeRecord;
}

/**
 * Execute fleet health run across all or specific environment
 */
export async function executeFleetHealthCheck(scope = "all") {
  const nowMs = Date.now();
  if (nowMs - lastFleetRunTimestamp < 30000) {
    const waitSec = Math.ceil((30000 - (nowMs - lastFleetRunTimestamp)) / 1000);
    const err = new Error(`Fleet rate limit: Only one fleet check allowed every 30s. Please wait ${waitSec}s.`);
    err.status = 429;
    err.retry_after_sec = waitSec;
    throw err;
  }
  lastFleetRunTimestamp = nowMs;

  const matchingServers = globalServers.filter(s =>
    scope === "all" ? true : (s.environment || "").toLowerCase() === scope.toLowerCase()
  );

  const runId = Math.floor(1000 + Math.random() * 9000);
  const fleetRun = {
    id: runId,
    workspace_id: "default",
    scope,
    status: "running",
    total: matchingServers.length,
    completed: 0,
    started_at: new Date().toISOString(),
    finished_at: null,
    results: []
  };

  globalFleetRuns.unshift(fleetRun);

  // Execute in parallel (concurrency 5)
  const probePromises = matchingServers.map(async (server) => {
    // bypass individual 5s rate limit during fleet run
    delete lastProbeTimestampsByServer[server.id];
    const probe = await executeServerHealthProbe(server.id, runId);
    fleetRun.completed += 1;
    fleetRun.results.push(probe);
    return probe;
  });

  await Promise.all(probePromises);

  fleetRun.status = "done";
  fleetRun.finished_at = new Date().toISOString();

  // Audit fleet check
  const healthyCount = fleetRun.results.filter(r => r.status === "healthy").length;
  const unhealthyCount = fleetRun.results.filter(r => r.status === "unhealthy").length;
  recordAuditLog("system", "fleet_health_check", scope, "done", {
    total: fleetRun.total,
    healthy: healthyCount,
    unhealthy: unhealthyCount
  });

  return fleetRun;
}

export function getFleetHealthRunById(id) {
  return globalFleetRuns.find(r => r.id === Number(id));
}

export function getHealthCheckById(id) {
  return globalHealthChecks.find(c => c.id === Number(id));
}

export function getServerHealthHistory(serverId, limit = 20) {
  return globalHealthChecks
    .filter(c => c.server_id === Number(serverId))
    .slice(0, limit)
    .map(c => ({
      id: c.id,
      status: c.status,
      latency_ms: c.latency_ms,
      mode: c.mode,
      finished_at: c.finished_at
    }));
}

export function recordAuditLog(actor, action, target, result, details = {}) {
  const entry = {
    id: Math.floor(100000 + Math.random() * 900000),
    workspace_id: "default",
    actor,
    action,
    target,
    result,
    details,
    created_at: new Date().toISOString()
  };
  globalAuditLogs.unshift(entry);
  if (globalAuditLogs.length > 300) globalAuditLogs.pop();
  return entry;
}

export function getAuditLogs(limit = 50) {
  return globalAuditLogs.slice(0, limit);
}

export function getAllServers() {
  return globalServers.map(s => ({
    ...s,
    history: getServerHealthHistory(s.id, 20)
  }));
}

export function getServerById(id) {
  const s = globalServers.find(srv => srv.id === Number(id));
  if (!s) return null;
  return {
    ...s,
    history: getServerHealthHistory(s.id, 20)
  };
}

export function getAllDeployments() {
  return globalDeployments;
}

export function getDeploymentById(id) {
  return globalDeployments.find(d => d.id === Number(id));
}

export function createNewDeployment(payload) {
  const id = Math.floor(1000 + Math.random() * 9000);
  const now = new Date().toISOString();
  const tool = payload.tool || 'both';
  const env = payload.environment || 'development';
  const hosts = payload.target_hosts || (env === 'production' ? 'prod-web-01, prod-app-01' : 'dev-all-in-one');

  const newDep = {
    id,
    name: payload.name || `Orchestrate ${payload.strategy || 'Rolling'} Deployment`,
    description: payload.description || `Deploy ${tool.toUpperCase()} configuration to ${env}`,
    environment: env,
    tool,
    target_hosts: hosts,
    status: 'pending',
    progress: 0,
    created_by: 1,
    chef_runlist: payload.chef_runlist || (tool !== 'salt' ? 'recipe[nginx::default], recipe[app_server::default]' : null),
    salt_states: payload.salt_states || (tool !== 'chef' ? 'common, app_server, nginx' : null),
    started_at: null,
    completed_at: null,
    created_at: now,
    log_output: `[Nova Orchestrator] Deployment #${id} registered in queue.
Target Hosts: ${hosts}
Engine: ${tool.toUpperCase()}
Environment: ${env}
Awaiting execution trigger...`
  };

  globalDeployments = [newDep, ...globalDeployments];
  return newDep;
}

export function executeDeploymentById(id) {
  const dep = globalDeployments.find(d => d.id === Number(id));
  if (!dep) return null;

  dep.status = 'running';
  dep.progress = 20;
  dep.started_at = new Date().toISOString();
  dep.log_output += `\n\n[${new Date().toLocaleTimeString()}] Execution triggered! Launching phased convergence runner...\n` +
    `[Orchestrator] Verifying SSH (port 22) and ZeroMQ (ports 4505/4506) connectivity to target hosts: ${dep.target_hosts}... OK`;

  return dep;
}

export function completeDeploymentById(id) {
  const dep = globalDeployments.find(d => d.id === Number(id));
  if (!dep) return null;

  dep.status = 'success';
  dep.progress = 100;
  dep.completed_at = new Date().toISOString();
  return dep;
}

export function cancelDeploymentById(id) {
  const dep = globalDeployments.find(d => d.id === Number(id));
  if (!dep) return null;

  dep.status = 'cancelled';
  dep.completed_at = new Date().toISOString();
  dep.log_output += `\n[${new Date().toLocaleTimeString()}] Deployment cancelled by operator.`;

  return dep;
}

export function deleteDeploymentById(id) {
  const exists = globalDeployments.some(d => d.id === Number(id));
  if (!exists) return false;
  globalDeployments = globalDeployments.filter(d => d.id !== Number(id));
  return true;
}

export function getDashboardMetrics() {
  const healthyCount = globalServers.filter(s => s.health === 'healthy' || s.health_status === 'healthy').length;
  const runningCount = globalDeployments.filter(d => d.status === 'running').length;
  const successCount = globalDeployments.filter(d => d.status === 'success').length;

  return {
    total_servers: globalServers.length,
    healthy_servers: healthyCount,
    active_deployments: runningCount,
    successful_deployments: successCount,
    chef_managed_nodes: globalServers.filter(s => ['chef', 'both'].includes(s.managed_by)).length,
    salt_managed_minions: globalServers.filter(s => ['salt', 'both'].includes(s.managed_by)).length,
    recent_deployments: globalDeployments.slice(0, 5)
  };
}
