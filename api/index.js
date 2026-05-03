const express = require('express');
const axios = require('axios');
const cheerio = require('cheerio');
const cors = require('cors');
const { MongoClient, ServerApiVersion } = require('mongodb');

const app = express();
app.use(cors());

// =====================
// SOURCES
// =====================
const PROXY = 'https://cors.caliph.my.id/';
const SAMEHADAKU_URL = 'https://v2.samehadaku.how';
const OTAKUDESU_URL = 'https://otakudesu.cloud';
const KURONIME_URL = 'https://kuronime.biz';
const NEONIME_URL = 'https://neonime.fun';
const ANIMASU_URL = 'https://animasu.net';

const headers = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36',
  'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  'Accept-Language': 'id-ID,id;q=0.9,en-US;q=0.8,en;q=0.7',
};

// =====================
// FILTER PLAYER BERSIH
// =====================
const CLEAN_PLAYERS  = ['filemoon', 'streamwish', 'wish', 'okru', 'ok.ru', 'vidmoly', 'mp4upload', 'pixeldrain', 'krakenfiles'];
const DIRTY_PLAYERS  = ['dood', 'streamtape', 'goplay', 'dutamovie', 'streamhide', 'clicknupload', 'upstream'];

function isCleanStream(url) {
  const u = (url || '').toLowerCase();
  if (DIRTY_PLAYERS.some(p => u.includes(p))) return false;
  return true;
}

function filterCleanStreams(streams) {
  const clean = streams.filter(s => isCleanStream(s.url));
  return clean.length > 0 ? clean : streams;
}

// =====================
// MONGODB
// =====================
let client, dbCache;
async function getDb() {
  if (dbCache) return dbCache;
  if (!client) client = new MongoClient(process.env.MONGODB_URI, {
    serverApi: { version: ServerApiVersion.v1, strict: true, deprecationErrors: true },
    connectTimeoutMS: 10000,
    socketTimeoutMS: 10000,
    serverSelectionTimeoutMS: 10000,
  });
  await client.connect();
  dbCache = client.db('database');
  dbCache.collection('watch_cache').createIndex({ url: 1 }, { unique: true }).catch(() => {});
  // FIX: TTL dikurangin dari 28800 (8 jam) jadi 7200 (2 jam) biar stream expired lebih cepat kedeteksi
  dbCache.collection('watch_cache').createIndex({ cachedAt: 1 }, { expireAfterSeconds: 7200 }).catch(() => {});
  dbCache.collection('list_anime').createIndex({ episode: 1 }).catch(() => {});
  dbCache.collection('list_anime').createIndex({ healFailed: 1 }).catch(() => {});
  dbCache.collection('list_anime').createIndex({ streamSource: 1 }).catch(() => {});
  dbCache.collection('heal_jobs').createIndex({ jobId: 1 }, { unique: true }).catch(() => {});
  dbCache.collection('heal_jobs').createIndex({ startedAt: 1 }, { expireAfterSeconds: 604800 }).catch(() => {});
  dbCache.collection('blacklist').createIndex({ url: 1 }, { unique: true }).catch(() => {});
  dbCache.collection('blacklist').createIndex({ titleNorm: 1 }).catch(() => {});
  return dbCache;
}

// =====================
// AUTO-HEALING ENGINE
// =====================
const healingInProgress = new Set();

function needsHealing(doc) {
  return !doc.episodes || !Array.isArray(doc.episodes) || doc.episodes.length === 0;
}

async function healAnime(db, malDoc) {
  const key = malDoc._id?.toString() || malDoc.url;
  if (healingInProgress.has(key)) return { healed: false, reason: 'already-healing' };
  healingInProgress.add(key);

  try {
    const streamUrl = await findStreamUrl(malDoc);
    if (!streamUrl) {
      await db.collection('list_anime').updateOne(
        { url: malDoc.url },
        { $set: { healAttemptAt: new Date(), healFailed: true } }
      );
      return { healed: false, reason: 'no-stream-found' };
    }

    let scraped = { episodes: [], info: {} };
    try { scraped = await scrapeDetailEpisodesOnly(streamUrl); } catch (e) {}

    const episodeCount = scraped.episodes?.length || 0;
    const episodeStr = episodeCount > 0 ? String(episodeCount) : (malDoc.info?.episode_count || malDoc.episode || '0');

    const updatePayload = {
      streamSource: streamUrl,
      healedAt: new Date(),
      healFailed: false,
      episodes: scraped.episodes || []
    };
    
    if (episodeCount > 0) {
      updatePayload.episode = episodeStr;
      updatePayload['info.episode_count'] = episodeStr;
    }
    if (scraped.info?.studio) updatePayload['info.studio'] = scraped.info.studio;
    if (scraped.info?.status)  updatePayload['info.status']  = scraped.info.status;

    await db.collection('list_anime').updateOne(
      { url: malDoc.url },
      { $set: updatePayload }
    );

    return { healed: true, episodeCount, streamUrl };
  } catch (e) {
    return { healed: false, reason: e.message };
  } finally {
    healingInProgress.delete(key);
  }
}

function healInBackground(db, malDoc) {
  setImmediate(async () => {
    try { await healAnime(db, malDoc); } catch (e) {}
  });
}

function normalizeTitle(title) {
  return title
    .toLowerCase()
    .replace(/subtitle\s*indonesia/gi, '')
    .replace(/sub\s*indo/gi, '')
    .replace(/\s*-\s*episode\s*\d+.*/gi, '')
    .replace(/\s*episode\s*\d+.*/gi, '')
    .replace(/[^a-z0-9\s]/gi, '')
    .replace(/\s+/g, ' ')
    .trim();
}

async function scrapeSamehadakuLatest(page = 1) {
  const res = await axios.get(`${PROXY}${SAMEHADAKU_URL}/anime-terbaru/page/${page}/`, {
    headers: { ...headers, 'Referer': SAMEHADAKU_URL }, timeout: 20000
  });
  const $ = cheerio.load(res.data);
  const data = [];
  $('.post-show ul li').each((_, e) => {
    const a = $(e).find('.dtla h2 a');
    if (a.length > 0) {
      const title = a.text().trim();
      const imgEl = $(e).find('.thumb img');
      data.push({
        title, titleNorm: normalizeTitle(title), url: a.attr('href'),
        image: imgEl.attr('data-src') || imgEl.attr('src') || '',
        episode: $(e).find('.dtla span:contains("Episode")').text().replace('Episode', '').trim(),
        source: 'samehadaku', lastUpdate: new Date()
      });
    }
  });
  return data;
}

async function scrapeSamehadakuSearch(query) {
  const res = await axios.get(`${PROXY}${SAMEHADAKU_URL}/?s=${encodeURIComponent(query)}`, {
    headers: { ...headers, 'Referer': SAMEHADAKU_URL }, timeout: 20000
  });
  const $ = cheerio.load(res.data);
  const data = [];
  $('.animpost').each((_, e) => {
    const title = $(e).find('.data .title h2').text().trim();
    data.push({
      title, titleNorm: normalizeTitle(title),
      image: $(e).find('.content-thumb img').attr('src') || $(e).find('.content-thumb img').attr('data-src'),
      type: $(e).find('.type').text().trim(), score: $(e).find('.score').text().trim(),
      url: $(e).find('a').attr('href'), source: 'samehadaku'
    });
  });
  return data;
}

async function scrapeOtakudesuLatest(page = 1) {
  const res = await axios.get(`${PROXY}${OTAKUDESU_URL}/ongoing-anime/page/${page}/`, {
    headers: { ...headers, 'Referer': OTAKUDESU_URL }, timeout: 20000
  });
  const $ = cheerio.load(res.data);
  const data = [];
  $('.venz ul li').each((_, e) => {
    const a = $(e).find('.thumb a');
    const title = $(e).find('.thumb a .thumbz h2').text().trim();
    if (title && a.attr('href')) {
      data.push({
        title, titleNorm: normalizeTitle(title), url: a.attr('href'),
        image: $(e).find('.thumb a .thumbz img').attr('src') || $(e).find('.thumb a .thumbz img').attr('data-src'),
        episode: $(e).find('.thumb a .thumbz .epz').text().replace('Episode', '').trim(),
        source: 'otakudesu', lastUpdate: new Date()
      });
    }
  });
  return data;
}

async function scrapeOtakudesuSearch(query) {
  const res = await axios.get(`${PROXY}${OTAKUDESU_URL}/?s=${encodeURIComponent(query)}&post_type=anime`, {
    headers: { ...headers, 'Referer': OTAKUDESU_URL }, timeout: 20000
  });
  const $ = cheerio.load(res.data);
  const data = [];
  $('.chivsrc ul li').each((_, e) => {
    const title = $(e).find('h2 a').text().trim();
    const url = $(e).find('h2 a').attr('href');
    if (title && url) data.push({ title, titleNorm: normalizeTitle(title), image: $(e).find('img').attr('src'), url, source: 'otakudesu' });
  });
  return data;
}

async function scrapeAnimasuLatest(page = 1) {
  const res = await axios.get(`${PROXY}${ANIMASU_URL}/page/${page}/`, {
    headers: { ...headers, 'Referer': ANIMASU_URL }, timeout: 20000
  });
  const $ = cheerio.load(res.data);
  const data = [];
  $('.bixbox .listupd article, .bixbox article').each((_, e) => {
    const title = $(e).find('.tt, h2, .ntitle').first().text().trim();
    const url = $(e).find('a').first().attr('href');
    if (title && url) {
      data.push({
        title, titleNorm: normalizeTitle(title), url,
        image: $(e).find('img').attr('src') || $(e).find('img').attr('data-src') || '',
        episode: $(e).find('.epx, .epztipe').text().replace('Episode', '').trim(),
        source: 'animasu', lastUpdate: new Date()
      });
    }
  });
  return data;
}

async function scrapeAnimasuSearch(query) {
  const res = await axios.get(`${PROXY}${ANIMASU_URL}/?s=${encodeURIComponent(query)}`, {
    headers: { ...headers, 'Referer': ANIMASU_URL }, timeout: 20000
  });
  const $ = cheerio.load(res.data);
  const data = [];
  $('article, .animpost').each((_, e) => {
    const title = $(e).find('.tt, h2, .ntitle').first().text().trim();
    const url = $(e).find('a').first().attr('href');
    if (title && url) {
      data.push({ title, titleNorm: normalizeTitle(title), image: $(e).find('img').attr('src') || $(e).find('img').attr('data-src') || '', url, source: 'animasu' });
    }
  });
  return data;
}

async function scrapeDetailAnimasuEpisodesOnly(link) {
  const res = await axios.get(`${PROXY}${link}`, { headers: { ...headers, 'Referer': ANIMASU_URL }, timeout: 20000 });
  const $ = cheerio.load(res.data);
  const episodes = [];
  $('.eplister ul li a, .episodelist li a').each((_, e) => {
    episodes.push({ title: $(e).text().trim(), url: $(e).attr('href'), date: $(e).find('.edate').text().trim() || '' });
  });
  const info = {};
  $('.spe span, .infozingle span').each((_, e) => {
    const t = $(e).text();
    if (t.includes(':')) { const [k, v] = t.split(':'); info[k.trim().toLowerCase().replace(/\s+/g, '_')] = v.trim(); }
  });
  // FIX v24: ambil title & image dari animasu
  info.title = $('h1.entry-title, h1').first().text().trim();
  info.image = $('.thumb img').attr('src') || $('img.wp-post-image').attr('src') || $('meta[property="og:image"]').attr('content') || '';
  return { episodes, info };
}

async function scrapeWatchAnimasu(link) {
  const res = await axios.get(`${PROXY}${link}`, { headers: { ...headers, 'Referer': ANIMASU_URL }, timeout: 20000 });
  const $ = cheerio.load(res.data);
  const title = $('h1.entry-title, h1').first().text().trim();
  const streams = [];
  $('select.mirror option, .mirrorstream option').each((_, el) => {
    const val = $(el).attr('value');
    if (val) {
      try {
        const decoded = Buffer.from(val, 'base64').toString('utf-8');
        const iframe = cheerio.load(decoded)('iframe').attr('src');
        if (iframe) streams.push({ server: $(el).text().trim() || 'Animasu', url: iframe });
      } catch {}
    }
  });
  if (streams.length === 0) {
    $('iframe').each((_, el) => {
      const src = $(el).attr('src');
      if (src && src.startsWith('http')) streams.push({ server: 'Animasu', url: src });
    });
  }
  return { title, streams };
}

async function scrapeDetailEpisodesOnly(link) {
  if (link.includes('otakudesu')) return scrapeDetailOtakudesuEpisodesOnly(link);
  if (link.includes('animasu')) return scrapeDetailAnimasuEpisodesOnly(link);

  // Samehadaku — FIX v33: multi-selector fallback
  const targetUrl = link.startsWith('http') ? link : `${SAMEHADAKU_URL}${link}`;
  const res = await axios.get(`${PROXY}${targetUrl}`, { headers: { ...headers, 'Referer': SAMEHADAKU_URL }, timeout: 20000 });
  const $ = cheerio.load(res.data);
  const episodes = [];
  const epSelectors = [
    { list: '.lstepsiode ul li', link: '.epsleft .lchx a', date: '.epsleft .date' },
    { list: '.episodelist ul li', link: 'a', date: '.date' },
    { list: '.eps-list ul li', link: 'a', date: '.date' },
    { list: '.list-episode li', link: 'a', date: '' },
  ];
  for (const sel of epSelectors) {
    $(sel.list).each((_, e) => {
      const epUrl = $(e).find(sel.link).attr('href');
      const epTitle = $(e).find(sel.link).text().trim();
      if (epUrl && !episodes.find(ep => ep.url === epUrl)) {
        episodes.push({ title: epTitle, url: epUrl, date: sel.date ? $(e).find(sel.date).text().trim() : '' });
      }
    });
    if (episodes.length > 0) break;
  }
  const info = {};
  $('.anim-senct .right-senc .spe span').each((_, e) => {
    const t = $(e).text();
    if (t.includes(':')) { const [k, v] = t.split(':'); info[k.trim().toLowerCase().replace(/\s+/g, '_')] = v.trim(); }
  });
  // FIX v24: ambil title & image dari halaman detail scraper
  info.title = $('.anim-senct h1, .entry-title').first().text().replace(' - Samehadaku', '').trim() || $('title').text().replace(' - Samehadaku', '').trim();
  info.image = $('.anim-senct .left-senc img').attr('src') || $('.thumb img').attr('src') || $('meta[property="og:image"]').attr('content') || '';
  return { episodes, info };
}

async function scrapeDetailOtakudesuEpisodesOnly(link) {
  const res = await axios.get(`${PROXY}${link}`, { headers: { ...headers, 'Referer': OTAKUDESU_URL }, timeout: 20000 });
  const $ = cheerio.load(res.data);
  const episodes = [];
  // FIX v33: multi-selector fallback
  const epSelectors = ['.episodelist ul li', '.eps-list ul li', '.episoder ul li', '.list-episode li'];
  for (const sel of epSelectors) {
    $(sel).each((_, e) => {
      const epUrl = $(e).find('a').attr('href');
      const epTitle = $(e).find('a').text().trim();
      if (epUrl && !episodes.find(ep => ep.url === epUrl)) {
        episodes.push({ title: epTitle, url: epUrl, date: $(e).find('.zeebr').text().trim() });
      }
    });
    if (episodes.length > 0) break;
  }
  const info = {};
  $('.infozingle span').each((_, e) => {
    const t = $(e).text();
    if (t.includes(':')) { const [k, v] = t.split(':'); info[k.trim().toLowerCase().replace(/\s+/g, '_')] = v.trim(); }
  });
  // FIX v24: ambil title & image dari otakudesu
  info.title = $('.infoanime h1').text().trim();
  info.image = $('.fotoanime img').attr('src') || $('.infoanime img').attr('src') || $('img.attachment-large').attr('src') || $('meta[property="og:image"]').attr('content') || '';
  return { episodes, info };
}

async function scrapeDetailFull(link) {
  if (link.includes('otakudesu')) {
    const res = await axios.get(`${PROXY}${link}`, { headers: { ...headers, 'Referer': OTAKUDESU_URL }, timeout: 20000 });
    const $ = cheerio.load(res.data);
    const episodes = [];
    $('.episodelist ul li').each((_, e) => { episodes.push({ title: $(e).find('a').text().trim(), url: $(e).find('a').attr('href'), date: $(e).find('.zeebr').text().trim() }); });
    const info = {};
    $('.infozingle span').each((_, e) => { const t = $(e).text(); if (t.includes(':')) { const [k, v] = t.split(':'); info[k.trim().toLowerCase().replace(/\s+/g, '_')] = v.trim(); } });
    // FIX v24: scrape image & title dari otakudesu
    const title = $('.infoanime h1').text().trim();
    const image = $('.fotoanime img').attr('src') || $('.infoanime img').attr('src') || $('img.attachment-large').attr('src') || '';
    return { title, image, description: $('.sinopc').text().trim(), episodes, info };
  }
  if (link.includes('animasu')) {
    const res = await axios.get(`${PROXY}${link}`, { headers: { ...headers, 'Referer': ANIMASU_URL }, timeout: 20000 });
    const $ = cheerio.load(res.data);
    const episodes = [];
    $('.eplister ul li a, .episodelist li a').each((_, e) => { episodes.push({ title: $(e).text().trim(), url: $(e).attr('href'), date: '' }); });
    const info = {};
    $('.spe span').each((_, e) => { const t = $(e).text(); if (t.includes(':')) { const [k, v] = t.split(':'); info[k.trim().toLowerCase().replace(/\s+/g, '_')] = v.trim(); } });
    // FIX v24: scrape image & title dari animasu
    const title = $('h1.entry-title, h1').first().text().trim();
    const image = $('.thumb img').attr('src') || $('img.wp-post-image').attr('src') || $('meta[property="og:image"]').attr('content') || '';
    return { title, image, description: $('.entry-content p').first().text().trim() || $('meta[name="description"]').attr('content'), episodes, info };
  }

  // Samehadaku
  const targetUrl = link.startsWith('http') ? link : `${SAMEHADAKU_URL}${link}`;
  const res = await axios.get(`${PROXY}${targetUrl}`, { headers: { ...headers, 'Referer': SAMEHADAKU_URL }, timeout: 20000 });
  const $ = cheerio.load(res.data);
  const episodes = [];
  $('.lstepsiode ul li').each((_, e) => { episodes.push({ title: $(e).find('.epsleft .lchx a').text().trim(), url: $(e).find('.epsleft .lchx a').attr('href'), date: $(e).find('.epsleft .date').text().trim() }); });
  const info = {};
  $('.anim-senct .right-senc .spe span').each((_, e) => { const t = $(e).text(); if (t.includes(':')) { const [k, v] = t.split(':'); info[k.trim().toLowerCase().replace(/\s+/g, '_')] = v.trim(); } });
  // FIX v24: scrape image & title dari samehadaku
  const title = $('.anim-senct h1, .entry-title').first().text().replace(' - Samehadaku', '').trim() || $('title').text().replace(' - Samehadaku', '').trim();
  const image = $('.anim-senct .left-senc img').attr('src') || $('.thumb img').attr('src') || $('meta[property="og:image"]').attr('content') || '';
  return { title, image, description: $('.entry-content').text().trim() || $('meta[name="description"]').attr('content'), episodes, info };
}

function getQualityPriority(name) {
  const n = name.toLowerCase();
  if (n.includes('1080')) return 3; if (n.includes('720')) return 2; if (n.includes('480')) return 1; if (n.includes('360')) return 0;
  return -1;
}

function mapStreamsToSlots(allStreams) {
  if (allStreams.length === 0) return [];
  // Return semua stream dengan nama aslinya, deduplicate by url
  const seen = new Set();
  return allStreams.filter(s => {
    if (seen.has(s.url)) return false;
    seen.add(s.url);
    return true;
  }).map(s => ({ server: s.server, url: s.url }));
}

async function scrapeWatchSamehadaku(link) {
  const targetUrl = link.startsWith('http') ? link : `${SAMEHADAKU_URL}${link}`;
  const res = await axios.get(`${PROXY}${targetUrl}`, { headers: { ...headers, 'Referer': SAMEHADAKU_URL }, timeout: 20000 });
  const cookies = res.headers['set-cookie']?.map(v => v.split(';')[0]).join('; ') || '';
  const $ = cheerio.load(res.data);
  const title = $('h1[itemprop="name"]').text().trim();
  const data = [];
  for (const li of $('div#server > ul > li').toArray()) {
    const div = $(li).find('div'); const post = div.attr('data-post'); const nume = div.attr('data-nume'); const type = div.attr('data-type'); const name = $(li).find('span').text().trim();
    if (!post) continue;
    const body = new URLSearchParams({ action: 'player_ajax', post, nume, type }).toString();
    try {
      const r = await axios.post(`${PROXY}${SAMEHADAKU_URL}/wp-admin/admin-ajax.php`, body, { headers: { ...headers, 'Content-Type': 'application/x-www-form-urlencoded', 'Cookie': cookies, 'Referer': targetUrl } });
      const iframe = cheerio.load(r.data)('iframe').attr('src');
      if (iframe) data.push({ server: name, url: iframe });
    } catch (e) {}
  }
  return { title, streams: data };
}

async function scrapeWatchOtakudesu(link) {
  const res = await axios.get(`${PROXY}${link}`, { headers: { ...headers, 'Referer': OTAKUDESU_URL }, timeout: 20000 });
  const $ = cheerio.load(res.data);
  const title = $('.easynime h1').text().trim() || $('h1').first().text().trim();
  const data = [];
  $('.mirrorstream ul li').each((_, e) => {
    const encoded = $(e).find('a').attr('data-content');
    if (encoded) {
      try {
        const iframe = cheerio.load(Buffer.from(encoded, 'base64').toString('utf-8'))('iframe').attr('src');
        if (iframe) data.push({ server: $(e).find('a').text().trim(), url: iframe });
      } catch (err) {}
    }
  });
  if (data.length === 0) { $('iframe').each((_, e) => { const src = $(e).attr('src'); if (src && src.startsWith('http')) data.push({ server: 'Default', url: src }); }); }
  return { title, streams: data };
}

async function scrapeWatchKuronimeByTitle(titleQuery, epNumber) {
  try {
    const searchRes = await axios.get(`${PROXY}${KURONIME_URL}/?s=${encodeURIComponent(titleQuery)}`, { headers: { ...headers, 'Referer': KURONIME_URL }, timeout: 15000 });
    const animeUrl = cheerio.load(searchRes.data)('.bsx a').first().attr('href') || cheerio.load(searchRes.data)('.soralist li a').first().attr('href');
    if (!animeUrl) return { title: '', streams: [] };
    
    const detailRes = await axios.get(`${PROXY}${animeUrl}`, { headers: { ...headers, 'Referer': KURONIME_URL }, timeout: 15000 });
    const episodes = [];
    cheerio.load(detailRes.data)('.eplister ul li a').each((_, e) => { episodes.push({ title: cheerio.load(detailRes.data)(e).text().trim(), url: cheerio.load(detailRes.data)(e).attr('href') }); });
    
    let epUrl = null;
    if (epNumber) { const found = episodes.find(e => (e.title || '').toLowerCase().includes(`episode ${epNumber}`) || (e.title || '').toLowerCase().includes(` ${epNumber}`)); epUrl = found?.url || episodes[0]?.url; } else { epUrl = episodes[0]?.url; }
    if (!epUrl) return { title: '', streams: [] };
    
    const epRes = await axios.get(`${PROXY}${epUrl}`, { headers: { ...headers, 'Referer': KURONIME_URL }, timeout: 15000 });
    const $e = cheerio.load(epRes.data);
    const title = $e('h1.entry-title').text().trim() || $e('h1').first().text().trim();
    const streams = [];
    $e('select.mirror option').each((_, opt) => {
      const val = $e(opt).attr('value');
      if (val) {
        try { const iframe = cheerio.load(Buffer.from(val, 'base64').toString('utf-8'))('iframe').attr('src'); if (iframe) streams.push({ server: $e(opt).text().trim() || 'Kuronime', url: iframe }); } catch {}
      }
    });
    if (streams.length === 0) { $e('iframe').each((_, el) => { const src = $e(el).attr('src'); if (src && src.startsWith('http')) streams.push({ server: 'Kuronime', url: src }); }); }
    return { title, streams };
  } catch (e) { return { title: '', streams: [] }; }
}

async function scrapeWatchNeonimeByTitle(titleQuery, epNumber) {
  try {
    const searchRes = await axios.get(`${PROXY}${NEONIME_URL}/?s=${encodeURIComponent(titleQuery)}`, { headers: { ...headers, 'Referer': NEONIME_URL }, timeout: 15000 });
    const animeUrl = cheerio.load(searchRes.data)('.bsx a').first().attr('href') || cheerio.load(searchRes.data)('article.animpost a').first().attr('href');
    if (!animeUrl) return { title: '', streams: [] };

    const detailRes = await axios.get(`${PROXY}${animeUrl}`, { headers: { ...headers, 'Referer': NEONIME_URL }, timeout: 15000 });
    const episodes = [];
    cheerio.load(detailRes.data)('.eplister ul li a, .episodelist li a').each((_, e) => { episodes.push({ title: cheerio.load(detailRes.data)(e).text().trim(), url: cheerio.load(detailRes.data)(e).attr('href') }); });
    
    let epUrl = null;
    if (epNumber) { const found = episodes.find(e => (e.title || '').toLowerCase().includes(`episode ${epNumber}`) || (e.title || '').toLowerCase().includes(` ${epNumber}`)); epUrl = found?.url || episodes[0]?.url; } else { epUrl = episodes[0]?.url; }
    if (!epUrl) return { title: '', streams: [] };

    const epRes = await axios.get(`${PROXY}${epUrl}`, { headers: { ...headers, 'Referer': NEONIME_URL }, timeout: 15000 });
    const $e = cheerio.load(epRes.data);
    const title = $e('h1.entry-title').text().trim() || $e('h1').first().text().trim();
    const streams = [];
    $e('select.mirror option, .mirrorstream a').each((_, el) => {
      const val = $e(el).attr('value') || $e(el).attr('data-em');
      if (val) {
        try { const iframe = cheerio.load(Buffer.from(val, 'base64').toString('utf-8'))('iframe').attr('src'); if (iframe) streams.push({ server: $e(el).text().trim() || 'Neonime', url: iframe }); } catch {}
      }
    });
    if (streams.length === 0) { $e('iframe').each((_, el) => { const src = $e(el).attr('src'); if (src && src.startsWith('http')) streams.push({ server: 'Neonime', url: src }); }); }
    return { title, streams };
  } catch (e) { return { title: '', streams: [] }; }
}

async function scrapeWatchAnimasuByTitle(titleQuery, epNumber) {
  try {
    const results = await scrapeAnimasuSearch(titleQuery);
    if (!results?.[0]?.url) return { title: '', streams: [] };
    const detail = await scrapeDetailAnimasuEpisodesOnly(results[0].url);
    const episodes = detail.episodes || [];
    let epUrl = null;
    if (epNumber) { const found = episodes.find(e => (e.title || '').toLowerCase().includes(`episode ${epNumber}`) || (e.title || '').toLowerCase().includes(` ${epNumber}`)); epUrl = found?.url || episodes[0]?.url; } else { epUrl = episodes[0]?.url; }
    if (!epUrl) return { title: '', streams: [] };
    return await scrapeWatchAnimasu(epUrl);
  } catch (e) { return { title: '', streams: [] }; }
}

function findMatchingEp(episodes, epNum, reversed = false) {
  if (!episodes || episodes.length === 0) return null;
  if (epNum) { const found = episodes.find(e => (e.title || '').toLowerCase().includes(`episode ${epNum}`) || (e.title || '').toLowerCase().includes(` ${epNum} `) || (e.title || '').toLowerCase().endsWith(` ${epNum}`)); if (found) return found; }
  return reversed ? episodes[0] : episodes[episodes.length - 1];
}

// FIX: scrapeWatchByTitle dipercepat dengan parallel search per source
async function scrapeWatchByTitle(animeTitle, epNumber, skipSource) {
  const allStreams = [];
  let title = '';
  const jobs = [];

  if (skipSource !== 'samehadaku') {
    jobs.push(async () => {
      const results = await scrapeSamehadakuSearch(animeTitle);
      if (!results?.[0]?.url) return;
      const detail = await scrapeDetailEpisodesOnly(results[0].url);
      const ep = findMatchingEp(detail.episodes, epNumber, true);
      if (!ep?.url) return;
      const r = await scrapeWatchSamehadaku(ep.url);
      if (!title && r.title) title = r.title;
      allStreams.push(...r.streams.map(s => ({ ...s, source: 'samehadaku' })));
    });
  }
  if (skipSource !== 'otakudesu') {
    jobs.push(async () => {
      const results = await scrapeOtakudesuSearch(animeTitle);
      if (!results?.[0]?.url) return;
      const detail = await scrapeDetailOtakudesuEpisodesOnly(results[0].url);
      const ep = findMatchingEp(detail.episodes, epNumber, false);
      if (!ep?.url) return;
      const r = await scrapeWatchOtakudesu(ep.url);
      if (!title && r.title) title = r.title;
      allStreams.push(...r.streams.map(s => ({ ...s, source: 'otakudesu' })));
    });
  }
  jobs.push(async () => {
    const r = await scrapeWatchAnimasuByTitle(animeTitle, epNumber);
    if (!title && r.title) title = r.title;
    allStreams.push(...r.streams.map(s => ({ ...s, source: 'animasu' })));
  });
  jobs.push(async () => {
    const r = await scrapeWatchKuronimeByTitle(animeTitle, epNumber);
    if (!title && r.title) title = r.title;
    allStreams.push(...r.streams.map(s => ({ ...s, source: 'kuronime' })));
  });
  jobs.push(async () => {
    const r = await scrapeWatchNeonimeByTitle(animeTitle, epNumber);
    if (!title && r.title) title = r.title;
    allStreams.push(...r.streams.map(s => ({ ...s, source: 'neonime' })));
  });

  await Promise.allSettled(jobs.map(fn => fn()));
  const clean = filterCleanStreams(allStreams);
  return { title, streams: mapStreamsToSlots(clean.length > 0 ? clean : allStreams) };
}


async function scrapeWatch(link) {
  const allStreams = [];
  let title = '';

  function extractFromUrl(url) {
    try {
      const parts = url.replace(/\/+$/, '').split('/');
      const slug = parts[parts.length - 1];
      const epMatch = slug.match(/episode[-_]?(\d+)/i) || slug.match(/ep[-_]?(\d+)/i) || slug.match(/-(\d+)$/);
      return { titleSlug: slug.replace(/-/g, ' ').replace(/episode\s*\d+/i, '').replace(/ep\s*\d+/i, '').replace(/sub\s*indo/i, '').replace(/\s+/g, ' ').trim(), epNum: epMatch ? epMatch[1] : null };
    } catch { return { titleSlug: '', epNum: null }; }
  }

  const { titleSlug: searchTitle, epNum: epNumber } = extractFromUrl(link);

  const primarySource = link.includes('otakudesu') ? 'otakudesu' : link.includes('animasu') ? 'animasu' : 'samehadaku';

  if (primarySource === 'otakudesu') {
    try { const r = await scrapeWatchOtakudesu(link); if (r.title) title = r.title; allStreams.push(...r.streams.map(s => ({ ...s, source: 'otakudesu' }))); } catch (e) {}
  } else if (primarySource === 'animasu') {
    try { const r = await scrapeWatchAnimasu(link); if (r.title) title = r.title; allStreams.push(...r.streams.map(s => ({ ...s, source: 'animasu' }))); } catch (e) {}
  } else {
    try { const r = await scrapeWatchSamehadaku(link); if (r.title) title = r.title; allStreams.push(...r.streams.map(s => ({ ...s, source: 'samehadaku' }))); } catch (e) {}
  }

  const effectiveTitle = title || searchTitle;

  // FIX: fallback langsung parallel ke semua source kalau stream kurang dari 3
  if (allStreams.length < 3 && effectiveTitle) {
    const fallbackJobs = [];
    if (primarySource !== 'samehadaku') { fallbackJobs.push(async () => { const results = await scrapeSamehadakuSearch(effectiveTitle); if (!results?.[0]?.url) return; const detail = await scrapeDetailEpisodesOnly(results[0].url); const ep = findMatchingEp(detail.episodes, epNumber, true); if (!ep?.url) return; const r = await scrapeWatchSamehadaku(ep.url); if (!title && r.title) title = r.title; allStreams.push(...r.streams.map(s => ({ ...s, source: 'samehadaku' }))); }); }
    if (primarySource !== 'otakudesu') { fallbackJobs.push(async () => { const results = await scrapeOtakudesuSearch(effectiveTitle); if (!results?.[0]?.url) return; const detail = await scrapeDetailOtakudesuEpisodesOnly(results[0].url); const ep = findMatchingEp(detail.episodes, epNumber, false); if (!ep?.url) return; const r = await scrapeWatchOtakudesu(ep.url); if (!title && r.title) title = r.title; allStreams.push(...r.streams.map(s => ({ ...s, source: 'otakudesu' }))); }); }
    if (primarySource !== 'animasu') { fallbackJobs.push(async () => { const r = await scrapeWatchAnimasuByTitle(effectiveTitle, epNumber); if (!title && r.title) title = r.title; allStreams.push(...r.streams.map(s => ({ ...s, source: 'animasu' }))); }); }
    fallbackJobs.push(async () => { const r = await scrapeWatchKuronimeByTitle(effectiveTitle, epNumber); if (!title && r.title) title = r.title; allStreams.push(...r.streams.map(s => ({ ...s, source: 'kuronime' }))); });
    fallbackJobs.push(async () => { const r = await scrapeWatchNeonimeByTitle(effectiveTitle, epNumber); if (!title && r.title) title = r.title; allStreams.push(...r.streams.map(s => ({ ...s, source: 'neonime' }))); });
    await Promise.allSettled(fallbackJobs.map(fn => fn()));
  }

  const cleanStreams = filterCleanStreams(allStreams);
  return { title, streams: mapStreamsToSlots(cleanStreams), sourcesUsed: [...new Set(allStreams.map(s => s.source).filter(Boolean))] };
}

async function saveToDb(col, items, db) {
  let saved = 0;

  // Ambil blacklist sekali, bukan per-item
  const blacklistedUrls = new Set();
  const blacklistedNorms = new Set();
  if (db) {
    try {
      const bl = await db.collection('blacklist').find({}).toArray();
      bl.forEach(d => {
        if (d.url) blacklistedUrls.add(d.url);
        if (d.titleNorm) blacklistedNorms.add(d.titleNorm);
      });
    } catch (e) {}
  }

  await Promise.all(items.map(async item => {
    if (!item.title || !item.url) return;
    // Skip kalau ada di blacklist — tidak akan balik lagi ke DB
    if (blacklistedUrls.has(item.url) || blacklistedNorms.has(item.titleNorm)) return;
    // Hapus field gambar dari scraper (thumbnail, poster, cover) — bukan 'image' yang dari MAL
    delete item.thumbnail;
    delete item.poster;
    delete item.cover;
    try {
      await col.updateOne(
        { titleNorm: item.titleNorm },
        { $set: { ...item, lastUpdate: new Date() }, $unset: { thumbnail: '', poster: '', cover: '' } },
        { upsert: true }
      );
      saved++;
    } catch (e) {}
  }));
  return saved;
}

// =====================
// SCRAPE LANGSUNG DARI SITE ANIME INDONESIA
// Prioritas: Otakudesu (stabil) -> Samehadaku -> Animasu
// TIDAK simpan gambar/thumbnail sama sekali
// HANYA simpan anime yang punya episode valid (> 0)
// =====================

async function scrapeOtakudesuOngoing(page = 1) {
  const res = await axios.get(`${PROXY}${OTAKUDESU_URL}/ongoing-anime/page/${page}/`, {
    headers: { ...headers, 'Referer': OTAKUDESU_URL }, timeout: 20000
  });
  const $ = cheerio.load(res.data);
  const data = [];
  $('.venz ul li').each((_, e) => {
    const title = $(e).find('.thumb a .thumbz h2').text().trim();
    const url = $(e).find('.thumb a').attr('href');
    if (title && url) {
      data.push({ title, titleNorm: normalizeTitle(title), url, source: 'otakudesu' });
    }
  });
  return data;
}

async function scrapeOtakudesuComplete(page = 1) {
  const res = await axios.get(`${PROXY}${OTAKUDESU_URL}/complete-anime/page/${page}/`, {
    headers: { ...headers, 'Referer': OTAKUDESU_URL }, timeout: 20000
  });
  const $ = cheerio.load(res.data);
  const data = [];
  $('.venz ul li').each((_, e) => {
    const title = $(e).find('.thumb a .thumbz h2').text().trim();
    const url = $(e).find('.thumb a').attr('href');
    if (title && url) {
      data.push({ title, titleNorm: normalizeTitle(title), url, source: 'otakudesu' });
    }
  });
  return data;
}

async function scrapeOtakudesuDetail(url) {
  const res = await axios.get(`${PROXY}${url}`, {
    headers: { ...headers, 'Referer': OTAKUDESU_URL }, timeout: 20000
  });
  const $ = cheerio.load(res.data);
  const episodes = [];
  // FIX v33: coba beberapa selector sekaligus — kalau struktur berubah masih bisa dapat ep
  const epSelectors = ['.episodelist ul li', '.eps-list ul li', '.episoder ul li', '.list-episode li', '#episode_page li a'];
  for (const sel of epSelectors) {
    $(sel).each((_, e) => {
      const epUrl = $(e).find('a').attr('href') || ($(e).is('a') ? $(e).attr('href') : null);
      const epTitle = $(e).find('a').text().trim() || $(e).text().trim();
      if (epUrl && !episodes.find(ep => ep.url === epUrl)) {
        episodes.push({ title: epTitle, url: epUrl, date: $(e).find('.zeebr').text().trim() });
      }
    });
    if (episodes.length > 0) break; // kalau sudah dapat episode, stop
  }
  const info = {};
  $('.infozingle span').each((_, e) => {
    const t = $(e).text();
    if (t.includes(':')) {
      const idx = t.indexOf(':');
      const k = t.substring(0, idx).trim().toLowerCase().replace(/\s+/g, '_');
      const v = t.substring(idx + 1).trim();
      info[k] = v;
    }
  });
  return {
    title: $('.infoanime h1').text().trim() || $('h1').first().text().trim(),
    description: $('.sinopc').text().trim() || '',
    type: info.tipe || 'TV',
    score: info.skor || '',
    status: info.status || '',
    studio: info.studio || '',
    genre: info.genre || '',
    season: info.musim || '',
    year: info.tanggal_tayang || '',
    episodes,
    info,
    streamSource: url,
    source: 'otakudesu'
  };
}

async function scrapeSamehadakuDetail(url) {
  const targetUrl = url.startsWith('http') ? url : `${SAMEHADAKU_URL}${url}`;
  const res = await axios.get(`${PROXY}${targetUrl}`, {
    headers: { ...headers, 'Referer': SAMEHADAKU_URL }, timeout: 20000
  });
  const $ = cheerio.load(res.data);
  const episodes = [];
  // FIX v33: multiple fallback selectors
  const epSelectors = [
    { list: '.lstepsiode ul li', link: '.epsleft .lchx a', date: '.epsleft .date' },
    { list: '.episodelist ul li', link: 'a', date: '.date' },
    { list: '.eps-list ul li', link: 'a', date: '.date' },
    { list: '.list-episode li', link: 'a', date: '' },
  ];
  for (const sel of epSelectors) {
    $(sel.list).each((_, e) => {
      const epUrl = $(e).find(sel.link).attr('href');
      const epTitle = $(e).find(sel.link).text().trim();
      const epDate = sel.date ? $(e).find(sel.date).text().trim() : '';
      if (epUrl && !episodes.find(ep => ep.url === epUrl)) {
        episodes.push({ title: epTitle, url: epUrl, date: epDate });
      }
    });
    if (episodes.length > 0) break;
  }
  const info = {};
  $('.anim-senct .right-senc .spe span').each((_, e) => {
    const t = $(e).text();
    if (t.includes(':')) {
      const idx = t.indexOf(':');
      const k = t.substring(0, idx).trim().toLowerCase().replace(/\s+/g, '_');
      const v = t.substring(idx + 1).trim();
      info[k] = v;
    }
  });
  return {
    title: $('title').text().replace('- Samehadaku', '').replace('Samehadaku', '').trim(),
    description: $('meta[name="description"]').attr('content') || '',
    type: info.tipe || 'TV',
    score: info.skor || '',
    status: info.status || '',
    studio: info.studio || '',
    genre: info.genre || '',
    episodes,
    info,
    streamSource: targetUrl,
    source: 'samehadaku'
  };
}

async function scrapeSamehadakuPagedAnime(page = 1) {
  // Scrape anime list dari halaman terbaru samehadaku (ambil link anime, bukan episode)
  const res = await axios.get(`${PROXY}${SAMEHADAKU_URL}/daftar-anime/page/${page}/`, {
    headers: { ...headers, 'Referer': SAMEHADAKU_URL }, timeout: 20000
  }).catch(() =>
    axios.get(`${PROXY}${SAMEHADAKU_URL}/anime-list/page/${page}/`, {
      headers: { ...headers, 'Referer': SAMEHADAKU_URL }, timeout: 20000
    })
  );
  const $ = cheerio.load(res.data);
  const data = [];
  $('.animpost, .bs .bsx, article.bs').each((_, e) => {
    const title = $(e).find('.tt, h2, .ntitle').first().text().trim();
    const url = $(e).find('a').first().attr('href');
    if (title && url) {
      data.push({ title, titleNorm: normalizeTitle(title), url, source: 'samehadaku' });
    }
  });
  return data;
}

// Cari poster dari Jikan/MAL berdasarkan judul anime
// Dipanggil HANYA setelah episode sudah divalidasi ada
async function fetchMalPoster(title) {
  try {
    const res = await axios.get(
      `https://api.jikan.moe/v4/anime?q=${encodeURIComponent(title)}&limit=1&sfw=true`,
      { timeout: 8000 }
    );
    const anime = res.data?.data?.[0];
    if (!anime) return '';
    return anime.images?.jpg?.large_image_url || anime.images?.jpg?.image_url || '';
  } catch (e) {
    return '';
  }
}

// Fungsi utama: ambil daftar anime dari site, fetch detail + episode sekaligus
// Hanya return yang punya episode valid (> 0)
// Poster diambil dari MAL setelah episode divalidasi ada
async function scrapeAnimeWithEpisodes(source = 'otakudesu_ongoing', page = 1) {
  let animeList = [];

  if (source === 'otakudesu_ongoing') {
    animeList = await scrapeOtakudesuOngoing(page);
  } else if (source === 'otakudesu_complete') {
    animeList = await scrapeOtakudesuComplete(page);
  } else if (source === 'samehadaku') {
    animeList = await scrapeSamehadakuPagedAnime(page);
  }

  const results = [];
  const CONCURRENCY = 6; // FIX v33: naikkan concurrency biar lebih cepat

  for (let i = 0; i < animeList.length; i += CONCURRENCY) {
    const batch = animeList.slice(i, i + CONCURRENCY);
    const batchResults = await Promise.allSettled(batch.map(async (anime) => {
      try {
        let detail;
        if (source.startsWith('otakudesu')) {
          detail = await scrapeOtakudesuDetail(anime.url);
        } else {
          detail = await scrapeSamehadakuDetail(anime.url);
        }

        // Validasi: HANYA simpan kalau ada episode
        if (!detail.episodes || detail.episodes.length === 0) return null;

        // FIX v33: poster MAL non-blocking — tidak tunggu, langsung pakai '' kalau timeout
        const animeTitle = detail.title || anime.title;
        const malPoster = await Promise.race([
          fetchMalPoster(animeTitle),
          new Promise(r => setTimeout(() => r(''), 3000)) // max 3 detik, lanjut kalau lambat
        ]);

        return {
          title: animeTitle,
          titleNorm: normalizeTitle(animeTitle),
          url: anime.url,
          streamSource: detail.streamSource || anime.url,
          image: malPoster,  // poster dari MAL, kosong kalau tidak ketemu
          type: detail.type || 'TV',
          score: detail.score || '',
          status: detail.status || '',
          studio: detail.studio || '',
          genre: detail.genre || '',
          season: detail.season || '',
          year: detail.year || '',
          episode: String(detail.episodes.length),
          description: detail.description || '',
          episodes: detail.episodes,
          info: {
            type: detail.type || 'TV',
            score: detail.score || '',
            status: detail.status || '',
            studio: detail.studio || '',
            genre: detail.genre || '',
            season: detail.season || '',
            year: detail.year || '',
            episode_count: String(detail.episodes.length),
            ...detail.info
          },
          source: detail.source || source,
          healFailed: false,
          healedAt: new Date(),
          lastUpdate: new Date()
        };
      } catch (e) {
        return null;
      }
    }));

    for (const r of batchResults) {
      if (r.status === 'fulfilled' && r.value) results.push(r.value);
    }

    if (i + CONCURRENCY < animeList.length) {
      await new Promise(r => setTimeout(r, 800)); // FIX v33: kurangi delay dari 1500ms ke 800ms
    }
  }

  return results;
}

// Helper: cek apakah type dari sumber scraper cocok dengan MAL type
// Misal: MAL type "OVA" harus dapat hasil scraper yang typenya OVA/Special, bukan TV/Movie
function isTypeCompatible(malType, scraperType) {
  if (!malType || !scraperType) return true; // kalau salah satu kosong, jangan reject
  const mal = malType.toLowerCase();
  const src = scraperType.toLowerCase();
  // OVA: harus dapat OVA atau Special, bukan TV
  if (mal === 'ova') return src.includes('ova') || src.includes('special');
  // Movie: harus dapat movie
  if (mal === 'movie') return src.includes('movie') || src.includes('film');
  // TV: boleh dapat TV, atau kalau scrapernya tidak ada type info
  if (mal === 'tv') return src.includes('tv') || src === '' || src === 'ongoing' || src === 'completed';
  return true;
}

// Helper: dari list hasil search, cari URL yang paling cocok dengan MAL type
function pickBestUrl(results, malType) {
  if (!results || results.length === 0) return null;
  // Prioritas 1: yang typenya match
  const matched = results.find(r => r.url && isTypeCompatible(malType, r.type || ''));
  if (matched) return matched.url;
  // Fallback: ambil pertama (behavior lama)
  return results[0].url || null;
}

// FIX v23: findStreamUrl dengan type-matching — OVA dapat OVA, bukan series utama
async function findStreamUrl(malDoc) {
  const malType = (malDoc.info?.type || malDoc.type || '').toUpperCase(); // e.g. "OVA", "TV", "Movie"
  const rawQueries = [malDoc.titleEnglish, malDoc.title, malDoc.titleJapanese].filter(Boolean);
  const queries = [];
  for (const q of rawQueries) {
    queries.push(q);
    const short = q.replace(/\s*[:(].*$/, '').replace(/\s*season\s*\d+/gi, '').replace(/\s*part\s*\d+/gi, '').trim();
    if (short && short !== q && short.length > 3) queries.push(short);
  }
  const uniqueQueries = [...new Set(queries)];

  for (const q of uniqueQueries) {
    try {
      // FIX: kumpulkan semua hasil dulu, pilih yang typenya cocok
      const allResults = await Promise.allSettled([
        scrapeSamehadakuSearch(q),
        scrapeOtakudesuSearch(q),
        scrapeAnimasuSearch(q),
        axios.get(`${PROXY}${KURONIME_URL}/?s=${encodeURIComponent(q)}`, { headers: { ...headers, 'Referer': KURONIME_URL }, timeout: 12000 })
          .then(res => {
            const $ = cheerio.load(res.data);
            return $('.bsx a, .soralist li a').map((_, el) => ({ url: $(el).attr('href'), type: '' })).get();
          }),
        axios.get(`${PROXY}${NEONIME_URL}/?s=${encodeURIComponent(q)}`, { headers: { ...headers, 'Referer': NEONIME_URL }, timeout: 12000 })
          .then(res => {
            const $ = cheerio.load(res.data);
            return $('.bsx a, article.animpost a').map((_, el) => ({ url: $(el).attr('href'), type: '' })).get();
          }),
      ]);

      // Gabung semua hasil yang berhasil
      const combined = allResults
        .filter(r => r.status === 'fulfilled' && Array.isArray(r.value) && r.value.length > 0)
        .flatMap(r => r.value)
        .filter(r => r?.url);

      const best = pickBestUrl(combined, malType);
      if (best) return best;
    } catch (e) {
      // lanjut ke query berikutnya
    }
  }
  return null;
}

// =====================
// ROUTES
// =====================

app.get('/api/ping', async (req, res) => {
  try { const db = await getDb(); await db.command({ ping: 1 }); res.json({ message: 'MongoDB connected!' }); } catch (e) { res.status(500).json({ error: e.message }); }
});

app.get('/api/latest', async (req, res) => {
  try {
    const db = await getDb();
    // FIX v26: tampil kalau punya episodes (tidak kosong) ATAU punya streamSource
    // Exclude anime yang tidak punya keduanya (hanya poster MAL tanpa stream apapun)
    // FIX v31: hanya tampilkan anime yang BENAR-BENAR punya episodes
    // streamSource saja tidak cukup — bisa saja belum berhasil scrape
    const raw = await db.collection('list_anime').find({
      $or: [
        { episodes: { $exists: true, $not: { $size: 0 } } },
        { streamSource: { $exists: true, $ne: null, $ne: '' } }
      ],
      healFailed: { $ne: true }
    }).sort({ lastUpdate: -1 }).limit(300).toArray();

    // FIX v27: dedup by titleNorm — prioritaskan yang punya episodes terbanyak
    const dedupMap = new Map();
    for (const anime of raw) {
      const key = anime.titleNorm || anime.title?.toLowerCase().replace(/[^a-z0-9]/g, '') || anime.url;
      if (!dedupMap.has(key)) {
        dedupMap.set(key, anime);
      } else {
        const existing = dedupMap.get(key);
        const existingEps = existing.episodes?.length || 0;
        const newEps = anime.episodes?.length || 0;
        if (newEps > existingEps || (!existing.streamSource && anime.streamSource)) {
          dedupMap.set(key, anime);
        }
      }
    }
    const cached = Array.from(dedupMap.values()).slice(0, 100);
    if (cached && cached.length > 0) return res.json(cached);
    res.json([]);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// =====================
// BLACKLIST HELPER
// Type & genre yang diblokir dari Jikan/MAL supaya tidak masuk DB
// =====================
const BLOCKED_TYPES = ['music', 'cm', 'pv', 'special']; // Music video, iklan, promo
const BLOCKED_GENRES = ['kids']; // Genre anak-anak / kartun

function isBlockedAnime(anime) {
  const type = (anime.type || '').toLowerCase();
  const genres = (anime.genres || []).map(g => g.name.toLowerCase());
  if (BLOCKED_TYPES.includes(type)) return true;
  if (genres.some(g => BLOCKED_GENRES.includes(g))) return true;
  return false;
}

async function isBlacklisted(db, url) {
  const doc = await db.collection('blacklist').findOne({ url });
  return !!doc;
}

app.get('/api/search', async (req, res) => {
  const q = req.query.q || '';
  if (!q.trim()) return res.json([]);
  try {
    const db = await getDb();
    const col = db.collection('list_anime');

    // Ambil semua URL yang di-blacklist sekali saja
    const blacklistDocs = await db.collection('blacklist').find({}).toArray();
    const blacklistedUrls = new Set(blacklistDocs.map(d => d.url));
    const blacklistedNorms = new Set(blacklistDocs.map(d => d.titleNorm).filter(Boolean));

    // Fuzzy: "otanari" bisa nemu "otonari"
    const qFuzzy = q.replace(/a/gi, '[ao]').replace(/o/gi, '[oa]').replace(/i/gi, '[ie]').replace(/e/gi, '[ei]');

    const dbResults = (await col.find({
      $and: [
        // Cocok judul (exact atau fuzzy)
        { $or: [
          { title: { $regex: q, $options: 'i' } },
          { title: { $regex: qFuzzy, $options: 'i' } },
          { titleEnglish: { $regex: q, $options: 'i' } },
          { titleEnglish: { $regex: qFuzzy, $options: 'i' } },
          { titleNorm: { $regex: qFuzzy, $options: 'i' } },
          { titleJapanese: { $regex: q, $options: 'i' } },
        ]},
        // FIX v32: tampil kalau punya episodes ATAU streamSource
        { $or: [
          { episodes: { $exists: true, $not: { $size: 0 } } },
          { streamSource: { $exists: true, $ne: null, $ne: '' } }
        ]}
      ]
    }).sort({ lastUpdate: -1 }).limit(50).toArray())
    .filter(r => !blacklistedUrls.has(r.url) && !blacklistedNorms.has(r.titleNorm));

    if (dbResults.length >= 5) return res.json(dbResults);

    let jikanResults = [];
    try {
      const jikanRes = await axios.get(`https://api.jikan.moe/v4/anime?q=${encodeURIComponent(q)}&limit=10&sfw=true`, { timeout: 8000 });
      const animes = jikanRes.data?.data || [];

      // FILTER: skip anime yang typenya music/cm/pv, genre kids, atau sudah di-blacklist
      const filtered = animes.filter(anime => {
        if (isBlockedAnime(anime)) return false;
        const url = `https://myanimelist.net/anime/${anime.mal_id}`;
        if (blacklistedUrls.has(url)) return false;
        const norm = normalizeTitle(anime.title_indonesian || anime.title);
        if (blacklistedNorms.has(norm)) return false;
        return true;
      });

      jikanResults = filtered.map(anime => ({
        title: anime.title_indonesian || anime.title,
        titleNorm: normalizeTitle(anime.title_indonesian || anime.title),
        titleEnglish: anime.title_english || anime.title,
        titleJapanese: anime.title_japanese || '',
        url: `https://myanimelist.net/anime/${anime.mal_id}`,
        malId: anime.mal_id,
        image: anime.images?.jpg?.large_image_url || anime.images?.jpg?.image_url || '',
        type: anime.type || '',
        score: anime.score ? String(anime.score) : '',
        episode: anime.episodes ? String(anime.episodes) : 'Ongoing',
        description: anime.synopsis || '',
        info: {
          score: anime.score ? String(anime.score) : '',
          type: anime.type || '',
          status: anime.status || '',
          season: anime.season || '',
          year: anime.year ? String(anime.year) : '',
          studio: anime.studios?.[0]?.name || '',
          genre: anime.genres?.map(g => g.name).join(', ') || ''
        },
        source: 'myanimelist',
        lastUpdate: new Date()
      }));

      // Upsert ke DB hanya yang lolos filter
      // Key utama = url (MAL URL unik per anime), bukan titleNorm (bisa bentrok judul beda)
      // Kalau sudah ada entry dari scraper Indo (bukan myanimelist), jangan overwrite
      await Promise.allSettled(jikanResults.map(async item => {
        const existing = await col.findOne({ url: item.url });
        // Kalau sudah ada dari scraper Indo dan punya stream, skip — jangan overwrite
        if (existing && existing.source !== 'myanimelist' && (existing.streamSource || (existing.episodes && existing.episodes.length > 0))) return;
        // Kalau ada duplikat titleNorm dengan url beda (judul mirip), merge ke yang sudah ada
        const dupByNorm = await col.findOne({ titleNorm: item.titleNorm, url: { $ne: item.url } });
        if (dupByNorm && dupByNorm.source !== 'myanimelist') {
          // Sudah ada dari scraper Indo, update image-nya saja kalau kosong
          if (!dupByNorm.image && item.image) {
            await col.updateOne({ _id: dupByNorm._id }, { $set: { image: item.image, malId: item.malId } });
          }
          return;
        }
        await col.updateOne(
          { url: item.url },
          { $set: item, $unset: { thumbnail: '', poster: '', cover: '' } },
          { upsert: true }
        );
      }));
    } catch (e) {}

    // FIX v31: hanya tampilkan dari Jikan kalau sudah ada di DB dengan stream
    // Jikan dipakai untuk upsert ke DB saja (untuk di-heal nanti), bukan langsung ditampilkan ke user
    const dbUrls = new Set(dbResults.map(r => r.url));

    // Filter jikanResults: hanya tampilkan kalau sudah ada di DB dan punya stream
    const jikanToShow = jikanResults.filter(r => {
      if (dbUrls.has(r.url)) return false; // sudah ada di dbResults, skip
      // Cek apakah ada di DB dengan stream (hasil upsert di atas)
      return false; // Jangan tampilkan hasil Jikan langsung — tunggu sampai stream ketemu
    });

    const allResults = [...dbResults]; // hanya dari DB yang sudah punya stream

    const dedupMap = new Map();
    for (const anime of allResults) {
      const key = anime.titleNorm || anime.title?.toLowerCase().replace(/[^a-z0-9]/g, '') || anime.url;
      if (!dedupMap.has(key)) {
        dedupMap.set(key, anime);
      } else {
        const existing = dedupMap.get(key);
        const existingEps = existing.episodes?.length || 0;
        const newEps = anime.episodes?.length || 0;
        const existingHasStream = !!(existing.streamSource);
        const newHasStream = !!(anime.streamSource);
        if (newEps > existingEps || (!existingHasStream && newHasStream)) {
          dedupMap.set(key, anime);
        }
      }
    }
    const merged = Array.from(dedupMap.values());
    return res.json(merged);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.get('/api/genre', async (req, res) => {
  const genre = req.query.name || '';
  try {
    const db = await getDb();
    // FIX v31: wajib punya episodes
    const results = await db.collection('list_anime').find({
      'info.genre': { $regex: genre, $options: 'i' },
      $or: [
        { episodes: { $exists: true, $not: { $size: 0 } } },
        { streamSource: { $exists: true, $ne: null, $ne: '' } }
      ],
      healFailed: { $ne: true }
    }).sort({ lastUpdate: -1 }).limit(50).toArray();
    return res.json(results);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.get('/api/top-anime', async (req, res) => {
  try {
    const db = await getDb();
    const col = db.collection('list_anime');
    // Filter: hanya tampil yang punya stream + punya score
    // FIX v26: tampil kalau punya episodes atau streamSource
    // FIX v31: wajib punya episodes
    const streamFilter = {
      $or: [
        { episodes: { $exists: true, $not: { $size: 0 } } },
        { streamSource: { $exists: true, $ne: null, $ne: '' } }
      ],
      healFailed: { $ne: true }
    };
    let data = await col.find({ ...streamFilter, score: { $exists: true, $ne: '', $ne: '0' } }).sort({ score: -1 }).limit(30).toArray();
    if (data.length === 0) { data = await col.find(streamFilter).sort({ lastUpdate: -1 }).limit(30).toArray(); }
    res.json(data);
  } catch (e) { res.json([]); }
});

app.get('/api/detail', async (req, res) => {
  try {
    const url = req.query.url;

    if (!url.includes('myanimelist.net')) {
      const data = await scrapeDetailFull(url);
      return res.json(data);
    }

    const db = await getDb();
    const malDoc = await db.collection('list_anime').findOne({ url: url });

    const isNeedHeal = malDoc && needsHealing(malDoc) && !malDoc.healFailed;

    let streamUrl = malDoc?.streamSource || null;
    let episodes = [];
    let streamInfo = {};

    if (streamUrl) {
      try {
        const scraped = await scrapeDetailEpisodesOnly(streamUrl);
        episodes = scraped.episodes || [];
        streamInfo = scraped.info || {};
      } catch (e) {
        streamUrl = null;
      }

      if (episodes.length === 0 && malDoc?.episodes?.length > 0) {
        episodes = malDoc.episodes;
      }

      if (episodes.length === 0 && !streamUrl) {
        try {
          streamUrl = await findStreamUrl(malDoc);
          if (streamUrl) {
            const scraped2 = await scrapeDetailEpisodesOnly(streamUrl);
            episodes = scraped2.episodes || [];
            streamInfo = scraped2.info || {};
            setImmediate(async () => {
              try { await db.collection('list_anime').updateOne({ url: malDoc.url }, { $set: { streamSource: streamUrl, episodes, healFailed: false, healedAt: new Date() } }); } catch (e2) {}
            });
          }
        } catch (e) {}
      }
    } else if (malDoc) {
      try {
        streamUrl = await findStreamUrl(malDoc);
        if (streamUrl) {
          const scraped = await scrapeDetailEpisodesOnly(streamUrl);
          episodes = scraped.episodes || [];
          streamInfo = scraped.info || {};

          const episodeStr = episodes.length > 0 ? String(episodes.length) : (malDoc.episode || '0');
          setImmediate(async () => {
            try {
              const updatePayload = {
                streamSource: streamUrl,
                healedAt: new Date(),
                healFailed: false,
                episodes: episodes || []
              };
              if (episodes.length > 0) {
                updatePayload.episode = episodeStr;
                updatePayload['info.episode_count'] = episodeStr;
              }
              if (streamInfo?.studio) updatePayload['info.studio'] = streamInfo.studio;
              if (streamInfo?.status)  updatePayload['info.status']  = streamInfo.status;
              await db.collection('list_anime').updateOne(
                { url: url },
                { $set: updatePayload }
              );
            } catch (e) {}
          });
        }
      } catch (e) {}

      if (!streamUrl && isNeedHeal) {
        healInBackground(db, malDoc);
      }
    }

    const result = {
      // FIX v24: kalau ada streamSource, title & image diambil dari sumber video (scraper)
      // bukan dari MAL — supaya nama & poster sesuai dengan isi video yang ditampilkan
      title: (streamUrl && streamInfo?.title) ? streamInfo.title : (malDoc?.title || ''),
      image: (streamUrl && streamInfo?.image) ? streamInfo.image : (malDoc?.image || ''),
      description: malDoc?.description || '',
      score: malDoc?.score || '',
      info: {
        ...(streamInfo || {}),
        score: malDoc?.info?.score || streamInfo?.skor || '',
        type: malDoc?.info?.type || streamInfo?.tipe || 'TV',
        status: malDoc?.info?.status || '',
        season: malDoc?.info?.season || streamInfo?.musim || '',
        year: malDoc?.info?.year || streamInfo?.dirilis || '',
        studio: malDoc?.info?.studio || streamInfo?.studio || '',
        genre: malDoc?.info?.genre || '',
      },
      episodes,
      streamSource: streamUrl || null,
      healing: isNeedHeal && episodes.length === 0 ? true : false,
    };
    res.json(result);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.get('/api/watch', async (req, res) => {
  try {
    const url = req.query.url;
    if (!url) return res.status(400).json({ error: 'url required' });
    const db = await getDb();
    const col = db.collection('watch_cache');
    // FIX: cache TTL dikurangin dari 6 jam jadi 2 jam
    const CACHE_TTL_HOURS = 2;
    const cached = await col.findOne({ url });
    if (cached) {
      const ageHours = (Date.now() - new Date(cached.cachedAt).getTime()) / 3600000;
      // Skip cache lama yang cuma punya 3 stream (hasil slot lama) atau sudah expired
      if (ageHours < CACHE_TTL_HOURS && cached.streams && cached.streams.length > 3) {
        return res.json({ ...cached.data, fromCache: true });
      }
      // Hapus cache lama yang cuma 3 stream supaya scrape ulang
      if (cached.streams && cached.streams.length <= 3) {
        await col.deleteOne({ url }).catch(() => {});
      }
    }
    const data = await scrapeWatch(url);

    // FIX: fallback lebih agresif — kalau kosong, langsung coba scrapeWatchByTitle dari semua source
    if (!data.streams || data.streams.length === 0) {
      const animeTitle = req.query.title || '';
      const epNumber = req.query.ep || '';
      if (animeTitle) {
        try {
          const fallback = await scrapeWatchByTitle(animeTitle, epNumber, null);
          if (fallback.streams && fallback.streams.length > 0) {
            data.streams = fallback.streams;
            data.title = data.title || fallback.title;
            await col.deleteOne({ url }).catch(() => {});
          }
        } catch (e2) {}
      }
    }

    if (data.streams && data.streams.length > 0) {
      await col.updateOne({ url }, { $set: { url, data, streams: data.streams, cachedAt: new Date() } }, { upsert: true });
    }
    res.json(data);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.get('/api/watch-cache-clear', async (req, res) => {
  try {
    const url = req.query.url;
    const db = await getDb();
    const col = db.collection('watch_cache');
    if (url) { await col.deleteOne({ url }); res.json({ message: 'Cache episode dihapus, akan scrape ulang.' }); } else { await col.deleteMany({}); res.json({ message: 'Semua cache watch dihapus.' }); }
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.get('/api/scrape-all', async (req, res) => {
  // source: otakudesu_ongoing | otakudesu_complete | samehadaku | all (default: all)
  // pages: jumlah halaman per source (default: 5)
  const totalPages = parseInt(req.query.pages) || 5;
  const sourceParam = req.query.source || 'all';
  const sources = sourceParam === 'all'
    ? ['otakudesu_ongoing', 'otakudesu_complete', 'samehadaku']
    : [sourceParam];

  try {
    const db = await getDb();
    const col = db.collection('list_anime');
    let totalSaved = 0;
    const errors = [];
    const stats = {};

    for (const source of sources) {
      stats[source] = { saved: 0, skipped: 0 };
      for (let page = 1; page <= totalPages; page++) {
        try {
          // scrapeAnimeWithEpisodes langsung ambil detail + episode sekaligus
          // Sudah validasi: hanya return anime yang punya episode
          const data = await scrapeAnimeWithEpisodes(source, page);
          if (!data || data.length === 0) break;

          const saved = await saveToDb(col, data, db);
          totalSaved += saved;
          stats[source].saved += saved;
          stats[source].skipped += (data.length - saved);

          if (page < totalPages) await new Promise(r => setTimeout(r, 1000)); // FIX v33: dari 2000ms
        } catch (pageErr) {
          const msg = `[${source}] Page ${page}: ${pageErr.message}`;
          errors.push(msg);
          await new Promise(r => setTimeout(r, 1500)); // FIX v33: dari 3000ms
        }
      }
      // Jeda antar source
      if (sources.indexOf(source) < sources.length - 1) {
        await new Promise(r => setTimeout(r, 1500)); // FIX v33: dari 3000ms
      }
    }

    res.json({
      message: `Selesai! ${totalSaved} anime tersimpan (sudah validasi episode, tanpa gambar).`,
      total: totalSaved,
      perSource: stats,
      errors: errors.length ? errors : undefined
    });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.get('/api/clear-db', async (req, res) => {
  try { const db = await getDb(); await db.collection('list_anime').deleteMany({}); res.json({ message: 'Database berhasil dikosongkan!' }); } catch (e) { res.status(500).json({ error: e.message }); }
});

// =====================
// DELETE + BLACKLIST — hapus anime dari DB dan tandai supaya tidak balik lagi
// Pakai: /api/delete?url=...
// =====================
// Set stream manual untuk anime yang lo tambah sendiri
// Pakai: /api/set-stream?url=<mal_url>&stream=<stream_url>
// Contoh: /api/set-stream?url=https://myanimelist.net/anime/56876&stream=https://otakudesu.cloud/anime/otonari-s2/
app.get('/api/set-stream', async (req, res) => {
  const { url, stream } = req.query;
  if (!url || !stream) return res.status(400).json({ error: 'url dan stream wajib diisi' });
  try {
    const db = await getDb();
    const col = db.collection('list_anime');

    const doc = await col.findOne({ url });
    if (!doc) return res.status(404).json({ error: 'Anime tidak ditemukan di DB. Cari dulu lewat /api/search?q=judulnya supaya masuk DB.' });

    // Scrape episodes dari stream URL yang dikasih
    let episodes = [];
    let streamInfo = {};
    try {
      const scraped = await scrapeDetailEpisodesOnly(stream);
      episodes = scraped.episodes || [];
      streamInfo = scraped.info || {};
    } catch(e) {}

    const updatePayload = {
      streamSource: stream,
      healFailed: false,
      healedAt: new Date(),
      lastUpdate: new Date(),
    };
    if (episodes.length > 0) {
      updatePayload.episodes = episodes;
      updatePayload.episode = String(episodes.length);
      updatePayload['info.episode_count'] = String(episodes.length);
    }
    if (streamInfo.studio) updatePayload['info.studio'] = streamInfo.studio;
    if (streamInfo.status) updatePayload['info.status'] = streamInfo.status;

    await col.updateOne({ url }, { $set: updatePayload });

    res.json({
      message: `Stream berhasil di-set untuk "${doc.title}"!`,
      episodesFound: episodes.length,
      streamSource: stream
    });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.get('/api/delete', async (req, res) => {
  const { url } = req.query;
  if (!url) return res.status(400).json({ error: 'url required' });
  try {
    const db = await getDb();
    const col = db.collection('list_anime');

    // Cari dokumen dulu supaya bisa ambil titleNorm-nya
    const doc = await col.findOne({ url });
    if (!doc) return res.status(404).json({ error: 'Anime tidak ditemukan di DB' });

    // Hapus dari list_anime
    await col.deleteOne({ url });

    // Masukkan ke blacklist supaya tidak balik lewat search/scrape
    await db.collection('blacklist').updateOne(
      { url },
      { $set: { url, titleNorm: doc.titleNorm || '', title: doc.title || '', deletedAt: new Date() } },
      { upsert: true }
    );

    res.json({ message: `Anime "${doc.title}" berhasil dihapus dan di-blacklist. Tidak akan muncul lagi!` });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// Lihat daftar blacklist
app.get('/api/blacklist', async (req, res) => {
  try {
    const db = await getDb();
    const list = await db.collection('blacklist').find().sort({ deletedAt: -1 }).toArray();
    res.json({ count: list.length, list });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// Hapus dari blacklist (restore)
app.get('/api/blacklist-remove', async (req, res) => {
  const { url } = req.query;
  if (!url) return res.status(400).json({ error: 'url required' });
  try {
    const db = await getDb();
    await db.collection('blacklist').deleteOne({ url });
    res.json({ message: 'Anime berhasil dihapus dari blacklist. Bisa muncul lagi sekarang.' });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// Hapus field gambar dari scraper (thumbnail, poster, cover) — image dari MAL tetap
app.get('/api/clean-images', async (req, res) => {
  try {
    const db = await getDb();
    const result = await db.collection('list_anime').updateMany(
      {},
      { $unset: { thumbnail: '', poster: '', cover: '' } }
    );
    res.json({ message: `Berhasil bersihkan field scraper dari ${result.modifiedCount} dokumen. Field image (MAL poster) tetap ada.` });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// Hapus semua anime dari MAL yang tidak punya stream sama sekali + deduplikasi judul mirip
app.get('/api/cleanup-no-stream', async (req, res) => {
  try {
    const db = await getDb();
    const col = db.collection('list_anime');

    // 1. Hapus anime dari MAL yang tidak punya stream dan tidak punya episode
    const deleteResult = await col.deleteMany({
      source: 'myanimelist',
      streamSource: { $exists: false },
      $or: [
        { episodes: { $exists: false } },
        { episodes: { $size: 0 } },
        { episodes: null }
      ]
    });

    // 2. Deduplikasi: cari titleNorm yang sama, hapus yang dari MAL kalau ada duplikat dari scraper
    const allAnime = await col.find({}).toArray();
    const normMap = {};
    for (const anime of allAnime) {
      const key = anime.titleNorm;
      if (!key) continue;
      if (!normMap[key]) { normMap[key] = []; }
      normMap[key].push(anime);
    }

    let dupDeleted = 0;
    for (const [norm, docs] of Object.entries(normMap)) {
      if (docs.length <= 1) continue;
      // Prioritas: scraper Indo > MAL. Kalau ada dari Indo, hapus yang MAL
      const fromIndo = docs.filter(d => d.source !== 'myanimelist' && (d.streamSource || (d.episodes && d.episodes.length > 0)));
      const fromMal  = docs.filter(d => d.source === 'myanimelist');
      if (fromIndo.length > 0 && fromMal.length > 0) {
        // Update MAL entry: kasih image ke Indo kalau kosong, lalu hapus MAL
        for (const malDoc of fromMal) {
          const indoDoc = fromIndo[0];
          if (!indoDoc.image && malDoc.image) {
            await col.updateOne({ _id: indoDoc._id }, { $set: { image: malDoc.image, malId: malDoc.malId } });
          }
          await col.deleteOne({ _id: malDoc._id });
          dupDeleted++;
        }
      }
    }

    res.json({
      message: `Berhasil cleanup! ${deleteResult.deletedCount} anime tanpa stream dihapus, ${dupDeleted} duplikat dihapus.`,
      noStreamDeleted: deleteResult.deletedCount,
      dupDeleted
    });
  } catch (e) { res.status(500).json({ error: e.message }); }
});


// Blacklist semua anime yang tidak punya episode (bulk blacklist)
app.get('/api/blacklist-no-stream', async (req, res) => {
  try {
    const db = await getDb();
    const col = db.collection('list_anime');
    const blacklistCol = db.collection('blacklist');

    // Cari semua anime yang tidak punya streamSource atau episodes kosong
    const noStreamAnime = await col.find({
      $and: [
        {
          $or: [
            { streamSource: { $exists: false } },
            { streamSource: null },
            { streamSource: '' }
          ]
        },
        {
          $or: [
            { episodes: { $exists: false } },
            { episodes: { $size: 0 } },
            { episodes: null }
          ]
        }
      ]
    }).toArray();

    if (noStreamAnime.length === 0) {
      return res.json({ message: 'Tidak ada anime tanpa episode yang perlu di-blacklist.', count: 0 });
    }

    // Bulk blacklist semua
    const blacklistOps = noStreamAnime.map(doc => ({
      updateOne: {
        filter: { url: doc.url },
        update: { $set: { url: doc.url, titleNorm: doc.titleNorm || '', title: doc.title || '', deletedAt: new Date() } },
        upsert: true
      }
    }));
    await blacklistCol.bulkWrite(blacklistOps);

    // Hapus semua dari list_anime
    const urls = noStreamAnime.map(d => d.url);
    const deleteResult = await col.deleteMany({ url: { $in: urls } });

    res.json({
      message: `Berhasil blacklist & hapus ${deleteResult.deletedCount} anime yang tidak punya episode. Tidak akan muncul lagi!`,
      count: deleteResult.deletedCount,
      titles: noStreamAnime.slice(0, 20).map(d => d.title) // preview 20 pertama
    });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.get('/api/heal-empty', async (req, res) => {
  const limit = parseInt(req.query.limit) || 20;
  const skipFailed = req.query.skip_failed !== 'false'; 

  try {
    const db = await getDb();
    const query = {
      $or: [
        { episodes: { $exists: false } },
        { episodes: { $size: 0 } },
        { episodes: null }
      ]
    };
    if (skipFailed) query.healFailed = { $ne: true };

    const emptyAnimes = await db.collection('list_anime')
      .find(query)
      .sort({ lastUpdate: -1 })
      .limit(limit)
      .toArray();

    if (emptyAnimes.length === 0) {
      return res.json({ message: 'Tidak ada anime kosong yang perlu di-heal! 🎉', count: 0 });
    }

    const healJobId = `heal_${Date.now()}`;
    await db.collection('heal_jobs').insertOne({
      jobId: healJobId,
      total: emptyAnimes.length,
      healed: 0,
      failed: 0,
      status: 'running',
      startedAt: new Date(),
    });

    setImmediate(async () => {
      let healed = 0, failed = 0;
      const CONCURRENCY = 6; // FIX v33: naikkan dari 3 ke 6

      for (let i = 0; i < emptyAnimes.length; i += CONCURRENCY) {
        const batch = emptyAnimes.slice(i, i + CONCURRENCY);
        const results = await Promise.allSettled(
          batch.map(doc => healAnime(db, doc))
        );
        for (const r of results) {
          if (r.status === 'fulfilled' && r.value?.healed) healed++;
          else failed++;
        }
        await db.collection('heal_jobs').updateOne({ jobId: healJobId }, { $set: { healed, failed, lastUpdate: new Date() } }).catch(() => {});
        if (i + CONCURRENCY < emptyAnimes.length) { await new Promise(r => setTimeout(r, 1000)); } // FIX v33: kurangi delay dari 2000ms
      }

      await db.collection('heal_jobs').updateOne({ jobId: healJobId }, { $set: { status: 'done', healed, failed, finishedAt: new Date() } }).catch(() => {});
    });

    res.json({ message: `🔧 Healing dimulai untuk ${emptyAnimes.length} anime!`, jobId: healJobId, count: emptyAnimes.length, tip: `Pantau progress di /api/heal-status?jobId=${healJobId}` });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.get('/api/heal-status', async (req, res) => {
  try {
    const db = await getDb();
    const { jobId } = req.query;

    if (jobId) {
      const job = await db.collection('heal_jobs').findOne({ jobId });
      if (!job) return res.status(404).json({ error: 'Job tidak ditemukan' });
      return res.json(job);
    }

    const jobs = await db.collection('heal_jobs').find().sort({ startedAt: -1 }).limit(10).toArray();

    const totalAnime   = await db.collection('list_anime').countDocuments();
    const emptyEpisode = await db.collection('list_anime').countDocuments({ $or: [{ episodes: { $exists: false } }, { episodes: { $size: 0 } }, { episodes: null }] });
    const healedAnime  = await db.collection('list_anime').countDocuments({ streamSource: { $exists: true, $ne: null } });
    const failedAnime  = await db.collection('list_anime').countDocuments({ healFailed: true });
    const inProgress   = healingInProgress.size;

    res.json({ stats: { totalAnime, emptyEpisode, healedAnime, failedAnime, inProgress }, recentJobs: jobs });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.get('/api/heal-single', async (req, res) => {
  const { url } = req.query;
  if (!url) return res.status(400).json({ error: 'url required' });
  try {
    const db = await getDb();
    const malDoc = await db.collection('list_anime').findOne({ url });
    if (!malDoc) return res.status(404).json({ error: 'Anime tidak ditemukan di DB' });
    await db.collection('list_anime').updateOne({ url }, { $unset: { healFailed: '', healAttemptAt: '' } });
    const result = await healAnime(db, { ...malDoc, healFailed: false });
    res.json({ url, ...result });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.get('/api/heal-reset-failed', async (req, res) => {
  try {
    const db = await getDb();
    const result = await db.collection('list_anime').updateMany({ healFailed: true }, { $unset: { healFailed: '', healAttemptAt: '' } });
    res.json({ message: `Reset ${result.modifiedCount} anime yang sebelumnya gagal. Siap di-heal ulang!` });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// FIX: Endpoint baru — reset SEMUA anime (termasuk yang gagal) lalu heal ulang semuanya sekaligus
app.get('/api/heal-force', async (req, res) => {
  const limit = parseInt(req.query.limit) || 50;
  try {
    const db = await getDb();
    const col = db.collection('list_anime');

    // Reset semua flag healFailed dulu
    await col.updateMany({ healFailed: true }, { $unset: { healFailed: '', healAttemptAt: '', streamSource: '' } });

    // Ambil semua anime yang masih kosong episode-nya (termasuk yang sebelumnya failed)
    const emptyAnimes = await col.find({
      $or: [
        { episodes: { $exists: false } },
        { episodes: { $size: 0 } },
        { episodes: null }
      ]
    }).sort({ lastUpdate: -1 }).limit(limit).toArray();

    if (emptyAnimes.length === 0) {
      return res.json({ message: 'Semua anime sudah punya episode! Tidak ada yang perlu di-heal.', count: 0 });
    }

    // Hapus juga semua watch cache yang expired/rusak biar player bisa fresh scrape ulang
    await db.collection('watch_cache').deleteMany({});

    const healJobId = `healforce_${Date.now()}`;
    await db.collection('heal_jobs').insertOne({
      jobId: healJobId,
      total: emptyAnimes.length,
      healed: 0,
      failed: 0,
      status: 'running',
      startedAt: new Date(),
      type: 'force',
    });

    setImmediate(async () => {
      let healed = 0, failed = 0;
      const CONCURRENCY = 5; // lebih agresif dari heal biasa

      for (let i = 0; i < emptyAnimes.length; i += CONCURRENCY) {
        const batch = emptyAnimes.slice(i, i + CONCURRENCY);
        const results = await Promise.allSettled(
          batch.map(doc => healAnime(db, { ...doc, healFailed: false }))
        );
        for (const r of results) {
          if (r.status === 'fulfilled' && r.value?.healed) healed++;
          else failed++;
        }
        await db.collection('heal_jobs').updateOne({ jobId: healJobId }, { $set: { healed, failed, lastUpdate: new Date() } }).catch(() => {});
        if (i + CONCURRENCY < emptyAnimes.length) await new Promise(r => setTimeout(r, 1500));
      }

      await db.collection('heal_jobs').updateOne({ jobId: healJobId }, { $set: { status: 'done', healed, failed, finishedAt: new Date() } }).catch(() => {});
    });

    res.json({
      message: `🚀 Force heal dimulai untuk ${emptyAnimes.length} anime! Watch cache juga sudah dibersihkan.`,
      jobId: healJobId,
      count: emptyAnimes.length,
      tip: `Pantau progress di /api/heal-status?jobId=${healJobId}`
    });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// =====================
// FIX v33: Endpoint debug — cek hasil scrape langsung tanpa DB (untuk troubleshoot selector)
// Pakai: /api/debug-scrape?url=https://otakudesu.cloud/anime/judul-anime/
// =====================
app.get('/api/debug-scrape', async (req, res) => {
  const { url } = req.query;
  if (!url) return res.status(400).json({ error: 'url required' });
  try {
    let result;
    if (url.includes('otakudesu')) {
      result = await scrapeOtakudesuDetail(url);
    } else if (url.includes('samehadaku')) {
      result = await scrapeSamehadakuDetail(url);
    } else if (url.includes('animasu')) {
      result = await scrapeDetailAnimasuEpisodesOnly(url);
    } else {
      return res.status(400).json({ error: 'URL tidak dikenal. Pakai otakudesu/samehadaku/animasu' });
    }
    res.json({
      episodeCount: result.episodes?.length || 0,
      firstEp: result.episodes?.[0] || null,
      lastEp: result.episodes?.[result.episodes?.length - 1] || null,
      title: result.title,
      image: result.image || result.info?.image || '',
      info: result.info,
      rawEpisodes: result.episodes?.slice(0, 5) // preview 5 episode pertama
    });
  } catch (e) {
    res.status(500).json({ error: e.message, stack: e.stack?.split('\n').slice(0, 5) });
  }
});

// =====================
// FIX v33: Scrape cepat langsung dari satu URL detail anime (tanpa looping halaman)
// Berguna untuk tambah anime satu-satu dengan episodenya langsung
// Pakai: /api/scrape-url?url=https://otakudesu.cloud/anime/judul/
// =====================
app.get('/api/scrape-url', async (req, res) => {
  const { url } = req.query;
  if (!url) return res.status(400).json({ error: 'url required' });
  try {
    const db = await getDb();
    const col = db.collection('list_anime');

    let detail;
    if (url.includes('otakudesu')) {
      detail = await scrapeOtakudesuDetail(url);
    } else if (url.includes('samehadaku')) {
      detail = await scrapeSamehadakuDetail(url);
    } else if (url.includes('animasu')) {
      const scraped = await scrapeDetailAnimasuEpisodesOnly(url);
      detail = { ...scraped, streamSource: url, source: 'animasu' };
    } else {
      return res.status(400).json({ error: 'URL tidak dikenal. Pakai otakudesu/samehadaku/animasu' });
    }

    if (!detail.episodes || detail.episodes.length === 0) {
      return res.status(422).json({ error: 'Episode tidak ditemukan di URL ini. Cek /api/debug-scrape?url=' + url });
    }

    const animeTitle = detail.title;
    // Non-blocking MAL poster
    const malPoster = await Promise.race([
      fetchMalPoster(animeTitle),
      new Promise(r => setTimeout(() => r(''), 3000))
    ]);

    const item = {
      title: animeTitle,
      titleNorm: normalizeTitle(animeTitle),
      url: url,
      streamSource: detail.streamSource || url,
      image: malPoster || detail.info?.image || '',
      type: detail.type || 'TV',
      score: detail.score || '',
      status: detail.status || '',
      studio: detail.studio || '',
      genre: detail.genre || '',
      season: detail.season || '',
      year: detail.year || '',
      episode: String(detail.episodes.length),
      description: detail.description || '',
      episodes: detail.episodes,
      info: {
        type: detail.type || 'TV',
        score: detail.score || '',
        status: detail.status || '',
        studio: detail.studio || '',
        genre: detail.genre || '',
        season: detail.season || '',
        year: detail.year || '',
        episode_count: String(detail.episodes.length),
        ...detail.info
      },
      source: detail.source || (url.includes('otakudesu') ? 'otakudesu' : url.includes('samehadaku') ? 'samehadaku' : 'animasu'),
      healFailed: false,
      healedAt: new Date(),
      lastUpdate: new Date()
    };

    await col.updateOne(
      { titleNorm: item.titleNorm },
      { $set: item },
      { upsert: true }
    );

    res.json({
      message: `✅ Berhasil scrape "${animeTitle}" dengan ${detail.episodes.length} episode!`,
      episodeCount: detail.episodes.length,
      image: item.image ? 'ada' : 'kosong (MAL tidak ketemu)',
      streamSource: url
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
module.exports = app;
