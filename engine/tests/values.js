// node engine/tests/values.js: are the values right? On main's sentences with their values marked:
// its handwritten held-out set (data/test.md), and its training sentences, which the engine never saw.
// Each value the engine ends with (acting, asking for the rest, or asking "do you want me to…") is
// compared with the marked one. With the tagger (the CRF) and without it.
const fs = require("fs");
const path = require("path");
const { make } = require("../make.js");
const T = require("../../web/trainer.js");
const R = require("../../web/runtime.js");
const MAP = { set_reminder: ["set-reminder", { task: "task" }], remember_me: [null, { name: "name", place: "place" }] };
const norm = t => String(t || "").toLowerCase().replace(/[^\p{L}\p{N}]+/gu, " ").trim();
const read = f => T.parseDataset(fs.readFileSync(path.join(__dirname, "../../data", f), "utf8"));
const sets = { "handwritten held-out (data/test.md)": read("test.md"),
  "main's sentences from its own skill templates (data/skills.md)": read("skills.md") };
const unused = {
  "main's training sentences, unseen by the engine": ["synth_v1.md", "synth_batch_A.md", "synth_batch_A1.md", "synth_batch_B.md", "synth_batch_C.md"].flatMap(read) };
const old = new R.NLU(JSON.parse(fs.readFileSync(path.join(__dirname, "../../models/model.json"), "utf8")));
for (const [label, all] of Object.entries(sets)) {
  const rows = all.filter(x => MAP[x.intent] && x.spans.length);
  for (const tagger of [false, true]) {
    const t = { right: 0, wrong: 0, missed: 0 };
    for (const x of rows) {
      const e = make({ withMeaning: false }); e.tagger = tagger;
      const r = e.respond(x.text), got = r.texts || {};
      for (const [s, en, slot] of x.spans) {
        const g = norm(x.text.slice(s, en)), v = got[MAP[x.intent][1][slot]];
        if (!v) t.missed++; else if (norm(v) === g) t.right++; else t.wrong++;
      }
    }
    console.log(`${label}, ${rows.length} sentences, ${tagger ? "patterns + tagger" : "patterns only   "}: right ${t.right}, wrong ${t.wrong}, missed ${t.missed}`);
  }
  if (label.startsWith("handwritten")) {
    const t = { right: 0, wrong: 0, missed: 0 };
    for (const x of rows) { const sl = old.parse(x.text).slots; for (const [s, en, slot] of x.spans) { const v = sl[slot]; if (!v) t.missed++; else if (norm(v) === norm(x.text.slice(s, en))) t.right++; else t.wrong++; } }
    console.log(`${label}, main's model (its CRF, trained on 6,286 sentences)        : right ${t.right}, wrong ${t.wrong}, missed ${t.missed}`);
  }
}
