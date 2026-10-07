import { db } from './_db.js';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,DELETE,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // Parse path and query
  const url = new URL(req.url, 'http://localhost');
  const pathParts = url.pathname.split('/').filter(Boolean); // ['api', 'deployments', '101', 'execute']
  
  let id = req.query.id || (pathParts[2] && !isNaN(Number(pathParts[2])) ? Number(pathParts[2]) : null);
  let action = req.query.action || pathParts[3] || null;

  try {
    // 1. DELETE /api/deployments/:id
    if (req.method === 'DELETE') {
      if (!id) return res.status(400).json({ error: 'Deployment ID required' });
      await db.deleteDeployment(id);
      return res.status(200).json({ success: true, message: `Deployment #${id} deleted` });
    }

    // 2. POST /api/deployments
    if (req.method === 'POST') {
      // Actions on an existing deployment: execute, confirm, complete, cancel
      if (id && action) {
        if (action === 'execute' || action === 'confirm') {
          const updated = await db.executeDeployment(id);
          return res.status(200).json(updated);
        }
        if (action === 'complete') {
          const updated = await db.completeDeployment(id);
          return res.status(200).json(updated);
        }
        if (action === 'cancel') {
          const updated = await db.cancelDeployment(id);
          return res.status(200).json(updated);
        }
      }

      // Create new deployment
      const payload = req.body || {};
      const created = await db.createDeployment(payload);
      return res.status(201).json(created);
    }

    // 3. GET /api/deployments
    if (req.method === 'GET') {
      if (id) {
        const item = await db.getDeployment(id);
        if (!item) return res.status(404).json({ error: 'Deployment not found' });
        return res.status(200).json(item);
      }
      const list = await db.getDeployments();
      return res.status(200).json(list);
    }

    return res.status(405).json({ error: 'Method Not Allowed' });
  } catch (err) {
    console.error('[API Deployments Error]:', err);
    return res.status(500).json({ error: 'Internal Server Error', message: err.message });
  }
}
