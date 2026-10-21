// Dependency-free trainer: annotated Markdown in, model.json out.
// Runs in Node (train.js), in a browser Web Worker (on-device retraining), anywhere with JavaScript.
// Needs the feature functions of web/runtime.js (NLURuntime).
//
//   intent : TF-IDF (same features as the runtime) + multinomial logistic regression, L-BFGS
//   slots  : linear-chain CRF, L-BFGS (the runtime decodes it with Viterbi)
//   export : weak intent weights dropped, the rest stored as 1-byte integers (format 2)

const NLUTrainer = (() => {
  const R = typeof NLURuntime !== "undefined" ? NLURuntime : require("./runtime.js");
  const { tokenize, intentFeatures, tokenFeatures } = R;

  // ---------- dataset (same Markdown format as nlu/dataset.py) ----------
  const SPAN_RE = /\[([^\]]+)\]\(([a-z_]+)\)/g;
  const HEADER_RE = /^##\s*intent:\s*([a-z_]+)\s*$/;
  function parseLine(line) {
    let text = "", pos = 0;
    const spans = [];
    for (const m of line.matchAll(SPAN_RE)) {
      text += line.slice(pos, m.index);
      const start = text.length;
      text += m[1];
      spans.push([start, text.length, m[2]]);
      pos = m.index + m[0].length;
    }
    return { text: text + line.slice(pos), spans };
  }
  function parseDataset(md) {
    const out = [];
    let intent = null;
    for (const raw of md.split("\n")) {
      const line = raw.trim();
      const h = HEADER_RE.exec(line);
      if (h) { intent = h[1]; continue; }
      if (line.startsWith("- ") && intent) out.push({ intent, ...parseLine(line.slice(2).trim()) });
    }
    return out;
  }
  function bio(text, spans) {
    const toks = tokenize(text);
    const labels = toks.map(([, s, e]) => {
      for (const [ss, se, name] of spans) if (s >= ss && e <= se) return (s === ss ? "B-" : "I-") + name;
      return "O";
    });
    return { toks, labels };
  }

  // ---------- helpers ----------
  function b64(bytes) {
    let s = "";
    for (let i = 0; i < bytes.length; i += 0x8000) s += String.fromCharCode.apply(null, bytes.subarray(i, i + 0x8000));
    return btoa(s);
  }
  const now = () => (typeof performance !== "undefined" ? performance.now() : Date.now());

  // ---------- intent: TF-IDF ----------
  function tfidf(texts, lex, minDf = 2) {
    const docs = texts.map(t => { const c = new Map(); for (const f of intentFeatures(t, lex)) c.set(f, (c.get(f) || 0) + 1); return c; });
    const df = new Map();
    for (const d of docs) for (const f of d.keys()) df.set(f, (df.get(f) || 0) + 1);
    const vocab = [...df.keys()].filter(f => df.get(f) >= minDf).sort();
    const index = new Map(vocab.map((f, i) => [f, i]));
    const n = texts.length;
    const idf = new Float64Array(vocab.length);
    vocab.forEach((f, i) => { idf[i] = Math.log((1 + n) / (1 + df.get(f))) + 1; });
    const rows = docs.map(d => {
      const idx = [], val = [];
      let norm = 0;
      for (const [f, c] of d) {
        const j = index.get(f);
        if (j === undefined) continue;
        const v = (1 + Math.log(c)) * idf[j];
        idx.push(j); val.push(v); norm += v * v;
      }
      norm = Math.sqrt(norm) || 1;
      return { idx: Int32Array.from(idx), val: Float64Array.from(val, v => v / norm) };
    });
    return { vocab, idf, rows };
  }

  // ---------- intent: logistic regression ----------
  // minimise  sum_i w_i * crossentropy_i  +  |W|^2 / (2C)   (intercepts not penalised), as scikit-learn does
  function logreg(rows, y, K, nf, { C = 8, maxIter = 200, tol = 1e-4, onStep } = {}) {
    const n = rows.length, P = K * nf + K;
    const counts = new Float64Array(K);
    for (const k of y) counts[k]++;
    const sw = y.map(k => n / (K * counts[k])); // class_weight="balanced"
    const scores = new Float64Array(K);
    function fg(w, g) {
      g.fill(0);
      let f = 0;
      for (let i = 0; i < n; i++) {
        const { idx, val } = rows[i];
        let mx = -Infinity;
        for (let k = 0; k < K; k++) {
          let s = w[K * nf + k];
          const base = k * nf;
          for (let q = 0; q < idx.length; q++) s += w[base + idx[q]] * val[q];
          scores[k] = s; if (s > mx) mx = s;
        }
        let z = 0;
        for (let k = 0; k < K; k++) { scores[k] = Math.exp(scores[k] - mx); z += scores[k]; }
        f += sw[i] * (Math.log(z) + mx - (Math.log(scores[y[i]]) + mx));
        for (let k = 0; k < K; k++) {
          const d = sw[i] * (scores[k] / z - (k === y[i] ? 1 : 0));
          if (d === 0) continue;
          const base = k * nf;
          for (let q = 0; q < idx.length; q++) g[base + idx[q]] += d * val[q];
          g[K * nf + k] += d;
        }
      }
      for (let p = 0; p < K * nf; p++) { f += w[p] * w[p] / (2 * C); g[p] += w[p] / C; }
      return f;
    }
    return lbfgs(fg, new Float64Array(P), { maxIter, tol, onStep });
  }

  function lbfgs(fg, x, { m = 10, maxIter = 200, tol = 1e-4, onStep } = {}) {
    const P = x.length;
    let g = new Float64Array(P), f = fg(x, g);
    const S = [], Y = [], rho = [];
    const dot = (a, b) => { let s = 0; for (let i = 0; i < P; i++) s += a[i] * b[i]; return s; };
    const xn = new Float64Array(P), gn = new Float64Array(P), d = new Float64Array(P);
    let it = 0;
    for (; it < maxIter; it++) {
      let gmax = 0;
      for (let i = 0; i < P; i++) gmax = Math.max(gmax, Math.abs(g[i]));
      if (gmax < tol) break;
      // two-loop recursion: d = -H g
      for (let i = 0; i < P; i++) d[i] = -g[i];
      const alpha = new Array(S.length);
      for (let j = S.length - 1; j >= 0; j--) { alpha[j] = rho[j] * dot(S[j], d); for (let i = 0; i < P; i++) d[i] -= alpha[j] * Y[j][i]; }
      const gamma = S.length ? dot(S[S.length - 1], Y[Y.length - 1]) / dot(Y[Y.length - 1], Y[Y.length - 1]) : 1 / Math.sqrt(dot(g, g));
      for (let i = 0; i < P; i++) d[i] *= gamma;
      for (let j = 0; j < S.length; j++) { const b = rho[j] * dot(Y[j], d); for (let i = 0; i < P; i++) d[i] += S[j][i] * (alpha[j] - b); }
      // backtracking line search (Armijo)
      let slope = dot(g, d);
      if (slope >= 0) { for (let i = 0; i < P; i++) d[i] = -g[i]; S.length = Y.length = rho.length = 0; slope = dot(g, d); }
      let step = 1, fn;
      for (let ls = 0; ls < 30; ls++) {
        for (let i = 0; i < P; i++) xn[i] = x[i] + step * d[i];
        fn = fg(xn, gn);
        if (fn <= f + 1e-4 * step * slope) break;
        step *= 0.5;
      }
      const s = new Float64Array(P), yv = new Float64Array(P);
      for (let i = 0; i < P; i++) { s[i] = xn[i] - x[i]; yv[i] = gn[i] - g[i]; }
      const sy = dot(s, yv);
      if (sy > 1e-10) { S.push(s); Y.push(yv); rho.push(1 / sy); if (S.length > m) { S.shift(); Y.shift(); rho.shift(); } }
      x.set(xn); g.set(gn);
      const rel = Math.abs(f - fn) / Math.max(1, Math.abs(f));
      f = fn;
      if (onStep && it % 10 === 0) onStep(it, f);
      if (rel < 1e-9) break;
    }
    return { w: x, iterations: it, loss: f };
  }

  // ---------- slots: linear-chain CRF (what sklearn-crfsuite trained), L2 penalty, L-BFGS ----------
  // Parameters exist only for (attribute, label) pairs seen in the gold data, like crfsuite's default.
  function crf(seqs, labels, { c2 = 0.05, maxIter = 150, keep = 0.01, onStep } = {}) {
    const L = labels.length;
    const attrId = new Map(), attrNames = [];
    const pairs = []; // per attribute: Map label -> param index
    let P = 0;
    const enc = seqs.map(({ feats, gold }) => feats.map((fs, t) => {
      const ids = [];
      for (const f of fs) {
        let a = attrId.get(f);
        if (a === undefined) { a = attrNames.length; attrId.set(f, a); attrNames.push(f); pairs.push(new Map()); }
        if (!pairs[a].has(gold[t])) pairs[a].set(gold[t], P++);
        ids.push(a);
      }
      return Int32Array.from(ids);
    }));
    // flatten (label, param) lists per attribute
    const aLab = pairs.map(m => Int32Array.from(m.keys())), aPar = pairs.map(m => Int32Array.from(m.values()));
    const TB = P; // transitions start here
    const NP = P + L * L;
    let maxT = 0;
    for (const s of seqs) maxT = Math.max(maxT, s.gold.length);
    const psi = new Float64Array(maxT * L), al = new Float64Array(maxT * L), be = new Float64Array(maxT * L), c = new Float64Array(maxT);
    const M = new Float64Array(L * L);

    function fg(w, g) {
      g.fill(0);
      let f = 0;
      for (let q = 0; q < L * L; q++) M[q] = Math.exp(w[TB + q]);
      for (let i = 0; i < seqs.length; i++) {
        const X = enc[i], gold = seqs[i].gold, T = gold.length;
        if (!T) continue;
        let goldScore = 0;
        for (let t = 0; t < T; t++) {
          const row = t * L;
          for (let y = 0; y < L; y++) psi[row + y] = 0;
          for (const a of X[t]) { const lb = aLab[a], pr = aPar[a]; for (let q = 0; q < lb.length; q++) psi[row + lb[q]] += w[pr[q]]; }
          goldScore += psi[row + gold[t]];
          if (t) goldScore += w[TB + gold[t - 1] * L + gold[t]];
          for (let y = 0; y < L; y++) psi[row + y] = Math.exp(Math.max(-300, Math.min(300, psi[row + y])));
        }
        // forward (scaled)
        let logZ = 0;
        for (let t = 0; t < T; t++) {
          let sum = 0;
          for (let y = 0; y < L; y++) {
            let v;
            if (!t) v = psi[y];
            else { v = 0; for (let a = 0; a < L; a++) v += al[(t - 1) * L + a] * M[a * L + y]; v *= psi[t * L + y]; }
            al[t * L + y] = v; sum += v;
          }
          c[t] = sum; logZ += Math.log(sum);
          for (let y = 0; y < L; y++) al[t * L + y] /= sum;
        }
        // backward (same scaling)
        for (let y = 0; y < L; y++) be[(T - 1) * L + y] = 1;
        for (let t = T - 2; t >= 0; t--) for (let a = 0; a < L; a++) {
          let v = 0;
          for (let b = 0; b < L; b++) v += M[a * L + b] * psi[(t + 1) * L + b] * be[(t + 1) * L + b];
          be[t * L + a] = v / c[t + 1];
        }
        f += logZ - goldScore;
        // expected minus observed counts
        for (let t = 0; t < T; t++) {
          for (const a of X[t]) {
            const lb = aLab[a], pr = aPar[a];
            for (let q = 0; q < lb.length; q++) g[pr[q]] += al[t * L + lb[q]] * be[t * L + lb[q]];
            const pg = pairs[a].get(gold[t]);
            g[pg] -= 1;
          }
          if (t) {
            for (let a = 0; a < L; a++) {
              const fa = al[(t - 1) * L + a] / c[t];
              if (!fa) continue;
              for (let b = 0; b < L; b++) g[TB + a * L + b] += fa * M[a * L + b] * psi[t * L + b] * be[t * L + b];
            }
            g[TB + gold[t - 1] * L + gold[t]] -= 1;
          }
        }
      }
      for (let p = 0; p < NP; p++) { f += c2 * w[p] * w[p]; g[p] += 2 * c2 * w[p]; }
      return f;
    }
    const res = lbfgs(fg, new Float64Array(NP), { maxIter, tol: 1e-3, onStep });
    const w = res.w, state = {};
    for (let a = 0; a < attrNames.length; a++) {
      const out = [], lb = aLab[a], pr = aPar[a];
      for (let q = 0; q < lb.length; q++) if (Math.abs(w[pr[q]]) >= keep) out.push(lb[q], Math.round(w[pr[q]] * 100) / 100);
      if (out.length) state[attrNames[a]] = out;
    }
    const trans = [];
    for (let a = 0; a < L; a++) { const r = []; for (let b = 0; b < L; b++) r.push(Math.round(w[TB + a * L + b] * 1e4) / 1e4); trans.push(r); }
    return { state, trans, params: NP, iterations: res.iterations };
  }

  // ---------- train + export ----------
  function train(examples, opts = {}) {
    const { prune = 0.2, C = 8, c2 = 0.05, slotPrune = 0.2, slotIter = 150, lexicon = null, log = () => {} } = opts;
    const t0 = now();
    const intents = [...new Set(examples.map(e => e.intent))].sort();
    const K = intents.length;
    const y = examples.map(e => intents.indexOf(e.intent));
    log(`${examples.length} sentences, ${K} intents`);

    const { vocab, idf, rows } = tfidf(examples.map(e => e.text), lexicon);
    const nf = vocab.length;
    log(`intent features: ${nf}`);
    const lr = logreg(rows, y, K, nf, { C, onStep: (it, f) => log(`intent model: step ${it}, loss ${f.toFixed(1)}`) });
    const tIntent = now() - t0;

    // prune + 1-byte weights: keep weights with |w| >= prune, store round(w / scale) in -127..127
    let mx = 0;
    for (let p = 0; p < K * nf; p++) if (Math.abs(lr.w[p]) >= prune) mx = Math.max(mx, Math.abs(lr.w[p]));
    const scale = mx / 127 || 1;
    const keep = [], cols = [];
    let kept = 0;
    for (let j = 0; j < nf; j++) {
      const c = [];
      for (let k = 0; k < K; k++) {
        const w = lr.w[k * nf + j];
        if (Math.abs(w) < prune) continue;
        const q = Math.round(w / scale);
        if (q) c.push(k, q);
      }
      if (c.length) { keep.push(j); cols.push(c); kept += c.length / 2; }
    }
    const bytes = new Uint8Array(cols.reduce((s, c) => s + 1 + c.length, 0));
    let o = 0;
    for (const c of cols) { bytes[o++] = c.length / 2; for (let q = 0; q < c.length; q += 2) { bytes[o++] = c[q]; bytes[o++] = c[q + 1] & 0xff; } }
    log(`kept ${kept} of ${K * nf} intent weights (${(100 * kept / (K * nf)).toFixed(0)}%)`);

    // slots
    const t1 = now();
    const labelSet = new Set(["O"]);
    // out-of-scope sentences carry no values the agent will use; left in, they teach the tagger
    // that words like "reports" after "called" are not names ("delete the folder called reports")
    const seqs = examples.filter(e => e.intent !== "out_of_scope").map(e => {
      const { toks, labels } = bio(e.text, e.spans);
      labels.forEach(l => labelSet.add(l));
      return { feats: tokenFeatures(e.text, toks), labels };
    });
    const labels = [...labelSet].sort();
    for (const s of seqs) s.gold = s.labels.map(l => labels.indexOf(l));
    const tag = crf(seqs, labels, { c2, keep: slotPrune, maxIter: slotIter, onStep: (it, f) => log(`slot model: step ${it}, loss ${f.toFixed(1)}`) });
    const tSlots = now() - t1;

    const model = {
      version: (d => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")} ${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`)(new Date()),
      format: 2,
      trainer: "js",
      intents,
      lexicon,
      vocab: keep.map(j => vocab[j]),
      idf: b64(new Uint8Array(Float32Array.from(keep, j => idf[j]).buffer)),
      scale,
      weights: b64(bytes),
      intercept: Array.from(lr.w.subarray(K * nf), v => Math.round(v * 1e4) / 1e4),
      labels,
      state: tag.state,
      trans: tag.trans,
      stats: { examples: examples.length, features: keep.length, weights_kept: kept, weights_total: K * nf,
        prune, slot_prune: slotPrune, lbfgs_iterations: lr.iterations, slot_iterations: tag.iterations, train_seconds: Math.round((tIntent + tSlots) / 100) / 10,
        intent_seconds: Math.round(tIntent / 100) / 10, slot_seconds: Math.round(tSlots / 100) / 10 },
    };
    log(`done in ${model.stats.train_seconds}s`);
    return model;
  }

  // ---------- evaluation (same rules as evaluate.py) ----------
  function evaluate(nlu, examples, threshold = 0.45) {
    let ok = 0, tp = 0, fp = 0, fn = 0;
    const errors = [];
    for (const e of examples) {
      const r = nlu.parse(e.text);
      const pred = r.confidence >= threshold ? r.intent : "out_of_scope";
      if (pred === e.intent) ok++; else errors.push(`INTENT  ${e.text}  want=${e.intent} got=${r.intent} (${r.confidence.toFixed(2)})`);
      const gold = new Set(e.spans.map(([s, t, n]) => n + "=" + e.text.slice(s, t)));
      const got = new Set(e.intent === "out_of_scope" ? [] : Object.entries(r.slots).map(([n, v]) => n + "=" + v));
      for (const g of got) if (gold.has(g)) tp++; else fp++;
      for (const g of gold) if (!got.has(g)) fn++;
      const same = gold.size === got.size && [...gold].every(g => got.has(g));
      if (!same) errors.push(`SLOTS   ${e.text}  want=${[...gold].join(",")} got=${[...got].join(",")}`);
    }
    const p = tp / Math.max(1, tp + fp), rc = tp / Math.max(1, tp + fn);
    return { accuracy: 100 * ok / examples.length, n: examples.length, slotF1: 2 * p * rc / Math.max(1e-9, p + rc), errors };
  }

  return { parseDataset, train, evaluate };
})();
if (typeof module !== "undefined") module.exports = NLUTrainer;
