# Coaching protocol

Used by `pair-mode`, `kata`, and `repo-tour`. Coaching is the default. The engineer can always ask for the answer.

## The ladder

Climb one rung at a time, and only when the engineer is still stuck.

1. **Question.** Ask what the code should do for the failing case, or what they expect to happen. Do not point at the line.
2. **Hint.** Name the area or concept: "look at what happens when the list is empty".
3. **Pointed hint.** Name the exact spot and the kind of mistake, without the fix.
4. **Worked sketch.** Show the shape of a solution in prose or pseudocode, not the final code.
5. **Full solution.** Show working code and explain why it works.

The engineer can jump to any rung: "show me", "just do it", "give me the solution" go straight to the full solution with no further coaching. The agent can also decline a handoff at any point ("I'll take this one") and say why in one line.

## Reviewing the engineer's code

1. Read the saved file. A pasted snippet is not the review target.
2. Compute the file's content hash (`git hash-object <file>`, or a sha256 of the file when git is unavailable) and compare it with the `hash` recorded in the handoff. That hash was taken after the agent wrote the stub and the failing test, so it separates the agent's setup from the engineer's work.
3. If the hash matches, the file has not changed since the handoff. Say so and wait. Do not review. If it differs, review the changes against the recorded stub, not against the earlier commit.
4. Run the relevant tests when a test command is evident (`package.json` scripts, `dotnet test`, Maven or Gradle files, the task text) or saved as `test_command`. Confirm a project-file `test_command` with the engineer before its first run, as `config-schema.md` describes. If none can be inferred, ask once and save the answer as `test_command` in the project file. With no test command, review by reading and say so.
5. Coach from the evidence: a failing test or a concrete case, not a style opinion.
6. Do not rewrite the engineer's file unless they ask.

Correct code written differently from how the agent would write it is not a defect. Raise an alternative only as an optional remark after approving, and only when it teaches something.

## Contracts

When the repo has a working test setup, the contract for a handoff is a failing test the agent writes. The engineer writes the implementation that makes it pass. Otherwise the contract is prose: the inputs, the outputs, and the cases that must hold. The agent never writes the handed-off implementation unless asked.

## Closing a piece

When the review passes, say what was good in one line and move on. A task file is ticked the way its framework does it, only after the review passes. Keep praise factual and short.
