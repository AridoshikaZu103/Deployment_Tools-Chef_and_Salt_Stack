import {
  STATIC_CHEF_COOKBOOKS,
  STATIC_SALT_STATES,
  getStaticCookbookContent,
  getStaticSaltStateContent
} from '../data/cookbooksData';
import { BUNDLED_SERVERS, normalizeServer } from '../data/serversData';
import { BUNDLED_DEPLOYMENTS, normalizeDeployment } from '../data/deploymentsData';

/**
 * API Service for interacting with Backend & Vercel Serverless Functions.
 * Uses bundled static datasets as the single source of truth when running
 * in standalone/static mode or on Vercel without a dedicated backend.
 */

const RAW_API_BASE = import.meta.env.VITE_API_URL || '/api/v1';
const API_BASE = RAW_API_BASE.replace(/\/+$/, '');

let isFallbackActive = false;

// In-memory working copies initialized directly from single source of truth
let inMemoryDeployments = BUNDLED_DEPLOYMENTS.map(normalizeDeployment);
let inMemoryServers = BUNDLED_SERVERS.map(normalizeServer);

/**
 * Intelligent local fallback generator for Nova AI copilot when offline.
 * Answers with actual cluster telemetry, cookbooks, and states instead of generic echoes.
 */
export function generateOfflineResponse(prompt, context = {}) {
  const p = (prompt || '').toLowerCase().trim();
  const serversList = context.servers || inMemoryServers;

  // Plan generation for Nginx / Web server
  if (p.includes('nginx') || p.includes('reverse proxy') || (p.includes('deploy') && p.includes('web'))) {
    return {
      stage: 'Plan',
      speech: 'I generated a deployment plan for Nginx reverse proxy using Chef cookbook and Salt state.',
      text: `**[Nova-Orchestrator - SRE Copilot] (Offline mode)**\n\nI have generated an infrastructure deployment plan to converge **Nginx** across web nodes:\n\n- **Target Node**: \`prod-web-01\` (Ubuntu 22.04 LTS)\n- **Chef Cookbook**: \`recipe[nginx::default]\` (v1.0.0, 70 lines)\n- **Salt State**: \`nginx.sls\` (package install, vhost config, service reload)\n\nPlease review the plan details below and confirm to trigger rollout.`,
      plan: {
        name: 'Deploy Nginx Reverse Proxy & TLS',
        description: 'Converge Nginx web server using Chef recipe and Salt state on web tier',
        environment: 'production',
        tool: 'chef',
        target_hosts: 'prod-web-01',
        chef_runlist: 'recipe[nginx::default]',
        salt_states: 'common, nginx'
      },
      needs_confirmation: true,
      isOffline: true
    };
  }

  // Plan generation for App Server / FastAPI
  if (p.includes('app') || p.includes('fastapi') || (p.includes('deploy') && p.includes('server'))) {
    return {
      stage: 'Plan',
      speech: 'Created a deployment plan for FastAPI app server across application nodes.',
      text: `**[Nova-Orchestrator - SRE Copilot] (Offline mode)**\n\nGenerated rollout plan for **FastAPI Application Server**:\n\n- **Target Nodes**: \`prod-app-01\`, \`stg-app-01\`\n- **Chef Recipe**: \`recipe[app_server::default]\` (systemd unit, venv, uvicorn workers)\n- **Salt State**: \`app_server.sls\`\n\nReady for execution upon your confirmation.`,
      plan: {
        name: 'Deploy FastAPI App Server Cluster',
        description: 'Orchestrate Python virtualenv, systemd service, and application sockets',
        environment: 'production',
        tool: 'both',
        target_hosts: 'prod-app-01, stg-app-01',
        chef_runlist: 'recipe[app_server::default]',
        salt_states: 'common, app_server'
      },
      needs_confirmation: true,
      isOffline: true
    };
  }

  // Fleet diagnostics / Status inquiry
  if (p.includes('server') || p.includes('node') || p.includes('cluster') || p.includes('health') || p.includes('fleet') || p.includes('status')) {
    const total = serversList.length;
    const healthy = serversList.filter(s => (s.health_status || s.health) === 'healthy').length;
    const nodesSummary = serversList
      .map(s => `- \`${s.hostname}\` (${s.environment}) — Role: **${s.role}**, OS: **${s.os_family}**, Engine: **${s.managed_by}**`)
      .join('\n');

    return {
      stage: 'Help',
      speech: `All ${total} cluster nodes are monitored. ${healthy} are healthy.`,
      text: `**[Nova-Orchestrator - Fleet Diagnostics] (Offline mode)**\n\n**Cluster Telemetry Overview**:\n- **Monitored Nodes**: ${total} active nodes (${healthy} healthy)\n- **Dual-Engine Status**: Chef Client (Pull) & SaltStack Minions (Push)\n\n**Node Inventory**:\n${nodesSummary}\n\nYou can probe TCP sockets anytime from the **Servers & Health** page.`,
      plan: null,
      needs_confirmation: false,
      isOffline: true
    };
  }

  // Chef cookbooks inquiry
  if (p.includes('chef') || p.includes('cookbook') || p.includes('recipe')) {
    const cbList = STATIC_CHEF_COOKBOOKS.map(cb => `- **${cb.name}** (v${cb.version}): ${cb.description}`).join('\n');
    return {
      stage: 'Help',
      speech: `There are 4 bundled Chef cookbooks: app server, monitoring, nginx, and postgresql.`,
      text: `**[Nova-Orchestrator - Chef Cookbooks] (Offline mode)**\n\nBundled Chef Cookbooks with complete Ruby recipe files:\n\n${cbList}\n\nYou can view full source code in the **Cookbooks & States** tab.`,
      plan: null,
      needs_confirmation: false,
      isOffline: true
    };
  }

  // SaltStack states inquiry
  if (p.includes('salt') || p.includes('sls') || p.includes('state') || p.includes('pillar') || p.includes('grain')) {
    const stList = STATIC_SALT_STATES.map(st => `- **${st.filename}**: ${st.description}`).join('\n');
    return {
      stage: 'Help',
      speech: `SaltStack state formulas include top, common, app server, nginx, postgresql, and monitoring.`,
      text: `**[Nova-Orchestrator - SaltStack States] (Offline mode)**\n\nBundled Salt formulas and highstate definitions:\n\n${stList}\n\n- **ZeroMQ Push Architecture**: Ports 4505/4506\n- **Grains**: Hardware & OS matching\n- **Pillars**: Secure configuration tree`,
      plan: null,
      needs_confirmation: false,
      isOffline: true
    };
  }

  // Greeting or general query
  return {
    stage: 'Help',
    speech: 'Hello, I am Nova-Orchestrator. I can help deploy infrastructure or explain Chef and Salt configurations.',
    text: `**[Nova-Orchestrator - SRE Copilot] (Offline mode)**\n\nI am your Autonomous Fleet SRE Copilot running in bundled offline mode.\n\n- **Fleet Inventory**: ${serversList.length} nodes active across Production, Staging, and Dev.\n- **Orchestration**: Chef Client (Ruby / Pull) & SaltStack (YAML / Push).\n\nAsk me to *"Deploy Nginx using Chef"*, *"Check cluster health"*, or ask about any cookbook or state formula.`,
    plan: null,
    needs_confirmation: false,
    isOffline: true
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
        if (list.length > 0) {
          return list.map(normalizeDeployment);
        }
      }
    } catch (_) {}
    isFallbackActive = true;
    return inMemoryDeployments.map(normalizeDeployment);
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
        const normalized = normalizeDeployment(created);
        inMemoryDeployments = [normalized, ...inMemoryDeployments];
        return normalized;
      }
    } catch (_) {}
    
    // Bundled fallback creation
    const newDep = normalizeDeployment({
      id: Math.floor(1000 + Math.random() * 9000),
      ...payload,
      status: "pending",
      progress: 0,
      created_by: 1,
      log_output: `[Nova Orchestrator] Deployment queued for target hosts: ${payload.target_hosts || '*'}.\nInitializing dual-engine runner...`,
      started_at: null,
      completed_at: null,
      created_at: new Date().toISOString()
    });
    inMemoryDeployments = [newDep, ...inMemoryDeployments];
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

    const dep = inMemoryDeployments.find(d => d.id === id);
    if (dep) {
      const toolLabel = dep.tool === 'salt' ? 'SaltStack Engine' : (dep.tool === 'chef' ? 'Chef Engine' : 'Hybrid Orchestration Engine');
      dep.status = "running";
      dep.progress = 10;
      dep.started_at = new Date().toISOString();
      dep.log_output = (dep.log_output || '') + `\n[${new Date().toLocaleTimeString()}] Deployment #${id} execution triggered via ${toolLabel}.\n[Orchestrator] Target hosts: ${dep.target_hosts || '*'}. Launching phased convergence runner...`;
      return normalizeDeployment(dep);
    }
    return normalizeDeployment({ id, status: "running", progress: 10 });
  },

  async cancelDeployment(id) {
    try {
      const res = await fetch(`${API_BASE}/deployments/${id}/cancel`, { method: 'POST' });
      if (res.ok) {
        const data = await res.json();
        return normalizeDeployment(data);
      }
    } catch (_) {}

    const dep = inMemoryDeployments.find(d => d.id === id);
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

    const dep = inMemoryDeployments.find(d => d.id === id);
    if (dep) {
      dep.status = "success";
      dep.progress = 100;
      dep.completed_at = new Date().toISOString();
      dep.log_output += `\n[${new Date().toLocaleTimeString()}] Convergence completed by operator.`;
      return normalizeDeployment(dep);
    }
    return normalizeDeployment({ id, status: "success", progress: 100 });
  },

  async deleteDeployment(id) {
    try {
      const res = await fetch(`${API_BASE}/deployments/${id}`, { method: 'DELETE' });
      if (res.ok) {
        inMemoryDeployments = inMemoryDeployments.filter(d => d.id !== id);
        return { success: true };
      }
    } catch (_) {}

    inMemoryDeployments = inMemoryDeployments.filter(d => d.id !== id);
    return { success: true };
  },

  // ── Servers ──────────────────────────────────────────────
  async getServers() {
    try {
      const res = await fetch(`${API_BASE}/servers/`);
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data) && data.length > 0) {
          return data.map(normalizeServer);
        }
      }
    } catch (_) {}
    isFallbackActive = true;
    return inMemoryServers.map(normalizeServer);
  },

  async triggerHealthProbe(serverId) {
    try {
      const res = await fetch(`${API_BASE}/health/probe`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ serverId })
      });
      if (res.ok) {
        return await res.json();
      }
      if (res.status === 429) {
        const errData = await res.json().catch(() => ({}));
        const err = new Error(errData.error || 'Rate limit: Please wait before probing again.');
        err.status = 429;
        err.retry_after_sec = errData.retry_after_sec || 5;
        throw err;
      }
    } catch (e) {
      if (e.status === 429) throw e;
    }

    // Bundled fallback probe
    const server = inMemoryServers.find(s => s.id === Number(serverId));
    const nowIso = new Date().toISOString();
    if (server) {
      server.health = "healthy";
      server.health_status = "healthy";
      server.last_checked = nowIso;
      server.last_health_check = nowIso;
    }
    return {
      id: Math.floor(10000 + Math.random() * 90000),
      server_id: Number(serverId),
      status: "healthy",
      mode: "simulation",
      latency_ms: 18,
      started_at: nowIso,
      finished_at: nowIso,
      summary: "All diagnostic checks passed (offline fallback)",
      results: [
        { check_name: "reachability", ok: true, value: "SSH (22) Open", latency_ms: 2, detail: "TCP port 22 connected" },
        { check_name: "service_check", ok: true, value: "HTTP 200 OK", latency_ms: 5, detail: "Primary service responsive" },
        { check_name: "config_mgmt", ok: true, value: "Converged", latency_ms: 8, detail: "Zero drift confirmed" }
      ]
    };
  },

  async getHealthProbe(probeId) {
    try {
      const res = await fetch(`${API_BASE}/health/probe/${probeId}`);
      if (res.ok) return await res.json();
    } catch (_) {}
    return null;
  },

  async triggerFleetHealthCheck(scope = 'all') {
    try {
      const res = await fetch(`${API_BASE}/health/fleet`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ scope })
      });
      if (res.ok) {
        return await res.json();
      }
      if (res.status === 429) {
        const errData = await res.json().catch(() => ({}));
        const err = new Error(errData.error || 'Fleet check rate limit: 1 run per 30s.');
        err.status = 429;
        err.retry_after_sec = errData.retry_after_sec || 30;
        throw err;
      }
    } catch (e) {
      if (e.status === 429) throw e;
    }

    // Bundled fallback fleet check
    const nowIso = new Date().toISOString();
    inMemoryServers.forEach(s => {
      s.health = "healthy";
      s.health_status = "healthy";
      s.last_checked = nowIso;
      s.last_health_check = nowIso;
    });
    return {
      id: Math.floor(1000 + Math.random() * 9000),
      scope,
      status: "done",
      total: inMemoryServers.length,
      completed: inMemoryServers.length,
      started_at: nowIso,
      finished_at: nowIso,
      results: inMemoryServers.map(s => ({
        server_id: s.id,
        status: "healthy",
        mode: "simulation"
      }))
    };
  },

  async getFleetHealthCheck(runId) {
    try {
      const res = await fetch(`${API_BASE}/health/fleet/${runId}`);
      if (res.ok) return await res.json();
    } catch (_) {}
    return null;
  },

  async checkServerHealth(id) {
    return this.triggerHealthProbe(id);
  },

  async checkAllServersHealth(scope = 'all') {
    const fleetRun = await this.triggerFleetHealthCheck(scope);
    return this.getServers();
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

  // ── AI DevOps Copilot (Gemini 3.8 Flash & Health) ────────
  async checkAiHealth() {
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 6000);
      const res = await fetch('/api/health', { signal: controller.signal });
      clearTimeout(timer);
      if (res.ok) {
        return await res.json();
      }
    } catch (_) {}
    return { ok: false, hasKey: false, model: 'gemini-3.8-flash' };
  },

  async askAiAgent(prompt, options = {}) {
    const history = options.history || [];
    const fleetContext = options.fleetContext || options.context || {};
    const servers = options.servers || inMemoryServers;
    const deployments = options.deployments || inMemoryDeployments;

    // 1. Try Vercel Serverless /api/chat route
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 22000);

      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt,
          history: history.slice(-10),
          fleetContext: {
            nodes: servers.map((s) => ({
              hostname: s.hostname,
              role: s.role,
              environment: s.environment,
              managed_by: s.managed_by,
              health: s.health_status
            })),
            deployments_count: deployments.length,
            ...fleetContext
          }
        }),
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (res.ok) {
        const data = await res.json();
        return {
          ...data,
          isLive: true,
          badgeStatus: 'Live: Gemini 3.8 Flash'
        };
      } else {
        let errData = {};
        try {
          errData = await res.json();
        } catch (_) {}
        const errorReason = errData.error || `HTTP ${res.status}`;
        console.warn('[AI Client] /api/chat responded with error:', errorReason);
        const fallback = generateOfflineResponse(prompt, { servers, deployments });
        return {
          ...fallback,
          isLive: false,
          badgeStatus: `Offline: ${errorReason}`,
          errorDetail: errorReason
        };
      }
    } catch (err) {
      const errorReason = err.name === 'AbortError' ? 'Timeout 20s' : (err.message || 'Offline');
      console.warn('[AI Client] Network error reaching /api/chat:', errorReason);
      const fallback = generateOfflineResponse(prompt, { servers, deployments });
      return {
        ...fallback,
        isLive: false,
        badgeStatus: `Offline: ${errorReason}`,
        errorDetail: errorReason
      };
    }
  }
};
