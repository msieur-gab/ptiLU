// node engine/meaning/judge.mjs [-v] [--tune] [path to my-agent]: the one scoreboard of branch engine-answers (GOAL.md).
// The engine as on the page: words, then meaning when words find nothing.
//   tuning set  my-agent tests/held-out.json: may be read and tuned on; -v prints every miss
//   blind set   my-agent docs/questions.md and engine/tests/real.md: totals only, never tuned on
// A quote is a reply taken from a file. "quiet" is no quote: "I don't have that", "do you mean…?", an invitation.
import { pipeline, env } from '@xenova/transformers';
import { createRequire } from 'module';
import fs from 'fs';
import path from 'path';
const require = createRequire(import.meta.url);
const here = path.dirname(new URL(import.meta.url).pathname);
const args = process.argv.slice(2), verbose = args.includes('-v'), tuneOnly = args.includes('--tune'); // --tune: the tuning set alone, for sweeps
const showBlind = args.includes('--show-blind'); // for Gab's eyes only: once read by whoever builds, the blind set is blind no more
const MA = path.resolve(args.find(a => !a.startsWith('-')) || path.join(here, '../../../my-agent'));
env.allowRemoteModels = false; env.localModelPath = path.join(here, '../../docs/engine/meaning/models/');
const pipe = await pipeline('feature-extraction', 'Xenova/all-MiniLM-L6-v2', { quantized: true });
const emb = async t => Float32Array.from((await pipe([t], { pooling: 'mean', normalize: true })).data);
const { make } = require('../make.js');

// one question, a fresh engine: { piece, say, how } where piece is the file quoted, or null
async function ask(q) {
  const e = make();
  let r = e.respond(q), how = 'words';
  if (r.outcome === 'abstain' && r.meaning) { const m = e.byMeaning(q, await emb(q)); if (m) { r = m; how = 'meaning'; } }
  const piece = r.outcome === 'act' && r.source && e.frame && e.frame.kind === 'content' ? e.content.docs[e.frame.di].id : null;
  return { piece, say: r.say || '', how, outcome: r.outcome, why: r.why || '' };
}
const tally = () => ({ right: 0, 'right piece, other passage': 0, 'wrong piece': 0, quiet: 0, quoted: 0 });
const line = (label, t) => console.log(`  ${label.padEnd(46)} ${Object.entries(t).filter(([, v]) => v).map(([k, v]) => `${k} ${v}`).join(' · ') || '—'}`);
const low = s => s.toLowerCase();

// ---- the tuning set
const held = JSON.parse(fs.readFileSync(path.join(MA, 'tests/held-out.json'), 'utf8'));
console.log('TUNING SET (my-agent tests/held-out.json)');
let wrongTune = 0;
for (const set of ['answerable', 'near', 'far', 'requests']) {
  const t = tally(), misses = [];
  for (const x of held[set]) {
    const q = typeof x === 'string' ? x : x.q, r = await ask(q);
    if (set === 'answerable') {
      if (!r.piece) { t.quiet++; misses.push(['quiet', q, r]); }
      else if (!x.piece.includes(r.piece)) { t['wrong piece']++; wrongTune++; misses.push(['wrong piece', q, r]); }
      else if ((x.expect || []).some(p => low(r.say).includes(low(p)))) t.right++;
      else { t['right piece, other passage']++; misses.push(['other passage', q, r]); }
    } else if (r.piece) { t.quoted++; wrongTune++; misses.push(['quoted', q, r]); } else t.quiet++;
  }
  line(`${set} (${held[set].length})`, t);
  if (verbose) for (const [k, q, r] of misses) console.log(`      ${k}: "${q}" → ${r.piece || r.outcome} [${r.how}: ${r.why}] ${r.say.slice(0, 90)}`);
}
console.log(`  wrong quotes, tuning set: ${wrongTune}`);

// ---- the blind set: totals only
if (tuneOnly) process.exit(0);
const blind = [];
for (const l of fs.readFileSync(path.join(MA, 'docs/questions.md'), 'utf8').split('\n')) {
  if (!l.startsWith('|')) continue;
  const [q, cand = ''] = l.replace(/^\||\|$/g, '').split('|').map(s => s.trim());
  if (!q || q === 'Question' || /^[-: ]+$/.test(q)) continue;
  const c = low(cand), names = { senz: 'senz', pebbble: 'pebbble', datadraw: 'autoflow', autoflow: 'autoflow', dowgo: 'dowgo', vrooom: 'vrooom' };
  const want = Object.entries(names).filter(([k]) => c.includes(k)).map(([, v]) => v);
  if (c.startsWith('invitation')) blind.push({ q, want: null }); else if (want.length) blind.push({ q, want });
}
const real = fs.readFileSync(path.join(here, '../tests/real.md'), 'utf8').split('\n').filter(l => /^- .+ → /.test(l)).map(l => {
  const [q, to] = l.slice(2).split(' → ').map(s => s.trim());
  return { q, to };
});
console.log('\nBLIND SET (totals only: never tuned on)');
const tp = tally(), ti = tally(), tr = { 'where it belongs': 0, 'not where it belongs': 0 };
for (const x of blind) {
  const r = await ask(x.q);
  if (x.want === null) r.piece ? ti.quoted++ : ti.quiet++;
  else if (!r.piece) tp.quiet++; else if (x.want.includes(r.piece)) tp.right++; else tp['wrong piece']++;
  if (showBlind && r.piece && (x.want === null || !x.want.includes(r.piece))) console.log(`      "${x.q}" (${x.want ? x.want.join('/') : 'invitation'}) → ${r.piece} [${r.how}] ${r.say.slice(0, 90)}`);
}
for (const x of real) {
  const r = await ask(x.q), not = x.to.startsWith('not '), file = x.to.replace(/^not /, '');
  const ok = x.to === 'nothing' ? !r.piece : not ? r.piece !== file : r.piece === file;
  tr[ok ? 'where it belongs' : 'not where it belongs']++;
}
const nP = blind.filter(x => x.want).length, nI = blind.length - nP;
delete tp.quoted; delete tp['right piece, other passage']; delete ti.right; delete ti['wrong piece']; delete ti['right piece, other passage'];
line(`questions.md, a piece expected (${nP})`, tp);
line(`questions.md, an invitation expected (${nI})`, ti);
line(`real.md, Gab's sentences (${real.length})`, tr);
console.log(`  WRONG QUOTES, blind: ${tp['wrong piece'] + ti.quoted} · RIGHT, blind: ${tp.right}`);
