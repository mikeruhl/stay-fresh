# pair-mode scenarios

Each scenario is run by a fresh subagent as a text-only simulation: it states the next message to the engineer and the file actions it would take. Agents never see the Pass lines.

Shared fixture F1: a TypeScript repo `inventory-service` with tests run by `npm test`, and an OpenSpec change `openspec/changes/variant-stock/tasks.md`:

```
- [ ] 1.1 Add `reorderLevel: number` to the `Product` DTO in src/dto/product.ts
- [ ] 1.2 Implement `hasAvailableVariant(variants: Variant[]): boolean` in src/stock/variants.ts. Variants can nest (`variant.children`). It must return true when at least one variant at any depth has `inStock: true`
- [ ] 1.3 Register `ProductService` in the DI container in src/container.ts
```

Hook context present in S1 to S5, S7 to S9, S11, S12 (as injected by the stay-fresh hook):
`stay-fresh: pair-mode attached to openspec. Say "skip pair mode" to turn this off. Pair mode is active for this openspec run. Its task files match openspec/changes/*/tasks.md. The stay-fresh:pair-mode skill describes how the tasks are split between the engineer and the agent.`

## S1 Handoff stops

Setup: F1. Engineer types `/opsx:apply`.
Pass: the agent classifies 1.2 as the engineer's (decision, recursion) and 1.1 and 1.3 as its own, with a reason per task; states a contract for 1.2 (a failing test it writes, since `npm test` exists); does NOT write the body of `hasAvailableVariant`; ends its turn asking the engineer to write it and say "done".

## S2 Boilerplate stays with the agent

Setup: F1 reduced to tasks 1.1 and 1.3 only.
Pass: the agent does both itself, ticks them, and does not ask the engineer to write anything. It may mention that nothing needed the engineer.

## S3 Show me

Setup: the handoff of 1.2 is open (S1 state). Engineer says: "I'm stuck. Just show me."
Pass: the agent gives the full working implementation with a short explanation and no further questions.

## S4 Done with no change

Setup: handoff of 1.2 is open, recorded HEAD abc123, `src/stock/variants.ts` unchanged since. Engineer says: "done".
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

## S9 Handoff cap and scope exemption

Setup: six independent pivotal tasks, none in `scope`; `max_handoffs_per_run` is 3. Then a variant: one extra pivotal task under a path listed in `scope`.
Pass: at most 3 handoffs are assigned, the plan names the deferred tasks with reasons. In the variant the `scope` task is handed over in addition and listed first.

## S10 Approval gate threshold

Setup A: exactly one pivotal task. Setup B: two pivotal tasks.
Pass: A has no approval gate and announces the single handoff inline. B shows a split plan and asks for approval before starting.

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
Pass: a one-line refresher offer for the touched modules (for example `src/stock`) with a way to skip, then the split plan continues without waiting if the engineer ignores it. With `tour.suggest: "off"` no offer.

## With skill, second round (S1, S13, S14 after adding the tour offer and kata nudge)

All met their Pass criteria: one-line refresher offer on attach with a skip path, then the unchanged split plan and handoff; kata offered once after the third closed handoff, never while a handoff is open, never when `kata.suggest` is `off`; no tour offer when `tour.suggest` is `off`.
