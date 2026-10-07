import { db } from './_db.js';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const url = new URL(req.url, 'http://localhost');
  const pathParts = url.pathname.split('/').filter(Boolean); // e.g. ['api', 'health', 'probe', '123']

  const endpoint = req.query.endpoint || pathParts[2] || null; // 'probe' | 'fleet' | 'heartbeat'
  const id = req.query.id || pathParts[3] || null;

  try {
    // 1. Heartbeat POST
    if (endpoint === 'heartbeat' && req.method === 'POST') {
      const body = req.body || {};
      const reg = await db.registerRunnerHeartbeat(body);
      return res.status(200).json({ ok: true, runner: reg });
    }

    // 2. Probe endpoints
    if (endpoint === 'probe') {
      if (req.method === 'POST') {
        const body = req.body || {};
        const serverId = body.serverId || body.server_id || req.query.serverId;
        if (!serverId) {
          return res.status(400).json({ error: 'serverId is required' });
        }
        const probeResult = await db.executeServerHealthProbe(serverId);
        return res.status(200).json(probeResult);
      }

      if (req.method === 'GET') {
        if (!id) {
          return res.status(400).json({ error: 'Probe ID is required' });
        }
        const probe = await db.getHealthCheck(id);
        if (!probe) {
          return res.status(404).json({ error: 'Health probe not found' });
        }
        return res.status(200).json(probe);
      }
    }

    // 3. Fleet Health endpoints
    if (endpoint === 'fleet') {
      if (req.method === 'POST') {
        const body = req.body || {};
        const scope = body.scope || req.query.scope || 'all';
        const fleetRun = await db.executeFleetHealthCheck(scope);
        return res.status(200).json(fleetRun);
      }

      if (req.method === 'GET') {
        if (!id) {
          return res.status(400).json({ error: 'Fleet Run ID is required' });
        }
        const run = await db.getFleetHealthRun(id);
        if (!run) {
          return res.status(404).json({ error: 'Fleet run not found' });
        }
        return res.status(200).json(run);
      }
    }

    // 4. Default GET /api/health (Gemini + Runner status)
    if (req.method === 'GET' && !endpoint) {
      const rawKey = process.env.GEMINI_API_KEY;
      const hasKey = Boolean(rawKey && rawKey.trim().length > 0 && rawKey !== 'your_gemini_api_key_here');
      const runnerActive = await db.isRunnerActive();

      return res.status(200).json({
        ok: true,
        hasKey,
        model: 'gemini-3.8-flash',
        runner: {
          active: runnerActive,
          mode: runnerActive ? 'real' : 'simulation'
        }
      });
    }

    return res.status(405).json({ error: 'Method Not Allowed' });
  } catch (err) {
    console.error('[API Health Error]:', err);
    const status = err.status || 500;
    return res.status(status).json({
      error: err.message || 'Internal Server Error',
      retry_after_sec: err.retry_after_sec || undefined
    });
  }
}
