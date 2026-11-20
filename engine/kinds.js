// The kinds of value a skill file can ask for, in the words it writes them ("a duration"), and how each
// is read from what was typed. A value is read whole or not at all: "mum next friday" is no date.
// Dates, times and durations come from ptiLU's rule-based parser (web/entities.js).

const E = typeof NLUEntities !== "undefined" ? NLUEntities : require("../web/entities.js");

const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September",
  "October", "November", "December"];
const sayDay = d => `${DAYS[d.getDay()]} ${d.getDate()} ${MONTHS[d.getMonth()]}`;
const sayTime = d => `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
const sayAt = iso => { const d = new Date(iso); return iso.length > 10 ? `${sayDay(d)} at ${sayTime(d)}` : sayDay(d); };

function sayDuration(p) {
  const parts = [["hour", p.hours + 24 * (p.days + 7 * p.weeks)], ["minute", p.minutes], ["second", p.seconds]]
    .filter(([, n]) => n).map(([u, n]) => `${n} ${u}${n === 1 ? "" : "s"}`);
  return parts.join(" and ") || null;
}

// the one entity that covers the whole text, if any
function whole(text, now) {
  const t = text.trim();
  const found = E.parse(t, { now }).filter(e => e.start === 0 && e.end === t.length);
  return found[0] || null;
}

const KINDS = {
  "a duration": (text) => {
    const p = E.parseDuration(text);
    const said = p && sayDuration(p);
    return said && /\d|one|two|three|four|five|six|seven|eight|nine|ten|twenty|thirty|forty|fifty|sixty|half|an? /i.test(text)
      ? { said, seconds: ((p.days + 7 * p.weeks) * 24 * 3600) + p.hours * 3600 + p.minutes * 60 + p.seconds } : null;
  },
  "a date and time": (text, now) => {
    const e = whole(text, now);
    if (!e || (e.type !== "datetime" && e.type !== "date")) return null;
    const iso = e.type === "date" ? e.value + "T09:00" : e.value; // a day without a time: 9:00
    return { said: sayAt(iso), iso, ambiguous: !!e.ambiguous, alternatives: (e.alternatives || []).map(a => ({ iso: a, said: sayAt(a) })) };
  },
  "a date": (text, now) => {
    const e = whole(text, now);
    return e && e.type === "date" ? { said: sayDay(new Date(e.value)), iso: e.value } : null;
  },
  "a name": text => (text.split(/\s+/).length <= 3 ? { said: text.replace(/^\p{Ll}/u, c => c.toUpperCase()) } : null),
  "a place": text => (text.split(/\s+/).length <= 4 ? { said: text.replace(/(^|\s)\p{Ll}/gu, c => c.toUpperCase()) } : null),
  "some text": text => (text.trim() ? { said: text.trim() } : null),
};

// "a duration" → reader; "one of: low, medium, high" → a reader for that list
function reader(kind) {
  const list = kind.match(/^one of:\s*(.+)$/);
  if (list) {
    const items = list[1].split(/\s*,\s*/).map(s => s.toLowerCase());
    return text => (items.includes(text.toLowerCase()) ? { said: text.toLowerCase() } : null);
  }
  if (!KINDS[kind]) throw new Error(`unknown kind of value: "${kind}"`);
  return KINDS[kind];
}

// values of a kind found anywhere in a sentence, for when no pattern read it: dates and durations only,
// as their shape gives them away; a name or a text can't be told from the words around it
function findIn(kind, sentence, now) {
  if (kind === "a duration") {
    for (const e of E.parse(sentence, { now })) if (e.type === "duration") { const v = KINDS[kind](e.text); if (v) return { text: e.text, ...v }; }
  }
  if (kind === "a date and time" || kind === "a date") {
    for (const e of E.parse(sentence, { now })) { const v = KINDS[kind](e.text, now); if (v) return { text: e.text, ...v }; }
  }
  const list = kind.match(/^one of:\s*(.+)$/);
  if (list) for (const w of sentence.toLowerCase().split(/[^\p{L}\p{N}]+/u)) { const v = reader(kind)(w); if (v) return { text: w, ...v }; }
  return null;
}

// sample values of each kind: to write example sentences (the model's training, the "try saying" chips)
const SAMPLES = {
  "a duration": ["10 minutes", "an hour", "five minutes", "30 seconds", "2 hours", "twenty minutes"],
  "a date and time": ["tomorrow at 9", "next friday at 3pm", "tonight", "in two hours", "on monday", "at 6pm"],
  "a date": ["tomorrow", "next friday", "monday"],
  "a name": ["Gab", "Eva", "Sam"], "a place": ["Munich", "Paris", "Kyoto"],
  "some text": ["call mum", "buy milk", "water the plants"],
};
function samplesFor(skill) {
  const out = {};
  for (const [slot, need] of Object.entries(skill.needs)) {
    const list = need.kind.match(/^one of:\s*(.+)$/);
    out[slot] = skill.samples[slot] || (list ? list[1].split(/\s*,\s*/) : SAMPLES[need.kind]);
  }
  return out;
}

if (typeof module !== "undefined") module.exports = { reader, findIn, sayDay, sayTime, samplesFor };
