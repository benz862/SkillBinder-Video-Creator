export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const key = process.env.HIGGSFIELD_API_KEY;
  if (!key) return res.status(500).json({ error: 'HIGGSFIELD_API_KEY not set' });

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 25000);
    const r = await fetch('https://api.higgsfield.ai/v1/user/balance', {
      headers: {
        'Authorization': `Bearer ${key}`,
        'Content-Type': 'application/json'
      },
      signal: controller.signal
    });
    clearTimeout(timeout);
    const text = await r.text();
    try {
      res.status(r.status).json(JSON.parse(text));
    } catch {
      res.status(r.status).json({ error: text });
    }
  } catch (e) {
    res.status(500).json({ error: e.message, type: e.name });
  }
}
