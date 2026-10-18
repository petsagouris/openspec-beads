# Spec Delta

## Purpose

Defines the OpenSpec schema that connects planning to execution: which artifacts a change produces, how apply is wired to the work graph, and what the schema deliberately does not do.

## ADDED Requirements

### Requirement: A beads artifact extends the spec-driven workflow

The schema SHALL define a `beads` artifact whose `generates` path is `beads/plan.json`, whose `requires` lists `specs`, `design`, and `tasks`, and which is the only artifact the schema adds to the spec-driven set.

#### Scenario: The artifact appears in the workflow

- **WHEN** a change is created with the `beads-bridge` schema
- **THEN** `openspec status` lists `beads` as an artifact, blocked until `specs`, `design`, and `tasks` are complete

#### Scenario: The artifact is written inside the change

- **WHEN** the `beads` artifact is written for a change named `add-auth`
- **THEN** the file is created at `openspec/changes/add-auth/beads/plan.json`

### Requirement: Spec-driven artifacts are preserved

The schema SHALL preserve the `proposal`, `specs`, `design`, and `tasks` artifacts from the built-in `spec-driven` schema unchanged: same ids, same `generates` paths, same `requires` edges.

#### Scenario: Artifact definitions are unchanged

- **WHEN** the `beads-bridge` artifact definitions are compared with `spec-driven`'s
- **THEN** the four shared artifacts differ in no `id`, `generates`, or `requires` field

#### Scenario: Templates are unchanged

- **WHEN** the schema's templates for the four shared artifacts are compared with the bundled `spec-driven` templates
- **THEN** each is identical

### Requirement: Apply requires the plan and tracks the checklist

The schema SHALL set `apply.requires` to `[beads]` and `apply.tracks` to `tasks.md`.

#### Scenario: Apply is blocked without a plan

- **WHEN** `openspec instructions apply --change <name> --json` runs before `beads/plan.json` exists
- **THEN** the reported state is `blocked` and the missing artifact is named

#### Scenario: Progress still comes from the checklist

- **WHEN** tracked tasks in `tasks.md` are marked complete
- **THEN** `openspec status` and `openspec list` report that progress for the change

### Requirement: The bridge is prompt-layer only

The bridge SHALL be implemented entirely in schema instructions and templates: no shell scripts, no changes to the OpenSpec CLI, and no changes to Beads.

#### Scenario: No executable helper ships

- **WHEN** the `beads-bridge` schema folder is inspected
- **THEN** it contains only `schema.yaml`, `templates/`, and `README.md`, with no executable file

#### Scenario: Upgrades do not need coordination

- **WHEN** OpenSpec or Beads is upgraded without renaming or removing a command the schema references
- **THEN** no file in this repository needs to change for the bridge to keep working

### Requirement: The schema is self-contained and validatable

The schema SHALL live at `openspec/schemas/beads-bridge/` and SHALL pass `openspec schema validate beads-bridge` with no errors.

#### Scenario: Validation passes

- **WHEN** `openspec schema validate beads-bridge` runs
- **THEN** it reports the schema as valid and exits successfully

#### Scenario: Validation catches a broken graph

- **WHEN** an artifact's `requires` edge names an artifact id that does not exist
- **THEN** validation fails and names the invalid dependency
