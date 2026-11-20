# stay-fresh config

Project file: `.stay-fresh.json` in the project root (safe to commit as team defaults).
User file: `~/.claude/stay-fresh.json`.
Load order: defaults, project file, user file. The user file wins. The individual always has the final say: no setting can be locked by a project file.

A missing file is fine. A file that exists but is not valid JSON makes the hooks inject nothing until it is fixed, so a typo can never leave an off switch half working. The other layers still load.

## Fields

| Field | Default | Meaning |
|---|---|---|
| `enabled` | `true` | Master switch for hooks and automatic attachment |
| `share` | `"pivotal"` | `"pivotal"`, or a number 0-100: a heuristic target for the percentage of the work the engineer writes |
| `max_lines_per_handoff` | `30` | Upper bound on the size of one handoff |
| `max_handoffs_per_run` | `3` | Cap on handoffs per attached run. Tasks touching `scope` are exempt |
| `scope` | `[]` | Paths or modules the engineer always owns |
| `exclude` | `[]` | Extra task keywords or path globs always kept by the agent |
| `include` | `[]` | Task keywords or path globs always offered to the engineer, overriding the built-in exclusions |
| `test_command` | unset | Command used to run tests during review. Inferred from the repo, or asked once and saved here |
| `review_depth` | `"coach"` | `"coach"` or `"quick"` |
| `kata.source` | `"repo"` | `"repo"` derives katas from the current repo, `"generic"` uses repo-independent katas |
| `kata.suggest` | `"off"` | `"off"`, `"after-handoffs"`, or `"session-start"` |
| `kata.after_handoffs` | `3` | Completed handoffs before a kata nudge when `kata.suggest` is `"after-handoffs"` |
| `tour.suggest` | `"on-attach"` | `"off"`, `"on-attach"`, or `"session-start"` |
| `tour.max_questions` | `3` | Default length of a tour |
| `integrations` | SpecKit, OpenSpec | List of `{ id, prompt, skill, tasks }`: `prompt` and `skill` are regular expression sources, `tasks` is a glob for the task file |

## Merge rules

- Objects deep-merge.
- `scope` from a later layer replaces the earlier value.
- `integrations` entries merge by `id`, field by field, and the later layer wins each field. To turn one off, set `{ "id": "speckit", "disabled": true }`. An entry with no `prompt` never matches typed commands, and one with no `skill` never matches agent-invoked skills.
- All other arrays and scalars are replaced.

## Turning the hooks off

Any one of these stops automatic attachment:

1. `"enabled": false` in either config file.
2. Environment variable `STAY_FRESH=off`. This is the guaranteed switch.
3. The phrase "skip pair mode" in the prompt that triggers the attach.

Hooks also stay silent when `CI` is set, and they fail open: any error means no injection.

## State file

`.stay-fresh/state.json` per repo, git-ignored by its own `.gitignore`. Shape:

```json
{
  "injected": { "<sessionId>|<triggerId>": 1700000000000 },
  "areas": { "<dir>": "2026-11-20" },
  "handoff": { "file": "", "anchor": "", "contract": "", "head": "" }
}
```

`injected` is owned by the hook and pruned after 24 hours. `areas` is owned by `repo-tour`. `handoff` is owned by `pair-mode` and holds the open handoff. Writers preserve keys they do not own.
