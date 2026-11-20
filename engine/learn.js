// Teaching, from the inbox: a sentence becomes a pattern with placeholders, written under "## Learned" in
// the skill's own file, with the sentence it came from. It works at once: patterns are read before any
// model. Nod's rule, kept: the pattern is accepted only if it reads its own sentence back to exactly the
// values that were marked. Lines under "## People say" are the person's: teaching never changes them.

const T = typeof EngineText !== "undefined" ? EngineText : require("./text.js");
const P = typeof EnginePatterns !== "undefined" ? EnginePatterns : require("./patterns.js");
const K = typeof EngineKinds !== "undefined" ? EngineKinds : require("./kinds.js");

const esc = s => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

// marks: { slot: "the words in the sentence that are this value" }
function teach(engine, sentence, skillName, marks = {}) {
  const skill = engine.byName.get(skillName);
  if (!skill) return { ok: false, why: `no skill called ${skillName}` };
  const clean = engine.clean(sentence);
  let pattern = T.words(clean).join(" ");
  for (const [slot, text] of Object.entries(marks)) {
    if (!skill.needs[slot]) return { ok: false, why: `${skillName} has no value {${slot}}` };
    const words = T.words(text).join(" ");
    const re = new RegExp(`(^| )${esc(words)}(?= |$)`);
    if (!re.test(pattern)) return { ok: false, why: `"${text}" isn't in the sentence` };
    pattern = pattern.replace(re, `$1{${slot}}`);
  }
  const compiled = { ...P.compile(pattern), own: false, quote: clean, on: engine.now().toISOString().slice(0, 10) };
  const back = P.match(compiled, clean, engine.reader(skill));
  const same = back && Object.keys(marks).every(k => back.values[k] && T.words(back.values[k].text).join(" ") === T.words(marks[k]).join(" "))
    && Object.keys(back.values).length === Object.keys(marks).length;
  if (!same) return { ok: false, why: "the pattern doesn't read its own sentence back to the marked values" };
  if (skill.patterns.some(p => p.pattern === pattern)) return { ok: false, why: "already known" };
  skill.patterns.push(compiled);
  for (const w of T.words(pattern.replace(/\{\w+\}/g, " "))) engine.vocab.get(skill.name).add(w);
  const line = `- ${pattern}  ← "${clean}" (${compiled.on})`;
  skill.md = /\n## Learned\n/.test(skill.md) ? skill.md.replace(/\n## Learned\n((?:- .*\n?)*)/, (all, body) => `\n## Learned\n${body.replace(/\n?$/, "\n")}${line}\n`)
    : skill.md.replace(/\n?$/, "\n\n## Learned\n" + line + "\n");
  engine.inbox = engine.inbox.filter(e => e.sentence !== clean && e.sentence !== sentence);
  return { ok: true, pattern, line, md: skill.md, key: `s|${skill.name}|taught` };
}

// a learned line can be taken back; a line the person wrote can't be changed from here
function unlearn(engine, skillName, pattern) {
  const skill = engine.byName.get(skillName);
  const i = skill ? skill.patterns.findIndex(p => p.pattern === pattern) : -1;
  if (i < 0) return { ok: false, why: "no such pattern" };
  if (skill.patterns[i].own) return { ok: false, why: "written by you under People say: edit the file instead" };
  skill.patterns.splice(i, 1);
  skill.md = skill.md.replace(new RegExp(`\\n- ${esc(pattern)}  ← .*`), "");
  return { ok: true, md: skill.md };
}

// a question the content didn't answer, taught to the passage that does: `see` is the start of that
// passage, as the file says it. Accepted only if the passage is in the file and the question then finds it.
function teachContent(engine, sentence, doc, see) {
  const c = engine.content;
  const di = c ? c.docs.findIndex(d => d.id === doc || d.title === doc) : -1;
  if (di < 0) return { ok: false, why: `no file called ${doc}` };
  const want = c.terms(see).join(" ");
  if (!want || !c.docs[di].sections.some(s => s.sentences.some(x => c.terms(x).join(" ").includes(want)))) return { ok: false, why: `"${see}" isn't in ${c.docs[di].title}` };
  const q = engine.clean(sentence);
  c.learn(di, q, see);
  const r = c.answer(q);
  if (!r || r.frame.di !== di) { c.docs[di].questions.pop(); c.units.pop(); return { ok: false, why: "the question still doesn't find that passage" }; }
  engine.inbox = engine.inbox.filter(e => e.sentence !== q && e.sentence !== sentence);
  return { ok: true, line: `  - q: ${q}\n    see: ${see}`, say: r.say };
}

// a sentence from the inbox taught as another way of asking a question a file already lists: it gets that
// question's answer (its passage, or the file's written answer). Kept only if it then finds that file.
function teachQuestion(engine, sentence, title, listedQ) {
  const c = engine.content;
  const di = c ? c.docs.findIndex(d => d.title === title || d.id === title) : -1;
  const target = di >= 0 ? c.docs[di].questions.find(x => x.q === listedQ) : null;
  if (!target) return { ok: false, why: `"${listedQ}" isn't a question ${title} lists` };
  const q = engine.clean(sentence);
  c.learn(di, q, target.see);
  const r = c.answer(q);
  if (!r || r.frame.di !== di) { c.docs[di].questions.pop(); c.units.pop(); return { ok: false, why: "it still doesn't find that answer" }; }
  engine.inbox = engine.inbox.filter(e => e.sentence !== q && e.sentence !== sentence);
  return { ok: true, say: r.say, key: `q|${c.docs[di].id}|${target.q}`, line: target.see ? `  - q: ${q}\n    see: ${target.see}` : `  - ${q}` };
}

if (typeof module !== "undefined") module.exports = { teach, unlearn, teachContent, teachQuestion };
