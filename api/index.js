const express  = require('express');
const axios    = require('axios');
const cheerio  = require('cheerio');
const cors     = require('cors');
const mongoose = require('mongoose');

const app = express();
app.use(cors());
app.use(express.json());
// Static files served by Vercel CDN (@vercel/static in vercel.json)
// app.use(express.static('public'));

// =============================================
// MONGODB CONNECTION
// =============================================
let isConnected = false;
async function connectDB() {
  if (isConnected) return;
  if (!process.env.MONGODB_URI) throw new Error('MONGODB_URI not set');
  await mongoose.connect(process.env.MONGODB_URI, {
    serverSelectionTimeoutMS: 8000,
    socketTimeoutMS: 15000,
  });
  isConnected = true;
  console.log('[DB] MongoDB connected');
}

// =============================================
// SCHEMAS
// =============================================
const AnimeSchema = new mongoose.Schema({
  url:             { type: String, unique: true, index: true },
  title:           { type: String, index: true },
  titleEnglish:    String,
  titleJapanese:   String,
  titleNorm:       { type: String, index: true },
  image:           String,
  description:     String,
  score:           String,
  rank:            Number,
  popularity:      Number,
  scoredBy:        Number,
  rating:          String,
  trailerUrl:      String,
  anilistId:       { type: Number, index: true },
  anilistEnriched: { type: Boolean, default: false },
  info: {
    tipe:          String,
    status:        { type: String, index: true },
    season:        String,
    year:          String,
    aired:         String,
    studio:        String,
    producer:      String,
    source:        String,
    genre:         { type: String, index: true },
    theme:         String,
    demographic:   String,
    duration:      String,
    rating:        String,
    episode_count: String,
  },
  episodes:     { type: Array, default: [] },
  streamSource: String,
  updatedAt:    { type: Date, default: Date.now, index: true },
}, { collection: 'animedetails' });

AnimeSchema.index({ title: 'text', titleEnglish: 'text', titleJapanese: 'text' });

const WatchSchema = new mongoose.Schema({
  url:       { type: String, unique: true, index: true },
  title:     String,
  streams:   { type: Array, default: [] },
  updatedAt: { type: Date, default: Date.now, index: true },
}, { collection: 'watches' });

const LatestSchema = new mongoose.Schema({
  _id:       { type: String, default: 'latest' },
  data:      { type: Array, default: [] },
  updatedAt: { type: Date, default: Date.now },
}, { collection: 'latestcaches' });

const Anime  = mongoose.model('AnimeDetail', AnimeSchema);
const Watch  = mongoose.model('Watch', WatchSchema);
const Latest = mongoose.model('LatestCache', LatestSchema);

const WATCH_TTL  = 2 * 60 * 60 * 1000;
const LATEST_TTL = 5 * 60 * 1000;

let _memLatest = null, _memLatestTs = 0;
let _memTop    = null, _memTopTs    = 0;
const MEM_TTL  = 3 * 60 * 1000;

// =============================================
// GOGOANIME CONFIG
// =============================================
const KURO_DOMAINS = [
  'https://anitaku.pe',
  'https://gogoanime3.co',
  'https://gogoanime.tel',
  'https://gogoanime.by',
];

const HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
  'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
  'Accept-Language': 'id-ID,id;q=0.9,en-US;q=0.8,en;q=0.7',
  'Accept-Encoding': 'gzip, deflate, br',
  'Cache-Control': 'no-cache',
  'Pragma': 'no-cache',
  'Sec-Ch-Ua': '"Chromium";v="124", "Google Chrome";v="124", "Not-A.Brand";v="99"',
  'Sec-Ch-Ua-Mobile': '?0',
  'Sec-Ch-Ua-Platform': '"Windows"',
  'Sec-Fetch-Dest': 'document',
  'Sec-Fetch-Mode': 'navigate',
  'Sec-Fetch-Site': 'none',
  'Sec-Fetch-User': '?1',
  'Upgrade-Insecure-Requests': '1',
  'Connection': 'keep-alive',
};

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

function normalizeTitle(title) {
  return (title || '').toLowerCase()
    .replace(/subtitle\s*indonesia/gi,'').replace(/sub\s*indo/gi,'')
    .replace(/\s*-\s*episode\s*\d+.*/gi,'').replace(/\s*episode\s*\d+.*/gi,'')
    .replace(/[^a-z0-9\s]/gi,'').replace(/\s+/g,' ').trim();
}

let _activeBase = KURO_DOMAINS[0];

function formatAnime(d) {
  if (d.toObject) d = d.toObject();
  return {
    _id: d._id, url: d.url,
    title: d.title, titleEnglish: d.titleEnglish||d.title,
    titleJapanese: d.titleJapanese||'', titleNorm: d.titleNorm||'',
    image: d.image||'', description: d.description||'',
    score: d.score||'', rank: d.rank||null, popularity: d.popularity||null,
    rating: d.rating||'', trailerUrl: d.trailerUrl||'',
    anilistId: d.anilistId||null, anilistEnriched: d.anilistEnriched||false,
    info: d.info||{}, episodes: d.episodes||[], streamSource: d.streamSource||d.url,
    updatedAt: d.updatedAt, source: 'mongodb',
  };
}

// =============================================
// SCRAPERS — GOGOANIME
// =============================================

// Konversi judul anime jadi slug gogoanime
function toGogoSlug(title) {
  return (title||'').toLowerCase()
    .replace(/sub\s*indo/gi,'').replace(/subtitle\s*indonesia/gi,'')
    .replace(/season\s*(\d+)/gi, (_, n) => n > 1 ? `-season-${n}` : '')
    .replace(/[^a-z0-9\s-]/g,' ').replace(/\s+/g,'-').replace(/-+/g,'-').trim().replace(/^-|-$/g,'');
}

async function axiosGogo(url, timeout=20000) {
  const domains = [_activeBase, ...KURO_DOMAINS.filter(d => d !== _activeBase)];
  const fullUrl = url.startsWith('http') ? url : null;

  if (fullUrl) {
    const res = await axios.get(fullUrl, {
      headers: { ...HEADERS, Referer: _activeBase + '/' },
      timeout, validateStatus: s => s < 500,
    });
    const body = typeof res.data === 'string' ? res.data : JSON.stringify(res.data);
    if (body.length < 200) throw new Error('Response too short');
    return res;
  }

  for (const base of domains) {
    try {
      const res = await axios.get(`${base}${url}`, {
        headers: { ...HEADERS, Referer: base + '/' },
        timeout, validateStatus: s => s < 500,
      });
      const body = typeof res.data === 'string' ? res.data : JSON.stringify(res.data);
      const isCf = body.includes('cf-browser-verification') || body.includes('Just a moment') || res.status === 403;
      if (!isCf && body.length > 200) { _activeBase = base; return res; }
    } catch(e) { continue; }
  }
  throw new Error('Semua domain Gogoanime gagal: ' + url);
}

// Alias supaya kode lama tidak error
const axiosKuro = axiosGogo;

async function scrapeLatest(page=1) {
  // Gogoanime recent episodes ada di /page/N/ bukan / langsung
  const path = page === 1 ? '/' : `/page/${page}/`;
  const res = await axiosGogo(path);
  const $ = cheerio.load(res.data);
  const data = [];
  const seen = new Set();

  // Coba semua selector yang mungkin dipakai Gogoanime/Anitaku
  const selectors = [
    '.last_episodes .items li',
    '.last_episodes li',
    '.items.items_latest li',
    '.items li',
    'ul.items li',
    '.anime_list_body li',
    '.content-left .main_body li',
    'article.anime',
    '.listupd .bs',
    '.listupd article',
    '.list-update_items article',
  ];

  for (const sel of selectors) {
    $(sel).each((_, e) => {
      const a     = $(e).find('a').first();
      let   url   = a.attr('href') || '';
      const title = a.attr('title') || $(e).find('.name a, h2, h3').first().text().trim() || a.text().trim();
      const image = $(e).find('img').attr('src') || $(e).find('img').attr('data-src') || '';
      const ep    = $(e).find('.episode, .epx, .eps').text().trim() || '';
      if (!url || !title || title.length < 2) return;
      const fullUrl = url.startsWith('http') ? url : `${_activeBase}${url}`;
      // Ubah URL episode → URL kategori/detail anime
      const animeUrl = fullUrl
        .replace(/-episode-[\d-]+$/i, '')
        .replace(/\/episode\//, '/category/');
      if (seen.has(animeUrl)) return;
      seen.add(animeUrl);
      data.push({ title: title.replace(/sub\s*indo/gi,'').replace(/subtitle\s*indonesia/gi,'').trim(), titleNorm: normalizeTitle(title), url: animeUrl, image, episode: ep, source: 'gogoanime' });
    });
    if (data.length > 0) break; // pakai selector pertama yang berhasil
  }

  // Fallback: cari semua link yang URL-nya mengandung pola episode gogoanime
  if (data.length === 0) {
    $('a[href*="-episode-"]').each((_, e) => {
      const href  = $(e).attr('href') || '';
      const title = $(e).attr('title') || $(e).text().trim();
      const image = $(e).find('img').attr('src') || $(e).closest('li,article,div').find('img').attr('src') || '';
      if (!href || !title || title.length < 2) return;
      const fullUrl = href.startsWith('http') ? href : `${_activeBase}${href}`;
      const animeUrl = fullUrl.replace(/-episode-[\d-]+$/i, '').replace(/\/episode\//, '/category/');
      if (seen.has(animeUrl)) return;
      seen.add(animeUrl);
      data.push({ title: title.replace(/sub\s*indo/gi,'').replace(/subtitle\s*indonesia/gi,'').trim(), titleNorm: normalizeTitle(title), url: animeUrl, image, episode: '', source: 'gogoanime' });
    });
  }

  return data;
}

async function scrapeSearch(query) {
  const res = await axiosGogo(`/search.html?keyword=${encodeURIComponent(query)}`);
  const $ = cheerio.load(res.data);
  const data = [];

  // Coba berbagai selector search result
  const searchSels = ['.search-page .items li', '.items li', '.search_body li', '.anime_list_body .items li', 'ul.items li', '.listupd article', '.listupd .bs'];
  for (const sel of searchSels) {
    $(sel).each((_, e) => {
      const a     = $(e).find('a').first();
      const url   = a.attr('href') || '';
      const title = a.attr('title') || $(e).find('.name, h2, h3').first().text().trim() || a.text().trim();
      const image = $(e).find('img').attr('src') || $(e).find('img').attr('data-src') || '';
      if (!url || !title || title.length < 2) return;
      const fullUrl = url.startsWith('http') ? url : `${_activeBase}${url}`;
      data.push({ title, titleNorm: normalizeTitle(title), image, url: fullUrl, source: 'gogoanime' });
    });
    if (data.length > 0) break;
  }

  return data;
}

async function scrapeGenreList() {
  const res = await axiosGogo('/');
  const $ = cheerio.load(res.data);
  const genres = new Set();
  $('nav.menu_series a, .genre-list a, a[href*="/genre/"]').each((_, e) => {
    const text = $(e).text().trim();
    if (text && text.length > 1 && text.length < 40) genres.add(text);
  });
  return [...genres].sort();
}

async function scrapeGenre(genre, page=1) {
  const slug = genre.toLowerCase().replace(/\s+/g, '-');
  const path = page === 1 ? `/genre/${slug}` : `/genre/${slug}?page=${page}`;
  const res = await axiosGogo(path);
  const $ = cheerio.load(res.data);
  const data = [];

  $('.items li').each((_, e) => {
    const a     = $(e).find('a').first();
    const url   = a.attr('href') || '';
    const title = a.attr('title') || $(e).find('.name').text().trim() || '';
    const image = $(e).find('img').attr('src') || '';
    if (!url || !title) return;
    const fullUrl = url.startsWith('http') ? url : `${_activeBase}${url}`;
    data.push({ title, titleNorm: normalizeTitle(title), image, url: fullUrl, source: 'gogoanime' });
  });
  return data;
}

async function scrapeDetail(url) {
  const targetUrl = url.startsWith('http') ? url : `${_activeBase}${url}`;
  // Gogoanime: detail page ada di /category/<slug>, bukan /<slug>
  const categoryUrl = targetUrl.includes('/category/') ? targetUrl
    : targetUrl.replace(_activeBase, _activeBase + '/category');
  
  let res;
  try { res = await axiosGogo(categoryUrl); }
  catch(e) { res = await axiosGogo(targetUrl); }

  const $ = cheerio.load(res.data);
  const episodes = [];

  // Ambil anime ID untuk fetch episode list via ajax
  const animeId = $('input#movie_id').val() || $('[name="movie_id"]').val() || '';
  const epStart = $('input#ep_start').val() || '0';
  const epEnd   = $('input#ep_end').val() || '0';

  if (animeId && parseInt(epEnd) > 0) {
    try {
      const epRes = await axios.get(
        `https://ajax.gogocdn.net/ajax/load-list-episode?ep_start=${epStart}&ep_end=${epEnd}&id=${animeId}`,
        { headers: { ...HEADERS, Referer: categoryUrl || targetUrl }, timeout: 15000 }
      );
      const $2 = cheerio.load(epRes.data);
      $2('#episode_related li').each((_, e) => {
        const a      = $2(e).find('a');
        const epHref = (a.attr('href') || '').trim();
        const epNum  = $2(e).find('.name').text().replace(/EP/i,'').trim()
                     || epHref.match(/episode-([\d.]+)/i)?.[1] || '';
        if (epHref) {
          const epUrl = epHref.startsWith('http') ? epHref : `${_activeBase}${epHref}`;
          episodes.unshift({ title: `Episode ${epNum}`, url: epUrl });
        }
      });
    } catch(e) {}
  }

  // Fallback 1: scrape dari halaman episode range button
  if (episodes.length === 0) {
    const ranges = [];
    $('ul#episode_page li a').each((_, e) => {
      const ep_start = $(e).attr('ep_start') || '';
      const ep_end   = $(e).attr('ep_end') || '';
      if (ep_start !== '' && ep_end !== '') ranges.push({ ep_start, ep_end });
    });
    for (const range of ranges) {
      if (!animeId) break;
      try {
        const epRes = await axios.get(
          `https://ajax.gogocdn.net/ajax/load-list-episode?ep_start=${range.ep_start}&ep_end=${range.ep_end}&id=${animeId}`,
          { headers: { ...HEADERS, Referer: categoryUrl || targetUrl }, timeout: 15000 }
        );
        const $2 = cheerio.load(epRes.data);
        $2('#episode_related li').each((_, e) => {
          const a      = $2(e).find('a');
          const epHref = (a.attr('href') || '').trim();
          const epNum  = $2(e).find('.name').text().replace(/EP/i,'').trim()
                       || epHref.match(/episode-([\d.]+)/i)?.[1] || '';
          if (epHref) {
            const epUrl = epHref.startsWith('http') ? epHref : `${_activeBase}${epHref}`;
            if (!episodes.find(ep => ep.url === epUrl))
              episodes.unshift({ title: `Episode ${epNum}`, url: epUrl });
          }
        });
      } catch(e) {}
    }
  }

  // Fallback 2: episode link langsung di halaman
  if (episodes.length === 0) {
    $('ul.episodes li a, .episode_page li a, .anime_video_info a').each((_, e) => {
      const href = $(e).attr('href') || '';
      const text = $(e).text().trim();
      if (href && href.match(/episode/i)) {
        const epUrl = href.startsWith('http') ? href : `${_activeBase}${href}`;
        episodes.push({ title: text || 'Episode', url: epUrl });
      }
    });
  }

  const info = {};
  $('.anime_info_body_bg p').each((_, e) => {
    const text = $(e).text();
    const type = $(e).find('span').first().text().replace(':','').trim().toLowerCase().replace(/\s+/g,'_');
    const val  = $(e).find('a').map((__, a) => $(a).text().trim()).get().join(', ')
               || text.replace($(e).find('span').first().text(),'').trim();
    if (type && val) info[type] = val;
  });

  const genres = [];
  $('p.type a[href*="/genre/"]').each((_, e) => {
    const g = $(e).text().trim();
    if (g && !genres.includes(g)) genres.push(g);
  });
  if (genres.length && !info.genre) info.genre = genres.join(', ');

  const image = $('.anime_info_body_bg img').attr('src')
    || $('meta[property="og:image"]').attr('content') || '';
  const title = ($('h1, .anime_info_body_bg h1').first().text().trim())
    || $('title').text().replace(/[-|].*$/,'').trim();
  const description = $('div.description, .anime_info_body_bg .description').text().trim()
    || $('meta[name="description"]').attr('content') || '';
  const score = $('.score-number, .score').first().text().trim() || '';

  // Sort episodes by number (asc)
  episodes.sort((a, b) => {
    const na = parseFloat(a.title.match(/[\d.]+/)?.[0] || 0);
    const nb = parseFloat(b.title.match(/[\d.]+/)?.[0] || 0);
    return na - nb;
  });

  return { url: targetUrl, title, image, description, score, info, episodes, streamSource: targetUrl };
}


async function scrapeWatch(url) {
  const targetUrl = url.startsWith('http') ? url : `${_activeBase}${url}`;
  const res = await axiosGogo(targetUrl);
  const $ = cheerio.load(res.data);

  const title = $('h1, .anime_video_body h1, .title_name h2').first().text().trim();
  const streams = [];
  const DIRTY = ['dood','streamtape','goplay','dutamovie','streamhide','clicknupload','upstream','linkbox'];

  const html = typeof res.data === 'string' ? res.data : $.html();

  // ── STEP 1: Gogoanime ajax server list (paling reliable) ──
  const movieId = $('input#movie_id, [name="movie_id"]').val() || '';
  if (movieId) {
    try {
      const ajaxRes = await axios.get(
        `https://ajax.gogocdn.net/ajax/anime_videos?server=&page=&episode_id=${movieId}`,
        { headers: { ...HEADERS, 'X-Requested-With': 'XMLHttpRequest', Referer: targetUrl }, timeout: 15000 }
      );
      const $2 = cheerio.load(ajaxRes.data);
      $2('.anime_muti_link ul li').each((_, e) => {
        const a    = $2(e).find('a');
        const href = (a.attr('data-video') || a.attr('href') || '').trim();
        const name = a.text().trim() || $2(e).attr('class') || 'Server';
        if (href && href.startsWith('http') && !streams.find(s => s.url === href) && !DIRTY.some(d => href.toLowerCase().includes(d)))
          streams.push({ server: name, url: href });
      });
    } catch(e) { /* fallback below */ }
  }

  // ── STEP 2: Gogoanime embed iframe utama ──
  $('div.play-video iframe, .anime_video_body iframe, #video_here iframe, iframe').each((_, e) => {
    const src = $(e).attr('src') || $(e).attr('data-src') || '';
    if (src && src.startsWith('http') && !streams.find(s => s.url === src) && !DIRTY.some(d => src.toLowerCase().includes(d))) {
      const server = $(e).attr('title') || $(e).attr('name') || 'Gogoanime';
      streams.push({ server, url: src });
    }
  });

  // ── STEP 3: Server link dari halaman (data-video attribute) ──
  $('.anime_muti_link li a, .anime_video_body_episodes li a, .server-list li a, #load_ep a, [data-video]').each((_, e) => {
    const href = $(e).attr('data-video') || $(e).attr('href') || '';
    const name = $(e).text().trim() || $(e).closest('li').attr('class') || 'Server';
    if (href && href.startsWith('http') && !streams.find(s => s.url === href) && !DIRTY.some(d => href.toLowerCase().includes(d)))
      streams.push({ server: name, url: href });
  });

  // ── STEP 4: Extract embed URL dari inline script ──
  const embedMatches = html.matchAll(/["'](https?:\/\/[^"'\s]*(?:embed|player|streaming|vidstream|gogocdn|megacloud)[^"'\s]*)["\']/gi);
  for (const m of embedMatches) {
    if (!streams.find(s => s.url === m[1]) && !DIRTY.some(d => m[1].toLowerCase().includes(d)))
      streams.push({ server: 'Embed', url: m[1] });
  }

  // ── STEP 5: Direct m3u8/mp4 file di script ──
  const fileMatch = html.match(/file\s*:\s*["\']([^"\']+\.(?:m3u8|mp4)[^"\']*)[\'"]/i);
  if (fileMatch && !streams.find(s => s.url === fileMatch[1]))
    streams.push({ server: 'Direct', url: fileMatch[1] });

  // ── STEP 6: Gogoanime CDN embed fallback (konstruksi manual dari slug episode) ──
  if (streams.length === 0) {
    const epSlug = targetUrl.split('/').pop().replace(/\?.*$/, '');
    if (epSlug) {
      streams.push({ server: 'Gogoanime', url: `https://embtaku.pro/streaming.php?id=${epSlug}` });
    }
  }

  const clean = streams.filter(s => !DIRTY.some(d => (s.url||'').toLowerCase().includes(d)));
  return { title, streams: clean.length > 0 ? clean : streams };
}

// =============================================
// MAL / JIKAN API
// =============================================
async function fetchMAL(searchTitle) {
  function cleanTitle(t) {
    return (t||'')
      .replace(/sub\s*indo/gi,'').replace(/subtitle\s*indonesia/gi,'')
      .replace(/\bcour\s*\d+/gi,'').replace(/\bpart\s*\d+/gi,'')
      .replace(/\bseason\s*\d+/gi,'').replace(/\bs\d+\b/gi,'')
      .replace(/\b(batch|bd|bluray|blu-ray|uncensored|ova|ona|special|movie)\b/gi,'')
      .replace(/\s*\(.*?\)/g,'').replace(/\s*\[.*?\]/g,'')
      .replace(/[^a-zA-Z0-9\s]/g,' ').replace(/\s+/g,' ').trim();
  }
  async function jikanSearch(q) {
    if (!q || q.length < 2) return null;
    try {
      const res = await axios.get(`https://api.jikan.moe/v4/anime?q=${encodeURIComponent(q)}&limit=1&type=tv`, {
        timeout: 10000, headers: { 'Accept': 'application/json' }
      });
      return res.data?.data?.[0] || null;
    } catch(e) { return null; }
  }
  try {
    const t0 = (searchTitle||'').replace(/sub\s*indo/gi,'').replace(/subtitle\s*indonesia/gi,'').trim();
    const t1 = cleanTitle(searchTitle);
    const t2 = t1.split(' ').slice(0,5).join(' ');
    const t3 = t1.split(' ').slice(0,3).join(' ');
    const t4 = t1.split(' ').slice(0,2).join(' ');
    let m = await jikanSearch(t0) || await jikanSearch(t1) || await jikanSearch(t2) || await jikanSearch(t3) || await jikanSearch(t4);
    if (!m) return null;
    await sleep(400);
    let detail = m;
    try {
      const detailRes = await axios.get(`https://api.jikan.moe/v4/anime/${m.mal_id}/full`, { timeout: 10000 });
      if (detailRes.data?.data) detail = detailRes.data.data;
      await sleep(400);
    } catch(e) {}
    const genres = [...(detail.genres||[]), ...(detail.themes||[]), ...(detail.demographics||[])].map(g => g.name).join(', ');
    const studio = (detail.studios||[]).map(s=>s.name).join(', ');
    return {
      malId: detail.mal_id,
      title: detail.title_english || detail.title || '',
      titleEnglish: detail.title_english || detail.title || '',
      titleJapanese: detail.title_japanese || '',
      image: detail.images?.jpg?.large_image_url || detail.images?.jpg?.image_url || '',
      description: (detail.synopsis||'').replace(/\[Written.*?\]/g,'').trim(),
      score: detail.score ? String(detail.score) : '',
      rank: detail.rank || null, popularity: detail.popularity || null,
      trailerUrl: detail.trailer?.url || '',
      info: {
        tipe: detail.type || '', status: detail.status || '',
        season: detail.season && detail.year ? `${detail.season} ${detail.year}` : '',
        year: String(detail.year || detail.aired?.prop?.from?.year || ''),
        aired: detail.aired?.string || '', studio,
        source: detail.source || '', genre: genres,
        theme: (detail.themes||[]).map(t=>t.name).join(', '),
        demographic: (detail.demographics||[]).map(d=>d.name).join(', '),
        duration: detail.duration || '',
        episode_count: String(detail.episodes || ''),
        rating: detail.rating || '',
      }
    };
  } catch(e) { return null; }
}

const fetchAnilist = fetchMAL;

const BLOCKED_KW = ['spongebob','pokemon','doraemon','paw patrol','peppa pig','tom and jerry','mickey','minions','upin','ipin','boboiboy'];
function isBlocked(a) {
  const title = (a.title||'').toLowerCase();
  const type  = (a.info?.tipe||a.info?.type||'').toLowerCase();
  const genre = (a.info?.genre||'').toLowerCase();
  if (['music','cm','pv'].includes(type)) return true;
  if (genre.includes('kids')) return true;
  if (BLOCKED_KW.some(kw => title.includes(kw))) return true;
  return false;
}

// =============================================
// ROUTES
// =============================================
app.get('/api/ping', async(req,res) => {
  try { await connectDB(); const count = await Anime.countDocuments(); res.json({status:'OK',db:'connected',animeCount:count,source:'gogoanime'}); }
  catch(e) { res.json({status:'OK',db:'error: '+e.message}); }
});

app.get('/api/db-stats', async(req,res) => {
  try {
    await connectDB();
    const [animes,watches,latests] = await Promise.all([Anime.countDocuments(),Watch.countDocuments(),Latest.countDocuments()]);
    res.json({animes,watches,latests,total:animes+watches+latests});
  } catch(e) { res.status(500).json({error:e.message}); }
});

app.get('/api/latest', async(req,res) => {
  try {
    await connectDB();
    const page = parseInt(req.query.page)||1, limit = parseInt(req.query.limit)||20, skip = (page-1)*limit;
    res.set('Cache-Control','public, max-age=60, stale-while-revalidate=300');
    if (page===1 && _memLatest && (Date.now()-_memLatestTs)<MEM_TTL) return res.json(_memLatest);
    if (page===1) {
      const cached = await Latest.findById('latest').lean();
      if (cached && Date.now()-cached.updatedAt<LATEST_TTL && cached.data?.length>0) {
        _memLatest = cached.data; _memLatestTs = Date.now(); return res.json(cached.data);
      }
    }
    const docs = await Anime.find({episodes:{$not:{$size:0}}}).sort({updatedAt:-1}).skip(skip).limit(limit).lean();
    if (docs.length>0) {
      const result = docs.filter(d=>!isBlocked(d)).map(d=>formatAnime(d));
      if (page===1 && result.length>0) {
        _memLatest = result; _memLatestTs = Date.now();
        Latest.findByIdAndUpdate('latest',{data:result,updatedAt:new Date()},{upsert:true}).catch(()=>{});
      }
      return res.json(result);
    }
    const raw = await scrapeLatest(page);
    res.json(raw.filter(a=>!isBlocked(a)));
  } catch(e) { res.status(500).json({error:e.message}); }
});

app.get('/api/search', async(req,res) => {
  const q = (req.query.q||'').trim();
  if (!q) return res.json([]);
  try {
    await connectDB();
    const dbCount = await Anime.countDocuments();
    if (dbCount>0) {
      const regex = new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g,'\\$&'),'i');
      const docs  = await Anime.find({$or:[{title:regex},{titleEnglish:regex},{titleJapanese:regex},{titleNorm:regex}]}).limit(30).lean();
      if (docs.length>0) return res.json(docs.filter(d=>!isBlocked(d)).map(d=>formatAnime(d)));
    }
    const results = await scrapeSearch(q);
    res.json(results.filter(a=>!isBlocked(a)));
  } catch(e) { res.status(500).json({error:e.message}); }
});

app.get('/api/detail', async(req,res) => {
  try {
    await connectDB();
    const url = req.query.url;
    if (!url) return res.status(400).json({error:'url required'});
    const existing = await Anime.findOne({url});
    if (existing && existing.episodes?.length>0) {
      res.set('Cache-Control','public, max-age=300, stale-while-revalidate=600');
      return res.json(formatAnime(existing));
    }
    const data = await scrapeDetail(url);
    let al = null; try { al = await fetchAnilist(data.title); } catch(e) {}
    const doc = {
      url, title: al?.title||data.title,
      titleEnglish: al?.titleEnglish||'', titleJapanese: al?.titleJapanese||'',
      titleNorm: normalizeTitle(data.title),
      image: al?.image||data.image||'', description: al?.description||data.description||'',
      score: al?.score||data.score||'', rank: al?.rank||null, popularity: al?.popularity||null,
      trailerUrl: al?.trailerUrl||'', anilistId: al?.malId||null, anilistEnriched: !!al,
      info: {
        tipe: al?.info?.tipe||data.info?.tipe||'', status: al?.info?.status||data.info?.status||'',
        season: al?.info?.season||data.info?.season||'', year: al?.info?.year||data.info?.tahun||data.info?.year||'',
        aired: al?.info?.aired||'', studio: al?.info?.studio||data.info?.studio||'',
        source: al?.info?.source||'', genre: al?.info?.genre||data.info?.genre||'',
        theme: al?.info?.theme||'', demographic: al?.info?.demographic||'',
        duration: al?.info?.duration||data.info?.durasi||data.info?.duration||'',
        episode_count: al?.info?.episode_count||String(data.episodes?.length||0),
        rating: al?.info?.rating||data.info?.rating||'',
      },
      episodes: data.episodes||[], streamSource: url, updatedAt: new Date(),
    };
    await Anime.findOneAndUpdate({url}, doc, {upsert:true, new:true});
    res.set('Cache-Control','public, max-age=300');
    res.json({...doc, source:'scraped+saved'});
  } catch(e) { res.status(500).json({error:e.message}); }
});

app.get('/api/watch', async(req,res) => {
  try {
    await connectDB();
    const url = req.query.url;
    if (!url) return res.status(400).json({error:'url required'});

    // Serve from cache jika masih fresh
    const existing = await Watch.findOne({url});
    if (existing && Date.now()-existing.updatedAt<WATCH_TTL && existing.streams?.length>0)
      return res.json({title:existing.title, streams:existing.streams, fromCache:true});

    // Scrape stream dari URL episode
    const data = await scrapeWatch(url);

    // Fallback 1: coba URL alternatif domain jika gagal
    if (!data.streams || data.streams.length === 0) {
      for (const base of KURO_DOMAINS) {
        if (data.streams?.length > 0) break;
        try {
          const altUrl = url.replace(/^https?:\/\/[^\/]+/, base);
          if (altUrl === url) continue;
          const r2 = await scrapeWatch(altUrl);
          if (r2.streams?.length > 0) { data.streams = r2.streams; data.title = r2.title || data.title; }
        } catch(e) {}
      }
    }

    // Fallback 2: cari via search title lalu ambil episode yang sesuai
    if ((!data.streams || data.streams.length === 0) && req.query.title) {
      try {
        const results = await scrapeSearch(req.query.title);
        if (results[0]?.url) {
          const detail = await scrapeDetail(results[0].url);
          const epNum  = (req.query.ep||'').toString();
          const ep = detail.episodes?.find(e =>
            (e.title||'').toLowerCase().includes(`episode \${epNum}`) ||
            (e.title||'').toLowerCase().endsWith(` \${epNum}`)
          ) || detail.episodes?.[0];
          if (ep?.url) {
            const r2 = await scrapeWatch(ep.url);
            if (r2.streams?.length > 0) { data.streams = r2.streams; data.title = r2.title || data.title; }
          }
        }
      } catch(e2) {}
    }

    // Fallback 3: coba konstruksi embed URL dari slug episode secara manual
    if (!data.streams || data.streams.length === 0) {
      const epSlug = url.split('/').pop().replace(/\?.*$/, '');
      if (epSlug && epSlug.length > 3) {
        // Gogoanime CDN embed format
        data.streams = [
          { server: 'Gogoanime HD', url: `https://embtaku.pro/streaming.php?id=\${epSlug}` },
          { server: 'Gogoanime SD', url: `https://gogohd.net/streaming.php?id=\${epSlug}` },
        ];
      }
    }

    if (data.streams?.length > 0)
      await Watch.findOneAndUpdate({url},{url,title:data.title,streams:data.streams,updatedAt:new Date()},{upsert:true});

    res.json(data);
  } catch(e) { res.status(500).json({error:e.message}); }
});

app.get('/api/browse', async(req,res) => {
  try {
    await connectDB();
    const page = parseInt(req.query.page)||1, limit = parseInt(req.query.limit)||24, skip = (page-1)*limit;
    const filter = {};
    if (req.query.genre)  filter['info.genre']  = new RegExp(req.query.genre,'i');
    if (req.query.status) filter['info.status']  = new RegExp(req.query.status,'i');
    if (req.query.year)   filter['info.year']    = req.query.year;
    if (req.query.type)   filter['info.tipe']    = new RegExp(req.query.type,'i');
    const sortMap = {latest:{updatedAt:-1},score:{score:-1},popularity:{popularity:1},title:{title:1}};
    const [docs,total] = await Promise.all([
      Anime.find(filter).sort(sortMap[req.query.sort]||sortMap.latest).skip(skip).limit(limit).lean(),
      Anime.countDocuments(filter),
    ]);
    res.json({data:docs.filter(d=>!isBlocked(d)).map(d=>formatAnime(d)),total,page,totalPages:Math.ceil(total/limit)});
  } catch(e) { res.status(500).json({error:e.message}); }
});

app.get('/api/top-anime', async(req,res) => {
  try {
    await connectDB();
    const limit = Math.min(parseInt(req.query.limit)||60,200);
    res.set('Cache-Control','public, max-age=300, stale-while-revalidate=600');
    if (_memTop && _memTop.length>=limit && (Date.now()-_memTopTs)<MEM_TTL) return res.json(_memTop.slice(0,limit));
    const docs = await Anime.find({score:{$exists:true,$ne:''},episodes:{$not:{$size:0}}}).sort({score:-1}).limit(limit).lean();
    if (docs.length>0) {
      const result = docs.filter(d=>!isBlocked(d)).map(d=>formatAnime(d));
      _memTop = result; _memTopTs = Date.now(); return res.json(result);
    }
    const alRes = await axios.post('https://graphql.anilist.co',{
      query:`query{Page(page:1,perPage:${limit}){media(type:ANIME,sort:SCORE_DESC,isAdult:false){id title{romaji english}coverImage{extraLarge}averageScore popularity format status genres}}}`
    },{headers:{'Content-Type':'application/json'},timeout:8000});
    const medias = alRes.data?.data?.Page?.media||[];
    res.json(medias.map(m=>({title:m.title?.romaji||'',titleEnglish:m.title?.english||'',image:m.coverImage?.extraLarge||'',score:m.averageScore?String(m.averageScore/10):'',popularity:m.popularity,info:{type:m.format,status:m.status,genre:m.genres?.join(', ')},source:'anilist'})));
  } catch(e) { res.status(500).json({error:e.message}); }
});

app.get('/api/genres', async(req,res) => {
  try {
    await connectDB();
    const docs = await Anime.find({'info.genre':{$exists:true,$ne:''}},{'info.genre':1}).lean();
    const set  = new Set();
    docs.forEach(d => (d.info?.genre||'').split(',').forEach(g => { const t=g.trim(); if(t) set.add(t); }));
    if (set.size === 0) {
      const scraped = await scrapeGenreList();
      scraped.forEach(g => set.add(g));
    }
    res.json([...set].sort());
  } catch(e) { res.status(500).json({error:e.message}); }
});

app.get('/api/genre', async(req,res) => {
  const genre = req.query.name||'', page = parseInt(req.query.page)||1;
  const limit = Math.min(parseInt(req.query.limit)||24,200), skip = (page-1)*limit;
  try {
    await connectDB();
    const escaped = genre.replace(/[-\/\\^$*+?.()|[\]{}]/g,'\\$&');
    const filter  = genre ? {'info.genre':{$regex:escaped,$options:'i'},episodes:{$not:{$size:0}}} : {episodes:{$not:{$size:0}}};
    const [docs,total] = await Promise.all([
      Anime.find(filter,{episodes:0}).sort({score:-1}).skip(skip).limit(limit).lean(),
      Anime.countDocuments(filter),
    ]);
    if (docs.length>0) return res.json({data:docs.filter(d=>!isBlocked(d)).map(d=>formatAnime(d)),total,page,totalPages:Math.ceil(total/limit)});
    const scraped = await scrapeGenre(genre, page);
    res.json({data:scraped.filter(a=>!isBlocked(a)), total:scraped.length, page, totalPages:1});
  } catch(e) { res.status(500).json({error:e.message}); }
});

app.get('/api/anilist/:id', async(req,res) => {
  try {
    await connectDB();
    const id = parseInt(req.params.id), doc = await Anime.findOne({anilistId:id});
    if (doc) return res.json(formatAnime(doc));
    const alRes = await axios.post('https://graphql.anilist.co',{
      query:`query($id:Int){Media(id:$id,type:ANIME){id title{romaji english native}description coverImage{extraLarge}averageScore popularity genres format status episodes season seasonYear studios(isMain:true){nodes{name}}}}`,
      variables:{id}
    },{headers:{'Content-Type':'application/json'},timeout:8000});
    const m = alRes.data?.data?.Media;
    if (!m) return res.status(404).json({error:'Not found'});
    res.json({anilistId:m.id,title:m.title?.romaji,titleEnglish:m.title?.english,image:m.coverImage?.extraLarge,description:(m.description||'').replace(/<[^>]*>/g,''),score:m.averageScore?String(m.averageScore/10):'',info:{type:m.format,status:m.status,genre:(m.genres||[]).join(', '),episode_count:String(m.episodes||''),studio:m.studios?.nodes?.map(s=>s.name).join(', ')||''},source:'anilist'});
  } catch(e) { res.status(500).json({error:e.message}); }
});

app.get('/api/purge', async(req,res) => {
  try {
    await connectDB();
    const type = req.query.type||'watch';
    if (type==='all') { await Promise.all([Watch.deleteMany({}),Anime.deleteMany({}),Latest.deleteMany({})]); _memLatest=null; _memLatestTs=0; return res.json({ok:true,message:'Semua data dihapus.'}); }
    if (type==='watch') { await Watch.deleteMany({}); return res.json({ok:true,message:'Watch cache dihapus. Silakan buka episode lagi.'}); }
    if (type==='anime') { await Anime.deleteMany({}); _memLatest=null; _memLatestTs=0; return res.json({ok:true,message:'Anime DB dihapus. Akan re-scrape otomatis.'}); }
    await Latest.deleteMany({}); _memLatest=null; _memLatestTs=0;
    res.json({ok:true,message:'Latest cache dihapus.'});
  } catch(e) { res.status(500).json({error:e.message}); }
});

app.get('/api/cache-clear', async(req,res) => {
  try {
    await connectDB();
    const url = req.query.url, type = req.query.type||'watch';
    if (url) { await Watch.deleteOne({url}); if(type==='all') await Anime.deleteOne({url}); return res.json({message:'Cache dihapus untuk: '+url}); }
    if (type==='all') { await Promise.all([Watch.deleteMany({}),Anime.deleteMany({}),Latest.deleteMany({})]); return res.json({message:'Semua data dihapus.'}); }
    if (type==='watch') { await Watch.deleteMany({}); return res.json({message:'Watch cache dihapus.'}); }
    await Latest.deleteMany({}); res.json({message:'Latest cache dihapus.'});
  } catch(e) { res.status(500).json({error:e.message}); }
});

// =============================================
// SCRAPE-ALL — isi DB dari Kuronime
// =============================================
app.get('/api/scrape-all', async(req,res) => {
  try {
    await connectDB();
    const pages = Math.min(parseInt(req.query.pages)||1,20), startPage = parseInt(req.query.startPage)||1;
    const results = []; let saved=0, skipped=0;
    for (let page=startPage; page<startPage+pages; page++) {
      let items = [];
      try { items = await scrapeLatest(page); } catch(e) { results.push({page,error:e.message}); continue; }
      for (const item of items) {
        if (isBlocked(item)) { skipped++; continue; }
        try {
          const existing = await Anime.findOne({url:item.url});
          if (existing && existing.episodes?.length>0) { skipped++; continue; }
          let detail = {episodes:[],info:{},image:item.image,description:''};
          try { detail = await scrapeDetail(item.url); } catch(e2) {}
          let al = null; try { al = await fetchAnilist(detail.title||item.title); } catch(e3) {}
          const doc = {
            url:item.url, title:(al?.title||detail.title||item.title||'').replace(/sub\s*indo/gi,'').replace(/subtitle\s*indonesia/gi,'').replace(/\s+/g,' ').trim(),
            titleEnglish:al?.titleEnglish||'', titleJapanese:al?.titleJapanese||'',
            titleNorm:normalizeTitle(detail.title||item.title),
            image:al?.image||detail.image||item.image||'', description:al?.description||detail.description||'',
            score:al?.score||detail.score||'', rank:al?.rank||null, popularity:al?.popularity||null,
            trailerUrl:al?.trailerUrl||'', anilistId:al?.malId||null, anilistEnriched:!!al,
            info:{
              tipe:al?.info?.tipe||detail.info?.tipe||'', status:al?.info?.status||detail.info?.status||'',
              season:al?.info?.season||'', year:al?.info?.year||detail.info?.tahun||'',
              aired:al?.info?.aired||'', studio:al?.info?.studio||detail.info?.studio||'',
              source:al?.info?.source||'', genre:al?.info?.genre||detail.info?.genre||'',
              theme:al?.info?.theme||'', demographic:al?.info?.demographic||'',
              duration:al?.info?.duration||detail.info?.durasi||'',
              episode_count:al?.info?.episode_count||String(detail.episodes?.length||0),
              rating:al?.info?.rating||'',
            },
            episodes:detail.episodes||[], streamSource:item.url, updatedAt:new Date(),
          };
          await Anime.findOneAndUpdate({url:item.url},doc,{upsert:true,new:true});
          saved++; await sleep(300);
        } catch(e4) { results.push({url:item.url,error:e4.message}); }
      }
      results.push({page,scraped:items.length}); await sleep(500);
    }
    res.json({status:'done',saved,skipped,pages:results});
  } catch(e) { res.status(500).json({error:e.message}); }
});

app.get('/api/scrape-full', async(req,res) => {
  try {
    await connectDB();
    const startPage = parseInt(req.query.startPage)||1, maxPages = Math.min(parseInt(req.query.maxPages)||20,20);
    const results = []; let saved=0, skipped=0;
    for (let page=startPage; page<startPage+maxPages; page++) {
      let items = [];
      try { items = await scrapeLatest(page); } catch(e) { results.push({page,error:e.message}); break; }
      if (!items||items.length===0) { results.push({page,done:true}); break; }
      for (const item of items) {
        if (isBlocked(item)) { skipped++; continue; }
        try {
          const existing = await Anime.findOne({url:item.url});
          if (existing && existing.episodes?.length>0) { skipped++; continue; }
          let detail = {episodes:[],info:{},image:item.image,description:''};
          try { detail = await scrapeDetail(item.url); } catch(e2) {}
          let mal = null; try { mal = await fetchMAL(detail.title||item.title); } catch(e3) {}
          const finalTitle = (mal?.titleEnglish||mal?.title||detail.title||item.title||'').replace(/sub\s*indo/gi,'').replace(/subtitle\s*indonesia/gi,'').replace(/\s+/g,' ').trim();
          const doc = {
            url:item.url, title:finalTitle,
            titleEnglish:mal?.titleEnglish||'', titleJapanese:mal?.titleJapanese||'',
            titleNorm:normalizeTitle(detail.title||item.title),
            image:mal?.image||detail.image||item.image||'', description:mal?.description||detail.description||'',
            score:mal?.score||detail.score||'', rank:mal?.rank||null, popularity:mal?.popularity||null,
            trailerUrl:mal?.trailerUrl||'', anilistId:mal?.malId||null, anilistEnriched:!!mal,
            info:{
              tipe:mal?.info?.tipe||detail.info?.tipe||'', status:mal?.info?.status||detail.info?.status||'',
              season:mal?.info?.season||'', year:mal?.info?.year||detail.info?.tahun||'',
              aired:mal?.info?.aired||'', studio:mal?.info?.studio||detail.info?.studio||'',
              source:mal?.info?.source||'', genre:mal?.info?.genre||detail.info?.genre||'',
              theme:mal?.info?.theme||'', demographic:mal?.info?.demographic||'',
              duration:mal?.info?.duration||detail.info?.durasi||'',
              episode_count:mal?.info?.episode_count||String(detail.episodes?.length||0),
              rating:mal?.info?.rating||'',
            },
            episodes:detail.episodes||[], streamSource:item.url, updatedAt:new Date(),
          };
          await Anime.findOneAndUpdate({url:item.url},doc,{upsert:true,new:true});
          saved++; await sleep(400);
        } catch(e4) { results.push({url:item.url,error:e4.message}); }
      }
      results.push({page,scraped:items.length}); await sleep(500);
    }
    res.json({status:'done',saved,skipped,next_startPage:startPage+maxPages,pages:results});
  } catch(e) { res.status(500).json({error:e.message}); }
});

app.get('/api/fix-metadata', async(req,res) => {
  try {
    await connectDB();
    const limit = Math.min(parseInt(req.query.limit)||30,100);
    const docs  = await Anime.find({$or:[{anilistEnriched:{$ne:true}},{image:{$in:['',null]}},{score:{$in:['',null]}}]}).limit(limit).lean();
    let fixed=0, failed=0;
    for (const doc of docs) {
      try {
        const al = await fetchAnilist(doc.titleEnglish||doc.title||doc.titleNorm||'');
        if (!al) { failed++; continue; }
        await Anime.findByIdAndUpdate(doc._id,{$set:{
          titleEnglish:al.titleEnglish||doc.titleEnglish||'', titleJapanese:al.titleJapanese||doc.titleJapanese||'',
          image:al.image||doc.image||'', description:al.description||doc.description||'',
          score:al.score||doc.score||'', rank:al.rank||doc.rank||null, popularity:al.popularity||doc.popularity||null,
          trailerUrl:al.trailerUrl||doc.trailerUrl||'', anilistId:al.malId||doc.anilistId||null, anilistEnriched:true,
          'info.tipe':al.info?.tipe||doc.info?.tipe||'', 'info.status':al.info?.status||doc.info?.status||'',
          'info.season':al.info?.season||doc.info?.season||'', 'info.year':al.info?.year||doc.info?.year||'',
          'info.studio':al.info?.studio||doc.info?.studio||'', 'info.genre':al.info?.genre||doc.info?.genre||'',
          'info.theme':al.info?.theme||doc.info?.theme||'', 'info.demographic':al.info?.demographic||doc.info?.demographic||'',
          'info.duration':al.info?.duration||doc.info?.duration||'',
          'info.episode_count':al.info?.episode_count||doc.info?.episode_count||'',
          'info.rating':al.info?.rating||doc.info?.rating||'',
        }});
        fixed++; await sleep(400);
      } catch(e) { failed++; }
    }
    res.json({status:'done',fixed,failed,total:docs.length});
  } catch(e) { res.status(500).json({error:e.message}); }
});

app.get('/api/force-fix', async(req,res) => {
  try {
    await connectDB();
    const limit = Math.min(parseInt(req.query.limit)||20,50), skip = parseInt(req.query.skip)||0;
    const docs  = await Anime.find({}).skip(skip).limit(limit).lean();
    let fixed=0, failed=0;
    for (const doc of docs) {
      try {
        const al = await fetchAnilist(doc.titleEnglish||doc.title||doc.titleNorm||'');
        if (!al) { failed++; continue; }
        const cleanTitle = (al.titleEnglish||al.title||doc.title||'').replace(/sub\s*indo/gi,'').replace(/subtitle\s*indonesia/gi,'').replace(/\s+/g,' ').trim();
        await Anime.findByIdAndUpdate(doc._id,{$set:{
          title:cleanTitle, titleEnglish:al.titleEnglish||doc.titleEnglish||'', titleJapanese:al.titleJapanese||doc.titleJapanese||'',
          image:al.image||doc.image||'', description:al.description||doc.description||'',
          score:al.score||doc.score||'', rank:al.rank||doc.rank||null, popularity:al.popularity||doc.popularity||null,
          trailerUrl:al.trailerUrl||doc.trailerUrl||'', anilistId:al.malId||doc.anilistId||null, anilistEnriched:true,
          'info.tipe':al.info?.tipe||doc.info?.tipe||'', 'info.status':al.info?.status||doc.info?.status||'',
          'info.season':al.info?.season||doc.info?.season||'', 'info.year':al.info?.year||doc.info?.year||'',
          'info.studio':al.info?.studio||doc.info?.studio||'', 'info.genre':al.info?.genre||doc.info?.genre||'',
          'info.theme':al.info?.theme||doc.info?.theme||'', 'info.demographic':al.info?.demographic||doc.info?.demographic||'',
          'info.duration':al.info?.duration||doc.info?.duration||'',
          'info.episode_count':al.info?.episode_count||doc.info?.episode_count||'',
          'info.rating':al.info?.rating||doc.info?.rating||'',
        }});
        fixed++; await sleep(500);
      } catch(e) { failed++; }
    }
    const total = await Anime.countDocuments();
    res.json({status:'done',fixed,failed,processed:docs.length,skip,total,next_skip:skip+limit});
  } catch(e) { res.status(500).json({error:e.message}); }
});

app.get('/api/heal-empty', async(req,res) => {
  try {
    await connectDB();
    const limit = Math.min(parseInt(req.query.limit)||20,50);
    const docs  = await Anime.find({$or:[{episodes:{$size:0}},{episodes:{$exists:false}}]}).limit(limit).lean();
    let healed=0, failed=0;
    for (const doc of docs) {
      try {
        let detail = null;
        try { detail = await scrapeDetail(doc.url); } catch(e1) {}
        if (detail?.episodes?.length>0) {
          await Anime.findByIdAndUpdate(doc._id,{$set:{episodes:detail.episodes,streamSource:doc.url,updatedAt:new Date()}});
          healed++;
        } else { failed++; }
        await sleep(500);
      } catch(e) { failed++; }
    }
    res.json({status:'done',healed,failed,total:docs.length});
  } catch(e) { res.status(500).json({error:e.message}); }
});

app.get('/api/dedup', async(req,res) => {
  try {
    await connectDB();
    let removed = 0;
    async function dedupKeepMostEps(ids) {
      if (!ids||ids.length<2) return;
      const docs = await Anime.find({_id:{$in:ids}},{_id:1,episodes:1}).lean();
      docs.sort((a,b)=>(b.episodes?.length||0)-(a.episodes?.length||0));
      const toDelete = docs.slice(1).map(d=>d._id);
      if (toDelete.length>0) { await Anime.deleteMany({_id:{$in:toDelete}}); removed+=toDelete.length; }
    }
    for (const dup of await Anime.aggregate([{$group:{_id:'$url',ids:{$push:'$_id'},count:{$sum:1}}},{$match:{count:{$gt:1}}}])) await dedupKeepMostEps(dup.ids);
    for (const dup of await Anime.aggregate([{$match:{anilistId:{$ne:null}}},{$group:{_id:'$anilistId',ids:{$push:'$_id'},count:{$sum:1}}},{$match:{count:{$gt:1}}}])) await dedupKeepMostEps(dup.ids);
    for (const dup of await Anime.aggregate([{$match:{titleNorm:{$ne:'',$exists:true}}},{$group:{_id:'$titleNorm',ids:{$push:'$_id'},count:{$sum:1}}},{$match:{count:{$gt:1}}}])) await dedupKeepMostEps(dup.ids);
    let streamsCleaned=0;
    for (const w of await Watch.find({}).lean()) {
      const seen=new Set(), unique=(w.streams||[]).filter(s=>{if(!s.url||seen.has(s.url))return false;seen.add(s.url);return true;});
      if (unique.length!==(w.streams||[]).length) { await Watch.findByIdAndUpdate(w._id,{streams:unique}); streamsCleaned++; }
    }
    let episodesCleaned=0;
    for (const a of await Anime.find({'episodes.0':{$exists:true}},{_id:1,episodes:1}).lean()) {
      const seen=new Set(), uniqueEps=(a.episodes||[]).filter(ep=>{if(!ep.url||seen.has(ep.url))return false;seen.add(ep.url);return true;});
      if (uniqueEps.length!==(a.episodes||[]).length) { await Anime.findByIdAndUpdate(a._id,{episodes:uniqueEps}); episodesCleaned++; }
    }
    await Latest.deleteMany({}); _memLatest=null; _memLatestTs=0; _memTop=null; _memTopTs=0;
    res.json({status:'done',animeDuplicatesRemoved:removed,watchStreamsCleaned:streamsCleaned,animeEpisodesCleaned:episodesCleaned});
  } catch(e) { res.status(500).json({error:e.message}); }
});

// DEBUG — test Kuronime langsung
app.get('/api/debug-kuro', async(req,res) => {
  const page    = parseInt(req.query.page)||1;
  const path    = page === 1 ? '/' : `/page/${page}/`;
  const results = [];
  let   winner  = null;
  for (const base of KURO_DOMAINS) {
    const start = Date.now();
    try {
      const r    = await axios.get(`${base}${path}`, {
        headers: { ...HEADERS, Referer: base + '/' },
        timeout: 15000, validateStatus: s => s < 600,
      });
      const body    = typeof r.data === 'string' ? r.data : JSON.stringify(r.data);
      const elapsed = Date.now() - start;
      const isCf    = body.includes('cf-browser-verification') || body.includes('Just a moment') || r.status === 403;
      const hasAnime= body.includes('anime') || body.includes('episode');
      const ok      = r.status < 400 && body.length > 500 && !isCf;
      results.push({ domain: base, status: r.status, length: body.length,
        elapsed: elapsed+'ms', ok, cloudflare_blocked: isCf, has_anime_content: hasAnime,
        preview: body.substring(0, 400) });
      if (ok && hasAnime && !winner) { winner = base; _activeBase = base; }
    } catch(e) {
      results.push({ domain: base, status: 'error', elapsed: (Date.now()-start)+'ms', error: e.message });
    }
  }
  res.json({ winner, active_base: _activeBase, results });
});

app.get('/api/debug-scrape', async(req,res) => {
  const {url} = req.query;
  if (!url) return res.status(400).json({error:'url required'});
  try {
    const data = await scrapeDetail(url);
    let al = null; try { al = await fetchAnilist(data.title); } catch(e) {}
    res.json({title:data.title,episodeCount:data.episodes?.length||0,firstEp:data.episodes?.[0],lastEp:data.episodes?.[data.episodes.length-1],image:data.image,score:data.score,anilistEnriched:!!al,anilistData:al,info:data.info});
  } catch(e) { res.status(500).json({error:e.message}); }
});



// DEBUG — test scrapeWatch langsung, lihat semua streams yang ditemukan
app.get('/api/debug-watch', async(req,res) => {
  const {url} = req.query;
  if (!url) return res.status(400).json({error:'url required'});
  try {
    const data = await scrapeWatch(url);
    res.json({
      title: data.title,
      streamCount: data.streams?.length || 0,
      streams: data.streams,
      url,
    });
  } catch(e) { res.status(500).json({error:e.message, url}); }
});


// DEBUG — dump raw HTML dari Gogoanime untuk cek selector
app.get('/api/debug-html', async(req,res) => {
  try {
    const page = parseInt(req.query.page)||1;
    const path = page === 1 ? '/' : `/page/${page}/`;
    const r = await axiosGogo(path);
    const html = typeof r.data === 'string' ? r.data : JSON.stringify(r.data);
    // Kirim 8000 karakter pertama untuk lihat struktur
    res.set('Content-Type','text/plain');
    res.send(html.substring(0, 8000));
  } catch(e) { res.status(500).json({error:e.message}); }
});

if (process.env.NODE_ENV !== 'production' || process.env.VERCEL !== '1') {
  const PORT = process.env.PORT || 3000;
  app.listen(PORT, () => {
    console.log(`\n🚀 Animeku API on port ${PORT}`);
    console.log(`📦 MongoDB: ${process.env.MONGODB_URI ? process.env.MONGODB_URI.substring(0,40)+'...' : 'NOT SET ❌'}`);
    console.log(`🎌 Source: Kuronime (${_activeBase})`);
    console.log(`🌐 Domains: ${KURO_DOMAINS.join(', ')}`);
  });
}

module.exports = app;
