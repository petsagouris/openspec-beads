# Tasks

## 1. Resolve probe-gated decisions

These settle the three assumptions the design rests on. Each probes for real and records the outcome in `design.md`; the fallback is stated so a negative result does not stall the change.

- [x] 1.1 Probe that a nested artifact path is accepted, by adding a `beads` artifact with `generates: beads/plan.json` to a scratch schema under `openspec/schemas/probe-nested/` and running `openspec schema validate probe-nested`. Verified when validation reports the schema valid; if it rejects the nested path, adopt the single-file fallback `beads-plan.json` at the change root, record the reason in `design.md` decision 2, and delete the scratch schema
- [x] 1.2 Probe `bd create --graph` with a scratch 15-node plan containing one epic via `parent_key`, three `blocks` edges, and a `waits-for` edge, running `openspec`-independent `bd create --graph <plan> --dry-run` first and then for real in a throwaway database. Verified when the created graph's node count, parent relationships, and edges match the plan; record the accepted and rejected edge shapes in `design.md` decision 12, then delete the scratch beads
- [x] 1.3 Probe that OpenSpec tolerates a trailing bead id on a tracked task line, by writing a scratch `tasks.md` containing `- [ ] 1.1 Do a thing (osb-a1b2)` in a scratch change and running `openspec status --change <name> --json`. Verified when the task is counted in `progress.total`; if it is not, record the `plan.json` id-map fallback in `design.md` decision 5, revise spec `beads-plan-materialization` accordingly, and delete the scratch change

## 2. Schema skeleton and templates

- [x] 2.1 Create `openspec/schemas/beads-bridge/schema.yaml` with `name: beads-bridge`, `version: 1`, and the five artifacts: `proposal`, `specs`, `design`, `tasks` unchanged from the packaged schema, plus `beads`. Verified when `openspec schema validate beads-bridge` reports the schema valid
- [x] 2.2 Copy the four shared templates from the installed `spec-driven` schema into `openspec/schemas/beads-bridge/templates/`. Verified when each copied template is byte-identical to the packaged original, checked with `diff` against the installed package path, satisfying the `Spec-driven artifacts are preserved` requirement
- [x] 2.3 Set `apply` in `schema.yaml` to `requires: [beads]` and `tracks: tasks.md`. Verified on a scratch change created with `--schema beads-bridge`: `openspec instructions apply` reported `taskTrackingConfigured: true`, `applyRequires` was `[beads]`, and `status` showed the `beads` artifact blocked until `specs`, `design`, and `tasks` completed
- [x] 2.4 Create `templates/beads-plan.json` as the artifact's structure: a `nodes` and `edges` skeleton with one commented epic node and one commented task node showing `key`, `title`, `type`, `priority`, `labels`, `metadata`, `parent_key`, and an `edges` example. Verified when `openspec schema validate beads-bridge` still passes with the template referenced by the `beads` artifact
- [x] 2.5 Write `openspec/schemas/beads-bridge/README.md` covering what the schema is for, the artifact DAG, activation via `schema: beads-bridge`, the artifact ids usable in `config.yaml` rules, and the snapshot limitation. Verified when every artifact id named in the README exists in `schema.yaml`, and a reader can activate the schema from the README alone

## 3. Plan conformance harness

- [x] 3.1 Write `tests/plan/check-plan.mjs`, a dependency-free Node check reporting unique node keys, unresolvable edge endpoints, edges running against a `parent_key`, unpinned epic containers, a missing or duplicated epic container, an unresolvable `parent_key`, and a plan that serialises every task into one chain, together with `tests/plan/fixture-tasks.md` carrying known ordering and known parallelism. Verified when `fixture-plan.json` passes and each of seven deliberately malformed fixtures (E1-E7) trips exactly its own rule and exits non-zero. The fixture also established that `bd create --graph` accepts dotted node keys, closing the last open question about the plan shape
- [x] 3.2 Make every run hermetic by writing `tests/run.mjs`, which creates its own Beads database under the system temporary directory, points `BEADS_DIR` at it, and deletes it afterwards. Verified when a full run leaves this repository's bead count and `openspec/changes/` contents unchanged, when the suite runs on a machine whose project database is empty, and when the runner fingerprints both before and after and fails on any difference
- [x] 3.3 Write `tests/README.md` documenting the mechanical layer, what it covers, and the exact commands to run it, and reference that gate from `CONTRIBUTING.md`. Verified when every command it documents runs as written and its documented exit codes are correct

## 4. The beads artifact: materialization contract

- [x] 4.1 Write the `beads` artifact `instruction` covering node derivation: one epic node for the change, pinned so it is not claimable, one node per tracked task, `parent_key` from each task node to the epic, and the mapping from task text to `type` and `priority`. Verified against this change's own 36 tasks: the produced plan held exactly one pinned epic plus 36 task nodes, one per tracked task, with no missing, extra, or duplicate keys
- [x] 4.2 Extend the instruction with the provenance rules: a `change:<name>` label and metadata naming the change and the source task on every node, and the epic's `description` and `acceptance_criteria` drawn from the proposal and specs. Verified by materializing the 37-node plan: every node carries the change label and metadata naming its source task, and the epic's `description` and `acceptance_criteria` read back from the database intact. Completed tasks were materialized with `status: closed`, so the graph records the whole task list without inventing work
- [x] 4.3 Extend the instruction with the edge rules: an edge is created only where ordering is genuinely required, independent tasks are not joined, and priority is never expressed as an edge. Verified when the 29-edge plan passed `tests/plan/check-plan.mjs` unmodified, and when a hand-built plan of four tasks chained in priority order was rejected by E6 naming the chain
- [x] 4.4 Extend the instruction with the materialization sequence: preview with `--dry-run`, then create once, then record each minted id on its own task line in `tasks.md`. Verified against a 36-task scratch change: 37 nodes minted, an id recorded on each of the 36 task lines, and `openspec` still parsing all 36 with unchanged progress. The second half of this task's original verification failed and moved to 5.1 — `bd create --graph` is not idempotent, so a second run duplicates rather than being refused

## 5. Apply instruction

- [x] 5.1 Write the apply `instruction` preflight: confirm the resolved Beads database belongs to this project, confirm `beads/plan.json` exists, and refuse to materialize when beads for the change already exist, detecting them with a label-scoped query rather than by the ids recorded in `tasks.md`. Verified both halves: `bd where` resolved inside the repository normally and outside it under a mismatched `BEADS_DIR`, and the label-scoped query was empty before materialization and non-empty after — so the guard fires on the graph rather than on the checklist
- [x] 5.2 Add the claim loop to the apply instruction: select claimable work by the change's label and exclude the epic, claim one atomically, implement it, and repeat until none remain. Verified on a 5-task change: the ready frontier was exactly the two claimable tasks with the pinned epic absent, the claim succeeded, and a second claim on the same bead by another actor was refused with "issue already claimed by"
- [x] 5.3 Add the two-sided completion rule — close the bead, then mark its checkbox — and the rule that a closed blocker makes its dependents ready. Verified by closing a blocking bead, watching its dependent move from absent to present in the ready frontier, and ticking the matching box: `openspec` then reported 2 of 5 complete, so the index and the graph agreed
- [x] 5.4 Add the resume path: derive remaining work from the graph and claim the next ready bead without reading the full plan. Verified with the graph alone: the open tasks, the next claimable ones, and the reason a dependent was waiting were all readable from `bd list`, `bd ready` and `bd blocked`, with the plan never opened
- [x] 5.5 Add the evidence capture step: a note on the change epic recording what verification found, plus a summary block appended under `## Workflow follow-up` in `tasks.md`. Verified when the note read back from the epic and the appended summary left `openspec` progress at 2 of 5, proving the section stays outside tracked progress. This task also caught the instruction being wrong: `bd close` on a pinned epic is refused outright, so the finishing step needs `--force` — corrected in the instruction, and recorded in design decision 14 and the `The epic is closed explicitly` scenario

## 6. Spec changes during implementation

- [ ] 6.1 Add the delta-operation mapping to the apply instruction: ADDED creates linked beads and matching tasks, MODIFIED updates or supersedes existing beads, REMOVED closes or defers them with the removal reason, RENAMED relabels and annotates only. Verified by performing each of the four operations on a scratch change and checking the graph and `tasks.md` after each, satisfying the `Every spec delta has a paired graph change` requirement
- [ ] 6.2 Add the coherence rule: after a spec change, the proposal lists any new capability and the change passes `openspec validate`. Verified by adding a capability to the scratch change's delta spec and confirming validation passes only after the proposal is updated
- [ ] 6.3 Add the three-way discovery disposition — record as a `discovered-from` bead, escalate to a new change, or halt and report on a security finding. Verified by presenting each of the three discovery shapes to the instruction and confirming the security case halts rather than filing a task
- [ ] 6.4 Add the bounded clarification rule: at most five questions in one pass, resolutions written into the artifacts. Verified by raising four ambiguities at once and confirming the instruction asks no more than five questions and that each recorded resolution appears in an artifact file
- [ ] 6.5 Add the read-only reconciliation check reporting tasks without beads, beads without tasks, and cycles via the graph's own cycle detection. Verified by deleting a task line whose bead remains and confirming the check reports it, then confirming the check writes no file, then restoring the line

## 7. Archive gating

- [ ] 7.1 Add the pre-archive check sequence: no unresolved discovery beads, no dependency cycle, and no bead referenced in a commit still open. Verified by holding each condition in turn and confirming archiving is refused with the specific condition named
- [ ] 7.2 Add the external-condition archive gate covering a merged pull request, a successful CI run, and an explicit human approval. Verified by creating the gate for the scratch change and confirming archiving is unavailable while the condition is unmet and available once the gate is resolved

## 8. Packaging

- [ ] 8.1 Write the root `README.md`: what the schema is and the problem it solves, the artifact diagram, the one-prompt agent install with its manual equivalent, activation, and an explicit limitations section covering snapshot behaviour and the harness boundary. Verified by following the documented manual steps in a scratch project and reaching a validated, activated schema
- [ ] 8.2 Verify the manual install path in a scratch project with no agent involved, following only the shell commands in the README. Verified when it reaches a validated, activated schema, satisfying the `Installation without an agent` scenario
- [ ] 8.3 Write `CONTRIBUTING.md` covering repo layout, the `openspec schema fork` and `openspec schema init` flows, and the required gate of `openspec schema validate` plus the conformance check. Verified when every command it documents runs as written against this repository
- [ ] 8.4 Add the MIT `LICENSE` and reference it from the README. Verified when the licence file exists and the README names it

## 9. Scenario suite and cold-reader tests

- [ ] 9.1 Write the scenario set under `tests/scenarios/`, derived from the scenarios in the six capability specs, each stating its setup and the files and beads expected afterwards. Verified when every requirement in every spec has at least one corresponding entry, and an entry can be read and executed without the surrounding context
- [ ] 9.2 Add the cold-reader tests: hand the README install prompt and the apply instruction each to an agent session with no prior context, and assert the resulting state. Verified when the install prompt reaches a validated activated schema, the apply instruction produces the expected artifacts and closures, and any divergence is recorded against the responsible instruction passage and reported as a failure
- [ ] 9.3 Extend `tests/README.md` to cover the scenario and cold-reader layers, what each covers, and how to run them, including the statement that the harness tests this repository's schemas and is not copied to adopters. Verified when every command it documents runs as written and the README states the harness boundary

## 10. End-to-end verification

- [ ] 10.1 Run the full cycle in a scratch project: install `beads-bridge`, create a change, produce every artifact, materialize the graph, apply the work, run verification, and archive. Verified when the cycle completes with the archive gated on its external condition and every artifact present in the archived change
- [ ] 10.2 Exercise the failure paths against the scratch project: a task marked complete whose bead is open, an open discovery at archive time, and a plan whose edge reverses a parent relationship. Verified when each is reported by the conformance check or the reconciliation check with a specific message rather than passing silently, and the repository is restored to a validated state afterwards

## Workflow follow-up

- Promote `schema: beads-bridge` to the repository default in `openspec/config.yaml` after a real change has completed a full propose → apply → archive cycle, then dogfood it on this repository's next change.
- Keep the scenario set in step with the specs, since the specs' scenarios are the acceptance suite rather than a separate document.
- Port future improvements to the four shared artifacts by re-forking the packaged `spec-driven` schema and diffing, since a fork is a snapshot.
- Raise separate changes for the deliberately deferred Beads capabilities — swarm execution, formulas, wisps, stores and routing, cross-repository shipping — each with its own requirements.
- Resolve the two tracking-system question by adopting this schema in this repository, at which point `AGENTS.md`'s Beads-for-everything rule and OpenSpec's checklist stop competing.
