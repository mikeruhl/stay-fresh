# Pivotal selection

Decides which work goes to the engineer and which stays with the agent.

## The test

A piece is handed to the engineer only if it contains a decision: a domain rule, branching or recursion, an invariant, an error path, concurrency, or security-relevant behavior. Anything the engineer's `scope` covers is also offered.

## Kept with the agent by default

- Adding properties or fields, DTOs and POCOs, getters and setters
- Class or interface scaffolding, including enterprise Java and C# layering: controllers, services, repositories, mappers
- Dependency injection wiring, annotations and attributes
- Config and build files, generated code
- Renames and other mechanical refactors
- Test fixtures and test boilerplate

## Mixed tasks

The agent writes the scaffolding and hands only the decision-bearing slice. Example: the agent scaffolds a service class, the engineer writes the method body that applies the business rule.

## Building the split plan

1. Rank tasks by how much decision they contain.
2. Put tasks touching `scope` first. They are exempt from `max_handoffs_per_run`.
3. Assign from the top until the estimated `share` is met or `max_handoffs_per_run` is reached. `share` is a heuristic: pivotal ranking and `max_lines_per_handoff` win over it. If few tasks are pivotal, the engineer gets fewer asks and the plan says so.
4. Name tasks deferred to the agent because of the cap, with the reason.
5. Give one reason per task, for both assignments.
6. Show the plan for approval only when 2 or more tasks go to the engineer. With 0 or 1, announce the single handoff when it arrives.

The engineer can move any task either way.

## Tuning

`exclude` and `include` take task-text keywords and path globs and override the defaults above. When the engineer says a kind of work is not worth their time, offer to record it as an `exclude`. When they want to keep a simple flow fresh, an `include` opts that kind back in.

## Flow walk

Simple work still has value for refamiliarizing with a flow. `repo-tour` supports a flow walk: trace a simple request path end to end, from entry point to persistence, even when no decision is involved. Offer it when the engineer includes boilerplate on purpose.
