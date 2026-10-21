// Compile the skill folders (skills/<name>/skill.md, plus an optional skill.js) into
//   data/skills.md     training sentences (same format as the other data files)
//   web/skills.json    what the agent needs at runtime: action, parameters, value lists, replies,
//                      the declared API request, and whether the skill has a script
//
//   node skills.js            (train.js runs it too)
//
// Format: see skills/README.md
const fs = require("fs");
const path = require("path");

function rng(seed) { // mulberry32: the same sentences on every machine
  return () => { seed |= 0; seed = (seed + 0x6D2B79F5) | 0; let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}
const hash = s => { let h = 2166136261; for (const c of s) h = Math.imul(h ^ c.charCodeAt(0), 16777619); return h >>> 0; };

function parseSkill(md, file) {
  const fm = /^---\n([\s\S]*?)\n---\n?/.exec(md);
  if (!fm) throw new Error(file + ": missing front matter (--- ... ---)");
  const meta = {};
  for (const line of fm[1].split("\n")) {
    const m = /^\s*([a-z_]+)\s*:\s*(.*?)\s*$/.exec(line);
    if (m) meta[m[1]] = m[2].replace(/\s+#\s.*$/, "").replace(/^"(.*)"$/, "$1").replace(/^'(.*)'$/, "$1"); // "# note" ends a line
  }
  if (!meta.skill) throw new Error(file + ": front matter needs skill: <name>");
  const skill = { file, skill: meta.skill, action: meta.action || "say", params: meta, examples: [], values: {}, replies: {}, request: null, answer: {}, slots: null, secrets: {}, sections: new Set() };
  let section = null, list = null;
  for (const raw of md.slice(fm[0].length).split("\n")) {
    const line = raw.trim();
    const h = /^##\s+(.+)$/.exec(line);
    if (h) {
      const title = h[1].trim();
      const v = /^values\s*:\s*([a-z_]+)$/i.exec(title);
      section = v ? "values" : title.toLowerCase();
      skill.sections.add(section);
      if (v) list = skill.values[v[1]] = [];
      continue;
    }
    // ## Request: first line "METHOD https://...", then one "- name: value" line per query
    // parameter, "- header.Name: value" per header, "- body.path: value" per field of a JSON body
    if (section === "request") {
      const r = /^(GET|POST|PUT|PATCH|DELETE)\s+(\S+)$/.exec(line);
      if (r) { skill.request = { method: r[1], url: r[2], query: {}, headers: {}, body: null }; continue; }
    }
    if (!line.startsWith("- ")) continue;
    const item = line.slice(2).trim();
    if (section === "request" && skill.request) {
      const m = /^([A-Za-z0-9_.-]+)\s*:\s*(.+)$/.exec(item);
      if (!m) throw new Error(`${file}: can't read request line “${item}” (expected "- name: value")`);
      if (m[1].startsWith("header.")) skill.request.headers[m[1].slice(7)] = m[2];
      else if (m[1].startsWith("body.")) (skill.request.body = skill.request.body || {})[m[1].slice(5)] = m[2];
      else skill.request.query[m[1]] = m[2];
      continue;
    }
    // ## Answer: "- name: path.in.json [round] [→ list] [required]"
    if (section === "answer") {
      const m = /^([a-z_]+)\s*:\s*([A-Za-z0-9_.\[\]]+)(\s+round)?(?:\s*(?:→|->)\s*([a-z_]+))?(\s+required)?$/.exec(item);
      if (!m) throw new Error(`${file}: can't read answer line “${item}” (expected "- name: path")`);
      if (skill.answer[m[1]]) throw new Error(`${file}: ## Answer has “${m[1]}” twice`);
      skill.answer[m[1]] = { path: m[2], round: !!m[3], via: m[4] || null, required: !!m[5] };
      continue;
    }
    // ## Slots: "- name: type, required, ask: reply, invalid: reply, default: source"
    if (section === "slots") {
      const m = /^([a-z_]+)\s*:\s*(.+)$/.exec(item);
      if (!m) throw new Error(`${file}: can't read slot line “${item}” (expected "- name: type, …")`);
      const [type, ...rest] = m[2].split(/\s*,\s*/);
      const [kind, list] = type.split(/\s+/);  // "list app": a value from ## Values: app
      const slot = { type: kind, list: list || null, required: false, guess: false, ask: null, invalid: null, default: null, ignore: [] };
      for (const opt of rest) {
        const o = /^(required|guess|ask|invalid|default|ignore)(?:\s*:\s*(.+))?$/.exec(opt);
        const flag = o && (o[1] === "required" || o[1] === "guess");
        if (!o || flag === !!o[2]) throw new Error(`${file}: slot ${m[1]}: unknown option “${opt}”`);
        slot[o[1]] = flag ? true : o[1] === "ignore" ? o[2].toLowerCase().split(/\s+/) : o[2];
      }
      (skill.slots = skill.slots || {})[m[1]] = slot;
      continue;
    }
    // ## Secrets (action.md): "- name: the question to ask once"
    if (section === "secrets") {
      const m = /^([a-z_]+)\s*:\s*(.+)$/.exec(item);
      if (!m) throw new Error(`${file}: can't read secret line “${item}” (expected "- name: question")`);
      skill.secrets[m[1]] = m[2];
      continue;
    }
    if (section === "examples") skill.examples.push(item);
    else if (section === "values") {
      // "key: synonym, synonym → output"   (synonyms and output are optional)
      const [left, out] = item.split(/\s*(?:→|->)\s*/);
      const [key, syn] = left.split(/:\s+/);
      const words = [key, ...(syn ? syn.split(/\s*,\s*/) : [])].map(w => w.trim()).filter(Boolean);
      list.push({ key: key.trim(), words: [...new Set(words.map(w => w.toLowerCase()))], say: words, out: out === undefined ? null : out.trim() });
    } else if (section === "replies") {
      const m = /^([a-z_]+)\s*:\s*(.+)$/.exec(item);
      if (m) skill.replies[m[1]] = m[2].split(/\s+\|\s+/).map(s => s.trim());
    }
  }
  return skill;
}

// action.md: what the skill does with the values, next to skill.md (what people say and hear).
// Only Request, Answer, Secrets and Values lists go there, and "uses:" in its front matter;
// it is merged into the same compiled skill, so the agent doesn't know which file said what.
const ACTION_SECTIONS = ["request", "answer", "secrets", "values"];
function mergeAction(s, md, file) {
  const a = parseSkill(/^---\n/.test(md) ? md.replace(/^---\n/, `---\nskill: ${s.skill}\n`) : `---\nskill: ${s.skill}\n---\n` + md, file);
  const err = msg => { throw new Error(`${file}: ${msg}`); };
  for (const sec of a.sections) if (!ACTION_SECTIONS.includes(sec)) err(`## ${sec} belongs in skill.md (action.md holds Request, Answer, Secrets and Values)`);
  for (const k of Object.keys(a.params)) if (!["skill", "uses"].includes(k)) err(`front matter: only uses: goes here, “${k}:” belongs in skill.md`);
  for (const sec of ["request", "answer", "secrets"]) if (s.sections.has(sec)) err(`## ${sec} is in both skill.md and action.md: keep it in action.md`);
  if (s.params.uses && a.params.uses) err("uses: is in both files: keep it in action.md");
  for (const k of Object.keys(a.values)) if (s.values[k]) err(`## Values: ${k} is in both files`);
  Object.assign(s.values, a.values);
  s.request = a.request; s.answer = a.answer;
  if (a.params.uses) s.params.uses = a.params.uses;
  for (const [name, question] of Object.entries(a.secrets)) {
    if (s.slots && s.slots[name]) err(`secret ${name} is also a slot in skill.md`);
    (s.slots = s.slots || {})[name] = { type: "secret", list: null, required: true, guess: false, ask: "ask_" + name, invalid: null, default: null, ignore: [] };
    s.replies["ask_" + name] = [question];
  }
  s.action_file = file;
}

// Checks that run when the skills are compiled, so a mistake shows up while writing the skill,
// not when someone talks to the agent.
const SLOT_TYPES = ["text", "place", "datetime", "duration", "list", "secret"];
const ROLES = ["yes", "no", "fallback"];   // the skills the dialogue itself relies on
const DEFAULTS = ["home"];   // home: the place the person told the agent they live in
const USES = ["network"];
function validate(s) {
  const err = msg => { throw new Error(`${s.file}: ${msg}`); };
  const p = s.params;
  if (p.confidence !== undefined) err("confidence: is replaced by acts: yes (the skill changes something, so it asks first when unsure)");
  if (p.acts !== undefined && !["yes", "no"].includes(p.acts)) err(`acts: yes or no, not “${p.acts}”`);
  for (const u of (p.uses || "").split(/\s*,\s*/).filter(Boolean)) if (!USES.includes(u)) err(`uses: unknown “${u}” (known: ${USES.join(", ")})`);
  if (p.role && !ROLES.includes(p.role)) err(`role: unknown “${p.role}” (known: ${ROLES.join(", ")})`);
  const slots = s.slots || {};
  const trainOnly = (p.train_only || "").split(/\s*,\s*/);
  for (const [name, slot] of Object.entries(slots)) {
    if (!SLOT_TYPES.includes(slot.type)) err(`slot ${name}: unknown type “${slot.type}” (known: ${SLOT_TYPES.join(", ")})`);
    if (slot.type === "list" && (!s.values[slot.list] || trainOnly.includes(slot.list))) err(`slot ${name}: “list ${slot.list}” needs a ## Values: ${slot.list} list that isn't train_only`);
    if (slot.type !== "list" && (slot.list || slot.guess || slot.ignore.length)) err(`slot ${name}: guess, ignore and a list name are for list slots only`);
    if (slot.required && !slot.ask) err(`slot ${name} is required but has no ask: reply to ask for it`);
    for (const k of ["ask", "invalid"]) if (slot[k] && !s.replies[slot[k]]) err(`slot ${name}: ${k}: “${slot[k]}” is not in ## Replies`);
    if (slot.default && !DEFAULTS.includes(slot.default)) err(`slot ${name}: unknown default “${slot.default}” (known: ${DEFAULTS.join(", ")})`);
    if (slot.type === "secret" && !slot.required) err(`slot ${name}: a secret slot is required (asked once, then kept on the device)`);
  }
  // the request may only use declared values: {slot} or {slot.field}
  const r = s.request;
  const all = q => [q.url, ...Object.values(q.query), ...Object.values(q.headers), ...Object.values(q.body || {})];
  if (r) for (const v of all(r))
    for (const m of v.matchAll(/\{(\w+)[.\w]*\}/g)) if (!slots[m[1]]) throw new Error(`${s.action_file || s.file}: ## Request uses {${m[1]}}, which is no slot in skill.md and no secret`);
  // every {value} a reply uses is one the skill has: a slot, an answer field, or one the core adds
  if (r && !s.code && !p.script) {
    const known = new Set([...Object.keys(slots), ...Object.keys(s.answer), "status"]);
    for (const [k, vs] of Object.entries(s.replies)) for (const v of vs) for (const m of v.matchAll(/\{(\w+)\}/g))
      if (!known.has(m[1])) err(`reply ${k} uses {${m[1]}}, which is no slot or ## Answer field`);
  }
  if (r && !s.code && !p.script) {
    const found = Object.values(s.answer).some(a => a.required) || (r && all(r).some(v => v.includes("{place.")));
    const need = ["done", ...(found ? ["not_found"] : [])];
    for (const k of need) if (!s.replies[k]) err(`a skill with a ## Request and no script answers with the “${k}” reply, which ## Replies doesn't have`);
  }
  // every value the examples teach the model to pull out, or the command uses, must be declared
  for (const ex of s.examples) for (const m of ex.matchAll(/\]\(([a-z_]+)\)/g))
    if (!slots[m[1]]) err(`examples mark [..](${m[1]}) but ## Slots doesn't declare ${m[1]}`);
  for (const m of (p.command || "").matchAll(/\{(\w+)\}/g)) if (!slots[m[1]]) err(`command uses {${m[1]}} but ## Slots doesn't declare it`);
}

// Expand one template: {a|b|} picks an alternative, {list} picks a value from "## Values: list".
function expand(tpl, skill, rand) {
  let t = tpl;
  for (let guard = 0; guard < 50; guard++) {
    const m = /\{([^{}]*)\}/.exec(t);
    if (!m) break;
    let rep;
    if (m[1].includes("|")) { const alts = m[1].split("|"); rep = alts[Math.floor(rand() * alts.length)]; }
    else {
      const list = skill.values[m[1]];
      if (!list) throw new Error(`${skill.file}: {${m[1]}} has no "## Values: ${m[1]}" list`);
      const v = list[Math.floor(rand() * list.length)];
      rep = v.say[Math.floor(rand() * v.say.length)];
    }
    t = t.slice(0, m.index) + rep + t.slice(m.index + m[0].length);
  }
  return t.replace(/\s+/g, " ").replace(/\s+([?!.,])/g, "$1").trim();
}

// A skill's training sentences, each with the index of the example line it came from.
function sentences(s) {
  const rand = rng(hash(s.skill));
  const n = +(s.params.samples || 6);
  const lower = s.params.lowercase !== undefined ? +s.params.lowercase : 0.35;
  const lines = new Map();
  s.examples.forEach((tpl, i) => {
    for (let k = 0; k < (/\{/.test(tpl) ? n : 1); k++) {
      const line = expand(tpl, s, rand);
      if (!lines.has(line)) lines.set(line, i);
      // phones often type in lowercase: add a lowercase copy of some sentences
      if (line !== line.toLowerCase() && rand() < lower && !lines.has(line.toLowerCase())) lines.set(line.toLowerCase(), i);
    }
  });
  return lines;
}

function compile(dir = "skills", write = true) {
  const folders = fs.readdirSync(dir).filter(f => fs.existsSync(path.join(dir, f, "skill.md"))).sort();
  const skills = [];
  for (const f of folders) {
    const s = parseSkill(fs.readFileSync(path.join(dir, f, "skill.md"), "utf8"), path.join(dir, f, "skill.md"));
    if (s.skill !== f) throw new Error(`${s.file}: skill name "${s.skill}" must match its folder "${f}"`);
    const action = path.join(dir, f, "action.md");
    if (fs.existsSync(action)) mergeAction(s, fs.readFileSync(action, "utf8"), action);
    s.dir = path.join(dir, f);
    s.code = fs.existsSync(path.join(dir, f, "skill.js"));
    validate(s);
    if (s.params.role && skills.some(o => o.params.role === s.params.role)) throw new Error(`${s.file}: another skill already has role: ${s.params.role}`);
    skills.push(s);
  }
  let md = "<!-- generated by skills.js from skills/*.md — edit the skill files, not this file -->\n";
  const runtime = {};
  for (const s of skills) {
    const lines = sentences(s);
    md += `\n## intent: ${s.skill}\n` + [...lines.keys()].map(l => "- " + l).join("\n") + "\n";
    const { skill, file, dir, code, action, params, values, replies, request, answer, slots } = s;
    runtime[skill] = { file, dir, code, action, params, request, answer, replies, slots, sentences: lines.size,
      values: Object.fromEntries(Object.entries(values).filter(([k]) => !(params.train_only || "").split(/\s*,\s*/).includes(k))) };
  }
  if (write) fs.writeFileSync("data/skills.md", md);
  if (write) fs.writeFileSync("web/skills.json", JSON.stringify({ skills: runtime }, null, 1));
  // each training sentence → the example line it came from (tools/measure.js --group)
  const groups = new Map(skills.flatMap(s => [...sentences(s)].map(([l, i]) => [s.skill + "|" + l.replace(/\[([^\]]+)\]\([a-z_]+\)/g, "$1"), s.skill + "#" + i])));
  return { skills: runtime, groups, sentences: Object.values(runtime).reduce((a, s) => a + s.sentences, 0) };
}

if (require.main === module) {
  const r = compile();
  for (const [k, s] of Object.entries(r.skills)) console.log(`  ${k.padEnd(14)} ${String(s.sentences).padStart(4)} sentences  ${s.code ? "skill.md + skill.js" : "skill.md only"}${s.request ? " · request " + (/^https?:/.test(s.request.url) ? new URL(s.request.url.replace(/\{\w+\}/g, "x")).host : "webhook " + s.request.url) : ""}`);
  console.log(`data/skills.md: ${r.sentences} sentences · web/skills.json`);
}
module.exports = { compile, parseSkill, validate };
