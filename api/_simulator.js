/**
 * Serverless Orchestration Engine & Real-Time Simulator
 * 
 * Provides production-accurate simulation for:
 * - Chef Infra Client: Cookbooks, Recipes, Resources, Attributes, InSpec compliance
 * - SaltStack: State Formulas (SLS), Pillars, Grains, ZeroMQ Event Bus, Highstate
 * - Hybrid Multi-Engine Orchestrator: Dual-engine synchronization & zero-drift verification
 */

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
    health_status: "healthy",
    last_health_check: new Date().toISOString()
  },
  {
    id: 2,
    hostname: "prod-app-01",
    ip_address: "192.168.10.12",
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
    health_status: "healthy",
    last_health_check: new Date().toISOString()
  },
  {
    id: 3,
    hostname: "prod-db-01",
    ip_address: "192.168.10.21",
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
    health_status: "healthy",
    last_health_check: new Date().toISOString()
  },
  {
    id: 4,
    hostname: "prod-mon-01",
    ip_address: "192.168.10.31",
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
    health_status: "healthy",
    last_health_check: new Date().toISOString()
  },
  {
    id: 5,
    hostname: "stg-app-01",
    ip_address: "192.168.20.12",
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
    health_status: "healthy",
    last_health_check: new Date().toISOString()
  },
  {
    id: 6,
    hostname: "dev-all-in-one",
    ip_address: "192.168.30.5",
    role: "all-in-one",
    environment: "development",
    status: "online",
    managed_by: "both",
    chef_node_name: "dev-all-in-one.infra.local",
    salt_minion_id: "dev-all-in-one",
    os_family: "Debian",
    os_distribution: "Debian",
    os_version: "12 / Docker Container",
    cpu_cores: 2,
    memory_mb: 4096,
    disk_total_gb: 40,
    health_status: "healthy",
    last_health_check: new Date().toISOString()
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
----------
          ID: postgresql_packages
    Function: pkg.installed
      Result: True (PostgreSQL 15 packages verified)
----------
          ID: postgresql_configuration
    Function: file.managed [/etc/postgresql/15/main/postgresql.conf]
      Result: True (listen_addresses = '*', max_connections = 200)
----------
          ID: create_database
    Function: cmd.run
      Result: True (database 'deployment_tools' verified)
----------
          ID: prometheus_service
    Function: service.running
      Result: True (scrape targets: prod-app-01:8000, prod-web-01:9100)
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
  * directory[/etc/nginx/ssl] action create (owner: root, mode: 0700)
  * template[/etc/nginx/nginx.conf] action create (diff rendered)
  * execute[nginx -t] action run (syntax is ok, test is successful)
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
[SaltStack] Pillar compilation verified for environment: development
Waiting in orchestration queue for minion execution trigger...`
  }
];

// Persistent runtime store
let globalServers = [...FLEET_SERVERS];
let globalDeployments = [...INITIAL_DEPLOYMENTS];

/**
 * Generate real phased logs for Chef, SaltStack, and Hybrid engines
 */
export function generateDeploymentLog(tool, environment, targetHosts, runList, states) {
  const t = (tool || 'both').toLowerCase();
  const env = environment || 'production';
  const hosts = targetHosts || 'cluster-nodes';
  const time = new Date().toISOString().replace('T', ' ').substring(0, 19) + ' UTC';

  if (t === 'chef') {
    return `[Chef Client] Starting run at ${time}
[Chef] Node: ${hosts} (Environment: ${env})
[Chef] Resolving cookbook run-list: ${runList || 'recipe[nginx::default], recipe[app_server::default]'}
[Chef] Synchronizing cookbooks: nginx (1.0.0), app_server (1.0.0), postgresql (1.0.0), monitoring (1.0.0)
[Chef] Compiling attributes from attributes/default.rb
[Chef] Compiling resource collection...
[Chef] Executing resources:
  * package[nginx] action install (up to date)
  * directory[/var/www/deployment_tools] action create (mode 0755, owner deploy)
  * template[/etc/nginx/sites-available/app_proxy.conf] action create
      --- /etc/nginx/sites-available/app_proxy.conf
      +++ /tmp/chef-rendered-template
      @@ -12,4 +12,6 @@
      +    proxy_pass http://127.0.0.1:8000;
      +    proxy_set_header X-Real-IP $remote_addr;
  * link[/etc/nginx/sites-enabled/app_proxy.conf] action create (up to date)
  * execute[nginx -t] action run (syntax verified)
  * service[nginx] action reload (graceful reload OK)
  * directory[/opt/deployment-tools] action create (up to date)
  * template[/etc/systemd/system/deployment-tools.service] action create
  * execute[systemctl daemon-reload] action run
  * service[deployment-tools] action start (PID 3140 active)
[Chef] InSpec Compliance Audit:
  ✔ System Ports: Port 80 (HTTP), 443 (HTTPS), 8000 (FastAPI) listening
  ✔ File Permissions: /etc/nginx/nginx.conf mode <= 0644
  14 controls executed, 0 failures, 0 skipped.
[Chef] Chef Client run complete. 6/14 resources updated. Total execution time: 4.82s.
✓ Chef convergence completed successfully. Status: Idempotent.`;
  }

  if (t === 'salt') {
    return `[SaltStack Master] Starting state execution at ${time}
[SaltStack] Target minions: ${hosts} (Grains match: env:${env})
[SaltStack] Syncing state formulas: ${states || 'top, common, app_server, nginx, postgresql, monitoring'}
[SaltStack] Compiling pillar trees: pillar/base.sls, pillar/${env}.sls
[SaltStack] Publishing highstate to ZeroMQ ports 4505/4506...
----------
          ID: common_base_packages
    Function: pkg.installed
      Result: True (curl, htop, git, build-essential present)
----------
          ID: app_deploy_user
    Function: user.present
      Result: True (user 'deploy' uid=1001 present)
----------
          ID: nginx_service_config
    Function: file.managed [/etc/nginx/nginx.conf]
      Result: True (workers=auto, sendfile=on)
----------
          ID: nginx_service_running
    Function: service.running
      Result: True (daemon active)
----------
          ID: postgresql_cluster
    Function: pkg.installed
      Result: True (PostgreSQL 15 cluster ready)
----------
          ID: node_exporter_service
    Function: service.running
      Result: True (metrics exposed on port 9100)
Summary for target minions:
Succeeded: 18 (changed=3)
Failed: 0
[Salt-Returner] All minion returns recorded to job cache. Zero drift confirmed.
✓ SaltStack execution completed successfully.`;
  }

  // Hybrid (Both)
  return `[Orchestrator] Initiating Dual-Engine Orchestration Run at ${time}
[Orchestrator] Target Fleet: ${hosts} (Environment: ${env})
[Engine 1: Chef] Synchronizing Cookbooks & Run-list: ${runList || 'recipe[nginx::default], recipe[app_server::default]'}
  * package[nginx] action install (up to date)
  * template[/etc/nginx/sites-available/app_proxy.conf] action create (diff rendered)
  * service[nginx] action reload (reloaded)
  * template[/etc/systemd/system/deployment-tools.service] action create
  * service[deployment-tools] action start (PID 3290 active)
  Chef Convergence: 8 resources converged, 0 failures.
[Engine 2: SaltStack] ZeroMQ Broadcast to Minions (${states || 'common, postgresql, monitoring'}):
  * State [common_base_packages]: pkg.installed (True)
  * State [postgresql_cluster]: service.running (True)
  * State [node_exporter_service]: service.running (True)
  Salt Returns: Succeeded: 12, Changed: 2, Failed: 0.
[Audit] Cross-engine compliance & latency verification... Passed.
✓ Hybrid multi-engine deployment fully converged across all target nodes.`;
}

export function getAllServers() {
  return globalServers;
}

export function getServerById(id) {
  return globalServers.find(s => s.id === Number(id));
}

export function probeServerHealth(id) {
  const server = globalServers.find(s => s.id === Number(id));
  if (server) {
    server.health_status = 'healthy';
    server.status = 'online';
    server.last_health_check = new Date().toISOString();
    return server;
  }
  return null;
}

export function probeAllServersHealth() {
  const now = new Date().toISOString();
  globalServers = globalServers.map(s => ({
    ...s,
    health_status: 'healthy',
    status: 'online',
    last_health_check: now
  }));
  return globalServers;
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
  dep.log_output = generateDeploymentLog(dep.tool, dep.environment, dep.target_hosts, dep.chef_runlist, dep.salt_states);

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
  const healthyCount = globalServers.filter(s => s.health_status === 'healthy').length;
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
