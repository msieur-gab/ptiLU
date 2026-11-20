// Reading the packs. `fromFiles` takes the files as text and works anywhere (the page gets them built in);
// `load` reads them from disk (Node).
//   packs/conversation.md          yes, no, fillers, small words, follow-ups, the engine's own replies
//   packs/<pack>/pack.md           `kind: skills` or `kind: content`, and for content the files it reads
//   packs/<pack>/skills/<x>/       skill.md (+ tests.md, sentences never trained on)
//   packs/<pack>/out-of-scope.md   what this pack should not try to do
//   packs/<pack>/content/*.md      written content

const F = typeof EngineFiles !== "undefined" ? EngineFiles : require("./files.js");
const T = typeof EngineText !== "undefined" ? EngineText : require("./text.js");
const { readSkill } = typeof EngineSkills !== "undefined" ? EngineSkills : require("./skills.js");

const list = lines => lines.flatMap(l => l.split(/\s*,\s*/)).map(w => T.words(w).join(" ")).filter(Boolean);

function conversation(md) {
  const s = F.sections(F.frontMatter(md).body);
  const get = k => list((s[k] || { lines: [] }).lines);
  return {
    yes: get("yes"), no: get("no"), fillers: get("fillers").sort((a, b) => b.length - a.length),
    small: new Set(get("small words").flatMap(w => w.split(" "))), "follow-up": get("follow-up").sort((a, b) => b.length - a.length),
    more: get("more"), questions: get("question words"), chips: (s["chips"] || { lines: [] }).lines,
    replies: F.keyed((s["replies"] || { lines: [] }).lines),
  };
}

// files: { "conversation.md", packs: { <pack>: { "pack.md", "out-of-scope.md", skills: { <name>: { "skill.md", "tests.md" } },
//          docs: [{ id, md }] } } }
function fromFiles(files) {
  const talk = conversation(files["conversation.md"]);
  const skills = [], docs = [], outOfScope = [], asks = [], topics = [];
  for (const [pack, p] of Object.entries(files.packs)) {
    const { meta, body } = F.frontMatter(p["pack.md"]);
    if (p["out-of-scope.md"]) outOfScope.push(...Object.values(F.sections(p["out-of-scope.md"])).flatMap(x => x.lines));
    if (meta.kind === "content") {
      if (meta.about) topics.push(meta.about);
      docs.push(...p.docs);
      asks.push(...(F.sections(body)["also said"] || { lines: [] }).lines);
      continue;
    }
    for (const [name, f] of Object.entries(p.skills || {})) {
      const skill = readSkill(name, f["skill.md"], pack);
      if (f["tests.md"]) skill.tests = Object.values(F.sections(f["tests.md"])).flatMap(x => x.lines);
      skills.push(skill);
    }
  }
  return { talk, skills, docs, outOfScope, asks, topics };
}

// Node: the files from engine/packs, and the content files a pack lists from the repository
function files(dir) {
  const fs = require("fs"), path = require("path");
  dir = dir || path.join(__dirname, "packs");
  const root = path.join(__dirname, ".."), read = f => fs.readFileSync(f, "utf8"), has = f => fs.existsSync(f);
  const out = { "conversation.md": read(path.join(dir, "conversation.md")), packs: {} };
  for (const pack of fs.readdirSync(dir).filter(d => has(path.join(dir, d, "pack.md"))).sort()) {
    const pdir = path.join(dir, pack), p = out.packs[pack] = { "pack.md": read(path.join(pdir, "pack.md")), skills: {}, docs: [] };
    if (has(path.join(pdir, "out-of-scope.md"))) p["out-of-scope.md"] = read(path.join(pdir, "out-of-scope.md"));
    const { meta } = F.frontMatter(p["pack.md"]);
    for (const f of meta.files || []) p.docs.push({ id: path.basename(f, ".md").toLowerCase(), md: read(path.resolve(root, f)) });
    const cdir = path.join(pdir, "content");
    if (has(cdir)) for (const f of fs.readdirSync(cdir).filter(f => f.endsWith(".md")).sort()) p.docs.push({ id: path.basename(f, ".md"), md: read(path.join(cdir, f)) });
    const sdir = path.join(pdir, "skills");
    if (has(sdir)) for (const name of fs.readdirSync(sdir).sort()) {
      if (!has(path.join(sdir, name, "skill.md"))) continue;
      p.skills[name] = { "skill.md": read(path.join(sdir, name, "skill.md")) };
      if (has(path.join(sdir, name, "tests.md"))) p.skills[name]["tests.md"] = read(path.join(sdir, name, "tests.md"));
    }
  }
  return out;
}

const load = dir => fromFiles(files(dir));

if (typeof module !== "undefined") module.exports = { load, files, fromFiles, conversation };
