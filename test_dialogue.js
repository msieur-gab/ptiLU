// node test_dialogue.js          : replay the conversations, fail if any reply differs from tests/dialogue.expected.txt
// node test_dialogue.js --update : accept the current replies as the new expected transcript
// node test_dialogue.js -v       : print the transcript (with confidences)
// Scripted conversations through the real model + agent, clock fixed at Mon 12 Oct 2026 20:14
const fs = require("fs");
const R = require("./web/runtime.js");
const { Agent } = require("./web/agent.js");
const nlu = new R.NLU(JSON.parse(fs.readFileSync("models/model.json", "utf8")));
const { mockFetch } = require("./tests/fixtures.js");
const store = { d: {}, getItem(k) { return k in this.d ? this.d[k] : null; }, setItem(k, v) { this.d[k] = String(v); }, removeItem(k) { delete this.d[k]; } };
const NOW = new Date(2026, 9, 12, 20, 14);
const agent = new Agent(nlu, store);
agent.clock = () => NOW;
agent.fetch = mockFetch(NOW);
Math.random = () => 0; // first response variant, so the output is stable

const CONVERSATIONS = [
  ["what time is it"],
  ["what's the time in tokyo?"],
  ["what's the date"],
  ["what day is next friday"],
  ["what date is christmas"],
  ["how many days until december 24"],
  ["what day is the 14th"],
  ["is it friday yet"],
  ["what year is it"],
  ["set a timer for 10 minutes"],
  ["timer 1h30"],
  ["start a timer", "25 minutes"],
  ["set a timer for 3pm"],
  ["remind me to call mum next friday at 3pm", "the 16th"],
  ["remind me to call mum next friday at 3pm", "next one"],
  ["remind me to buy milk tomorrow at 9", "morning"],
  ["remind me to water the plants in 2 days"],
  ["remind me in an hour"],
  ["remind me to send the invoice", "next week", "wednesday at 10am"],
  ["remind me to take the bread out tonight at 8", "yes"],
  ["remind me to stretch every weekday at 3pm"],
  ["remind me to back up the photos every monday at 9", "morning"],
  ["set a reminder", "never mind"],
  ["set an alarm for 7am"],
  ["what's on my calendar tomorrow"],
  ["make a folder called Monday in Schedule"],
  ["open firefox"],
  ["launch the thing"],
  ["open an app", "calculator"],
  // memory + API skills (network answers are recorded, see tests/fixtures.js)
  ["what's the weather like", "Munich"],
  ["what do you know about me"],
  ["hi, my name is Gab"],
  ["I live in Munich"],
  ["hello"],
  ["what do you know about me"],
  ["what's the weather like"],
  ["will it rain tomorrow?"],
  ["weather in Lisbon this weekend"],
  ["what's the weather in Tokyo on friday"],
  ["weather in Atlantis"],
  ["what time is it in tokyo"],
  ["what time is it in New York"],
  ["what time is it"],
  ["weather in 3 weeks"],
  ["forget where I live"],
  ["where do I live"],
  ["forget everything about me"],
  ["what's my name"],
  // several commands in one sentence
  ["i live in munich and my name is gab"],
  ["open the terminal and set a timer for 10 minutes"],
  ["open the terminal and the browser"],
  ["set a timer and open firefox", "10 minutes"],
  ["set a timer and open firefox", "cancel"],
  ["create a folder called reports and open the browser"],
  ["make a folder called salt and pepper"],
  // the rest of the original skills
  ["shut down", "yes"],
  ["restart the pi", "no"],
  ["power", "sleep", "yes"],
  ["turn the volume up"],
  ["volume to 30%"],
  ["it's too loud"],
  ["mute"],
  ["unmute"],
  ["change the volume", "up"],
  ["brightness 40%"],
  ["make the screen darker"],
  ["dim the screen"],
  ["is the pi overheating?"],
  ["how's the system doing"],
  ["how much disk space is left"],
  ["help"],
  ["hello"],
  ["thanks"],
  ["yes"],
  ["no"],
  ["create a folder"],
  ["make a folder", "drafts in documents"],
  // a folder the device doesn't know: a close one is offered, an unknown one is asked about once
  ["create a new folder named Testing inside the Document folder", "yes"],
  ["create a new folder named Testing inside the Documnets folder", "no"],
  ["make a folder called Monday in Schedule", "yes", "make a folder called Tuesday in Schedule"],
  ["move report.txt to the dowloads", "yes"],
  ["create a note inside document", "test", "yes"], // the folder isn't lost while the name is asked for
  ["create a python file called main"],
  ["new file called notes"],
  ["touch todo.txt"],
  ["open budget.csv"],
  ["open the notes file in documents"],
  ["open the documents folder"],
  ["open a file"],
  ["delete the reports folder"],
  ["what's the date"],
  ["what day is next friday"],
  ["how many days until december 24"],
  // pushing data: a POST declared in skill.md, a secret asked once and kept on the device
  ["send buy milk to my phone", "gab-workshop-7f3"],
  ["ping my phone saying the glue is dry"],
  ["send something to my phone", "check the oven"],
  ["send me a message", "I love Cookie 🍪"],
  // direct calls declared in action.md: Telegram (two secrets), the map (a required answer field)
  ["telegram me the glue is dry", "123:ABC", "48151623"],
  ["send call the bank back on telegram"],
  ["show me Kyoto on the map"],
  ["where is Atlantis on the map"],
  ["show me the map"],
  // replayed from the phone, 13 October: another skill clearly asked for while a question waits,
  // a sentence where a key is expected, an answer with a lead-in
  ["send me a message", "send me telegram messages", "the bus is late"],
  ["telegram me", "please send it to my phone instead", "the oven is hot"],
  ["where is kyoto"],
];
const KEEP_MEMORY = true; // memory persists across these conversations on purpose (like the phone)
const UPDATE = process.argv.includes("--update"), VERBOSE = process.argv.includes("-v");
const EXPECTED = "tests/dialogue.expected.txt";
(async () => {
const lines = [];  // what is compared: intent, slots, dates, reply, command (not confidences, which move with every retrain)
for (const conv of CONVERSATIONS) {
  agent.reset();
  for (const t of conv) {
    const out = agent.handle(t);
    if (out.later) { const res = await out.later; out.reply = out.reply + "\n  → " + res.reply.replace(/\n/g, "\n    "); if (res.trace) out.trace.push(...res.trace); }
    const r = out.trace[0].r;
    const ent = out.trace.find(x => x.type === "entity");
    const exec = out.trace.filter(x => x.type === "exec").map(x => x.text).join(" | ");
    const tag = `${Object.keys(r.slots).length ? " " + JSON.stringify(r.slots) : ""}${ent ? " · " + ent.e.type + " " + (ent.e.value || ent.e.rrule) : ""}`;
    const rest = `]\n  ${out.reply}${exec ? "\n  $ " + exec : ""}`;
    lines.push(`> ${t}\n  [${r.intent}${tag}${rest}`);
    if (VERBOSE) console.log(`> ${t}\n  [${r.intent} ${r.confidence.toFixed(2)}${tag}${rest}`);
  }
  lines.push("");
  if (VERBOSE) console.log();
}
const got = lines.join("\n") + "\n";
if (UPDATE || !fs.existsSync(EXPECTED)) { fs.writeFileSync(EXPECTED, got); return console.log(`${EXPECTED} written (${CONVERSATIONS.length} conversations)`); }
const want = fs.readFileSync(EXPECTED, "utf8");
if (got === want) return console.log(`${CONVERSATIONS.length}/${CONVERSATIONS.length} conversations as expected`);
// show each turn that changed
const turns = x => x.split(/\n(?=> )/);
const a = turns(want), b = turns(got);
let shown = 0;
for (let i = 0; i < Math.max(a.length, b.length) && shown < 10; i++)
  if (a[i] !== b[i]) { shown++; console.log("--- expected\n" + (a[i] || "").trim() + "\n+++ got\n" + (b[i] || "").trim() + "\n"); }
console.log("Dialogue changed. If the new replies are right: node test_dialogue.js --update");
process.exit(1);
})();
