// node agent/meaning/bars.mjs: the "sure" bar and gap, chosen on the question skills' own examples, each
// asked with itself left out; a wrong answer counts three times a right one. Never on held-out.json
import { pipeline, env } from '@xenova/transformers';
import { createRequire } from 'module';
import path from 'path';
const require = createRequire(import.meta.url);
const here = path.dirname(new URL(import.meta.url).pathname);
env.allowRemoteModels = false; env.localModelPath = path.join(here, '../../docs/agent/meaning/models/');
const pipe = await pipeline('feature-extraction', 'Xenova/all-MiniLM-L6-v2', { quantized: true });
const a = require('../load.js').load();
const items = a.router.items.filter(it => !it.neg && ['question', 'about', 'contact'].includes(a.byName.get(it.skill).kind) && !/^\w+( \w+)?$/.test(it.text));
const runs = [];
for (const it of items) {
  const i = a.router.items.indexOf(it);
  a.router.items.splice(i, 1);
  runs.push({ want: it.skill, r: a.router.rank(it.text, Float32Array.from((await pipe([it.text], { pooling: 'mean', normalize: true })).data)) });
  a.router.items.splice(i, 0, it);
}
const rows = [];
for (let sure = 0.45; sure <= 0.75; sure += 0.025) for (const gap of [0, 0.02, 0.04, 0.06, 0.08]) {
  let right = 0, wrong = 0;
  for (const { want, r: [x, y] } of runs) if (x.score >= sure && (!y || x.score - y.score >= gap)) x.skill === want ? right++ : wrong++;
  rows.push({ sure: +sure.toFixed(3), gap, right, wrong, value: right - 3 * wrong });
}
rows.sort((p, q) => q.value - p.value || q.right - p.right);
console.log(`${runs.length} examples (question, about and contact skills), each with itself left out`);
for (const r of rows.slice(0, 6)) console.log(`  sure ${r.sure} gap ${r.gap}: right ${r.right} · wrong ${r.wrong}`);
