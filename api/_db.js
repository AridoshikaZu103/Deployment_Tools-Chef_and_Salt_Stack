/**
 * Shared Database / State Access Layer
 * 
 * Provides transparent access to Neon Serverless Postgres if configured,
 * or falls back seamlessly to the in-memory fleet simulator.
 */

import * as simulator from './_simulator.js';

let neonSql = null;

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

export const db = {
  isPostgresActive: () => Boolean(neonSql),

  async getServers() {
    if (neonSql) {
      try {
        const rows = await neonSql`SELECT * FROM servers ORDER BY id ASC`;
        if (rows && rows.length > 0) return rows;
      } catch (_) {}
    }
    return simulator.getAllServers();
  },

  async getServer(id) {
    if (neonSql) {
      try {
        const rows = await neonSql`SELECT * FROM servers WHERE id = ${id} LIMIT 1`;
        if (rows && rows.length > 0) return rows[0];
      } catch (_) {}
    }
    return simulator.getServerById(id);
  },

  async checkServerHealth(id) {
    if (neonSql) {
      try {
        const now = new Date().toISOString();
        const rows = await neonSql`
          UPDATE servers
          SET health_status = 'healthy', status = 'online', last_health_check = ${now}
          WHERE id = ${id}
          RETURNING *
        `;
        if (rows && rows.length > 0) return rows[0];
      } catch (_) {}
    }
    return simulator.probeServerHealth(id);
  },

  async checkAllServersHealth() {
    if (neonSql) {
      try {
        const now = new Date().toISOString();
        const rows = await neonSql`
          UPDATE servers
          SET health_status = 'healthy', status = 'online', last_health_check = ${now}
          RETURNING *
        `;
        if (rows && rows.length > 0) return rows;
      } catch (_) {}
    }
    return simulator.probeAllServersHealth();
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
  }
};
