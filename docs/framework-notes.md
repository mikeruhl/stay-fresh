# Framework and Claude Code facts

Verified on 2026-11-20 with OpenSpec CLI 1.3.1, Spec Kit CLI (`specify`, current at that date), and Claude Code 2.1.329. Items are marked `install` (observed from a real `init` in a scratch directory) or `docs` (from code.claude.com).

## SpecKit

- `install`: `specify init --here --force --non-interactive --integration claude` (without `--non-interactive` it hangs on a prompt).
- `install`: Claude Code integration installs skills, not commands, under `.claude/skills/speckit-<name>/SKILL.md`: `speckit-analyze`, `speckit-checklist`, `speckit-clarify`, `speckit-constitution`, `speckit-converge`, `speckit-implement`, `speckit-plan`, `speckit-specify`, `speckit-tasks`, `speckit-taskstoissues`.
- `install`: typed as `/speckit-implement`. Older docs use the dot form `speckit.implement`, so matching accepts both.
- `install`: the code-producing step is `speckit-implement`. It runs `.specify/scripts/.../check-prerequisites` to resolve `FEATURE_DIR` and reads `tasks.md` from it. `speckit-converge` is the follow-up check.
- `install`: task file lives in the feature directory, `specs/<###-feature-name>/tasks.md`. Default glob: `specs/*/tasks.md`.
- `install`: task line format from `.specify/templates/tasks-template.md`: `- [ ] T001 [P] [US1] Description with path`. `[P]` marks parallel tasks, `[US1]` the user story. Done is `- [X]`.

## OpenSpec

- `install`: `openspec init --tools claude`.
- `install`: installs both slash commands under `.claude/commands/opsx/` (`/opsx:apply`, `/opsx:propose`, `/opsx:archive`, and others) and skills under `.claude/skills/openspec-<name>/SKILL.md` (`openspec-apply-change`, `openspec-propose`, `openspec-archive-change`, and others).
- `install`: the code-producing step is `/opsx:apply` (skill `openspec-apply-change`). Docs for later releases show `/openspec-apply-change`, so matching accepts all three forms.
- `install` and `docs`: task file is `openspec/changes/<name>/tasks.md`. Default glob: `openspec/changes/*/tasks.md`.
- `install`: the apply skill marks tasks `- [ ]` to `- [x]`. Task line format: `- [ ] 1.1 Description`.

## Default integrations

| id | prompt regex | tasks glob |
|---|---|---|
| `speckit` | `^/speckit[.-]implement\b` | `specs/*/tasks.md` |
| `openspec` | `^/(?:openspec[.-]apply(?:-change)?\|opsx:apply)\b` | `openspec/changes/*/tasks.md` |

## Claude Code hooks

- `docs`: plugin hooks file is `hooks/hooks.json` with a top-level `"hooks"` wrapper: `{ "hooks": { "<Event>": [ { "matcher": "...", "hooks": [ { "type": "command", "command": "node", "args": ["${CLAUDE_PLUGIN_ROOT}/hooks/attach.mjs"] } ] } ] } }`. Exec form (`command` plus `args`) avoids quoting problems with spaces in paths.
- `docs`: `UserPromptSubmit` ignores `matcher`. Stdin has `session_id`, `cwd`, `hook_event_name`, `prompt`. A typed `/skill args` arrives as typed, not expanded.
- `docs`: `PreToolUse` matcher filters on tool name; `Skill` is matchable when Claude invokes a skill (typed `/skill` bypasses `PreToolUse`). Stdin has `tool_name` and `tool_input`.
- `unverified`: the field in `tool_input` that names the skill is not documented. This is one reason the `PreToolUse` path was removed (see the self-review section below).
- `docs`: output is one JSON object on stdout with exit 0: `{ "hookSpecificOutput": { "hookEventName": "<Event>", "additionalContext": "<string>" } }`. For `UserPromptSubmit` plain-text stdout is also added as context. `additionalContext` is capped at 10,000 characters. For `PreToolUse` it appears next to the tool result. The docs advise writing it as factual statements rather than imperative system instructions.
- `docs`: exit 0 with no output means no effect. Exit 2 blocks, so the hook must never exit 2. Other nonzero codes are non-blocking.
- `docs`: `UserPromptExpansion` also exists with `command_name`, `command_args`, `prompt`, and fires for typed slash commands. Not used in v1 because `UserPromptSubmit` already receives the raw line.

## Claude Code plugin manifest

- `docs`: `.claude-plugin/plugin.json` requires only `name` (kebab-case, must not be a reserved Anthropic-like name). Useful fields: `version`, `description`, `author` (object with `name`), `homepage`, `repository`, `license` (SPDX), `keywords`.
- `docs`: default locations are `skills/<name>/SKILL.md` and `hooks/hooks.json`. Plugin skills are namespaced: `stay-fresh:pair-mode`.
- `docs`: `.claude-plugin/marketplace.json` requires `name`, `owner` (object with `name`), and `plugins` (each entry needs `name` and `source`; `source` is a path from the marketplace root such as `"./"`). Entry `name` must equal the manifest `name`.
- `docs`: install loop: `claude plugin marketplace add <owner>/<repo>` then `claude plugin install stay-fresh@<marketplace-name>`. Local development: `claude --plugin-dir <path>`.
- `docs`: `claude plugin validate <dir>` is the authoritative manifest and marketplace check.

## End-to-end results (2026-11-20)

Scratch repo outside this repo: `openspec init --tools claude`, one change `variant-stock` with three tasks (a property, a recursive check, a factory). Run: `claude -p "/opsx:apply variant-stock" --plugin-dir <this repo>` with Claude Code 2.1.329.

- Typed `/opsx:apply` reached `UserPromptSubmit` and attached pair mode. Evidence: an `injected` marker in `.stay-fresh/state.json`, and the agent split the tasks.
- Result with pair mode: the agent did the DTO property and factory itself, left `hasAvailableVariant` as a stub marked `TODO(stay-fresh)`, wrote a failing test file (6 of 6 failing), recorded `handoff` (file, anchor, contract, head) in state, showed the piece with file, anchor, contract and test command, offered "show me", and stopped. One engineer task, so no approval step.
- `.stay-fresh/` did not appear in `git status`: the directory's own `.gitignore` works.
- With `STAY_FRESH=off`: no marker, no `.stay-fresh/` directory, and the agent implemented all three tasks itself.
- Not exercised live: the agent-invoked path (`PreToolUse` on `Skill`) and the exact `tool_input` field name for the skill. The matcher tolerates `skill`, `name`, `command`, or the first string value, and is unit-tested. Typed commands remain the reliable path.
- Not exercised live: the `SessionStart` offers and the `CI` switch (both unit-tested).
- Open caveat for katas: whether jest discovers tests under `.stay-fresh/katas/` (a dot-directory) depends on the repo's jest config. The scratch repo used `node --test`, not jest.

## End-to-end results after the final review fixes (2026-11-20)

Same scratch repo, run with `STAY_FRESH=on` because `claude -p` is an unattended session and attach is now skipped there by default (`CLAUDE_CODE_SESSION_ATTENDED=0`, `CLAUDE_CODE_ENTRYPOINT=sdk-cli`; an interactive session has `1` and `cli`).

- The handoff record now includes `hash` (`git hash-object` of the stubbed file).
- Continuing the same session with "done" while the file was untouched: the agent compared the hash, reported "hasn't changed since the handoff", did not review, and left task 1.2 unticked.
- `claude -p` prints only the final message, so the relayed announcement is checked by simulation (scenario S15), not live.

## Changes from the self-review (2026-11-23)

The end-to-end results above predate these changes and describe the earlier hook.

- Attach is opt-in: `enabled` defaults to `false`. `STAY_FRESH=on` attaches for one session. Without attachment, `stay-fresh:pair-mode` is invoked directly.
- Only `UserPromptSubmit` is registered. `PreToolUse` on `Skill` was removed (unverified field name, fragile matching) and so was `SessionStart` (kata and tour offers are unrelated to attaching).
- The hook keeps no state and never writes to the repo. Session dedupe was removed: a typed command fires `UserPromptSubmit` once, and dedupe blocked a second run in the same session.
- `integrations` are read from the user file only, and prompt patterns must start with `^`. The root walk stops below the home directory.
- `pair-mode` no longer builds a split plan or owns the task loop. The framework skill keeps its order and ticking. Pair mode hands off decision-bearing tasks and holds the tick until review passes.
