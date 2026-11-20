// Reading the Markdown files a pack is made of: front matter, sections, bullet lines.
// No knowledge of what a skill is; skills.js and content.js give the sections their meaning.

function frontMatter(md) {
  const m = md.match(/^---\n([\s\S]*?)\n---\n?/);
  if (!m) return { meta: {}, body: md };
  const meta = {};
  let list = null;
  for (const raw of m[1].split("\n")) {
    const line = raw.replace(/\s+#.*$/, "");
    const item = line.match(/^\s*-\s+(.*)$/);
    if (item && list) { meta[list].push(item[1].trim()); continue; }
    const kv = line.match(/^([\w-]+):\s*(.*)$/);
    if (!kv) continue;
    if (kv[2] === "") { list = kv[1]; meta[list] = []; } else { list = null; meta[kv[1]] = kv[2].trim(); }
  }
  return { meta, body: md.slice(m[0].length) };
}

// "## People say" → { "people say": { text, lines } }; lines are the bullets, without "- "
function sections(body) {
  const out = { "": { text: "", lines: [] } };
  let cur = out[""];
  for (const line of body.split("\n")) {
    const h = line.match(/^##\s+(.+?)\s*$/);
    if (h) { cur = out[h[1].toLowerCase()] = { title: h[1], text: "", lines: [] }; continue; }
    cur.text += line + "\n";
    const b = line.match(/^\s*-\s+(.*\S)\s*$/);
    if (b) cur.lines.push(b[1]);
  }
  return out;
}

// "- done: Timer set. | OK." → { done: ["Timer set.", "OK."] }
function keyed(lines) {
  const out = {};
  for (const l of lines) {
    const m = l.match(/^([\w -]+?):\s+(.*)$/);
    if (m) out[m[1].trim()] = m[2].split(/\s+\|\s+/);
  }
  return out;
}

if (typeof module !== "undefined") module.exports = { frontMatter, sections, keyed };
