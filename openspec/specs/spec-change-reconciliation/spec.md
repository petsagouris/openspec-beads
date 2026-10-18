# spec-change-reconciliation Specification

## Purpose
Defines how a spec change decided during implementation is carried through to the work graph, so the spec, the task list, and the Beads graph never disagree with one another.

## Requirements

### Requirement: Every spec delta has a paired graph change

When a spec is added, modified, removed, or renamed during implementation, the schema SHALL prescribe a corresponding change to the Beads graph and to `tasks.md`, applied in the same step as the spec edit.

#### Scenario: A new requirement brings new work

- **WHEN** a requirement is added to a capability's delta spec during apply
- **THEN** beads are created for the new work, linked to the change's epic, and matching tasks appear in `tasks.md`

#### Scenario: A removed requirement retires its work

- **WHEN** a requirement is removed from a delta spec during apply
- **THEN** the beads implementing it are closed or deferred, with the removal's reason recorded on them

#### Scenario: A renamed requirement moves no work

- **WHEN** a requirement is renamed during apply
- **THEN** its beads are relabelled and annotated with the previous and new names, with no structural change

#### Scenario: A modified requirement updates its work

- **WHEN** a requirement's behaviour changes during apply
- **THEN** its existing beads are updated, or replaced by new beads that supersede them when the work itself is replaced

### Requirement: The artifact set stays coherent after a spec change

A spec change made during implementation SHALL leave the change's artifacts mutually coherent and SHALL leave the change passing validation.

#### Scenario: A new capability reaches the proposal

- **WHEN** a capability is introduced partway through implementation
- **THEN** the proposal lists it and the change still passes `openspec validate`

#### Scenario: Validation alone does not catch a missing announcement

- **WHEN** a capability has a delta spec but the proposal does not name it
- **THEN** `openspec validate` still passes, so the coherence review and the reconciliation check are what catch it rather than validation

#### Scenario: Coherence is checked rather than assumed

- **WHEN** the artifacts have been revised
- **THEN** a review runs across proposal, specs, design, and tasks before implementation continues

### Requirement: Non-spec discoveries are dispositioned explicitly

A discovery that does not change spec-level behaviour SHALL be dispositioned as exactly one of: recorded as a Beads issue linked to the change, escalated into a new OpenSpec change, or halted and reported as a security concern.

#### Scenario: A defect found mid-implementation is recorded

- **WHEN** implementation reveals a defect outside the change's declared scope
- **THEN** a Beads issue is created with a `discovered-from` dependency on the change, and implementation continues

#### Scenario: A security discovery halts work

- **WHEN** implementation reveals a security vulnerability
- **THEN** work stops, a Beads issue is created, and the finding is reported rather than silently absorbed

#### Scenario: A large finding becomes its own change

- **WHEN** a discovery requires design decisions beyond this change's scope
- **THEN** it is escalated into a new OpenSpec change instead of being absorbed here

### Requirement: A reconciliation check compares the checklist and the graph

The schema SHALL define a read-only reconciliation check that reports tasks with no bead, beads with no task, and dependency cycles.

#### Scenario: A task without a bead is reported

- **WHEN** `tasks.md` lists a tracked task with no recorded bead and the graph holds no matching node
- **THEN** the check reports it

#### Scenario: A bead without a task is reported

- **WHEN** the graph holds a node for the change that no task line references
- **THEN** the check reports it as untracked work

#### Scenario: Cycle rejection is relied on, not reimplemented

- **WHEN** the reconciliation check evaluates dependencies
- **THEN** it reports the result of the graph's own cycle detection rather than maintaining a second implementation

#### Scenario: The check changes nothing

- **WHEN** the reconciliation check runs
- **THEN** it reports findings and writes no file

### Requirement: Clarification during apply is bounded

Clarification during apply SHALL be limited to at most five questions in a single pass, and each resolution SHALL be recorded in the change's artifacts rather than left in the conversation.

#### Scenario: Questioning is bounded

- **WHEN** a mid-implementation spec change raises ambiguities
- **THEN** at most five questions are asked before proceeding on recorded assumptions

#### Scenario: Resolutions persist in the artifacts

- **WHEN** a clarification is resolved
- **THEN** the resolution appears in the change's artifacts, not only in the session transcript
