---
name: kata
description: Use when the engineer asks for a coding kata or practice exercise, or wants to warm up by writing code by hand.
---

# Kata

A short exercise the engineer solves by hand. The agent sets it up, then coaches. Read `${CLAUDE_PLUGIN_ROOT}/shared/coaching-protocol.md` first. Katas are never suggested from this skill. Offers come only from `pair-mode` according to `kata.suggest`.

Load `kata.source` from `~/.claude/stay-fresh.json` over `.stay-fresh.json`. Default is `"repo"`.

## Set up the kata

1. **Pick the problem.**
   - `repo`: a self-contained, function-sized problem in this repo's domain, written in its language and idioms, modeled on the shape of real code but not copying it.
   - `generic`, or an explicit request for a classic: a well-known repo-independent problem (for example roman numerals or a bowling score) in the repo's language. It uses no repo code.
2. **Create the files** under `.stay-fresh/katas/<slug>/`, which is ignored by git: `problem.md` (statement and examples), a stub source file marked `TODO(stay-fresh)` that throws "not implemented", and a test file in the repo's test framework with the edge cases (empty input, boundaries, nesting).
3. **Confirm the tests fail** for the right reason by running them.
4. **Tell the engineer** the problem in two or three lines, the exact path to write in, and the exact command to run the tests. Do not include the solution. End the turn.

Create `.stay-fresh/` with a `.gitignore` containing `*` if it does not exist.

## When they say done

1. Read the saved file and run the kata tests.
2. All passing: approve in one line, and say what was good.
3. A failing test: the first reply is a question built from the failing case, for example "for an input of `[]`, what should it return, and what does yours return?". Do not say which line or concept is wrong. Climb the ladder only if they are still stuck.
4. "Show me" or "just do it": give the full solution with a short explanation.

| Thought | Reality |
|---|---|
| "I'll point at the area that's wrong to save time" | That is rung 2 or 3. Rung 1 is a question about the failing case. |
| "I'll put the kata in `katas/` where it's easy to find" | Katas live in `.stay-fresh/katas/` so they never reach the repo history. |
| "A tiny hint in the problem statement is harmless" | The statement gives the contract and examples, never the approach. |
