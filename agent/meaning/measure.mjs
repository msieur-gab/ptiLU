// node agent/meaning/measure.mjs [-v]
//  1. routing: my-agent's docs/questions.md A–J are the question skills' examples; each is asked with its
//     own line left out (leave-one-out). That's where the bars in agent.js were chosen
//  2. the whole agent on sentences it has never seen: my-agent's tests/held-out.json (a project expected,
//     off-topic, requests) and docs/questions.md L (questions about Gab, destinations chosen by Claude)
//  3. teaching: half of those taught, half only tested, 5 random splits, as in the engine's experiment
import { pipeline, env } from '@xenova/transformers';
import { createRequire } from 'module';
import fs from 'fs'; import path from 'path';
const require = createRequire(import.meta.url);
const here = path.dirname(new URL(import.meta.url).pathname);
const V = process.argv.includes('-v');
env.allowRemoteModels = false; env.localModelPath = path.join(here, '../../docs/agent/meaning/models/');
const pipe = await pipeline('feature-extraction', 'Xenova/all-MiniLM-L6-v2', { quantized: true });
const cache = new Map();
const emb = async t => cache.get(t) || (cache.set(t, Float32Array.from((await pipe([t], { pooling: 'mean', normalize: true })).data)), cache.get(t));
const { load } = require('../load.js');
const { BARS } = require('../agent.js');
const MA = path.join(here, '../../../my-agent');
const fresh = () => load({ random: () => 0, now: () => new Date('2026-11-20T10:00:00') });

// ---- 1. leave-one-out on the question skills' own examples ------------------------------------------
{
  const a = fresh(), items = a.router.items.filter(it => a.byName.get(it.skill).kind === 'question' && !it.neg);
  const t = { right: 0, wrong: 0, 'asks, right one offered': 0, 'asks, not offered': 0, invitation: 0 };
  for (const it of items) {
    const i = a.router.items.indexOf(it);
    a.router.items.splice(i, 1);
    const r = a.router.rank(it.text, await emb(it.text)), [x, y] = r, bar = BARS.meaning;
    a.router.items.splice(i, 0, it);
    if (x.score >= bar.sure && (!y || x.score - y.score >= bar.gap)) t[x.skill === it.skill ? 'right' : 'wrong']++;
    else if (x.score >= bar.ask) t[r.filter(z => z.score >= bar.ask && x.score - z.score < 0.08).slice(0, 2).some(z => z.skill === it.skill) ? 'asks, right one offered' : 'asks, not offered']++;
    else t.invitation++;
  }
  console.log(`1. a question skill's example, asked with itself left out (${items.length}):\n   ` + Object.entries(t).map(([k, v]) => `${k} ${v}`).join(' · '));
}

// ---- 2. sentences never seen --------------------------------------------------------------------------
const held = JSON.parse(fs.readFileSync(path.join(MA, 'tests/held-out.json'), 'utf8'));
const md = fs.readFileSync(path.join(MA, 'docs/questions.md'), 'utf8');
const L = md.slice(md.indexOf('## L.'), md.indexOf('## When nothing matches')).split('\n')
  .filter(l => /^\| [^|]*\S[^|]* \|/.test(l) && !/^\| (Question|---)/.test(l)).map(l => l.split('|')[1].trim());
const ABOUT = {
  'Where are you based?': 'who-i-am', 'What is your background?': 'who-i-am', 'How many years of experience do you have?': 'who-i-am',
  'What is your process?': 'what-i-do', 'How do you start a project?': 'what-i-do', 'What makes you different?': 'what-i-do',
  'Why should I hire you?': 'what-i-do', 'What does "the question nobody asked" mean?': 'what-i-do',
};
const sets = {
  'held-out, a project expected': held.answerable.map(x => ({ q: x.q, want: { projects: x.piece } })),
  'held-out, off-topic': held.far.map(q => ({ q, want: { far: true } })),
  'held-out, requests (work Gab may not do)': held.requests.map(q => ({ q, want: { contact: true } })),
  'questions about Gab (L)': L.map(q => ({ q, want: ABOUT[q] ? { skill: ABOUT[q] } : { contact: true } })),
};
// what the agent did with a sentence, in one word
function did(a, q, vec) {
  a.reset();
  const r = a.respond(q, vec), s = r.skill && a.byName.get(r.skill);
  if (r.outcome === 'ask' && r.options) return { got: 'asks', options: r.options, r };
  if (r.project) return { got: 'project:' + r.project, r };
  if (r.command === 'form.open' || (s && s.kind === 'contact')) return { got: 'contact', r };
  if (r.outcome === 'abstain') return { got: 'far', r };
  if (s) return { got: 'skill:' + s.name, r };
  return { got: 'nothing', r };
}
// right · wrong · asks (the right one offered or not) · invitation (contact form or "outside what I work on")
function grade(a, want, d) {
  const leadsTo = name => (a.byName.get(name) || {}).leads || [];
  const ok = name => want.projects ? leadsTo(name).some(p => want.projects.includes(p)) : want.skill ? name === want.skill : want.contact ? (a.byName.get(name) || {}).kind === 'contact' : false;
  if (d.got === 'asks') return d.options.some(ok) ? 'asks, right one offered' : 'asks, not offered';
  if (want.far) return d.got === 'far' || d.got === 'contact' ? 'right' : 'wrong';
  if (want.contact) return d.got === 'contact' ? 'right' : d.got === 'far' ? 'invitation' : 'wrong';
  if (d.got === 'contact' || d.got === 'far') return 'invitation';
  if (want.projects) return d.got.startsWith('project:') && want.projects.includes(d.got.slice(8)) ? 'right' : 'wrong';
  return d.got === 'skill:' + want.skill ? 'right' : 'wrong';
}
const KINDS = ['right', 'wrong', 'asks, right one offered', 'asks, not offered', 'invitation'];
console.log('\n2. the whole agent, on sentences it has never seen');
for (const [label, rows] of Object.entries(sets)) {
  const a = fresh(), t = Object.fromEntries(KINDS.map(k => [k, 0]));
  for (const x of rows) {
    const d = did(a, x.q, await emb(a.clean(x.q))), g = grade(a, x.want, d);
    t[g]++;
    if (V && g !== 'right') console.log(`     ${g}: "${x.q}" → ${d.got}${d.options ? ` (${d.options.join(', ')})` : ''} · ${d.r.why}`);
  }
  console.log(`   ${label} (${rows.length}): ` + KINDS.filter(k => t[k] || k === 'right' || k === 'wrong').map(k => `${k} ${t[k]}`).join(' · '));
}

// ---- 3. teaching ---------------------------------------------------------------------------------------
// The teacher (Gab, from the inbox) picks the right skill for each sentence that went wrong: for a
// project question, the question skill leading to that project whose examples are nearest in meaning.
// Two ways: "you approve" teaches every miss of the taught half (wrong answers reach the inbox now, by
// "that's not it"); "visitors' yes only" teaches only the sentences a visitor confirmed, when the right
// skill was offered under "Do you mean…?" (no work for Gab beyond approving)
const pool = [...sets['held-out, a project expected'], ...sets['held-out, requests (work Gab may not do)'], ...sets['questions about Gab (L)']];
const dest = async (a, x) => {
  if (x.want.skill) return x.want.skill;
  if (x.want.contact) return 'not-my-work';
  const v = await emb(a.clean(x.q));
  const cands = a.skills.filter(s => s.leads.some(p => x.want.projects.includes(p)));
  return a.router.rank(x.q, v).find(r => cands.some(c => c.name === r.skill))?.skill || cands[0].name;
};
let seed = 1;
const rand = () => { seed = (seed * 1103515245 + 12345) % 2147483648; return seed / 2147483648; };
const shuffle = l => { l = l.slice(); for (let i = l.length - 1; i > 0; i--) { const j = Math.floor(rand() * (i + 1)); [l[i], l[j]] = [l[j], l[i]]; } return l; };
const SPLITS = 5, STEPS = [0, 10, 20, 40, Infinity], sum = {};
for (let s = 0; s < SPLITS; s++) {
  seed = 1000 + s * 7919;
  const teach = [], test = [];
  for (const g of Object.keys(sets).filter(k => !k.includes('off-topic'))) shuffle(sets[g]).forEach((x, i) => (i % 2 ? test : teach).push(x));
  const order = shuffle(teach);
  for (const mode of ['you approve', "visitors' yes only"]) {
    const a = fresh();
    let n = 0, i = 0;
    for (const step of STEPS) {
      while (n < step && i < order.length) {
        const x = order[i++], v = await emb(a.clean(x.q)), d = did(a, x.q, v), g = grade(a, x.want, d);
        if (g === 'right') continue;
        if (mode === "visitors' yes only" && g !== 'asks, right one offered') continue;
        const to = mode === 'you approve' ? await dest(a, x) : d.options.find(o => grade(a, x.want, { got: 'asks', options: [o] }) === 'asks, right one offered');
        if (a.teach(x.q, to, v).ok) n++;
      }
      const t = (sum[mode] ||= {})[step === Infinity ? 'all' : step] ||= { taught: 0, ...Object.fromEntries(KINDS.map(k => [k, 0])) };
      t.taught += n;
      for (const x of test) t[grade(a, x.want, did(a, x.q, await emb(a.clean(x.q))))]++;
    }
  }
}
const size = pool.length - Math.floor(pool.length / 2);
console.log(`\n3. teaching: ${pool.length} sentences (held-out projects and requests, questions L), half taught, half only tested (${size}), average of ${SPLITS} splits`);
for (const [mode, rows] of Object.entries(sum)) {
  console.log(`   ${mode}\n     taught ${KINDS.map(k => k.replace('asks, ', 'asks: ').padStart(14)).join('')}`);
  for (const [step, t] of Object.entries(rows)) console.log(`     ${String(step).padEnd(4)}${(t.taught / SPLITS).toFixed(0).padStart(3)} ${KINDS.map(k => (t[k] / SPLITS).toFixed(1).padStart(14)).join('')}`);
}
