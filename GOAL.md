# The goal of branch `engine-answers`

Started 20 November 2026, after Gab: "each time we are trying to improve, iterate… we just get back to the
same and it just delivers the same bad result". This file is read before any change on this branch.

## What the engine must do

A question about written content (any Markdown files; judged first on the portfolio pieces):

1. **Answer it** with the files' own sentences, and where they come from, **only when the text holds the
   answer.**
2. **Otherwise say so**, or, for a question about Gab himself (his time, price, tools, availability),
   **invite the visitor to send it**. A loosely related quote is the failure to remove.

A wrong quote costs more than a missing answer.

## How it is judged (and only how)

`node engine/meaning/judge.mjs` (`-v` prints the tuning set's misses), two sets, never mixed:

- **The tuning set**: my-agent's `tests/held-out.json` (answerable with expected phrases, near-misses,
  off-topic, requests). Rules and bars may be chosen on it, and its sentences may be read.
- **The blind set**: my-agent's `docs/questions.md` (72 visitor-style questions, each with a live piece
  or "invitation"), and `engine/tests/real.md` (Gab's own sentences). **Nothing is tuned on it.** The judge
  prints its totals only; its sentences are not read while building. Gab chose it on 20 November ("use
  questions.md as is"), knowing its candidate answers are unchecked guesses.

The two numbers that matter, on the blind set: **wrong quotes** (an answer from the wrong piece, or any
answer where an invitation was expected) down, **right answers** not down.

## Constraints (Gab, 20 November)

- Only the models already in the repository: the TF-IDF model, the CRF tagger, MiniLM (8-bit).
- Built general (no rule naming a portfolio piece); measured on the portfolio first.
- Research before building: what is borrowed is named with its source.
- Commands (the `everyday` skills) must not get worse: `node engine/test.js` stays as it is.

## Where it stands (20 November, end of the first session)

What was built, in order, each kept only because the tuning set said so:

1. **The answer check** (`engine/answers.js`, `Content.check`). A question asking for a value ("who…",
   "how many…", "how much…", "when…", "which companies…") is answered only by a clause that holds a value of
   that type *and* a word of what was asked (the question's words, without the file's title). When the
   passage found fails, the files the question names are searched for a sentence that passes; else nothing.
   Borrowed: answer-type checking (TREC QA, 2001: "who / how many / when" give the answer's type) and its
   refinement that "this number must quantify the dogs" (Pasca & Harabagiu, 2001). Chosen over a reranker:
   a measured study found cross-encoder and entailment scores separate answerable from unanswerable no
   better than cosine ("Relevance is not answerability", G. D'Erme, 2026).
2. **Questions for the author.** A content pack may list `## For the author` (his time, price, tools, a
   service asked of him), taught to the model as their own kind, `invite`, and embedded for meaning; such a
   question gets the pack's `## Invite` reply, never a passage. The work pack's 34 lines were written without
   reading the blind set; its replies are Gab's ten drafts from questions.md, word for word. Borrowed: a
   class of its own with near-miss examples beside it improves out-of-scope detection (intent-routing
   practice).

`node engine/meaning/judge.mjs`, against `engine` (8ae35cc):

| | `engine` | this branch |
|---|---|---|
| tuning set: answerable, right passage (56) | 34 | 35 |
| tuning set: near-misses quoted (10) | 9 | 0 |
| tuning set: requests quoted (10) | 2 | 0 |
| tuning set: wrong quotes, all | 12 | **0** |
| blind: a piece expected, right (32) | 23 | 23 |
| blind: a piece expected, wrong piece | 5 | 5 |
| blind: an invitation expected, quoted (40) | 11 | 2 |
| blind: Gab's sentences where they belong (7) | 7 | 7 |
| **blind: wrong quotes** | **16** | **7** |

Commands unchanged (`node engine/test.js`, every line as on `engine`).

Read honestly:
- **Against the live site** (`compare.mjs`, the same blind questions): my-agent main's keywords get 24
  right with 5 wrong quotes; this branch 23 right with 7. Better than it was (16), not yet better than what
  is live. MiniLM-first (my-agent feat/nlu): 22 right, 24 wrong.
- **The 5 wrong pieces are not understood.** The tuning set has none left, so nothing here can say why; they
  were not read. Next: Gab reads them (`--show-blind`, which ends their blindness for whoever reads them), or
  new questions written by someone who never saw the files become the next blind set.
- **One slip:** a sweep of the invite bar (0.3 to 0.7) printed blind totals before `--tune` existed. The bar
  stayed at 0.5, set before the sweep; every value scored the same on the tuning set.
- The check covers questions that ask for a value. "Why", "how do we…" and "what is…" questions are still
  answered on similarity alone; 17 of the tuning set's 56 get the right piece but not the expected passage.
