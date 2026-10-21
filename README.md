# ptiLU

**ptiLU** (*p'tit LU*): **P**rivate, **T**eachable, **I**nterpretable **L**anguage **U**nderstanding.
A model of about 350 KB that understands short commands on the device, offline, and says
"I can't" rather than guessing. Formerly MiniOS NLU.

The first ptiLU is a tiny, CPU-only natural language understanding model for a mini operating system running on an Orange Pi Zero 2W (Armbian). It understands an English command, picks the intent, extracts the parameters, and a small dialogue manager decides what to do and what to answer.

Inspired by Snips NLU: no deep learning, no network, deterministic at runtime.

## Why this exists

Assistants today usually sit on a large language model, a cloud connection, or both. For a
small device that should do a handful of things well (make a folder, set a reminder, tell the
time) that is far more than needed, and it comes with the wrong trade-offs: heavy, opaque,
online, and confidently wrong when it hasn't understood.

This project tries the opposite: small, single-purpose "mini-brains" that run on the CPU of a
cheap single-board computer, or offline in a phone's browser. It started as a way to replace a
MiniLM sentence-embedding model with something lighter that needs no retraining from scratch
each time a capability is added.

What it aims for:

- **Small and local.** The model is about 350 KB and trains in about a minute, on a laptop or on
  the phone itself.
- **Designed by abstention.** What it leaves out is part of the design: no cloud, no large
  model, no generated text, no account, nothing collected beyond what a skill declares it
  sends (the weather skill sends a place name). And it abstains at run time too: below its confidence threshold it says it can't,
  before changing anything it asks when unsure, and what it didn't understand waits in an
  inbox to be taught, never guessed. A confident wrong action is worse than "I can't do that".
- **Readable without machine-learning knowledge.** What a skill understands, asks and answers
  is written in a Markdown file. Adding a skill means writing a file, not changing the engine.
- **Teachable by the person using it.** In that inbox, on the phone, a sentence can be added to
  a skill, become a new skill with its own answer, or be refused; the model retrains right there.
- **Toward permacomputing.** Plain JavaScript and Python with no frameworks or dependencies, a
  model of about 350 KB, plain-text skill files: it should keep running offline on modest or
  old hardware for years and stay readable by whoever inherits it. (Training and the demo
  still rely on a modern browser and GitHub Pages.)

What it is not: a general conversational assistant. It recognises the words its skills were
taught, not meaning. "Is precipitation likely tomorrow?" fails until a weather example uses
"precipitation"; open questions are refused.

## How it works

- **Intent:** TF-IDF features (words, word pairs, character 3–4-grams) and a logistic regression.
- **Slots:** a linear-chain CRF tagger (BIO labels).
- **Training:** plain JavaScript, no dependencies (`web/trainer.js`). The same file trains in Node (`node train.js`) and in the browser, so the PWA can retrain itself on the phone. Weak weights are dropped and the rest stored as 1-byte numbers: 358 KB for 22 skills.
- **Skills as folders:** every skill is `skills/<name>/`: a `skill.md` in plain Markdown and, only where needed, a short `skill.js`. The `skill.md` holds the example sentences, the values the skill takes and their types (`## Slots`: text, place, date or time, duration, a value from a list), the questions to ask when one is missing or wrong, what it says, the API request it makes, and whether it changes something (`acts: yes`) or needs the network (`uses: network`). The examples are also the training data: `node skills.js` turns them into sentences and checks every file, stopping with the file and the reason when something doesn't add up. `web/agent.js` is the dialogue only and knows no skill by name; `web/services.js` holds what skills share (dates in words, folders, network, memory). See `skills/README.md`.
- **Real APIs:** weather and the time in other places come from Open-Meteo (free, no key). Only the place name and its coordinates are sent; your name and place are stored on the device only.
- **Inbox:** every sentence the agent can't handle lands in an inbox on the device (plus any reply you flag as wrong). For each one: add it to an existing skill (tap words, then pick which of the skill's declared values they are), make a new skill from it with the answer it should give, or mark it "not for me". Retrain on the phone, keep the trained model across reloads, and export what was taught: training lines for existing skills, and a draft `skills/<name>/skill.md` for each new skill, ready to commit.
- **Runtime:** the model runs in plain JavaScript (`web/runtime.js`) and in dependency-free Python (`nlu/`), both reading the same `model.json`; `python evaluate.py` checks the Python side. The dialogue, the date parser and the skills run in JavaScript only for now. How the Pi will run them (a Python port, or one JavaScript brain with the Pi executing declared commands) is still open: see `HANDOFF.md`.
- **Dates, times, durations:** a rule-based parser (`web/entities.js`), not part of the model. It reads "next friday at 3pm", "in 2 days", "next year", "timer 1h30", "every weekday at 8" and flags what is ambiguous ("next friday" on a Monday, "at 9", "3/4") or already past, so the agent asks instead of guessing. Every skill that needs time shares it; adding one needs no retraining of this layer.
- **Dialogue:** asks for missing or invalid values with the skill's own questions, confirms risky actions (power), asks "Do you want me to…?" before anything that changes something when the model is unsure or a word is new to that skill ("I don't know “fresh” yet."), offers a choice when a date or time is ambiguous ("20:00 today, or 08:00 tomorrow?"), says it needs the network when a skill does, abstains below a confidence threshold, and finds list values named anywhere in the sentence ("it's too loud", "rebot the pi") when the model didn't mark them.

Try it: the `docs/` folder is a Progressive Web App that runs the model fully offline. Commands are simulated: the trace shows the shell command that would run on the device.

## Skills

The values each skill takes, as declared in its `skill.md`. Dates, times and durations are read
by the date parser, not marked by the model.

| skill | values | changes something |
|---|---|---|
| `create_folder` | name, location | yes |
| `create_file` | name, file_type, location | yes |
| `open_file` | name, location | yes |
| `open_app` | app (from a list) | yes |
| `adjust_volume`, `adjust_brightness` | direction (from a list), level | yes |
| `power` | power_action (from a list) | confirms every time |
| `system_status` | metric | no |
| `get_time` | place | no |
| `get_date` | day (date) | no |
| `get_weather` | place (home by default), day (date); needs the network | no |
| `set_timer` | duration | yes |
| `set_reminder` | task, when (date and time) | yes |
| `remember_me` | name, place | yes |
| `recall_me` | none | no |
| `forget_me` | none | yes |
| `greet`, `thanks`, `help` | none | no |
| `affirm`, `deny`, `out_of_scope` | none (the dialogue's yes, no and "I can't") | no |

## Layout

```
data/
  synth_*.md            externally generated batches, cleaned
  synth_moved.md        time requests that were labelled out_of_scope before the time skills
  test.md               handwritten held-out set
  skills.md             generated from skills/ (don't edit)
nlu/
  features.py           tokenizer and features (mirrored in web/runtime.js)
  dataset.py            annotated Markdown parser
  runtime.py            dependency-free inference (the Pi side)
skills/                 one folder per skill: skill.md + optional skill.js (see skills/README.md)
web/
  runtime.js            JS inference, same model.json
  trainer.js            JS training: TF-IDF + logistic regression (L-BFGS), CRF, pruning, export
  inbox.js              inbox storage, triage decisions, Markdown export (on the device)
  entities.js           rule-based dates, times, durations, recurrences
  agent.js              dialogue: routes to skills, questions, confirmations, choices, sequences
  services.js           shared services for skills: dates in words, folders, network, memory
  template.html         the page; build_web.py fills in model, code and data
pwa/                    PWA assets (manifest, icons, service worker template)
docs/                   built PWA, served by GitHub Pages
models/model.json       exported model (with its held-out scores)
tests/                  recorded API answers, expected dialogue transcript
```

## Data format

```
## intent: create_folder
- make a folder called [reports](name) in [documents](location)
```

## Commands

```
node train.js                    # compile the skills, train the shipped model, print held-out scores
python build_web.py              # build the PWA in docs/ (standard library only)
TZ=Europe/Berlin node test_entities.js   # date/time parser against fixed phrases
TZ=Europe/Berlin node test_dialogue.js   # replay scripted conversations; fails if a reply changed
                                         # (--update accepts the new replies, -v prints them)
python evaluate.py               # the Python runtime (Pi side) against the test set
```

Training takes about a minute on a laptop, in Node or in the browser (training files are listed in `data/manifest.json`). Inference runs in well under a millisecond per sentence.

Held-out, on the 144 handwritten test sentences that appear in no training file: intent accuracy 97.2%, slot F1 0.96.

The scikit-learn reference trainer, the dataset cleaning and cross-validation scripts and the raw generated batches were removed on 13 October 2026; they are in the git history before that date.
