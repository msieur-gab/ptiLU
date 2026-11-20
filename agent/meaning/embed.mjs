// node agent/meaning/embed.mjs: every example sentence of every skill → agent/meaning.json (MiniLM, int8)
import { pipeline, env } from '@xenova/transformers';
import { createRequire } from 'module';
import fs from 'fs'; import path from 'path';
const require = createRequire(import.meta.url);
const here = path.dirname(new URL(import.meta.url).pathname);
env.allowRemoteModels = false; env.localModelPath = path.join(here, '../../docs/agent/meaning/models/');
const pipe = await pipeline('feature-extraction', 'Xenova/all-MiniLM-L6-v2', { quantized: true });
const { load } = require('../load.js');
const { encode } = require('../router.js');
const agent = load({ meaning: false });
const texts = [...new Set(agent.router.items.map(it => it.text))];
const vecs = [];
for (const t of texts) vecs.push(Float32Array.from((await pipe([t], { pooling: 'mean', normalize: true })).data));
const file = path.join(here, '../meaning.json');
fs.writeFileSync(file, JSON.stringify(encode(texts, vecs)));
console.log(`${texts.length} sentences → agent/meaning.json (${(fs.statSync(file).size / 1024).toFixed(0)} KB)`);
