# Proposal

## Why

The plan already says what must happen and in what order, but nothing says *how* a task should be executed. Beads documents an execution-hint metadata convention that an orchestrator reads before dispatching work — a worker class, a model tier, a reasoning effort, a parallel group — and the bridge ignores it entirely. So a plan that knows a task is exploratory, or needs more deliberation, or belongs alongside another, has no way to say so, and a reader has to re-derive intent from the task text.

This is the first of the deliberately deferred Tier-2 Beads capabilities, and the first change in this repository to run through the bridge itself.

## What Changes

- The `beads` artifact instruction names Beads' documented execution-hint keys and when to set them.
- A parallel-group hint is required to agree with the graph's ordering, and a contradiction is reported.
- The apply instruction reads hints before executing a task, and treats a missing hint as normal.
- `beads-plan-materialization` gains the hint keys in its provenance requirement.
- Explicitly not changed: the bridge still does not orchestrate. It records what the plan decided and does not spawn work.

## Capabilities

### New Capabilities
- `execution-hints`: letting a plan declare how its tasks should be executed, as advisory metadata that agrees with the ordering the graph already encodes.

### Modified Capabilities
- `beads-plan-materialization`: the provenance requirement now covers the execution-hint keys, so one requirement owns everything a node carries about itself.

## Impact

Schema instruction text, the schema README, and the repository README's limitations. No code, no CLI change, and no new dependency.

Depends on Beads' documented execution-hint convention. That convention is advisory metadata rather than a validated contract, so the risk is a silently inert hint rather than a failure.
