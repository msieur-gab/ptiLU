// Does a reply hold what the question asks for? The answer-type check of question-answering systems since
// TREC (2001): "who", "how many", "when" tell the answer's type (a person, a number, a date), a passage that
// holds nothing of that type can't be the answer, and the value must sit by what was asked: "this number
// must quantify the dogs harnessed" (Pasca & Harabagiu, 2001). Similarity can't tell "on the topic" from
// "answers it" (relevance-trained scores, cross-encoders included, separate them no better than cosine);
// this reads the one thing that tells them apart. Rules only: no model.
const NUMBER = /\b\d[\d.,]*\s*(%|k\b|m\b|x\b)?|\b(one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|thirteen|fourteen|fifteen|sixteen|seventeen|eighteen|nineteen|twenty|thirty|forty|fifty|sixty|seventy|eighty|ninety|hundred|hundreds|thousand|thousands|million|millions|dozen|dozens|half|twice|none|zero)\b/i;
const MONEY = /[€$£¥]\s?\d|\d\s?(€|eur\b|euros?\b|dollars?\b|usd\b|chf\b|k€)|\bfree of charge\b|\bfor free\b|\bcosts? nothing\b/i;
const DATE = /\b(1[89]|20)\d\d\b|\b(january|february|march|april|may|june|july|august|september|october|november|december|spring|summer|autumn|winter|q[1-4])\b|\b(today|yesterday|tomorrow|this year|last year|next year|this month|next month)\b/i;
// a name: a word with a capital that doesn't start its clause ("built with Sven Martinov", "inside Allianz")
const NAME = /(?<=\S\s+)\p{Lu}\p{Ll}[\p{L}-]*/u;
const WORDS = { number: NUMBER, money: new RegExp(`${MONEY.source}|${NUMBER.source}`, "i"), date: DATE, name: NAME };

// what a question asks for, or null when it isn't asking for a value ("how do we…", "why…", "what is…")
function wants(question) {
  const q = question.toLowerCase().trim();
  if (/^who('s|\b)|\b(which|what) (companies|company|clients|client|customers|organisations|organizations|brands|partners|investors|people|teams)\b/.test(q)) return "name";
  if (/^(when|since when|until when|by when)\b|\b(what|which) (year|date|day|month)\b/.test(q)) return "date";
  if (/\b(how much|how expensive)\b|\b(price|prices|cost|costs|fee|fees|budget|salary|rate|rates|charge)\b/.test(q) && !/^how (do|does|did|can|could|should|would|to)\b/.test(q)) return "money";
  if (/\b(how many|how often|how long|how big|how large|how fast|how old|number of|percentage of|share of)\b/.test(q)) return "number";
  return null;
}

// a value of that type in a piece of text
const hasType = (type, text) => WORDS[type].test(text);
// a sentence split where a value and what it counts stop belonging together ("Creator — 2026 — solo")
const clauses = text => text.split(/(?<=[.!?;])\s+|\s+[—–|]\s+|\n+/).filter(Boolean);

if (typeof module !== "undefined") module.exports = { wants, hasType, clauses };
