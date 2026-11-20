// An engine from the packs on disk and the trained model (Node: the tests and the terminal chat).
const fs = require("fs");
const path = require("path");
const { load } = require("./load.js");
const { Engine } = require("./engine.js");
const { Content } = require("./content.js");
const R = require("../web/runtime.js");

function make({ now, random = () => 0, memory = {} } = {}) {
  const packs = load();
  const file = path.join(__dirname, "model.json");
  const model = fs.existsSync(file) ? new R.NLU(JSON.parse(fs.readFileSync(file, "utf8"))) : null;
  const content = packs.docs.length ? new Content(packs.docs, packs.talk.small, packs.topics) : null;
  return new Engine({ skills: packs.skills, content, talk: packs.talk, model, memory, random, now: now || (() => new Date()) });
}

module.exports = { make };
