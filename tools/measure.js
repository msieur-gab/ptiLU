// node tools/measure.js [--cv] [--group] [--probes file.md ...] [--errors out.tsv]
// Scores the model as the agent uses it, on sentences it never saw in training.
//   held-out (data/test.md), boundary (data/boundary.md) and any --probes files: sentences that
//   appear in a training file, or whose skill isn't on this branch, are left out.
//   --cv: 5-fold cross-validation over the training sentences. --group holds out whole example
//   lines (every sentence one line made), so a sentence is never tested against its twin; random
//   folds hid about half the abstentions (21 October).
// Each sentence gets the agent's decision (web/agent.js): a skill with `acts: yes` asks below
// SURE, every skill abstains below THRESHOLD. Counted as: acted right, ACTED WRONG (changed
// something without asking: the number that matters), answered wrong (a skill that only answers),
// asked (right / wrong skill), abstained (right / missed).
const path = require("path");
const fs = require("fs");
const repo = path.resolve(__dirname, "..");
const args = process.argv.slice(2).map((a, i, all) => i > 0 && all[i - 1] === "--probes" ? path.resolve(a) : a);
process.chdir(repo);
const T = require("../web/trainer.js");
const R = require("../web/runtime.js");
const S = require("../skills.js");
const A = require("../web/agent.js");

const { skills, groups } = S.compile("skills", false);
const manifest = JSON.parse(fs.readFileSync("data/manifest.json", "utf8"));
const examples = manifest.train.flatMap(f => T.parseDataset(fs.readFileSync(f, "utf8")));
const norm = t => t.toLowerCase().replace(/[?!.,]/g, "").split(/\s+/).filter(Boolean).join(" ");
const quiet = { log: () => {} };
const acts = k => skills[k] && skills[k].params.acts === "yes";

const ORDER = ["acted right", "ACTED WRONG", "answered wrong", "asked, right skill", "asked, wrong skill", "abstained, right", "abstained, missed"];
const show = c => ORDER.filter(k => c[k]).map(k => `${k} ${c[k]}`).join(" · ");
function outcome(want, r, agent) {
  const d = agent.decision(r);
  if (d === "act") return r.intent === want ? "acted right" : acts(r.intent) ? "ACTED WRONG" : "answered wrong";
  if (d === "ask") return r.intent === want ? "asked, right skill" : "asked, wrong skill";
  return want === "out_of_scope" ? "abstained, right" : "abstained, missed";
}
function score(nlu, set, errs) {
  const dec = {}, agent = new A.Agent(nlu);
  for (const e of set) {
    agent.lastText = e.text; agent.pending = null;
    const r = agent.parse(e.text), o = outcome(e.intent, r, agent);
    dec[o] = (dec[o] || 0) + 1;
    if (errs && o !== "acted right" && o !== "abstained, right") errs.push(`  ${o.padEnd(18)} ${e.text}  (want ${e.intent}, got ${r.intent} ${r.confidence.toFixed(2)})`);
  }
  return dec;
}

const model = T.train(examples, { prune: 0.2, ...quiet });
const nlu = new R.NLU(model);
const seen = new Set(examples.map(e => norm(e.text)));
const load = f => T.parseDataset(fs.readFileSync(f, "utf8")).filter(e => !seen.has(norm(e.text)) && skills[e.intent]);
const sets = [["held-out", "data/test.md"], ["boundary", "data/boundary.md"]]
  .concat(args.map((a, i) => args[i - 1] === "--probes" ? [path.basename(a, ".md"), a] : null).filter(Boolean))
  .filter(([, f]) => fs.existsSync(f));
const report = {};
for (const [name, f] of sets) {
  const set = load(f), errs = [];
  const dec = score(nlu, set, errs);
  console.log(`${name} (${set.length}): ${show(dec)}`);
  errs.forEach(e => console.log(e));
  report[name] = dec;
}

if (args.includes("--cv")) {
  const grouped = args.includes("--group");
  // folds from a hash: adding sentences never moves the others, so two branches compare on the same folds
  const fold = t => { let h = 2166136261; for (const c of norm(t)) h = Math.imul(h ^ c.charCodeAt(0), 16777619); return (h >>> 0) % 5; };
  const foldOf = e => fold((grouped && groups.get(e.intent + "|" + e.text)) || e.text);
  const dec = {}, errs = [];
  for (let k = 0; k < 5; k++) {
    const test = examples.filter(e => foldOf(e) === k);
    const fn = new R.NLU(T.train(examples.filter(e => foldOf(e) !== k), { prune: 0.2, ...quiet }));
    const d = score(fn, test, errs);
    for (const [o, n] of Object.entries(d)) dec[o] = (dec[o] || 0) + n;
    process.stderr.write(`fold ${k + 1}/5\n`);
  }
  const n = Object.values(dec).reduce((a, b) => a + b, 0);
  console.log(`cv (${n}, folds by ${grouped ? "example line" : "sentence"}): ${show(dec)}`);
  const ei = args.indexOf("--errors");
  if (ei >= 0) fs.writeFileSync(path.resolve(args[ei + 1]), errs.join("\n") + "\n");
  report.cv = dec;
}
console.log("REPORT " + JSON.stringify(report));
