/**
 * Standalone Diagnostic Health Runner Daemon
 * 
 * - Emits heartbeats every 10 seconds to database/API
 * - Polls queued health checks using FOR UPDATE SKIP LOCKED
 * - Executes diagnostic checks with concurrency 5
 * - Updates database rows and fleet run statuses
 */

import { executeNodeChecks } from './checks.js';

const DB_URL = process.env.POSTGRES_URL || process.env.DATABASE_URL;
const API_URL = process.env.API_BASE_URL || 'http://localhost:3000/api';
const RUNNER_ID = process.env.RUNNER_ID || `runner-${process.pid}`;

let isRunning = true;

async function sendHeartbeat(neonSql) {
  try {
    if (neonSql) {
      await neonSql`
        INSERT INTO runner_heartbeats (runner_id, hostname, ip_address, last_seen)
        VALUES (${RUNNER_ID}, 'local-runner', '127.0.0.1', now())
        ON CONFLICT (runner_id) DO UPDATE SET
          last_seen = now()
      `;
    } else {
      await fetch(`${API_URL}/health/heartbeat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ runner_id: RUNNER_ID, hostname: 'local-runner', ip_address: '127.0.0.1' })
      }).catch(() => {});
    }
  } catch (err) {
    console.warn('[Runner Heartbeat Warning]:', err.message);
  }
}

async function startRunner() {
  console.log(`[Diagnostic Runner] Starting daemon (ID: ${RUNNER_ID})...`);

  let neonSql = null;
  if (DB_URL && !DB_URL.includes('placeholder')) {
    try {
      const { neon } = await import('@neondatabase/serverless');
      neonSql = neon(DB_URL);
      console.log('[Diagnostic Runner] Connected directly to Neon Postgres.');
    } catch (e) {
      console.warn('[Diagnostic Runner] Neon import failed, running via API fallback.');
    }
  }

  // Heartbeat loop every 10 seconds
  setInterval(() => {
    if (isRunning) sendHeartbeat(neonSql);
  }, 10000);
  sendHeartbeat(neonSql);

  console.log('[Diagnostic Runner] Polling for queued health checks...');

  while (isRunning) {
    try {
      if (neonSql) {
        // Poll queued health checks with SKIP LOCKED
        const queuedChecks = await neonSql`
          SELECT hc.id, hc.server_id, hc.run_id, s.hostname, s.ip_address, s.role, s.managed_by
          FROM health_checks hc
          JOIN servers s ON hc.server_id = s.id
          WHERE hc.status = 'queued'
          ORDER BY hc.id ASC
          LIMIT 5
          FOR UPDATE SKIP LOCKED
        `;

        if (queuedChecks && queuedChecks.length > 0) {
          console.log(`[Diagnostic Runner] Processing ${queuedChecks.length} queued checks in parallel...`);

          await Promise.all(
            queuedChecks.map(async (check) => {
              const startMs = Date.now();
              const probe = await executeNodeChecks(check);
              const latency = Date.now() - startMs;
              const now = new Date().toISOString();

              // Insert results
              for (const r of probe.results) {
                await neonSql`
                  INSERT INTO health_check_results (health_check_id, check_name, ok, value, latency_ms, detail)
                  VALUES (${check.id}, ${r.check_name}, ${r.ok}, ${r.value}, ${r.latency_ms}, ${r.detail})
                `;
              }

              // Update health check
              await neonSql`
                UPDATE health_checks
                SET status = ${probe.status}, mode = 'real', latency_ms = ${latency}, finished_at = now(), summary = ${probe.summary}
                WHERE id = ${check.id}
              `;

              // Update server
              await neonSql`
                UPDATE servers
                SET health = ${probe.status}, health_status = ${probe.status}, last_checked = now(), last_health_check = now()
                WHERE id = ${check.server_id}
              `;

              // Update fleet run if applicable
              if (check.run_id) {
                await neonSql`
                  UPDATE fleet_health_runs
                  SET completed = completed + 1
                  WHERE id = ${check.run_id}
                `;

                // If completed matches total, mark done
                await neonSql`
                  UPDATE fleet_health_runs
                  SET status = 'done', finished_at = now()
                  WHERE id = ${check.run_id} AND completed >= total
                `;
              }

              // Audit log
              await neonSql`
                INSERT INTO audit_log (workspace_id, actor, action, target, result, details, created_at)
                VALUES ('default', ${RUNNER_ID}, 'diagnostic_probe', ${check.hostname}, ${probe.status}, ${JSON.stringify({ latency_ms: latency })}, now())
              `;

              console.log(`[Diagnostic Runner] Node ${check.hostname} completed: ${probe.status} (${latency}ms)`);
            })
          );
        }
      }
    } catch (pollErr) {
      console.warn('[Diagnostic Runner Poll Error]:', pollErr.message);
    }

    // Wait 2 seconds between polls
    await new Promise((resolve) => setTimeout(resolve, 2000));
  }
}

// Allow standalone execution
if (process.argv[1]?.endsWith('runner.js')) {
  startRunner().catch(console.error);
}

export { startRunner };
