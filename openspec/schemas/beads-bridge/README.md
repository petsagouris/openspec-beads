# beads-bridge

An OpenSpec schema that keeps OpenSpec's planning methodology and executes it against a real work graph.

## What it is for

OpenSpec plans changes: a proposal, the spec deltas, a design, a task list. None of that tracks work. `tasks.md` is a flat checklist with no dependencies, nothing preventing two sessions from claiming the same task, and nowhere for work discovered mid-implementation to go.

This schema adds one artifact that turns the change's tasks into a [Beads](https://beads.gascity.com) issue graph, and makes apply execute against that graph: work is selected from the ready frontier, claimed atomically, and closed when done. OpenSpec keeps intent and contract; Beads keeps execution state.

## Artifacts

```text
proposal ─────────────────┐
specs ────────────────────┼─→ tasks ──→ beads (beads/plan.json) ──[apply]──→ archive
design ───────────────────┘
```

The first four artifacts are unchanged from the bundled `spec-driven` schema: same ids, same output paths, same dependency edges, same templates. Only `beads` is added.

| Artifact | Produces | Depends on |
| --- | --- | --- |
| `proposal` | `proposal.md` | — |
| `specs` | `specs/<capability>/spec.md` | `proposal` |
| `design` | `design.md` | `proposal` |
| `tasks` | `tasks.md` | `specs`, `design` |
| `beads` | `beads/plan.json` | `specs`, `design`, `tasks` |

`apply` requires `beads` and tracks `tasks.md`. The checklist stays the durable index a reviewer reads; Beads is the live database of work. Completing a task closes its bead and marks its checkbox, and each task line records the id of the bead created for it.

## Activate

Point `openspec/config.yaml` at the schema:

```yaml
schema: beads-bridge
```

Or set it on a single change, leaving the project default alone, in the change's `.openspec.yaml`:

```yaml
schema: beads-bridge
```

Artifact ids usable as keys in `config.yaml` `rules` and `operations`: `proposal`, `specs`, `design`, `tasks`, `beads`. Any rule key must match one of these ids, or it is inert.

## Requirements

- OpenSpec 1.14 or later, for project-level schema support and the schema's artifact contract.
- The `bd` CLI, initialized in the project (`bd init`). Apply refuses to write to a database that does not belong to the project.

The plan is written by the `beads` artifact. It is not materialized until apply runs `bd create --graph beads/plan.json`, so the graph is reviewable before any issue exists.

## Optional: carry the archive gate into the archive step

A schema cannot set archive behaviour, because `config.yaml` owns that. The apply instruction describes the pre-archive checks and the gate; if you want them restated at archive time, add this to `openspec/config.yaml`:

```yaml
operations:
  archive:
    guidance:
      - Confirm the change's gate bead has closed before archiving.
      - Confirm no discovery bead for this change is still open.
      - Confirm `bd dep cycles` is empty and the change's epic is closed.
```

## Execution hints

A plan node may say *how* its task should be executed, using Beads' documented execution-hint metadata keys. An orchestrator reads these before dispatching work, and they take precedence over free-form notes for routing decisions.

| Key | Values |
| --- | --- |
| `execution_agent_type` | a worker class, such as `explorer`, `worker` or `mixed` |
| `execution_suggested_model` | a capability tier, not a runtime binding — a consumer on another provider substitutes a model of the same tier |
| `execution_reasoning_effort` | `low`, `medium`, `high` or `xhigh` |
| `execution_mode` | `local`, `delegated`, or staged between the two |
| `execution_parallel_group` | a name grouping work that may proceed alongside the rest of its group |

Three things about them are deliberate:

- **They are advisory.** A hint informs how work is carried out and never gates it. A bead with no hints executes exactly like any other, so a missing hint is never a reason to stop.
- **They are not ordering.** Where one task cannot start before another finishes, that is a `blocks` edge. A hint never substitutes for an edge, and a parallel group that contradicts an edge is reported rather than resolved silently.
- **They are recorded, not acted on.** The bridge does not orchestrate: it does not spawn subagents, choose models, or dispatch work. It writes down what the plan decided so that whatever does orchestrate can read it.

Beads documents these keys as advisory metadata, not a validated contract, so a misspelled key is a silently inert hint rather than an error. The instruction names them explicitly for that reason.

## Verification baseline

These instructions were verified against **OpenSpec 1.14.3** and **bd 1.3.1 (dev)** on **2026-10-18**, on Linux with the embedded Dolt backend. What follows was measured rather than assumed, and it is the reason several instructions are worded more narrowly than they could be.

| Behaviour | Measured result |
| --- | --- |
| `bd create --graph` with a nested artifact path | accepted; the plan resolves to `<change>/beads/plan.json` |
| `bd create --graph`, 101 nodes / 180 edges | completes in ~14s in one transaction |
| `bd create --graph`, 193 nodes / 624 edges | completes in ~41s |
| Interrupting a materialization at 4s, 8s, 10s and 12s of a 14s run | **0 issues** each time — nothing partial survives |
| Interrupting at 13s | the complete graph and the full id map |
| Running the same plan twice | **duplicates** — a 37-node plan produced 74 issues, so the no-duplicate guard is the preflight, not the CLI |
| Dotted node keys such as `4.2` | accepted |
| Labels, nested metadata, `acceptance_criteria`, `spec_id` | stored and returned intact |
| A pinned epic | excluded from `bd ready` and `bd list`; does not auto-close; refuses `bd close` without `--force` |
| `bd close` on a blocked issue | refused without `--force` |
| `bd ready --json` versus `bd ready --mol --json` | an array of issues versus an object carrying `parallel_groups` and `steps[]` |
| Resolving a human gate as another actor | succeeds, and unblocks the gated work |
| `gh pr view --json merged` | rejected — `Unknown JSON field: "merged"` |

Reported upstream and **not** reproduced here: [#3879](https://github.com/gastownhall/beads/issues/3879) reports a failed materialization leaving a partial graph with no rollback, and 192 nodes taking 27+ minutes — both measured against `bd 1.0.0`, and neither reproduced on `1.3.1`. [#3893](https://github.com/gastownhall/beads/issues/3893) reports `--dry-run` persisting issues; it does not.

### Deliberate divergences from upstream documentation

These instructions do not match the Beads documentation in one place, on purpose. Do not "correct" them back.

- **Gate creation.** The documentation's *Creating Gates* section shows `bd create --type=gate --await-type=…`. That flag does not exist and `bd` rejects it. This schema uses `bd gate create --blocks <issue>`, which is what the CLI implements and what its own usage strings show. Reported upstream as [#7664](https://github.com/gastownhall/beads/issues/7664), together with the graph-plan note below.
- **The graph-plan edge direction.** The plan schema's help does not say which endpoint of an edge is which. `from_key` is the **dependent** and `to_key` the **blocker**; read the other way, every dependency in a plan is inverted and the plan still validates. The `beads` artifact's instruction states the direction explicitly for that reason.

## Limitations

- **A schema is a snapshot.** Copying this folder means taking the version as it stands. It does not receive later improvements, including improvements to the four artifacts it shares with `spec-driven`. To pick those up, fork the bundled schema again and port the difference deliberately.
- **The bridge is guidance, not enforcement.** It is implemented entirely in instructions and templates, with no script or CLI change, so it depends on the agent following it. The reconciliation check and the Beads gates catch drift after the fact rather than preventing it.
- **Two stores, two sync paths.** Planning artifacts travel by git; bead state travels through Dolt (`bd dolt push`). A fresh clone has the change folder but not the graph.
- **A container epic is pinned** so it cannot be claimed as work, which also means it does not close on its last child. The change's completion step closes it explicitly.

## Repo

Part of [openspec-beads](https://github.com/petsagouris/openspec-beads), a collection of OpenSpec schemas. The repository also carries a conformance harness for these schemas — that harness is not part of this folder and does not travel with it.

Validate after installing or editing:

```bash
openspec schema validate beads-bridge
```
