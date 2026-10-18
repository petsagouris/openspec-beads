# openspec-beads

OpenSpec plans the work. Beads tracks it. This repository carries the schema that connects them.

## The problem

OpenSpec produces a change: a proposal, the spec deltas, a design, a task list. None of it tracks work. `tasks.md` is a flat checklist with no dependencies between tasks, nothing stopping two sessions from claiming the same one, no home for work discovered halfway through, and no state that survives a context reset or an interruption.

So the plan degrades the moment implementation starts. Ordering exists only in prose, so nothing stops a blocked task being started. Discoveries either get lost or quietly turn the checklist into a backlog. And "done" is an assertion someone typed rather than a fact anything checked.

Beads is the missing half: a dependency-aware work graph with atomic claims, a computed ready frontier, and durable state across sessions. The two divide cleanly — OpenSpec owns intent and contract, reviewed and versioned in git; Beads owns execution state.

## What it does

```text
proposal ─────────────────┐
specs ────────────────────┼─→ tasks ──→ beads ──[apply]──→ archive
design ───────────────────┘
```

- **A `beads` artifact** turns the change's tasks into a Beads issue graph, in one atomic transaction.
- **Apply executes the graph**: work is selected from the ready frontier, claimed atomically, and closed when done. The checklist stays the index a reviewer reads; the graph is what decides what is next.
- **A spec change mid-implementation is paired.** Every delta operation has a matching graph operation, so the specs and the graph cannot drift apart silently.
- **Archiving is gated on the real world** — a merged pull request, a green CI run, a person's sign-off — rather than on a timestamp.
- **The four planning artifacts are untouched.** The schema forks the bundled `spec-driven` schema and adds one artifact; `proposal`, `specs`, `design` and `tasks` keep their ids, paths, dependency edges and templates byte for byte.

## Install

### With a coding agent

Paste this into your agent, in the project you want it in:

```text
Install the beads-bridge schema for OpenSpec into this project:

1. Verify this project uses OpenSpec: run `openspec list --json` and check that
   `root` is not null. If it is null, stop and tell me it needs `openspec init` first.
2. Clone https://github.com/petsagouris/openspec-beads to a temporary directory.
3. Copy `openspec/schemas/beads-bridge/` from the clone into this project's
   `openspec/schemas/`.
4. Run `openspec schema validate beads-bridge` and show me the result. If it fails,
   stop and report the error.
5. Check whether Beads is set up: if there is no `.beads/` directory, run `bd init`.
   Then run `bd setup opencode` — or the equivalent setup command for my agent — so
   the Beads workflow context is installed. Do not hand-edit AGENTS.md; let the
   setup command manage its own section.
6. Ask me whether to set `schema: beads-bridge` in `openspec/config.yaml`, or to
   leave the project default alone and set it per change instead.
7. Delete the temporary directory and show me the final state.
```

### By hand

```bash
git clone https://github.com/petsagouris/openspec-beads /tmp/openspec-beads
cp -R /tmp/openspec-beads/openspec/schemas/beads-bridge ./openspec/schemas/beads-bridge
rm -rf /tmp/openspec-beads
openspec schema validate beads-bridge
```

### Prerequisites

- **OpenSpec 1.14 or later** — this schema relies on project-level schema support and the current artifact contract. If `openspec list --json` reports `"root": null`, the project is not set up yet and `openspec init` comes first.
- **The `bd` CLI**, initialized in the project. Apply refuses to write to a database that does not belong to the project, so a missing `bd init` is a stopped apply rather than a corrupted one.

## Activate

Set it for the whole project in `openspec/config.yaml`:

```yaml
schema: beads-bridge
```

Or for one change only, in that change's `.openspec.yaml`:

```yaml
schema: beads-bridge
```

Per-change is the better way to try it: the priority is one change, and the project default keeps working if you decide against it. Artifact ids usable as `config.yaml` rules keys: `proposal`, `specs`, `design`, `tasks`, `beads`.

## Use

```text
/opsx-propose <what you want>     # proposal, specs, design, tasks, beads
/opsx-apply                       # materialize once, then work the ready frontier
/opsx-archive                     # once the gate has closed
```

An agent that did not create the graph can resume from it: `bd ready --label change:<name> --json` is the claimable work, `bd list --label change:<name> --json` is progress, and `bd blocked` explains anything waiting. Nothing needs the plan re-read.

## Limitations

- **A schema is a snapshot.** Copying the folder takes the version as it stands; it does not receive later improvements, including improvements to the four artifacts it shares with `spec-driven`. Pick those up by forking the bundled schema again and porting the difference deliberately.
- **This is guidance, not enforcement.** The bridge lives entirely in instructions and templates — no script, no CLI change — so it depends on the agent following it. Where a fact can be checked, the instructions check it rather than asking; where they cannot, the conformance harness and the reconciliation check catch drift after the fact.
- **Two stores, two sync paths.** Planning artifacts travel by git; bead state travels through Dolt (`bd dolt push`). A fresh clone has the change folder but not the graph.
- **A container epic is pinned**, so it cannot be claimed as work — which also means it does not close on its last child and refuses to be closed without `--force`.
- **A GitHub gate needs a git remote.** Without one it reports an error rather than closing, which should be read as "cannot tell yet".
- **The conformance harness tests the schemas in this repository and is not copied to adopters.** You get the folder, not the harness.

## Repository layout

```text
openspec/schemas/beads-bridge/   the schema: schema.yaml, templates/, README.md
openspec/changes/                this repository's own changes
openspec/specs/                  the accumulated behaviour contract
tests/                           the conformance harness (see tests/README.md)
```

The schema's own documentation is at [`openspec/schemas/beads-bridge/README.md`](openspec/schemas/beads-bridge/README.md).

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md). Schema work is not complete until `openspec schema validate <name>` and `node tests/run.mjs` both pass.

## License

[MIT](LICENSE) © 2026 George Petsagourakis
