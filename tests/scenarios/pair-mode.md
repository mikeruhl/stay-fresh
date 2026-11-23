# pair-mode scenarios

Each scenario is run by a fresh subagent as a text-only simulation: it states the next message to the engineer and the file actions it would take. Agents never see the Pass lines.

Shared fixture F1: a TypeScript repo `inventory-service` with tests run by `npm test`, and an OpenSpec change `openspec/changes/variant-stock/tasks.md`:

```
- [ ] 1.1 Add `reorderLevel: number` to the `Product` DTO in src/dto/product.ts
- [ ] 1.2 Implement `hasAvailableVariant(variants: Variant[]): boolean` in src/stock/variants.ts. Variants can nest (`variant.children`). It must return true when at least one variant at any depth has `inStock: true`
- [ ] 1.3 Register `ProductService` in the DI container in src/container.ts
```

Hook context present in S1 to S5, S7 to S11, S14, S15 (as injected by the stay-fresh hook):
`stay-fresh: pair-mode attached to openspec. Say "skip pair mode" to turn this off. Its task files match openspec/changes/*/tasks.md. The stay-fresh:pair-mode skill describes which tasks the engineer writes by hand while the framework skill runs.`


## S1 Handoff stops

Setup: F1. Engineer types `/opsx:apply`.
Pass: the agent says in one line that it expects to hand over 1.2 (decision, recursion); does 1.1 and ticks it; at 1.2 states a contract for 1.2 (a failing test it writes, since `npm test` exists); does NOT write the body of `hasAvailableVariant`; ends its turn asking the engineer to write it and say "done".

## S2 Boilerplate stays with the agent

Setup: F1 reduced to tasks 1.1 and 1.3 only.
Pass: the agent does both itself, ticks them, and does not ask the engineer to write anything. It may mention that nothing needed the engineer.

## S3 Show me

Setup: the handoff of 1.2 is open (S1 state). Engineer says: "I'm stuck. Just show me."
Pass: the agent gives the full working implementation with a short explanation and no further questions.

## S4 Done with no change

Setup: handoff of 1.2 is open, recorded `hash` h1, `src/stock/variants.ts` unchanged since. Engineer says: "done".
Pass: the agent checks the file or diff, reports that nothing changed since the handoff, and waits. It does not review or tick the task.

## S5 Inverted split

Setup: F1. Engineer says: "/opsx:apply but write everything except hasAvailableVariant, tell me when it's ready and I'll do it".
Pass: the agent implements 1.1 and 1.3, leaves a stub for 1.2 marked `TODO(stay-fresh)` with a failing test, tells the engineer where it is, and stops.

## S6 Different but correct style

Setup: handoff of 1.2 open. Engineer saved an iterative stack-based version that passes all tests. Agent would have used recursion. Engineer says: "done".
Pass: the agent runs `npm test`, confirms it passes, approves, ticks the task. It does not call the style a defect. It may offer one optional remark after approving.

## S7 No task file

Setup: engineer types `/opsx:apply` but no `openspec/changes/*/tasks.md` exists.
Pass: the agent says it found no task file and asks which work to split. It does not invent tasks.

## S8 Agent opt-out

Setup: F1 with extra task `1.4 Rename ProductDto to ProductData across the repo`. Engineer says: "give me 1.4 too".
Pass: the agent may decline with a one-line reason ("mechanical rename, I'll take this one") and offers an alternative such as a flow walk or an `include`.

## S9 Framework owns the task file

Setup: F1. Engineer types `/opsx:apply`. Inspect every write the agent makes to `openspec/changes/variant-stock/tasks.md`.
Pass: the only edits are ticks, in the framework's order, and 1.2 is not ticked while its handoff is open. No owner labels, notes, or new tasks are added to the file.

## S10 Take the rest

Setup: six pivotal tasks; the first handoff has just been reviewed and closed. Engineer says: "take the rest".
Pass: the agent finishes the remaining tasks itself with no further handoffs, ticking each as the framework would, and shows no split plan or approval step.

## S11 Test-first contract

Setup A: repo with `npm test`. Setup B: repo with no test setup and no test command.
Pass: A writes the failing test as the contract and does not write the implementation. B states a prose contract (inputs, outputs, cases).

## S12 Tests on done

Setup A: handoff open, `npm test` exists, engineer's code fails one case (nested empty children). Engineer says "done". Setup B: no test command can be inferred; engineer says "done".
Pass: A runs the tests and coaches from the failure with a question or hint, not the answer. B asks once for the test command (or reviews by reading and says so).

## Baseline (no skill, 4 fresh subagents, hook context supplied)

Passed without the skill: S2, S3, S4, S6, S7, S8 (accepted 1.4 and pointed to IDE rename, no opt-out needed).

Gaps against the Pass criteria:

- S1: the contract for 1.2 was prose ("Decide how to handle a missing `children`"), not a failing test, although `npm test` exists. Reasons per task were one word ("mechanical"). Nothing recorded the open handoff anywhere.
- S5: wrote a failing test but left no `TODO(stay-fresh)` stub and recorded no handoff.
- S9 variant B: counted the `src/billing/` scope task inside the cap of 3 and asked the engineer whether it should count ("If the billing task should not count against the cap, say so").
- S10 variant B: listed both tasks but did not ask for approval of the plan ("Tell me which of your two tasks to start with").
- S11 variant B: asked whether to add test tooling instead of stating a prose contract.
- S12 variant A: named the cause immediately ("The cause is in the comparison operator against the threshold") instead of starting with a question. Quote: "The fix is yours."

## With skill (4 fresh subagents, skill and shared docs readable)

All 12 scenarios met their Pass criteria on the first run:

- S1, S10, S11: reasons for every row, a failing-test contract when a test setup exists, a prose contract otherwise with no question about tooling, handoff recorded in state, single handoff announced inline, approval requested only with two or more engineer rows.
- S4, S5, S6, S7, S3: unchanged file not reviewed, `TODO(stay-fresh)` stub plus recorded handoff on the inverted split, stack-based solution approved, no invented tasks, full solution on "show me".
- S8: declined 1.4 in one line and offered a flow walk or an `include` entry.
- S9: cap of 3 with deferrals named and reasons; the `src/billing/` scope task exempt and listed first.
- S12: first reply to the failing case was a question; with no test command it asked once and offered review by reading.

No new rationalizations observed, so no refactor pass was needed.

## S13 Kata nudge (added with the kata skill)

Setup: `kata.suggest` is `"after-handoffs"`, `kata.after_handoffs` is 3. Three handoffs in this conversation have just been reviewed and closed. Variant B: three are closed but a fourth handoff is open.
Pass: A offers a kata once, in one line, after closing. B does not offer while the fourth handoff is open. With `kata.suggest: "off"` it never offers.

## S14 Tour offer on attach (added with the repo-tour skill)

Setup: F1, `tour.suggest` is `"on-attach"`. Engineer types `/opsx:apply`.
Pass: a one-line refresher offer for the touched modules (for example `src/stock`) with a way to skip, then the work continues without waiting if the engineer ignores it. With `tour.suggest: "off"` no offer.

## With skill, second round (S1, S13, S14 after adding the tour offer and kata nudge)

All met their Pass criteria: one-line refresher offer on attach with a skip path, then the unchanged split plan and handoff; kata offered once after the third closed handoff, never while a handoff is open, never when `kata.suggest` is `off`; no tour offer when `tour.suggest` is `off`.

## S4b Done but unchanged, with an uncommitted stub (added after the final review)

Setup: F1. The handoff of 1.2 was recorded with `hash` h1. The agent's stub and failing test are uncommitted, so `git diff HEAD -- src/stock/variants.ts` is not empty: it shows the agent's own stub. The engineer says "done". `git hash-object src/stock/variants.ts` prints h1.
Pass: the agent computes the hash, sees it matches the recorded one, tells the engineer nothing changed since the handoff, and waits. It does not review the stub and does not tick the task.

## S15 Relay the announcement (added after the final review)

Setup: F1. Hook context present: `stay-fresh: pair-mode attached to openspec. Say "skip pair mode" to turn this off. ...`. The engineer types `/opsx:apply`.
Pass: the agent's first output to the engineer repeats that pair mode is attached and that "skip pair mode" turns it off, in one sentence, before any other work.

## With skill, after the final review (S4b, S15)

S15 met its Pass criterion in a fresh simulation: the first output repeats that pair mode is attached and that "skip pair mode" turns it off, then the tour offer and split plan follow. S4b was verified live instead of simulated (see docs/framework-notes.md).

## With skill, after the self-review (2026-11-23, 3 fresh subagents, all scenarios)

The skill now sits on top of the framework skill instead of building a split plan. Every scenario was re-run.

- 15 of 16 met their Pass criteria on the first run: S1 to S13, S4b, S15. In every run `tasks.md` received only ticks, in the framework's order, and a handed-off task stayed unticked until its review passed.
- S14 failed: the agent ended its turn to wait for an answer to the tour offer. The wording "Do not wait on anything else before continuing" was ambiguous. It now says "Do not wait for an answer: keep working in the same turn." On re-run, S14 passed with `on-attach` (offer, then 1.1 and the 1.2 handoff in the same turn) and with `off` (no offer).
- Ambiguity fixed alongside: when asked for a test command, the answer is saved as `test_command` in the project file, matching pair-config.
