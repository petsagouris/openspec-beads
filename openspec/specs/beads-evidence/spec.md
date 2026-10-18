# beads-evidence Specification

## Purpose
Defines how the Beads work graph supplies the evidence that verification reports on and that archiving depends on, so completing a change rests on checked facts rather than assertions.

## Requirements

### Requirement: Apply draws work from the ready frontier

The apply phase SHALL select work from the change's beads that have no open blockers, and SHALL claim a selected bead atomically before implementing it.

#### Scenario: Blocked work is not started

- **WHEN** a task's bead has an open blocker
- **THEN** that task is not selected for work

#### Scenario: The container is excluded from selection

- **WHEN** the change's ready work is queried during apply
- **THEN** the change's epic is excluded from the candidates, in a label-scoped query and in a molecule-scoped query alike

#### Scenario: A claim prevents collisions

- **WHEN** two agents attempt to claim the same ready bead
- **THEN** only one claim succeeds

#### Scenario: Interrupted work is recoverable

- **WHEN** a session ends with a bead still in progress
- **THEN** the claim can be released or reclaimed so another session can continue the work

### Requirement: Completing work updates both records

Completing a task SHALL close its bead before marking its `tasks.md` checkbox, so an interruption cannot mark work complete that was never closed.

#### Scenario: Both records agree

- **WHEN** a task is complete
- **THEN** its bead is closed and its checkbox is marked, both referring to the same task

#### Scenario: Closing releases dependents

- **WHEN** a bead is closed and it was blocking other beads
- **THEN** the newly unblocked beads appear in the ready frontier

### Requirement: Verification reads the graph as evidence

Verification SHALL report on the change's beads: those closed, those still open, open discoveries, and any task marked complete whose bead is not closed.

#### Scenario: A mismatch is reported

- **WHEN** verification runs with a task marked complete whose bead is still open
- **THEN** the mismatch is reported

#### Scenario: Open discoveries affect archive readiness

- **WHEN** the change has open discovery beads
- **THEN** verification reports them and archive readiness is not granted

### Requirement: Archiving waits on an external condition

Archiving SHALL be gated on an external condition rather than proceeding as soon as implementation ends, and the schema SHALL state what each gate type actually guarantees rather than implying more. A gate blocks the change until it closes; how strong that condition is belongs to the gate type, not to the schema, and the schema must not claim a guarantee the tool does not provide.

#### Scenario: Archive is blocked until the code lands

- **WHEN** implementation is complete and the change's gate has not closed
- **THEN** archiving does not proceed

#### Scenario: A satisfied condition unblocks archiving

- **WHEN** the gate's condition is met
- **THEN** archiving becomes available without polling

#### Scenario: The gate is visible in the graph

- **WHEN** the change's beads are inspected while archiving is blocked
- **THEN** the blocking gate is identifiable as its own bead

#### Scenario: A human gate records a decision rather than enforcing one

- **WHEN** a human gate is offered as the archive condition
- **THEN** the schema states that any caller can resolve it, including the agent whose work it gates, so it is a record of a decision and not a barrier to one

#### Scenario: A condition that cannot be evaluated does not pass

- **WHEN** a gate's condition cannot be evaluated — a GitHub gate with no remote to check against, or a failure inside the check itself
- **THEN** the gate reports an error rather than closing, and that error is read as "cannot tell yet" rather than as satisfied

#### Scenario: A gate type known not to evaluate is not offered as reliable

- **WHEN** a gate type is known to fail when its condition is evaluated
- **THEN** the schema does not present it as a working option without saying so

### Requirement: Pre-archive checks run before archiving

Before archiving, the schema SHALL require that no unresolved discovery remains, no dependency cycle exists, and no bead referenced by a commit is still open.

#### Scenario: An unresolved discovery prevents archiving

- **WHEN** an open discovery bead belongs to the change
- **THEN** archiving is refused until that bead is closed, deferred, or escalated

#### Scenario: Committed but still-open work is caught

- **WHEN** a commit references a bead of this change that is still open
- **THEN** the check reports it before archiving

### Requirement: A change can be resumed from the graph

A new session SHALL be able to determine what remains for a change from the graph, without reconstructing it from the full plan.

#### Scenario: Resume without re-planning

- **WHEN** a new session begins on an in-progress change
- **THEN** the change's remaining work is available from the graph and the next ready bead can be claimed directly

#### Scenario: Progress is reportable without the checklist

- **WHEN** the graph is queried for the change
- **THEN** completed and remaining work can be reported independently of `tasks.md`
