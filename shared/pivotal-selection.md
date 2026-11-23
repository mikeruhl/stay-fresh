# Pivotal selection

Decides, per task, whether the engineer writes it by hand or the agent does.

## The test

A piece is handed to the engineer only if it contains a decision: a domain rule, branching or recursion, an invariant, an error path, concurrency, or security-relevant behavior. If few tasks qualify, the engineer gets few handoffs, and that is fine.

## Kept with the agent by default

- Adding properties or fields, DTOs and POCOs, getters and setters
- Class or interface scaffolding, including enterprise Java and C# layering: controllers, services, repositories, mappers
- Dependency injection wiring, annotations and attributes
- Config and build files, generated code
- Renames and other mechanical refactors
- Test fixtures and test boilerplate

## Mixed tasks

The agent writes the scaffolding and hands only the decision-bearing slice. Example: the agent scaffolds a service class, the engineer writes the method body that applies the business rule.

The engineer can move any task either way, at any time.

## Tuning

`exclude` and `include` take task-text keywords and path globs and override the defaults above. When the engineer says a kind of work is not worth their time, offer to record it as an `exclude`. When they want to keep a simple flow or an area fresh, an `include` opts it in.

## Flow walk

Simple work still has value for refamiliarizing with a flow. `repo-tour` supports a flow walk: trace a simple request path end to end, from entry point to persistence, even when no decision is involved. Offer it when the engineer includes boilerplate on purpose.
