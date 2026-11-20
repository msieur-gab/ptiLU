// Which skill a sentence is for: the nearest example sentences, by meaning (MiniLM vectors, built ahead in
// meaning.json, taught ones added on the spot), or by words when the model isn't there. Nothing is trained:
// a sentence taught to a skill is one more example, and it counts at once.
//   "Not for me" lines: when a sentence is nearer to one of a skill's "not for me" lines than to any of
//   its examples, that skill isn't proposed.

const T = require("./text.js");
const S = require("./skills.js");
const stem = w => w.length > 4 ? w.replace(/(ations?|ising|izing|ised|ized|ises|izes|ise|ize|ing|ed|es|s)$/, "") : w;

class Router {
  constructor(skills, small = new Set()) {
    this.small = small;
    this.items = [];
    for (const s of skills) {
      for (const text of S.examples(s)) this.items.push({ skill: s.name, text, neg: false });
      for (const text of s.notFor) this.items.push({ skill: s.name, text, neg: true });
    }
    this.vectors = null; // text → Float32Array
    this.reindex();
  }
  terms(text) { return T.words(text).filter(w => !this.small.has(w)).map(stem); }
  reindex() {
    this.df = new Map();
    for (const it of this.items) { it.terms = this.terms(it.text); for (const w of new Set(it.terms)) this.df.set(w, (this.df.get(w) || 0) + 1); }
    for (const it of this.items) it.w = this.weigh(it.terms);
  }
  weigh(terms) {
    const v = new Map(), n = this.items.length;
    for (const w of terms) v.set(w, (v.get(w) || 0) + Math.log(1 + n / (1 + (this.df.get(w) || 0))));
    const len = Math.sqrt([...v.values()].reduce((t, x) => t + x * x, 0)) || 1;
    for (const [w, x] of v) v.set(w, x / len);
    return v;
  }
  setVectors(map) { this.vectors = map; }
  // a taught sentence: one more example of its skill
  add(skill, text, vec) {
    this.items.push({ skill, text, neg: false });
    if (vec && this.vectors) this.vectors.set(text, vec);
    this.reindex();
  }
  // the skills, nearest first: { skill, score, by, example }
  rank(sentence, vec = null) {
    const byMeaning = !!(vec && this.vectors);
    const w = byMeaning ? null : this.weigh(this.terms(sentence));
    const best = new Map(), neg = new Map();
    for (const it of this.items) {
      let c = 0;
      if (byMeaning) { const v = this.vectors.get(it.text); if (!v) continue; for (let i = 0; i < v.length; i++) c += vec[i] * v[i]; }
      else for (const [t, x] of w) c += x * (it.w.get(t) || 0);
      const m = it.neg ? neg : best;
      if (!m.has(it.skill) || c > m.get(it.skill).score) m.set(it.skill, { score: c, example: it.text });
    }
    return [...best].filter(([s, b]) => !neg.has(s) || neg.get(s).score < b.score)
      .map(([skill, b]) => ({ skill, score: b.score, example: b.example, by: byMeaning ? "meaning" : "words" }))
      .sort((a, b) => b.score - a.score);
  }
}

// meaning.json: { dims, texts: [...], data: base64 of int8 × dims per text }
function decode(m) {
  const bin = typeof Buffer !== "undefined" ? Buffer.from(m.data, "base64") : Uint8Array.from(atob(m.data), c => c.charCodeAt(0));
  const i8 = new Int8Array(bin.buffer, bin.byteOffset, bin.length), map = new Map();
  m.texts.forEach((t, k) => {
    const v = new Float32Array(m.dims);
    let n = 0;
    for (let j = 0; j < m.dims; j++) { v[j] = i8[k * m.dims + j] / 127; n += v[j] * v[j]; }
    n = Math.sqrt(n) || 1;
    for (let j = 0; j < m.dims; j++) v[j] /= n;
    map.set(t, v);
  });
  return map;
}
function encode(texts, vecs) {
  const dims = vecs[0].length, i8 = new Int8Array(texts.length * dims);
  vecs.forEach((v, k) => { const top = Math.max(...Array.from(v, Math.abs)) || 1; for (let j = 0; j < dims; j++) i8[k * dims + j] = Math.round(v[j] * 127 / top); });
  return { dims, texts, data: Buffer.from(i8.buffer).toString("base64") };
}

if (typeof module !== "undefined") module.exports = { Router, decode, encode };
