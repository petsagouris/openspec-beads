# Spec Delta

## Purpose

Defines how schemas in this repository are verified beyond structural validity, so that changing instruction text is checked rather than trusted.

## ADDED Requirements

### Requirement: Validation and conformance checks gate schema work

Schema work SHALL NOT be considered complete until `openspec schema validate <name>` passes and the repository's conformance checks pass for the affected schema, and the repository SHALL document both as that gate.

#### Scenario: A schema change is fully checked

- **WHEN** a schema's `schema.yaml` or templates change
- **THEN** validation is run for that schema and the conformance checks are run before the work is considered complete

#### Scenario: A structural defect is caught

- **WHEN** an artifact's `requires` edge names an artifact id that does not exist
- **THEN** validation fails and names the invalid dependency

### Requirement: The plan a schema produces is checked against its rules

The repository SHALL provide an automated check that reports whether a materialized plan conforms to the schema's rules: unique node keys, every edge endpoint referencing an existing node, no ordering edge derived from priority, and no edge reversing a parent relationship.

#### Scenario: A conforming plan passes

- **WHEN** the check runs against a plan produced from a change's tasks
- **THEN** it reports conformance

#### Scenario: An ordering edge derived from priority is reported

- **WHEN** a plan connects two nodes only because one is more urgent than the other
- **THEN** the check reports the offending edge

#### Scenario: An edge reversing a parent relationship is reported

- **WHEN** a plan contains a `blocks` edge that reverses a `parent_key` relationship
- **THEN** the check reports the offending pair

#### Scenario: Findings name their target

- **WHEN** the check reports a finding
- **THEN** the finding names the node or edge responsible, and the run exits unsuccessfully

### Requirement: Checks run hermetically

Conformance checks and scenario executions SHALL run against a throwaway Beads database and a scratch OpenSpec project, and SHALL NOT write to this repository's work graph or change artifacts.

#### Scenario: The repository's own state is untouched

- **WHEN** the full check suite is run
- **THEN** the number of beads in this repository's database and the contents of its changes are unchanged

#### Scenario: Runs are self-contained

- **WHEN** the checks run on a machine whose project database is empty
- **THEN** they still run, because they supply their own database rather than depending on the project's

### Requirement: Non-mechanical behaviour is covered by executed scenarios

The repository SHALL carry a scenario set, derived from the scenarios in its specs, in which each entry states its setup and the observations that must hold afterwards.

#### Scenario: Every spec scenario is represented

- **WHEN** the scenario set is compared with the schemas' specs
- **THEN** every requirement has at least one corresponding entry

#### Scenario: An entry states its expected observations

- **WHEN** an entry is read on its own
- **THEN** it names the files and beads expected after execution, without needing the surrounding context

#### Scenario: A failed observation is reported as a failure

- **WHEN** executing an entry does not produce the stated observations
- **THEN** the entry reports which observation failed, rather than being amended to match what happened

### Requirement: The instructions are tested against a reader without context

The install prompt and the apply instruction SHALL each be exercised by an agent session with no prior context, and the resulting state asserted.

#### Scenario: Install works from a cold start

- **WHEN** a session with no prior context is given only the install prompt in a project that uses OpenSpec
- **THEN** it installs the schema, activates it, and validates it

#### Scenario: Apply works from a cold start

- **WHEN** a session with no prior context is given the apply instruction for a scratch change
- **THEN** the expected artifacts, beads, and closures result

#### Scenario: Divergence is recorded rather than absorbed

- **WHEN** a cold-start session produces an outcome different from the instruction's stated one
- **THEN** the divergence is recorded against the instruction passage responsible and the test reports a failure
