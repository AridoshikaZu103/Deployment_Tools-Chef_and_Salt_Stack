/**
 * Bundled Deployment History - Single Source of Truth
 */

export const BUNDLED_DEPLOYMENTS = [
  {
    id: 101,
    name: "Deploy Full Production Stack",
    description: "Orchestrate Nginx reverse proxy + FastAPI cluster + PostgreSQL + Prometheus",
    environment: "production",
    tool: "both",
    target_hosts: "web-01, app-01, app-02, db-01, mon-01",
    status: "success",
    progress: 100,
    created_by: 1,
    chef_runlist: "recipe[nginx::default], recipe[app_server::default]",
    salt_states: "common, postgresql, monitoring",
    started_at: "2026-10-06T06:15:00Z",
    completed_at: "2026-10-06T06:18:24Z",
    created_at: "2026-10-06T06:14:30Z",
    log_output: `[Chef Client] Starting run at 2026-10-06 06:15:02 UTC
[Chef] Resolving cookbooks: nginx (1.0.0), app_server (1.0.0)
[Chef] Recipe: nginx::default
  * package[nginx] action install (up to date)
  * template[/etc/nginx/sites-available/app_proxy.conf] action create (updated)
  * service[nginx] action reload (reloaded)
[Salt Stack] Applying highstate to minions: db-01, mon-01
----------
          ID: postgresql_packages
    Function: pkg.installed
      Result: True (packages already present)
----------
          ID: create_database
    Function: cmd.run
      Result: True (database 'deployment_tools' verified)
----------
          ID: prometheus_service
    Function: service.running
      Result: True (running on port 9090)
Summary for minions: 2
Succeeded: 14 (changed=2)
Failed: 0
✓ Full stack deployment completed in 204 seconds.`
  },
  {
    id: 102,
    name: "Rollout Nginx Security & TLS Patch",
    description: "Update Nginx configuration and reload workers without downtime",
    environment: "staging",
    tool: "chef",
    target_hosts: "staging-web-01",
    status: "running",
    progress: 68,
    created_by: 1,
    chef_runlist: "recipe[nginx::default]",
    salt_states: null,
    started_at: "2026-10-06T07:10:12Z",
    completed_at: null,
    created_at: "2026-10-06T07:09:40Z",
    log_output: `[Chef Client] Syncing cookbooks...
[Chef] Validating syntax for recipe[nginx::default]... OK
[Chef] Rendering template /etc/nginx/nginx.conf with worker_processes=auto
[Chef] Executing nginx -t syntax verification... Syntax OK
[Chef] Reloading service[nginx]... In progress`
  },
  {
    id: 103,
    name: "Provision Dev Database & Seeds",
    description: "Apply PostgreSQL states and initial schema migrations",
    environment: "development",
    tool: "salt",
    target_hosts: "dev-db-01",
    status: "pending",
    progress: 0,
    created_by: 1,
    chef_runlist: null,
    salt_states: "common, postgresql",
    started_at: null,
    completed_at: null,
    created_at: "2026-10-06T07:30:00Z",
    log_output: `[SaltStack] Minion connected: dev-db-01 (Ubuntu 22.04 LTS)
[SaltStack] Syncing state formulas: common, postgresql...
[SaltStack] Pillar compilation verified for env: development
Waiting in queue for target minion availability...`
  }
];

export function normalizeDeployment(d) {
  if (!d) return d;
  const rawStatus = (d.status || 'pending').toLowerCase();
  const normalizedStatus = rawStatus === 'succeeded' ? 'success' : rawStatus;
  const progressVal = typeof d.progress === 'number'
    ? d.progress
    : (normalizedStatus === 'success' ? 100 : (normalizedStatus === 'running' ? 45 : 0));

  return {
    ...d,
    id: Number(d.id),
    name: d.name || `Deployment #${d.id}`,
    description: d.description || '',
    environment: (d.environment || 'production').toLowerCase(),
    tool: (d.tool || d.engine || 'both').toLowerCase(),
    status: normalizedStatus,
    progress: progressVal,
    target_hosts: d.target_hosts || (Array.isArray(d.targets) ? d.targets.join(', ') : 'web-01'),
    log_output: d.log_output || '',
    started_at: d.started_at || null,
    completed_at: d.completed_at || null,
    created_at: d.created_at || new Date().toISOString(),
  };
}
