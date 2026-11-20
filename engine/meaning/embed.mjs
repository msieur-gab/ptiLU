// node engine/meaning/embed.mjs: every listed question and passage of the packs → engine/meaning.json
// (int8 vectors, one per item). Build-time only, after `npm install` in engine/meaning. The model is the
// one the page loads (docs/engine/meaning/models), so the page's question vectors and these match.
// Run again whenever a content file changes.
import { pipeline, env } from '@xenova/transformers';
import { createRequire } from 'module';
import fs from 'fs';
import path from 'path';
const require = createRequire(import.meta.url);
const here = path.dirname(new URL(import.meta.url).pathname);
env.allowRemoteModels = false;
env.localModelPath = path.join(here, '../../docs/engine/meaning/models/');
const pipe = await pipeline('feature-extraction', 'Xenova/all-MiniLM-L6-v2', { quantized: true });
const { make } = require('../make.js');
const items = make({ withMeaning: false }).meaningItems(); // the content's questions and passages, the skills' examples
const dims = 384, bytes = new Int8Array(items.length * dims), scales = [];
const t0 = Date.now();
for (let i = 0; i < items.length; i++) {
  const v = (await pipe([items[i].text], { pooling: 'mean', normalize: true })).data;
  const mx = Math.max(...v.map(Math.abs)) || 1;
  scales.push(+(mx / 127).toPrecision(6));
  for (let j = 0; j < dims; j++) bytes[i * dims + j] = Math.round(v[j] / mx * 127);
}
const out = { model: 'Xenova/all-MiniLM-L6-v2 (8-bit)', dims, keys: items.map(x => x.key), scales, int8: Buffer.from(bytes.buffer).toString('base64') };
fs.writeFileSync(path.join(here, '../meaning.json'), JSON.stringify(out));
console.log(`${items.length} items embedded in ${((Date.now() - t0) / 1000).toFixed(1)} s → engine/meaning.json (${(fs.statSync(path.join(here, '../meaning.json')).size / 1024).toFixed(0)} KB)`);
