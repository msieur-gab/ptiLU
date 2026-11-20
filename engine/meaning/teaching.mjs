// node engine/meaning/teaching.mjs [path to my-agent] [-v]
// Does teaching make ptiLU better on questions it was never taught? The engine is frozen (engine-site as
// it is); only teaching changes. The questions come from my-agent (tests/held-out.json, docs/questions.md),
// each with where it should go. They're split in two, at random: one half is taught, the other is only
// ever tested. Teaching goes through the inbox's own code (learn.js teachQuestion / teach, the vector with
// addMeaning, the model retrained after a skill is taught), as the page does it. The test half is measured
// before teaching and after 10, 20, 40 and all taught sentences, over 5 different splits.
//
// Two ways of teaching:
//   inbox        only what the page lets you teach: sentences it answered "I can't" to (they land in the
//                inbox). A wrong answer never reaches the inbox, so it can't be corrected
//   every miss   every taught-half sentence it doesn't get right, wrong answers too (what a "that's wrong"
//                button would allow)
// For each sentence, the teacher picks the right place: for a project question, the listed question of the
// right file nearest in meaning (what the inbox suggests, or "another question…"); for a question about
// Gab, the site skill whose reply answers it; for the rest, "write to me" (the contact form).
import { pipeline, env } from '@xenova/transformers';
import { createRequire } from 'module';
import fs from 'fs';
import path from 'path';
const require = createRequire(import.meta.url);
const here = path.dirname(new URL(import.meta.url).pathname);
const MA = path.resolve(process.argv.find((a, i) => i > 1 && !a.startsWith('-')) || path.join(here, '../../../my-agent'));
const V = process.argv.includes('-v');
env.allowRemoteModels = false; env.localModelPath = path.join(here, '../../docs/engine/meaning/models/');
const pipe = await pipeline('feature-extraction', 'Xenova/all-MiniLM-L6-v2', { quantized: true });
const emb = async t => Float32Array.from((await pipe([t], { pooling: 'mean', normalize: true })).data);

const { load } = require('../load.js');
const { Engine } = require('../engine.js');
const { Content, decodeMeaning } = require('../content.js');
const { examples } = require('../train.js');
const L = require('../learn.js');
const R = require('../../web/runtime.js');
const Trainer = require('../../web/trainer.js');
const MODEL = JSON.parse(fs.readFileSync(path.join(here, '../model.json'), 'utf8'));
const MEANING = JSON.parse(fs.readFileSync(path.join(here, '../meaning.json'), 'utf8'));

// ---- the questions and where each should go -------------------------------------------------------
const pool = [];
const held = JSON.parse(fs.readFileSync(path.join(MA, 'tests/held-out.json'), 'utf8'));
for (const x of held.answerable) pool.push({ q: x.q, want: { docs: x.piece }, from: 'held-out' });
for (const q of held.requests) pool.push({ q, want: { form: true }, from: 'requests' });
const guard = held.far.map(q => ({ q, from: 'off-topic' })); // never taught: must stay unanswered by Gab's content or replies

const md = fs.readFileSync(path.join(MA, 'docs/questions.md'), 'utf8');
const live = { senz: 'senz', pebbble: 'pebbble', datadraw: 'autoflow', autoflow: 'autoflow', dowgo: 'dowgo', vrooom: 'vrooom' };
const AK = md.slice(md.indexOf('## A.'), md.indexOf('## L.')), SL = md.slice(md.indexOf('## L.'), md.indexOf('## When nothing matches'));
const rows = s => s.split('\n').filter(l => l.startsWith('| ') && !/^\| (Question|---)/.test(l)).map(l => l.replace(/^\||\|$/g, '').split('|').map(c => c.trim()));
for (const [q, cand = ''] of rows(AK)) {
  const docs = Object.entries(live).filter(([k]) => cand.toLowerCase().includes(k)).map(([, v]) => v);
  pool.push({ q, want: docs.length ? { docs: [...new Set(docs)] } : { form: true }, from: 'questions A–K' });
}
// questions about Gab: a site skill when its reply answers the question, otherwise the contact form
const ABOUT = {
  'Where are you based?': 'who-i-am', 'What is your background?': 'who-i-am', 'How many years of experience do you have?': 'who-i-am',
  'What is your process?': 'what-i-do', 'How do you start a project?': 'what-i-do', 'What makes you different?': 'what-i-do',
  'Why should I hire you?': 'what-i-do', 'What does "the question nobody asked" mean?': 'what-i-do',
};
for (const [q] of rows(SL)) pool.push({ q, want: ABOUT[q] ? { skill: ABOUT[q] } : { form: true }, from: 'questions L' });

const vec = new Map();
for (const x of [...pool, ...guard]) vec.set(x.q, await emb(x.q));

// ---- a fresh engine, as the page builds it ---------------------------------------------------------
function fresh() {
  const packs = load();
  const content = new Content(packs.docs, packs.talk.small, packs.topics);
  const e = new Engine({ skills: packs.skills, content, talk: packs.talk, model: new R.NLU(MODEL), random: () => 0, now: () => new Date('2026-11-20T10:00:00') });
  e.setMeaning(decodeMeaning(JSON.parse(JSON.stringify(MEANING))));
  e.packs = packs;
  return e;
}
const reset = e => { e.pending = null; e.frame = null; e.inbox = []; e.memory = {}; };

// what the page shows for a sentence: words, then meaning, then the invitation
function ask(e, q) {
  reset(e);
  let r = e.respond(q);
  if (r.outcome === 'abstain' && r.meaning) r = e.byMeaning(q, vec.get(q)) || (r.fallback && e.fallback(q)) || r;
  else if (r.outcome === 'abstain' && r.fallback) r = e.fallback(q) || r;
  const doc = e.frame && e.frame.kind === 'content' ? e.content.docs[e.frame.di].id : null;
  if (r.command === 'form.open') return { got: 'form', r };
  if (r.outcome === 'act' && r.source && doc) return { got: 'doc:' + doc, r };
  if (r.outcome === 'ask' && !r.skill) return { got: 'asks', r };
  if (r.skill && r.outcome === 'act') return { got: 'skill:' + r.skill, r };
  return { got: 'nothing', r };
}
function grade(want, got) {
  if (want.docs) return got.startsWith('doc:') ? (want.docs.includes(got.slice(4)) ? 'right' : 'wrong') : got === 'form' ? 'invited' : got === 'asks' ? 'asks' : got === 'nothing' ? 'nothing' : 'wrong';
  if (want.skill) return got === 'skill:' + want.skill ? 'right' : got === 'form' ? 'invited' : got === 'asks' || got === 'nothing' ? got : 'wrong';
  return got === 'form' ? 'right' : got === 'asks' || got === 'nothing' ? got : 'wrong'; // the contact form
}

// ---- teaching one sentence, through the inbox's code ------------------------------------------------
function teachOne(e, x) {
  const v = vec.get(x.q);
  if (x.want.docs) {
    const id = x.want.docs[0], d = e.content.docs.find(d => d.id === id);
    const best = d.questions.filter(t => lq.has('§' + id + t.q)).map(t => ({ t, s: dot(v, lq.get('§' + id + t.q)) })).sort((a, b) => b.s - a.s)[0];
    if (!best) return { ok: false, why: 'no listed question' };
    const r = L.teachQuestion(e, x.q, d.title, best.t.q);
    if (r.ok) e.addMeaning(r.key, v);
    return { ...r, to: `${id}: "${best.t.q}"` };
  }
  const skill = x.want.skill || 'work-together';
  const r = L.teach(e, x.q, skill, {});
  if (r.ok) { e.addMeaning(r.key, v); e.retrainDue = true; }
  return { ...r, to: skill };
}
const dot = (a, b) => { let c = 0; for (let i = 0; i < a.length; i++) c += a[i] * b[i]; return c; };
const lq = new Map();
{ const e = fresh(); for (const d of e.content.docs) for (const t of d.questions) { const k = '§' + d.id + t.q; vec.set(k, await emb(t.q)); lq.set(k, vec.get(k)); } }
const retrain = e => { if (e.retrainDue) { e.model = new R.NLU(Trainer.train(examples(e.packs), { log: () => {} })); e.retrainDue = false; } };

// ---- the experiment ---------------------------------------------------------------------------------
let seed = 1;
const rand = () => { seed = (seed * 1103515245 + 12345) % 2147483648; return seed / 2147483648; };
const shuffle = a => { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rand() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
const KINDS = ['right', 'wrong', 'invited', 'asks', 'nothing'];
const STEPS = [0, 10, 20, 40, Infinity];
const SPLITS = 5;
const BARS = [0.5, 0.6, 0.7]; // fixed in advance, not chosen on the test half
const sum = {}; // mode → step → kind → total
const notes = { refused: 0, taught: 0, recall: [0, 0], guard: {} };

const dest = w => w.docs ? 'doc:' + w.docs[0] : w.skill ? 'skill:' + w.skill : 'form';
function firstTaught(e, q, bar) {
  let best = null;
  for (const t of e.taughtList || []) { const c = dot(vec.get(q), t.v); if (!best || c > best.c) best = { c, t }; }
  return best && best.c >= bar ? dest(best.t.x.want) : null;
}
function measure(e, test, bar = 0) {
  retrain(e);
  const t = Object.fromEntries(KINDS.map(k => [k, 0]));
  for (const x of test) t[grade(x.want, (bar && firstTaught(e, x.q, bar)) || ask(e, x.q).got)]++;
  return t;
}

console.log(`${pool.length} questions with a destination (held-out ${pool.filter(x => x.from === 'held-out').length}, requests ${pool.filter(x => x.from === 'requests').length}, ` +
  `questions A–K ${pool.filter(x => x.from === 'questions A–K').length}, questions L ${pool.filter(x => x.from === 'questions L').length}), ${guard.length} off-topic as a guard. ${SPLITS} random splits, half taught, half tested.\n`);
const log = [];
for (let s = 0; s < SPLITS; s++) {
  seed = 1000 + s * 7919;
  // split within each source, so both halves have the same mix
  const teach = [], test = [];
  for (const from of [...new Set(pool.map(x => x.from))]) { const g = shuffle(pool.filter(x => x.from === from)); g.forEach((x, i) => (i % 2 ? test : teach).push(x)); }
  const order = shuffle(teach);
  for (const mode of ['inbox', 'every miss']) {
    const e = fresh();
    let n = 0, i = 0;
    for (const step of STEPS) {
      // teach until `step` sentences have been taught (or the taught half runs out)
      while (n < step && i < order.length) {
        const x = order[i++];
        retrain(e);
        const { got, r } = ask(e, x.q), g = grade(x.want, got);
        if (g === 'right') continue; // nothing to teach
        if (mode === 'inbox' && !e.inbox.some(y => y.sentence === e.clean(x.q))) continue; // never reached the inbox
        const t = teachOne(e, x);
        if (t.ok) (e.taughtList ||= []).push({ v: vec.get(x.q), x });
        n++;
        if (mode === 'every miss' && s === 0) log.push(`${t.ok ? 'taught ' : 'REFUSED'} "${x.q}" → ${t.to}${t.ok ? '' : ` (${t.why})`}`);
        if (!t.ok) notes.refused++; else notes.taught++;
      }
      const label = step === Infinity ? 'all' : step;
      if (mode === 'every miss') for (const bar of BARS) {
        const m2 = measure(e, test, bar), key = `taught first (nearest taught sentence ≥ ${bar}, else as built)`;
        ((sum[key] ||= {})[label] ||= { taught: 0, ...Object.fromEntries(KINDS.map(k => [k, 0])) });
        for (const k of KINDS) sum[key][label][k] += m2[k];
        sum[key][label].taught += n;
      }
      if (V && s === 0 && mode === 'inbox' && step === 0) for (const x of test) { const g = ask(e, x.q).got, k = grade(x.want, g); if (k !== 'right') log.push(`before teaching, ${k}: "${x.q}" → ${g} (wanted ${dest(x.want)})`); }
      const m = measure(e, test);
      ((sum[mode] ||= {})[label] ||= { taught: 0, ...Object.fromEntries(KINDS.map(k => [k, 0])) });
      for (const k of KINDS) sum[mode][label][k] += m[k];
      sum[mode][label].taught += n;
      if (step === Infinity) {
        if (mode === 'every miss') for (const bar of BARS) { const gd = notes.guard[`taught first (nearest taught sentence ≥ ${bar}, else as built)`] ||= { before: 0, after: 0 }; for (const x of guard) { const b = firstTaught(e, x.q, bar) || ask(e, x.q).got; if (b.startsWith('doc:') || /who-i-am|what-i-do|this-site/.test(b)) gd.after++; } }
        if (mode === 'every miss') { for (const x of teach) { notes.recall[1]++; if (grade(x.want, ask(e, x.q).got) === 'right') notes.recall[0]++; } }
        const gd = notes.guard[mode] ||= { before: 0, after: 0 };
        const f = fresh();
        for (const x of guard) { const a = ask(f, x.q).got, b = ask(e, x.q).got; if (a.startsWith('doc:') || a.startsWith('skill:') && /who-i-am|what-i-do|this-site/.test(a)) gd.before++; if (b.startsWith('doc:') || b.startsWith('skill:') && /who-i-am|what-i-do|this-site/.test(b)) gd.after++; }
      }
      if (n >= order.length || i >= order.length) { /* nothing left: later steps repeat the last measure */ }
    }
  }
  process.stderr.write(`split ${s + 1}/${SPLITS} done\n`);
}

// is there anything near to learn from? each test question's nearest sentence in the taught half (all of
// it, right or not): how close, and whether it goes to the same place
{
  seed = 1000; const teach = [], test = [];
  for (const from of [...new Set(pool.map(x => x.from))]) { const g = shuffle(pool.filter(x => x.from === from)); g.forEach((x, i) => (i % 2 ? test : teach).push(x)); }
  const bands = [[0.7, 1.01], [0.6, 0.7], [0.5, 0.6], [0, 0.5]].map(([lo, hi]) => ({ lo, hi, n: 0, same: 0 }));
  for (const x of test) {
    let best = null; for (const t of teach) { const c = dot(vec.get(x.q), vec.get(t.q)); if (!best || c > best.c) best = { c, t }; }
    const b = bands.find(b => best.c >= b.lo && best.c < b.hi); b.n++; if (dest(best.t.want) === dest(x.want)) b.same++;
  }
  console.log('split 1: nearest taught sentence to each test question');
  for (const b of bands) console.log(`  cosine ${b.lo}–${Math.min(b.hi, 1)}: ${b.n} test questions, ${b.same} of them go where their nearest taught sentence goes`);
  console.log('');
}
const testSize = pool.length - Math.floor(pool.length / 2);
for (const mode of Object.keys(sum)) {
  console.log(`${mode}: the untaught half (${testSize} questions per split), averaged over ${SPLITS} splits`);
  console.log('  taught   ' + KINDS.map(k => k.padStart(8)).join(''));
  for (const [label, t] of Object.entries(sum[mode])) console.log(`  ${String(label).padEnd(4)} ${(t.taught / SPLITS).toFixed(0).padStart(3)}  ` + KINDS.map(k => (t[k] / SPLITS).toFixed(1).padStart(8)).join(''));
  const g = notes.guard[mode];
  if (g) console.log(`  off-topic answered with Gab's content or replies: ${(g.before / SPLITS).toFixed(1)} before → ${(g.after / SPLITS).toFixed(1)} after, of ${guard.length}\n`);
}
console.log(`taught sentences themselves, asked again (every miss, all taught): ${notes.recall[0]} of ${notes.recall[1]} right`);
console.log(`teaching refused by the inbox's own check: ${notes.refused} of ${notes.refused + notes.taught} attempts`);
if (V) console.log('\nsplit 1, every miss:\n' + log.join('\n'));
