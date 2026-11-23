---
name: pair-mode
description: Use when the engineer wants to write part of a change by hand, asks to pair program, or a stay-fresh hook says pair mode is attached to a task-runner command such as SpecKit implement or OpenSpec apply.
---

# Pair mode

Pair mode sits on top of whatever is driving the work: a framework's apply or implement skill, or a change the engineer described. That driver keeps its own task order, task file, and ticking. Pair mode only decides, task by task, whether the engineer writes a piece by hand. It never adds tasks or writes who owns what into a task file. Coaching is the default. The engineer can always ask for the answer.

Read before starting:
- `${CLAUDE_PLUGIN_ROOT}/shared/pivotal-selection.md` for what goes to the engineer
- `${CLAUDE_PLUGIN_ROOT}/shared/coaching-protocol.md` for the ladder and the review procedure
- `${CLAUDE_PLUGIN_ROOT}/shared/config-schema.md` for the state file and setting defaults

Settings this skill reads: `include`, `exclude`, `max_lines_per_handoff`, `test_command`, `tour.suggest`, `kata.suggest`, `kata.after_handoffs`. Take each from `~/.claude/stay-fresh.json`, else `.stay-fresh.json`, else the schema default.

If the engineer says "skip pair mode" at any point, stop using this skill and let the driver finish normally.

## 1. Announce

When the hook context contains a line starting `stay-fresh: pair-mode attached`, repeat it to the engineer as your first output, in one sentence, including that they can say "skip pair mode" to turn this off. The engineer cannot see hook context.

When `tour.suggest` is `on-attach`, offer a refresher in one line, for example "Want a 3-question refresher on `src/stock` first? Say 'skip' to go straight on." Do not wait for an answer: keep working in the same turn. Run `stay-fresh:repo-tour` only if they accept.

Then say in one line which upcoming tasks you expect to hand over, if any, so the engineer can move a task either way. No table and no approval step.

## 2. Follow the driver

Work the tasks in the driver's order, the way its own skill says to. Before implementing each task, apply the test in `pivotal-selection.md`:

- No decision: implement it as the driver normally would, including ticking it.
- A decision: hand it off (section 3) instead of implementing it. For a mixed task, write the scaffolding and hand off only the decision-bearing slice.

With no driver and no task file, use the work the engineer described. If neither exists, ask which work to split. Do not invent tasks.

## 3. Hand off one piece

1. **Contract.** If the repo has a test setup, write the failing test that expresses the contract and run it to confirm it fails for the right reason. Without a test setup, state a prose contract: inputs, outputs, and the cases that must hold. Do not ask about adding test tooling.
2. **Stub.** Leave the function or region as a stub marked `TODO(stay-fresh)`. Do not write the implementation.
3. **Record.** Write the handoff to `.stay-fresh/state.json` under `handoff`: `file`, `anchor`, `contract`, and `hash`, the output of `git hash-object <file>` taken after the stub and the failing test are written (a sha256 of the file when git is unavailable). Create `.stay-fresh/` with a `.gitignore` containing `*` if it does not exist. Preserve the other keys in the file.
4. **Stop.** Do not tick the task. Tell the engineer the file, the anchor, and the contract. Ask them to write it and say "done". End the turn. Keep the piece within `max_lines_per_handoff`.

## 4. Review when they say done

Follow "Reviewing the engineer's code" in `coaching-protocol.md`. The first reply to a failing result is a question about the failing case, never the cause or the fix.

| Thought | Reality |
|---|---|
| "I'll say what the bug is so they can fix it faster" | Rung 1 is a question. Name the failing case, ask what they expect. |
| "I'll tidy their code while I'm in the file" | The file is theirs. Coach, do not edit. |
| "I'll hand several pieces so they can pick" | One handoff at a time. |
| "I'll note the engineer's tasks in tasks.md" | The task file belongs to the driver. Ownership is only said in conversation. |
| "Their style differs from mine" | Passing and correct is approved. Style is an optional remark after approval. |

## 5. Opt-outs and inversions

- "show me" or "just do it": give the full solution with a short explanation, no more questions.
- "take the rest": finish the remaining tasks without further handoffs.
- "write everything but X, tell me when it's ready": do all other work, leave X as a stub with a failing test, record the handoff, tell them where it is, and stop.
- The agent can decline a handoff the engineer asks for: say "I'll take this one" with a one-line reason, and offer a flow walk from `repo-tour` or an `include` entry if they want practice anyway.

## 6. Close the piece

When the review passes, say what was good in one line, remove `handoff` from the state file, then tick the task as the driver would and continue with its next task.

Count completed handoffs in this conversation. When `kata.suggest` is `after-handoffs` and the count reaches `kata.after_handoffs`, offer `stay-fresh:kata` once, in one line, after the piece is closed and never while a handoff is open. With `kata.suggest` set to `off`, never offer a kata unprompted.
