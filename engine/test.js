// node engine/test.js [-v]: the dialogue scripts, every skill's tests.md, ptiLU's handwritten held-out
// sentences, the conversations of the 21 October review, and teaching. Fails on a script that changed
// or on any wrong action (doing something other than what was meant, without asking).
const fs = require("fs");
const path = require("path");
const { make } = require("./make.js");
const { teach, unlearn, teachContent } = require("./learn.js");
const T = require("../web/trainer.js");
const R = require("../web/runtime.js");

const verbose = process.argv.includes("-v");
const NOW = () => new Date("2026-11-20T08:30:00");
const fresh = () => make({ now: NOW });
let failed = 0;

// ---- 1. dialogue scripts: [said, outcome, skill or null, words the reply must hold]
const SCRIPTS = {
  "a timer, its length asked": [["set a timer", "ask", "set-timer"], ["twenty minutes", "act", "set-timer", "20 minutes"]],
  "a follow-up keeps the skill": [["set a timer for 10 minutes", "act", "set-timer"], ["and 5 minutes", "act", "set-timer", "5 minutes"]],
  "a reminder split from its time": [["remind me to call mum next friday at 3pm", "act", "set-reminder", "call mum on Friday 27 November at 15:00"]],
  "an ambiguous hour is asked": [["remind me to buy milk at 9", "ask", "set-reminder"], ["the evening one", "act", "set-reminder", "21:00"]],
  "a missing task is asked": [["set a reminder for tomorrow", "ask", "set-reminder"], ["water the plants", "act", "set-reminder", "water the plants"]],
  "a different request drops the question": [["set a timer", "ask", "set-timer"], ["what time is it", "act", "check-time", "08:30"]],
  "what it keeps about you": [["call me Gab", "act", "remember-name"], ["I live in Munich", "act", "remember-place"],
    ["what do you know about me", "act", "recall-me", "Gab"], ["forget everything about me", "approve", "forget-me"], ["yes", "act", "forget-me"],
    ["who am i", "act", "recall-me", "don't know"]],
  "no to an approval": [["forget me", "approve", "forget-me"], ["no", "abstain", null]],
  "a typo in a change asks first": [["could you set a timr for 3 minutes please", "ask", "set-timer"], ["yes", "act", "set-timer", "3 minutes"]],
  "untaught words ask, naming them": [["xyzzy flurb remind me plonk", "ask", "set-reminder", "xyzzy"], ["no", "abstain", null]],
  "content: a written answer, then more": [["what is ptilu", "act", null, "Private, Teachable"], ["tell me more", "act", null, "understands short requests"]],
  "content: a question stays in the file": [["why is it so small?", "act", null, "far more than needed"], ["and how do you teach it?", "act", null, "inbox"]],
  "content: nothing written": [["what is the weather?", "abstain", null, "anything written"]],
  "a command is never answered with a quote": [["move ideas to documnet", "abstain", null]],
  "help names the packs": [["what can you do", "act", "help", "ptiLU itself"]],
};
for (const [name, turns] of Object.entries(SCRIPTS)) {
  const e = fresh();
  for (const [said, outcome, skill, holds] of turns) {
    const r = e.respond(said);
    const ok = r.outcome === outcome && (skill === null || r.skill === skill) && (!holds || r.say.includes(holds));
    if (!ok) { failed++; console.log(`FAIL ${name}: "${said}" → [${r.outcome}] ${r.skill || ""} "${r.say}" (${r.why})`); }
    else if (verbose) console.log(`  ${said} → [${r.outcome}] ${r.say}`);
  }
}
console.log(`dialogue: ${Object.keys(SCRIPTS).length} scripts${failed ? `, ${failed} failed` : ", all passed"}`);

// ---- decisions on single sentences: right, asked, abstained, wrong (another skill, acted on)
function decide(e, sentence, want) {
  const r = e.respond(sentence);
  if (want && r.skill === want) return r.outcome === "ask" && r.say.includes("Do you want me") ? "asked" : "right";
  if (r.outcome === "abstain") return want ? "abstained" : "right";
  if (r.outcome === "ask" && r.say.includes("Do you want me")) return want ? "asked other" : "asked";
  if (!want && r.outcome === "act" && !r.skill) return "answered"; // a content answer to something no skill does
  return r.skill ? "wrong" : (want ? "abstained" : "right");
}
function tally(rows) {
  const t = {};
  for (const [, , d] of rows) t[d] = (t[d] || 0) + 1;
  return Object.entries(t).sort().map(([k, v]) => `${k} ${v}`).join(", ");
}

// ---- 2. every skill's tests.md
const all = [];
for (const s of fresh().skills) for (const t of s.tests) all.push([t, s.name, decide(fresh(), t, s.name)]);
console.log(`tests.md (${all.length} sentences): ${tally(all)}`);
if (verbose) for (const [t, want, d] of all) if (d !== "right") console.log(`  ${d}: "${t}" (${want})`);

// ---- 3. ptiLU's handwritten held-out sentences (data/test.md), never seen by the engine
const MAP = { get_time: "check-time", get_date: "check-date", set_timer: "set-timer", set_reminder: "set-reminder", greet: "greet",
  thanks: "thanks", help: "help", recall_me: "recall-me", forget_me: "forget-me", remember_me: ["remember-name", "remember-place"] };
const held = T.parseDataset(fs.readFileSync(path.join(__dirname, "../data/test.md"), "utf8")).filter(x => x.intent !== "affirm" && x.intent !== "deny");
const rows = [], oldRows = [];
const old = new R.NLU(JSON.parse(fs.readFileSync(path.join(__dirname, "../models/model.json"), "utf8")));
for (const x of held) {
  const wants = [].concat(MAP[x.intent] || []);
  const e = fresh();
  let d = decide(e, x.text, wants[0] || null);
  if (wants[1] && d !== "right") d = decide(fresh(), x.text, wants[1]);
  rows.push([x.text, x.intent, d]);
  const p = old.parse(x.text), got = p.confidence >= 0.45 ? p.intent : "out_of_scope";
  if (MAP[x.intent]) oldRows.push([x.text, x.intent, got === x.intent ? "right" : "missed"]);
}
const mine = rows.filter(r => MAP[r[1]]), others = rows.filter(r => !MAP[r[1]]);
console.log(`held-out, skills in the packs (${mine.length}): ${tally(mine)}   [main's model, intent only: ${tally(oldRows)}]`);
console.log(`held-out, skills not in the packs (${others.length}): ${tally(others)}`);
if (verbose) for (const [t, i, d] of rows) if (d !== "right") console.log(`  ${d}: "${t}" (${i})`);

// ---- 4. the 21 October review: what made a folder called seed.md must not act
const review = ["move ideas to documnet", "move the ideas folder inside the document folder", "please create a new seed.md inside ideas folder",
  "xyzzy flurb remind me plonk", "is precipitation likely tomorrow?", "rename notes.md to ideas.md"];
const rv = review.map(t => [t, null, decide(fresh(), t, null)]);
console.log(`review conversations (${rv.length}): ${tally(rv)}`);

// ---- 5. teaching: a sentence from the inbox works at once, and a person's own line can't be removed
{
  const e = fresh();
  const r1 = e.respond("give me 10 minutes on the clock");
  const taught = teach(e, "give me 10 minutes on the clock", "set-timer", { duration: "10 minutes" });
  const r2 = e.respond("give me 25 minutes on the clock");
  const refused = teach(e, "give me 3 minutes on the clock", "set-timer", { duration: "on the clock" });
  const own = unlearn(e, "set-timer", e.byName.get("set-timer").patterns[0].pattern);
  const ok = r1.outcome !== "act" && taught.ok && r2.outcome === "act" && r2.say.includes("25 minutes") && !refused.ok && !own.ok && /## Learned\n- give me \{duration\} on the clock/.test(taught.md);
  if (!ok) { failed++; console.log("FAIL teaching", { r1: r1.say, taught, r2: r2.say, refused, own }); }
  else console.log(`teaching: "${taught.line.slice(2)}" works at once`);
}

// ---- 6. teaching the content: a question it had nothing for, pointed to the passage that answers it
{
  const e = fresh();
  const before = e.respond("is ptilu heavy?");
  const t = teachContent(e, "is ptilu heavy?", "ptilu", "Assistants usually sit on a large language model");
  const after = e.respond("is ptilu heavy?");
  const bad = teachContent(e, "what colour is it?", "ptilu", "a sentence that isn't there");
  const ok = !(before.say || "").startsWith("Assistants usually") && t.ok && after.outcome === "act" && after.say.startsWith("Assistants usually") && !bad.ok;
  if (!ok) { failed++; console.log("FAIL content teaching", { before: before.say, t, after: after.say, bad }); }
  else console.log(`content teaching: "is ptilu heavy?" now finds its passage`);
}

// ---- 7. real sentences Gab typed (engine/tests/real.md): where each must, or must not, land
{
  const lines = fs.readFileSync(path.join(__dirname, "tests/real.md"), "utf8").split("\n").filter(l => /^- .+ → /.test(l));
  let bad = 0;
  for (const l of lines) {
    const [, said, want] = l.match(/^- (.+) → (.+)$/);
    const e = fresh(), r = e.respond(said);
    const got = r.source && e.frame && e.frame.kind === "content" ? e.content.docs[e.frame.di].id : "nothing";
    const ok = want.startsWith("not ") ? got !== want.slice(4) : got === want;
    if (!ok) { bad++; console.log(`FAIL real: "${said}" → ${got} (want ${want}) · ${r.say.slice(0, 60)}`); }
  }
  if (bad) failed++; else console.log(`real sentences: ${lines.length}, all where they belong`);
}

const wrong = [...all, ...rv, ...others].filter(r => r[2] === "wrong").length;
if (wrong) { failed++; console.log(`FAIL: ${wrong} wrong actions`); }
process.exit(failed ? 1 : 0);
