# stay-fresh design

Date: 2026-11-20
Repo: https://github.com/mikeruhl/stay-fresh (public)

## Intent and why

Engineers who direct AI and only review its output lose the feel for what good code looks like, and review quality drops with it. The source argument (https://cekrem.github.io/posts/if-you-stop-writing-code-you-also-get-worse-at-reviewing-it/) is that skill decays without practice and that reviewing is not a substitute for writing. Its remedy is to keep writing code by hand.

stay-fresh is a Claude Code plugin that keeps the engineer writing code by hand while the agent still does most of the work. The agent acts as a pair programmer. It hands the engineer small, pivotal pieces to write, coaches them to a good result, and keeps their map of the codebase current through katas and repo tours.

## Goals

1. The agent hands the engineer pivotal pieces of real work (target 20-30 lines each), states the contract, stops, and waits for "done".
2. The agent reviews the engineer's saved code and coaches. Coaching is the default and the engineer can always ask the agent to show or write the solution.
3. The split between engineer and agent is configurable, and either side can opt out of a piece ("I'll write this part", "skip this one").
4. The engineer can invert the split: "write everything but this part and tell me when it's ready".
5. Kata mode: short practice exercises, derived from the current repo by default.
6. Repo tour mode: short sessions that refamiliarize the engineer with parts of the codebase, prioritizing areas not visited recently.
7. Attach automatically to SpecKit and OpenSpec code-production commands, working at the level of the framework's `tasks.md`.
8. Hooks can be turned off at several levels, and fail open.

## Non-goals

- Replacing or modifying SpecKit or OpenSpec skills.
- Measuring or scoring the engineer, or reporting to a manager.
- Supporting agents other than Claude Code in v1.
- Teaching language fundamentals to beginners. The target is working engineers.

## Anti-goals

Failure even if it technically works:

- The engineer is nagged or blocked when they just want output. Off switches must be easy and honored.
- The agent rewrites the engineer's code instead of coaching.
- Handoffs are trivial (boilerplate, wiring, config) so the practice is meaningless.
- Handoffs are so large the engineer loses a day to a pairing prompt.
- A hook bug breaks the engineer's normal Claude Code usage.

## Constraints

- Claude Code plugin format. Skills are markdown. Hooks are dependency-free Node scripts that run on Windows and POSIX.
- No em dashes and sparse comments in anything shipped, matching the owner's conventions.
- SpecKit and OpenSpec command names drift (`/speckit-implement` vs `speckit.implement`, `/openspec-apply-change`, older `/opsx:*`). Matching must be tolerant and configurable.
- Neither framework generates code itself. Both produce a `tasks.md` and the agent implements from it. OpenSpec: `openspec/changes/<name>/tasks.md`, numbered grouped checklist (1.1, 1.2, 2.1). SpecKit task file location and format are not verified. The builder must inspect a real SpecKit repo before writing that adapter.
- Install locations of SpecKit and OpenSpec skills for Claude Code are unverified. The builder must confirm from a real install.
- Per the plugin authoring rules in the writing-skills skill: skill descriptions say only when to use the skill, never summarize its workflow.

## Approaches considered

| | A. One skill with modes | B. Several skills sharing one protocol | C. Hooks-driven nudges |
|---|---|---|---|
| Shape | One `stay-fresh` skill with handoff, kata, tour sections | `pair-mode`, `kata`, `repo-tour`, `pair-config`, plus a shared coaching protocol | Skills plus hooks that inject practice automatically |
| Pro | Simplest install | Precise triggers per intent, protocol written once | Practice happens without being asked |
| Con | Large file, vague trigger, modes bleed together | More files | Intrusive, harder to test |

Chosen by the owner: **B plus C**. Reason: B gives precise skill triggers, and C is required to piggyback on SpecKit and OpenSpec automatically.

## Decisions

### Plugin layout (builder may adjust paths)

```
.claude-plugin/plugin.json
.claude-plugin/marketplace.json
skills/pair-mode/SKILL.md
skills/kata/SKILL.md
skills/repo-tour/SKILL.md
skills/pair-config/SKILL.md
shared/coaching-protocol.md
shared/config-schema.md
hooks/hooks.json
hooks/attach.mjs
README.md
LICENSE
docs/superpowers/specs/
```

How skills reference `shared/` is left to the builder, subject to skills still working when loaded from the plugin cache.

### Skills

- `pair-mode`: the handoff workflow. Classify work as engineer or agent, hand off, wait, review via the coaching protocol. Handles the inverted split. Triggers on requests to pair, to write part of a change by hand, or when injected by the hook.
- `kata`: small exercises, derived from the current repo by default (its language, idioms, a self-contained function-sized problem with tests), generic on request. Reviewed via the coaching protocol.
- `repo-tour`: the agent asks the engineer to predict behavior, trace a call path, or locate where something lives, then confirms against the code. Prefers areas not visited recently. Records visits.
- `pair-config`: conversational setup that writes the config and toggles `enabled`.

### Coaching protocol (shared)

Ladder, in order: question, hint, pointed hint, worked sketch, full solution. The engineer can jump to any rung ("show me", "just do it"). The agent can decline a handoff at any time ("I'll take this one"). The agent reviews first and does not rewrite the engineer's file unless asked. Review reads the saved file, not a pasted snippet.

### Pivotal selection (defaults)

Test for a handoff: the piece contains a decision. Hand to the engineer: core logic, tricky invariants, domain rules, recursion or branching, error handling paths, concurrency, security-relevant code, anything the engineer's `scope` includes.

Always kept with the agent unless the engineer opts in: adding properties or fields, DTOs and POCOs, getters and setters, class or interface scaffolding (including enterprise Java and C# layering such as controllers, services, repositories, mappers), dependency injection wiring, annotations and attributes, config and build files, generated code, renames and other mechanical refactors, test fixtures and boilerplate.

Mixed tasks: the agent writes the scaffolding and hands only the decision-bearing slice (for example, a service class is scaffolded by the agent and the engineer writes the method body that applies the business rule).

Each line of the split plan states why a task was assigned to the engineer or kept by the agent. The engineer can move any task either way.

Tuning: `exclude` and `include` config fields take task-text keywords and path globs, and override the defaults. When the engineer says a kind of work is not worth their time, `pair-config` offers to record it as an `exclude`.

### Config

File: `.stay-fresh.json` in the project root (committable for team defaults), with a user-level override at `~/.claude/stay-fresh.json`. User override wins. Fields:

| Field | Default | Meaning |
|---|---|---|
| `enabled` | `true` | Master switch for hooks and automatic attachment |
| `share` | `"pivotal"` | `"pivotal"`, or a number 0-100 for the target percentage of code the engineer writes |
| `max_lines_per_handoff` | `30` | Upper bound per handoff |
| `scope` | `[]` | Paths or modules the engineer always owns |
| `exclude` | `[]` | Extra task keywords or path globs always kept by the agent |
| `include` | `[]` | Task keywords or path globs always offered to the engineer, overriding the built-in exclusions |
| `max_handoffs_per_run` | `3` | Cap on handoffs per attached run, `scope` tasks exempt |
| `test_command` | unset | Command used to run tests during review, inferred or asked once |
| `review_depth` | `"coach"` | `"coach"` or `"quick"` |
| `kata.source` | `"repo"` | `"repo"` or `"generic"` |
| `kata.suggest` | `"off"` | `"off"`, `"after-handoffs"`, or `"session-start"` |
| `kata.after_handoffs` | `3` | Completed handoffs before a kata nudge when `kata.suggest` is `"after-handoffs"` |
| `tour.suggest` | `"on-attach"` | `"off"`, `"on-attach"`, or `"session-start"` |
| `tour.max_questions` | `3` | Default length of a tour |
| `integrations` | SpecKit, OpenSpec | Table of trigger patterns mapped to a task-file glob |

### Hooks

- `UserPromptSubmit`: catches the engineer typing a configured trigger.
- `PreToolUse` with matcher `Skill`: catches the agent invoking a configured trigger.
- Both inject context telling the agent to run `pair-mode` for the framework's task list. The injected line is announced to the engineer in one sentence.
- Dedupe so the same trigger does not inject twice in one session.
- Fail open: any error, missing config or bad JSON results in no injection and exit 0.
- Off switches, any of which disables injection: `enabled: false`, env var `STAY_FRESH=off`, and the phrase "skip pair mode" in the prompt.
- Automatic off for non-interactive runs: env `CI` set, or other documented non-interactive signals. Detection is best effort and `STAY_FRESH=off` is the guaranteed switch.
- Exact hook input and output JSON schema must be confirmed against current Claude Code docs during the build.

### SpecKit and OpenSpec flow

1. Trigger detected, hook injects context.
2. If `tour.suggest` is `on-attach`, offer a short refresher on the modules the tasks touch, preferring areas not visited recently.
3. `pair-mode` reads the task file and proposes a split plan: which tasks are the engineer's and which are the agent's, using the pivotal criteria, `share` and `scope`. The engineer approves or edits it.
4. The agent implements its tasks. At each engineer task it states the contract, stops, then reviews the saved file with the coaching protocol.
5. Completed tasks are ticked in the task file as the framework's own skill would.
6. Spec Kit's `implement` and `converge` loop is untouched. Pair-mode applies on each pass.

### State

`.stay-fresh/state.json`, per repo, gitignored by the plugin's setup instructions. Holds area visit timestamps and dedupe markers. Kept per repo only in v1.

### Distribution

Public repo, MIT license (owner's call to confirm), installable as a Claude Code plugin through a marketplace file in the same repo.

## Calls made after builder review

1. **Stop and wait:** ending the agent's turn is the mechanism. The skill instructs one handoff at a time, never batched, and records the open handoff in state. No blocking hook in v1. The builder must test that agents reliably stop, and tighten skill wording before considering enforcement code.
2. **`share` as a number:** a heuristic, not a measured quantity. Pair-mode ranks tasks by pivotal-ness, then assigns tasks to the engineer from the top until the estimated share (by task count weighted by estimated lines) is met. Pivotal ranking and `max_lines_per_handoff` always win over `share`. If few tasks are pivotal, the engineer gets fewer than `share` asks and the plan says so.
3. **Handoff identity and "done":** each handoff is recorded in state with file path, an anchor (function or region), the contract, and the git HEAD at handoff time. The agent may leave a `TODO(stay-fresh)` stub. On "done" it reviews the diff since the recorded HEAD for that file, or the whole file if git is unavailable.
4. **Task to handoff mapping:** whole task when it is small. For a large task, the agent writes the surrounding stub and calls and the engineer fills a pivotal slice. A task is ticked in the task file only after its review passes.
5. **PreToolUse reliability:** `UserPromptSubmit` is the primary attach path. `PreToolUse` on `Skill` is best effort. If it cannot steer the framework skill, auto-attach for agent-invoked commands degrades to a one-line suggestion and the README says so.
6. **Dedupe:** keyed on `session_id` from hook input. Markers older than 24 hours are pruned on read.
7. **Matching:** trigger patterns are regular expressions. For `UserPromptSubmit` they are anchored to the start of the prompt. For `PreToolUse` they match `tool_input.skill`. The phrase "skip pair mode" is matched case-insensitively as a whole phrase in the prompt text.
8. **Config merge:** deep merge for objects. For `scope`, the user file replaces the project value. For `integrations`, entries merge by key with the user entry winning.
9. **`.gitignore`:** `pair-config` adds `.stay-fresh/` to `.gitignore` after asking the engineer. No hook writes into user repos.
10. **License:** MIT, confirmed by the owner.
11. **Flow familiarization:** simple work still has value for refamiliarizing with a flow. The `include` field opts any boilerplate kind back in, and `repo-tour` supports a "flow walk" that traces a simple request path end to end (entry point to persistence) even when no decision is involved.

## Decisions from the design grilling (all confirmed by the owner)

12. **Handoff cap:** at most `max_handoffs_per_run` (default 3) handoffs per attached run. The split plan names tasks deferred to the agent because of the cap and why. Tasks touching `scope` paths are exempt from the cap and are listed first.
13. **Approval friction:** the split plan is shown for approval only when 2 or more tasks are assigned to the engineer. With 0 or 1, the agent announces the single handoff inline when it arrives.
14. **No catch-all attach:** the hooks only fire on configured integrations. Any skill can still be invoked directly by name at any time, and a team can add framework commands to `integrations`.
15. **Non-interactive runs:** `attach.mjs` injects nothing when `CI` is set or other non-interactive signals are detected.
16. **Kata nudges:** katas stay opt-in. `kata.suggest` defaults to `"off"`. When enabled it nudges at most once per session and never during an open handoff.
17. **Test-first contract:** where a test setup is evident, the agent writes the failing test as the contract and the engineer writes the implementation. Otherwise the contract is prose. The agent never writes the handed-off implementation unless asked.
18. **Tests during review:** on "done" the agent runs the relevant tests when a command is evident, and coaches from failures. The command is inferred from the repo or task text (for example `package.json` scripts, `dotnet test`, Maven or Gradle files). If it cannot be inferred, the agent asks once and saves `test_command`. With no test command, review is by reading and the agent says so.
19. **Tour length:** at most `tour.max_questions` (default 3) questions. "more" extends and "skip" ends it at once.
20. **No locked settings:** team-committed `.stay-fresh.json` cannot lock settings. The individual always has the final say.
21. **Naming:** project name is `stay-fresh`. Config is `.stay-fresh.json`, user override `~/.claude/stay-fresh.json`, state dir `.stay-fresh/`, env var `STAY_FRESH`, stub marker `TODO(stay-fresh)`.

## Left to the builder

- Final directory layout and how skills read shared files.
- Exact hook JSON schema and registration.
- SpecKit task-file location and format, and the exact installed skill names for both frameworks.
- How "area" is defined for tour recency (directory, module, or git-derived).
- Kata generation heuristics and how to pick a function-sized problem from a repo.
- Testing approach for the skills (the writing-skills workflow applies) and for the hook script.
- README content.
