# Proposal

## Why

OpenSpec plans work; it does not track it. `tasks.md` is a flat checklist: no dependencies between tasks, nothing stopping two sessions from claiming the same one, no home for work discovered mid-implementation, and no state that outlives the change folder or a context reset.

Beads exists to solve exactly that — a dependency-aware work graph with atomic claims, a computed ready frontier, and durable state across sessions. Leaving the two unconnected means OpenSpec's plan degrades the moment implementation starts. Dependencies survive only as prose, so nothing prevents starting blocked work. Discoveries either get lost or silently expand `tasks.md` into a backlog it was never meant to be. And "done" is an assertion someone typed rather than a fact anything checked.

The two tools divide cleanly: OpenSpec owns intent and contract — reviewed, git-committed, durable — while Beads owns execution state. This change connects them for the length of a change's life.

## What Changes

- Adds a `beads` artifact that materializes a change's tasks as a Beads issue graph in a single atomic operation.
- Makes apply execute against that graph: draw from the ready frontier, claim atomically, close the bead and mark the task.
- Defines what happens when a spec is added, modified, removed, or renamed partway through implementation, on both the artifact and graph sides.
- Uses the graph as the evidence verification reports on and archiving gates on — including waiting for a merged PR or green CI rather than a timestamp.
- Packages the schema as a self-contained, copyable, validated folder with an agent-facing install prompt.
- Explicitly not changed: the built-in `spec-driven` schema, any existing skill or command, and Beads itself.

**BREAKING**: none. This adds a schema that is opted into per change or per project.

## Capabilities

### New Capabilities
- `beads-bridge-schema`: the artifact graph and apply wiring that connect OpenSpec planning to Beads execution.
- `beads-plan-materialization`: turning a change's tasks into one Beads dependency graph, atomically and idempotently.
- `spec-change-reconciliation`: keeping specs, tasks, and the Beads graph coherent when the spec changes during implementation.
- `beads-evidence`: using the Beads work graph as the evidence that verification reports and archiving gates on.
- `custom-schema-packaging`: packaging schemas as self-contained, copyable, validated folders with agent-facing install instructions.

### Modified Capabilities

None. No existing capability's requirements change, because no capability exists in `openspec/specs/` yet — this change introduces the project's first specs.

## Impact

New files: `openspec/schemas/beads-bridge/`, plus root `README.md`, `CONTRIBUTING.md`, and `LICENSE`.

Depends on OpenSpec's project-schema mechanism (verified against 1.14.3) and the Beads CLI (verified against 1.3.1), specifically `bd create --graph`, `bd ready`, `bd update --claim`, `bd close`, `bd dep`, and gates.

No changes to existing skills, commands, `openspec/config.yaml`, or the bundled `spec-driven` schema. Adopters opt in by pointing `schema:` at `beads-bridge`, or by setting it on a single change.
