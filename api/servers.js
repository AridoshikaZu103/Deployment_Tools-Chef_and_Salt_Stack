import { db } from './_db.js';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const url = new URL(req.url, 'http://localhost');
  const pathParts = url.pathname.split('/').filter(Boolean); // ['api', 'servers', '1', 'health'] or ['api', 'servers', 'health', 'all']

  let id = req.query.id || (pathParts[2] && !isNaN(Number(pathParts[2])) ? Number(pathParts[2]) : null);
  let action = req.query.action || (pathParts[2] === 'health' && pathParts[3] === 'all' ? 'health_all' : pathParts[3]) || null;

  try {
    if (req.method === 'POST') {
      if (action === 'health_all') {
        const servers = await db.checkAllServersHealth();
        return res.status(200).json(servers);
      }
      if (id) {
        const srv = await db.checkServerHealth(id);
        return res.status(200).json(srv);
      }
    }

    if (req.method === 'GET') {
      if (id) {
        const srv = await db.getServer(id);
        if (!srv) return res.status(404).json({ error: 'Server not found' });
        return res.status(200).json(srv);
      }
      const servers = await db.getServers();
      return res.status(200).json(servers);
    }

    return res.status(405).json({ error: 'Method Not Allowed' });
  } catch (err) {
    console.error('[API Servers Error]:', err);
    return res.status(500).json({ error: 'Internal Server Error', message: err.message });
  }
}
