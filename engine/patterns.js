// "People say" patterns, read exactly. TermNL's syntax:
//   (a/the)   optional, one of these words        to/into   one of these words
//   {name}    a value, read by its kind           (from (the) {place})   optional groups nest
// A pattern reads a sentence only if it covers every word of it, and every value reads whole.

const { tokens, close } = typeof EngineText !== "undefined" ? EngineText : require("./text.js");

function compile(pattern) {
  const lex = pattern.toLowerCase().replace(/[?!,.](?=\s|$)/g, "").match(/\(|\)|\{[\w]+\}|[^\s(){}]+/g) || [];
  let i = 0;
  function seq() {
    const out = [];
    while (i < lex.length && lex[i] !== ")") {
      const t = lex[i++];
      if (t === "(") { out.push({ opt: seq() }); i++; } // the ")"
      else if (t[0] === "{") out.push({ slot: t.slice(1, -1) });
      else out.push({ alt: t.split("/").map(w => tokens(w).map(x => x.w).join(" ")) });
    }
    return out;
  }
  const items = seq();
  return { pattern, items, slots: slotsOf(items) };
}
const slotsOf = items => items.flatMap(it => (it.slot ? [it.slot] : it.opt ? slotsOf(it.opt) : []));

// every full reading of the sentence: { values, literals, typos }
function* walk(items, k, toks, ti, acc, read) {
  if (k === items.length) { yield { ...acc, ti }; return; }
  const it = items[k];
  if (it.alt) {
    // a word with an apostrophe or a dot is one token, a phrase is several: compare word by word
    for (const a of it.alt) {
      const ws = a.split(" ");
      if (ti + ws.length > toks.length) continue;
      let typos = 0, ok = true;
      for (let j = 0; j < ws.length; j++) {
        const w = toks[ti + j].w;
        if (w === ws[j]) continue;
        if (close(w, ws[j])) typos++; else { ok = false; break; }
      }
      if (ok) yield* walk(items, k + 1, toks, ti + ws.length, { ...acc, literals: acc.literals + ws.length, typos: acc.typos + typos }, read);
    }
    return;
  }
  if (it.opt) {
    for (const r of walk(it.opt, 0, toks, ti, acc, read)) yield* walk(items, k + 1, toks, r.ti, r, read);
    yield* walk(items, k + 1, toks, ti, acc, read);
    return;
  }
  for (let end = ti + 1; end <= toks.length; end++) {
    const text = toks.slice(ti, end).map(t => t.o).join(" ");
    const v = read(it.slot, text);
    if (v) yield* walk(items, k + 1, toks, end, { ...acc, values: { ...acc.values, [it.slot]: { text, ...v } } }, read);
  }
}

// the best reading of a sentence by one compiled pattern, or null. read(slot, text) → value or null
function match(compiled, sentence, read) {
  const toks = typeof sentence === "string" ? tokens(sentence) : sentence;
  let best = null;
  for (const r of walk(compiled.items, 0, toks, 0, { values: {}, literals: 0, typos: 0 }, read)) {
    if (r.ti !== toks.length) continue;
    const typed = Object.values(r.values).filter(v => v.iso || v.seconds !== undefined).length;
    const score = 3 * Object.keys(r.values).length + typed + r.literals - 2 * r.typos;
    if (!best || score > best.score) best = { values: r.values, literals: r.literals, typos: r.typos, score, pattern: compiled.pattern };
  }
  return best;
}

// sentences for the model: each pattern with its optional parts on and off, values from samples
function expand(compiled, samples, limit = 24) {
  const outs = [];
  function* gen(items, k, acc) {
    if (k === items.length) { yield acc; return; }
    const it = items[k];
    if (it.alt) { for (const a of it.alt) yield* gen(items, k + 1, acc.concat(a)); return; }
    if (it.opt) { for (const o of gen(it.opt, 0, [])) yield* gen(items, k + 1, acc.concat(o)); yield* gen(items, k + 1, acc); return; }
    const s = samples[it.slot] || ["something"];
    yield* gen(items, k + 1, acc.concat(s[(acc.length + k) % s.length]));
  }
  for (const words of gen(compiled.items, 0, [])) { outs.push(words.join(" ")); if (outs.length >= 400) break; }
  if (outs.length <= limit) return outs;
  return Array.from({ length: limit }, (_, i) => outs[Math.floor(i * outs.length / limit)]); // spread over all forms
}

// the same, with where each value sits ([start, end, slot] in the text): labelled sentences for the tagger
function expandSpans(compiled, samples, limit = 24) {
  const outs = [];
  function* gen(items, k, acc) {
    if (k === items.length) { yield acc; return; }
    const it = items[k];
    if (it.alt) { for (const a of it.alt) yield* gen(items, k + 1, acc.concat({ w: a })); return; }
    if (it.opt) { for (const o of gen(it.opt, 0, [])) yield* gen(items, k + 1, acc.concat(o)); yield* gen(items, k + 1, acc); return; }
    const s = samples[it.slot] || ["something"];
    yield* gen(items, k + 1, acc.concat({ w: s[(acc.length + k + outs.length) % s.length], slot: it.slot }));
  }
  for (const parts of gen(compiled.items, 0, [])) {
    let text = "";
    const spans = [];
    for (const p of parts) {
      if (text) text += " ";
      if (p.slot) spans.push([text.length, text.length + p.w.length, p.slot]);
      text += p.w;
    }
    outs.push({ text, spans });
    if (outs.length >= 400) break;
  }
  if (outs.length <= limit) return outs;
  return Array.from({ length: limit }, (_, i) => outs[Math.floor(i * outs.length / limit)]);
}

if (typeof module !== "undefined") module.exports = { compile, match, expand, expandSpans };
