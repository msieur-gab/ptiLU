// node agent/test.js: conversations that must go the same way every time. By words (no MiniLM), so it
// runs anywhere in a second; the meaning is measured by agent/meaning/measure.mjs.
const { load } = require("./load.js");
const fresh = (mode = "site") => load({ meaning: false, mode, random: () => 0, now: () => new Date("2026-11-20T10:00:00") });
let fails = 0, n = 0;
function script(name, steps, mode) {
  const a = fresh(mode);
  for (const [say, check] of steps) {
    n++;
    const r = a.respond(say), got = check(r, a);
    if (got !== true) { fails++; console.log(`✗ ${name}: "${say}" → [${r.outcome}] ${r.say.slice(0, 80)} · ${r.why}${typeof got === "string" ? ` (${got})` : ""}`); }
  }
}
const is = (k, v) => r => r[k] === v || `${k} is ${r[k]}`;
script("hello and the time", [["hi", is("skill", "greet")], ["what time is it", r => r.say === "It's 10:00." || r.say]]);
script("a timer asks for its value", [["set a timer", is("outcome", "ask")], ["10 minutes", is("command", "timer.start 600")]]);
script("a duration is read whole", [["how much is a day of your time", r => r.skill !== "set-timer" || "timer"]]);
script("a project by name, then its parts", [
  ["tell me about Senz", r => (r.cards && r.cards[0].title === "Senz") || "no card"],
  ["Overview", is("part", "Overview")],
  ["tell me more", r => r.project === "senz" || "left senz"],
]);
script("a question inside the project", [["Pebbble", is("project", "pebbble")], ["why voice and not text messages", r => r.project === "pebbble" || r.why]]);
script("yes with nothing asked", [["yes", is("why", "nothing was asked")]]);
script("who I am, by pattern", [["where are you based", is("skill", "who-i-am")]]);
script("far from everything: no invitation form", [["qwerty zxcv", r => r.outcome === "abstain" && !r.command || "not plain"]]);
script("a contact question opens the form", [["what are your rates", is("command", "form.open")]]);
script("do you mean: yes teaches, on your own device", [
  ["what is your day rate", r => r.outcome === "act" || r.outcome === "ask" || r.outcome],
], "own");
{ // teaching: one sentence, then the same sentence is answered by that skill; the file gets the line
  const a = fresh("own"); n++;
  const r1 = a.teach("how many hours a week can you give us", "work-together");
  a.reset();
  const r2 = a.respond("how many hours a week can you give us");
  if (!r1.ok || r2.skill !== "work-together" || !/## Learned\n- how many hours a week can you give us \(2026-11-20\)/.test(r1.md)) { fails++; console.log("✗ teaching", r1, r2.why); }
}
script("a skill leading to two projects shows both", [["Can digital play happen without a screen?", r => (r.cards && r.cards.length === 2) || `${(r.cards || []).length} cards`], ["Pebbble", is("project", "pebbble")]]);
{ // "that's not it" puts the sentence in the inbox
  const a = fresh(); n++;
  const r = a.respond("where are you based"); a.wrong(r);
  if (!a.inbox.length || !a.inbox[0].not.includes("who-i-am")) { fails++; console.log("✗ that's not it"); }
}
console.log(`${n - fails} of ${n} checks pass`);
process.exit(fails ? 1 : 0);
