// node train.js [models/model.json] [--prune 0.2]
// Trains the shipped model from the files listed in data/manifest.json. No dependencies.
const fs = require("fs");
const T = require("./web/trainer.js");
const { lexicon } = require("./skills.js").compile(); // skills/*.md → data/skills.md + web/skills.json
const R = require("./web/runtime.js");

const args = process.argv.slice(2);
const flag = (name, d) => { const i = args.indexOf(name); return i >= 0 ? +args.splice(i, 2)[1] : d; };
const prune = flag("--prune", 0.2);
const verbose = args.includes("-v");
const out = args.find(a => !a.startsWith("-")) || "models/model.json";
const manifest = JSON.parse(fs.readFileSync("data/manifest.json", "utf8"));

const examples = manifest.train.flatMap(f => T.parseDataset(fs.readFileSync(f, "utf8")));
const model = T.train(examples, { prune, lexicon, log: m => process.stdout.write("  " + m + "\n") });
// held-out: only test sentences that appear in no training file (same rule as retraining on the phone)
const norm = t => t.toLowerCase().replace(/\?/g, "").split(/\s+/).filter(Boolean).join(" ");
const seen = new Set(examples.map(e => norm(e.text)));
const test = T.parseDataset(fs.readFileSync(manifest.test, "utf8")).filter(e => !seen.has(norm(e.text)));
const ev = T.evaluate(new R.NLU(model), test);
model.stats.eval = { accuracy: +ev.accuracy.toFixed(1), slot_f1: +ev.slotF1.toFixed(2), n: ev.n }; // shown in the page
const json = JSON.stringify(model);
fs.writeFileSync(out, json);
console.log(`${out}: ${(json.length / 1024).toFixed(0)} KB, trained in ${model.stats.train_seconds}s ` +
  `(intent ${model.stats.intent_seconds}s, slots ${model.stats.slot_seconds}s)`);
console.log(`held-out: intent accuracy ${ev.accuracy.toFixed(1)}% (n=${ev.n}), slot F1 ${ev.slotF1.toFixed(2)}`);
if (verbose) console.log(ev.errors.join("\n"));
