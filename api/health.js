export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const rawKey = process.env.GEMINI_API_KEY;
  const hasKey = Boolean(rawKey && rawKey.trim().length > 0 && rawKey !== 'your_gemini_api_key_here');

  return res.status(200).json({
    ok: true,
    hasKey,
    model: 'gemini-3.8-flash'
  });
}
