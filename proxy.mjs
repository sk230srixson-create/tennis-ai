// Minimal CORS proxy for Claude API (web dev only)
import http from 'http';
import https from 'https';

const PORT = 3001;
const API_HOST = 'api.anthropic.com';

const server = http.createServer((req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'content-type, x-api-key, anthropic-version, anthropic-beta');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  if (req.method !== 'POST') {
    res.writeHead(405);
    res.end('Method Not Allowed');
    return;
  }

  const proxyReq = https.request(
    {
      hostname: API_HOST,
      path: req.url,
      method: 'POST',
      headers: {
        'content-type': req.headers['content-type'] || 'application/json',
        'x-api-key': req.headers['x-api-key'] || '',
        'anthropic-version': req.headers['anthropic-version'] || '2023-06-01',
        ...(req.headers['anthropic-beta'] ? { 'anthropic-beta': req.headers['anthropic-beta'] } : {}),
      },
    },
    (apiRes) => {
      res.writeHead(apiRes.statusCode, { 'content-type': 'application/json' });
      apiRes.pipe(res);
    },
  );

  proxyReq.on('error', (e) => {
    console.error('Proxy error:', e.message);
    res.writeHead(502);
    res.end(JSON.stringify({ error: e.message }));
  });

  req.pipe(proxyReq);
});

server.listen(PORT, () => {
  console.log(`Claude proxy running on http://localhost:${PORT}`);
});
