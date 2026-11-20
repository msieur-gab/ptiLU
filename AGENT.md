# ptiLU agent

A small agent over Markdown files, with no language model writing anything. Skills are kinds of question
(and a few requests). MiniLM routes a sentence to the nearest skill. The skill answers in the owner's
words and leads to projects. Follow-ups move through those projects. When it isn't sure, it asks
"Do you mean…?", and a yes teaches it.

Branch `ptilu-agent`, started 20 November 2026 from what the `engine` branch had that worked. The engine
and its log (ENGINE.md) stay on the `engine` and `engine-site` branches.

## How a sentence goes

1. **A chip it was just offered**: a project, a part of it, "Tell me more", a skill, a "Do you mean" option.
2. **A question waiting**: yes or no to "Do you mean…?", or a value it asked for ("For how long?").
3. **The open project**: "tell me more", or one of its parts by name.
4. **Exactly**: a project named ("tell me about Senz"), or a skill's "People say" pattern.
5. **By meaning**:
   - **Sure** (nearest example ≥ 0.525, at least 0.08 ahead of the next skill): the skill answers. A skill
     that does something (a timer) still asks first.
   - **Inside a project**: its own paragraphs are looked at next.
   - **A project detail asked cold**: the paragraph that has most of its words, under that project's card.
   - **Less sure** (≥ 0.45): "Do you mean: …?", with the one or two nearest skills.
   - **Nearer than 0.3 but not 0.45**: the invitation (the contact form, with the question in it).
   - **Further than 0.3**: "That's outside what I work on", with "Write to me".

Without the model (still loading, or not built), skills are found by words, with their own bars.

## Teaching

- **A yes to "Do you mean…?"** makes the sentence an example of that skill. On your own device it counts
  at once (`mode: "own"`, the test page). On a public site it waits in the inbox for you to approve.
- **"No"**, **"That's not it"** under an answer, and anything it couldn't answer go to the inbox.
- **In the inbox**, one tap on the right skill teaches it. Teaching adds an example sentence: nothing is
  trained, nothing is retrained.
- **The page shows the lines to paste** under `## Learned` in each skill file, to keep them for everyone.

## Files

- `agent/packs/conversation.md`: yes, no, fillers, small words, "tell me more", the agent's replies, and
  `contact:` (the contact form's address, empty for now).
- `agent/packs/skills/*.md`, one per skill:
  - **10 question skills**: sections A–J of my-agent's `docs/questions.md`. Their questions are the
    examples, and each leads to the projects named as candidates there. None has a written answer yet:
    write yours under `## Answer`. Until then, the reply introduces the first project and its card.
    Section K (curiosity) was left out: it isn't one kind of question.
  - **About you** (who I am, what I do, how this page works), **contact** (working together, work I
    haven't done; the second is where unanswered questions fall), **time, date and timer**, and
    **hello, thanks and help**.
- `agent/packs/projects/*.md`: the five projects and the talk. They are plain: their `questions:`,
  `answers:` and `keywords:` were removed. Cards use their front matter (question, answer, where, year);
  follow-ups use their `##` headings.

Code, 561 lines for the core:
- `agent.js`: the conversation.
- `router.js`: nearest examples, by meaning or words.
- `projects.js`: cards, parts, paragraph search.
- `skills.js`: the skill file format.
- `load.js`.

Kept unchanged from the engine: `text.js`, `files.js`, `patterns.js` and `kinds.js`, plus `entities.js`
from main. Dropped:
- the TF-IDF classifier and its training;
- the CRF tagger;
- listed questions in content files and the taught-words check;
- memory skills and reminders;
- the out-of-scope lists.

## Measured (`node agent/meaning/measure.mjs`)

On sentences it was never given, from my-agent's `tests/held-out.json` and `docs/questions.md` section L
(the L destinations were chosen by Claude):

| set | right | wrong | "Do you mean", right one offered | "Do you mean", not offered | invitation |
|---|---|---|---|---|---|
| a project expected (56) | 35 | 1 | 4 | 2 | 14 |
| off-topic (25) | 21 | 0 | — | 4 | — |
| requests (10) | 7 | 0 | — | 3 | — |
| questions about Gab (44) | 19 | 3 | 12 | 5 | 5 |

The engine, for comparison, on its own teaching experiment: about 15 wrong answers in 83. Its bars had
been tuned on held-out.json; these weren't (`bars.mjs` chooses them on the skills' own examples, each
asked with itself left out).

Teaching, measured as on the engine: half of 110 sentences taught, the other half only tested, 5 splits.

| taught | right (of 55) |
|---|---|
| 0 | 31.0 |
| 26, every miss, by you | 29.8 |
| 7, visitors' yes only | 31.2 |

Still flat. A taught sentence is answered right from then on, but these test sentences don't resemble
each other enough for one to help another. Whether real visitors repeat themselves is what the inbox will
show.

## Run

```
node agent/test.js                  # conversations that must always go the same way (by words, 1 s)
node agent/meaning/embed.mjs        # every example sentence → agent/meaning.json (after editing skills)
node agent/meaning/bars.mjs         # the bars, chosen on the skills' own examples
node agent/meaning/measure.mjs -v   # held-out.json, questions L, the teaching curve
node agent/meaning/chat.mjs "how do we test an idea" "Overview" "tell me more"
node agent/build.js                 # docs/agent/index.html, for GitHub Pages (branch ptilu-agent, /docs)
```

The `agent/meaning` scripts need `npm install` in that folder once (transformers.js, build time only).
