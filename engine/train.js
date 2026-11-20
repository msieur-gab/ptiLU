// node engine/train.js: the packs → engine/model.json
// The model only proposes where a sentence goes (a skill, "ask" for the content, or out_of_scope); the
// patterns and the check decide. So it learns from the pack files alone: every pattern with its
// optional parts on and off, every "Also said" line, the content's questions and headings, and each
// pack's out-of-scope lines. No values to tag: values come from the patterns and their kinds.
const P = typeof EnginePatterns !== "undefined" ? EnginePatterns : require("./patterns.js");
const K = typeof EngineKinds !== "undefined" ? EngineKinds : require("./kinds.js");
const { Content } = typeof EngineContent !== "undefined" ? EngineContent : require("./content.js");

function examples(packs) {
  const out = [];
  // spans = where the values sit (from the patterns); a sentence without them (Also said, questions, out of
  // scope) teaches the skill, never the tagger: its values aren't marked, so they mustn't read as "no value"
  const add = (intent, text, spans = null) => out.push({ intent, text, spans: spans || [], noSlots: !spans });
  for (const s of packs.skills) {
    const samples = K.samplesFor(s);
    for (const p of s.patterns) for (const x of P.expandSpans(p, samples, 12)) add(s.name, x.text, x.spans);
    s.also.forEach((t, i) => add(s.name, t, s.alsoSpans && s.alsoSpans[i])); // marked values teach the tagger too
  }
  for (const t of packs.asks) add("ask", t);
  for (const d of packs.docs) {
    for (const doc of new Content([d], packs.talk.small).docs) {
      for (const q of doc.questions) add("ask", q.q);
      add("ask", `what is ${doc.title}`); add("ask", `tell me about ${doc.title}`);
      for (const sec of doc.sections) add("ask", `tell me about ${sec.heading.toLowerCase()}`);
    }
  }
  for (const t of packs.outOfScope) add("out_of_scope", t);
  return out;
}

if (typeof require !== "undefined" && require.main === module) {
  const fs = require("fs"), path = require("path");
  const ex = examples(require("./load.js").load());
  const model = require("../web/trainer.js").train(ex, { log: () => {} });
  const file = path.join(__dirname, "model.json");
  fs.writeFileSync(file, JSON.stringify(model));
  const by = {};
  for (const e of ex) by[e.intent] = (by[e.intent] || 0) + 1;
  console.log(`${ex.length} sentences, ${Object.keys(by).length} intents, trained in ${model.stats.train_seconds}s, ` +
    `${(fs.statSync(file).size / 1024).toFixed(0)} KB → engine/model.json`);
}

if (typeof module !== "undefined") module.exports = { examples };
