// Questions about written content: found by word matching (BM25), answered with sentences that exist in
// the files, always with where they come from. Nothing is composed; below the bar it says it has nothing.
//   a file's front matter may list the `questions:` it answers and an `answer:` written for them
//   "tell me more" goes on in the same section, then the next; a new question looks in the same file first

const F = typeof EngineFiles !== "undefined" ? EngineFiles : require("./files.js");
const T = typeof EngineText !== "undefined" ? EngineText : require("./text.js");

// endings off, so "drawings" finds "drawing" and "organisations" finds "organisation" (my-agent's rules)
function stem(w) {
  w = w.replace(/'s$/, "");
  if (w.length > 5 && /[iz]ations?$/.test(w)) return w.replace(/[iz]ations?$/, "is");
  if (w.length > 5 && /ations?$/.test(w)) return w.replace(/ations?$/, "at");
  if (w.length > 4 && /ing$/.test(w)) return w.slice(0, -3);
  if (w.length > 4 && /ies$/.test(w)) return w.slice(0, -3) + "y";
  if (w.length > 4 && /ed$/.test(w)) return w.slice(0, -2);
  if (w.length > 3 && /es$/.test(w) && !/ses$/.test(w)) return w.slice(0, -1);
  if (w.length > 3 && /s$/.test(w) && !/ss$/.test(w)) return w.slice(0, -1);
  return w.replace(/i[sz]e$/, "iz").replace(/(?<=.{5})is$/, "iz"); // anonymise, anonymize, anonymised: one word
}

function plain(md) {
  return md.replace(/```[\s\S]*?```/g, " ").replace(/`([^`]*)`/g, "$1").replace(/\[([^\]]*)\]\([^)]*\)/g, "$1")
    .replace(/\*\*([^*]+)\*\*/g, "$1").replace(/(?<![\w/])\*([^*\s][^*]*)\*(?!\w)/g, "$1").replace(/^\s*\|.*\|\s*$/gm, " ");
}
function sentencesOf(text) {
  const out = [];
  for (const block of plain(text).split(/\n\s*\n|\n(?=\s*[-*]\s)/)) {
    const flat = block.replace(/^\s*[-*]\s+/gm, "").replace(/\s+/g, " ").trim();
    if (flat.length < 3 || /^#/.test(flat)) continue;
    out.push(...flat.split(/(?<=[.!?])\s+(?=[\p{L}“"(])/u));
  }
  return out;
}

class Content {
  constructor(docs, small, topics = []) {
    this.small = small;
    this.topics = topics; // what the content is about, in a few words (pack.md `about:`) // words that carry no topic: "the", "what", "about"…
    this.docs = docs.map(({ id, md }) => {
      const { meta, body } = F.frontMatter(md);
      const title = meta.title || (body.match(/^#\s+(.+)$/m) || [, id])[1];
      const secs = [];
      let cur = { heading: title, text: "" };
      for (const line of body.split("\n")) {
        const h = line.match(/^#{1,3}\s+(.+?)\s*$/);
        if (h) { if (cur.text.trim()) secs.push(cur); cur = { heading: h[1], text: "" }; } else cur.text += line + "\n";
      }
      if (cur.text.trim()) secs.push(cur);
      // questions: "what is ptilu" (answered by `answer:`) or { q, see } (answered by the passage that says `see`);
      // answers: questions the whole piece answers (by `answer:`); keywords: what the piece is about
      const qs = [].concat(meta.questions || [], meta.answers || []).map(q => (typeof q === "string" ? { q } : q)).filter(q => q.q);
      const next = Array.isArray(meta.next) ? meta.next : meta.next ? meta.next.split(/\s*,\s*/) : [];
      return { id, title, questions: qs, answer: meta.answer || null, next, keywords: [].concat(meta.keywords || [], meta.themes || []),
        sections: secs.map(s => ({ heading: s.heading, sentences: sentencesOf(s.text) })).filter(s => s.sentences.length) };
    });
    // the units searched: every section, and every question a file says it answers
    this.units = [];
    this.docs.forEach((d, di) => {
      const about = this.terms(`${d.title} ${d.keywords.join(" ")}`);
      d.sections.forEach((s, si) => this.units.push({ di, si, head: new Set([...about, ...this.terms(s.heading)]),
        terms: this.terms(`${d.title} ${s.heading} ${s.heading} ${s.sentences.join(" ")}`) }));
      d.questions.forEach(({ q, see }) => this.units.push({ di, si: 0, question: q, see, head: new Set([...about, ...this.terms(q)]), terms: this.terms(q) }));
      // the piece as a whole: its keywords say what it is about, its `answer:` answers it
      if (d.keywords.length && d.answer) this.units.push({ di, si: 0, question: d.title, head: new Set(about), terms: about });
    });
    this.df = new Map();
    for (const u of this.units) for (const t of new Set(u.terms)) this.df.set(t, (this.df.get(t) || 0) + 1);
    this.avg = this.units.reduce((a, u) => a + u.terms.length, 0) / Math.max(1, this.units.length);
  }

  // a question taught from the inbox: it points to a passage of a file, as a `questions:` line would
  learn(di, q, see) {
    const d = this.docs[di];
    const about = this.terms(`${d.title} ${d.keywords.join(" ")}`);
    const u = { di, si: 0, question: q, see, head: new Set([...about, ...this.terms(q)]), terms: this.terms(q) };
    d.questions.push({ q, see });
    this.units.push(u);
    for (const t of new Set(u.terms)) this.df.set(t, (this.df.get(t) || 0) + 1);
    this.avg = this.units.reduce((a, x) => a + x.terms.length, 0) / this.units.length;
  }

  terms(text) { return T.words(text).filter(w => !this.small.has(w)).map(stem); }
  idf(t) { const n = this.df.get(t) || 0; return Math.log(1 + (this.units.length - n + 0.5) / (n + 0.5)); }

  // the best unit for a question, and how much of the question it covers (0..1, by weight of the words)
  search(question, prefer = null, onlyQuestions = false) {
    // a word no file holds is read as the one known word a letter away from it ("halucinates", "GDRP")
    const known = t => this.df.has(t) ? t : ([...this.df.keys()].filter(k => k.length >= 5 && T.close(t, k)).sort((a, b) => this.df.get(b) - this.df.get(a))[0] || t);
    const q = [...new Set(this.terms(question).map(known))];
    if (!q.length) return null;
    const total = q.reduce((a, t) => a + this.idf(t), 0);
    let best = null;
    for (const u of this.units) {
      if (onlyQuestions && !u.question) continue;
      const tf = new Map();
      for (const t of u.terms) tf.set(t, (tf.get(t) || 0) + 1);
      let score = 0, covered = 0, onTopic = false;
      for (const t of q) {
        const f = tf.get(t);
        if (!f) continue;
        covered += this.idf(t);
        if (u.head.has(t)) onTopic = true;
        score += this.idf(t) * (f * 2.2) / (f + 1.2 * (0.25 + 0.75 * u.terms.length / this.avg));
      }
      if (u.question) score *= 1.5;
      // a follow-up looks around where the conversation is: the same file first, the passage it's on and
      // the ones beside it most (a moving window, not a fresh search)
      if (prefer && u.di === prefer.di) score *= Math.abs(u.si - prefer.si) <= 1 ? 1.6 : 1.3;
      // ranked by how much of the question a unit covers as much as by how strongly: a short question that
      // shares one word ("wants") mustn't beat a section that holds most of what was asked
      const coverage = covered / total, rank = score * coverage;
      if (!best || rank > best.rank) best = { ...u, score, rank, coverage, onTopic, asked: q.length };
    }
    return best && best.score > 0 ? best : null;
  }

  // a question → { say, source, chips, frame } or null
  // onlyQuestions: for a sentence that isn't asked as a question ("my daughter lives abroad"), only what a
  // file says it answers counts, never a passage that happens to share its words
  answer(question, frame = null, onlyQuestions = false) {
    const hit = this.search(question, frame, onlyQuestions);
    // the bar: half of what was asked is there, and the topic is what the section is about (its title, its
    // heading, or a question the file says it answers): "what is the weather" isn't answered by a section
    // that mentions the weather in passing. To widen what a file answers, add `questions:` to it
    // a question a file lists is closer to the point than a passage, so a little under half of the words is enough there
    if (!hit || hit.coverage < (hit.question ? 0.45 : 0.5) || !hit.onTopic) return null;
    const d = this.docs[hit.di];
    if (hit.question && hit.see) { // the passage the file points to for this question
      const want = this.terms(hit.see).join(" ");
      for (let si = 0; si < d.sections.length; si++) {
        const at = d.sections[si].sentences.findIndex(x => this.terms(x).join(" ").includes(want));
        if (at >= 0) return this.reply(hit.di, si, ...this.from(d.sections[si], at), this.where(d, d.sections[si]));
      }
    }
    if (hit.question && d.answer) return this.reply(hit.di, hit.si, [0], d.answer, `${d.title}, written answer`);
    const s = d.sections[hit.si];
    const q = new Set(this.terms(question));
    let at = 0, most = -1;
    s.sentences.forEach((x, i) => { const n = this.terms(x).filter(t => q.has(t)).length; if (n > most) { most = n; at = i; } });
    return this.reply(hit.di, hit.si, ...this.from(s, at), this.where(d, s));
  }

  // "tell me more": the next sentence not said yet in this section, then the next section
  more(frame) {
    const d = this.docs[frame.di];
    for (let si = frame.si; si < d.sections.length; si++) {
      const said = si === frame.si ? frame.said : [];
      const i = d.sections[si].sentences.findIndex((_, k) => !said.includes(k) && (si !== frame.si || k > Math.max(-1, ...said)));
      if (i >= 0) {
        const [more, say] = this.from(d.sections[si], i);
        return this.reply(frame.di, si, si === frame.si ? said.concat(more) : more, say, this.where(d, d.sections[si]));
      }
    }
    return null;
  }

  // a sentence that ends on ":" opens a list: the list comes with it
  from(section, at) {
    const said = [at];
    if (/:$/.test(section.sentences[at])) for (let i = at + 1; i < Math.min(at + 5, section.sentences.length); i++) said.push(i);
    else if (section.sentences[at].split(/\s+/).length < 7 && at + 1 < section.sentences.length) said.push(at + 1); // "From TermNL: the skill file." says little alone
    return [said, said.map(i => section.sentences[i]).join(" ")];
  }
  where(d, s) { return s.heading === d.title ? d.title : `${d.title}, ${s.heading}`; }

  reply(di, si, said, say, source) {
    const d = this.docs[di];
    const chips = d.sections.filter((_, k) => k !== si).slice(0, 3).map(s => s.heading)
      .concat(d.next.map(id => (this.docs.find(x => x.id === id) || {}).title).filter(Boolean));
    return { say, source, chips, frame: { kind: "content", di, si, said } };
  }

}

if (typeof module !== "undefined") module.exports = { Content };
