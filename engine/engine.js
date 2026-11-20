// The dialogue: one turn, ending in act, ask, approve or abstain.
//
//   1. clean      fillers off ("please", "can you")
//   2. answer     a question is waiting: yes, no, or the value it asked for
//   3. read       a "People say" pattern reads the whole sentence: sure, no model involved
//   4. follow     "and tomorrow?", "tell me more": completed by the turn before (its frame)
//   5. propose    the model proposes a skill; the check decides: every word that isn't a value must be
//                 one the skill was taught, or it asks. A question goes to the content
//   6. next       a value to ask, an approval, or act
//
// The engine runs nothing itself but what it owns (what it keeps about you). Commands come back filled
// in, for the device to run.

const T = typeof EngineText !== "undefined" ? EngineText : require("./text.js");
const P = typeof EnginePatterns !== "undefined" ? EnginePatterns : require("./patterns.js");
const K = typeof EngineKinds !== "undefined" ? EngineKinds : require("./kinds.js");
const S = typeof EngineSkills !== "undefined" ? EngineSkills : require("./skills.js");

const SURE = 0.7, PROPOSE = 0.3;
const INVITE = +(typeof process !== "undefined" && process.env.INVITE) || 0.5; // the model this sure a question is for the author: the invitation
// cosines of the meaning model: chosen on my-agent's held-out questions (no off-topic one reaches floor)
const MEANING = { floor: 0.42, sure: 0.55, skill: 0.6 }; // below PROPOSE the model proposes nothing; the taught-words check guards what it does propose

class Engine {
  constructor({ skills, content = null, talk, model = null, memory = {}, now = () => new Date(), random = Math.random, author = { lines: [], say: [] } }) {
    Object.assign(this, { skills, content, talk, model, memory, now, random, author });
    this.tagger = true; // the CRF finds values no rule found; false to measure without it
    this.pending = null; // the question waiting for an answer
    this.frame = null; // the last thing done: a skill and its values, or a place in the content
    this.inbox = []; // what it couldn't do, waiting to be taught
    this.vocab = new Map(skills.map(s => [s.name, S.vocabulary(s, T.words)]));
    this.byName = new Map(skills.map(s => [s.name, s]));
  }

  // a question for the author (his time, his price, a service asked of him): the content pack's own invitation,
  // never a passage that happens to share a word with it
  invite(why) {
    return this.turn("abstain", this.author.say.length ? T.pick(this.author.say, this.random) : this.say("nothing written"), { why, invite: true });
  }

  say(key, values = {}) { return T.fill(T.pick(this.talk.replies[key] || [key], this.random), values); }
  turn(outcome, say, extra = {}) { return { outcome, say, chips: [], ...extra }; }
  abstain(sentence, why) {
    this.inbox.push({ sentence, why, on: this.now().toISOString().slice(0, 10) });
    return this.turn("abstain", this.say("cant"), { why });
  }

  respond(raw) {
    this.asked = /\?\s*$/.test(String(raw));
    const sentence = this.clean(raw);
    if (!sentence) return this.turn("abstain", this.say("cant"), { why: "nothing said" });
    const ws = T.words(sentence);

    // 2. a question is waiting
    const p = this.pending;
    this.pending = null;
    if (p) {
      const yes = this.isWord("yes", ws), no = this.isWord("no", ws);
      if (p.type === "confirm") {
        if (yes) {
          // a yes to "I don't know … yet" is worth teaching: it waits in the inbox with the skill it meant
          if (p.unsure) this.inbox.push({ sentence: p.sentence, why: `you said yes to ${p.skill.label}`, suggest: p.skill.name, on: this.now().toISOString().slice(0, 10) });
          return this.finish(p.skill, p.values, p.why, true, p.sentence);
        }
        if (no) {
          if (p.unsure) this.inbox.push({ sentence: p.sentence, why: `not ${p.skill.name}`, on: this.now().toISOString().slice(0, 10) });
          return this.turn("abstain", this.say("ok no"), { why: "said no" });
        }
      }
      if (p.type === "choose") {
        const late = /\b(evening|tonight|night|pm|afternoon|later)\b/i.test(sentence), early = /\b(morning|am|early)\b/i.test(sentence);
        const i = p.choices.findIndex((c, k) => c.said.toLowerCase().includes(sentence.toLowerCase()) || sentence === String(k + 1) ||
          (late && +c.iso.slice(11, 13) >= 12) || (early && +c.iso.slice(11, 13) < 12));
        if (i >= 0) return this.next(p.skill, { ...p.values, [p.slot]: { ...p.values[p.slot], ...p.choices[i], ambiguous: false } }, p.why, sentence);
      }
      if (p.type === "value" && !this.readByPattern(sentence)) {
        const need = p.skill.needs[p.slot];
        const v = K.reader(need.kind)(sentence, this.now()) || K.findIn(need.kind, sentence, this.now());
        if (v) return this.next(p.skill, { ...p.values, [p.slot]: { text: v.text || sentence, ...v } }, p.why, sentence);
        if (!no) { this.pending = p; return this.turn("ask", T.pick(need.ask, this.random), { skill: p.skill.name, why: "not a value of that kind" }); }
        return this.turn("abstain", this.say("ok no"), { why: "said no" });
      }
    }

    // 3. a pattern reads the whole sentence
    const read = this.readByPattern(sentence);
    if (read) {
      const why = `pattern "${read.pattern}" (${read.skill.name})`;
      if (read.typos && read.skill.acts) return this.confirm(read.skill, read.values, why + ", with a typo", sentence, true);
      return this.next(read.skill, read.values, why, sentence);
    }

    // 4. a follow-up of the turn before; a file's title or a heading said alone opens it
    const f = this.follow(sentence, ws);
    if (f) return f;
    const g = this.content && !(this.frame && this.frame.kind === "content") ? this.content.goto(sentence) : null;
    if (g) { this.frame = g.frame; return this.turn("act", g.say, { source: g.source, chips: g.chips, why: "went to that file" }); }

    // 5. the model proposes, the check decides
    return this.propose(sentence, ws);
  }

  clean(raw) {
    let s = String(raw).trim().replace(/[?!.]+$/, "").trim();
    for (let changed = true; changed;) {
      changed = false;
      for (const f of this.talk.fillers) {
        if (s.toLowerCase().startsWith(f + " ")) { s = s.slice(f.length + 1).replace(/^,\s*/, "").trim(); changed = true; }
        if (s.toLowerCase().endsWith(" " + f)) { s = s.slice(0, -f.length - 1).replace(/,$/, "").trim(); changed = true; }
      }
    }
    return s;
  }
  isWord(list, ws) { const s = ws.join(" "); return this.talk[list].some(w => s === w || s.startsWith(w + " ")); }

  // a value read by its kind; a name or a text made only of small words ("for", "the") is no value
  reader(skill) {
    const now = this.now();
    return (slot, text) => {
      const kind = skill.needs[slot].kind;
      if (/^(some text|a name|a place)$/.test(kind) && T.words(text).every(w => this.talk.small.has(w))) return null;
      return K.reader(kind)(text, now);
    };
  }
  readByPattern(sentence, only = null) {
    const toks = T.tokens(sentence);
    let best = null;
    for (const skill of only ? [only] : this.skills) {
      for (const pat of skill.patterns) {
        const m = P.match(pat, toks, this.reader(skill));
        if (m && (!best || m.score > best.score)) best = { ...m, skill };
      }
    }
    return best;
  }

  follow(sentence, ws) {
    const fr = this.frame;
    if (!fr) return null;
    const more = this.isWord("more", ws), lead = this.talk["follow-up"].find(w => ws.join(" ").startsWith(w + " "));
    if (fr.kind === "content") {
      const g = this.content.goto(sentence, fr);
      if (g) { this.frame = g.frame; return this.turn("act", g.say, { source: g.source, chips: g.chips, why: "went to that section" }); }
      if (more) {
        const r = this.content.more(fr);
        if (!r) return this.turn("act", this.say("no more", { title: this.content.docs[fr.di].title }), { why: "end of the file" });
        this.frame = r.frame;
        return this.turn("act", r.say, { source: r.source, chips: r.chips, why: "more of the same file" });
      }
      return null; // a new question: the content search prefers the same file (step 5)
    }
    if (!lead) return null;
    const rest = sentence.split(/\s+/).slice(lead.split(" ").length).join(" ");
    const skill = this.byName.get(fr.skill);
    const again = this.readByPattern(rest, skill);
    if (again) return this.next(skill, { ...fr.values, ...again.values }, `follow-up of ${skill.name}`, sentence);
    const values = { ...fr.values };
    let found = false;
    for (const [slot, need] of Object.entries(skill.needs)) {
      const v = K.findIn(need.kind, rest, this.now());
      if (v) { values[slot] = v; found = true; }
    }
    return found ? this.next(skill, values, `follow-up of ${skill.name}`, sentence) : null;
  }

  propose(sentence, ws) {
    const ranked = this.model ? this.model.classify(sentence) : [];
    const [intent, conf] = ranked[0] || [null, 0];
    const skill = this.byName.get(intent);
    if (intent === "invite" && conf >= INVITE) return this.invite(`model ${conf.toFixed(2)} (invite)`);
    let unknown = null, values = {};
    // small talk is cheap to get wrong but still wrong: the model alone says hello only when sure
    if (skill && conf >= (skill.role ? SURE : PROPOSE)) {
      // the values its shape gives away, then the words left: are they all the skill's own?
      let left = sentence;
      const take = (slot, v) => { values[slot] = v; left = left.replace(new RegExp(v.text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i"), " "); };
      for (const [slot, need] of Object.entries(skill.needs)) {
        const v = K.findIn(need.kind, sentence, this.now());
        if (v) take(slot, v);
      }
      // the tagger (the model's CRF, trained from the patterns' marked values): the values no rule found,
      // each still read by its kind ("pick up the parcel" as some text, "Rotterdam" as a place)
      if (this.tagger && this.model.tag) {
        const slots = this.model.parse(sentence).slots;
        for (const [slot, need] of Object.entries(skill.needs)) {
          if (values[slot] || !slots[slot]) continue;
          const v = this.reader(skill)(slot, slots[slot]);
          if (v) take(slot, { text: slots[slot], ...v, by: "tagger" });
        }
      }
      const own = this.vocab.get(skill.name);
      unknown = T.words(left).filter(w => !this.talk.small.has(w) && !own.has(w) && ![...own].some(o => T.close(w, o)));
      if (!unknown.length) {
        const why = `model ${conf.toFixed(2)} (${skill.name}), every word taught`;
        if (conf < SURE && skill.acts) return this.confirm(skill, values, why, sentence, true);
        return this.next(skill, values, why, sentence);
      }
    }
    // the content: a question (the model says so, a question word, a "?") is searched everywhere; any other
    // sentence only against what the files say they answer. So "my daughter lives abroad" finds the piece
    // that lists it, and a command is never answered with a quote ("move ideas to documnet" is in the
    // review, word for word)
    // a problem told rather than asked ("we are building a due diligence platform and users find it hard
    // to organise files") is a question too, when no skill claims it and it says enough (4 words that
    // carry meaning); a command ("move ideas to documnet", "create a folder…") never is
    const told = !skill && !this.talk.commands.includes(ws[0]) && T.words(sentence).filter(w => !this.talk.small.has(w)).length >= 4;
    const isQuestion = (intent === "ask" && conf >= SURE) || this.asked || this.talk.questions.includes(ws[0]) || told;
    if (this.content) {
      const r = this.content.check(sentence, this.content.answer(sentence, this.frame && this.frame.kind === "content" ? this.frame : null, !isQuestion));
      if (r) { this.frame = r.frame; return this.turn("act", r.say, { source: r.source, chips: r.chips, why: isQuestion ? "content" : "content, a question it lists" }); }
    }
    if (skill && unknown && unknown.length && !skill.role) {
      return this.confirm(skill, values, `model ${conf.toFixed(2)} (${skill.name}), untaught: ${unknown.join(", ")}`, sentence, true,
        this.say("unknown word", { word: unknown.slice(0, 2).map(w => `“${w}”`).join(", "), label: skill.label }));
    }
    const why = intent ? `model ${conf.toFixed(2)} (${intent}), nothing in the content` : "nothing read it";
    // with a meaning model, the host may still ask it (byMeaning) before this "I can't" stands
    const meaning = !!this.meaning;
    if (this.content && isQuestion) {
      this.inbox.push({ sentence, why, on: this.now().toISOString().slice(0, 10) });
      return this.turn("abstain", this.say("nothing written"), { why, meaning });
    }
    return { ...this.abstain(sentence, why), meaning };
  }

  // ---- by meaning: an embedding model (MiniLM) the host runs; the engine keeps the vectors ----
  // what to embed: the content's listed questions and passages, and each skill's example sentences
  meaningItems() {
    const out = this.content ? this.content.meaningItems() : [];
    this.author.lines.forEach((t, i) => out.push({ key: `a|author|${i}`, text: t }));
    for (const s of this.skills) {
      const seen = new Set();
      const add = t => { if (!seen.has(t)) { seen.add(t); out.push({ key: `s|${s.name}|${out.length}`, text: t }); } };
      for (const p of s.patterns) for (const t of P.expand(p, K.samplesFor(s), 3)) add(t);
      for (const t of s.also) add(t);
    }
    return out;
  }
  setMeaning(m) { this.meaning = m; }
  // a sentence taught on the phone, by meaning too: its vector points to the same answer or skill
  addMeaning(key, vec) {
    const m = this.meaning;
    if (!m) return;
    const v = new Float32Array(m.vectors.length + m.dims);
    v.set(m.vectors); v.set(vec, m.vectors.length);
    m.vectors = v; m.keys.push(key);
  }
  nearestByMeaning(vec) {
    const m = this.meaning, fr = this.frame && this.frame.kind === "content" ? this.frame : null;
    const all = m.keys.map((key, i) => {
      let c = 0;
      for (let j = 0; j < m.dims; j++) c += vec[j] * m.vectors[i * m.dims + j];
      if (fr && key.split("|")[1] === this.content.docs[fr.di].id) c += 0.02; // the file the conversation is in, a little
      return { key, score: c };
    }).sort((a, b) => b.score - a.score);
    const of = k => all.filter(x => x.key.startsWith(k + "|"));
    const qs = of("q"), ps = of("p"), ss = of("s"), as = of("a");
    const top = qs[0] && (!ps[0] || qs[0].score >= ps[0].score - 0.03) ? qs[0] : ps[0];
    const seen = new Set();
    return { top, skill: ss[0], author: as[0], questions: qs.filter(x => { const q = x.key.split("|")[2].toLowerCase(); return !seen.has(q) && seen.add(q); }).slice(0, 4) };
  }

  // after an "I can't": by meaning. A skill is never done on a guess: it asks "Do you want me to…?". The
  // content: sure, the nearest answer; less sure, "Do you mean…?" with the nearest listed questions; below,
  // the "I can't" stands. The model only finds; what is said is still the files' and the skills' own words
  byMeaning(sentence, vec) {
    if (!this.meaning) return null;
    const n = this.nearestByMeaning(vec);
    const drop = () => { this.inbox = this.inbox.filter(e => e.sentence !== sentence); };
    const content = n.top ? n.top.score : -1;
    if (n.skill && n.skill.score >= MEANING.skill && n.skill.score > content) {
      const skill = this.byName.get(n.skill.key.split("|")[1]);
      if (skill && !skill.role) {
        const values = {};
        for (const [slot, need] of Object.entries(skill.needs)) { const v = K.findIn(need.kind, sentence, this.now()); if (v) values[slot] = v; }
        return this.confirm(skill, values, `meaning ${n.skill.score.toFixed(2)} (${skill.name})`, sentence, true);
      }
    }
    if (n.author && n.author.score >= MEANING.sure && (!n.top || n.author.score >= n.top.score)) { drop(); return this.invite(`meaning ${n.author.score.toFixed(2)} (for the author)`); }
    if (!this.content || !n.top) return null;
    if (n.top.score >= MEANING.sure) {
      const r = this.content.check(sentence, this.content.answerKey(n.top.key));
      if (r) { drop(); this.frame = r.frame; return this.turn("act", r.say, { source: r.source, chips: r.chips, why: `meaning ${n.top.score.toFixed(2)}` }); }
    }
    const qs = n.questions.filter(x => x.score >= MEANING.floor);
    if (qs.length) return this.turn("ask", this.say("do you mean"), { chips: qs.map(x => x.key.split("|")[2]), why: `meaning ${qs[0].score.toFixed(2)}, not sure` });
    return null;
  }
  // the listed questions a sentence most likely means, by meaning (the inbox's suggestions)
  questionsByMeaning(vec, n = 4) {
    if (!this.meaning || !this.content) return [];
    return this.nearestByMeaning(vec).questions.slice(0, n).map(x => {
      const [, id, q] = x.key.split("|"), d = this.content.docs.find(d => d.id === id);
      return { di: this.content.docs.indexOf(d), title: d.title, q, score: x.score };
    });
  }

  confirm(skill, values, why, sentence, unsure, say) {
    this.pending = { type: "confirm", skill, values, why, sentence, unsure };
    return this.turn("ask", say || this.say("not sure", { label: skill.label }), { chips: this.talk.chips, skill: skill.name, texts: this.texts(values), why });
  }

  // 6. what's still missing, an approval, or act
  next(skill, values, why, sentence) {
    values = { ...values };
    for (const [slot, need] of Object.entries(skill.needs)) {
      if (values[slot]) continue;
      if (need.default) { values[slot] = { text: need.default, said: this.reads(need.default) }; continue; }
      if (need.ask) {
        this.pending = { type: "value", skill, slot, values, why, sentence };
        return this.turn("ask", T.pick(need.ask, this.random), { skill: skill.name, values: this.said(values), texts: this.texts(values), why });
      }
    }
    for (const [slot, v] of Object.entries(values)) {
      if (v.ambiguous && v.alternatives && v.alternatives.length) {
        const choices = [{ iso: v.iso, said: v.said }, ...v.alternatives];
        this.pending = { type: "choose", skill, slot, values, why, sentence, choices };
        return this.turn("ask", this.say("which one", { a: choices[0].said, b: choices[1].said }), { chips: choices.map(c => c.said), skill: skill.name, texts: this.texts(values), why });
      }
    }
    if (skill.approve) {
      this.pending = { type: "confirm", skill, values, why, sentence };
      return this.turn("approve", T.fill(T.pick(skill.replies.approve || [this.say("not sure", { label: skill.label })], this.random), this.said(values)),
        { chips: this.talk.chips, skill: skill.name, values: this.said(values), why });
    }
    return this.finish(skill, values, why, false, sentence);
  }

  finish(skill, values, why, approved, sentence) {
    const said = this.said(values);
    let command = skill.command ? T.fill(skill.command, Object.fromEntries(Object.entries(values).map(([k, v]) => [k, v.iso || v.seconds || v.said]))) : null;
    let key = "done";
    if (command && command.startsWith("memory.")) { key = this.remember(skill.command, values, sentence) || key; command = null; }
    this.frame = { kind: "skill", skill: skill.name, values };
    const reply = T.pick(skill.replies[key] || skill.replies.done, this.random);
    const chips = reply.includes("{@skills}") ? this.examples() : [];
    return this.turn("act", T.fill(reply, { ...said, ...this.readings(reply) }), { skill: skill.name, values: said, texts: this.texts(values), command, why, approved, chips });
  }

  // what the engine keeps about you: each value with the sentence you said it in, refused if the
  // sentence doesn't hold it (Nod's rule for memory)
  remember(command, values, sentence) {
    const [op, key, slot] = command.split(/\s+/);
    if (op === "memory.forget") { const had = Object.keys(this.memory).length; for (const k of Object.keys(this.memory)) delete this.memory[k]; return had ? null : "empty"; }
    if (op === "memory.recall") return Object.keys(this.memory).length ? null : "empty";
    const v = values[(slot || "").replace(/[{}]/g, "")];
    if (!v || !String(sentence).toLowerCase().includes(String(v.text).toLowerCase())) return "refused";
    this.memory[key] = { value: v.said, quote: sentence, on: this.now().toISOString().slice(0, 10) };
    return null;
  }

  // what to try: one sentence per skill, from its first pattern, and one question per content file. The
  // index of what it can do, shown rather than guessed at (Nod keeps one; ptiLU shows it as chips)
  examples() {
    const out = this.skills.filter(s => !s.role && s.patterns.length).map(s => P.expand(s.patterns[0], K.samplesFor(s), 1)[0]);
    if (this.content) for (const d of this.content.docs) {
      if (d.questions.length) out.push(d.questions[0].q);
      else if (d.title.split(/\s+/).length <= 3) out.push(`what is ${d.title}`);
    }
    return [...new Map(out.map(x => [x.toLowerCase(), x])).values()];
  }

  texts(values) { return Object.fromEntries(Object.entries(values).map(([k, v]) => [k, v.text])); }
  said(values) { return Object.fromEntries(Object.entries(values).map(([k, v]) => [k, v.said || v.text])); }
  reads(text) { return text === "home" && this.memory.place ? this.memory.place.value : text; }

  // {@time}, {@date}, {@me}, {@me.name}, {@skills}, {@content}: the device and the engine, read now
  readings(reply) {
    const out = {}, now = this.now();
    for (const [, k] of reply.matchAll(/\{(@[\w.]+)\}/g)) {
      if (k === "@time") out[k] = K.sayTime(now);
      else if (k === "@date") out[k] = K.sayDay(now);
      else if (k.startsWith("@me.")) out[k] = (this.memory[k.slice(4)] || {}).value || "";
      else if (k === "@me") out[k] = Object.entries(this.memory).map(([n, m]) => this.say("me " + n, { value: m.value })).join(" ");
      else if (k === "@skills") out[k] = this.skills.filter(s => !s.role).map(s => s.label).join(", ");
      else if (k === "@content") out[k] = this.content ? this.content.topics.join(", ") : "";
    }
    return out;
  }
}

if (typeof module !== "undefined") module.exports = { Engine, SURE, PROPOSE, MEANING };
