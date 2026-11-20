// Words, as the engine reads them: any alphabet, file names kept whole ("seed.md"), the original
// spelling kept beside the lowercase so values come back as they were typed ("Gab", "Kraków").

const WORD = /[\p{L}\p{N}](?:[\p{L}\p{N}'’._:-]*[\p{L}\p{N}])?/gu;

function tokens(text) {
  return [...String(text).matchAll(WORD)].map(m => ({ w: m[0].toLowerCase().replace(/’/g, "'"), o: m[0] }));
}

const words = text => tokens(text).map(t => t.w);
const join = toks => toks.map(t => t.o).join(" ");
const pick = (variants, random = Math.random) => variants[Math.floor(random() * variants.length) % variants.length];

// "{duration}" in a reply → the value as it is said
function fill(template, values) {
  return template.replace(/\{([@\w.]+)\}/g, (all, k) => (values[k] !== undefined && values[k] !== null ? values[k] : all));
}

// one letter apart (insert, delete, substitute, swap): "timr" → "timer"
function close(a, b) {
  if (a === b) return true;
  if (Math.abs(a.length - b.length) > 1 || Math.min(a.length, b.length) < 4) return false;
  let i = 0;
  while (i < a.length && a[i] === b[i]) i++;
  const ra = a.slice(i + 1), rb = b.slice(i + 1);
  return ra === b.slice(i) || a.slice(i) === rb || ra === rb || (a[i] === b[i + 1] && a[i + 1] === b[i] && a.slice(i + 2) === b.slice(i + 2));
}

if (typeof module !== "undefined") module.exports = { tokens, words, join, pick, fill, close };
