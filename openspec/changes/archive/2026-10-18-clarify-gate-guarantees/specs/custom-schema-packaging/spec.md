# Spec Delta

## MODIFIED Requirements

### Requirement: Limitations are stated

The repository README SHALL state the project's limitations, including that an installed schema is a snapshot which does not receive upstream improvements, and each schema's README SHALL record what its instructions were verified against so a reader can tell a verified instruction from a plausible one.

#### Scenario: The snapshot limit is documented

- **WHEN** the repository README is read
- **THEN** it states that copying a schema means taking a snapshot, and that upstream changes must be ported deliberately

#### Scenario: The test boundary is documented

- **WHEN** the repository README is read
- **THEN** it states that the conformance harness tests this repository's schemas and is not copied to adopters

#### Scenario: The verification baseline is recorded

- **WHEN** a schema's README is read
- **THEN** it names the tool versions its instructions were verified against, the date of that verification, and the behaviours that were measured rather than assumed

#### Scenario: A deliberate divergence from upstream documentation is recorded

- **WHEN** an instruction differs from the upstream tool's own documentation
- **THEN** the schema README says so and says why, so that a reader following the upstream documentation does not "correct" the instruction back to a form the tool rejects
