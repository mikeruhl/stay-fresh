# stay-fresh config

Project file: `.stay-fresh.json` in the project root (safe to commit as team defaults).
User file: `~/.claude/stay-fresh.json`.
Load order: defaults, project file, user file. The user file wins. The individual always has the final say: no setting can be locked by a project file.

A missing file is fine. A file that exists but is not valid JSON makes the hook inject nothing until it is fixed, so a typo can never leave an off switch half working. The other layers still load.

## Fields

| Field | Default | Meaning |
|---|---|---|
| `enabled` | `false` | Attach pair mode automatically when a configured integration command is typed |
| `max_lines_per_handoff` | `30` | Upper bound on the size of one handoff |
| `exclude` | `[]` | Extra task keywords or path globs always kept by the agent |
| `include` | `[]` | Task keywords or path globs always offered to the engineer, overriding the built-in exclusions |
| `test_command` | unset | Command used to run tests during review. Inferred from the repo, or asked once and saved here |
| `kata.source` | `"repo"` | `"repo"` derives katas from the current repo, `"generic"` uses repo-independent katas |
| `kata.suggest` | `"off"` | `"off"` or `"after-handoffs"` |
| `kata.after_handoffs` | `3` | Completed handoffs before a kata nudge when `kata.suggest` is `"after-handoffs"` |
| `tour.suggest` | `"off"` | `"off"` or `"on-attach"` |
| `tour.max_questions` | `3` | Default length of a tour |
| `integrations` | SpecKit, OpenSpec | User file only. List of `{ id, prompt, tasks }`: `prompt` is a regular expression source that must start with `^`, `tasks` is an optional glob for the task file |

## Merge rules

- Objects deep-merge.
- `integrations` entries merge by `id`, field by field. To turn one off, set `{ "id": "speckit", "disabled": true }`. `integrations` in a project file are ignored, because trigger patterns run on every prompt.
- All other arrays and scalars are replaced.

## Turning attachment on and off

Attachment is off until one of these turns it on:

1. `"enabled": true` in the effective config (the user file decides when both files set it).
2. Environment variable `STAY_FRESH=on`, for one session. It also overrides the `CI` and unattended checks below.

Without attachment, invoke `stay-fresh:pair-mode` directly or ask to pair during any run.

Any one of these stops attachment:

1. `"enabled": false` in the effective config.
2. Environment variable `STAY_FRESH=off`. This is the guaranteed switch.
3. The phrase "skip pair mode" in the prompt.

The hook also stays silent when `CI` is set and when the session is unattended (`CLAUDE_CODE_SESSION_ATTENDED=0` or an `sdk` entrypoint, as in `claude -p`). It fails safe: any error means no injection. The hook never writes to the repo.

## Running a project `test_command`

A `test_command` that comes from the project file was written by whoever committed it. Show it to the engineer and get a yes before running it the first time in a conversation. A `test_command` from the user file or one the engineer just gave runs without asking.

## State file

`.stay-fresh/state.json` per repo, git-ignored by its own `.gitignore`. Shape:

```json
{
  "areas": { "<dir>": "2026-11-20" },
  "handoff": { "file": "", "anchor": "", "contract": "", "hash": "" }
}
```

`hash` is the content hash of `file` taken right after the agent wrote the stub and the failing test (`git hash-object <file>`, or a sha256 without git). The "done but unchanged" check compares against it.

`areas` is owned by `repo-tour`. `handoff` is owned by `pair-mode` and holds the open handoff. Writers preserve keys they do not own.
