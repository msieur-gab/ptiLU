// node agent/build.js: the agent, its packs and its meaning vectors in one page, docs/agent/index.html
// (GitHub Pages serves docs/; the MiniLM worker and model sit beside it in docs/agent/meaning/).
const fs = require("fs");
const path = require("path");
const { files } = require("./load.js");

const here = f => fs.readFileSync(path.join(__dirname, f), "utf8");
const MODS = ["text.js", "files.js", "entities.js", "patterns.js", "kinds.js", "skills.js", "projects.js", "router.js", "agent.js", "load.js"];
// each module as in Node: its own `module`, and `require` for the others
const mods = `const __mods = {\n${MODS.map(f => `"./${f}": (module, require) => {\n${here(f)}\n}`).join(",\n")}\n};
const __done = {};
function require(p) { if (!__done[p]) { const module = { exports: {} }; __done[p] = module; __mods[p](module, require); } return __done[p].exports; }`;
const built = new Date().toISOString().slice(0, 16).replace("T", " ") + " UTC";
const meaning = fs.existsSync(path.join(__dirname, "meaning.json")) ? here("meaning.json") : "null"; // node agent/meaning/embed.mjs
const data = `const BUILT = "${built}";\nconst FILES = ${JSON.stringify(files())};\nconst MEANING = ${meaning};`;
// the look is main's page, read from its template (web/template.html): one design system, not a copy
const style = here("../web/template.html").match(/<style>([\s\S]*?)<\/style>/)[1];
const page = here("page.html").replace("/*STYLE*/", () => style).replace("/*SCRIPTS*/", () => [mods, data].join("\n").replace(/<\/script/g, "<\\/script"));
fs.mkdirSync(path.join(__dirname, "../docs/agent"), { recursive: true });
fs.writeFileSync(path.join(__dirname, "../docs/agent/index.html"), page);
console.log(`docs/agent/index.html: ${(page.length / 1024).toFixed(0)} KB`);
