// Dependency-free NLU runtime. Mirrors nlu/features.py + nlu/runtime.py exactly.
const NLURuntime = (() => {
  // letters of any alphabet: "Kraków", "Tübingen" are one word each (they were cut at ó and ü)
  const TOKEN_RE = /[\p{L}\p{N}_](?:[\p{L}\p{N}_.\-]*[\p{L}\p{N}_])?|[^\s\p{L}\p{N}_]/gu;
  const WORD_RE = /^[\p{L}\p{N}_]/u;
  const ALNUM = /^[\p{L}\p{N}]/u;
  const EXT_RE = /[a-z0-9_]\.[a-z0-9]{1,5}$/;
  const QUOTES = new Set(["'", '"', "‘", "’", "“", "”", "`"]);

  function tokenize(text) {
    const out = [];
    for (const m of text.matchAll(TOKEN_RE)) out.push([m[0], m.index, m.index + m[0].length]);
    return out;
  }

  // lex: word → family (skills/lexicon.md). A word of a family is read as the family's word, so
  // examples that teach one word teach them all.
  function intentFeatures(text, lex) {
    const toks = tokenize(text).map(t => t[0]).filter(t => WORD_RE.test(t)).map(t => t.toLowerCase())
      .map(t => (lex && lex[t]) || t);
    const feats = [];
    let prev = "<s>";
    for (const t of toks) {
      feats.push("w:" + t, "b:" + prev + "_" + t);
      const p = "<" + t + ">";
      for (const n of [3, 4]) for (let i = 0; i + n <= p.length; i++) feats.push("c:" + p.slice(i, i + n));
      prev = t;
    }
    feats.push("b:" + prev + "_</s>");
    return feats;
  }

  function shape(tok) {
    let out = "";
    for (const ch of tok) {
      const c = ch >= "A" && ch <= "Z" ? "X" : ch >= "a" && ch <= "z" ? "x" : ch >= "0" && ch <= "9" ? "d" : ch;
      if (out[out.length - 1] !== c) out += c;
    }
    return out;
  }

  function quoteMask(text, toks) {
    let inside = false;
    return toks.map(([tok, s, e]) => {
      if (QUOTES.has(tok)) {
        const before = s > 0 ? text[s - 1] : " ";
        const after = e < text.length ? text[e] : " ";
        if (!(ALNUM.test(before) && ALNUM.test(after))) { inside = !inside; return false; }
      }
      return inside;
    });
  }

  function tokenFeatures(text, toks) {
    const low = toks.map(t => t[0].toLowerCase());
    const q = quoteMask(text, toks);
    const n = low.length;
    const at = i => (i < 0 ? "BOS" : i >= n ? "EOS" : low[i]);
    return low.map((w, i) => {
      const f = ["bias", "w=" + w, "s3=" + w.slice(-3), "sh=" + shape(toks[i][0]),
        "w-1=" + at(i - 1), "w-2=" + at(i - 2), "w+1=" + at(i + 1), "w+2=" + at(i + 2),
        "w-1|w=" + at(i - 1) + "|" + w, "w|w+1=" + w + "|" + at(i + 1)];
      if (EXT_RE.test(w)) f.push("ext");
      if (q[i]) f.push("inq");
      return f;
    });
  }

  function f32(b64) {
    const bin = atob(b64);
    const bytes = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    return new Float32Array(bytes.buffer);
  }

  // format 2: only the kept weights, 1 byte each. Per feature: count, then (intent, value) pairs.
  function unpack(m, nf) {
    const bin = atob(m.weights), K = m.intents.length, coef = new Float32Array(K * nf);
    let o = 0;
    for (let j = 0; j < nf; j++) {
      const n = bin.charCodeAt(o++);
      for (let q = 0; q < n; q++) {
        const k = bin.charCodeAt(o++), v = bin.charCodeAt(o++);
        coef[k * nf + j] = (v > 127 ? v - 256 : v) * m.scale;
      }
    }
    return coef;
  }

  function spansFromLabels(text, toks, labels) {
    const out = [];
    let cur = null;
    toks.forEach(([, s, e], i) => {
      const lab = labels[i];
      if (lab.startsWith("B-") || (lab.startsWith("I-") && (!cur || cur[2] !== lab.slice(2)))) {
        if (cur) out.push(cur);
        cur = [s, e, lab.slice(2)];
      } else if (lab.startsWith("I-") && cur) cur[1] = e;
      else { if (cur) out.push(cur); cur = null; }
    });
    if (cur) out.push(cur);
    return out.map(([s, e, n]) => ({ name: n, value: text.slice(s, e) }));
  }

  class NLU {
    constructor(m, lexicon) {
      this.m = m;
      this.lex = lexicon || m.lexicon || null; // a newer lexicon works without retraining
      this.vocab = new Map(m.vocab.map((f, i) => [f, i]));
      this.idf = f32(m.idf);
      this.nf = m.vocab.length;
      this.coef = m.format === 2 ? unpack(m, this.nf) : f32(m.coef);
      this.L = m.labels.length;
    }
    classify(text) {
      const counts = new Map();
      for (const f of intentFeatures(text, this.lex)) {
        const j = this.vocab.get(f);
        if (j !== undefined) counts.set(j, (counts.get(j) || 0) + 1);
      }
      const vec = [];
      let norm = 0;
      for (const [j, c] of counts) { const v = (1 + Math.log(c)) * this.idf[j]; vec.push([j, v]); norm += v * v; }
      norm = Math.sqrt(norm) || 1;
      const scores = this.m.intents.map((_, k) => {
        let s = this.m.intercept[k];
        const base = k * this.nf;
        for (const [j, v] of vec) s += this.coef[base + j] * v / norm;
        return s;
      });
      const mx = Math.max(...scores);
      const ex = scores.map(s => Math.exp(s - mx));
      const sum = ex.reduce((a, b) => a + b, 0);
      return ex.map((e, i) => [this.m.intents[i], e / sum]).sort((a, b) => b[1] - a[1]);
    }
    tag(text, toks) {
      const L = this.L, st = this.m.state, tr = this.m.trans;
      const em = tokenFeatures(text, toks).map(feats => {
        const row = new Array(L).fill(0);
        for (const f of feats) {
          const w = st[f];
          if (w) for (let q = 0; q < w.length; q += 2) row[w[q]] += w[q + 1];
        }
        return row;
      });
      if (!em.length) return [];
      let score = em[0].slice();
      const back = [];
      for (let t = 1; t < em.length; t++) {
        const nw = new Array(L), bp = new Array(L);
        for (let b = 0; b < L; b++) {
          let best = -1e18, arg = 0;
          for (let a = 0; a < L; a++) { const v = score[a] + tr[a][b]; if (v > best) { best = v; arg = a; } }
          nw[b] = best + em[t][b]; bp[b] = arg;
        }
        score = nw; back.push(bp);
      }
      let last = 0;
      for (let i = 1; i < L; i++) if (score[i] > score[last]) last = i;
      const path = [last];
      for (let i = back.length - 1; i >= 0; i--) path.push(back[i][path[path.length - 1]]);
      return path.reverse().map(i => this.m.labels[i]);
    }
    parse(text) {
      const t0 = performance.now();
      const ranked = this.classify(text);
      const toks = tokenize(text);
      const labels = this.tag(text, toks);
      const slots = {};
      for (const { name, value } of spansFromLabels(text, toks, labels)) if (!(name in slots)) slots[name] = value;
      return { intent: ranked[0][0], confidence: ranked[0][1], ranking: ranked.slice(0, 3),
        slots, labels, ms: performance.now() - t0 };
    }
  }
  return { NLU, tokenize, intentFeatures, tokenFeatures };
})();
if (typeof module !== "undefined") module.exports = NLURuntime;
