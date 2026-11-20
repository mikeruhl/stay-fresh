# pair-config scenarios

Text-only simulations by fresh subagents. Agents never see the Pass lines.

Shared fixture F2: repo `inventory-service` (TypeScript, `npm test`). No `.stay-fresh.json` in the repo. No `~/.claude/stay-fresh.json`. Config rules from `shared/config-schema.md` apply: user file `~/.claude/stay-fresh.json` over project file `.stay-fresh.json` over defaults.

## C1 Write less

Engineer says: "make me write less, the handoffs are too much".
Pass: the agent changes the personal user file (not the team-committed project file) and sets a lower `share` and/or `max_handoffs_per_run`; says which file and which values; the JSON is valid and within schema ranges.

## C2 Turn it off

Engineer says: "turn stay-fresh off".
Pass: sets `"enabled": false` in the user file, and mentions `STAY_FRESH=off` for a single session.

## C3 Exclude kind of work

Engineer says: "I don't care about mapper classes, never hand me those".
Pass: proposes `exclude: ["mapper"]` and asks before writing; writes only after a yes.

## C4 Gitignore question

Engineer says: "should I add .stay-fresh/ to my .gitignore?"
Pass: explains the directory ignores itself and no change is needed; does not edit `.gitignore`.

## C5 Invalid value

Engineer says: "set share to 150".
Pass: does not write 150; explains the range is 0 to 100 (or "pivotal") and asks for a valid value.

## C6 Show settings

Engineer says: "show my current settings".
Pass: reads both layers, shows effective values, and states which layer each non-default value came from.

## C7 Test command

Engineer says: "the unit tests run with pnpm test:unit, remember that".
Pass: saves `test_command: "pnpm test:unit"` in the project file `.stay-fresh.json` (repo-specific), and says it can be committed.

## Baseline (no skill, 1 fresh subagent)

Passed without the skill: C4 (explained the directory ignores itself), C5 (rejected 150, stated 0-100).

Gaps:

- C1, C2, C3, C6: invented the config location and keys. Quote: "Project config lives at `.stay-fresh/config.json`... Keys are `enabled`, `share` (integer 0-100) and `skip`", and used `skip: ["**/*Mapper*.ts"]` instead of `exclude`. Never chose between the user file and the project file.
- C6: "Running on defaults: enabled true, share 50 (assumed)". Invented the default.
- C7: "This is a project fact, not a stay-fresh setting, so I am recording it in the repo's `CLAUDE.md`". Did not save `test_command`.

## With skill (1 fresh subagent)

All 7 met their Pass criteria: personal settings in `~/.claude/stay-fresh.json`, `exclude` written only after a yes, `test_command` in the project `.stay-fresh.json`, 150 rejected with the 0-100 range, `.gitignore` left alone, settings shown from both layers. C1 asked for confirmation before writing, which is more cautious than the criteria require and was left as is.
