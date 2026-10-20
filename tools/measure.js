// node tools/measure.js . skills/lexicon.md [--cv] [--probes file.md ...] [--types replace|add|places|folders] [--show file.md] [--errors out.tsv] [--predictions out.tsv]
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
    // a value right after "called" or "named" is a name, whatever it looks like
    const named = a => /\b(called|named)\s+["'“]?$/i.test(text.slice(0, a));
    // files first: "Monday.csv" is a file, not a day
    for (const m of text.matchAll(FILE)) if (!named(m.index)) spans.push([m.index, m.index + m[0].length, "zfile"]);
    for (const e of ents) {
      if (e.start == null || named(e.start)) continue;
      const span = text.slice(e.start, e.end).toLowerCase().trim();
      if (/^(right )?now$|^(morning|afternoon|evening|night)$/.test(span)) continue; // "not now", "good morning"
      if (/^\s*(%|percent)/i.test(text.slice(e.end))) continue; // "brightness at 5%"
      if (/^(at|to)?\s*\d{1,3}$/.test(span) && /\b(brightness|volume|sound|level)\s*$/i.test(text.slice(0, e.start))) continue; // "brightness at 20"
      if (spans.some(([a, b]) => e.start < b && e.end > a)) continue;
      spans.push([e.start, e.end, e.type === "duration" ? "zduration" : "zdate"]);
    }
    if (typesMode === "places" || typesMode === "folders") {
      const free = (a, b) => !spans.some(([x, y]) => a < y && b > x);
      const w = [...text.matchAll(/[A-Za-z][A-Za-z'\-]*/g)].map(m => ({ t: m[0].toLowerCase(), a: m.index, b: m.index + m[0].length }));
      for (let i = 0; i < w.length; i++) {
        if (!free(w[i].a, w[i].b)) continue;
        const prev = w[i - 1] && w[i - 1].t, prev2 = w[i - 2] && w[i - 2].t, next = w[i + 1] && w[i + 1].t;
        if (NAMING.has(prev)) continue; // "a folder called paris": a name, not a place
        // a place on disk: a known folder after "in/to/into…", or a word before "folder" that is a
        // known folder or follows the/my/in/to ("create folder x" keeps its verb)
        const afterInto = INTO.has(prev) || (DET.has(prev) && INTO.has(prev2));
        if ((FOLDERS.has(w[i].t) && afterInto) || (DIR.has(next) && (FOLDERS.has(w[i].t) || DET.has(prev) || INTO.has(prev)) && !DET.has(w[i].t) && !["a", "new", "this", "that", "same"].includes(w[i].t))) {
          spans.push([w[i].a, w[i].b, "zfolder"]); continue;
        }
        if (typesMode === "folders") continue; // folders only, no world places
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

if (args.includes("--collide")) { // training sentences that look the same to the router in two skills
  const by = new Map();
  for (const e of examples) { const k = R.intentFeatures(e.text, lexicon).filter(f => f.startsWith("w:")).map(f => f.slice(2)).join(" "); if (!by.has(k)) by.set(k, new Map()); const c = by.get(k); c.set(e.intent, (c.get(e.intent) || 0) + 1); }
  const pairs = new Map(); let n = 0, shown = 0;
  for (const [k, c] of by) if (c.size > 1) { n++; const key = [...c.keys()].sort().join(" / "); pairs.set(key, (pairs.get(key) || 0) + 1); if (shown++ < 10) console.log("  " + k + "  " + JSON.stringify(Object.fromEntries(c))); }
  console.log("sentence shapes shared by two or more skills: " + n);
  for (const [k, v] of [...pairs].sort((a, b) => b[1] - a[1]).slice(0, 8)) console.log("  " + v + "  " + k);
  process.exit(0);
}

const evalPreds = [];
function score(nlu, set) {
  let ok = 0; const errs = [];
  for (const e of set) {
    const r = nlu.parse(e.text);
    const pred = r.confidence >= TH ? r.intent : "out_of_scope";
    evalPreds.push(`${e.intent}\t${r.intent}\t${r.confidence.toFixed(4)}\t${e.text}\t${set.name || ""}`);
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
  const r = score(nlu, Object.assign(load(f), { name }));
  report[name] = `${r.ok}/${r.n}`;
  console.log(`${name}: ${r.ok}/${r.n}`); r.errs.forEach(e => console.log(e));
}

{ // --predictions file.eval.tsv: the same for held-out, boundary and probes
  const pi = args.indexOf("--predictions");
  if (pi >= 0) fs.writeFileSync(path.resolve(args[pi + 1]).replace(/\.tsv$/, "") + ".eval.tsv", "want\ttop\tconfidence\tsentence\tset\n" + evalPreds.join("\n") + "\n");
}

if (cv) {
  // folds from a hash of each sentence: adding or removing sentences never moves the others,
  // so two versions of the skills are compared on the same folds
  const fold = t => { let h = 2166136261; for (const c of norm(t)) h = Math.imul(h ^ c.charCodeAt(0), 16777619); return (h >>> 0) % 5; };
  const cvErrs = [], preds = [];
  const K = 5; let abst = 0, fyes = 0, wrong = 0, n = 0;
  for (let k = 0; k < K; k++) {
    const testI = new Set(examples.map((e, i) => fold(e.text) === k ? i : -1).filter(i => i >= 0));
    const m = T.train(examples.filter((_, i) => !testI.has(i)), { prune: 0.2, lexicon, ...quiet });
    const fn = new R.NLU(m, lexicon);
    for (const i of testI) {
      const e = examples[i], r = fn.parse(e.text);
      const pred = r.confidence >= TH ? r.intent : "out_of_scope";
      n++;
      preds.push(`${e.intent}\t${r.intent}\t${r.confidence.toFixed(4)}\t${e.text}`);
      if (pred === e.intent) continue;
      if (pred === "out_of_scope") abst++; else if (e.intent === "out_of_scope") fyes++; else wrong++;
      cvErrs.push(`${e.intent}\t${pred}\t${r.intent} ${r.confidence.toFixed(2)}\t${e.text}`);
    }
    process.stderr.write(`fold ${k + 1}/${K}\n`);
  }
  // --errors file: every cross-validation error (want, got, top skill and confidence, sentence)
  const ei = args.indexOf("--errors");
  if (ei >= 0) fs.writeFileSync(path.resolve(args[ei + 1]), "want\tgot\ttop\tsentence\n" + cvErrs.join("\n") + "\n");
  // --predictions file: every cross-validation sentence with its top skill and confidence, for
  // choosing a threshold without retraining
  const pi = args.indexOf("--predictions");
  if (pi >= 0) fs.writeFileSync(path.resolve(args[pi + 1]), "want\ttop\tconfidence\tsentence\n" + preds.join("\n") + "\n");
  report.cv = { n, abstained: abst, false_yes: fyes, wrong_skill: wrong, errors: abst + fyes + wrong };
  console.log(`cv (${n}): abstained ${abst}, false yes ${fyes}, wrong skill ${wrong}, total ${abst + fyes + wrong}`);
}
console.log("REPORT " + JSON.stringify(report));
