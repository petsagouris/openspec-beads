# Design

## Context

The archived change gave the bridge its artifact graph, materialization contract, and apply procedure, and deliberately left the Tier-2 Beads capabilities out. This is the first of them.

It is also the first change in this repository to run through the bridge itself: `openspec/config.yaml` now defaults to `beads-bridge`, so this change's own work is materialized as beads in this repository. Everything the archived design asserted about the loop is therefore exercised here for the first time in production rather than in a scratch project.

Beads documents an execution-hint convention — `execution_agent_type`, `execution_suggested_model`, `execution_reasoning_effort`, `execution_mode`, `execution_parallel_group` — as advisory metadata that an orchestrator reads before dispatching work, taking precedence over free-form notes for routing decisions. The bridge currently records provenance and nothing else.

## Goals / Non-Goals

**Goals:**

- Let a plan state how its tasks should be executed, using the vocabulary orchestrators already read.
- Keep that statement consistent with the ordering the graph already encodes.
- Keep it advisory, so it cannot become a second and weaker dependency system.

**Non-Goals:**

- Acting on the hints. The bridge does not spawn subagents, choose models, or orchestrate; it records what the plan decided. Orchestration was put out of scope by the archived design and stays there.
- The other Tier-2 capabilities (durable memories, merge slots) and all of Tier-3 (swarm, formulas, wisps, stores and routing).

## Decisions

### 1. Beads' documented keys, not a private vocabulary

The convention is already the interface an orchestrator reads. Inventing our own names would create a second vocabulary that nothing consumes, and would need translating at exactly the point where a hint is read.

### 2. Advisory, never binding

A hint that could block or reorder work would be a second dependency system sitting beside `blocks`, with none of the graph's validation, cycle detection, or write-time enforcement. Ordering stays in edges; hints describe execution shape. The distinction is enforced by a scenario, not just a sentence: a hint cannot substitute for an edge.

### 3. The parallel-group contradiction goes to the reconciliation check, not the plan checker

`check-plan.mjs` decides only what is structurally decidable from the plan itself. A contradiction between a metadata hint and an edge is a *coherence* question between two records, which is what the reconciliation check exists for. The alternative — an eighth rule in the checker — was rejected because the checker would then need to know Beads' hint vocabulary, coupling a structural tool to a convention that can change without notice.

### 4. Extend `beads-plan-materialization` rather than putting the keys in the new capability

Provenance is one idea: everything a node says about itself. Splitting the hint keys into a separate capability would mean two requirements describing what goes in the same `metadata` object. This is also the first change to exercise a MODIFIED delta through the archive merge, which is the path most likely to be wrong and the least tested.

## Risks / Trade-offs

- **The hints are a convention, not a contract.** Beads documents them as advisory metadata and nothing validates them, so a misspelled key is a silent no-op rather than an error. *Mitigation:* the instruction names the keys and their canonical values explicitly, and the probe in task 1.1 confirms the ones that survive a round trip.
- **Nothing consumes them yet.** A reader may expect routing to happen. *Mitigation:* the schema README and the repository README both state that the bridge records hints without acting on them.
- **MODIFIED deltas are newly exercised.** The archive merge for a modified requirement has never run in this repository. *Mitigation:* that is precisely why it is done here, on a nine-task change, rather than on something larger.
- **The probe may reduce the requirement.** If `bd create --graph` drops a hint key, the requirement shrinks to the keys that round-trip. Task 1.1 is first so that this is known before the instruction is written around it.

## Open Questions

- Whether the bridge should ever act on the hints. Deferred rather than unanswered: acting on them is orchestration, and orchestration is out of scope by the archived design's own reasoning.
- Whether hints should be validated at plan time. Deferrable: a validator would need a copy of Beads' vocabulary, which decision 3 argues against.
