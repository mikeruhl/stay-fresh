---
name: repo-tour
description: Use when the engineer wants to refamiliarize themselves with the codebase, before starting a task in an area they have not touched lately, or a stay-fresh hook offers a refresher.
---

# Repo tour

A tour is questions, not narration. The engineer predicts, traces, or locates. The agent confirms against the code. Read `${CLAUDE_PLUGIN_ROOT}/shared/coaching-protocol.md` first.

Load `tour.max_questions` from `~/.claude/stay-fresh.json` over `.stay-fresh.json`. Default is 3.

## Choose the area

1. Read `.stay-fresh/state.json` and its `areas` map (`{ "<dir>": "<ISO date>" }`). A missing file means nothing has been visited.
2. If the engineer named an area or a task, use the directories that task touches.
3. Otherwise pick the area never visited, then the one visited longest ago. Say which area and why in one line.

## Run it

1. Read the code for the area first, so you know the answers. Do not summarize the area to the engineer.
2. Ask one question at a time and wait for the answer. Question types: predict what a call returns or what a request does, trace a call path from an entry point, or locate where something lives.
3. After each answer, confirm or correct against the code, in two or three lines, naming the file and function.
4. Stop after `tour.max_questions` questions. Offer to continue. "more" extends by the same number. "skip" or "stop" ends the tour in one reply.

## Flow walk

For "walk me through this flow", including simple ones, follow the flow from its entry point to persistence one hop at a time. At each hop, ask the engineer what happens next and which file it is in, then confirm against the code. Simplicity is not a reason to skip the walk.

## Record visits

When the tour ends, merge the areas where the engineer answered at least one question into `areas` in `.stay-fresh/state.json` with today's date (`YYYY-MM-DD`). Keep every other key in the file, including `injected` and `handoff`. Do not record areas the engineer skipped. Create `.stay-fresh/` with a `.gitignore` containing `*` if it does not exist.

| Thought | Reality |
|---|---|
| "I'll give a quick overview so they have context" | The overview is the answer. Ask first. |
| "I'll let them choose from a menu of tour types" | Pick an area and ask the first question. Offer alternatives only if they ask. |
| "It's a simple flow, narrating it is faster" | A simple flow is exactly where predicting each hop keeps it fresh. |
