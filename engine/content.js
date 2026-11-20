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
  return md.replace(/```[\s\S]*?```/g, " ").replace(/<[^>]*>/g, " ").replace(/\[\*?\s*\]\([^)]*\)/g, " ").replace(/`([^`]*)`/g, "$1").replace(/\[([^\]]*)\]\([^)]*\)/g, "$1")
    .replace(/\*\*([^*]+)\*\*/g, "$1").replace(/(?<![\w/])\*([^*\s][^*]*)\*(?!\w)/g, "$1").replace(/^\s*\|.*\|\s*$/gm, " ");
}
// sentences, each knowing its paragraph (out.para[i]): an answer is told to the end of its paragraph
function sentencesOf(text) {
  const out = [];
  out.para = [];
  let p = 0;
  for (const block of plain(text).split(/\n\s*\n|\n(?=\s*[-*]\s)/)) {
    const flat = block.replace(/^\s*[-*]\s+/gm, "").replace(/\s+/g, " ").trim();
    if (flat.length < 3 || /^#/.test(flat)) continue;
    // a line that is mostly numbers or symbols (a date line, a page range, a caption) is no sentence to answer with
    const ss = flat.split(/(?<=[.!?])\s+(?=[\p{L}“"(])/u).filter(x => (x.match(/\p{L}/gu) || []).length >= 0.6 * x.replace(/\s/g, "").length);
    for (const x of ss) { out.push(x); out.para.push(p); }
    p++;
  }
  return out;
}

const WINDOW = 4; // sentences in a passage
let OFF_TOPIC = 3; // words in common a passage needs when its file isn't about the topic

class Content {
  constructor(docs, small, topics = []) {
    this.small = small;
    this.topics = topics; // what the content is about, in a few words (pack.md `about:`)
    this.asked = new Set(); // the questions asked in this conversation // words that carry no topic: "the", "what", "about"…
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
        sections: secs.map(s => { const ss = sentencesOf(s.text); return { heading: s.heading, sentences: ss, para: ss.para }; }).filter(s => s.sentences.length) };
    });
    // what each file is about, found without anyone writing it: the words it uses most that the other
    // files use least. So a saved article needs nothing added to be searched by its topic
    const dfDoc = new Map(), tfs = this.docs.map(d => {
      const tf = new Map();
      for (const s of d.sections) for (const t of this.terms(`${s.heading} ${s.sentences.join(" ")}`)) tf.set(t, (tf.get(t) || 0) + 1);
      for (const t of tf.keys()) dfDoc.set(t, (dfDoc.get(t) || 0) + 1);
      return tf;
    });
    this.docs.forEach((d, di) => {
      d.found = [...tfs[di]].filter(([t, n]) => n >= 2 && t.length > 2)
        .map(([t, n]) => [t, n * Math.log(1 + this.docs.length / dfDoc.get(t))]).sort((a, b) => b[1] - a[1]).slice(0, 8).map(([t]) => t);
    });
    // the units searched: passages of a few sentences (a window moved along each section), and every
    // question a file says it answers
    this.units = [];
    this.docs.forEach((d, di) => {
      const about = [...this.terms(`${d.title} ${d.keywords.join(" ")}`), ...d.found];
      d.sections.forEach((s, si) => {
        for (let from = 0; from < s.sentences.length; from += WINDOW) {
          const to = Math.min(from + WINDOW, s.sentences.length);
          this.units.push({ di, si, from, to, title: new Set(this.terms(d.title)), label: new Set(this.terms(s.heading)), head: new Set([...about, ...this.terms(s.heading)]),
            // the title and the heading are the topic (head); as words, a heading counts once per section, in
            // its first passage, and the title not at all: else the first lines of a file (a date, a byline) win
            terms: this.terms(`${from === 0 && s.heading !== d.title ? s.heading : ""} ${s.sentences.slice(from, to).join(" ")}`) });
        }
      });
      d.questions.forEach(({ q, see }) => this.units.push({ di, si: 0, question: q, see, head: new Set([...about, ...this.terms(q)]), terms: this.terms(q) }));
      // the piece as a whole: its keywords say what it is about, its `answer:` answers it
      if (d.keywords.length && d.answer) this.units.push({ di, si: 0, question: d.title, piece: true, head: new Set(about), terms: about });
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
      let score = 0, covered = 0, onTopic = false, found = 0;
      for (const t of q) {
        const f = tf.get(t);
        // a word of the file's title counts as covered in every passage of it: "how AI threatens
        // democracy" is what the whole article is about, even where a passage doesn't say "threatens"
        if (!f && u.title && u.title.has(t)) { covered += this.idf(t); onTopic = true; continue; }
        if (!f) continue;
        found++;
        covered += this.idf(t);
        if (u.head.has(t)) onTopic = true;
        // a word of the section's heading counts twice, as in Nod's own documentation search
        score += this.idf(t) * (f * 2.2) / (f + 1.2 * (0.25 + 0.75 * u.terms.length / this.avg)) * (u.label && u.label.has(t) ? 2 : 1);
      }
      if (u.question && !u.piece) score *= 1.5;
      // a follow-up looks around where the conversation is: the same file first, the passage it's on and
      // the ones beside it most (a moving window, not a fresh search)
      if (prefer && u.di === prefer.di) score *= Math.abs(u.si - prefer.si) <= 1 ? 1.6 : 1.3;
      // ranked by how much of the question a unit covers as much as by how strongly: a short question that
      // shares one word ("wants") mustn't beat a section that holds most of what was asked
      const coverage = covered / total;
      // a question a file lists (or was taught) asked word for word wins, wherever the conversation is
      // (word for word both ways: "why is it so small" isn't "can one small test open a new market")
      const same = u.question && !u.piece && coverage >= 0.9 && u.terms.filter(t => q.includes(t)).length >= 0.9 * u.terms.length;
      const rank = score * coverage * (same ? 3 : 1);
      if (!best || rank > best.rank) best = { ...u, score, rank, coverage, onTopic, found, asked: q.length, q };
    }
    return best && best.score > 0 ? best : null;
  }

  // a question → { say, source, chips, frame } or null
  // onlyQuestions: for a sentence that isn't asked as a question ("my daughter lives abroad"), only what a
  // file says it answers counts, never a passage that happens to share its words
  answer(question, frame = null, onlyQuestions = false) {
    const said = T.words(question).join(" ");
    this.asked.add(said); // a listed question asked once isn't offered again
    // a question a file lists, asked word for word (a tapped chip, "who are you?"), is answered as listed,
    // even when it holds only small words
    const order = frame ? [frame.di, ...this.docs.keys()] : [...this.docs.keys()];
    for (const di of order) {
      const q = this.docs[di].questions.find(x => T.words(x.q).join(" ") === said);
      if (q) { const r = this.listed(di, q); if (r) return r; }
    }
    const hit = this.search(question, frame, onlyQuestions);
    // the bar: most of what was asked is in one passage, or a little less when the passage is on the topic
    // (its file's title or topic words, its heading, or a question the file lists). One word in common is
    // never enough off-topic: "what is the weather" isn't answered by a passage that mentions the weather
    if (!hit) return null;
    // a sentence not asked as a question ("I need a new file") must say most of what a listed question says
    const pass = onlyQuestions ? hit.coverage >= 0.75 && hit.found >= 2
      : (hit.onTopic && hit.coverage >= 0.45) || (hit.found >= OFF_TOPIC && hit.coverage >= 0.6);
    if (!pass) return null;
    const d = this.docs[hit.di];
    if (hit.question && !hit.piece) { const r = this.listed(hit.di, { q: hit.question, see: hit.see }); if (r) return r; }
    if (hit.question && d.answer) return this.reply(hit.di, hit.si, [0], d.answer, `${d.title}, written answer`);
    const s = d.sections[hit.si];
    const q = new Set(hit.q);
    // the sentence that holds most of the question (by weight); a line of numbers or a caption never answers
    let at = hit.from || 0, most = -1;
    for (let i = hit.from || 0; i < (hit.to || s.sentences.length); i++) {
      const x = s.sentences[i];
      const real = x.split(/\s+/).length >= 6 && (x.match(/\p{L}/gu) || []).length > 0.6 * x.length;
      const n = (real ? 0.01 : -1) + this.terms(x).filter(t => q.has(t)).reduce((a, t) => a + this.idf(t), 0);
      if (n > most) { most = n; at = i; }
    }
    return this.reply(hit.di, hit.si, ...this.from(s, at), this.where(d, s));
  }

  // a listed question's answer: the passage its `see:` points to, else the file's written `answer:`
  listed(di, { see }) {
    const d = this.docs[di];
    if (see) {
      const want = this.terms(see).join(" ");
      for (let si = 0; si < d.sections.length; si++) {
        const at = d.sections[si].sentences.findIndex(x => this.terms(x).join(" ").includes(want));
        if (at >= 0) return this.reply(di, si, ...this.from(d.sections[si], at), this.where(d, d.sections[si]));
      }
    }
    return d.answer ? this.reply(di, 0, [0], d.answer, `${d.title}, written answer`) : null;
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
  // from the sentence found to the end of its paragraph (at most 3 sentences, about 450 letters); a sentence
  // ending on ":" brings its list
  from(section, at) {
    const said = [at];
    const n = section.sentences.length, len = () => said.reduce((a, i) => a + section.sentences[i].length, 0);
    if (/:$/.test(section.sentences[at])) for (let i = at + 1; i < Math.min(at + 5, n); i++) said.push(i);
    else for (let i = at + 1; i < n && section.para[i] === section.para[at] && said.length < 3 && len() < 450; i++) said.push(i);
    return [said, said.map(i => section.sentences[i]).join(" ")];
  }

  // a heading or a file's title, said or tapped: go there, from its first paragraph (the window moved by hand)
  goto(text, frame = null) {
    const same = x => T.words(x).join(" "), t = same(text); // the heading itself, word for word, nothing around it
    if (!t) return null;
    const order = frame ? [frame.di, ...this.docs.keys()] : [...this.docs.keys()];
    for (const di of order) {
      const d = this.docs[di];
      if (same(d.title) === t) {
        if (d.answer) return this.reply(di, 0, [0], d.answer, `${d.title}, written answer`);
        return this.reply(di, 0, ...this.from(d.sections[0], 0), this.where(d, d.sections[0]));
      }
      const si = d.sections.findIndex(s => same(s.heading) === t);
      if (si >= 0) return this.reply(di, si, ...this.from(d.sections[si], 0), this.where(d, d.sections[si]));
    }
    return null;
  }
  where(d, s) { return s.heading === d.title ? d.title : `${d.title}, ${s.heading}`; }

  reply(di, si, said, say, source) {
    const d = this.docs[di];
    // what can follow: the questions the file lists (its `questions:` and `answers:`) that weren't asked yet,
    // in the file's order; a file that lists none offers the sections after this one, each opening where it
    // starts. Then "tell me more", and the related files
    const asked = q => this.asked.has(T.words(q).join(" "));
    const listed = d.questions.map(x => x.q).filter(q => !asked(q)).slice(0, 3);
    const next = listed.length ? listed : d.sections.slice(si + 1).filter(s => s.heading !== d.title).slice(0, 3).map(s => s.heading);
    const chips = [...next, "tell me more", ...d.next.map(id => (this.docs.find(x => x.id === id) || {}).title).filter(Boolean)];
    return { say, source, chips, frame: { kind: "content", di, si, said } };
  }

}

if (typeof module !== "undefined") module.exports = { Content, setOffTopic: n => { OFF_TOPIC = n; } };
