---
name: pair-config
description: Use when the engineer wants to change how much they write versus the agent, turn stay-fresh on or off, tune which work counts as boilerplate, save a test command, or see their current stay-fresh settings.
---

# Pair config

Edit stay-fresh settings conversationally. The schema is `${CLAUDE_PLUGIN_ROOT}/shared/config-schema.md`. Read it first. Use only the keys it lists.

## Which file

| Setting | File |
|---|---|
| Personal preferences: `enabled`, `max_lines_per_handoff`, `exclude`, `include`, `kata.*`, `tour.*`, `integrations` | User file `~/.claude/stay-fresh.json` |
| Facts about this repo or team defaults: `test_command` | Project file `.stay-fresh.json` in the repo root |

Say which file you are changing and that the project file can be committed while the user file is private. `integrations` only take effect from the user file.

## Procedure

1. Read both files, if they exist. Treat a missing file as `{}`.
2. Merge the change into the existing JSON. Keep every other key. Write with 2-space indentation.
3. Validate the value against the schema before writing:
   - `max_lines_per_handoff`: a positive whole number
   - `enabled`: true or false
   - `kata.suggest` and `tour.suggest`: values listed in the schema
   - `integrations[].prompt`: a regular expression that starts with `^`
   An invalid value is not written. State the allowed values and ask for a valid one.
4. After writing, show the key, the old value, the new value, and the file.

## Common requests

- "Turn it on": set `"enabled": true` in the user file so typed integration commands attach pair mode. Mention `STAY_FRESH=on` for a single session, and that `stay-fresh:pair-mode` can always be invoked directly.
- "Turn it off": set `"enabled": false` in the user file. Mention `STAY_FRESH=off` as the switch for a single session.
- "Make me write less": propose `exclude` entries for the kinds of work they want to skip, or a lower `max_lines_per_handoff`. Remind them "take the rest" ends handoffs for the current run.
- "Never hand me X": propose adding a keyword or glob to `exclude` and write it only after the engineer says yes.
- "I want to practice X": the same, using `include`.
- "The tests run with `<command>`": save it as `test_command` in the project file and say it can be committed.
- "Show my settings": read both layers and show the effective values. For every value that differs from the schema default, say which layer it came from.

## Gitignore

The `.stay-fresh/` state directory contains its own `.gitignore` that ignores everything in it, written by the skill that creates the directory. If the engineer asks whether to add it to the repo's `.gitignore`, explain that and make no edit. `.stay-fresh.json` is a normal file and is meant to be committable.
