# Design

## Context

OpenSpec 1.14.3 and Beads 1.3.1 are both installed and were read directly rather than worked from documentation, because both have moved since the reference material was written. Three findings shape everything below.

First, OpenSpec 1.14.3 has moved past the community schema examples. The skill set is now `openspec-propose`, `openspec-apply-change`, `openspec-update-change`, `openspec-sync-specs`, and `openspec-archive-change` as core, with six more behind an optional profile. Changes carry `.openspec.yaml` metadata (`schema:`, `skip_specs:`), and instructions expose a store-aware `planningHome.root`. Any schema modelled on the older community examples would be shaped for a CLI that no longer exists.

Second, the apply state machine is driven by the tracked task file. In `instructions.js`, the branch `else if (!tracksFile) { state = 'ready' }` means a schema without `apply.tracks` never reaches `all_done`, and `progress: { total, complete, remaining }` is computed from the tracked file's checkboxes — the same numbers `openspec list`, `openspec status`, and archive's incomplete-task check read.

Third, `bd create --graph` accepts a whole issue graph — nodes with `key`, `parent_key`, `type`, `priority`, `labels`, `metadata`, and typed fields like `acceptance_criteria`; edges with `blocks` and the other dependency types — and creates it in a single transaction. This is the primitive the bridge is built on.

The division of responsibility follows from what each tool actually models. OpenSpec owns intent and contract: reviewed, git-committed, archived as durable history, and the accumulating `openspec/specs/` tree as the system's behaviour contract. Beads owns execution state: which work is ready, who holds it, what blocks what, and what survives a context reset. Neither is asked to do the other's job.

## Goals / Non-Goals

**Goals:**

- Let an OpenSpec change execute against a real dependency graph, with atomic claims and a computed ready frontier, without altering the four spec-driven artifacts.
- Make completion a checked fact: a bead is closed, not only a box ticked.
- Give mid-implementation spec changes a defined path, so a changed requirement is never left half-applied to the spec or the work graph.
- Let verification and archiving read real evidence, and let archiving wait on the code actually landing.
- Keep the whole bridge in prompts and templates, so it works wherever OpenSpec works and survives upgrades of either tool.

**Non-Goals:**

- Changing the built-in `spec-driven` schema, any installed skill or command, or OpenSpec's CLI.
- Replacing OpenSpec's planning methodology. The four planning artifacts and their meaning are untouched.
- Making Beads the source of truth for *intent*. Beads never rewrites a proposal, a requirement, or a design decision.
- Session orchestration, multi-agent swarm execution, and cross-repository routing. Real Beads capabilities, deliberately deferred.
- Enforcing anything at the harness layer. See the enforcement decision below.

## Decisions

### 1. Fork the shipped `spec-driven` schema, not a community bridge

The starting point is the `spec-driven` schema inside the installed package, extended with one artifact. Alternatives were the community `superpowers-bridge` shape and a from-scratch schema. Both lose: `superpowers-bridge` was written against OpenSpec ~1.4 and models a different integration partner, so adopting its shape means inheriting assumptions about a CLI that has since changed the apply contract, the skill set, and change metadata. A from-scratch schema discards a working, maintained artifact graph and its instructions.

Consequence: the four shared artifacts keep the exact `requires` edges, `generates` paths, and instructions the package ships. That is a testable requirement (`beads-bridge-schema`), not a preference.

### 2. One new artifact, not a redesign

`beads` is added at `beads/plan.json`, requiring `specs`, `design`, and `tasks`. It exists because the graph judgments have nowhere else to live. `tasks.md` deliberately does not express ordering, parallelism, issue type, or priority; expressing them there would mean diverging the tracked file from the artifact the spec-driven instructions describe. Keeping them in a separate, reviewable artifact is what allows the four artifacts to stay untouched.

The alternative — deriving the graph silently inside apply — was rejected because the plan *is* a design decision: which tasks are parallel, which are blocked, how a task maps to an issue type. That deserves review before any bead exists, and it is the input to a single atomic operation.

### 3. `apply.tracks` stays `tasks.md`

The tempting simplification is to let Beads be the only tracker and drop `tracks`. The source settles the cost: with no tracked file, apply state is permanently `ready` — `all_done` is unreachable — and progress reports 0/0. The whole progress surface, including archive's incomplete-task check, reads the tracked file.

So the relationship is documented as an index, not duplication: OpenSpec's checklist is the durable index a human reads and reviews; Beads is the live database of work. Completion updates both, in an order that fails safe (decision 8). This is also the position the one prior-art framework in this space arrived at independently, having made it their first and highest-ranked project principle.

### 4. `bd create --graph` is the materialization primitive

Three candidates: a shell loop creating one issue per task, a Beads formula poured per change, or the JSON graph plan.

A shell loop is what the existing prior art does, and its own changelog explains why it looks the way it does: `bd create --file` panicked on bulk markdown import, so the workaround parses markdown in bash and creates issues one at a time with a delay between calls. That is N transactions, N commit points, and a partial-failure state to reconcile. A formula expresses reusable structure, but this plan is per-change data, and a formula would be a second, competing way to author the same graph. The graph plan is a different code path from the importer that panicked, creates the graph atomically, and has a `--dry-run` for review.

### 5. Minted ids are recorded inline on the task line

The bead id is written onto the same `tasks.md` line as its checkbox, so the index and the database cannot drift without becoming visible. A separate id map was the first design and was rejected: it is a third artifact to keep in sync. The cost is that task text carries a suffix, which OpenSpec renders in `status` and instructions output — cosmetic, and worth it for the failure mode it removes.

Open question for the probe: confirm OpenSpec's task parsing tolerates trailing text after the task description. If it does not, the fallback is a `created` map inside `plan.json`, and this decision is revised with the reason recorded here.

### 6. No persisted verification artifact

The obvious addition is a `verify.md` capturing evidence. Rejected on two grounds. Mechanically, only `skip_specs` exists as a skip key and it only applies to artifacts whose `generates` path is under `specs/`, so a `verify` artifact would be unconditionally required on every change including trivial ones. Substantively, Beads already stores the evidence — closed beads, open discoveries, gates, history — so a copy in the change folder is a second record that can disagree with the first.

Evidence therefore lands in Beads (a note on the change epic) plus a short summary in `tasks.md`'s non-tracked follow-up section, which the spec-driven template already provides and which never enters tracked progress. That keeps evidence queryable *and* visible in the change's git diff, without an artifact that cannot be skipped.

### 7. Archiving gates on an external fact

OpenSpec archives when asked. Beads gates express waits on the real world — a merged PR, a green CI run, a human approval — as blocking issues, evaluated without polling. Archiving is therefore gated on a condition rather than a timestamp, which closes the specific gap where work is closed in the tracker while the code is still on a branch.

### 8. Completion closes the bead, then ticks the box

Ordering matters because the two records can be interrupted between. Closing first means an interruption leaves work closed but an unticked box — visible, and recoverable by re-running. Ticking first would leave a task marked done whose work is still open, which is the failure the whole design exists to prevent.

### 9. Prompt-layer only, and enforcement therefore by facts

No shell scripts, no CLI patches. The integration lives in instructions and templates. This was chosen knowing the cost: nothing is enforced by a harness hook, so the schema's rules are discipline rather than mechanism.

The boundary is the schema folder. Adopters receive only `schema.yaml`, `templates/`, and `README.md`, so a check shipped inside it would be copied to projects that never run it. The conformance harness in decision 13 therefore lives outside the schema folder and observes the bridge rather than implementing it.

The mitigation is to lean on facts instead of prose wherever a fact exists. `openspec validate`, the apply state machine, the graph's write-time cycle rejection, atomic claims, and Beads gates are all externally checkable. Where the schema must rely on agent judgement — deriving edges, dispositioning a discovery — the instruction makes the judgement explicit and reviewable rather than leaving it implicit. The assertions in this design that matter most are the ones a command can refute.

### 10. Spec changes are paired, and OpenSpec owns the artifact side

A spec change mid-implementation is two problems. The artifact side is already solved: the change's artifacts are pre-archive deltas, and OpenSpec's own update flow revises them and reviews their coherence. Reimplementing that would duplicate a working mechanism.

So the bridge owns only the graph side and the *pairing*. Each delta operation — ADDED, MODIFIED, REMOVED, RENAMED — is mapped to its graph and checklist consequences, applied in the same step as the spec edit. The reconciliation check exists to catch the case where only one side moved.

### 11. Discoveries are dispositioned, not absorbed

A discovery during apply is one of three things: out-of-scope work, a design problem, or a security concern. Collapsing them into a single "create a task" reflex loses the security case, which must stop work rather than be filed. The disposition is therefore explicit and three-way.

### 12. Edges encode only real ordering

There is a tempting shorthand in prior art: chaining dependencies by priority tier, so every higher-priority task blocks every lower-priority one. It is rejected outright. It serializes the graph, destroys the ready frontier's value, and ignores the parallelism the task author already expressed. Priority and ordering are separate axes: priority is a field on a node, ordering is an edge, and an edge exists only where one task genuinely cannot start before another finishes.

Probing confirmed the direction and exposed a trap in the official example. `from_key` is the **dependent** and `to_key` the **blocker**: `{from_key: "t5", to_key: "t1", type: "blocks"}` produced "task 5 is blocked by task 1". The help text's own example reads the opposite way if `from`/`to` are taken as subject and object, so a plan written from intuition inverts every dependency — silently, and in a direction that still validates. That is precisely why the conformance check asserts direction instead of trusting the plan to be read correctly.

The probe also confirmed that a `blocks` edge from a parent to its own child is rejected, as a blocking *cycle* involving the child rather than as a parent-child violation. The outcome is right, the message is not, which is why the conformance check reports that shape itself and names the reason.

### 13. Testing: mechanics automated, prose executed, the untestable part named

The bridge's content is mostly prose, so testing has to be layered, and the layers differ sharply in strength.

- **Mechanics are automated.** Schema structure and wiring are checked by `openspec schema validate` and by assertions on `openspec instructions --json` fields. The plan is checked by a conformance check: unique node keys, every edge endpoint resolving, no ordering edge derived from priority, and no edge reversing a `parent_key` relationship. These are deterministic, cheap, and catch the failure mode this design is most exposed to, since the plan is the only artifact that is both machine-checkable and easy to get subtly wrong.
- **Prose is executed.** `openspec validate --strict` requires every requirement to carry at least one scenario, which makes the specs' scenarios the acceptance suite directly — no separate test-authoring pass, and no temptation to test something other than what was specified. Each case runs in a scratch project and is asserted on files and on beads.
- **The prompt is tested against a cold reader.** The question that matters is not whether the author can follow the instruction but whether a session with no prior context can. The install prompt and the apply instruction are each handed to a fresh agent session, and the resulting state is asserted.
- **One part is untestable, and is named as such.** Nothing can establish that an arbitrary third-party agent will follow the prose. Two things bound it: pushing every check that can be a command into a command, so the instruction says "run this and read the result" rather than asking the agent to judge its own state; and the cold-reader test, the closest available approximation of a naive reader.

Two consequences follow. Checks stay inline in the instruction rather than shipping as a script, because the schema folder must stay free of executables (decision 9) — the harness verifies those inline commands, it does not replace them. And runs must be hermetic, pointed at a throwaway database through `BEADS_DIR`, because a suite that wrote to this repository's own work graph would corrupt the record it exists to leave alone.

This is also the one place where the design knowingly exceeds its reference material: the closest prior-art framework lists "no automated tests for the framework itself" among its known limitations, and OpenSpec's own update flow re-checks coherence without executing anything. Automating the mechanical half is cheap.

### 14. The container epic is pinned, excluded from selection, and closed explicitly

A container node with children is an ordinary open issue, so it appears in the ready frontier — in plain `bd ready`, and in `bd ready --mol <id>` where it turns up inside `parallel_groups`. An agent told to claim the first ready bead would be claiming its own container.

`pinned: true` removes the epic from `bd ready` but **not** from `bd ready --mol`'s ready steps, and a pinned root never auto-closes: after its last child was closed, the pinned epic was still open. Three rules therefore hold together:

- the plan sets `pinned: true` on the epic, so unscoped ready queries stay clean;
- apply selects claimable work by the change's label and excludes the epic explicitly, because `--mol` will not do it;
- the change's completion step closes the epic itself, because nothing else will.

The cost is losing auto-close. That is acceptable: the explicit close was already the change's final step, and stating it is more honest than depending on a side effect of a flag set for a different reason. The `parallel_groups` view remains useful for reporting which work can proceed concurrently.

A further detail the probe surfaced: the two ready queries return different JSON shapes — `bd ready --json` an array of issues, `bd ready --mol --json` an object with `parallel_groups`, `ready_steps`, and a `steps[]` of `{issue, parallel_group, parallel_info}`. The instruction must not assume one shape for both.

## Probe results

Run against Beads 1.3.1 and OpenSpec 1.14.3, in an isolated database and scratch changes, with every fixture removed afterwards. These resolve the gates in tasks group 1.

| Probe | Result |
| --- | --- |
| Nested `generates: beads/plan.json` | **Accepted.** Validates, and resolves to `<changeRoot>/beads/plan.json` in `artifactPaths` |
| `bd create --graph` with 15 nodes (epic via `parent_key` plus 14 tasks) and 3 `blocks` edges | **Accepted** in one transaction; returns a key-to-id map; children receive flat ids, not hierarchical ones |
| `blocks` direction | `from_key` is the **dependent**, `to_key` the **blocker** |
| `waits-for` edge with `spawner_key` | **Accepted**; the edge is created |
| `blocks` edge from a parent to its own child | **Rejected**, as a blocking cycle involving the child |
| `type` and `priority` from the plan | Stored; `type` surfaces as `issue_type` in JSON output |
| Container epic in the ready frontier | **Present** in both `bd ready` and `bd ready --mol` |
| `pinned: true` on the epic | Removes it from `bd ready`; does **not** remove it from `bd ready --mol`'s ready steps |
| Pinned epic after its last child closes | Remains **open** — a pinned root does not auto-close |
| `bd ready` versus `bd ready --mol` JSON shape | Array of issues versus an object with `parallel_groups`, `ready_steps`, and `steps[]` |
| Trailing `(osb-a1b2)` on a tracked task line | **Accepted.** Counted in `progress.total` and `progress.complete`, and the id stays visible in the task description |

Two probes returned negative results and changed the design: both are recorded above in decisions 12 and 14, and the specs they invalidated were revised within this change rather than patched afterwards. Two earlier concerns were retired outright — the nested path is fine (so decision 5's fallback is unnecessary) and Beads itself rejects a reversed parent edge (so the conformance check duplicates a real constraint rather than inventing one).

## Risks / Trade-offs

- **Two sync systems, two truths about durability.** Artifacts travel by git; bead state travels by Dolt, and the Dolt data directory is gitignored. A fresh clone gets the change folder and not the work graph. *Mitigation:* the change folder stays the durable contract and carries the id map and evidence summary inline; the graph is reconstructible from the plan.
- **Evidence is not in the pull request by default.** A reviewer reading only the change folder sees the summary, not the full graph history. Accepted: putting the full trail in git would mean a second record that can disagree.
- **Discipline, not enforcement.** The bridge cannot prevent an agent from ticking a box without closing a bead. *Mitigation:* the reconciliation check detects it and verification reports it — detection rather than prevention, because prevention needs a harness hook this design deliberately does not have. The scenario set exercises the check, but nothing forces a third party to run it.
- **Prose is verified by execution, which is evidence rather than proof.** A passing scenario shows the instruction worked once, in one reading. *Mitigation:* the cold-reader test, plus keeping every checkable rule expressed as a command. The residual risk is a reader who follows the instruction differently and produces a plausible wrong result, which no amount of local testing removes.
- **`tasks.md` becomes a projection.** If the graph changes and the checklist does not, the index lies. *Mitigation:* the reconciliation check, plus the rule that both sides move in one step.
- **Inline ids change rendered task text.** Cosmetic, and probe-gated (decision 5).
- **Graph-plan edge rules are not fully documented.** Notably, edges may not reverse a `parent_key` relationship. *Mitigation:* probe before writing instructions around it, and keep the plan's structure simple — a parent epic plus ordered siblings.
- **The schema is a snapshot.** Forking means upstream improvements to the four shared artifacts are not received. *Mitigation:* documented as a limitation, with re-fork-and-diff as the stated upgrade path.
- **Beads is pre-1.0 in practice and has migrated its storage schema.** A future release could change command behaviour the instructions reference. *Mitigation:* the prompt-layer boundary means the blast radius is instruction text, not code.
- **Two tracking systems coexist during adoption.** This repository's own `AGENTS.md` says to use Beads for all task tracking, while this change's progress lives in `tasks.md`. The tension is intentional and temporary: it is resolved by adopting the schema in this repository once it validates.

## Open Questions

- Which Beads issue type the change epic should use. `epic` is the default assumption; `milestone` may suit multi-phase changes better. Deferrable — it affects presentation, not the graph.
- Whether the change label should also be applied to the capability's beads as a secondary label, or whether the capability belongs only in metadata. Deferrable, and reversible without touching the graph's structure.
- Whether the deferred Beads capabilities (swarm execution, formulas, wisps, stores and routing, cross-repository shipping) become a second schema or later versions of this one. Genuinely deferred: they need their own requirements, and bundling them here would trade a reviewable change for an unreviewable one.
- Whether this repository should add a second agent tool integration beyond OpenCode. Cheap to add later, and needs no schema change.
