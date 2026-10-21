# Handoff — 13 October 2026

Where ptiLU (formerly MiniOS NLU) stands, and what's open. Everything below is on `main` and live on
GitHub Pages.

## Where things are

- **Model:** TF-IDF + logistic regression (intent) and a CRF (slots), trained by plain
  JavaScript (`web/trainer.js`), in Node or on the phone. 377 KB for 23 skills. Held-out:
  intent 98.0% and slot F1 0.95 on the 151 test sentences that appear nowhere in training
  (98.4% on all 185). Retrained on 13 October for send_to_phone (8 fresh test sentences).
- **Skills:** one folder per skill, `skill.md` plus an optional `skill.js`. Since 13 October
  every `skill.md` also declares:
  - `## Slots`: each value's type (`text`, `place`, `datetime`, `duration`, `list <values>`),
    whether it's `required`, the `ask:` and `invalid:` replies, `default: home`, and for lists
    `guess` (find the list's words anywhere in the sentence) and `ignore:` words.
  - `acts: yes` for skills that change something: below 0.7 confidence they ask "Do you want
    me to …?" first (not when they're about to ask for a missing value anyway). One rule, one
    threshold, replacing the per-skill `confidence:` number (13 October). Power has no `acts`:
    it confirms every time.
  - `uses: network`: offline or failed call → "I need a network connection to …".
  - `role: yes / no / fallback` for affirm, deny and out_of_scope.
  Format guide: `skills/README.md`.
- **Compile checks:** `node skills.js` stops with file and reason on an unknown slot type, a
  required slot without an `ask:` reply, a missing reply, a `[..](slot)` or `{slot}` in a
  command that isn't declared, a list slot without its list, a duplicated role.
- **Core:** `web/agent.js` (382 lines) is the dialogue: routing, slot filling and asking,
  confirm, choose, handover, several commands per sentence. It knows no skill by name or
  vocabulary. `web/services.js` holds shared services.
- **Date parser:** `web/entities.js`, rule-based, 99/99 tests.
- **Inbox:** unknown sentences saved on the phone; triage, retrain on the device, export `.md`.
  Adding to an existing skill offers only the values its `skill.md` declares (as buttons; dates
  and durations aren't marked). A new skill gets an answer ("OK, alarm at {time}") and works
  on the phone straight after retraining, asking "Which time?" when a value it uses is missing.
  The export holds training lines for existing skills and a draft `skills/<name>/skill.md` per
  new skill that passes the compile checks.
  A marked value the date parser reads as a time becomes a `datetime` slot, said with its day
  ("08:00 tomorrow"). A taught skill only answers: to really ring, it needs a skill.js.
- **Bare hours:** "at 8" when 08:00 has passed today is now ambiguous: 20:00 today or 08:00
  tomorrow. Reminders and taught skills ask which one; answers like "tomorrow", "8am",
  "8:00", "tonight" pick it.
- **APIs:** weather and world time via Open-Meteo (no key). Name and home place on the device.

Run: `node train.js` (compiles the skills too), `python build_web.py`,
`TZ=Europe/Berlin node test_entities.js`, `TZ=Europe/Berlin node test_dialogue.js`.

## Declarative requests (13 October, afternoon)

A skill can now pull data from an API or push data to one with nothing but its `skill.md`.
- **`## Request`** takes any method (`GET`, `POST`, `PUT`, `PATCH`, `DELETE`), query lines,
  `body.x:` lines (a JSON body, dots nest) and `header.X:` lines. Only declared slots can be
  used; the compiler checks it.
- ~~`{date}` answer lines, `within: 15 days`, day/days/line replies~~: removed again at
  15:00 (only weather needed them; its skill.js does it).
- **`secret` slot type:** asked once, kept on the device (`ptilu.secrets.v1`), never in the
  model, shown as `•••` in the trace.
- ~~get_weather without skill.js~~: undone at 15:00, the script is back.
- **action.md (13 October, later):** the technical half of a skill moved to its own file
  next to skill.md: `## Request`, `## Answer`, `## Secrets` (question asked once, value kept
  on the device), `## Values` lists the answer uses, and `uses:`. skill.md keeps what
  people say and hear. Compile-time only: `skills.json` is the same, the agent unchanged.
  The compiler stops on a section in the wrong file or in both, and on a reply using a
  `{value}` that is no slot and no Answer field. Done for get_weather and send_to_phone;
  `command:` of open_app, power, volume… could move the same way.
- **send_to_phone** (new): POST to ntfy.sh, message in a JSON body, topic as a secret. The
  model finds the message in 6 of its 8 test sentences; otherwise it asks for it.

## Back to light (13 October, 15:00)

After the first phone test, the webhook skills were too heavy for what ptiLU promises: they
need an account, a script or a server before they answer anything. They moved to the
`webhooks` branch (get_route, add_event, get_agenda, tools/webhook.js and its test, the
webhook section of the guide). Main keeps only what works with the phone alone.

**Rule from now on:** a skill ships on main only if it works for someone with just the phone
(or the Pi). Everything specific to a skill lives in its folder: skill.md (what people say and
hear), action.md (what it calls, what it reads back, its secrets), skill.js only when it
needs logic of its own. The core keeps what every skill shares: dialogue, date parser, one
HTTP call helper. One call generalises; multi-step jobs belong in a skill's skill.js or
outside ptiLU.

- **On main:** 25 skills, model 391 KB. Held-out intent 97.5%, slot F1 0.93 (162 sentences).
  New today and kept: send_to_phone (ntfy), send_telegram (bot token), show_map (link).
- **Weather:** its day logic is back in its own skill.js (the original script, unchanged);
  the `{date}` answers, `within:` and the day/days/line replies are gone from the core. Its
  replies are identical to this morning's.
- **Core vs. this morning:** agent.js +20 lines, services.js +38, compiler +56 (action.md and
  its checks). Kept: requests with any method, body and headers; secrets per skill, masked
  in the trace; `required` Answer fields → not_found; clickable links; and the fixes from the
  phone test (a clearly different skill drops a pending question; a sentence is never taken
  as a key; answers lose their lead-in; values from the first sentence wait with a question).
- **Not tested for real:** Telegram from the browser (CORS).
- **Known gap, older than today:** the tokenizer reads A–Z only (“Kraków”, “Tübingen” are cut).
- **Next:** a skill.js guide built on three patterns; a tests.md per skill folder.

## Decided on 13 October

- **Skills declare their values, questions and answers.** The core fills slots and asks; a
  script asks by itself only for "one or the other" rules (file or folder, level or direction,
  a time that becomes a reminder).
- **Network:** the agent says it needs the network; it doesn't silently disable a skill.
  Declare `uses: network` only when a skill can answer nothing offline (get_time stays without
  it: it still gives the local time).
- **Runtimes:** browser JS on web and mobile (no Node), Python on the Pi (preinstalled). The
  `skill.md` files are shared; the small parser would exist once per runtime. No Pyodide. A
  connector between the two is for later.
- **Code size, honestly:** scripts 370 → 346 lines, core 321 → 382, compiler 131 → 178 (about
  30 of them checks). About 85 lines more overall; the gain is one place for slot filling and
  skill files that describe their whole behaviour.
- **What the model is:** it recognises unseen sentences through words, word pairs and word
  fragments it has met, not meaning. Sentences built on words no example used for a skill
  ("precipitation") are abstained on. Examples should teach vocabulary, not volume.

## Open

**Not yet tested in real life**
- send_to_phone against the real ntfy.sh from the phone (CORS, topic answer). Tested only with
  the recorded fixture; the sandbox couldn't reach ntfy.sh.
- Everything merged on 13 October, on the phone (grey-zone question, invalid answers, offline
  message, list words like "it's too loud", "rebot the pi").
- Open-Meteo calls from the phone; the browser's offline signal (`navigator.onLine`).
- On-device retraining time on the phone, memory use on the Pi Zero 2W (512 MB).

**Next for the model, in this order (13 October)**
1. **Test set:** about a dozen fresh, handwritten sentences per skill (now 3–9 for most;
   greet 3, power 6, reminders 8). It's the measure for everything below.
2. **Vocabulary:** example lines that introduce the words people use, and contrasting lines
   at the edges between skills ("remind me what day it is" → date, "time to go home" → out of
   scope).
3. **Slot boundaries:** 5 of the 9 test errors are values cut short or missed ("folder for
   bike repairs", "a note named ideas for pebbble" → "ideas", "please lower the volume").
4. **Typos in the rule-based parts:** the model copes ("creat a foldr", "set a timr"); value
   lists ("opne the termnal", "dowload") and date words ("tomorow") don't. Fuzzy matching once,
   in the list slot type and the date parser.

**Next for actions (13 October)**
- **Scheduled tasks:** not ptiLU's job. ptiLU understands "every Monday at 8" (the date
  parser makes the repeat rule) and hands it to the Pi's systemd timers, as reminders do.
- **A pull with a key:** a `header.Authorization: Bearer {key}` skill to try the header path
  for real.
- **Forgetting secrets:** "forget everything about me" clears name and place, not secrets.
- **Webhooks:** on the `webhooks` branch, if ever a server runs (see “Back to light”).

**Also open (from 12 October)**
- **Place disambiguation:** name the country, ask between places, remember the choice.
- **Browser capabilities as skills:** speech output, notifications, location for "weather
  here". Avoid browser speech input in Chrome.
- **Small context across tasks:** "and tomorrow?" after the weather, "open it" after creating
  a folder. A follow-up could reuse the previous skill's filled slots.
- **Split the brains** (OS brain for the Pi vs. weather/memory) and an **executor on the Pi**
  (only declared commands; values from lists).
- **Device skills:** a `uses: device` for skills that need the Pi's `/sys` and `/proc`
  (system status), answered as unavailable in the browser.

**Known gaps**
- Names containing "and" ("a folder called salt and pepper" → "salt").
- Date parser: "after lunch", "mid-november", "alarm for 7" (no time read after "for"),
  languages other than English.
- A name with an apostrophe isn't read as a name ("create a folder called it's mine" → asks).

## Cleanup (13 October, after a review of the whole system)

- **Removed:** the scikit-learn reference stack (`train.py`, `cv.py`, `lint.py`,
  `clean_batches.py`, `requirements-train.txt`, `models/model_sklearn.json`), the raw generated
  batches (`data/raw/`), `DATASET_BRIEF.md`, and the second copy of the built page
  (`web/index.html`; only `docs/` is served). All of it is in the history before this date.
  Kept: `nlu/` (the Python runtime for the Pi) and `evaluate.py`, which checks it.
- **Build without scikit-learn:** `build_web.py` used to import `train.py`, so building the page
  needed scikit-learn. `node train.js` now stores the held-out scores in the model (only test
  sentences that appear in no training file, the same rule as on the phone) and the build reads
  them: standard library only.
- **Shell quoting:** the old quote helper left `$(...)`, `;` and `&` live in folder names, and
  reminder and timer texts went into `notify-send` unquoted. Free text is now single-quoted; a
  path's leading `$HOME` stays outside the quotes.
- **Dialogue test passes or fails:** `test_dialogue.js` compares the 88 conversations with
  `tests/dialogue.expected.txt` (intent, slots, dates, reply, command; not confidences) and
  shows each turn that changed. `--update` accepts new replies, `-v` prints the transcript.

**Still open from the review**
- **One source of training data.** About 2,980 sentences still live in `data/synth_*.md`, outside
  the skill folders. Skill files alone: 94.9% intent, F1 0.94, 238 KB, 25 s training (all data:
  97.7%, 0.97, 358 KB, 61 s, on all 177). The gap is short answers ("yup", "nah", "open the
  terminal") and out-of-scope edges: a few dozen lines in `affirm`, `deny`, `open_app` and
  `out_of_scope` could replace the batches. Decide after the larger test set.
- **Decide the Pi side before writing Python.** A Python agent means porting `agent.js`,
  `entities.js`, `services.js` and every `skill.js` (about 1,400 lines) and keeping them in step.
  Alternative: one brain in JS, and the Pi as a thin executor of declared commands.
- **No new `skill.md` fields** without removing one. Done for per-skill `confidence:`, replaced
  by `acts: yes` and one threshold (0.7, the same one that decides splitting a sentence).
- **Several commands per sentence:** keep, don't extend (source of the "salt and pepper" gap).

## Branches

All merged into `main`, safe to delete (their commits are all on `main`): `time-skills`, `js-trainer`, `inbox`,
`skill-files`, `multi-intent`, `core-split`, `place-names`, `dates`, `typed-slots`,
`inbox-slots`, `time-values`, `cleanup`.

## Action + object (21 October, evening, branch `action-object`, from `main-fixes`)

Gab had asked since 20 October for action + intent + slot; it was dismissed on 15 October by an
estimate and never tried. Tried now, smallest form: `does: create file` in a skill's front matter.
Skills that share an action are told apart by the sentence's shape (a name like seed.md, an app's
name, the word folder / file, with the place "inside the ideas folder" set aside), not by the model.
About 40 lines in `web/agent.js` (`compose`, `objectOf`); the model and training are unchanged.

Measured with `tools/measure.js --cv --group` against `main-fixes` (same folds), and on
`data/probes-files.md` (24 handwritten sentences written before the change):
- file / folder probes: acted right 18 → 20, asked about the wrong skill 3 → 0.
- grouped CV: silent wrong actions 34 → 32 (none new; settings.json and styles.css fixed),
  asked about the wrong skill 53 → 42. Held-out, boundary and other probes unchanged.
- "please create a new seed.md inside ideas folder" → create_file, seed.md in ideas.

Found behind it, not fixed (values, not routing): "make a new folder named seeds in the ideas
folder" loses the location; "create settings.json in this directory" makes a folder called "this".

## Lexicon and taught-words check on action-object (21 October, late, branch `action-object-plus`)

Each added alone and measured; only what paid for itself is kept.
- **Lexicon** (skills/lexicon.md from principles, ~30 lines): kept. On 315 handwritten sentences
  no branch trained on: right 266 → 280, none worse, silent wrong actions 3 → 3. Grouped CV:
  acted right 4663 → 4697, silent wrong actions 32 → 35. (The probes were written before the
  lexicon grew, so part of the gain may be tuning.) Score on those 315: main 265, principles 276,
  this branch 280; silent wrong actions main 3, principles 7, this branch 3.
- **Taught-words check** (~25 lines, +14 KB): not kept. Replacing the 0.7 rule (as on principles):
  silent wrong actions 35 → 47, wrong-skill questions 39 → 108. On top of the 0.7 rule: silent
  wrong actions 35 → 23 but 252 right actions became questions (about 21 per error avoided), and
  on the 315 sentences it avoided none. It looked good on principles because it replaced a weaker
  rule there. Code is in this session's history if ever wanted.

**Values that only point** (same branch). "in this directory", "that folder", "here": the agent
acts on top of a screen it doesn't see and keeps no picture of the device, so these name nothing.
Gab: it "should not create a folder named this nor that". Any text value that is only a pointer
(this, that, here, there, it, current, with or without folder / directory / file) is treated as
no value; a slot with a question asks it ("In which folder? Say its name, for example Documents.").
The old "here = the current folder", which really meant the home folder, is removed. 4 dialogue
conversations added; the rest unchanged. Edge: "create a folder called this" asks for the name.

**Place read by its shape** (same branch, after Gab's phone test: "please create a new seed.md
inside ideas folder" → "Done. seed.md is in your home folder"). The slot model misses the place
when it's capitalised ("Ideas") or after "the"; the folder was then dropped in silence. When a
file skill's location is empty, "in / inside / into / under / within (the|my) X folder" fills it
(X: one to three words, no verbs or articles, not part of another value). On every training,
test and probe sentence it fills a missed place 12 times, none wrong (10 are "in this directory",
which then asks). 2 dialogue conversations added. Note: "Ideas" and "ideas" are different folders
on Linux; the agent has no picture of the disk to tell which exists.
