// Dialogue core. It knows no skill by name: it routes what the model understood to the skill
// folders (skills/<name>/), keeps the conversation going (missing values, confirmations, choices)
// and hands each skill a toolbox (ctx) of shared services. One command per sentence.
// Commands are simulated: the trace shows what would run on the device.

const THRESHOLD = 0.45;        // below this the agent abstains
const SURE = 0.7;              // below this, a skill that acts asks first
const ENT = typeof NLUEntities !== "undefined" ? NLUEntities : require("./entities.js");
const SV = typeof NLUServices !== "undefined" ? NLUServices : require("./services.js");
const SKILLS = (typeof SKILLS_DATA !== "undefined" ? SKILLS_DATA : require("./skills.json")).skills;
// skills that do something (conversational ones are marked "kind: chat")
const ACTIONABLE = new Set(Object.keys(SKILLS).filter(k => SKILLS[k].params.kind !== "chat"));
const COMPILED = new Set(Object.keys(SKILLS)); // skill folders; the rest are taught on the device
// the skills the dialogue relies on, by the role their file declares: yes, no, fallback
const ROLE = Object.fromEntries(Object.entries(SKILLS).filter(([, s]) => s.params.role).map(([k, s]) => [s.params.role, k]));

// the dialogue's own replies; every skill brings its own as "<skill>.<name>"
const RESPONSES = {
  cancel: ["Cancelled.", "OK, I dropped it."],
  declined: ["OK, I'll leave it.", "Cancelled. Nothing changes."],
  empty_value: ["I didn't catch a name. Try again, or say cancel."],
  fallback: ["I didn't understand that. Say help to see what I can do."],
  learned: ["I recognise this as “{intent}”{got}, but no action is set up for it yet."],
  network: ["I need a network connection to {what}."],
  unsure: ["Do you want me to {what}?"],
  wait: ["One moment…"],
};
for (const [name, sk] of Object.entries(SKILLS)) for (const [k, v] of Object.entries(sk.replies)) RESPONSES[name + "." + k] = v;

const pick = arr => arr[Math.floor(Math.random() * arr.length)];
const fill = (key, vars = {}) => pick(RESPONSES[key]).replace(/\{(\w+)\}/g, (_, k) => vars[k] ?? "");
const has = key => key in RESPONSES;
const cleanValue = v => v.trim().replace(/^["'“”‘’`]+|["'“”‘’`.!?,]+$/g, "").trim();
// a value that only points ("this", "that folder", "here", "the current directory") names nothing
// the agent can see: it acts on top of a screen it doesn't know, so it asks rather than guess
const POINTER_RE = /^(the )?(this|that|these|those|here|there|it|current|this one|that one)( (folder|directory|dir|file|one|place))?$/i;
const YES_RE = /^(y|yes|yeah|yep|yup|sure|ok|okay|confirm|do it|go|go ahead|please do|absolutely|of course)\b/i;
const NO_RE = /^(n|no|nope|nah|nvm|cancel|stop|don'?t|never ?mind|abort|not now)\b/i;
const stripVerb = t => t.replace(/^(please\s+)?((can|could|would) you\s+)?/i, "")
  .replace(/^(open|launch|start|run|bring up|fire up|show( me)?|give me|get me|pull up|display|view)\s+(up\s+)?/i, "")
  .replace(/\s+(please|for me)\s*\??$/i, "");
// a word from a skill's value list: "the Terminal app" → the "terminal" entry (the slot's ignore: words dropped)
const words = t => " " + t.toLowerCase().replace(/[^a-z0-9%]+/g, " ").trim() + " ";
const findValue = (list, raw, ignore = []) => {
  let v = words(cleanValue(raw)).replace(/^ (the|my|a|an) /, " ");
  for (const w of ignore) v = v.replace(new RegExp(" " + w + " $"), " ");
  return (list || []).find(x => x.words.some(w => words(w) === v)) || null;
};
// a value named anywhere in a sentence, longest words first ("too quiet" before "quiet")
const guessValue = (list, text) => {
  const t = words(text);
  const all = (list || []).flatMap(x => x.words.map(w => [words(w), x])).sort((a, b) => b[0].length - a[0].length);
  return (all.find(([w]) => t.includes(w)) || [])[1] || null;
};
// a list slot's ignore: words, for matching against another skill's list
const ignoreFor = (skill, list) => Object.values((SKILLS[skill] && SKILLS[skill].slots) || {}).filter(s => s.list === list).flatMap(s => s.ignore);
// what a skill does, from its help line: "check the weather (“weather tomorrow”)" → "check the weather"
const doing = sk => (sk.params.help || "do that").replace(/\s*\(.*$/, "").trim();
const online = () => typeof navigator === "undefined" || navigator.onLine !== false;
const orList = a => (a.length > 1 ? a.slice(0, -1).join(", ") + " or " + a[a.length - 1] : a.join(""));
// which offered option an answer points to: an option's keys ("16th", "morning"), "the other one", or yes
function pickOption(answer, options) {
  const a = " " + answer.toLowerCase().replace(/[^a-z0-9:]+/g, " ") + " ";
  for (let i = 0; i < options.length; i++) if ((options[i].keys || []).some(k => a.includes(" " + k + " "))) return i;
  if (/ (second|other|latter|2nd|the other one) /.test(a)) return 1;
  if (/ (first|former|1st) /.test(a) || YES_RE.test(answer.trim())) return 0;
  return -1;
}
// a skill's script: bundled by the build in the browser, required from its folder in Node
function loadScript(name, sk) {
  const from = sk.params.script || name;
  if (typeof SKILL_CODE !== "undefined") return SKILL_CODE[from];
  return require(require("path").join(__dirname, "..", "skills", from, "skill.js"));
}

// Action + object (21 October). Skills that declare `does: <action> <object…>` share an action:
// create_file and create_folder are both "create". The object is read from the sentence's shape,
// not its words: the place ("inside the ideas folder") is set aside, then a name shaped like a file
// ("seed.md"), an app's name, or the word folder / file decides. When that moves the sentence to a
// sibling skill, its confidence is the model's score for the whole action (sure of "create", not of
// which object). No cue, or the same skill: the model's reading stands.
const DOES = Object.fromEntries(Object.entries(SKILLS).filter(([, s]) => s.params.does)
  .map(([k, s]) => { const [action, ...objects] = s.params.does.trim().split(/\s+/); return [k, { action, objects }]; }));
// "in / inside / into (the|my) X folder", X one to three words that aren't verbs or articles
const PLACE_SAID = /\b(?:in|inside|into|under|within)\s+(?:the\s+|my\s+)?((?:(?!(?:a|an|the|make|create|open|view|new|called|named)\b)[\p{L}\p{N}][\p{L}\p{N}_-]*\s+){1,3}?)(?:folder|directory|dir)\b/iu;
const PLACE_RE = /(^|\s+)(in|inside|into|under|within|on|to|from)\s+(this|that|the|my|a)?\s*(\S+\s+)?(folder|directory|dir)\b|\s+(in|inside|into|under|within|on|to|from)\s+.*$/gi;
// strongest cue first: a name shaped like a file, then an app's name, then the words folder / file
const FILE_SHAPE = /^[\w-]+\.[a-z0-9]{1,5}$/i, FOLDER_WORD = /^(folder|folders|directory|dir|subfolder)$/i, FILE_WORD = /^(file|document|doc)$/i;
function objectOf(text, action) {
  const head = text.replace(/["“][^"”]*["”]/g, m => m.includes(".") ? "x.md" : " ").replace(PLACE_RE, " ");
  const ws = head.split(/\s+/).map(w => w.replace(/^["'“‘(]+|["'”’).,!?]+$/g, "")).filter(Boolean);
  if (ws.some(w => FILE_SHAPE.test(w))) return "file";
  const appSkill = Object.keys(DOES).find(k => DOES[k].action === action && DOES[k].objects.includes("app"));
  const slot = appSkill && Object.values(SKILLS[appSkill].slots || {}).find(s => s.list);
  // an app named as whole words ("the file manager"), never inside a name ("tmp_files")
  if (slot && !ws.some(w => /[_]/.test(w)) && guessValue(SKILLS[appSkill].values[slot.list], ws.join(" "))) return "app";
  for (const w of ws) { if (FOLDER_WORD.test(w)) return "folder"; if (FILE_WORD.test(w)) return "file"; }
  return null;
}
function compose(nlu, r, text) {
  const top = DOES[r.intent];
  if (!top) return r;
  const object = objectOf(text, top.action);
  const target = object && Object.keys(DOES).find(k => DOES[k].action === top.action && DOES[k].objects.includes(object));
  if (!target) return r;
  if (target === r.intent) return Object.assign({}, r, { object });
  // the object moved the sentence to a sibling skill: the model was sure of the action, not the object
  const scores = nlu.classify(text);
  const action = scores.filter(([k]) => DOES[k] && DOES[k].action === top.action).reduce((a, [, p]) => a + p, 0);
  return Object.assign({}, r, { intent: target, confidence: action, object, composed: r.intent !== target ? r.intent + " → " + target : null });
}

// act, ask or abstain, from the model's reading alone. Below THRESHOLD, or out of scope: abstain.
// A skill that changes something (acts: yes) asks first below SURE, unless it's about to ask for a
// missing value anyway (nothing happens without that answer). tools/measure.js scores this same rule.
function decide(r, missing = false) {
  if (r.confidence < THRESHOLD || r.intent === ROLE.fallback) return "abstain";
  const sk = SKILLS[r.intent];
  if (sk && sk.params.acts === "yes" && r.confidence < SURE && !missing) return "ask";
  return "act";
}

class Agent {
  constructor(nlu, store) {
    this.nlu = nlu;
    this.store = store || null;
    this.fetch = typeof fetch !== "undefined" ? fetch.bind(globalThis) : null;
    this.reset();
  }
  reset() {
    this.pending = null; this.levels = {};
    for (const t of this.timers || []) clearTimeout(t);
    this.timers = [];
  }
  now() { return this.clock ? this.clock() : new Date(); }
  // timers and reminders really ring in the PWA while the page is open (onAlert shows the message)
  arm(at, message) {
    const ms = at - this.now();
    if (this.onAlert && ms > 0 && ms < 2 ** 31 - 1) this.timers.push(setTimeout(() => this.onAlert(message), ms));
  }

  // ---------- one command, or the answer to a question ----------
  handle(text) {
    const trace = [];
    this.lastText = text;
    const r = this.parse(text);
    trace.push({ type: "nlu", r });
    if (r.placeRead) trace.push({ type: "state", text: "location “" + r.slots.location + "” read from “… folder”" });
    if (r.composed) trace.push({ type: "state", text: "action " + DOES[r.intent].action + ", object " + r.object + " (from the sentence's shape): " + r.composed });
    const p = this.pending, t = text.trim();
    const no = NO_RE.test(t) || (r.intent === ROLE.no && r.confidence >= 0.5);
    const drop = why => { this.pending = null; trace.push({ type: "state", text: why }); };

    if (p && p.type === "confirm") {
      this.pending = null;
      const yes = YES_RE.test(t) || (r.intent === ROLE.yes && r.confidence >= 0.5);
      if (yes && !no) {
        trace.push({ type: "state", text: "confirmed " + p.what });
        if (p.sentence) { this.lastText = p.sentence; return this.run(p.intent, p.slots, trace); }
        return this.resume(p, p.then, trace);
      }
      if (no) { drop("declined " + p.what); return { trace, reply: fill(has(p.intent + ".declined") ? p.intent + ".declined" : "declined") }; }
      trace.push({ type: "state", text: "no clear yes, dropped " + p.what + " and read this as a new command" });
    } else if (p && p.type === "choose") {
      this.pending = null;
      const i = no ? -2 : pickOption(text, p.options);
      if (i >= 0) { trace.push({ type: "state", text: "picked “" + p.options[i].label + "”" }); return this.resume(p, p.options[i].then, trace); }
      if (i === -2) { drop("declined, nothing done"); return { trace, reply: fill("cancel") }; }
      trace.push({ type: "state", text: "answer matched no option, read it as a new command" });
    } else if (p) {
      if (no) { drop("cancelled pending " + p.intent); return { trace, reply: fill("cancel") }; }
      const asked = ((SKILLS[p.intent] && SKILLS[p.intent].slots) || {})[p.need];
      if (asked && asked.type === "secret" && /\s/.test(t)) drop("a sentence, not a key or an address: dropped the question");
      else if (ACTIONABLE.has(r.intent) && r.intent !== p.intent && r.confidence >= 0.9) drop("clearly " + r.intent + ": dropped the question");
      else if (r.intent === p.intent && r.slots[p.need]) {
        this.pending = null;
        trace.push({ type: "state", text: "same skill with " + p.need + ", merged into the question" });
        return this.run(p.intent, { ...p.slots, ...r.slots }, trace);
      }
      else if (r.intent === ROLE.fallback && r.confidence >= 0.55 && t.split(/\s+/).length >= 4) drop("off-topic sentence, dropped the question");
      else if (ACTIONABLE.has(r.intent) && r.confidence >= 0.8 && Object.keys(r.slots).length) drop("new command, dropped the question");
      else return this.answer(p, r, text, trace);
    }

    const d = this.decision(r);
    if (d === "abstain") {
      const low = r.confidence < THRESHOLD;
      trace.push({ type: "abstain", text: low ? "confidence " + r.confidence.toFixed(2) + " < " + THRESHOLD + ", abstaining" : "out of scope, no action" });
      return { trace, reply: fill(has(ROLE.fallback + ".say") ? ROLE.fallback + ".say" : "fallback"), unknown: true };
    }
    if (!SKILLS[r.intent]) { // taught through the inbox: recognised, but no skill folder does it yet
      const got = Object.entries(r.slots).map(([k, v]) => k + " “" + cleanValue(v) + "”").join(", ");
      trace.push({ type: "state", text: "learned skill " + r.intent + ", no skill folder" });
      return { trace, reply: fill("learned", { intent: r.intent.replace(/_/g, " "), got: got ? " (" + got + ")" : "" }) };
    }
    if (d === "ask") {
      this.pending = { type: "confirm", intent: r.intent, slots: r.slots, what: r.intent, sentence: text };
      trace.push({ type: "state", text: "confidence " + r.confidence.toFixed(2) + " < " + SURE + " for " + r.intent + ", which acts: asking first" });
      return { trace, reply: fill(has(r.intent + ".unsure") ? r.intent + ".unsure" : "unsure", { what: doing(SKILLS[r.intent]) }) };
    }
    return this.run(r.intent, r.slots, trace);
  }

  parse(text) {
    const r = compose(this.nlu, this.nlu.parse(text), text);
    // a place said as "in / inside / into (the|my) X folder" is read by its shape when the slot
    // model missed it ("inside Ideas folder", "in the ideas folder"): never dropped in silence
    const sk = SKILLS[r.intent], m = PLACE_SAID.exec(text), place = m && m[1].trim();
    // never words the slot model already gave to another value ("the work in progress folder")
    const taken = place && Object.values(r.slots).some(v => typeof v === "string" && v.toLowerCase().includes(place.toLowerCase()));
    if (place && !taken && sk && sk.slots && sk.slots.location && !r.slots.location) return { ...r, slots: { ...r.slots, location: place }, placeRead: true };
    return r;
  }

  // decide() for this sentence, knowing whether the skill would ask for a missing value
  decision(r) {
    const sk = SKILLS[r.intent];
    return decide(r, !!(sk && sk.slots && this.fillSlots(sk, r.slots, []).ask));
  }

  // Skills taught in the inbox ({ name: { answer, slots, needed } }) answer like a skill.md with
  // action: say: a value the answer uses is required, and asked for with "Which <value>?".
  teach(taught) {
    for (const name of this.taught || []) { delete SKILLS[name]; ACTIONABLE.delete(name); }
    this.taught = Object.keys(taught).filter(n => !COMPILED.has(n) && taught[n].answer);
    for (const name of this.taught) {
      const t = taught[name], replies = { say: [t.answer] };
      const slots = Object.fromEntries(t.slots.map(n => {
        const need = t.needed.includes(n);
        if (need) replies["ask_" + n] = ["Which " + n.replace(/_/g, " ") + "?"];
        return [n, { type: t.types[n] || "text", list: null, required: need, guess: false, ask: need ? "ask_" + n : null, invalid: null, default: null, ignore: [] }];
      }));
      SKILLS[name] = { action: "say", params: { skill: name }, slots, replies, values: {} };
      for (const [k, v] of Object.entries(replies)) RESPONSES[name + "." + k] = v;
      ACTIONABLE.add(name);
    }
  }

  // the answer to "what should I call it?": the needed value, minus any other value it carries
  // ("drafts in documents" → name "drafts", location "documents")
  answer(p, r, text, trace) {
    let rest = text;
    const extra = {};
    // only values the asking skill uses are split off: "Cookie" read as another skill's name stays in
    const own = (SKILLS[p.intent] && SKILLS[p.intent].slots) || null;
    for (const [k, v] of Object.entries(r.slots)) {
      if (k === p.need || (own && !own[k])) continue;
      const at = rest.toLowerCase().lastIndexOf(v.toLowerCase());
      if (at > 0) { rest = rest.slice(0, at).replace(/\s+(in|inside|on|under|within|to|at)(\s+(the|my))?\s*$/i, ""); extra[k] = v; }
    }
    const value = cleanValue(rest.replace(/^(please\s+)?(call it|name it|let'?s call it|it'?s|it is|its|name|called|named|use|make it|open|launch|start|run|fire up|i('?m| am)? (start(ing)? |leav(e|ing) |going |coming )?(from|at|to)|start(ing)? from|from|to)\s+/i, ""));
    if (!value) { trace.push({ type: "state", text: "still waiting for " + p.need }); return { trace, reply: fill("empty_value") }; }
    this.pending = null;
    const secret = SKILLS[p.intent] && SKILLS[p.intent].slots && (SKILLS[p.intent].slots[p.need] || {}).type === "secret";
    trace.push({ type: "state", text: "filled " + p.need + " ← " + (secret ? "••• (kept on this device)" : "“" + value + "”") });
    return this.run(p.intent, { ...p.slots, ...extra, [p.need]: value }, trace);
  }

  ask(intent, slots, need, key, trace, vars = {}) {
    this.pending = { intent, slots, need };
    trace.push({ type: "state", text: "missing " + need + ", waiting for an answer" });
    return { trace, reply: fill(key, vars) };
  }

  // ---------- running a skill ----------
  run(intent, slots, trace) {
    const sk = SKILLS[intent];
    this.raw = slots; // what the model heard, before the slots are filled
    if ((sk.params.uses || "").includes("network") && !online()) {
      trace.push({ type: "abstain", text: "offline, " + intent + " uses the network" });
      return { trace, reply: fill("network", { what: doing(sk) }) };
    }
    if (sk.slots) { // declared slots: fill them, ask for what's missing, before the skill runs
      const got = this.fillSlots(sk, slots, trace);
      if (got.ask) return this.ask(intent, { ...slots, ...got.values }, got.ask[0], intent + "." + got.ask[1], trace, got.ask[2]);
      slots = got.values;
    }
    if (sk.code || sk.params.script) return this.runScript(intent, sk, slots, trace);
    if (sk.action === "run") return this.runCommand(intent, sk, slots, trace);
    if (sk.request) return this.runRequest(intent, sk, slots, trace);
    return this.sayFilled(intent, slots, trace);
  }

  // A skill that declares a ## Request and has no script: call it, answer "done" with the
  // values read back, or "not_found" when the place or a required field isn't there.
  runRequest(intent, sk, slots, trace) {
    const words = Object.fromEntries(Object.entries(slots).filter(([k]) => !(sk.slots[k] && sk.slots[k].type === "secret")).map(([k, v]) => [k, this.spoken(v)]));
    return this.runScript(intent, sk, slots, trace, { run: ctx => ctx.later("checking", words, async () => {
      const res = await ctx.request(ctx.slots);
      if (res.place === null) return ctx.say("not_found", words);
      return SV.fmt.cap(ctx.say("done", { ...words, ...(res.place ? { place: res.place.name } : {}), ...res.answer }));
    }) });
  }

  // action: say with its slots filled. A time with two readings ("at 8" in the morning: 20:00
  // today or 08:00 tomorrow) is offered as a choice first; skills with a script decide themselves.
  sayFilled(intent, slots, trace) {
    const say = s => fill(intent + ".say", Object.fromEntries(Object.entries(s).map(([k, v]) => [k, this.spoken(v)])));
    const [name, e] = Object.entries(slots).find(([, v]) => v && v.type === "datetime" && v.ambiguous && (v.alternatives || []).length) || [];
    if (!e) return { trace, reply: say(slots) };
    const options = [e.value, e.alternatives[0]].map(value => {
      const v = { ...e, value, ambiguous: false, alternatives: [] }, at = SV.fmt.fromIso(value), h = at.getHours();
      const label = this.spoken(v);
      const h12 = String(h % 12 || 12), ap = h < 12 ? "am" : "pm";
      return { label, keys: [SV.fmt.clock(at), SV.fmt.clock(at).replace(/^0/, ""), String(h), h12 + ap, h12 + " " + ap, ...label.split(" ").slice(1),
        ...(h < 12 ? ["am", "morning", "a m"] : ["pm", "evening", "afternoon", "night", "tonight", "p m"])],
        then: () => say({ ...slots, [name]: v }) };
    });
    this.pending = { type: "choose", intent, slots, options };
    trace.push({ type: "state", text: "asking: " + options.map(o => o.label).join(" / ") });
    return { trace, reply: SV.fmt.cap(options[0].label) + ", or " + options[1].label + "?" };
  }

  // Each declared slot gets a value of its type: text from the model, a place (whole multi-word
  // name), or a date from the date parser. A missing required slot is asked for; a value that
  // doesn't fit its type is asked for again (with the slot's invalid: reply if it has one).
  fillSlots(sk, slots, trace) {
    const text = this.lastText, values = { ...slots };
    let ents = null;
    const parsed = () => (ents = ents || ENT.parse(text, { now: this.now() }));
    for (const [name, slot] of Object.entries(sk.slots)) {
      if (slots[name] && typeof slots[name] === "object") continue; // filled on an earlier turn
      const raw = slots[name] ? cleanValue(slots[name]) : null;
      const list = sk.values[slot.list];
      let v = null;
      const pointer = raw && POINTER_RE.test(raw);
      if (pointer) trace.push({ type: "state", text: name + " “" + raw + "” only points: asking which" });
      if (slot.type === "text") v = pointer ? null : raw;
      else if (slot.type === "place") v = raw && SV.places.placeIn(text, raw);
      else if (slot.type === "list") v = raw ? findValue(list, raw, slot.ignore) : slot.guess ? guessValue(list, text) : null;
      else if (slot.type === "secret") { const k = sk.params.skill + "." + name; v = raw || this.secret(k); if (raw) this.setSecret(k, raw); } // asked once per skill, kept on the device
      else if (slot.type === "duration") v = parsed().find(x => x.type === "duration") || null;
      else if (slot.type === "datetime") {
        const e = parsed().filter(x => x.type !== "duration");
        v = e.find(x => x.type === "datetime" || x.type === "recurrence") || e.find(x => x.type === "date" || x.type === "range") || null;
      }
      if (v && (slot.type === "datetime" || slot.type === "duration")) trace.push({ type: "entity", e: v });
      if (v && slot.type === "list" && !raw) trace.push({ type: "state", text: name + " found in the sentence ← " + v.key });
      if (!v && slot.default === "home") { const me = this.mem(); v = (me.place && me.place.name) || null; }
      if (!v && (slot.required || (pointer && slot.ask))) {
        const wrong = raw && slot.invalid;
        trace.push({ type: wrong ? "abstain" : "state", text: wrong ? name + " “" + raw + "” isn't a known " + (slot.list || slot.type) : "missing " + name });
        // what's filled so far waits with the question: a date read from the first sentence isn't lost
        const kept = Object.fromEntries(Object.entries(values).filter(([k, x]) => k !== name && x != null && !(sk.slots[k] && sk.slots[k].type === "secret")));
        return { ask: [name, wrong ? slot.invalid : slot.ask, { value: raw, choices: orList((list || []).map(x => x.key)) }], values: kept };
      }
      values[name] = v || null;
    }
    return { values };
  }

  // a filled slot in words for a reply: a list entry's name; a time with its day, counted from now
  // ("08:00 tomorrow", "20:00 today"); a duration, a repeat, or the words as said
  spoken(v) {
    if (!v || typeof v !== "object") return v;
    if (v.key) return v.key;
    const f = SV.fmt, now = this.now();
    if (v.type === "datetime") { const w = f.whenText(f.fromIso(v.value), now), m = /^(.*) at (\d\d:\d\d)$/.exec(w); return m ? m[2] + " " + m[1] : w; }
    if (v.type === "date") return f.dayText(f.fromIso(v.value), now);
    if (v.type === "duration") return f.durWords(v.seconds);
    if (v.type === "recurrence") return f.ruleWords(v.rrule).trim();
    return v.text;
  }

  // action: run — the command from the front matter; a {slot} from a list becomes that value's
  // command, any other value is single-quoted, so a sentence can't inject one
  runCommand(intent, sk, slots, trace) {
    const say = v => (v && typeof v === "object" ? v.key : v);
    trace.push({ type: "exec", text: sk.params.command.replace(/\{(\w+)\}/g, (_, k) => (slots[k] && slots[k].out) || SV.files.quote(cleanValue(String(this.spoken(slots[k]) || "")))) });
    return { trace, reply: fill(intent + ".done", Object.fromEntries(Object.entries(slots).map(([k, v]) => [k, say(v)]))) };
  }
  // the toolbox a skill script receives
  makeCtx(intent, sk, slots, trace) {
    const agent = this, now = this.now(), text = this.lastText;
    const ctx = {
      intent, text, now, values: sk.values, params: sk.params, live: trace,
      slots: Object.fromEntries(Object.entries(slots).filter(([, v]) => v != null).map(([k, v]) => [k, typeof v === "string" ? cleanValue(v) : v])),
      // what to answer
      say: (name, vars = {}) => fill(intent + "." + name, vars),
      ask: (slot, name, vars = {}) => ({ ask: [slot, name, vars] }),
      confirm: (what, question, then) => ({ confirm: [what, question, then] }),
      choose: (question, options) => ({ choose: [question, options] }),
      later: (name, vars, work) => ({ later: [name, vars, work] }),
      handover: (to, newSlots = {}, prefix = "") => ({ handover: [to, newSlots, prefix] }),
      // what happened, for the trace
      log: (line, type = "state") => ctx.live.push({ type, text: line }),
      used: e => ctx.live.push({ type: "entity", e }),
      exec: cmd => ctx.live.push({ type: "exec", text: cmd }),
      // shared services
      entities: () => ENT.parse(text, { now }),
      raw: Object.fromEntries(Object.entries(agent.raw || {}).filter(([, v]) => typeof v === "string").map(([k, v]) => [k, cleanValue(v)])),
      find: (list, raw) => findValue(sk.values[list], raw, ignoreFor(intent, list)),
      findIn: (skill, list, raw) => findValue(SKILLS[skill] && SKILLS[skill].values[list], raw, ignoreFor(skill, list)), // another skill's list
      lookup: (list, key) => ((sk.values[list] || []).find(v => v.key === String(key)) || {}).out,
      guess: () => stripVerb(text),
      state: { get: (k, d) => (k in agent.levels ? agent.levels[k] : d), set: (k, v) => { agent.levels[k] = v; } },
      me: { get: () => agent.mem(), set: m => agent.setMem(m) },
      geocode: name => agent.geocode(name),
      request: vars => agent.request(sk, vars, ctx),
      arm: (at, message) => agent.arm(at, message),
      skills: () => Object.values(SKILLS).filter(s => s.params.help).map(s => s.params.help),
      fmt: SV.fmt, files: SV.files,
    };
    return ctx;
  }

  runScript(intent, sk, slots, trace, script) {
    const ctx = this.makeCtx(intent, sk, slots, trace);
    return this.finish(intent, sk, ctx, (script || loadScript(intent, sk)).run(ctx), trace, slots);
  }
  // an answer to a confirmation or a choice: back to the skill that asked
  resume(p, then, trace) {
    const sk = SKILLS[p.intent], ctx = this.makeCtx(p.intent, sk, p.slots || {}, trace);
    return this.finish(p.intent, sk, ctx, then(ctx), trace, p.slots || {});
  }
  // turn what a script returned into the agent's reply
  finish(intent, sk, ctx, res, trace, slots) {
    if (res && res.ask) { const [slot, name, vars] = res.ask; return this.ask(intent, slots, slot, intent + "." + name, trace, vars); }
    if (res && res.confirm) {
      const [what, question, then] = res.confirm;
      this.pending = { type: "confirm", intent, slots, what, then };
      trace.push({ type: "state", text: "needs a yes first (" + what + ")" });
      return { trace, reply: question };
    }
    if (res && res.choose) {
      const [question, options] = res.choose;
      this.pending = { type: "choose", intent, slots, options };
      trace.push({ type: "state", text: "asking: " + options.map(o => o.label).join(" / ") });
      return { trace, reply: question };
    }
    if (res && res.handover) {
      const [to, newSlots, prefix] = res.handover;
      trace.push({ type: "state", text: "handed over to " + to });
      const out = this.run(to, newSlots, trace);
      if (prefix) out.reply = prefix + " " + out.reply;
      return out;
    }
    if (res && res.later) {
      const [name, vars, work] = res.later;
      const late = [];
      ctx.live = late;
      const later = Promise.resolve().then(work)
        .then(r => ({ reply: typeof r === "string" ? r : r.reply, trace: late }))
        .catch(err => {
          late.push({ type: "abstain", text: err.message });
          const reply = err.status && has(intent + ".failed") ? ctx.say("failed", { ...vars, status: err.status })
            : has(intent + ".offline") ? ctx.say("offline", vars)
            : (sk.params.uses || "").includes("network") ? fill("network", { what: doing(sk) }) : "Something went wrong: " + err.message;
          return { reply, trace: late };
        });
      return { trace, reply: has(intent + "." + name) ? ctx.say(name, vars) : fill("wait"), later };
    }
    return { trace, reply: typeof res === "string" ? res : (res && res.reply) || "" };
  }

  // network and memory services (web/services.js), bound to this agent's fetch and storage
  request(sk, vars, ctx) { return SV.net.request(this, sk, vars, ctx); }
  geocode(name) { return SV.net.geocode(this, name); }
  mem() { return SV.me.get(this.store, this); }
  secret(k) { return SV.secrets.get(this.store, this, k); }
  setSecret(k, v) { SV.secrets.set(this.store, this, k, v); }
  setMem(m) { SV.me.set(this.store, this, m); }
}
if (typeof module !== "undefined") module.exports = { Agent, decide };
