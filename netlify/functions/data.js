const fs = require('fs');
const path = require('path');

const LOCAL_FILE = path.join(__dirname, '..', '..', '.trailmate-data.json');
const BLOB_KEY = 'trailmate-shared-data-v1';

const headers = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
  'Content-Type': 'application/json'
};

const emptyData = () => ({
  version: 1,
  updatedAt: new Date().toISOString(),
  profiles: {
    dimitri: { plans: [], sessions: [], races: [], briefs: [] },
    lonny: { plans: [], sessions: [], races: [], briefs: [] }
  }
});

function isServerlessRuntime() {
  return Boolean(
    process.env.NETLIFY ||
    process.env.AWS_LAMBDA_FUNCTION_NAME ||
    process.env.LAMBDA_TASK_ROOT
  );
}

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return { statusCode: 200, headers, body: '' };

  try {
    if (event.httpMethod === 'GET') {
      return { statusCode: 200, headers, body: JSON.stringify(await readData()) };
    }

    if (event.httpMethod === 'POST') {
      const incoming = JSON.parse(event.body || '{}');
      const data = normalize(incoming);
      data.updatedAt = new Date().toISOString();
      await writeData(data);
      return { statusCode: 200, headers, body: JSON.stringify({ ok: true, updatedAt: data.updatedAt }) };
    }

    return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method not allowed' }) };
  } catch (e) {
    return { statusCode: 500, headers, body: JSON.stringify({ error: e.message }) };
  }
};

async function readData() {
  try {
    const { getStore } = await import('@netlify/blobs');
    const store = getStore('trailmate');
    const value = await store.get(BLOB_KEY, { type: 'json', consistency: 'strong' });
    return normalize(value || emptyData());
  } catch (e) {
    if (isServerlessRuntime()) throw new Error(`Netlify Blobs read failed: ${e.message}`);
    if (!fs.existsSync(LOCAL_FILE)) return emptyData();
    return normalize(JSON.parse(fs.readFileSync(LOCAL_FILE, 'utf8')));
  }
}

async function writeData(data) {
  try {
    const { getStore } = await import('@netlify/blobs');
    const store = getStore('trailmate');
    await store.setJSON(BLOB_KEY, data, { consistency: 'strong' });
  } catch (e) {
    if (isServerlessRuntime()) throw new Error(`Netlify Blobs write failed: ${e.message}`);
    fs.writeFileSync(LOCAL_FILE, JSON.stringify(data, null, 2));
  }
}

function normalize(data) {
  const base = emptyData();
  const src = data && typeof data === 'object' ? data : {};
  base.version = Number(src.version || 1);
  base.updatedAt = src.updatedAt || base.updatedAt;
  for (const id of Object.keys(base.profiles)) {
    const p = src.profiles?.[id] || {};
    base.profiles[id] = {
      plans: Array.isArray(p.plans) ? p.plans : [],
      sessions: Array.isArray(p.sessions) ? p.sessions : [],
      races: Array.isArray(p.races) ? p.races : [],
      briefs: Array.isArray(p.briefs) ? p.briefs : []
    };
  }
  return base;
}
