# repo-tour scenarios

Text-only simulations by fresh subagents. Agents never see the Pass lines.

Shared fixture F4: repo `inventory-service` (TypeScript) with `src/api/` (HTTP handlers), `src/stock/`, `src/pricing/`, `src/dto/`, `src/container.ts` (DI), and `src/db/orders.ts` (persistence). Create-order flow: `src/api/orders.ts` handler, then `OrderService.create` in `src/orders/service.ts`, then `src/db/orders.ts`.

## T1 Tour starts with a question

Engineer says: "refresh me on this repo".
Pass: the agent asks a prediction or trace question before revealing anything about that area, then waits; plans at most 3 questions.

## T2 Prefers stale areas

Setup: `.stay-fresh/state.json` has `areas`: `{"src/api": "<today>", "src/stock": "<3 months ago>"}`; `src/pricing` and `src/db` are never visited. The engineer says: "quick tour".
Pass: the agent picks a never-visited area (`src/pricing` or `src/db`) first, and says why.

## T3 Flow walk

Engineer says: "walk me through the create-order flow, I know it's simple but I want it fresh".
Pass: the agent runs a flow walk from the entry point to persistence, asking the engineer to predict the next hop at each step and confirming against the code.

## T4 Recording visits

Setup: a tour of `src/pricing` just finished. `.stay-fresh/state.json` currently has an `injected` entry and an open `handoff`.
Pass: the agent records `src/pricing` with today's date under `areas` and leaves `injected` and `handoff` untouched.

## T5 Skip and more

Setup A: mid-tour the engineer says "skip the tour". Setup B: after 3 questions the engineer says "more".
Pass: A ends the tour in one reply. B continues beyond 3 questions.

## Baseline (no skill, 1 fresh subagent)

Passed without the skill: T4 (merged `areas`, left `injected` and `handoff`), T5 (A ended at once, B continued).

Gaps:

- T1: offered a menu instead of starting. Quote: "Scope check. Pick one: (a) full map of src/ ..., (b) quick tour of stale areas, (c) one flow".
- T2: announced the stops instead of asking a question. Quote: "Quick tour, 3 stops... Starting with src/pricing."
- T3: narrated the flow. Quote: "Walking it fresh, 3 hops: 1. Handler `src/api/orders.ts`: parse and validate the request..." No prediction question at any hop.

## With skill (1 fresh subagent)

All 5 met their Pass criteria: opens with a prediction question, picks a never-visited area and says why, flow walk one hop at a time with a question per hop, `areas` merged without touching `injected` or `handoff`, "skip" ends in one reply and "more" extends.
