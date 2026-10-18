# Tasks

## 1. Resolve probe-gated decisions

These settle the three assumptions the design rests on. Each probes for real and records the outcome in `design.md`; the fallback is stated so a negative result does not stall the change.

- [ ] 1.1 Probe that a nested artifact path is accepted, by adding a `beads` artifact with `generates: beads/plan.json` to a scratch schema under `openspec/schemas/probe-nested/` and running `openspec schema validate probe-nested`. Verified when validation reports the schema valid; if it rejects the nested path, adopt the single-file fallback `beads-plan.json` at the change root, record the reason in `design.md` decision 2, and delete the scratch schema
- [ ] 1.2 Probe `bd create --graph` with a scratch 15-node plan containing one epic via `parent_key`, three `blocks` edges, and a `waits-for` edge, running `bd create --graph <plan> --dry-run` first and then for real in a throwaway database. Verified when the created graph's node count, parent relationships, and edges match the plan; record the accepted and rejected edge shapes in `design.md` decision 12, then delete the scratch beads
- [ ] 1.3 Probe that OpenSpec tolerates a trailing bead id on a tracked task line, by writing a scratch `tasks.md` containing `- [ ] 1.1 Do a thing (osb-a1b2)` in a scratch change and running `openspec status --change <name> --json`. Verified when the task is counted in `progress.total`; if it is not, record the `plan.json` id-map fallback in `design.md` decision 5, revise spec `beads-plan-materialization` accordingly, and delete the scratch change

## 2. Schema skeleton and templates

- [ ] 2.1 Create `openspec/schemas/beads-bridge/schema.yaml` with `name: beads-bridge`, `version: 1`, and the five artifacts: `proposal`, `specs`, `design`, `tasks` unchanged from the packaged schema, plus `beads`. Verified when `openspec schema validate beads-bridge` reports the schema valid
- [ ] 2.2 Copy the four shared templates from the installed `spec-driven` schema into `openspec/schemas/beads-bridge/templates/`. Verified when each copied template is byte-identical to the packaged original, checked with `diff` against the installed package path, satisfying the `Spec-driven artifacts are preserved` requirement
- [ ] 2.3 Set `apply` in `schema.yaml` to `requires: [beads]` and `tracks: tasks.md`. Verified when `openspec instructions apply --change add-beads-bridge-schema --json` reports `taskTrackingConfigured: true` and `state` reflecting `tasks.md`
- [ ] 2.4 Create `templates/beads-plan.json` as the artifact's structure: a `nodes` and `edges` skeleton with one commented epic node and one commented task node showing `key`, `title`, `type`, `priority`, `labels`, `metadata`, `parent_key`, and an `edges` example. Verified when `openspec schema validate beads-bridge` still passes with the template referenced by the `beads` artifact
- [ ] 2.5 Write `openspec/schemas/beads-bridge/README.md` covering what the schema is for, the artifact DAG, activation via `schema: beads-bridge`, the artifact ids usable in `config.yaml` rules, and the snapshot limitation. Verified when every artifact id named in the README exists in `schema.yaml`, and a reader can activate the schema from the README alone

## 3. The beads artifact: materialization contract

- [ ] 3.1 Write the `beads` artifact `instruction` covering node derivation: one epic node for the change, one node per tracked task, `parent_key` from each task node to the epic, and the mapping from task text to `type` and `priority`. Verified by creating a scratch change from this change's own `tasks.md` and inspecting the produced plan for exactly one epic plus one node per tracked task
- [ ] 3.2 Extend the instruction with the provenance rules: a `change:<name>` label and metadata naming the change and the source task on every node, and the epic's `description` and `acceptance_criteria` drawn from the proposal and specs. Verified by materializing the scratch plan and reading back the epic's acceptance criteria and a task node's metadata against `proposal.md`
- [ ] 3.3 Extend the instruction with the edge rules: an edge is created only where ordering is genuinely required, independent tasks are not joined, and priority is never expressed as an edge. Verified by checking the scratch plan against a hand-written expectation of which task pairs are ordered, and confirming no task pair is connected purely because of differing priority
- [ ] 3.4 Extend the instruction with the materialization sequence: preview with `--dry-run`, then create once, then record each minted id on its own task line in `tasks.md`. Verified by running the sequence against the scratch change and confirming `tasks.md` carries one id per task line and no duplicate beads were created on a second run

## 4. Apply instruction

- [ ] 4.1 Write the apply `instruction` preflight: confirm the resolved Beads database belongs to this project, confirm `beads/plan.json` exists, and confirm the graph is absent or already recorded. Verified when a deliberately mismatched `BEADS_DIR` causes apply to refuse with the mismatch reported rather than creating issues
- [ ] 4.2 Add the claim loop to the apply instruction: query the change's ready beads, claim one atomically, implement it, and repeat until none remain. Verified when a run on the scratch change claims a bead, and a second concurrent claim on the same bead fails
- [ ] 4.3 Add the two-sided completion rule — close the bead, then mark its checkbox — and the rule that a closed blocker makes its dependents ready. Verified by closing a blocking bead and confirming its dependent appears in the ready frontier and its checkbox is marked in the same step
- [ ] 4.4 Add the resume path: derive remaining work from the graph and claim the next ready bead without reading the full plan. Verified by starting a fresh session on the scratched change and identifying the correct next bead from graph queries alone
- [ ] 4.5 Add the evidence capture step: a note on the change epic recording what verification found, plus a summary block appended under `## Workflow follow-up` in `tasks.md`. Verified when the note is readable via `bd show <epic>` and the summary appears outside tracked progress, leaving `openspec status` unchanged

## 5. Spec changes during implementation

- [ ] 5.1 Add the delta-operation mapping to the apply instruction: ADDED creates linked beads and matching tasks, MODIFIED updates or supersedes existing beads, REMOVED closes or defers them with the removal reason, RENAMED relabels and annotates only. Verified by performing each of the four operations on a scratch change and checking the graph and `tasks.md` after each, satisfying the `Every spec delta has a paired graph change` requirement
- [ ] 5.2 Add the coherence rule: after a spec change, the proposal lists any new capability and the change passes `openspec validate`. Verified by adding a capability to the scratch change's delta spec and confirming validation passes only after the proposal is updated
- [ ] 5.3 Add the three-way discovery disposition — record as a `discovered-from` bead, escalate to a new change, or halt and report on a security finding. Verified by presenting each of the three discovery shapes to the instruction and confirming the security case halts rather than filing a task
- [ ] 5.4 Add the bounded clarification rule: at most five questions in one pass, resolutions written into the artifacts. Verified by raising four ambiguities at once and confirming the instruction asks no more than five questions and that each recorded resolution appears in an artifact file
- [ ] 5.5 Add the read-only reconciliation check reporting tasks without beads, beads without tasks, and cycles via the graph's own cycle detection. Verified by deleting a task line whose bead remains and confirming the check reports it, then confirming the check writes no file, then restoring the line

## 6. Archive gating

- [ ] 6.1 Add the pre-archive check sequence: no unresolved discovery beads, no dependency cycle, and no bead referenced in a commit still open. Verified by holding each condition in turn and confirming archiving is refused with the specific condition named
- [ ] 6.2 Add the external-condition archive gate covering a merged pull request, a successful CI run, and an explicit human approval. Verified by creating the gate for the scratch change and confirming archiving is unavailable while the condition is unmet and available once the gate is resolved

## 7. Packaging

- [ ] 7.1 Write the root `README.md`: what the schema is and the problem it solves, the artifact diagram, the one-prompt agent install with its manual equivalent, activation, and an explicit limitations section including the snapshot behaviour. Verified by following the documented manual steps in a scratch project and reaching a validated, activated schema
- [ ] 7.2 Verify the README's install prompt end-to-end by handing it to a fresh agent session in a scratch project with no prior context, and confirming it installs, activates, and validates the schema without other instruction, satisfying the `A single prompt installs a schema` requirement
- [ ] 7.3 Write `CONTRIBUTING.md` covering repo layout, the `openspec schema fork` and `openspec schema init` flows, and `openspec schema validate` as the required gate before a change is complete. Verified when every command it documents runs as written against this repository
- [ ] 7.4 Add the MIT `LICENSE` and reference it from the README. Verified when the licence file exists and the README names it

## 8. End-to-end verification

- [ ] 8.1 Run the full cycle in a scratch project: install `beads-bridge`, create a change, produce every artifact, materialize the graph, apply the work, run verification, and archive. Verified when the cycle completes with the archive gated on its external condition and every artifact present in the archived change
- [ ] 8.2 Verify the schema's failure paths catch a deliberately desynchronized state: a task marked complete whose bead is open, an open discovery at archive time, and a plan whose edge reverses a parent relationship. Verified when each is reported with a specific message rather than passing silently, and the repository is restored to a validated state afterwards

## Workflow follow-up

- Promote `schema: beads-bridge` to the repository default in `openspec/config.yaml` after a real change has completed a full propose → apply → archive cycle, then dogfood it on this repository's next change.
- Port future improvements to the four shared artifacts by re-forking the packaged `spec-driven` schema and diffing, since a fork is a snapshot.
- Raise separate changes for the deliberately deferred Beads capabilities — swarm execution, formulas, wisps, stores and routing, cross-repository shipping — each with its own requirements.
- Resolve the two tracking-system question by adopting this schema in this repository, at which point `AGENTS.md`'s Beads-for-everything rule and OpenSpec's checklist stop competing.
