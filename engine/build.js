// node engine/build.js: the engine, its packs and its model in one page, engine/index.html, offline.
const fs = require("fs");
const path = require("path");
const { files } = require("./load.js");

const here = f => fs.readFileSync(path.join(__dirname, f), "utf8");
const raw = ["../web/runtime.js", "../web/entities.js", "../web/trainer.js"].map(here).join("\n");
const mods = [["EngineText", "text.js"], ["EngineFiles", "files.js"], ["EnginePatterns", "patterns.js"], ["EngineKinds", "kinds.js"],
  ["EngineSkills", "skills.js"], ["EngineContent", "content.js"], ["EngineLoad", "load.js"], ["EngineCore", "engine.js"],
  ["EngineLearn", "learn.js"], ["EngineTrain", "train.js"]]
  .map(([name, f]) => `const ${name} = (() => { const module = { exports: {} };\n${here(f)}\nreturn module.exports; })();`).join("\n");
const data = `const FILES = ${JSON.stringify(files())};\nconst MODEL = ${here("model.json")};`;
const page = here("page.html").replace("/*SCRIPTS*/", () => [raw, mods, data].join("\n").replace(/<\/script/g, "<\\/script"));
// engine/index.html to open from the branch; docs/engine/index.html for GitHub Pages (Pages serves docs/)
fs.writeFileSync(path.join(__dirname, "index.html"), page);
fs.mkdirSync(path.join(__dirname, "../docs/engine"), { recursive: true });
fs.writeFileSync(path.join(__dirname, "../docs/engine/index.html"), page);
console.log(`engine/index.html and docs/engine/index.html: ${(page.length / 1024).toFixed(0)} KB`);
