# Spec Delta

## MODIFIED Requirements

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
