import {
  STATIC_CHEF_COOKBOOKS,
  STATIC_SALT_STATES,
  getStaticCookbookContent,
  getStaticSaltStateContent
} from '../data/cookbooksData';

/**
 * API Service for interacting with FastAPI Backend.
 * Includes graceful mock fallbacks and bundled static data so the UI remains 100%
 * interactive even without a backend or when deployed statically on Vercel.
 */

const RAW_API_BASE = import.meta.env.VITE_API_URL || '/api/v1';
const API_BASE = RAW_API_BASE.replace(/\/+$/, '');

let isFallbackActive = false;

// Initial Mock Data
let mockDeployments = [
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

let mockServers = [
  {
    id: 1,
    hostname: "prod-web-01",
    ip_address: "192.168.10.11",
    fqdn: "web01.production.internal",
    environment: "production",
    role: "webserver",
    os_family: "Ubuntu 22.04 LTS",
    managed_by: "chef",
    is_active: true,
    health_status: "healthy",
    last_health_check: "2 minutes ago",
    chef_node_name: "prod-web-01.node",
    salt_minion_id: null
  },
  {
    id: 2,
    hostname: "prod-app-01",
    ip_address: "192.168.10.21",
    fqdn: "app01.production.internal",
    environment: "production",
    role: "appserver",
    os_family: "Ubuntu 22.04 LTS",
    managed_by: "both",
    is_active: true,
    health_status: "healthy",
    last_health_check: "1 minute ago",
    chef_node_name: "prod-app-01.node",
    salt_minion_id: "minion-prod-app-01"
  },
  {
    id: 3,
    hostname: "prod-db-01",
    ip_address: "192.168.10.31",
    fqdn: "db01.production.internal",
    environment: "production",
    role: "database",
    os_family: "Debian 12",
    managed_by: "salt",
    is_active: true,
    health_status: "healthy",
    last_health_check: "3 minutes ago",
    chef_node_name: null,
    salt_minion_id: "minion-prod-db-01"
  },
  {
    id: 4,
    hostname: "prod-mon-01",
    ip_address: "192.168.10.41",
    fqdn: "mon01.production.internal",
    environment: "production",
    role: "monitoring",
    os_family: "Ubuntu 22.04 LTS",
    managed_by: "salt",
    is_active: true,
    health_status: "healthy",
    last_health_check: "Just now",
    chef_node_name: null,
    salt_minion_id: "minion-prod-mon-01"
  },
  {
    id: 5,
    hostname: "stg-app-01",
    ip_address: "192.168.20.21",
    fqdn: "app01.staging.internal",
    environment: "staging",
    role: "appserver",
    os_family: "Ubuntu 22.04 LTS",
    managed_by: "both",
    is_active: true,
    health_status: "degraded",
    last_health_check: "5 minutes ago",
    chef_node_name: "stg-app-01.node",
    salt_minion_id: "minion-stg-app-01"
  },
  {
    id: 6,
    hostname: "dev-all-in-one",
    ip_address: "127.0.0.1",
    fqdn: "dev-box.local",
    environment: "development",
    role: "appserver",
    os_family: "Debian 12 / Docker",
    managed_by: "both",
    is_active: true,
    health_status: "healthy",
    last_health_check: "Just now",
    chef_node_name: "local-dev.node",
    salt_minion_id: "local-dev-minion"
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

export const api = {
  // ── Deployments ──────────────────────────────────────────
  async getDeployments() {
    try {
      const res = await fetch(`${API_BASE}/deployments/`);
      if (res.ok) {
        const data = await res.json();
        const list = Array.isArray(data) ? data : (data.deployments || []);
        return list.map(normalizeDeployment);
      }
    } catch (_) {}
    return mockDeployments.map(normalizeDeployment);
  },

  async createDeployment(payload) {
    try {
      const res = await fetch(`${API_BASE}/deployments/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (res.ok) {
        const created = await res.json();
        return normalizeDeployment(created);
      }
    } catch (_) {}
    
    // Mock create
    const newDep = normalizeDeployment({
      id: Math.floor(1000 + Math.random() * 9000),
      ...payload,
      status: "pending",
      progress: 0,
      created_by: 1,
      log_output: "Deployment queued.",
      started_at: null,
      completed_at: null,
      created_at: new Date().toISOString()
    });
    mockDeployments = [newDep, ...mockDeployments];
    return newDep;
  },

  async executeDeployment(id) {
    try {
      let res = await fetch(`${API_BASE}/deployments/${id}/confirm`, { method: 'POST' });
      if (!res.ok) {
        res = await fetch(`${API_BASE}/deployments/${id}/execute`, { method: 'POST' });
      }
      if (res.ok) {
        const data = await res.json();
        return normalizeDeployment(data);
      }
    } catch (_) {}

    const dep = mockDeployments.find(d => d.id === id);
    if (dep) {
      const toolLabel = dep.tool === 'salt' ? 'SaltStack Engine' : (dep.tool === 'chef' ? 'Chef Engine' : 'Hybrid Orchestration Engine');
      dep.status = "running";
      dep.progress = 45;
      dep.started_at = new Date().toISOString();
      dep.log_output += `\n[${new Date().toLocaleTimeString()}] Deployment executed via ${toolLabel}...`;
      
      // Simulate completion after 3s
      setTimeout(() => {
        dep.status = "success";
        dep.progress = 100;
        dep.completed_at = new Date().toISOString();
        if (dep.tool === 'salt') {
          dep.log_output += `\n[${new Date().toLocaleTimeString()}] ✓ All Salt states converged successfully across target minions.`;
        } else if (dep.tool === 'chef') {
          dep.log_output += `\n[${new Date().toLocaleTimeString()}] ✓ All Chef cookbooks converged successfully across target nodes.`;
        } else {
          dep.log_output += `\n[${new Date().toLocaleTimeString()}] ✓ All Chef cookbooks and Salt states converged successfully.`;
        }
      }, 3000);
      return normalizeDeployment(dep);
    }
    return normalizeDeployment({ id, status: "running", progress: 45 });
  },

  async cancelDeployment(id) {
    try {
      const res = await fetch(`${API_BASE}/deployments/${id}/cancel`, { method: 'POST' });
      if (res.ok) {
        const data = await res.json();
        return normalizeDeployment(data);
      }
    } catch (_) {}

    const dep = mockDeployments.find(d => d.id === id);
    if (dep) {
      dep.status = "cancelled";
      dep.log_output += `\n[${new Date().toLocaleTimeString()}] Deployment cancelled by operator.`;
      return normalizeDeployment(dep);
    }
    return normalizeDeployment({ id, status: "cancelled" });
  },

  async completeDeployment(id) {
    try {
      const res = await fetch(`${API_BASE}/deployments/${id}/complete`, { method: 'POST' });
      if (res.ok) {
        const data = await res.json();
        return normalizeDeployment(data);
      }
    } catch (_) {}

    const dep = mockDeployments.find(d => d.id === id);
    if (dep) {
      dep.status = "success";
      dep.progress = 100;
      dep.completed_at = new Date().toISOString();
      if (dep.tool === 'salt') {
        dep.log_output += `\n[${new Date().toLocaleTimeString()}] ✓ Salt state convergence completed by operator.`;
      } else if (dep.tool === 'chef') {
        dep.log_output += `\n[${new Date().toLocaleTimeString()}] ✓ Chef recipe convergence completed by operator.`;
      } else {
        dep.log_output += `\n[${new Date().toLocaleTimeString()}] ✓ Convergence completed by operator.`;
      }
      return normalizeDeployment(dep);
    }
    return normalizeDeployment({ id, status: "success", progress: 100 });
  },

  async deleteDeployment(id) {
    try {
      const res = await fetch(`${API_BASE}/deployments/${id}`, { method: 'DELETE' });
      if (res.ok) {
        mockDeployments = mockDeployments.filter(d => d.id !== id);
        return { success: true };
      }
    } catch (_) {}

    mockDeployments = mockDeployments.filter(d => d.id !== id);
    return { success: true };
  },

  // ── Servers ──────────────────────────────────────────────
  async getServers() {
    try {
      const res = await fetch(`${API_BASE}/servers/`);
      if (res.ok) return await res.json();
    } catch (_) {}
    return mockServers;
  },

  async checkServerHealth(id) {
    try {
      const res = await fetch(`${API_BASE}/servers/${id}/health-check`, { method: 'POST' });
      if (res.ok) return await res.json();
    } catch (_) {}

    const server = mockServers.find(s => s.id === id);
    if (server) {
      server.health_status = "healthy";
      server.last_health_check = "Just now";
    }
    return {
      hostname: server?.hostname || "unknown",
      health_status: "healthy",
      checked_at: new Date().toISOString(),
      checks: [
        { name: "SSH Connectivity (22)", status: "pass" },
        { name: "Service Daemon Status", status: "pass" },
        { name: "HTTP / TCP Endpoint Check", status: "pass" }
      ]
    };
  },

  async checkAllServersHealth() {
    try {
      const res = await fetch(`${API_BASE}/servers/health-check-all`, { method: 'POST' });
      if (res.ok) return await res.json();
    } catch (_) {}

    mockServers.forEach(s => {
      s.health_status = "healthy";
      s.last_health_check = "Just now";
    });
    return mockServers;
  },

  // ── Configs & Tool Status ────────────────────────────────
  isUsingFallback() {
    return isFallbackActive;
  },

  async getToolStatus() {
    try {
      const res = await fetch(`${API_BASE}/configs/status`);
      if (res.ok) {
        const data = await res.json();
        if (data && (data.chef_cookbooks_count > 0 || data.salt_states_count > 0)) {
          return data;
        }
      }
    } catch (_) {}
    return {
      chef_available: true,
      salt_available: true,
      chef_cookbooks_count: STATIC_CHEF_COOKBOOKS.length,
      salt_states_count: STATIC_SALT_STATES.length,
      is_fallback: true
    };
  },

  async getChefCookbooks() {
    try {
      const res = await fetch(`${API_BASE}/configs/chef/cookbooks`);
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data) && data.length > 0) {
          return data.map((cb) => {
            const staticMatch = STATIC_CHEF_COOKBOOKS.find((s) => s.name === cb.name);
            return {
              ...cb,
              verified: true,
              content: cb.content || staticMatch?.content || ''
            };
          });
        }
      }
    } catch (_) {}
    isFallbackActive = true;
    return STATIC_CHEF_COOKBOOKS;
  },

  async getSaltStates() {
    try {
      const res = await fetch(`${API_BASE}/configs/salt/states`);
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data) && data.length > 0) {
          return data.map((st) => {
            const staticMatch = STATIC_SALT_STATES.find((s) => s.id === st.id);
            return {
              ...st,
              verified: true,
              content: st.content || staticMatch?.content || ''
            };
          });
        }
      }
    } catch (_) {}
    isFallbackActive = true;
    return STATIC_SALT_STATES;
  },

  async getCookbookContent(cookbookName, recipe = 'default') {
    const fallback = getStaticCookbookContent(cookbookName, recipe);
    try {
      const res = await fetch(`${API_BASE}/configs/chef/cookbooks/${cookbookName}/content?recipe=${recipe}`);
      if (res.ok) {
        const data = await res.json();
        if (data && data.content && (!fallback?.content || data.content.length >= fallback.content.length * 0.5)) {
          return data;
        }
      }
    } catch (_) {}
    return fallback;
  },

  async getSaltStateContent(stateId) {
    const fallback = getStaticSaltStateContent(stateId);
    try {
      const res = await fetch(`${API_BASE}/configs/salt/states/${stateId}/content`);
      if (res.ok) {
        const data = await res.json();
        if (data && data.content && (!fallback?.content || data.content.length >= fallback.content.length * 0.5)) {
          return data;
        }
      }
    } catch (_) {}
    return fallback;
  },

  // ── AI DevOps Copilot ────────────────────────────────────
  async askAiAgent(prompt, context = {}) {
    try {
      const res = await fetch(`${API_BASE}/ai/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt,
          agent_name: 'Nova-Orchestrator',
          context
        })
      });
      if (res.ok) {
        return await res.json();
      }
    } catch (_) {}
    return null;
  }
};
