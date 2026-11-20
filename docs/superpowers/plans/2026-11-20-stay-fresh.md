# stay-fresh Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the stay-fresh Claude Code plugin: four pair-programming skills, shared coaching docs, and fail-open hooks that attach to SpecKit and OpenSpec task lists.

**Architecture:** Skills are markdown and carry the behavior. Hooks are a small dependency-free Node library (`config`, `matcher`, `state`) behind one entry script, `attach.mjs`, which injects context when a configured SpecKit or OpenSpec command is seen. Skills are verified with the writing-skills baseline-then-comply method. Hook code is verified with `node:test`.

**Tech Stack:** Node.js (built-in `node:test`, no dependencies), Markdown skills, Claude Code plugin format.

**Spec:** `docs/superpowers/specs/2026-11-20-stay-fresh-design.md`

## Global Constraints

- No em dash character and sparse comments in everything shipped.
- Hooks: dependency-free Node (ESM, `.mjs`), run on Windows and POSIX, always exit 0, fail open (any error means no output).
- Off switches that disable injection: `enabled: false`, env `STAY_FRESH=off`, phrase "skip pair mode" in the prompt.
- Config: `.stay-fresh/` is per repo; `.stay-fresh.json` in project root, user override at `~/.claude/stay-fresh.json`, user wins; objects deep-merge, `scope` replaced by user value, `integrations` merged by key with user entry winning.
- Config fields and defaults: `enabled: true`, `share: "pivotal"`, `max_lines_per_handoff: 30`, `scope: []`, `exclude: []`, `include: []`, `max_handoffs_per_run: 3`, `test_command` (unset), `review_depth: "coach"`, `kata.source: "repo"`, `kata.suggest: "off"`, `kata.after_handoffs: 3`, `tour.suggest: "on-attach"`, `tour.max_questions: 3`, `integrations`.
- Handoff rules: cap of `max_handoffs_per_run` with `scope` tasks exempt and listed first; split plan shown for approval only when 2 or more tasks go to the engineer; test-first contract when a test setup is evident; on "done" run tests when a command is evident or saved as `test_command`; no locked settings.
- `attach.mjs` injects nothing when env `CI` is set or other non-interactive signals are detected.
- State file `.stay-fresh/state.json`: `{ "injected": { "<sessionId>|<triggerId>": <epochMs> }, "areas": { "<dir>": "<ISO date>" } }`. Dedupe markers older than 24 hours are pruned. Writers must preserve keys they do not own.
- Skill `description` fields start with "Use when" and state triggers only, never the workflow.
- Bundled scripts are invoked through their interpreter in prose (`node hooks/attach.mjs`), never by bare path.
- License MIT. Do not push to GitHub without the owner asking.

## Review Focus

1. Trigger text inside ordinary prose ("explain /speckit-implement") must not inject.
2. Malformed or empty hook stdin, invalid config JSON, or an unwritable state directory must produce no output and exit 0.
3. Attached to a framework command but the task file is missing: pair-mode says so and asks which work to split, instead of inventing tasks.
4. Engineer says "done" but the file is unchanged since the handoff: the agent reports no change and does not review.
5. Engineer's code is correct but written differently from what the agent would write: not treated as a defect.
6. Project paths containing spaces on Windows.

---

## File Structure

```
.claude-plugin/plugin.json
.claude-plugin/marketplace.json
package.json
LICENSE
.gitignore
README.md
docs/framework-notes.md
hooks/hooks.json
hooks/attach.mjs
hooks/lib/config.mjs
hooks/lib/matcher.mjs
hooks/lib/state.mjs
hooks/test/*.test.mjs
shared/coaching-protocol.md
shared/pivotal-selection.md
shared/config-schema.md
skills/pair-mode/SKILL.md
skills/pair-config/SKILL.md
skills/kata/SKILL.md
skills/repo-tour/SKILL.md
tests/scenarios/<skill>.md
```

---

### Task 1: Plugin scaffold

**Files:**
- Create: `LICENSE`, `package.json`, `.gitignore`, `.claude-plugin/plugin.json`, `.claude-plugin/marketplace.json`
- Test: `hooks/test/manifest.test.mjs`

**Interfaces:**
- Produces: package script `npm test` running `node --test`; plugin name `stay-fresh`.

- [ ] **Step 1: Write the failing test** `manifest.test.mjs`: parses both manifests as JSON and asserts `plugin.name === "stay-fresh"`, `plugin.license === "MIT"`, the marketplace lists one plugin named `stay-fresh`, `package.json` has `"type": "module"`, and `LICENSE` starts with `MIT License`.
- [ ] **Step 2: Run** `node --test`. Expected: FAIL (files missing).
- [ ] **Step 3: Create the files.** `LICENSE`: MIT, 2026, Mike Ruhl. `package.json`: private, type module, `scripts.test` as above. `.gitignore`: `.stay-fresh/`, `node_modules/`. Manifest field names must follow the schema recorded in Task 2 (`docs/framework-notes.md`), so do Task 2 step 4 first if the schema is unknown.
- [ ] **Step 4: Run** `node --test`. Expected: PASS.
- [ ] **Step 5: Commit** `feat: scaffold plugin manifests and license`.

### Task 2: Verify framework and Claude Code facts

**Files:**
- Create: `docs/framework-notes.md`

**Interfaces:**
- Produces: for each of SpecKit and OpenSpec, the exact Claude Code command and skill names, the install directory, the task file path glob, and a sample task line. Also the plugin manifest and marketplace schema and the hook input and output JSON for `UserPromptSubmit` and `PreToolUse` (including how `additionalContext` is returned). Tasks 3 to 6 and 12 consume these values.

- [ ] **Step 1: Check CLIs.** In a new empty directory outside this repo (for example under the OS temp dir), run `specify --help` and `openspec --version`. Record which are installed.
- [ ] **Step 2: Inspect real installs.** If a CLI exists, run its `init` for Claude Code in that empty directory and list the generated command or skill files and the task file template. If not, read the upstream docs (`github/spec-kit`, `Fission-AI/OpenSpec`, linked docs pages) with WebFetch.
- [ ] **Step 3: Read current Claude Code docs** for plugin manifests, marketplace files, and hook input and output schema.
- [ ] **Step 4: Write `docs/framework-notes.md`** with sections `SpecKit`, `OpenSpec`, `Claude Code hooks`, `Claude Code plugin manifest`. Mark every item as verified-from-install or from-docs.
- [ ] **Step 5: Verify** each section exists and no item is marked unknown without a note on how to resolve it. Commit `docs: record framework and hook facts`.

### Task 3: Config loader

**Files:**
- Create: `hooks/lib/config.mjs`
- Test: `hooks/test/config.test.mjs`

**Interfaces:**
- Produces: `export const DEFAULTS` (Global Constraints fields; `integrations` entries from Task 2) and `export function loadConfig({ projectDir, homeDir }): Config`. An integration is `{ id: string, prompt: string, skill: string, tasks: string }` where `prompt` and `skill` are regular expression sources and `tasks` is a glob.

- [ ] **Step 1: Write failing tests** `config.test.mjs`, each using temp dirs:
  - no files: `loadConfig(...)` deep-equals `DEFAULTS`
  - project file `{ "share": 40 }` gives `share === 40` and other defaults intact
  - user file overrides project file for `max_lines_per_handoff`
  - `scope`: user `["a"]` over project `["b"]` yields `["a"]`
  - `integrations`: project adds `{id:"x"}`, user redefines `id:"speckit"`; result has `x` and the user's `speckit`
  - invalid JSON in either file is ignored and yields the other layers
  - `projectDir` containing spaces works
  - defaults include `max_handoffs_per_run === 3`, `kata.suggest === "off"`, `kata.after_handoffs === 3`, `tour.max_questions === 3`, and `test_command` undefined
- [ ] **Step 2: Run** `node --test hooks/test/config.test.mjs`. Expected: FAIL.
- [ ] **Step 3: Implement** the loader in `hooks/lib/config.mjs`. Merge order: defaults, project, user.
- [ ] **Step 4: Run** the test file. Expected: PASS.
- [ ] **Step 5: Commit** `feat: add config loader`.

### Task 4: Trigger matcher

**Files:**
- Create: `hooks/lib/matcher.mjs`
- Test: `hooks/test/matcher.test.mjs`

**Interfaces:**
- Consumes: `Integration[]` from Task 3.
- Produces: `matchPrompt(prompt: string, integrations: Integration[]): Integration | null` (patterns tested against the trimmed prompt, anchored to its start), `matchSkill(skillName: string, integrations: Integration[]): Integration | null` (pattern matches the whole name or the part after a `plugin:` prefix), `hasSkipPhrase(prompt: string): boolean`.

- [ ] **Step 1: Write failing tests** with the default integrations:
  - `matchPrompt("/speckit-implement")` and `("/speckit.implement now")` match id `speckit`
  - `matchPrompt("/openspec-apply-change my-change")` matches id `openspec`
  - `matchPrompt("please explain /speckit-implement")` is `null`
  - `matchSkill("speckit-implement")` matches, `matchSkill("superpowers:brainstorming")` is `null`
  - `hasSkipPhrase("Skip Pair Mode please")` is true, `hasSkipPhrase("skipping pairs")` is false
- [ ] **Step 2: Run** the file. Expected: FAIL.
- [ ] **Step 3: Implement** in `hooks/lib/matcher.mjs`. Invalid regex sources in config are skipped, not thrown.
- [ ] **Step 4: Run** the file. Expected: PASS.
- [ ] **Step 5: Commit** `feat: add trigger matcher`.

### Task 5: Dedupe state

**Files:**
- Create: `hooks/lib/state.mjs`
- Test: `hooks/test/state.test.mjs`

**Interfaces:**
- Produces: `shouldInject({ stateDir: string, sessionId: string, triggerId: string, now?: number }): boolean`. Returns true and records a marker the first time a `sessionId|triggerId` pair is seen, false afterwards, false on any I/O error. Prunes markers older than 24 hours. Preserves the `areas` key.

- [ ] **Step 1: Write failing tests:** first call true; repeat false; other session true; other trigger true; `now` 25 hours later for the same pair is true; an existing `areas` entry survives a call; a `stateDir` that cannot be created (path under a regular file) returns false.
- [ ] **Step 2: Run** the file. Expected: FAIL.
- [ ] **Step 3: Implement** in `hooks/lib/state.mjs`, reading and writing `<stateDir>/state.json`.
- [ ] **Step 4: Run** the file. Expected: PASS.
- [ ] **Step 5: Commit** `feat: add dedupe state`.

### Task 6: Hook entry and registration

**Files:**
- Create: `hooks/attach.mjs`, `hooks/hooks.json`
- Test: `hooks/test/attach.test.mjs`

**Interfaces:**
- Consumes: `loadConfig`, `matchPrompt`, `matchSkill`, `hasSkipPhrase`, `shouldInject`.
- Produces: `node hooks/attach.mjs` reads hook JSON on stdin (`hook_event_name`, `session_id`, `cwd`, `prompt` or `tool_name` and `tool_input`), and writes the output shape recorded in `docs/framework-notes.md` with `additionalContext` containing: the line `stay-fresh: pair-mode attached to <id>. Say "skip pair mode" to turn this off.`, the task glob, and an instruction to invoke the `pair-mode` skill. `hooks/hooks.json` registers `UserPromptSubmit` and `PreToolUse` (matcher `Skill`) running `node "${CLAUDE_PLUGIN_ROOT}/hooks/attach.mjs"`.

- [ ] **Step 1: Write failing tests** using `spawnSync` with a temp `cwd`:
  - prompt `/speckit-implement` yields JSON whose context includes `pair-mode` and the SpecKit task glob, exit 0
  - same input with `STAY_FRESH=off` in env: empty stdout, exit 0
  - `.stay-fresh.json` with `enabled:false`: empty stdout
  - prompt `/speckit-implement skip pair mode`: empty stdout
  - stdin `not json` and empty stdin: empty stdout, exit 0
  - `PreToolUse` with `tool_input.skill = "openspec-apply-change"` injects with the event name `PreToolUse`
  - identical second call with the same `session_id`: empty stdout
  - non-trigger prompt: empty stdout
  - env `CI=true`: empty stdout, exit 0
  - `cwd` containing spaces works
- [ ] **Step 2: Run** the file. Expected: FAIL.
- [ ] **Step 3: Implement** `attach.mjs` (wrap everything in try/catch that exits 0 silently) and `hooks.json`, following the verified schema from Task 2.
- [ ] **Step 4: Run** `npm test`. Expected: PASS.
- [ ] **Step 5: Commit** `feat: add attach hook`.

### Task 7: Shared protocol docs

**Files:**
- Create: `shared/coaching-protocol.md`, `shared/pivotal-selection.md`, `shared/config-schema.md`
- Test: `hooks/test/docs.test.mjs`

**Interfaces:**
- Produces: documents the skills read. `coaching-protocol.md`: the ladder (question, hint, pointed hint, worked sketch, full solution), engineer jump-to-any-rung, agent opt-out, review-first-never-rewrite, review from the saved file. `pivotal-selection.md`: the decision test, the default exclusion list, mixed-task rule, per-line reasons in the split plan, `include`/`exclude` tuning, the flow-walk note. `config-schema.md`: every config field, default, and merge rule.

- [ ] **Step 1: Write the failing test** `docs.test.mjs`: every key of `DEFAULTS` (and `kata.source`, `tour.suggest`) appears in `shared/config-schema.md`; `coaching-protocol.md` contains each of the five rung names; no shipped markdown or `.mjs` file contains the em dash character.
- [ ] **Step 2: Run** the file. Expected: FAIL.
- [ ] **Step 3: Write the three documents** from the design doc sections "Coaching protocol", "Pivotal selection", and "Config".
- [ ] **Step 4: Run** `npm test`. Expected: PASS.
- [ ] **Step 5: Commit** `docs: add shared coaching, selection, and config docs`.

### Task 8: pair-mode skill

**Files:**
- Create: `skills/pair-mode/SKILL.md`, `tests/scenarios/pair-mode.md`

**Interfaces:**
- Consumes: `shared/*.md`, config schema, state schema.
- Produces: skill `pair-mode`. Description: "Use when the engineer wants to write part of a change by hand, asks to pair program, or a stay-fresh hook attached to a SpecKit or OpenSpec task list."

- [ ] **Step 1: Write scenarios** in `tests/scenarios/pair-mode.md`, each with a fixture prompt and pass criteria:
  1. A three-task `tasks.md` where one task is a recursive check requiring at least one entry true: pass if the agent proposes a split plan with a reason per line, hands only that task, states the contract, and ends its turn without writing the code.
  2. A task that only adds a property to a DTO: pass if kept by the agent.
  3. Engineer replies "show me": pass if the agent gives the full solution without further coaching.
  4. Engineer says "done" with the file unchanged since the handoff (Review Focus 4): pass if the agent reports no change and does not review.
  5. "Write everything but the validation method": pass if the agent writes all else, leaves a `TODO(stay-fresh)` stub, and stops.
  6. Engineer's correct but differently styled solution (Review Focus 5): pass if accepted without style objections.
  7. Attached with no task file (Review Focus 3): pass if the agent says so and asks which work to split.
  8. Agent opt-out: engineer asks to be handed a task the agent judges unsuitable, and the agent may say "I'll take this one" with a reason.
  9. Six pivotal tasks, none in `scope`: pass if at most 3 are handed over and the plan names the deferred ones with reasons. With one task touching a `scope` path added, pass if it is handed over in addition and listed first.
  10. Exactly one pivotal task: pass if no approval gate is shown and the handoff is announced inline. Two or more: pass if the plan is shown for approval.
  11. Repo with a test setup: pass if the contract is a failing test the agent wrote and the agent does not write the implementation. Repo with no test setup: pass if the contract is prose.
  12. Engineer says "done": pass if the agent runs the evident test command and coaches from a failing test without giving the answer. With no inferable command: pass if the agent asks once for the command and saves `test_command`, or reviews by reading and says so.
- [ ] **Step 2: Baseline.** Run each scenario with a fresh subagent without the skill. Record behaviors and rationalizations verbatim in the scenarios file under `Baseline`.
- [ ] **Step 3: Write `SKILL.md`** addressing the recorded failures. Use prohibition plus rationalization table only where the baseline shows rule-skipping (stopping at handoffs, rewriting engineer code); use a recipe form for the split plan and handoff contract shape. Handoff records go in state with file, anchor, contract, and HEAD.
- [ ] **Step 4: Re-run** all scenarios with the skill. Expected: every pass criterion met. Record results under `With skill`.
- [ ] **Step 5: Refactor.** Add counters for any new rationalization and re-run failing scenarios until they pass. Commit `feat: add pair-mode skill`.

### Task 9: pair-config skill

**Files:**
- Create: `skills/pair-config/SKILL.md`, `tests/scenarios/pair-config.md`

**Interfaces:**
- Consumes: `shared/config-schema.md`, `loadConfig`.
- Produces: skill `pair-config`. Description: "Use when the engineer wants to change how much they write versus the agent, turn stay-fresh on or off, or tune which work counts as boilerplate."

- [ ] **Step 1: Write scenarios:** "make me write less" results in a lower `share` in `.stay-fresh.json`; "turn stay-fresh off" sets `enabled:false`; "I don't care about mapper classes" offers an `exclude` and writes it only on yes; the skill asks before editing `.gitignore` and adds `.stay-fresh/` only on yes; written files load without error through `loadConfig`.
- [ ] **Step 2: Baseline** with a fresh subagent without the skill; record behavior.
- [ ] **Step 3: Write `SKILL.md`.**
- [ ] **Step 4: Re-run** scenarios and run `node -e` against the produced file with `loadConfig` to confirm it parses. Expected: all pass.
- [ ] **Step 5: Commit** `feat: add pair-config skill`.

### Task 10: kata skill

**Files:**
- Create: `skills/kata/SKILL.md`, `tests/scenarios/kata.md`

**Interfaces:**
- Consumes: `shared/coaching-protocol.md`, config `kata.source`.
- Produces: skill `kata`. Description: "Use when the engineer asks for a coding kata or practice exercise, or wants to warm up by writing code by hand."

- [ ] **Step 1: Write scenarios** against a small fixture repo: default produces a self-contained function-sized problem in the repo's language and idioms with a failing test file, without the solution; a wrong submission gets coaching, not the answer; "show me" gives the solution; `kata.source: generic` or an explicit request gives a repo-independent kata; the agent tells the engineer where to save and waits; with `kata.suggest: "after-handoffs"` and 3 completed handoffs it offers a kata once per session and never during an open handoff; with `kata.suggest: "off"` it never offers one unprompted.
- [ ] **Step 2: Baseline** without the skill; record behavior.
- [ ] **Step 3: Write `SKILL.md`.**
- [ ] **Step 4: Re-run** scenarios. Expected: all pass criteria met.
- [ ] **Step 5: Commit** `feat: add kata skill`.

### Task 11: repo-tour skill

**Files:**
- Create: `skills/repo-tour/SKILL.md`, `tests/scenarios/repo-tour.md`

**Interfaces:**
- Consumes: state `areas` map (`{ "<dir>": "<ISO date>" }`), `shared/coaching-protocol.md`, config `tour.suggest`.
- Produces: skill `repo-tour`. Description: "Use when the engineer wants to refamiliarize themselves with the codebase, before starting a task in an area they have not touched lately, or a stay-fresh hook offers a refresher."

- [ ] **Step 1: Write scenarios:** the agent asks a prediction or trace question before revealing the answer and then confirms against the code; with `areas` containing a recent and a never-visited directory it picks the never-visited one; a flow walk traces a simple request path from entry point to persistence even with no decision involved; after the tour it records visited directories in `.stay-fresh/state.json` without removing `injected`; "skip the tour" is honored in one reply; a default tour asks at most 3 questions, "more" extends it, and `tour.max_questions` changes the default.
- [ ] **Step 2: Baseline** without the skill; record behavior.
- [ ] **Step 3: Write `SKILL.md`.**
- [ ] **Step 4: Re-run** scenarios; check the state file still has its `injected` key after a tour. Expected: all pass.
- [ ] **Step 5: Commit** `feat: add repo-tour skill`.

### Task 12: Docs and end-to-end check

**Files:**
- Create: `README.md`
- Modify: `docs/framework-notes.md` (append the results of the end-to-end run)

**Interfaces:**
- Consumes: all prior tasks.

- [ ] **Step 1: Write `README.md`:** purpose and a References section linking https://cekrem.github.io/posts/if-you-stop-writing-code-you-also-get-worse-at-reviewing-it/ (the source article, requested by the owner), install via the marketplace file, the four skills, config reference link, the three off switches, SpecKit and OpenSpec attach behavior including the best-effort `PreToolUse` caveat from design call 5, license.
- [ ] **Step 2: Sandbox run.** In a scratch repo outside this one, create an OpenSpec-style change with a `tasks.md` of three tasks, install the plugin from this directory, type the apply command, and confirm: announcement line appears, split plan with reasons, one handoff, turn ends. Repeat with `STAY_FRESH=off` and with "skip pair mode". Record results in `docs/framework-notes.md`.
- [ ] **Step 3: Run** `npm test`. Expected: all PASS.
- [ ] **Step 4: Commit** `docs: add README and end-to-end results`. Ask the owner before pushing to `origin`.
