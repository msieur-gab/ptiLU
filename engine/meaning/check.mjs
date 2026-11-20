// node engine/meaning/check.mjs: the whole engine, words then meaning, on my-agent's held-out questions
// (if the repo is beside this one) and on sentences Gab found missing. Build-time tool, like embed.mjs.
import { pipeline, env } from '@xenova/transformers';
import { createRequire } from 'module';
import fs from 'fs';
import path from 'path';
const require = createRequire(import.meta.url);
const here = path.dirname(new URL(import.meta.url).pathname);
env.allowRemoteModels = false;
env.localModelPath = path.join(here, '../../docs/engine/meaning/models/');
const pipe = await pipeline('feature-extraction', 'Xenova/all-MiniLM-L6-v2', { quantized: true });
const emb = async t => Float32Array.from((await pipe([t], { pooling: 'mean', normalize: true })).data);
const { make } = require('../make.js');
async function ask(e, s) {
  const r = e.respond(s);
  if (r.outcome !== 'abstain' || !r.meaning) return { ...r, by: 'words' };
  const m = e.byMeaning(s, await emb(s));
  return m ? { ...m, by: 'meaning' } : { ...r, by: 'nothing' };
}
const gab = ['is it a problem to have data hosted outside of European union',
  'we are launching a new product but would like to evaluate doing the launch without advertising',
  'we are building a due diligence platform but all users complain that is very hard to organize the fire. how will you approach such a problem?',
  'we are building a jewel diligence platform and research for designer. are you working on that',
  'we need help to design a due diligence plate-forme',
  'how much data privacy is influencing your design process?'];
for (const s of gab) { const r = await ask(make(), s); console.log(`> ${s}\n  [${r.by} · ${r.outcome} · ${r.why}] ${r.say.slice(0, 110)}${r.chips && r.chips.length ? '\n  chips: ' + r.chips.join(' | ') : ''}`); }
const H = path.join(here, '../../../my-agent/tests/held-out.json');
if (fs.existsSync(H)) {
  const h = JSON.parse(fs.readFileSync(H, 'utf8'));
  const t = {};
  for (const set of ['answerable', 'near', 'far', 'requests']) for (const x of h[set]) {
    const e = make(), q = typeof x === 'string' ? x : x.q, r = await ask(e, q);
    const piece = r.source && e.frame && e.frame.kind === 'content' ? e.content.docs[e.frame.di].id : null;
    const k = r.outcome === 'act' && piece ? (set !== 'answerable' ? 'answered' : x.piece.includes(piece) ? `right (${r.by})` : 'wrong') : r.outcome === 'ask' ? 'asked "do you mean"' : 'nothing';
    (t[set] = t[set] || {})[k] = (t[set][k] || 0) + 1;
  }
  for (const [set, v] of Object.entries(t)) console.log(set.padEnd(11), JSON.stringify(v));
}

// taught by meaning: a sentence taught to a listed question finds it again worded differently
{
  const { teachQuestion } = require('../learn.js');
  const e = make();
  const taughtS = 'is it a problem to have data hosted outside of European union';
  const t = teachQuestion(e, taughtS, 'AutoFlow', 'Our compliance tool is hosted in the US. Is that a problem?');
  e.addMeaning(t.key, await emb(taughtS));
  for (const s of ['can we keep our records on servers in America?', 'is storing personal data abroad allowed?']) {
    const before = await ask(make(), s), after = await ask(e, s);
    const show = r => `[${r.by} · ${r.outcome} · ${r.why}] ${r.say.slice(0, 70)}${r.outcome === 'ask' ? ' → ' + r.chips.slice(0, 2).join(' | ') : ''}`;
    console.log(`taught by meaning · "${s}"\n  before: ${show(before)}\n  after:  ${show(after)}`);
  }
}
// skills by meaning: never done on a guess, asked first
for (const s of ['ping me in a quarter of an hour', 'could you make sure I remember the dentist on monday']) {
  const r = await ask(make(), s); console.log(`skill by meaning · "${s}" → [${r.by} · ${r.outcome} · ${r.why}] ${r.say}`);
}
