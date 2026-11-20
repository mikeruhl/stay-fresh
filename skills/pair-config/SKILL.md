---
name: pair-config
description: Use when the engineer wants to change how much they write versus the agent, turn stay-fresh on or off, tune which work counts as boilerplate, save a test command, or see their current stay-fresh settings.
---

# Pair config

Edit stay-fresh settings conversationally. The schema is `${CLAUDE_PLUGIN_ROOT}/shared/config-schema.md`. Read it first. Use only the keys it lists.

## Which file

| Setting | File |
|---|---|
| Personal preferences: `enabled`, `share`, `max_lines_per_handoff`, `max_handoffs_per_run`, `scope`, `exclude`, `include`, `review_depth`, `kata.*`, `tour.*` | User file `~/.claude/stay-fresh.json` |
| Facts about this repo or team defaults: `test_command`, `integrations` | Project file `.stay-fresh.json` in the repo root |

Say which file you are changing and that the project file can be committed while the user file is private.

## Procedure

1. Read both files, if they exist. Treat a missing file as `{}`.
2. Merge the change into the existing JSON. Keep every other key. Write with 2-space indentation.
3. Validate the value against the schema before writing:
   - `share`: `"pivotal"` or a number from 0 to 100
   - `max_lines_per_handoff` and `max_handoffs_per_run`: positive whole numbers
   - `enabled`: true or false
   - `review_depth`: `"coach"` or `"quick"`
   - `kata.suggest` and `tour.suggest`: values listed in the schema
   An invalid value is not written. State the allowed range and ask for a valid value.
4. After writing, show the key, the old value, the new value, and the file.

## Common requests

- "Make me write less": lower `share` and/or `max_handoffs_per_run` in the user file. Propose concrete numbers and say what they change.
- "Turn it off": set `"enabled": false` in the user file. Mention `STAY_FRESH=off` as the switch for a single session.
- "Never hand me X": propose adding a keyword or glob to `exclude` and write it only after the engineer says yes.
- "I want to practice X": the same, using `include`.
- "The tests run with `<command>`": save it as `test_command` in the project file and say it can be committed.
- "Show my settings": read both layers and show the effective values. For every value that differs from the schema default, say which layer it came from.

## Gitignore

The `.stay-fresh/` state directory contains its own `.gitignore` that ignores everything in it. If the engineer asks whether to add it to the repo's `.gitignore`, explain that and make no edit. `.stay-fresh.json` is a normal file and is meant to be committable.
