# Spec Delta

## Purpose

Lets a change's plan declare how its tasks should be executed, so an orchestrator can route work without re-deriving intent from the task text.

## ADDED Requirements

### Requirement: Execution hints are carried as Beads metadata

A plan node SHALL express how its task should be executed through Beads' documented execution-hint metadata keys rather than through prose in the task text.

#### Scenario: A hinted task names its execution shape

- **WHEN** a task's nature calls for a particular execution mode, worker class, reasoning effort, or parallel group
- **THEN** its node carries the corresponding documented metadata key

#### Scenario: A task with no such nature carries no hint

- **WHEN** a task is ordinary work with no particular execution shape
- **THEN** its node carries no execution-hint metadata, because an invented hint routes work for no reason

### Requirement: Hints are advisory and never binding

An execution hint SHALL inform how work is carried out and SHALL NOT gate it: a bead with no hints executes normally, and no hint blocks or reorders work.

#### Scenario: Missing hints do not stop work

- **WHEN** apply selects a bead that carries no execution-hint metadata
- **THEN** it is claimed and executed like any other

#### Scenario: A hint cannot substitute for an edge

- **WHEN** one task must not start before another finishes
- **THEN** that is expressed as a `blocks` edge and never as an execution hint

### Requirement: A parallel hint agrees with the graph

A node marked for a parallel group SHALL NOT be joined to a member of that same group by an ordering edge, and a contradiction SHALL be reported rather than resolved silently.

#### Scenario: A parallel group has no internal ordering

- **WHEN** two nodes share a parallel group
- **THEN** no `blocks` edge connects them in either direction

#### Scenario: A contradiction is reported

- **WHEN** two nodes share a parallel group and an ordering edge connects them
- **THEN** the reconciliation check reports the contradiction and names both nodes
