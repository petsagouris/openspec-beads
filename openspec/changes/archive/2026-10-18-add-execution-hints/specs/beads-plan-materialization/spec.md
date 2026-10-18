# Spec Delta

## MODIFIED Requirements

### Requirement: Nodes carry provenance to their source

Every node SHALL carry provenance back to its OpenSpec origin: a label identifying the change, and metadata naming the change and the source task. Where a task's nature warrants it, the node SHALL also carry Beads' documented execution-hint metadata, because the plan is where a task's execution shape is known and the graph is where an orchestrator reads it.

#### Scenario: Provenance is queryable

- **WHEN** issues are listed filtered by the change's label after materialization
- **THEN** every node belonging to that change is returned

#### Scenario: A bead traces to its task

- **WHEN** a bead created from the plan is inspected
- **THEN** its metadata identifies the OpenSpec change and the `tasks.md` task it came from

#### Scenario: The epic states the change's intent

- **WHEN** the epic node is inspected
- **THEN** its description identifies the change and its acceptance criteria reflect what the change must deliver

#### Scenario: A hinted task carries its hint

- **WHEN** a task is exploratory, or needs a higher reasoning effort, or belongs to a named parallel group
- **THEN** its node carries the corresponding execution-hint key alongside its provenance, and a task of no particular nature carries provenance alone
