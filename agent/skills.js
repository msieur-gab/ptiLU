// A skill file, read. One file per kind of question or request:
//
//   ---
//   label: test an idea before the budget      what the agent calls it ("Do you mean: …?")
//   kind: question                              question · about · contact · do · talk
//   leads: [senz]                               the projects a question skill opens (cards, then content)
//   fallback: yes                               where a sentence nothing answers goes (one skill, at most)
//   ---
//   ## People say      patterns, read exactly (TermNL's syntax): they win before any meaning
//   ## Also said       example sentences: what the meaning routes by
//   ## Not for me      sentences that look like this skill but aren't: they keep it from being proposed
//   ## Answer          the reply, in the owner's words (a question skill without one introduces its projects)
//   ## What it needs   values: "- {duration}: a duration. If it's missing, ask: For how long?"
//   ## Does            a command for the page (timer.start {duration}, form.open)
//   ## Replies         done: … | …
//   ## Learned         sentences taught from the inbox, with the day: "- how do we test faster (2026-11-20)"

const F = require("./files.js");
const P = require("./patterns.js");
const K = require("./kinds.js");

const KINDS = ["question", "about", "contact", "do", "talk"];
const LEARNED = /^(.*?)\s+\((\d{4}-\d\d-\d\d)\)$/;

function readSkill(name, md) {
  const { meta, body } = F.frontMatter(md);
  const s = F.sections(body);
  const lines = k => (s[k] || { lines: [] }).lines;
  const fail = why => { throw new Error(`skills/${name}.md: ${why}`); };
  const kind = meta.kind || "do";
  if (!KINDS.includes(kind)) fail(`kind "${kind}" isn't one of ${KINDS.join(", ")}`);
  if (!meta.label) fail("no `label:` line");
  const needs = {};
  for (const line of lines("what it needs")) {
    const m = line.match(/^\{(\w+)\}:\s*(.+)$/);
    if (!m) fail(`can't read "${line}" under What it needs`);
    const [k, rest = ""] = m[2].split(/\.\s+(?=If it)/);
    const ask = rest.match(/^If it's missing, ask:\s*(.+)$/);
    try { K.reader(k.replace(/\.$/, "")); } catch (e) { fail(e.message); }
    needs[m[1]] = { kind: k.replace(/\.$/, ""), ask: ask ? ask[1].split(/\s+\|\s+/) : ["Which one?"] };
  }
  const patterns = lines("people say").map(l => P.compile(l));
  for (const p of patterns) for (const slot of p.slots) if (!needs[slot]) fail(`{${slot}} in "${p.pattern}" isn't under What it needs`);
  const learned = lines("learned").map(l => { const m = l.match(LEARNED); return m ? { text: m[1], on: m[2] } : { text: l, on: null }; });
  const answer = (s["answer"] || { text: "" }).text.trim().replace(/\s*\n\s*/g, " ");
  const replies = F.keyed(lines("replies"));
  if (kind !== "question" && !replies.done) fail("no `done:` reply");
  return {
    name, kind, label: meta.label, leads: meta.leads || [], fallback: meta.fallback === "yes",
    needs, patterns, also: lines("also said"), notFor: lines("not for me"), learned, answer, replies,
    command: (s["does"] || { text: "" }).text.trim().split("\n")[0] || null, md,
  };
}

// what the meaning routes by: the patterns written out (values filled with samples), the "Also said"
// sentences and what was taught
function examples(skill) {
  const out = new Set();
  const samples = K.samplesFor({ needs: skill.needs, samples: {} });
  for (const p of skill.patterns) for (const t of P.expand(p, samples, 6)) out.add(t);
  for (const t of skill.also) out.add(t);
  for (const l of skill.learned) out.add(l.text);
  return [...out];
}

// a taught sentence, written under "## Learned" in the skill's own file
function addLearned(skill, text, on) {
  skill.learned.push({ text, on });
  const line = `- ${text} (${on})`;
  skill.md = /\n## Learned\n/.test(skill.md)
    ? skill.md.replace(/\n## Learned\n((?:- .*\n?)*)/, (all, b) => `\n## Learned\n${b.replace(/\n?$/, "\n")}${line}\n`)
    : skill.md.replace(/\n?$/, `\n\n## Learned\n${line}\n`);
  return line;
}

if (typeof module !== "undefined") module.exports = { readSkill, examples, addLearned };
