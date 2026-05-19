const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
const GITHUB_USER = 'meshoomohsen20';
const GITHUB_REPO = 'orders-site';
const FILE_PATH = 'orders.json';
const API_BASE = `https://api.github.com/repos/${GITHUB_USER}/${GITHUB_REPO}/contents/${FILE_PATH}`;

async function getFile() {
  const res = await fetch(API_BASE, {
    headers: {
      Authorization: `token ${GITHUB_TOKEN}`,
      Accept: 'application/vnd.github.v3+json',
    },
  });
  if (res.status === 404) return { content: [], sha: null };
  const data = await res.json();
  const content = JSON.parse(Buffer.from(data.content, 'base64').toString('utf8'));
  return { content, sha: data.sha };
}

async function saveFile(content, sha) {
  const body = {
    message: 'update orders',
    content: Buffer.from(JSON.stringify(content, null, 2)).toString('base64'),
  };
  if (sha) body.sha = sha;
  const res = await fetch(API_BASE, {
    method: 'PUT',
    headers: {
      Authorization: `token ${GITHUB_TOKEN}`,
      Accept: 'application/vnd.github.v3+json',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });
  return res.ok;
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  try {
    if (req.method === 'GET') {
      const { content } = await getFile();
      return res.status(200).json(content);
    }

    if (req.method === 'POST') {
      const { content, sha } = await getFile();
      const newOrder = req.body;
      content.unshift(newOrder);
      await saveFile(content, sha);
      return res.status(200).json({ ok: true });
    }

    if (req.method === 'PUT') {
      const { content, sha } = await getFile();
      const updated = req.body;
      const idx = content.findIndex(o => o.id === updated.id);
      if (idx !== -1) content[idx] = updated;
      await saveFile(content, sha);
      return res.status(200).json({ ok: true });
    }

    if (req.method === 'DELETE') {
      const { id } = req.body;
      const { content, sha } = await getFile();
      const filtered = content.filter(o => o.id !== id);
      await saveFile(filtered, sha);
      return res.status(200).json({ ok: true });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
