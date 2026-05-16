const headers = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Allow-Methods': 'POST,OPTIONS',
  'Content-Type': 'application/json'
};

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return { statusCode: 200, headers, body: '' };
  if (event.httpMethod !== 'POST') return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method not allowed' }) };
  try {
    const { query } = JSON.parse(event.body || '{}');
    const q = String(query || '').trim();
    if (!q) return { statusCode: 400, headers, body: JSON.stringify({ error: 'Query required' }) };
    const results = await searchWeb(`${q} trail course date distance denivele site officiel`);
    const pages = await fetchPages(results.slice(0, 4));
    const races = process.env.OPENAI_API_KEY
      ? await extractWithOpenAI(q, results, pages)
      : fallbackExtract(results);
    return { statusCode: 200, headers, body: JSON.stringify({ races: races.slice(0, 6), sources: results }) };
  } catch (e) {
    return { statusCode: 500, headers, body: JSON.stringify({ error: { message: e.message } }) };
  }
};

async function searchWeb(query) {
  const url = `https://duckduckgo.com/html/?q=${encodeURIComponent(query)}`;
  const res = await fetch(url, { headers: { 'User-Agent': 'TrailMate/1.0 (+https://trailmate-v2.netlify.app)' } });
  if (!res.ok) throw new Error(`Search failed ${res.status}`);
  const html = await res.text();
  const blocks = html.split('result__title').slice(1, 8);
  return blocks.map(block => {
    const href = decodeHtml((block.match(/href="([^"]+)"/) || [])[1] || '');
    const title = cleanText((block.match(/>([^<]{4,})<\/a>/) || [])[1] || '');
    const snippet = cleanText((block.match(/result__snippet[\s\S]*?>([\s\S]*?)<\/a>/) || block.match(/result__snippet[\s\S]*?>([\s\S]*?)<\/div>/) || [])[1] || '');
    return { title, url: normalizeDuckUrl(href), snippet };
  }).filter(r => r.title || r.url);
}

function normalizeDuckUrl(url) {
  try {
    const u = new URL(url);
    if (u.searchParams.get('uddg')) return u.searchParams.get('uddg');
  } catch (e) {}
  return url;
}

async function fetchPages(results) {
  const jobs = results.map(async r => {
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 4500);
      const res = await fetch(r.url, { signal: controller.signal, headers: { 'User-Agent': 'TrailMate/1.0' } });
      clearTimeout(timer);
      if (!res.ok) return { ...r, text: '' };
      const html = await res.text();
      return { ...r, text: cleanText(html.replace(/<script[\s\S]*?<\/script>/gi, ' ').replace(/<style[\s\S]*?<\/style>/gi, ' ').replace(/<[^>]+>/g, ' ')).slice(0, 4500) };
    } catch (e) {
      return { ...r, text: '' };
    }
  });
  return Promise.all(jobs);
}

async function extractWithOpenAI(query, results, pages) {
  const input = pages.map((p, i) => `SOURCE ${i + 1}\nTITLE: ${p.title}\nURL: ${p.url}\nSNIPPET: ${p.snippet}\nTEXT: ${p.text}`).join('\n\n---\n\n');
  const res = await fetch('https://api.openai.com/v1/responses', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`
    },
    body: JSON.stringify({
      model: process.env.OPENAI_MODEL || 'gpt-4.1-mini',
      instructions: `Tu extrais des courses trail réelles depuis des résultats web. Réponds uniquement en JSON valide: {"races":[{"name":"","date":"YYYY-MM-DD ou vide","distance_km":0,"elevation_m":0,"location":"","url":"","note":""}]}. N'invente pas. Si une donnée est incertaine, laisse vide/0 et explique brièvement dans note. Privilégie le site officiel.`,
      input: `Recherche utilisateur: ${query}\n\n${input}`,
      max_output_tokens: 1800,
      store: false
    })
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error?.message || `OpenAI ${res.status}`);
  const text = extractOpenAIText(data);
  const parsed = JSON.parse(text.match(/\{[\s\S]*\}/)?.[0] || '{"races":[]}');
  return normalizeRaces(parsed.races || [], results);
}

function fallbackExtract(results) {
  return normalizeRaces(results.map(r => ({
    name: r.title,
    date: findDate(`${r.title} ${r.snippet}`),
    distance_km: findNumber(`${r.title} ${r.snippet}`, /(\d+(?:[,.]\d+)?)\s*km/i),
    elevation_m: findNumber(`${r.title} ${r.snippet}`, /(\d{2,5})\s*(?:m\+|d\+|D\+)/i),
    location: '',
    url: r.url,
    note: r.snippet || 'Infos extraites du résultat de recherche, à vérifier.'
  })), results);
}

function normalizeRaces(races, sources) {
  return races.map((r, i) => ({
    name: cleanText(r.name || sources[i]?.title || 'Course'),
    date: normalizeDate(r.date || ''),
    distance_km: Number(String(r.distance_km || '').replace(',', '.')) || 0,
    elevation_m: Number(String(r.elevation_m || '').replace(/[^\d]/g, '')) || 0,
    location: cleanText(r.location || ''),
    url: r.url || sources[i]?.url || '',
    note: cleanText(r.note || 'À vérifier avec la source officielle.')
  })).filter(r => r.name || r.url);
}

function findDate(text) {
  const iso = text.match(/\b(20\d{2})[-/](\d{1,2})[-/](\d{1,2})\b/);
  if (iso) return `${iso[1]}-${iso[2].padStart(2, '0')}-${iso[3].padStart(2, '0')}`;
  return '';
}

function normalizeDate(date) {
  const m = String(date || '').match(/\b(20\d{2})-(\d{1,2})-(\d{1,2})\b/);
  return m ? `${m[1]}-${m[2].padStart(2, '0')}-${m[3].padStart(2, '0')}` : '';
}

function findNumber(text, regex) {
  const m = text.match(regex);
  return m ? Number(String(m[1]).replace(',', '.')) || 0 : 0;
}

function extractOpenAIText(data) {
  if (typeof data.output_text === 'string') return data.output_text;
  const chunks = [];
  for (const item of data.output || []) for (const content of item.content || []) if (typeof content.text === 'string') chunks.push(content.text);
  return chunks.join('\n').trim();
}

function decodeHtml(s) {
  return String(s || '').replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#x27;/g, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>');
}

function cleanText(s) {
  return decodeHtml(String(s || '').replace(/\s+/g, ' ').trim());
}
