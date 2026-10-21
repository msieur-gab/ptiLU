
# What main could take from the work of 20–21 October

Written at Gab's request, after `REVIEW-2026-10-21.md`. `main` (17e13ff) stays the reference: Gab
found it "simpler and perhaps better". Below, only what applies to main (it has no move skills,
no `tools/measure.js`, the A–Z tokenizer, `.txt` by default, several commands per sentence, and
the "acts: yes asks below 0.7" rule). Ordered by value for its size. Nothing is merged; Gab decides.

## Recommended

**1. Letters of any alphabet in the tokenizer (bug fix).** Main reads A–Z only, so "Kraków" and
"Tübingen" are cut at ó and ü (a known gap in the 13 October handoff). Three patterns in
`web/runtime.js` (TOKEN_RE, WORD_RE, ALNUM with `\p{L}\p{N}` and the `u` flag) and the same three
in `nlu/features.py` (`\w`), then retrain. On `principles` the held-out slot F1 went 0.91 → 0.94
with this change. Source: commit 0f01fbd, the runtime.js and features.py parts only.

**2. Markdown by default in create_file.** Gab: "MD should be the default until we manage the
filetype". Two lines: `.txt` → `.md` in `skills/create_file/skill.js`, and the `default_type`
reply in its skill.md. Source: commit 6f2bba3.

**3. Remove several commands per sentence.** Gab: "interesting on paper but bad in practice". On
main it is `splitCommands`, `runSequence` and the queue in `web/agent.js` (about 50 lines), plus 5
conversations in `test_dialogue.js`. It is also where the "salt and pepper" gap comes from.
Removing it changed no other dialogue reply on `principles`. Source: commit 2ce6ab3, the agent.js
and test parts.

**4. The measuring tool, not the runtime.** `tools/measure.js` from `principles`, with `--group`
(cross-validation that holds out whole example lines; the random folds used until 20 October
leaked and hid about half the abstentions) and the decisions per set (acted right, acted wrong,
answered wrong, asked, abstained). It changes nothing ptiLU does; it makes every later change
measurable honestly. Needs the small `sentences()` / `groups` export in `skills.js`.

## Worth considering, with its cost

**5. The taught-words check (ask instead of act).** The one runtime addition with a clear measured
effect: under the strict cross-check, wrong actions without asking fell from 178 to 21–24 in 7,108
sentences. It replaces main's "acts: yes asks below 0.7" with: act at 0.45 only if every word that
isn't a value is one the skill's examples use, otherwise ask and name the word ("I don't know
“fresh” yet. Do you want me to create a folder?"). Cost: about 55 lines (trainer stores each
skill's words, +34 KB in the model; runtime `unknownWords`; agent `decide`), and more questions:
about one request in seven in the strict test, fewer as words are taught. Limit, seen in Gab's
phone test: it doesn't see structure, so "create a new seed.md inside ideas folder" still made a
folder. Sources: commits f62b6a6 and 50804bd.

## Not recommended for main

- The `folder` type, folder guessing, "Did you mean Documents?" and the dropped-value rule: they
  patch, case by case, what a word-counting model can't see in file operations (`REVIEW-2026-10-21.md`).
- Reading values only for the chosen skill (`values_of`): small measured gain (values of the wrong
  kind 29 → 16 in the strict test) for more code.
- The place reader for unmarked names: useful, but only once the tokenizer fix is in, and still a reader added from outside the model.
- The rewrite of the dialogue around four principles: it removes five thresholds, but it leans
  on the taught-words check (5). Only worth doing if 5 is adopted.
- The exact-match layer and value typing: removed on `principles` after they measured flat.

## If Gab wants them

1 and 2 are small and safe; 3 removes code; 4 is tooling. They can go to main as one branch,
retrained, with the dialogue test updated, before anything else.
