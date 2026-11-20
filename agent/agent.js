// The conversation. A sentence goes, in this order, to:
//   1. a follow-up chip it was just offered (a project, a part of it, "tell me more", a skill)
//   2. the question waiting for an answer ("Do you mean…?", a missing value)
//   3. the project the conversation is in: "tell me more", or a paragraph of it that answers the question
//   4. a project named in it, or a skill's "People say" pattern, read exactly
//   5. the skills by meaning: sure, it answers; not sure, it asks "Do you mean…?"; too far, the fallback
// A yes to "Do you mean…?" is the teaching: the sentence becomes an example of that skill (at once on
// your own device, through the inbox on a public page). A "that's not it" sends the sentence to the inbox.

const T = require("./text.js");
const P = require("./patterns.js");
const K = require("./kinds.js");
const S = require("./skills.js");

// how near, in meaning (cosine) or in words, a sentence must be to a skill's examples. Set on my-agent's
// skills examples, each left out (agent/meaning/bars.mjs); checked on tests/held-out.json (measure.mjs)
const NUMBERS = { 2: "Two", 3: "Three", 4: "Four" };
const BARS = { meaning: { sure: 0.525, ask: 0.45, gap: 0.08, far: 0.3 }, words: { sure: 0.75, ask: 0.35, gap: 0.1, far: 0.1 } };

class Agent {
  constructor({ skills, projects, talk, router, now = () => new Date(), random = Math.random, mode = "site" }) {
    Object.assign(this, { skills, projects, talk, router, now, random, mode });
    this.byName = new Map(skills.map(s => [s.name, s]));
    this.fallbackSkill = skills.find(s => s.fallback) || null;
    this.contactSkill = skills.find(s => s.kind === "contact" && !s.fallback) || this.fallbackSkill;
    this.inbox = [];
    this.reset();
  }
  reset() { this.pending = null; this.frame = null; this.offered = new Map(); }
  today() { return this.now().toISOString().slice(0, 10); }
  say(key, values = {}) { return T.fill(T.pick(this.talk.replies[key] || [key], this.random), values); }
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
  is(list, s) { const t = T.words(s).join(" "); return this.talk[list].some(w => t === w); }

  // ---- one turn --------------------------------------------------------------------------------------
  // vec: the sentence's MiniLM vector, when the page has it (without it, the skills are found by words)
  respond(raw, vec = null) {
    const sentence = this.clean(raw);
    const offered = this.offered;
    this.offered = new Map();
    if (!sentence) return this.cant("", "nothing said");
    const key = T.words(sentence).join(" ");

    // 1. a chip it was just offered
    const chip = offered.get(key);
    if (chip) { this.pending = null; return this.act(chip, sentence); }

    // 2. the question waiting for an answer
    const p = this.pending;
    this.pending = null;
    if (p && p.type === "confirm") {
      if (this.is("yes", sentence)) return this.chose(p, p.options[0]);
      if (this.is("no", sentence)) return this.declined(p);
    }
    if (p && p.type === "value") {
      const v = K.reader(p.skill.needs[p.slot].kind)(sentence, this.now()) || K.findIn(p.skill.needs[p.slot].kind, sentence, this.now());
      if (v) return this.run(p.skill, { ...p.values, [p.slot]: { text: sentence, ...v } }, p.sentence);
      if (this.is("no", sentence)) return this.turn("act", this.say("ok no"), { why: "cancelled" });
    }

    if (!p && (this.is("yes", sentence) || this.is("no", sentence))) return this.turn("act", this.say("ok"), { why: "nothing was asked", sentence });

    // 3. the project the conversation is in: "tell me more", or one of its parts by name
    if (this.frame && this.is("more", sentence)) return this.more();
    if (this.frame) {
      const pi = this.projects.byId.get(this.frame.project).parts.findIndex(x => T.words(x.title).join(" ") === key);
      if (pi >= 0) return this.showPart(this.frame.project, pi, "part named");
    }

    // 4. a project named, a pattern read exactly
    const named = this.projects && this.projects.named(sentence);
    if (named && T.words(sentence).length <= T.words(named.title).length + 4) return this.open(named.id, `"${named.title}" named`);
    const exact = this.exact(sentence);
    if (exact) return this.run(exact.skill, exact.values, sentence, `"People say": ${exact.pattern}`);

    // 5. the skills, by meaning (or words). Inside a project, a sure skill still wins; otherwise the
    // project's own paragraphs are looked at first
    const ranked = this.router.rank(sentence, vec);
    const by = ranked.length ? ranked[0].by : "words", bar = BARS[by];
    const [a, b] = ranked;
    const why = r => `${r.by} ${r.score.toFixed(2)}: ${r.skill} ("${r.example}")`;
    if (a && a.score >= bar.sure && (!b || a.score - b.score >= bar.gap)) {
      const skill = this.byName.get(a.skill);
      // a skill that does something is never done on a guess: it asks first
      if (skill.kind !== "do" || a.score >= 0.85) return this.run(skill, this.valuesIn(skill, sentence), sentence, why(a));
    }
    if (this.frame) {
      const hit = this.projects.search(this.frame.project, sentence);
      if (hit) return this.showPart(this.frame.project, hit.part, `in ${this.frame.project}: ${hit.found} words of ${Math.round(hit.found / hit.coverage)}`, hit.text);
    }
    if (named) return this.open(named.id, `"${named.title}" named`);
    // a detail of a project, asked without opening it: the paragraph, under its project's card
    const hit = this.projects.search(null, sentence);
    // a question about the owner ("what makes you different") isn't a project detail, even if its words are in one
    const aboutMe = ranked.slice(0, 3).some(r => r.score >= bar.ask - 0.05 && ["about", "contact"].includes(this.byName.get(r.skill).kind));
    if (hit && !aboutMe && (!a || a.score < bar.sure) && hit.coverage >= 0.66) return this.detail(hit, `${hit.project}: ${hit.found} words of ${Math.round(hit.found / hit.coverage)}`);
    if (a && a.score >= bar.ask) {
      const options = ranked.filter(r => r.score >= bar.ask && a.score - r.score < 0.08).slice(0, 2).map(r => r.skill);
      return this.confirm(sentence, vec, options, why(a));
    }
    // far from everything: said plainly, with a way to write; nearer, the invitation (the fallback skill)
    if (!a || a.score < bar.far) { this.inbox.push({ sentence, why: a ? `far: ${why(a)}` : "no skill near", on: this.today() }); return this.turn("abstain", this.say("far"), { why: a ? `far: ${why(a)}` : "no skill near", sentence, chips: this.contactChip() }); }
    return this.nothing(sentence, `nearest: ${why(a)}`);
  }

  exact(sentence) {
    const toks = T.tokens(sentence);
    let best = null;
    for (const skill of this.skills) for (const pat of skill.patterns) {
      const m = P.match(pat, toks, (slot, text) => K.reader(skill.needs[slot].kind)(text, this.now()));
      if (m && (!best || m.score > best.score)) best = { ...m, skill, pattern: pat.pattern };
    }
    return best;
  }
  valuesIn(skill, sentence) {
    const out = {};
    for (const [slot, need] of Object.entries(skill.needs)) { const v = K.findIn(need.kind, sentence, this.now()); if (v) out[slot] = v; }
    return out;
  }

  // ---- what the agent says --------------------------------------------------------------------------
  turn(outcome, say, extra = {}) {
    const t = { outcome, say, chips: [], ...extra };
    for (const c of t.chips) this.offered.set(T.words(c.text).join(" "), c);
    t.chips = t.chips.map(c => c.text);
    return t;
  }
  cant(sentence, why) { return this.turn("abstain", this.say("cant"), { why, sentence }); }

  // "Do you mean…?": the nearest skills as chips, and no
  confirm(sentence, vec, options, why) {
    const pending = this.pending = { type: "confirm", sentence, vec, options };
    const chips = options.map(name => ({ text: this.byName.get(name).label, type: "choose", name, pending }));
    chips.push({ text: "No", type: "no", pending });
    return this.turn("ask", options.length === 1 ? this.say("not sure", { label: this.byName.get(options[0]).label }) : this.say("do you mean"), { chips, why, sentence, options });
  }
  chose(p, name) {
    const skill = this.byName.get(name);
    this.taught(p.sentence, skill, p.vec, "you said yes");
    return this.run(skill, this.valuesIn(skill, p.sentence), p.sentence, `confirmed: ${name}`);
  }
  declined(p) {
    this.inbox.push({ sentence: p.sentence, why: `not ${p.options.map(n => this.byName.get(n).label).join(", not ")}`, not: p.options, vec: p.vec, on: this.today() });
    return this.fallback(p.sentence, "you said no");
  }
  // a yes is an example for the skill: taught at once on your own device, waiting in the inbox on a page
  // anyone can use
  taught(sentence, skill, vec, why) {
    if (this.mode === "own") return this.teach(sentence, skill.name, vec);
    this.inbox.push({ sentence, why, suggest: skill.name, vec, on: this.today() });
  }
  teach(sentence, name, vec = null) {
    const skill = this.byName.get(name);
    if (!skill) return { ok: false, why: `no skill called ${name}` };
    const text = this.clean(sentence);
    if (S.examples(skill).includes(text)) return { ok: false, why: "already one of its examples" };
    const line = S.addLearned(skill, text, this.today());
    this.router.add(name, text, vec);
    if (this.onTeach) this.onTeach({ sentence: text, skill: name, vec });
    this.inbox = this.inbox.filter(e => e.sentence !== text);
    return { ok: true, line, md: skill.md };
  }
  // "that's not it", under an answer
  wrong(t) {
    if (!t || !t.sentence) return;
    this.inbox.push({ sentence: t.sentence, why: `wrong answer (${t.skill || t.project || "?"})`, not: t.skill ? [t.skill] : [], on: this.today() });
  }
  nothing(sentence, why) {
    this.inbox.push({ sentence, why, on: this.today() });
    return this.fallback(sentence, why);
  }
  fallback(sentence, why) {
    if (this.fallbackSkill) return this.run(this.fallbackSkill, {}, sentence, `${why}: the invitation`);
    return this.cant(sentence, why);
  }

  // a chip, tapped or typed
  act(chip, sentence) {
    if (chip.type === "project") return this.open(chip.id, "chip");
    if (chip.type === "part") return this.showPart(chip.id, chip.pi, "chip");
    if (chip.type === "more") return this.more();
    if (chip.type === "skill") return this.run(this.byName.get(chip.name), {}, sentence, "chip");
    if (chip.type === "choose") return this.chose(chip.pending, chip.name);
    if (chip.type === "no") return this.declined(chip.pending);
    return this.cant(sentence, "unknown chip");
  }

  // ---- skills -----------------------------------------------------------------------------------------
  run(skill, values, sentence, why = "") {
    for (const [slot, need] of Object.entries(skill.needs)) {
      if (values[slot]) continue;
      this.pending = { type: "value", skill, slot, values, sentence };
      return this.turn("ask", T.pick(need.ask, this.random), { why, sentence, skill: skill.name });
    }
    const said = Object.fromEntries(Object.entries(values).map(([k, v]) => [k, v.said]));
    const extra = { why, sentence, skill: skill.name };
    if (skill.kind === "question") {
      const leads = skill.leads.filter(id => this.projects && this.projects.byId.has(id));
      if (!leads.length) return this.turn("act", skill.answer || this.say("not written"), { ...extra, command: "form.open", chips: this.contactChip() });
      const first = this.projects.byId.get(leads[0]);
      if (leads.length === 1) return this.openWith(leads[0], skill.answer || first.meta.intro || `That's what ${first.title} was about.`, [], extra);
      // several projects answer it: a card for each, side by side; tapping one opens it
      this.frame = null;
      return this.turn("act", skill.answer || this.say("several", { n: NUMBERS[leads.length] || leads.length }), { ...extra, projects: leads,
        cards: leads.map(id => this.projects.card(id)), chips: [...leads.map(id => ({ text: this.projects.byId.get(id).title, type: "project", id })), ...this.contactChip()] });
    }
    const say = this.read(T.fill(T.pick(skill.replies.done, this.random), said));
    const command = skill.command ? T.fill(skill.command, Object.fromEntries(Object.entries(values).map(([k, v]) => [k, v.seconds !== undefined ? v.seconds : v.said]))) : null;
    if (skill.kind === "about") return this.turn("act", say, { ...extra, chips: [...this.aboutChips(skill), ...this.contactChip()] });
    if (skill.kind === "contact") return this.turn("act", say, { ...extra, command: "form.open" });
    return this.turn("act", say, { ...extra, command });
  }
  read(text) {
    const now = this.now();
    return text.replace("{@time}", K.sayTime(now)).replace("{@date}", K.sayDay(now))
      .replace("{@skills}", this.skills.filter(s => s.kind === "do").map(s => s.label).join(", "))
      .replace("{@content}", this.projects ? this.projects.list.map(p => p.title).join(", ") : "");
  }
  contactChip() { return this.contactSkill ? [{ text: "Write to me", type: "skill", name: this.contactSkill.name }] : []; }
  aboutChips(skill) {
    return this.skills.filter(s => s.kind === "about" && s !== skill && s.patterns.length).slice(0, 2)
      .map(s => ({ text: P.expand(s.patterns[0], {}, 1)[0].replace(/^./, c => c.toUpperCase()), type: "skill", name: s.name }));
  }

  // ---- projects ---------------------------------------------------------------------------------------
  open(id, why) { return this.openWith(id, null, [], { why }); }
  openWith(id, say, others, extra) {
    const card = this.projects.card(id);
    this.frame = { project: id, seen: new Set(), others };
    return this.turn("act", say || card.line, { ...extra, cards: [card], project: id, projects: [id], chips: this.follow(id, others) });
  }
  showPart(id, pi, why, text = null) {
    const part = this.projects.part(id, pi);
    if (!this.frame || this.frame.project !== id) this.frame = { project: id, seen: new Set(), others: [] };
    this.frame.seen.add(pi);
    return this.turn("act", text || part.text, { why, project: id, projects: [id], part: part.title, chips: this.follow(id, this.frame.others) });
  }
  detail(hit, why) {
    this.frame = { project: hit.project, seen: new Set([hit.part]), others: [] };
    return this.turn("act", hit.text, { why, project: hit.project, projects: [hit.project], part: hit.title, cards: [this.projects.card(hit.project)], chips: this.follow(hit.project, []) });
  }
  more() {
    const id = this.frame.project, next = this.projects.next(id, this.frame.seen);
    if (!next.length) return this.turn("act", this.say("no more", { title: this.projects.byId.get(id).title }), { why: "all of it seen", project: id, chips: [...this.frame.others.map(o => ({ text: this.projects.byId.get(o).title, type: "project", id: o })), ...this.contactChip()] });
    return this.showPart(id, next[0], "tell me more");
  }
  // what can follow: the parts of the project not yet seen, the other projects of the skill, write to me
  follow(id, others) {
    const p = this.projects.byId.get(id), seen = this.frame ? this.frame.seen : new Set();
    const parts = this.projects.next(id, seen).slice(0, 3).map(pi => ({ text: p.parts[pi].title, type: "part", id, pi }));
    const more = parts.length ? [{ text: "Tell me more", type: "more" }] : [];
    return [...parts, ...more, ...others.map(o => ({ text: this.projects.byId.get(o).title, type: "project", id: o })), ...this.contactChip()];
  }
}

if (typeof module !== "undefined") module.exports = { Agent, BARS };
