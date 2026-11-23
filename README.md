# stay-fresh

A Claude Code plugin that keeps engineers writing code by hand while AI does most of the work.

The agent acts as a pair programmer. It builds the change, but hands you the pieces that contain real decisions, usually 20 to 30 lines at a time. You write and save them, say "done", and the agent reviews your code and coaches you to a good result. Katas and repo tours keep your skills and your mental map of the codebase current.

## Why

Skills decay without practice, and reviewing code is not a substitute for writing it. Engineers who only direct AI and read its output lose their feel for what good code looks like, and their reviews get shallower. stay-fresh keeps the writing in the loop. See [References](#references).

## Install

```
claude plugin marketplace add mikeruhl/stay-fresh
claude plugin install stay-fresh@stay-fresh
```

For local development: `claude --plugin-dir <path to this repo>`.

## Skills

| Skill | Use it to |
|---|---|
| `stay-fresh:pair-mode` | Write the decision-bearing pieces of a change by hand while the agent does the rest, one piece at a time, with coached review |
| `stay-fresh:kata` | Practice with a small exercise derived from your repo (or a classic) |
| `stay-fresh:repo-tour` | Refresh your map of the codebase with prediction and trace questions, or walk a flow end to end |
| `stay-fresh:pair-config` | Change how much you write, turn stay-fresh on or off, tune what counts as boilerplate, save a test command |

Coaching is the default: question, hint, pointed hint, worked sketch, then the full solution. You can jump to the solution at any point ("show me"), and the agent can decline a piece ("I'll take this one"). Say "write everything but X and tell me when it's ready" to invert the split.

Boilerplate stays with the agent by default: new properties, DTOs, class scaffolding, dependency injection wiring, config, generated code, mechanical refactors. You can opt any of it back in with `include`, for example to keep a simple flow fresh.

## With SpecKit, OpenSpec, or any task runner

Pair mode is optional and sits on top of the framework's own skill. The framework keeps its task order and its `tasks.md`. Pair mode only stops at tasks that contain a decision, hands them to you, and lets the framework tick them after your code passes review. Nothing about who writes what is added to the task file.

Two ways to use it:

1. **Per run:** invoke `/stay-fresh:pair-mode` or say "pair with me" alongside `/opsx:apply`, `/speckit-implement`, or any other run.
2. **Automatically:** set `"enabled": true` in `~/.claude/stay-fresh.json` (or `STAY_FRESH=on` for one session). A hook then attaches pair mode when you type one of these:

| Framework | Commands matched | Task file |
|---|---|---|
| SpecKit | `/speckit-implement`, `/speckit.implement` | `specs/*/tasks.md` |
| OpenSpec | `/opsx:apply`, `/openspec-apply`, `/openspec-apply-change` | `openspec/changes/*/tasks.md` |

Add your own command through `integrations` in your user config.

## Configuration

Settings live in `.stay-fresh.json` in the project root (safe to commit as team defaults) and `~/.claude/stay-fresh.json` (personal, wins over the project file). Every field is documented in [shared/config-schema.md](shared/config-schema.md). Ask `stay-fresh:pair-config` to change them for you.

Main settings: `enabled` (default false), `max_lines_per_handoff` (default 30), `exclude`, `include`, `test_command`, `kata.suggest`, `tour.suggest`.

## Turning attachment off

Any one of these stops automatic attachment:

1. `"enabled": false` in the effective config (the user file wins)
2. Environment variable `STAY_FRESH=off`
3. The phrase "skip pair mode" in the prompt

The hook also stays silent when `CI` is set and in unattended Claude Code sessions (`claude -p`, the SDK), so scripted runs never stop at a handoff. `STAY_FRESH=on` forces it on anyway. It fails safe: any error, or a config file that is not valid JSON, means no injection. The hook never writes to your repo.

## State

`.stay-fresh/` in your repo holds a small `state.json` (tour history and the open handoff) and katas. The skills create it with its own `.gitignore`, so nothing in it is committed.

## License

MIT. See [LICENSE](LICENSE).

## References

- [If you stop writing code, you also get worse at reviewing it](https://cekrem.github.io/posts/if-you-stop-writing-code-you-also-get-worse-at-reviewing-it/). The argument this plugin is built on.
- [Spec Kit](https://github.com/github/spec-kit)
- [OpenSpec](https://github.com/Fission-AI/OpenSpec)
