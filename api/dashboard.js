import { db } from './_db.js';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const summary = await db.getDashboardSummary();
    return res.status(200).json(summary);
  } catch (err) {
    console.error('[API Dashboard Error]:', err);
    return res.status(500).json({ error: 'Internal Server Error', message: err.message });
  }
}
