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

| id | prompt regex | skill regex | tasks glob |
|---|---|---|---|
| `speckit` | `^/speckit[.-]implement\b` | `^(?:[\w-]+:)?speckit[.-]implement$` | `specs/*/tasks.md` |
| `openspec` | `^/(?:openspec[.-]apply(?:-change)?\|opsx:apply)\b` | `^(?:[\w-]+:)?openspec-apply-change$` | `openspec/changes/*/tasks.md` |

## Claude Code hooks

- `docs`: plugin hooks file is `hooks/hooks.json` with a top-level `"hooks"` wrapper: `{ "hooks": { "<Event>": [ { "matcher": "...", "hooks": [ { "type": "command", "command": "node", "args": ["${CLAUDE_PLUGIN_ROOT}/hooks/attach.mjs"] } ] } ] } }`. Exec form (`command` plus `args`) avoids quoting problems with spaces in paths.
- `docs`: `UserPromptSubmit` ignores `matcher`. Stdin has `session_id`, `cwd`, `hook_event_name`, `prompt`. A typed `/skill args` arrives as typed, not expanded.
- `docs`: `PreToolUse` matcher filters on tool name; `Skill` is matchable when Claude invokes a skill (typed `/skill` bypasses `PreToolUse`). Stdin has `tool_name` and `tool_input`.
- `unverified, tolerate`: the field in `tool_input` that names the skill is not documented. `attach.mjs` checks `tool_input.skill`, `tool_input.name`, `tool_input.command`, then any string value. Confirm empirically in the end-to-end task.
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
