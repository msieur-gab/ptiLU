// node tools/measure.js . skills/lexicon.md [--cv] [--probes data/probes-move.md] [--types replace|add]
// Held-out, boundary and extra probes (intent only, with errors listed), and optionally
// 5-fold cross-validation over the training sentences: abstained / false yes / wrong skill.
const path = require("path");
const fs = require("fs");
const repo = path.resolve(process.argv[2]);
process.argv = process.argv.map((a, i) => i > 2 && /\.md$/.test(a) ? path.resolve(a) : a);
process.chdir(repo);
const T = require(path.join(repo, "web/trainer.js"));
const R = require(path.join(repo, "web/runtime.js"));
const S = require(path.join(repo, "skills.js"));
const args = process.argv.slice(3);
const lexFile = args[0];
const cv = args.includes("--cv");
const pi = args.indexOf("--probes");
const probesFile = pi >= 0 ? path.resolve(args[pi + 1]) : null;

// skills compiled once beforehand (node skills.js), so parallel runs never race on data/skills.md
const lexicon = S.parseLexicon(fs.readFileSync(lexFile, "utf8"), lexFile);
const manifest = JSON.parse(fs.readFileSync("data/manifest.json", "utf8"));
const examples = manifest.train.flatMap(f => T.parseDataset(fs.readFileSync(f, "utf8")));
const norm = t => t.toLowerCase().replace(/\?/g, "").split(/\s+/).filter(Boolean).join(" ");
const TH = 0.45;
const quiet = { log: () => {} };

// --types replace|add: the router sees the kind of each value (zdate, zduration, zfile)
const ti = args.indexOf("--types");
const typesMode = ti >= 0 ? args[ti + 1] : null;
if (typesMode) {
  const E = require(path.join(repo, "web/entities.js"));
  const FILE = /[A-Za-z0-9_][A-Za-z0-9_\-]*\.[A-Za-z0-9]{1,5}\b/g;
  const cache = new Map();
  R.setValueTypes(text => {
    if (cache.has(text)) return cache.get(text);
    const spans = [];
    let ents = [];
    try { ents = E.parse(text); } catch (e) {}
    for (const e of ents) if (e.start != null) spans.push([e.start, e.end, e.type === "duration" ? "zduration" : "zdate"]);
    for (const m of text.matchAll(FILE)) if (!spans.some(([a, b]) => m.index < b && m.index + m[0].length > a)) spans.push([m.index, m.index + m[0].length, "zfile"]);
    spans.sort((a, b) => b[0] - a[0]);
    let out = text;
    for (const [a, b, kind] of spans) out = out.slice(0, a) + (typesMode === "add" ? out.slice(a, b) + " " + kind : kind) + out.slice(b);
    cache.set(text, out);
    return out;
  });
}

function score(nlu, set) {
  let ok = 0; const errs = [];
  for (const e of set) {
    const r = nlu.parse(e.text);
    const pred = r.confidence >= TH ? r.intent : "out_of_scope";
    if (pred === e.intent) ok++; else errs.push(`  ${e.text}  want=${e.intent} got=${pred} (${r.intent} ${r.confidence.toFixed(2)})`);
  }
  return { ok, n: set.length, errs };
}

const model = T.train(examples, { prune: 0.2, lexicon, ...quiet });
const nlu = new R.NLU(model, lexicon);
const seen = new Set(examples.map(e => norm(e.text)));
const load = f => T.parseDataset(fs.readFileSync(f, "utf8")).filter(e => !seen.has(norm(e.text)));
const report = { types: typesMode || "none", lexicon: lexFile, families: new Set(Object.values(lexicon)).size, words: Object.keys(lexicon).length, kb: Math.round(JSON.stringify(model).length / 1024) };
for (const [name, f] of [["held-out", manifest.test], ["boundary", manifest.boundary], ...(probesFile ? [["probes", probesFile]] : [])]) {
  const r = score(nlu, load(f));
  report[name] = `${r.ok}/${r.n}`;
  console.log(`${name}: ${r.ok}/${r.n}`); r.errs.forEach(e => console.log(e));
}

if (cv) {
  // fixed shuffle, same folds for every lexicon
  let seed = 7; const rand = () => (seed = (seed * 1103515245 + 12345) % 2147483648) / 2147483648;
  const idx = examples.map((_, i) => i);
  for (let i = idx.length - 1; i > 0; i--) { const j = Math.floor(rand() * (i + 1)); [idx[i], idx[j]] = [idx[j], idx[i]]; }
  const K = 5; let abst = 0, fyes = 0, wrong = 0, n = 0;
  for (let k = 0; k < K; k++) {
    const testI = new Set(idx.filter((_, p) => p % K === k));
    const m = T.train(examples.filter((_, i) => !testI.has(i)), { prune: 0.2, lexicon, ...quiet });
    const fn = new R.NLU(m, lexicon);
    for (const i of testI) {
      const e = examples[i], r = fn.parse(e.text);
      const pred = r.confidence >= TH ? r.intent : "out_of_scope";
      n++;
      if (pred === e.intent) continue;
      if (pred === "out_of_scope") abst++; else if (e.intent === "out_of_scope") fyes++; else wrong++;
    }
    process.stderr.write(`fold ${k + 1}/${K}\n`);
  }
  report.cv = { n, abstained: abst, false_yes: fyes, wrong_skill: wrong, errors: abst + fyes + wrong };
  console.log(`cv (${n}): abstained ${abst}, false yes ${fyes}, wrong skill ${wrong}, total ${abst + fyes + wrong}`);
}
console.log("REPORT " + JSON.stringify(report));
