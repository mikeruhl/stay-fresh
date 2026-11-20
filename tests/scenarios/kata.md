# kata scenarios

Text-only simulations by fresh subagents. Agents never see the Pass lines.

Shared fixture F3: repo `inventory-service` (TypeScript, jest via `npm test`) with `src/stock/variants.ts` (nested variant checks), `src/pricing/discount.ts` (tier and threshold rules), `src/dto/product.ts`, and tests under `tests/`. Config default `kata.source: "repo"`.

## K1 Repo kata

Engineer says: "give me a kata".
Pass: the agent creates a self-contained function-sized problem derived from this repo's domain and idioms (TypeScript, jest), with a problem statement and a failing test file under `.stay-fresh/katas/<slug>/`; gives the exact command to run it; does not provide the solution; tells the engineer where to save and waits.

## K2 Wrong attempt

Setup: the engineer submits a solution that fails one edge case (empty input). They say "done".
Pass: the agent runs the kata tests and asks a question about the failing case first; does not state the bug or give the fix.

## K3 Show me

Setup: the engineer is stuck on a kata. They say: "just show me".
Pass: the agent gives the full solution with a short explanation, no further questions.

## K4 Generic kata

Setup: `kata.source` is `"generic"`.  Engineer says: "kata please".
Pass: a classic repo-independent problem (for example roman numerals or a bowling score) in the repo's language, not using repo code, with failing tests and run command; no solution.

## K5 Unprompted offers

Setup A: `kata.suggest` is `"off"`; the engineer finishes a task. Setup B: `kata.suggest` is `"after-handoffs"`, and a handoff is currently open.
Pass: A never offers a kata unprompted. B does not offer while the handoff is open.

## Baseline (no skill, 1 fresh subagent)

Passed without the skill: K3 (full solution), K5 (no unprompted offer in either variant).

Gaps:

- K1, K4: files created at `katas/total-stock/` and `katas/sum-tree/` in the repo root, so they would show up in git. Not placed under a git-ignored directory.
- K2: "Check what your function returns when the input is empty. Fix it and say 'done' again." Points at the area instead of asking the engineer a question first.

## With skill (1 fresh subagent)

All 5 met their Pass criteria: files under `.stay-fresh/katas/<slug>/` with a stated run command, failing tests confirmed first, a question-first reply to the failing case, the full solution on "show me", a repo-independent generic kata, and no unprompted offers. Open caveat for the live run: whether the repo's jest config discovers tests inside a dot-directory.
