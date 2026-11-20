// A skill file read into what the engine uses, and checked: a mistake stops with the file and the reason.

const F = typeof EngineFiles !== "undefined" ? EngineFiles : require("./files.js");
const P = typeof EnginePatterns !== "undefined" ? EnginePatterns : require("./patterns.js");
const K = typeof EngineKinds !== "undefined" ? EngineKinds : require("./kinds.js");

const LEARNED = /^(.*?)\s+←\s+"(.*)"\s*(?:\((.*)\))?$/;

function readSkill(name, md, pack) {
  const { meta, body } = F.frontMatter(md);
  const s = F.sections(body);
  const fail = why => { throw new Error(`${pack}/skills/${name}/skill.md: ${why}`); };
  if (!meta.does) fail("no `does:` line");
  const needs = {};
  for (const line of (s["what it needs"] || { lines: [] }).lines) {
    const m = line.match(/^\{(\w+)\}:\s*(.+)$/);
    if (!m) fail(`can't read "${line}" under What it needs`);
    const [kind, rest = ""] = m[2].split(/\.\s+(?=If it)/);
    const ask = rest.match(/^If it's missing, ask:\s*(.+)$/);
    const dflt = rest.match(/^If it's not said:\s*(.+?)\.?$/);
    try { K.reader(kind.replace(/\.$/, "")); } catch (e) { fail(e.message); }
    needs[m[1]] = { kind: kind.replace(/\.$/, ""), ask: ask ? ask[1].split(/\s+\|\s+/) : null, default: dflt ? dflt[1] : null };
  }
  const patterns = [];
  for (const line of (s["people say"] || { lines: [] }).lines) patterns.push({ ...P.compile(line), own: true });
  for (const line of (s["learned"] || { lines: [] }).lines) {
    const m = line.match(LEARNED);
    patterns.push({ ...P.compile(m ? m[1] : line), own: false, quote: m ? m[2] : null, on: m ? m[3] : null });
  }
  for (const p of patterns) for (const slot of p.slots) if (!needs[slot]) fail(`{${slot}} in "${p.pattern}" isn't under What it needs`);
  const replies = F.keyed((s["replies"] || { lines: [] }).lines);
  if (!replies.done) fail("no `done:` reply");
  const samples = {};
  for (const [k, v] of Object.entries(F.keyed((s["samples"] || { lines: [] }).lines))) samples[k] = v;
  return {
    name, pack, does: meta.does, label: meta.label || meta.does,
    acts: meta.acts === "yes", approve: meta.approve === "yes", role: meta.role || null,
    needs, patterns, ...alsoSaid((s["also said"] || { lines: [] }).lines, needs, fail), replies, samples,
    command: ((s["does"] || { text: "" }).text.trim().split("\n")[0]) || null,
    tests: [], md,
  };
}

// "Also said" lines may mark their values as main's data did: "I just moved to [Rotterdam](place)". The
// plain sentence teaches the skill; the marks also teach the tagger where values sit
function alsoSaid(lines, needs, fail) {
  const also = [], alsoSpans = [];
  for (const line of lines) {
    let text = "", pos = 0, marked = false;
    const spans = [];
    for (const m of line.matchAll(/\[([^\]]+)\]\((\w+)\)/g)) {
      if (!needs[m[2]]) fail(`[${m[1]}](${m[2]}) in "${line}": no value {${m[2]}} under What it needs`);
      text += line.slice(pos, m.index);
      spans.push([text.length, text.length + m[1].length, m[2]]);
      text += m[1];
      pos = m.index + m[0].length;
      marked = true;
    }
    text += line.slice(pos);
    also.push(text);
    alsoSpans.push(marked ? spans : null);
  }
  return { also, alsoSpans };
}

// a skill's own words: what its patterns, sentences and samples say (the taught-words check)
function vocabulary(skill, wordsOf) {
  const v = new Set();
  for (const p of skill.patterns) for (const w of wordsOf(p.pattern.replace(/\{\w+\}|[()]/g, " ").replace(/\//g, " "))) v.add(w);
  for (const l of skill.also) for (const w of wordsOf(l)) v.add(w);
  return v;
}

if (typeof module !== "undefined") module.exports = { readSkill, vocabulary, LEARNED };
