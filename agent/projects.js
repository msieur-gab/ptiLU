// The projects: plain Markdown files, nothing added to them. Front matter for the card (title, question,
// answer, where, year, intro), "##" headings for the parts a conversation can move through. A question
// asked while a project is open is looked for in that project's paragraphs (BM25); the agent only quotes
// them, it never writes its own.

const F = require("./files.js");
const T = require("./text.js");

const plain = s => s.replace(/!\[[^\]]*\]\([^)]*\)/g, "").replace(/\[([^\]]+)\]\([^)]*\)/g, "$1")
  .replace(/<[^>]+>/g, "").replace(/[*_`>#]+/g, "").replace(/\s+/g, " ").trim();
const stem = w => w.length > 4 ? w.replace(/(ations?|ising|izing|ised|ized|ises|izes|ise|ize|ing|ed|es|s)$/, "") : w;

class Projects {
  constructor(files, small = new Set()) {
    this.small = small;
    this.list = files.map(({ id, md }) => this.read(id, md));
    this.byId = new Map(this.list.map(p => [p.id, p]));
    // BM25 statistics over every paragraph
    const all = this.list.flatMap(p => p.paras);
    this.N = all.length;
    this.avg = all.reduce((t, x) => t + x.terms.length, 0) / Math.max(1, all.length);
    this.df = new Map();
    for (const x of all) for (const w of new Set(x.terms)) this.df.set(w, (this.df.get(w) || 0) + 1);
  }
  terms(text) { return T.words(text).filter(w => !this.small.has(w) && w.length > 1).map(stem); }
  read(id, md) {
    const { meta, body } = F.frontMatter(md);
    const parts = [];
    let cur = null;
    for (const block of body.split(/\n\s*\n/)) {
      const h = block.match(/^##\s+(.+)$/m);
      if (h && /^##\s/.test(block.trim())) {
        cur = { title: h[1].trim(), paras: [] }; parts.push(cur);
        const rest = plain(block.trim().split("\n").slice(1).join(" "));
        if (rest.split(" ").length >= 6) cur.paras.push(rest);
        continue;
      }
      if (!cur || /^\s*(\||<|!\[|```|---)/.test(block) || /^#\s/.test(block.trim())) continue;
      const text = plain(block.replace(/^###\s+(.+)$/gm, "$1:"));
      if (text.split(" ").length >= 6) cur.paras.push(text);
    }
    const p = { id, title: meta.title || id, meta, parts: parts.filter(x => x.paras.length) };
    p.paras = p.parts.flatMap((part, pi) => part.paras.map((text, k) => ({ text, pi, k, terms: this.terms(text + " " + part.title) })));
    return p;
  }
  // what a card shows: the owner's own lines from the front matter
  card(id) {
    const p = this.byId.get(id);
    if (!p) return null;
    const m = p.meta;
    return { id, title: p.title, line: m.question || m.brief || "", text: m.answer || m.what || (p.paras[0] || {}).text || "", where: [m.where, m.year].filter(Boolean).join(" · ") };
  }
  // a part of a project: its first paragraphs, up to about 3 sentences
  part(id, pi) {
    const p = this.byId.get(id), part = p && p.parts[pi];
    if (!part) return null;
    let text = "";
    for (const para of part.paras) { if (text && (text + para).split(/(?<=[.!?])\s/).length > 4) break; text += (text ? " " : "") + para; }
    return { title: part.title, text };
  }
  // the parts not yet seen, as follow-ups
  next(id, seen) { const p = this.byId.get(id); return p ? p.parts.map((x, i) => i).filter(i => !seen.has(i)) : []; }
  // a project named in a sentence ("tell me about Senz")
  named(sentence) {
    const ws = new Set(T.words(sentence));
    return this.list.find(p => T.words(p.title).every(w => ws.has(w))) || null;
  }
  // the paragraph that answers a question, in one project or in all of them, if one clearly does: most of
  // the question's words found (at least 2), or its one word, if that word is rare
  search(id, question) {
    const ps = id ? [this.byId.get(id)].filter(Boolean) : this.list, q = [...new Set(this.terms(question))];
    if (!ps.length || !q.length) return null;
    let best = null;
    for (const p of ps) for (const para of p.paras) {
      let score = 0, found = 0;
      for (const w of q) {
        const tf = para.terms.filter(x => x === w).length;
        if (!tf) continue;
        found++;
        const idf = Math.log(1 + (this.N - (this.df.get(w) || 0) + 0.5) / ((this.df.get(w) || 0) + 0.5));
        score += idf * tf * 2.2 / (tf + 1.2 * (0.25 + 0.75 * para.terms.length / this.avg));
      }
      if (!best || score > best.score) best = { p, para, score, found, coverage: found / q.length };
    }
    const rare = best && q.length === 1 && T.words(question).length <= 4 && best.found === 1 && (this.df.get(q[0]) || 0) <= 8;
    return best && ((best.found >= 2 && best.coverage >= 0.5) || rare) ? { project: best.p.id, part: best.para.pi, text: best.para.text, title: best.p.parts[best.para.pi].title, ...best } : null;
  }
}

if (typeof module !== "undefined") module.exports = { Projects };
