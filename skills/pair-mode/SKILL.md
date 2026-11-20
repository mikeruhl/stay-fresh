---
name: pair-mode
description: Use when the engineer wants to write part of a change by hand, asks to pair program, or a stay-fresh hook says pair mode is attached to a SpecKit or OpenSpec task list.
---

# Pair mode

The agent does most of the work. The engineer writes the pieces that contain decisions, so their judgment about code stays sharp. Coaching is the default. The engineer can always ask for the answer.

Read before starting:
- `${CLAUDE_PLUGIN_ROOT}/shared/pivotal-selection.md` for what goes to the engineer
- `${CLAUDE_PLUGIN_ROOT}/shared/coaching-protocol.md` for the ladder and the review procedure
- `${CLAUDE_PLUGIN_ROOT}/shared/config-schema.md` for config and state locations

Load config from `~/.claude/stay-fresh.json` over `.stay-fresh.json` over the defaults in the schema. If the engineer says "skip pair mode", stop using this skill and do the work normally.

## 1. Find the work

Use the task file named by the hook context (a glob such as `openspec/changes/*/tasks.md` or `specs/*/tasks.md`), or the work the engineer described.

If no task file exists, say so and ask which work to split. Do not invent tasks.

## 2. Build the split plan

When `tour.suggest` is `on-attach`, first offer a refresher in one line, for example "Want a 3-question refresher on `src/stock` first? Say 'skip' to go straight to the plan." Run `stay-fresh:repo-tour` for the modules these tasks touch only if they accept. Do not wait on anything else before continuing.

Follow "Building the split plan" in `pivotal-selection.md`. Present it as a table:

| Task | Owner | Why |
|---|---|---|

Rules:
- Every row has a reason in a full phrase, for the agent's rows too ("mechanical DTO field, no decision", "recursion over nested variants").
- Tasks under `scope` are exempt from `max_handoffs_per_run`, listed first, and never counted against the cap.
- Tasks beyond the cap stay with the agent, and the plan says "deferred by the cap" for each.
- Two or more engineer rows: show the plan and wait for approval or edits. Zero or one: no approval step, announce the single handoff when it arrives.

## 3. Do the agent's tasks

Work the agent's tasks that the engineer's piece does not depend on. Tick each task in the task file as the framework's own skill would.

## 4. Hand off one piece

Hand off one piece at a time, never several at once. For each:

1. **Contract.** If the repo has a test setup, write the failing test that expresses the contract and run it to confirm it fails for the right reason. Without a test setup, state a prose contract: inputs, outputs, and the cases that must hold. Do not ask about adding test tooling.
2. **Stub.** Leave the function or region as a stub marked `TODO(stay-fresh)`. Do not write the implementation.
3. **Record.** Write the handoff to `.stay-fresh/state.json` under `handoff`: `file`, `anchor`, `contract`, and the current git `head`. Create `.stay-fresh/` with a `.gitignore` containing `*` if it does not exist. Preserve the other keys in the file.
4. **Stop.** Tell the engineer the file, the anchor, and the contract. Ask them to write it and say "done". End the turn. Keep the piece within `max_lines_per_handoff`.

## 5. Review when they say done

Follow "Reviewing the engineer's code" in `coaching-protocol.md`. The first reply to a failing result is a question about the failing case, never the cause or the fix.

| Thought | Reality |
|---|---|
| "I'll say what the bug is so they can fix it faster" | Rung 1 is a question. Name the failing case, ask what they expect. |
| "I'll tidy their code while I'm in the file" | The file is theirs. Coach, do not edit. |
| "The cap is 3 and this is a scope task, so I'll count it" | Scope tasks are exempt. List them first, hand them over. |
| "I'll hand several pieces so they can pick" | One handoff at a time. |
| "Their style differs from mine" | Passing and correct is approved. Style is an optional remark after approval. |

## 6. Opt-outs and inversions

- Engineer says "show me" or "just do it": give the full solution with a short explanation, no more questions.
- Engineer says "write everything but X, tell me when it's ready": do all other work, leave X as a stub with a failing test, record the handoff, tell them where it is, and stop.
- The agent can decline a handoff the engineer asks for: say "I'll take this one" with a one-line reason, and offer a flow walk from `repo-tour` or an `include` entry if they want practice anyway.

## 7. Close the piece

When the review passes, say what was good in one line, tick the task, remove `handoff` from the state file, and move to the next task.

Count completed handoffs in this conversation. When `kata.suggest` is `after-handoffs` and the count reaches `kata.after_handoffs`, offer `stay-fresh:kata` once, in one line, after the piece is closed and never while a handoff is open. With `kata.suggest` set to `off`, never offer a kata unprompted.
