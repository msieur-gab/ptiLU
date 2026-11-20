// node engine/meaning/compare.mjs [path to my-agent]: the engine against my-agent, on the same questions.
//   my-agent main      keyword matcher (src/assets/js/match.js), as on the live site
//   my-agent feat/nlu  MiniLM rank() first (its index and floors), then the keyword matcher
//   the engine         as on the test page: words, then meaning
// Two sets: my-agent's tests/held-out.json (both systems' thresholds were chosen on it) and the questions
// logged in my-agent's docs/questions.md with their candidate answer (a live piece, or "invitation": the
// site should invite the visitor to send it), on which neither was tuned.
import { pipeline, env } from '@xenova/transformers';
import { createRequire } from 'module';
import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
const require = createRequire(import.meta.url);
const here = path.dirname(new URL(import.meta.url).pathname);
const MA = path.resolve(process.argv[2] || path.join(here, '../../../my-agent'));
env.allowRemoteModels = false; env.localModelPath = path.join(here, '../../docs/engine/meaning/models/');
const pipe = await pipeline('feature-extraction', 'Xenova/all-MiniLM-L6-v2', { quantized: true });
const emb = async t => Float32Array.from((await pipe([t], { pooling: 'mean', normalize: true })).data);
const show = f => execSync(`git -C "${MA}" show ${f}`, { maxBuffer: 1 << 26 });
const tmp = fs.mkdtempSync('/tmp/cmp-');
const load = (name, f) => { fs.writeFileSync(path.join(tmp, name), show(f)); return require(path.join(tmp, name)); };
const answers = JSON.parse(fs.readFileSync(path.join(MA, 'public/answers.json'), 'utf8')); // python3 build/build.py in my-agent first
const Main = load('match-main.js', 'origin/main:src/assets/js/match.js'), mainIdx = Main.prepare(answers.pieces);
const Nlu = load('nlu.js', 'origin/feat/nlu:src/assets/js/nlu.js');
const nluIndex = JSON.parse(show('origin/feat/nlu:src/assets/nlu/index.json')), nluVec = new Int8Array(show('origin/feat/nlu:src/assets/nlu/vectors.bin').buffer.slice(0));
const { make } = require('../make.js');

const live = new Set(answers.pieces.map(p => p.slug));
const kw = q => { const v = Main.verdict(Main.search(mainIdx, q)); return v.kind === 'none' ? null : v.results[0].piece.slug; };
const systems = {
  'my-agent main (keywords)': async q => kw(q),
  'my-agent feat/nlu (MiniLM, then keywords)': async q => { const r = Nlu.rank(nluIndex, nluVec, await emb(q)); return r.question ? r.question.slug : r.passages.length ? r.passages[0].slug : kw(q); },
  'the engine (words, then meaning)': async q => {
    const e = make(), r = e.respond(q);
    const doc = () => e.frame && e.frame.kind === 'content' ? e.content.docs[e.frame.di].id : null;
    if (r.outcome === 'act' && r.source) return doc();
    if (r.outcome === 'abstain' && r.meaning) { const m = e.byMeaning(q, await emb(q)); if (m && m.outcome === 'act' && m.source) return doc(); if (m && m.outcome === 'ask' && !m.skill) return 'asks'; }
    return null;
  },
};
const held = JSON.parse(fs.readFileSync(path.join(MA, 'tests/held-out.json'), 'utf8'));
const sets = {
  'held-out.json, answerable (56)': held.answerable.map(x => ({ q: x.q, want: x.piece })),
  'held-out.json, off-topic + requests (35)': [...held.far, ...held.requests].map(q => ({ q, want: 'none' })),
};
// docs/questions.md: | question | candidate answer | fit |
const log = [];
for (const line of fs.readFileSync(path.join(MA, 'docs/questions.md'), 'utf8').split('\n')) {
  if (!line.startsWith('|')) continue;
  const [q, cand = ''] = line.replace(/^\||\|$/g, '').split('|').map(s => s.trim());
  if (!q || q === 'Question' || /^[-: ]+$/.test(q)) continue;
  const low = cand.toLowerCase(), names = { senz: 'senz', pebbble: 'pebbble', datadraw: 'autoflow', autoflow: 'autoflow', dowgo: 'dowgo', vrooom: 'vrooom' };
  const want = Object.entries(names).filter(([k]) => low.includes(k)).map(([, v]) => v);
  if (low.startsWith('invitation')) log.push({ q, want: 'none' }); else if (want.length) log.push({ q, want });
}
sets[`questions.md, a live piece expected (${log.filter(x => x.want !== 'none').length})`] = log.filter(x => x.want !== 'none');
sets[`questions.md, "invitation" expected (${log.filter(x => x.want === 'none').length})`] = log.filter(x => x.want === 'none');

for (const [label, rows] of Object.entries(sets)) {
  console.log(`\n${label}`);
  for (const [name, f] of Object.entries(systems)) {
    const t = { right: 0, 'asks "do you mean"': 0, nothing: 0, 'wrong piece': 0, answered: 0 };
    for (const { q, want } of rows) {
      const got = await f(q);
      if (want === 'none') t[got === null ? 'nothing' : got === 'asks' ? 'asks "do you mean"' : 'answered']++;
      else if (got === null) t.nothing++; else if (got === 'asks') t['asks "do you mean"']++;
      else if (want.includes(got)) t.right++; else t['wrong piece']++;
      if (process.argv.includes('-v') && name.startsWith('the engine') && got && got !== 'asks' && (want === 'none' || !want.includes(got))) console.log(`      ${want === 'none' ? 'answered' : 'wrong'}: "${q}" → ${got}`);
    }
    const keys = want0 => Object.entries(t).filter(([k, v]) => v || ['right', 'nothing', 'answered'].includes(k));
    console.log(`  ${name.padEnd(44)} ${keys().map(([k, v]) => `${k} ${v}`).join(' · ')}`);
  }
}
