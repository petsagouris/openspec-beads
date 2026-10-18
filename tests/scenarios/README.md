# Scenarios

The acceptance suite for the schemas in this repository, derived from the scenarios in the capability specs under `openspec/specs/`.

## Why this exists

`openspec validate --strict` requires every requirement to carry at least one scenario, so the specs already contain the test cases. This file turns them into something runnable: for each requirement, what has to exist first, what to do, and what must be observably true afterwards.

Two kinds of entry live here, and the difference matters:

- **`command`** — the expectation is a fact a command can settle. Run it and read the exit code or the output.
- **cold-reader** — the expectation is about how a reader behaves, so it is exercised by handing the instruction to an agent session with no prior context (see `tests/README.md`). `inspection` marks the weaker remainder: the instruction states the rule and nothing mechanical can assert it.

An entry is never amended to match what happened. If an expectation does not hold, that is the finding.

## Coverage

Every requirement in every spec has at least one entry. Where an entry was exercised while building the schema, the task that did it is named.

---

## beads-bridge-schema

**A beads artifact extends the spec-driven workflow**

- Setup: a schema with a `beads` artifact generating `beads/plan.json`.
- Do: `openspec status --change <name> --json` on a change using it.
- Expect: `beads` listed, blocked until `specs`, `design` and `tasks` complete; path resolves to `<changeRoot>/beads/plan.json`.
- How: `command`. Exercised in task 2.1.

**Spec-driven artifacts are preserved**

- Setup: the copied schema and the packaged `spec-driven`.
- Do: `diff` the two `schema.yaml` files; `diff` each of the four shared templates.
- Expect: the package's whole artifacts block appears verbatim, with only the appended artifact differing; all four templates identical byte for byte.
- How: `command`. Exercised in task 2.2.

**Apply requires the plan and tracks the checklist**

- Setup: a change on the schema with `tasks.md` present.
- Do: `openspec instructions apply --change <name> --json`.
- Expect: `applyRequires` is `[beads]`, `taskTrackingConfigured` is true, and `progress.total` counts the tracked checkboxes.
- How: `command`. Exercised in task 2.3.

**The bridge is prompt-layer only**

- Setup: the schema folder.
- Do: list its contents.
- Expect: `schema.yaml`, `templates/`, `README.md` and nothing executable.
- How: `command`.

**The schema is self-contained and validatable**

- Setup: a project with the folder copied into `openspec/schemas/`.
- Do: `openspec schema validate beads-bridge`; then break an artifact's `requires` and re-run.
- Expect: valid, then a failure naming the invalid dependency.
- How: `command`. Exercised in task 8.2.

---

## beads-plan-materialization

**The plan conforms to the Beads graph plan schema**

- Setup: a plan produced from a change's tasks.
- Do: `bd create --graph beads/plan.json --dry-run`, then without `--dry-run`.
- Expect: dry-run reports node and edge counts without creating anything; the real run creates the whole graph in one transaction and returns a key-to-id map.
- How: `command`. Exercised in task 4.4.

**One epic per change and one node per task**

- Setup: a change with N tracked tasks, some already complete.
- Do: compare the plan's nodes against `tasks.md`.
- Expect: exactly one sense-pinned epic plus N task nodes, keys equal to task ids, no missing, extra or duplicate keys; completed tasks carry `status: "closed"`.
- How: `command`. Exercised in task 4.1.

**Edges encode only real ordering**

- Setup: a plan with a hand-written expectation of which task pairs are ordered.
- Do: `node tests/plan/check-plan.mjs <plan>`; then chain every task in priority order and re-run.
- Expect: conformance, then E6 naming the chain.
- How: `command`. Exercised in task 4.3.

**Nodes carry provenance to their source**

- Setup: a materialized graph.
- Do: `bd list --label change:<name> --json`; `bd show <epic> --json`; `bd show <task-id> --json`.
- Expect: every node returned by the label query; the epic's `description` and `acceptance_criteria` readable; each task's metadata naming its change and source task.
- How: `command`. Exercised in task 4.2.

**Materialization is atomic and idempotent**

- Setup: a plan, and a database where the graph already exists.
- Do: fail a plan mid-way; then run the same plan twice.
- Expect: nothing created on failure. On a second run, `bd create --graph` **does** duplicate, so the guard is the preflight: a label-scoped query must be non-empty and creation must be skipped.
- How: `command`. Exercised in tasks 4.4 and 5.1.

**The write target is verified before writing**

- Setup: a `BEADS_DIR` pointing at another project's database.
- Do: `bd where` under both the correct and the mismatched environment.
- Expect: the mismatch is visible before any write, and apply refuses.
- How: `command`. Exercised in task 5.1.

---

## spec-change-reconciliation

**Every spec delta has a paired graph change**

- Setup: a materialized graph.
- Do: perform one edit of each kind — added, modified, removed, renamed.
- Expect: added creates a bead linked `discovered-from` the epic; modified updates or supersedes, with supersede auto-closing the old bead; removed defers, or closes with `--force` when blocked, recording the reason; renamed updates labels and adds a note with no structural change.
- How: `command`. Exercised in task 6.1.

**The artifact set stays coherent after a spec change**

- Setup: a delta spec for a capability the proposal does not name.
- Do: `openspec validate <change>`.
- Expect: it **passes**, because validation never compares artifacts with one another. The proposal listing the capability is therefore the coherence review's job, not the validator's.
- How: `command`. Exercised in task 6.2.

**Non-spec discoveries are dispositioned explicitly**

- Setup: a materialized graph mid-implementation.
- Do: present a defect, a design-shaped finding, and a security finding.
- Expect: the defect becomes a bead labelled `discovery` with `discovered-from`; the design-shaped finding is escalated rather than absorbed; the security finding halts the work and is reported.
- How: `command` for the bead, cold-reader for the other two. Exercised in task 6.3.

**A reconciliation check compares the checklist and the graph**

- Setup: a graph deliberately out of step — a task line deleted while its bead remains.
- Do: compare the tracked tasks against `bd list --label change:<name> --all --json`, and run `bd dep cycles`.
- Expect: the drift is named, cycles are empty, and nothing is written. Note the two traps a cold-reader test found: without `--all` the query returns nothing once work is under way and cannot tell "no beads" from "all beads closed", and the pinned epic always carries the same label, so the count is one more than the task count.
- How: `command`. Exercised in task 6.5; the deliberate-drift half is exercised in task 10.2.

**Clarification during apply is bounded**

- Setup: a mid-implementation spec change raising several ambiguities at once.
- Do: observe the reader's behaviour.
- Expect: at most five questions in one pass, and each resolution appearing in an artifact rather than only in the transcript.
- How: cold-reader. Not yet exercised.

---

## beads-evidence

**Apply draws work from the ready frontier**

- Setup: a materialized graph with some tasks blocked and one already claimed elsewhere.
- Do: `bd ready --label change:<name> --json`; claim one; attempt to claim the same one as another actor.
- Expect: only unblocked, unclaimed work is returned; the pinned epic is excluded; the second claim is refused.
- How: `command`. Exercised in task 5.2.

**Completing work updates both records**

- Setup: a claimed bead blocking another.
- Do: `bd close <id>`, then mark its checkbox in `tasks.md`.
- Expect: the dependent moves into the ready frontier, and `openspec` progress increments.
- How: `command`. Exercised in task 5.3.

**Verification reads the graph as evidence**

- Setup: a task marked complete whose bead is still open; and an open discovery.
- Do: run the verification queries in the apply instruction.
- Expect: both mismatches are reported, and archive readiness is withheld while a discovery is open.
- How: `command`. Exercised in task 10.2.

**Archiving waits on an external condition**

- Setup: a materialized change with a gate blocking it.
- Do: `bd blocked`; `bd gate check` for a timer gate; `bd gate resolve` for a human gate.
- Expect: the change is absent from `bd ready` while the gate is open, and reachable again once it closes. A `gh:*` gate with no git remote reports an error rather than closing.
- How: `command`. Exercised in task 7.2.

**Pre-archive checks run before archiving**

- Setup: an open discovery, a cycle-free graph, and a bead referenced by a commit but never closed.
- Do: run the four pre-archive queries.
- Expect: the open discovery makes the `--label discovery --status open` query non-empty; `bd dep cycles` is empty; `bd orphans` names the unclosed bead.
- How: `command`. Exercised in task 7.1.

**A change can be resumed from the graph**

- Setup: a graph created by a session that is gone.
- Do: read `bd list --label change:<name>`, `bd ready --label change:<name>`, `bd blocked` with the plan never opened.
- Expect: remaining work, next claimable work, and blocking reasons all recoverable.
- How: `command`. Exercised in task 5.4.

---

## schema-conformance-testing

**Validation and conformance checks gate schema work**

- Setup: a schema with an artifact whose template file is missing.
- Do: `openspec schema validate <name>`.
- Expect: failure naming the missing template; with the template present, success.
- How: `command`. Exercised in task 8.2.

**The plan a schema produces is checked against its rules**

- Setup: the conforming fixture and the seven malformed fixtures.
- Do: `node tests/plan/check-plan.mjs` on each.
- Expect: the conforming plan passes; each malformed plan trips exactly its own rule (E1–E7) and exits non-zero.
- How: `command`. Exercised in task 3.1.

**Checks run hermetically**

- Setup: this repository with its own beads and changes present.
- Do: `node tests/run.mjs`.
- Expect: it supplies its own database, and this repository's change folders and bead set are byte-identical afterwards.
- How: `command`. Exercised in task 3.2.

**Non-mechanical behaviour is covered by executed scenarios**

- Setup: this file.
- Do: check every requirement in every spec against the entries above.
- Expect: no requirement without an entry; each entry readable and executable without the surrounding context.
- How: `command`. Exercised in task 9.1.

**The instructions are tested against a reader without context**

- Setup: a scratch project, and an agent session with no prior context.
- Do: give the session only the install prompt, then only the apply instruction.
- Expect: a validated, activated schema; then the expected artifacts, claims and closures. Any divergence is recorded against the passage responsible and reported as a failure.
- How: cold-reader. Exercised in task 9.2.

---

## custom-schema-packaging

**Each schema is a self-contained copyable folder**

- Setup: a project with the folder copied into `openspec/schemas/`.
- Do: `openspec schemas --json`; then remove a template and re-validate.
- Expect: the schema resolves with its artifact chain and needs nothing else from this repository; the missing template fails validation.
- How: `command`. Exercised in task 8.2.

**A single prompt installs a schema**

- Setup: a project that uses OpenSpec, and a session with no prior context.
- Do: paste the README's install prompt.
- Expect: it installs, activates and validates; with `"root": null` it stops and says `openspec init` comes first.
- How: cold-reader. Exercised in task 9.2.

**Activation is documented per schema**

- Setup: the schema's README and `schema.yaml`.
- Do: name every artifact id the README offers as a config key and check each against the schema.
- Expect: every id exists.
- How: `command`. Exercised in task 2.5.

**Limitations are stated**

- Setup: the repository README.
- Do: read it.
- Expect: it states the snapshot behaviour — that copying a schema means taking a version and upstream changes must be ported deliberately — and that the harness does not travel to adopters.
- How: inspection. Exercised in task 8.1.
