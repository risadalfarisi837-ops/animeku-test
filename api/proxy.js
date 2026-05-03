const axios = require('axios');

// =====================
// PROXY INTERNAL — animeku-indo.my.id/api/proxy?url=TARGET_URL
// Dipanggil dari api/index.js sebagai pengganti cors.caliph.my.id
// Jalan di server Vercel sendiri, tidak bergantung pihak ketiga
// =====================

module.exports = async (req, res) => {
  // Allow CORS dari mana saja (dipakai internal)
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();

  const targetUrl = req.query.url;
  if (!targetUrl) return res.status(400).json({ error: 'url parameter wajib diisi' });

  // Validasi URL — hanya izinkan domain anime Indo yang dikenal
  const ALLOWED_DOMAINS = [
    'otakudesu.cloud', 'otakudesu.bid', 'otakudesu.me',
    'samehadaku.how', 'v2.samehadaku.how', 'samehadaku.net',
    'animasu.net', 'animasu.cc',
    'kuronime.biz', 'kuronime.art',
    'neonime.fun', 'neonime.net',
    'api.jikan.moe',
  ];

  let parsedUrl;
  try {
    parsedUrl = new URL(targetUrl);
  } catch (e) {
    return res.status(400).json({ error: 'URL tidak valid' });
  }

  const hostname = parsedUrl.hostname;
  const isAllowed = ALLOWED_DOMAINS.some(d => hostname === d || hostname.endsWith('.' + d));
  if (!isAllowed) {
    return res.status(403).json({ error: `Domain tidak diizinkan: ${hostname}` });
  }

  try {
    const response = await axios.get(targetUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'id-ID,id;q=0.9,en-US;q=0.8,en;q=0.7',
        'Referer': parsedUrl.origin,
        'Cache-Control': 'no-cache',
      },
      responseType: 'arraybuffer',
      timeout: 25000,
      maxRedirects: 5,
    });

    // Forward content-type dari sumber
    const contentType = response.headers['content-type'] || 'text/html; charset=utf-8';
    res.setHeader('Content-Type', contentType);
    // Cache 30 detik di edge Vercel — cukup untuk scraping tapi tidak stale
    res.setHeader('Cache-Control', 's-maxage=30, stale-while-revalidate=60');

    return res.status(200).send(Buffer.from(response.data));
  } catch (e) {
    const status = e.response?.status || 500;
    return res.status(status).json({
      error: `Proxy gagal: ${e.message}`,
      targetUrl,
    });
  }
};
