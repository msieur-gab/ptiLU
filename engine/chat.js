// node engine/chat.js: talk to the engine in the terminal. Each reply shows its outcome and why.
//   /inbox                       what it couldn't do
//   /teach <skill> [slot=words…] teach the last sentence it couldn't do, e.g. /teach set-timer duration=10 minutes
const readline = require("readline");
const { make } = require("./make.js");
const { teach } = require("./learn.js");

const engine = make({ random: Math.random });
const rl = readline.createInterface({ input: process.stdin, output: process.stdout, prompt: "you> " });
rl.prompt();
rl.on("line", line => {
  line = line.trim();
  if (line === "/inbox") console.log(engine.inbox.map(e => `  ${e.sentence}  (${e.why})`).join("\n") || "  empty");
  else if (line.startsWith("/teach ")) {
    const [, skill, ...rest] = line.split(/\s+/);
    const marks = {};
    for (const m of rest.join(" ").matchAll(/(\w+)=([^=]+?)(?=\s+\w+=|$)/g)) marks[m[1]] = m[2];
    const last = engine.inbox[engine.inbox.length - 1];
    if (!last) console.log("  the inbox is empty");
    else { const r = teach(engine, last.sentence, skill, marks); console.log(r.ok ? `  learned: ${r.line}` : `  not learned: ${r.why}`); }
  } else if (line) {
    const r = engine.respond(line);
    console.log(`ptilu> ${r.say}`);
    console.log(`       [${r.outcome}] ${r.why || ""}${r.command ? `  → ${r.command}` : ""}${r.source ? `  (from ${r.source})` : ""}` +
      (r.chips && r.chips.length ? `\n       chips: ${r.chips.join(" · ")}` : ""));
  }
  rl.prompt();
});
