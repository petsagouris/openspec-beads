# beads-plan-materialization Specification

## Purpose
Defines how an OpenSpec change's tasks become a single Beads dependency graph: the shape of the plan, the provenance it carries, and how materialization stays atomic and idempotent.

## Requirements

### Requirement: The plan conforms to the Beads graph plan schema

The `beads` artifact SHALL produce `beads/plan.json` conforming to Beads' `bd create --graph` plan schema, with a `nodes` array and an `edges` array.

#### Scenario: A valid plan materializes

- **WHEN** `bd create --graph beads/plan.json` runs with a plan whose node keys are unique
- **THEN** every node is created in one transaction and the minted ids are reported

#### Scenario: The plan can be previewed

- **WHEN** the plan is previewed with `bd create --graph beads/plan.json --dry-run`
- **THEN** no issues are created and the nodes and edges that would be created are reported

### Requirement: One epic per change and one node per task

The plan SHALL contain exactly one epic node representing the change and one node per tracked task in `tasks.md`, with every task node parented to that epic and the epic pinned so it is not claimable.

#### Scenario: Every task is represented

- **WHEN** `tasks.md` contains N tracked checkboxes
- **THEN** the plan contains N task nodes plus one epic node

#### Scenario: The container is not claimable work

- **WHEN** the epic node is created
- **THEN** it is pinned, so an unscoped query for ready work does not return it

#### Scenario: The epic is closed explicitly

- **WHEN** the final task's bead is closed
- **THEN** the epic remains open until the change's completion step closes it with an explicit force, because a pinned root neither closes on its last child nor accepts modification by any other means

### Requirement: Edges encode only real ordering

Plan edges SHALL connect only tasks whose ordering is genuinely required. Tasks that can proceed concurrently SHALL NOT be joined by a `blocks` edge.

#### Scenario: Independent tasks stay parallel

- **WHEN** two tasks touch different components and neither depends on the other
- **THEN** no dependency exists between their nodes and both appear in the ready frontier at the same time

#### Scenario: Priority is not ordering

- **WHEN** one task is more urgent than another but does not block it
- **THEN** no dependency is created between them and the difference is expressed only in each node's `priority`

#### Scenario: Stated ordering becomes an edge

- **WHEN** a task cannot begin until another is complete
- **THEN** a `blocks` edge is created so the dependent task stays out of the ready frontier until its blocker closes

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

### Requirement: Materialization is atomic and idempotent

Materialization SHALL create the whole graph in a single `bd create --graph` invocation, and re-running apply on a change whose graph already exists SHALL NOT create duplicate beads.

#### Scenario: A failed materialization leaves nothing behind

- **WHEN** `bd create --graph` fails partway through a plan
- **THEN** no issue from that plan exists afterwards

#### Scenario: A second run does not duplicate

- **WHEN** apply runs again on a change whose beads already exist
- **THEN** no additional beads are created and the existing ones are reused

#### Scenario: An already-materialized graph is detected from the graph itself

- **WHEN** apply starts on a change whose beads already exist, but whose task lines carry no recorded ids
- **THEN** the existing beads are detected before anything is created, because `bd create --graph` mints fresh issues on every run and would otherwise create a second copy of the whole graph

#### Scenario: Minted ids are recorded beside their task

- **WHEN** materialization succeeds
- **THEN** each tracked task line in `tasks.md` records the identifier of the bead created for it, on that same line

### Requirement: The write target is verified before writing

Before creating any bead, the apply phase SHALL verify that the resolved Beads database belongs to the current project.

#### Scenario: A mismatched database is refused

- **WHEN** the resolved Beads database belongs to a different project
- **THEN** materialization stops and reports the mismatch instead of creating issues there
