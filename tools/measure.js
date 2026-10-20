// node tools/measure.js . skills/lexicon.md [--cv] [--probes file.md ...] [--types replace|add|places] [--show file.md]
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
const probeFiles = args.map((a, i) => a === "--probes" ? path.resolve(args[i + 1]) : null).filter(Boolean);

// skills compiled once beforehand (node skills.js), so parallel runs never race on data/skills.md
const lexicon = S.parseLexicon(fs.readFileSync(lexFile, "utf8"), lexFile);
const manifest = JSON.parse(fs.readFileSync("data/manifest.json", "utf8"));
const examples = manifest.train.flatMap(f => T.parseDataset(fs.readFileSync(f, "utf8")));
const norm = t => t.toLowerCase().replace(/\?/g, "").split(/\s+/).filter(Boolean).join(" ");
const TH = 0.45;
const quiet = { log: () => {} };

// --types replace|add|places: the router sees the kind of each value instead of its words.
// replace: dates (zdate), durations (zduration), file names (zfile). add: the same, beside the
// words. places: replace, plus folders (zfolder) and world places (zplace), kept apart.
const ti = args.indexOf("--types");
const typesMode = ti >= 0 ? args[ti + 1] : null;
if (typesMode) {
  const E = require(path.join(repo, "web/entities.js"));
  const FILE = /[A-Za-z0-9_][A-Za-z0-9_\-]*\.[A-Za-z0-9]{1,5}\b/g;
  // folders: the standard ones and every location the skills declare
  const FOLDERS = new Set(["desktop", "documents", "downloads", "music", "pictures", "videos", "templates", "public", "home"]);
  for (const d of fs.readdirSync("skills")) {
    const f = path.join("skills", d, "skill.md");
    if (!fs.existsSync(f)) continue;
    let on = false;
    for (const line of fs.readFileSync(f, "utf8").split("\n")) {
      if (/^## /.test(line)) { on = /^## Values: loc\b/.test(line); continue; }
      if (on && line.startsWith("- ")) FOLDERS.add(line.slice(2).trim().toLowerCase());
    }
  }
  const PLACES = new Set(fs.readFileSync("tools/places.txt", "utf8").split("\n").filter(l => l && !l.startsWith("#")));
  const INTO = new Set(["in", "into", "inside", "to", "from", "under", "within", "onto", "on"]);
  const DET = new Set(["the", "my", "your", "our"]);
  const DIR = new Set(["folder", "directory", "dir"]);
  const NAMING = new Set(["called", "named"]);
  const cache = new Map();
  R.setValueTypes(text => {
    if (cache.has(text)) return cache.get(text);
    const spans = [];
    let ents = [];
    try { ents = E.parse(text); } catch (e) {}
    for (const e of ents) if (e.start != null) spans.push([e.start, e.end, e.type === "duration" ? "zduration" : "zdate"]);
    for (const m of text.matchAll(FILE)) if (!spans.some(([a, b]) => m.index < b && m.index + m[0].length > a)) spans.push([m.index, m.index + m[0].length, "zfile"]);
    if (typesMode === "places") {
      const free = (a, b) => !spans.some(([x, y]) => a < y && b > x);
      const w = [...text.matchAll(/[A-Za-z][A-Za-z'\-]*/g)].map(m => ({ t: m[0].toLowerCase(), a: m.index, b: m.index + m[0].length }));
      for (let i = 0; i < w.length; i++) {
        if (!free(w[i].a, w[i].b)) continue;
        const prev = w[i - 1] && w[i - 1].t, prev2 = w[i - 2] && w[i - 2].t, next = w[i + 1] && w[i + 1].t;
        if (NAMING.has(prev)) continue; // "a folder called paris": a name, not a place
        // a place on disk: a known folder after "in/to/into…", or any word just before "folder"
        const afterInto = INTO.has(prev) || (DET.has(prev) && INTO.has(prev2));
        if ((FOLDERS.has(w[i].t) && afterInto) || (DIR.has(next) && !DET.has(w[i].t) && !["a", "new", "this", "that", "same"].includes(w[i].t))) {
          spans.push([w[i].a, w[i].b, "zfolder"]); continue;
        }
        // a place in the world: the longest known name of up to three words
        for (let n = 3; n >= 1; n--) {
          if (i + n > w.length) continue;
          const name = w.slice(i, i + n).map(x => x.t).join(" ");
          if (PLACES.has(name) && free(w[i].a, w[i + n - 1].b)) { spans.push([w[i].a, w[i + n - 1].b, "zplace"]); i += n - 1; break; }
        }
      }
    }
    spans.sort((a, b) => b[0] - a[0]);
    let out = text;
    for (const [a, b, kind] of spans) out = out.slice(0, a) + (typesMode === "add" ? out.slice(a, b) + " " + kind : kind) + out.slice(b);
    cache.set(text, out);
    return out;
  });
  if (args.includes("--show")) { // print how some sentences are typed, then stop
    for (const t of fs.readFileSync(args[args.indexOf("--show") + 1], "utf8").split("\n").filter(l => l.startsWith("- "))) console.log(t.slice(2), " → ", R.intentFeatures(t.slice(2)).filter(f => f.startsWith("w:")).map(f => f.slice(2)).join(" "));
    process.exit(0);
  }
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
for (const [name, f] of [["held-out", manifest.test], ["boundary", manifest.boundary], ...probeFiles.map(f => [path.basename(f, ".md"), f])]) {
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
