// node agent/meaning/classifier.mjs: ptiLU's own classifier (main's TF-IDF + logistic regression,
// web/trainer.js) against MiniLM's nearest example, as the router of the agent, on the same sentences.
//   trained on: every skill's examples (as the router uses them), plus 20 "I can't" lines kept from the
//   engine's out-of-scope lists (out_of_scope)
//   tested on: my-agent's tests/held-out.json and docs/questions.md L, never trained on
//   bars: each router's "sure" bar chosen on the skills' own examples (5 folds for the classifier, each
//   example left out for MiniLM), a wrong answer counting three times a right one
//   teaching: half the test sentences taught (an example added; the classifier retrained), the other
//   half measured, 5 splits
import { pipeline, env } from '@xenova/transformers';
import { createRequire } from 'module';
import fs from 'fs'; import path from 'path';
const require = createRequire(import.meta.url);
const here = path.dirname(new URL(import.meta.url).pathname);
env.allowRemoteModels = false; env.localModelPath = path.join(here, '../../docs/agent/meaning/models/');
const pipe = await pipeline('feature-extraction', 'Xenova/all-MiniLM-L6-v2', { quantized: true });
const cache = new Map();
const emb = async t => cache.get(t) || (cache.set(t, Float32Array.from((await pipe([t], { pooling: 'mean', normalize: true })).data)), cache.get(t));
const Trainer = require('../../web/trainer.js'), R = require('../../web/runtime.js');
const { load } = require('../load.js');
const MA = path.join(here, '../../../my-agent');
const a = load({ random: () => 0 });

const OOS = ['book me a flight to Lisbon', "what's the weather like", 'play some jazz', 'send an email to Eva', 'order a pizza',
  'translate this into French', 'write me a poem', "what's the capital of Peru", 'turn on the lights in the kitchen', 'call mum',
  'how much is a bitcoin', 'delete all my files', 'tell me a joke', "what's the news today", 'open the terminal',
  'who won the match last night', 'how do I cook rice', 'recommend a good movie', 'what is the population of Japan', 'fix my wifi'];
const trainSet = (extra = []) => [...a.router.items.filter(it => !it.neg).map(it => ({ intent: it.skill, text: it.text })), ...extra,
  ...OOS.map(text => ({ intent: 'out_of_scope', text }))].map(e => ({ ...e, spans: [], noSlots: true }));
const trainLR = ex => new R.NLU(Trainer.train(ex, { log: () => {} }));

// ---- the routers: { skill, score, second } ------------------------------------------------------------
const meaning = async q => {
  const r = a.router.rank(q, await emb(q));
  return { skill: r[0].skill, score: r[0].score, gap: r[0].score - (r[1] ? r[1].score : 0) };
};
const words = async q => { const r = a.router.rank(q, null); return { skill: r[0].skill, score: r[0].score, gap: r[0].score - (r[1] ? r[1].score : 0) }; };
const lrRoute = nlu => q => { const [[skill, p], [, p2] = [null, 0]] = nlu.classify(q); return { skill, score: p, gap: p - p2 }; };

// ---- the sentences, with where they should go ----------------------------------------------------------
const held = JSON.parse(fs.readFileSync(path.join(MA, 'tests/held-out.json'), 'utf8'));
const md = fs.readFileSync(path.join(MA, 'docs/questions.md'), 'utf8');
const L = md.slice(md.indexOf('## L.'), md.indexOf('## When nothing matches')).split('\n')
  .filter(l => /^\| [^|]*\S[^|]* \|/.test(l) && !/^\| (Question|---)/.test(l)).map(l => l.split('|')[1].trim());
const ABOUT = { 'Where are you based?': 'who-i-am', 'What is your background?': 'who-i-am', 'How many years of experience do you have?': 'who-i-am',
  'What is your process?': 'what-i-do', 'How do you start a project?': 'what-i-do', 'What makes you different?': 'what-i-do',
  'Why should I hire you?': 'what-i-do', 'What does "the question nobody asked" mean?': 'what-i-do' };
const sets = {
  'a project expected (56)': held.answerable.map(x => ({ q: x.q, ok: s => (a.byName.get(s) || {}).leads?.some(p => x.piece.includes(p)) })),
  'requests (10)': held.requests.map(q => ({ q, ok: s => (a.byName.get(s) || {}).kind === 'contact' })),
  'questions about Gab (44)': L.map(q => ({ q, ok: s => ABOUT[q] ? s === ABOUT[q] : (a.byName.get(s) || {}).kind === 'contact' })),
  'off-topic (25)': held.far.map(q => ({ q, far: true })),
};

// ---- the "sure" bars, on the skills' own examples ----------------------------------------------------------
const items = a.router.items.filter(it => !it.neg && ['question', 'about', 'contact'].includes(a.byName.get(it.skill).kind));
const pick = runs => {
  let best = null;
  for (let sure = 0.2; sure <= 0.95; sure += 0.025) for (const gap of [0, 0.04, 0.08, 0.12, 0.2]) {
    let right = 0, wrong = 0;
    for (const { want, r } of runs) if (r.score >= sure && r.gap >= gap) r.skill === want ? right++ : wrong++;
    if (!best || right - 3 * wrong > best.v) best = { sure: +sure.toFixed(3), gap, v: right - 3 * wrong, right, wrong };
  }
  return best;
};
const mRuns = [];
for (const it of items) { const i = a.router.items.indexOf(it); a.router.items.splice(i, 1); mRuns.push({ want: it.skill, r: await meaning(it.text) }); a.router.items.splice(i, 0, it); }
const wRuns = [];
for (const it of items) { const i = a.router.items.indexOf(it); a.router.items.splice(i, 1); a.router.reindex(); wRuns.push({ want: it.skill, r: await words(it.text) }); a.router.items.splice(i, 0, it); }
a.router.reindex();
const lrRuns = [];
const folds = 5, shuffled = items.map((it, i) => ({ it, k: (i * 7919) % folds }));
for (let k = 0; k < folds; k++) {
  const out = new Set(shuffled.filter(x => x.k === k).map(x => x.it.text));
  const nlu = trainLR(trainSet().filter(e => !out.has(e.text)));
  for (const x of shuffled.filter(x => x.k === k)) lrRuns.push({ want: x.it.skill, r: lrRoute(nlu)(x.it.text) });
}
const BAR = { meaning: pick(mRuns), classifier: pick(lrRuns), words: pick(wRuns) };
console.log(`bars, on the skills' own examples (${items.length}):`);
for (const [k, b] of Object.entries(BAR)) console.log(`  ${k.padEnd(11)} sure ${b.sure}, gap ${b.gap}: right ${b.right}, wrong ${b.wrong}`);

// ---- the sentences never seen ----------------------------------------------------------------------------
const t0 = Date.now(), NLU = trainLR(trainSet()), trainSecs = ((Date.now() - t0) / 1000).toFixed(1);
const routers = {
  meaning: q => meaning(q),
  classifier: async q => lrRoute(NLU)(q),
  words: q => words(q),
  'both agree': async q => { const m = await meaning(q), c = lrRoute(NLU)(q); return m.skill === c.skill ? { skill: m.skill, score: 1, gap: 1 } : { skill: m.skill, score: 0, gap: 0 }; },
};
const sureOf = name => name === 'both agree' ? { sure: 0.5, gap: 0 } : BAR[name];
console.log(`\nthe classifier trains in ${trainSecs} s on ${trainSet().length} sentences, ${NLU.m.intents.length} skills\n`);
console.log('sentences never seen: nearest skill right · sure and right · sure and wrong');
for (const [label, rows] of Object.entries(sets)) {
  console.log(`  ${label}`);
  for (const [name, f] of Object.entries(routers)) {
    let top = 0, sr = 0, sw = 0;
    const b = sureOf(name);
    for (const x of rows) {
      const r = await f(x.q), sure = r.score >= b.sure && r.gap >= b.gap;
      if (x.far) { if (sure && r.skill !== 'out_of_scope') sw++; else sr++; continue; }
      const ok = x.ok(r.skill);
      if (ok) top++;
      if (sure) ok ? sr++ : sw++;
    }
    console.log(`    ${name.padEnd(11)} ${rows[0].far ? `left alone ${sr} · answered ${sw}` : `${top} · ${sr} · ${sw}`}`);
  }
}

// ---- teaching ----------------------------------------------------------------------------------------------
const pool = [...sets['a project expected (56)'], ...sets['requests (10)'], ...sets['questions about Gab (44)']];
const dest = async x => { // the right skill for a sentence: the nearest (by meaning) of the skills that are right for it
  const r = a.router.rank(x.q, await emb(x.q)).find(z => x.ok(z.skill));
  return r ? r.skill : a.skills.find(s => x.ok(s.name)).name;
};
let seed = 1;
const rand = () => { seed = (seed * 1103515245 + 12345) % 2147483648; return seed / 2147483648; };
const shuffle = l => { l = l.slice(); for (let i = l.length - 1; i > 0; i--) { const j = Math.floor(rand() * (i + 1)); [l[i], l[j]] = [l[j], l[i]]; } return l; };
const res = { meaning: [0, 0, 0, 0], classifier: [0, 0, 0, 0] }; // before: sure-right, sure-wrong; after: same
let n = 0, taughtN = 0;
for (let s = 0; s < 5; s++) {
  seed = 1000 + s * 7919;
  const mix = shuffle(pool), teach = mix.filter((x, i) => i % 2 === 0), test = mix.filter((x, i) => i % 2 === 1);
  const missed = [];
  for (const x of teach) { const r = await meaning(x.q); if (!(x.ok(r.skill) && r.score >= BAR.meaning.sure && r.gap >= BAR.meaning.gap)) missed.push(x); }
  const extra = [];
  for (const x of missed) extra.push({ intent: await dest(x), text: x.q });
  taughtN += extra.length;
  // before, then after: the same sentences added as examples (meaning), and the classifier retrained with them
  const count = async (name, f, k) => { const b = BAR[name]; for (const x of test) { const r = await f(x.q); if (r.score >= b.sure && r.gap >= b.gap) res[name][k + (x.ok(r.skill) ? 0 : 1)]++; } };
  await count('meaning', q => meaning(q), 0);
  await count('classifier', async q => lrRoute(NLU)(q), 0);
  const saved = a.router.items.length;
  for (const e of extra) a.router.add(e.intent, e.text, await emb(e.text));
  const NLU2 = trainLR(trainSet(extra));
  await count('meaning', q => meaning(q), 2);
  await count('classifier', async q => lrRoute(NLU2)(q), 2);
  a.router.items.length = saved; a.router.reindex();
  n += test.length;
}
console.log(`\nteaching: half of ${pool.length} sentences, every miss taught (${(taughtN / 5).toFixed(0)} on average), the other half measured (${n / 5}), 5 splits`);
for (const [name, [br, bw, ar, aw]] of Object.entries(res)) console.log(`  ${name.padEnd(11)} sure and right ${(br / 5).toFixed(1)} → ${(ar / 5).toFixed(1)} · sure and wrong ${(bw / 5).toFixed(1)} → ${(aw / 5).toFixed(1)}`);
