// node tools/measure.js . skills/lexicon.md [--cv] [--group] [--probes file.md ...] [--errors out.tsv] [--predictions out.tsv]
// Held-out, boundary and extra probes (intent only, with errors listed), and optionally
// 5-fold cross-validation over the training sentences: abstained / false yes / wrong skill.
// --group: cross-validation holds out whole example lines (all sentences one line made), so a
// sentence is never tested against its twin; random folds hide about half the abstentions.
// Each set also gets the agent's own decision (web/agent.js decide): acted right, acted wrong
// (a skill that changes something did the wrong thing without asking: the number that matters),
// answered wrong (a skill that only answers), asked (right / wrong skill), abstained (right / missed).
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
const A = require(path.join(repo, "web/agent.js"));
const SK = JSON.parse(fs.readFileSync("web/skills.json", "utf8")).skills;
const acts = k => SK[k] && SK[k].params.acts === "yes";
function outcome(want, r, nlu, text) {
  const d = A.decide(nlu, r, text);
  if (d.act === "act") return r.intent === want ? "acted right" : acts(r.intent) ? "ACTED WRONG" : "answered wrong";
  if (d.act === "ask") return r.intent === want ? "asked, right skill" : "asked, wrong skill";
  return want === "out_of_scope" ? "abstained, right" : "abstained, missed";
}
const ORDER = ["acted right", "ACTED WRONG", "answered wrong", "asked, right skill", "asked, wrong skill", "abstained, right", "abstained, missed"];
const decisions = c => ORDER.filter(k => c[k]).map(k => `${k} ${c[k]}`).join(" · ");
const parse = (nlu, text) => nlu.parse(text);
function score(nlu, set) {
  let ok = 0; const errs = [], dec = {};
  for (const e of set) {
    const r = parse(nlu, e.text);
    const o = outcome(e.intent, r, nlu, e.text); dec[o] = (dec[o] || 0) + 1;
    const pred = r.confidence >= TH ? r.intent : "out_of_scope";
    evalPreds.push(`${e.intent}\t${r.intent}\t${r.confidence.toFixed(4)}\t${e.text}\t${set.name || ""}`);
    if (pred === e.intent) ok++; else errs.push(`  ${e.text}  want=${e.intent} got=${pred} (${r.intent} ${r.confidence.toFixed(2)})`);
  }
  return { ok, n: set.length, errs, dec };
}

const model = T.train(examples, { prune: 0.2, lexicon, ...quiet });
const nlu = new R.NLU(model, lexicon);
const seen = new Set(examples.map(e => norm(e.text)));
const load = f => T.parseDataset(fs.readFileSync(f, "utf8")).filter(e => !seen.has(norm(e.text)));
const report = { lexicon: lexFile, families: new Set(Object.values(lexicon)).size, words: Object.keys(lexicon).length, kb: Math.round(JSON.stringify(model).length / 1024) };
for (const [name, f] of [["held-out", manifest.test], ["boundary", manifest.boundary], ...probeFiles.map(f => [path.basename(f, ".md"), f])]) {
  const r = score(nlu, Object.assign(load(f), { name }));
  report[name] = `${r.ok}/${r.n}`;
  console.log(`${name}: ${r.ok}/${r.n}`); r.errs.forEach(e => console.log(e));
  console.log(`  decisions: ${decisions(r.dec)}`); report[name + " decisions"] = r.dec;
}

{ // --predictions file.eval.tsv: the same for held-out, boundary and probes
  const pi = args.indexOf("--predictions");
  if (pi >= 0) fs.writeFileSync(path.resolve(args[pi + 1]).replace(/\.tsv$/, "") + ".eval.tsv", "want\ttop\tconfidence\tsentence\tset\n" + evalPreds.join("\n") + "\n");
}

if (cv) {
  // folds from a hash of each sentence: adding or removing sentences never moves the others,
  // so two versions of the skills are compared on the same folds
  const groups = args.includes("--group") ? S.compile("skills", false).groups : null;
  const fold = t => { let h = 2166136261; for (const c of norm(t)) h = Math.imul(h ^ c.charCodeAt(0), 16777619); return (h >>> 0) % 5; };
  const foldOf = e => fold((groups && groups.get(e.intent + "|" + e.text)) || e.text);
  const cvErrs = [], preds = [];
  const K = 5; let abst = 0, fyes = 0, wrong = 0, n = 0; const dec = {};
  for (let k = 0; k < K; k++) {
    const testI = new Set(examples.map((e, i) => foldOf(e) === k ? i : -1).filter(i => i >= 0));
    const m = T.train(examples.filter((_, i) => !testI.has(i)), { prune: 0.2, lexicon, ...quiet });
    const fn = new R.NLU(m, lexicon);
    for (const i of testI) {
      const e = examples[i], r = fn.parse(e.text);
      const o = outcome(e.intent, r, fn, e.text); dec[o] = (dec[o] || 0) + 1;
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
  report.cv = { folds: groups ? "example lines" : "sentences", n, abstained: abst, false_yes: fyes, wrong_skill: wrong, errors: abst + fyes + wrong, decisions: dec };
  console.log(`cv (${n}, folds by ${groups ? "example line" : "sentence"}): abstained ${abst}, false yes ${fyes}, wrong skill ${wrong}, total ${abst + fyes + wrong}`);
  console.log(`  decisions: ${decisions(dec)}`);
}
console.log("REPORT " + JSON.stringify(report));
