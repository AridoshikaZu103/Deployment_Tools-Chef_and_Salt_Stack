/**
 * Shared Database / State Access Layer
 * 
 * Provides transparent access to Neon Serverless Postgres if configured,
 * or falls back seamlessly to the in-memory fleet simulator.
 */

import * as simulator from './_simulator.js';

let neonSql = null;
let schemaInitialized = false;

// Attempt dynamic Neon DB initialization if environment provides connection string
try {
  const dbUrl = process.env.POSTGRES_URL || process.env.DATABASE_URL;
  if (dbUrl && !dbUrl.includes('placeholder')) {
    const { neon } = await import('@neondatabase/serverless');
    neonSql = neon(dbUrl);
  }
} catch (_) {
  neonSql = null;
}

async function ensureSchema() {
  if (!neonSql || schemaInitialized) return;
  try {
    await neonSql`
      CREATE TABLE IF NOT EXISTS health_checks (
        id bigserial PRIMARY KEY,
        workspace_id text DEFAULT 'default',
        server_id bigint NOT NULL,
        run_id bigint NULL,
        status text NOT NULL DEFAULT 'unknown',
        mode text NOT NULL DEFAULT 'simulation',
        latency_ms double precision DEFAULT 0,
        started_at timestamptz DEFAULT now(),
        finished_at timestamptz NULL,
        summary text DEFAULT ''
      );
    `;

    await neonSql`
      CREATE TABLE IF NOT EXISTS health_check_results (
        id bigserial PRIMARY KEY,
        health_check_id bigint NOT NULL,
        check_name text NOT NULL,
        ok boolean NOT NULL DEFAULT false,
        value text DEFAULT '',
        latency_ms double precision DEFAULT 0,
        detail text DEFAULT ''
      );
    `;

    await neonSql`
      CREATE TABLE IF NOT EXISTS fleet_health_runs (
        id bigserial PRIMARY KEY,
        workspace_id text DEFAULT 'default',
        scope text NOT NULL DEFAULT 'all',
        status text NOT NULL DEFAULT 'queued',
        total int NOT NULL DEFAULT 0,
        completed int NOT NULL DEFAULT 0,
        started_at timestamptz DEFAULT now(),
        finished_at timestamptz NULL
      );
    `;

    await neonSql`
      CREATE TABLE IF NOT EXISTS runner_heartbeats (
        id bigserial PRIMARY KEY,
        runner_id text UNIQUE NOT NULL,
        hostname text,
        ip_address text,
        last_seen timestamptz DEFAULT now()
      );
    `;

    await neonSql`
      CREATE TABLE IF NOT EXISTS audit_log (
        id bigserial PRIMARY KEY,
        workspace_id text DEFAULT 'default',
        actor text DEFAULT 'system',
        action text NOT NULL,
        target text NOT NULL,
        result text NOT NULL,
        details jsonb DEFAULT '{}'::jsonb,
        created_at timestamptz DEFAULT now()
      );
    `;

    try {
      await neonSql`ALTER TABLE servers ADD COLUMN IF NOT EXISTS health text DEFAULT 'unknown';`;
      await neonSql`ALTER TABLE servers ADD COLUMN IF NOT EXISTS last_checked timestamptz;`;
      await neonSql`ALTER TABLE servers ADD COLUMN IF NOT EXISTS checks jsonb;`;
    } catch (_) {}

    schemaInitialized = true;
  } catch (err) {
    console.warn('[DB Schema Init Error]:', err.message);
  }
}

export const db = {
  isPostgresActive: () => Boolean(neonSql),

  async isRunnerActive() {
    if (neonSql) {
      await ensureSchema();
      try {
        const rows = await neonSql`
          SELECT last_seen FROM runner_heartbeats
          WHERE last_seen > now() - interval '30 seconds'
          ORDER BY last_seen DESC LIMIT 1
        `;
        return rows.length > 0;
      } catch (_) {}
    }
    return simulator.isRunnerActive();
  },

  async registerRunnerHeartbeat(runnerData) {
    if (neonSql) {
      await ensureSchema();
      try {
        const runnerId = runnerData.runner_id || 'runner-main';
        const hostname = runnerData.hostname || 'runner-host';
        const ip = runnerData.ip_address || '127.0.0.1';
        await neonSql`
          INSERT INTO runner_heartbeats (runner_id, hostname, ip_address, last_seen)
          VALUES (${runnerId}, ${hostname}, ${ip}, now())
          ON CONFLICT (runner_id) DO UPDATE SET
            hostname = EXCLUDED.hostname,
            ip_address = EXCLUDED.ip_address,
            last_seen = now()
        `;
        return { runner_id: runnerId, last_seen: new Date().toISOString() };
      } catch (_) {}
    }
    return simulator.registerRunnerHeartbeat(runnerData);
  },

  async getServers() {
    if (neonSql) {
      await ensureSchema();
      try {
        const rows = await neonSql`SELECT * FROM servers ORDER BY id ASC`;
        if (rows && rows.length > 0) {
          // Attach history sparkline from health_checks
          const serversWithHistory = await Promise.all(
            rows.map(async (s) => {
              const historyRows = await neonSql`
                SELECT id, status, latency_ms, mode, finished_at
                FROM health_checks
                WHERE server_id = ${s.id}
                ORDER BY id DESC LIMIT 20
              `;
              return {
                ...s,
                health: s.health || s.health_status || 'unknown',
                last_checked: s.last_checked || s.last_health_check || null,
                checks: s.checks || simulator.APPLICABLE_CHECKS_BY_ROLE[s.role] || [],
                history: historyRows || []
              };
            })
          );
          return serversWithHistory;
        }
      } catch (_) {}
    }
    return simulator.getAllServers();
  },

  async getServer(id) {
    if (neonSql) {
      await ensureSchema();
      try {
        const rows = await neonSql`SELECT * FROM servers WHERE id = ${id} LIMIT 1`;
        if (rows && rows.length > 0) {
          const s = rows[0];
          const historyRows = await neonSql`
            SELECT id, status, latency_ms, mode, finished_at
            FROM health_checks
            WHERE server_id = ${s.id}
            ORDER BY id DESC LIMIT 20
          `;
          return {
            ...s,
            health: s.health || s.health_status || 'unknown',
            last_checked: s.last_checked || s.last_health_check || null,
            checks: s.checks || simulator.APPLICABLE_CHECKS_BY_ROLE[s.role] || [],
            history: historyRows || []
          };
        }
      } catch (_) {}
    }
    return simulator.getServerById(id);
  },

  async executeServerHealthProbe(serverId) {
    if (neonSql) {
      await ensureSchema();
      const runnerOnline = await this.isRunnerActive();
      if (!runnerOnline) {
        // Fallback to simulator probe and persist to Neon
        const server = await this.getServer(serverId);
        if (server) {
          const simProbe = simulator.runSimulatedProbe(server);
          const now = new Date().toISOString();
          const checkRows = await neonSql`
            INSERT INTO health_checks (workspace_id, server_id, status, mode, latency_ms, started_at, finished_at, summary)
            VALUES ('default', ${serverId}, ${simProbe.status}, 'simulation', ${simProbe.totalLatency}, now(), now(), ${simProbe.summary})
            RETURNING *
          `;
          const checkId = checkRows[0].id;

          for (const res of simProbe.results) {
            await neonSql`
              INSERT INTO health_check_results (health_check_id, check_name, ok, value, latency_ms, detail)
              VALUES (${checkId}, ${res.check_name}, ${res.ok}, ${res.value}, ${res.latency_ms}, ${res.detail})
            `;
          }

          await neonSql`
            UPDATE servers
            SET health = ${simProbe.status}, health_status = ${simProbe.status}, last_checked = now(), last_health_check = now()
            WHERE id = ${serverId}
          `;

          await neonSql`
            INSERT INTO audit_log (workspace_id, actor, action, target, result, details, created_at)
            VALUES ('default', 'system', 'health_probe', ${server.hostname}, ${simProbe.status}, ${JSON.stringify({ mode: 'simulation' })}, now())
          `;

          return {
            ...checkRows[0],
            results: simProbe.results
          };
        }
      } else {
        // Queue check for real runner
        const queueRows = await neonSql`
          INSERT INTO health_checks (workspace_id, server_id, status, mode, started_at)
          VALUES ('default', ${serverId}, 'queued', 'real', now())
          RETURNING *
        `;
        return queueRows[0];
      }
    }
    return simulator.executeServerHealthProbe(serverId);
  },

  async getHealthCheck(id) {
    if (neonSql) {
      await ensureSchema();
      try {
        const rows = await neonSql`SELECT * FROM health_checks WHERE id = ${id} LIMIT 1`;
        if (rows && rows.length > 0) {
          const check = rows[0];
          const results = await neonSql`
            SELECT * FROM health_check_results WHERE health_check_id = ${id} ORDER BY id ASC
          `;
          return {
            ...check,
            results: results || []
          };
        }
      } catch (_) {}
    }
    return simulator.getHealthCheckById(id);
  },

  async executeFleetHealthCheck(scope = 'all') {
    if (neonSql) {
      await ensureSchema();
      // Delegate to simulator logic which updates rows in parallel
      return simulator.executeFleetHealthCheck(scope);
    }
    return simulator.executeFleetHealthCheck(scope);
  },

  async getFleetHealthRun(id) {
    if (neonSql) {
      await ensureSchema();
      try {
        const rows = await neonSql`SELECT * FROM fleet_health_runs WHERE id = ${id} LIMIT 1`;
        if (rows && rows.length > 0) {
          const run = rows[0];
          const probes = await neonSql`SELECT * FROM health_checks WHERE run_id = ${id} ORDER BY id ASC`;
          return {
            ...run,
            results: probes || []
          };
        }
      } catch (_) {}
    }
    return simulator.getFleetHealthRunById(id);
  },

  async getDeployments() {
    if (neonSql) {
      try {
        const rows = await neonSql`SELECT * FROM deployments ORDER BY id DESC`;
        if (rows && rows.length > 0) return rows;
      } catch (_) {}
    }
    return simulator.getAllDeployments();
  },

  async getDeployment(id) {
    if (neonSql) {
      try {
        const rows = await neonSql`SELECT * FROM deployments WHERE id = ${id} LIMIT 1`;
        if (rows && rows.length > 0) return rows[0];
      } catch (_) {}
    }
    return simulator.getDeploymentById(id);
  },

  async createDeployment(payload) {
    if (neonSql) {
      try {
        const now = new Date().toISOString();
        const rows = await neonSql`
          INSERT INTO deployments (name, description, environment, tool, target_hosts, status, progress, chef_runlist, salt_states, created_at)
          VALUES (
            ${payload.name || 'New Deployment'},
            ${payload.description || ''},
            ${payload.environment || 'development'},
            ${payload.tool || 'both'},
            ${payload.target_hosts || '*'},
            'pending',
            0,
            ${payload.chef_runlist || null},
            ${payload.salt_states || null},
            ${now}
          )
          RETURNING *
        `;
        if (rows && rows.length > 0) return rows[0];
      } catch (_) {}
    }
    return simulator.createNewDeployment(payload);
  },

  async executeDeployment(id) {
    if (neonSql) {
      try {
        const now = new Date().toISOString();
        const rows = await neonSql`
          UPDATE deployments
          SET status = 'running', progress = 20, started_at = ${now}
          WHERE id = ${id}
          RETURNING *
        `;
        if (rows && rows.length > 0) return rows[0];
      } catch (_) {}
    }
    return simulator.executeDeploymentById(id);
  },

  async completeDeployment(id) {
    const sim = simulator.completeDeploymentById(id);
    if (neonSql && sim) {
      try {
        const now = new Date().toISOString();
        const rows = await neonSql`
          UPDATE deployments
          SET status = 'success', progress = 100, completed_at = ${now}, log_output = ${sim.log_output}
          WHERE id = ${id}
          RETURNING *
        `;
        if (rows && rows.length > 0) return rows[0];
      } catch (_) {}
    }
    return sim;
  },

  async cancelDeployment(id) {
    if (neonSql) {
      try {
        const now = new Date().toISOString();
        const rows = await neonSql`
          UPDATE deployments
          SET status = 'cancelled', completed_at = ${now}
          WHERE id = ${id}
          RETURNING *
        `;
        if (rows && rows.length > 0) return rows[0];
      } catch (_) {}
    }
    return simulator.cancelDeploymentById(id);
  },

  async deleteDeployment(id) {
    if (neonSql) {
      try {
        await neonSql`DELETE FROM deployments WHERE id = ${id}`;
      } catch (_) {}
    }
    return simulator.deleteDeploymentById(id);
  },

  async getDashboardSummary() {
    return simulator.getDashboardMetrics();
  },

  async getAuditLogs(limit = 50) {
    if (neonSql) {
      await ensureSchema();
      try {
        const rows = await neonSql`SELECT * FROM audit_log ORDER BY id DESC LIMIT ${limit}`;
        if (rows && rows.length > 0) return rows;
      } catch (_) {}
    }
    return simulator.getAuditLogs(limit);
  }
};
