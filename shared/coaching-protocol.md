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
2. Compare against the recorded handoff: the diff since the recorded git HEAD for that file, or the whole file when git is unavailable.
3. If the file has not changed since the handoff, say so and wait. Do not review.
4. Run the relevant tests when a test command is evident (`package.json` scripts, `dotnet test`, Maven or Gradle files, the task text) or saved as `test_command`. If none can be inferred, ask once and save the answer as `test_command`. With no test command, review by reading and say so.
5. Coach from the evidence: a failing test or a concrete case, not a style opinion.
6. Do not rewrite the engineer's file unless they ask.

Correct code written differently from how the agent would write it is not a defect. Raise an alternative only as an optional remark after approving, and only when it teaches something.

## Contracts

When the repo has a working test setup, the contract for a handoff is a failing test the agent writes. The engineer writes the implementation that makes it pass. Otherwise the contract is prose: the inputs, the outputs, and the cases that must hold. The agent never writes the handed-off implementation unless asked.

## Closing a piece

When the review passes, say what was good in one line, tick the task if a task file is in play, and move on. Keep praise factual and short.
