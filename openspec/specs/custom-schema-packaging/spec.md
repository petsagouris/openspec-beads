# custom-schema-packaging Specification

## Purpose
Defines how schemas in this repository are packaged so another project can adopt one by copying a single folder, without depending on this repository.

## Requirements

### Requirement: Each schema is a self-contained copyable folder

Each schema SHALL live at `openspec/schemas/<name>/` and contain `schema.yaml`, a `templates/` directory holding a template for every declared artifact, and a `README.md`.

#### Scenario: The folder is complete

- **WHEN** a schema folder is inspected
- **THEN** it contains `schema.yaml`, `README.md`, and a template file for every artifact declared in `schema.yaml`

#### Scenario: Copying the folder is sufficient

- **WHEN** the folder is copied into another project's `openspec/schemas/` directory
- **THEN** the schema resolves and works without any other file from this repository

#### Scenario: A missing template fails validation

- **WHEN** `schema.yaml` declares an artifact whose template file is absent
- **THEN** `openspec schema validate` fails and names the missing template

### Requirement: A single prompt installs a schema

The repository README SHALL provide a copy-paste prompt that installs a named schema into an existing OpenSpec project, together with a documented manual equivalent.

#### Scenario: Installation by prompt

- **WHEN** the install prompt is given to a coding agent in a target project
- **THEN** the agent installs the named schema, activates it, and validates it

#### Scenario: Installation without an agent

- **WHEN** a developer follows the documented manual steps
- **THEN** the same result is produced using only shell commands

#### Scenario: Missing prerequisites are reported

- **WHEN** the target project does not use OpenSpec
- **THEN** the instructions stop and report what must be set up first instead of proceeding

### Requirement: Activation is documented per schema

Each schema's `README.md` SHALL document how to activate it and which `config.yaml` keys must align with the schema's artifact ids.

#### Scenario: Activation is stated

- **WHEN** a schema's `README.md` is read
- **THEN** it states the `schema:` value to set and any artifact-id-keyed rules that apply

#### Scenario: Named artifact ids exist

- **WHEN** a schema's `README.md` names artifact ids for configuration
- **THEN** every id it names is declared in that schema's `schema.yaml`

### Requirement: Limitations are stated

The repository README SHALL state the project's limitations, including that an installed schema is a snapshot which does not receive upstream improvements.

#### Scenario: The snapshot limit is documented

- **WHEN** the repository README is read
- **THEN** it states that copying a schema means taking a snapshot, and that upstream changes must be ported deliberately

#### Scenario: The test boundary is documented

- **WHEN** the repository README is read
- **THEN** it states that the conformance harness tests this repository's schemas and is not copied to adopters
