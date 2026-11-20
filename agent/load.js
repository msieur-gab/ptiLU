// The packs, read. `fromFiles` takes the files as text (the page has them built in); `load` reads the
// folder (Node).
//   packs/conversation.md     yes, no, fillers, small words, "tell me more", the agent's own replies
//   packs/skills/<name>.md    one file per kind of question or request (see skills.js)
//   packs/projects/<id>.md    the projects, plain Markdown

const F = require("./files.js");
const T = require("./text.js");
const { readSkill } = require("./skills.js");
const { Projects } = require("./projects.js");
const { Router } = require("./router.js");
const { Agent } = require("./agent.js");

const list = lines => lines.flatMap(l => l.split(/\s*,\s*/)).map(w => T.words(w).join(" ")).filter(Boolean);

function conversation(md) {
  const s = F.sections(F.frontMatter(md).body);
  const get = k => list((s[k] || { lines: [] }).lines);
  return {
    yes: get("yes"), no: get("no"), fillers: get("fillers").sort((a, b) => b.length - a.length),
    small: new Set(get("small words").flatMap(w => w.split(" "))), more: get("more"),
    replies: F.keyed((s["replies"] || { lines: [] }).lines),
  };
}

// files: { "conversation.md": md, skills: { name: md }, projects: { id: md } }
function fromFiles(files, opts = {}) {
  const talk = conversation(files["conversation.md"]);
  const skills = Object.entries(files.skills).map(([name, md]) => readSkill(name, md));
  if (skills.filter(s => s.fallback).length > 1) throw new Error("more than one skill says `fallback: yes`");
  const projects = new Projects(Object.entries(files.projects).map(([id, md]) => ({ id, md })), talk.small);
  for (const s of skills) for (const id of s.leads) if (!projects.byId.has(id)) throw new Error(`skills/${s.name}.md leads to "${id}": no projects/${id}.md`);
  const router = new Router(skills, talk.small);
  return new Agent({ skills, projects, talk, router, ...opts });
}

function files(dir = require("path").join(__dirname, "packs")) {
  const fs = require("fs"), path = require("path");
  const md = sub => Object.fromEntries(fs.readdirSync(path.join(dir, sub)).filter(f => f.endsWith(".md")).sort()
    .map(f => [f.slice(0, -3), fs.readFileSync(path.join(dir, sub, f), "utf8")]));
  return { "conversation.md": fs.readFileSync(path.join(dir, "conversation.md"), "utf8"), skills: md("skills"), projects: md("projects") };
}

// Node: the agent from the folder, with the meaning vectors if they were built
function load(opts = {}) {
  const fs = require("fs"), path = require("path");
  const agent = fromFiles(files(), opts);
  const m = path.join(__dirname, "meaning.json");
  if (opts.meaning !== false && fs.existsSync(m)) agent.router.setVectors(require("./router.js").decode(JSON.parse(fs.readFileSync(m, "utf8"))));
  return agent;
}

if (typeof module !== "undefined") module.exports = { fromFiles, files, load, conversation };
