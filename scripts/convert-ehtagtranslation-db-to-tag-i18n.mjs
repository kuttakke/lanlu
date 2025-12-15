import fs from 'node:fs';
import path from 'node:path';

function usage() {
  // eslint-disable-next-line no-console
  console.error('Usage: node scripts/convert-ehtagtranslation-db-to-tag-i18n.mjs <input.json> [output.json]');
  process.exit(2);
}

const inputPath = process.argv[2];
if (!inputPath) usage();

const outputPath =
  process.argv[3] ||
  path.join(process.cwd(), 'tag-i18n.import.json');

const raw = fs.readFileSync(inputPath, 'utf8');
const json = JSON.parse(raw);

const data = Array.isArray(json?.data) ? json.data : null;
if (!data) {
  throw new Error('Unsupported format: expected { data: [...] }');
}

const map = {};
let namespaces = 0;
let items = 0;

function firstLinkUrl(node) {
  if (!node) return '';
  if (typeof node === 'string') return '';
  if (Array.isArray(node)) {
    for (const child of node) {
      const found = firstLinkUrl(child);
      if (found) return found;
    }
    return '';
  }
  if (typeof node === 'object') {
    if (node.type === 'link' && typeof node.url === 'string') return node.url;
    for (const v of Object.values(node)) {
      const found = firstLinkUrl(v);
      if (found) return found;
    }
  }
  return '';
}

function pickText(v) {
  if (!v) return '';
  if (typeof v === 'string') return v.trim();
  if (typeof v === 'object') {
    if (typeof v.text === 'string') return v.text.trim();
    if (typeof v.raw === 'string') return v.raw.trim();
  }
  return '';
}

for (const block of data) {
  const ns = String(block?.namespace || '').trim();
  if (!ns || ns === 'rows') continue;
  const dict = block?.data;
  if (!dict || typeof dict !== 'object' || Array.isArray(dict)) continue;
  namespaces += 1;

  for (const [rawTag, payload] of Object.entries(dict)) {
    const tag = `${ns}:${rawTag}`;
    const name = pickText(payload?.name);
    const intro = pickText(payload?.intro);

    let links = '';
    const linksNode = payload?.links;
    if (linksNode && typeof linksNode === 'object') {
      links = firstLinkUrl(linksNode?.ast) || '';
      if (!links) {
        // fallback: try parse href from html
        const html = typeof linksNode.html === 'string' ? linksNode.html : '';
        const m = html.match(/href="([^"]+)"/i);
        if (m && m[1]) links = m[1];
      }
    }

    if (!name) continue;
    map[tag] = {
      zh: { text: name, intro, links },
      en: { text: '', intro: '', links: '' },
    };
    items += 1;
  }
}

const out = {
  generated_at: new Date().toISOString(),
  source: json?.repo || 'unknown',
  head: json?.head?.sha || '',
  format: 'tag_i18n_rich_v1',
  map,
};

fs.writeFileSync(outputPath, JSON.stringify(out, null, 2), 'utf8');

// eslint-disable-next-line no-console
console.log(`Wrote ${items} tag mappings from ${namespaces} namespaces -> ${outputPath}`);
