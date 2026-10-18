# Tests

Conformance harness for the schemas in this repository.

## Why it exists

A schema in this repository is mostly prose: instructions telling an agent what to produce. Prose cannot be unit-tested. So the harness checks the parts that are decidable mechanically, and the parts that are not are covered by executed scenarios and by handing the instructions to a reader with no context.

The plan gets the most attention because it is the one artifact that is both machine-checkable and easy to get subtly wrong. Beads will reject a structurally invalid plan, but it will not tell you the plan is *wrong* — a plan whose every dependency is inverted still validates cleanly.

## Running

```bash
node tests/run.mjs
```

Exits `0` when every check passes and `1` when any check fails, printing one line per check.

This runs the two mechanical layers below. `tests/e2e.sh` runs the whole cycle; the `scenarios` and `cold-reader` layers are exercised as described in their sections.

## Layers

### `plan` — the conformance checker

```bash
node tests/plan/check-plan.mjs <plan.json> [more-plans.json ...]
```

Checks a graph plan against the schema's rules. Errors exit non-zero; warnings are printed and do not.

| Code | Rule |
| --- | --- |
| `E1` | duplicate node keys |
| `E2` | an edge endpoint that is not a declared node key |
| `E3` | an edge between a node and its own parent, in either direction |
| `E4` | an epic container that is not pinned, so it is claimable as work |
| `E5` | a plan without exactly one epic container |
| `E6` | every task serialised into one chain — the priority-tier signature |
| `E7` | a `parent_key` that is not a declared node key |
| `W1` | a task node with no `parent_key` |
| `W2` | an epic container with no children |

`E6` deserves a word. The harness cannot know why an edge exists, so it cannot detect a priority-derived edge directly. What it can detect is the signature of that mistake: every task reachable in a single chain, which is what a plan looks like when ordering was read off priority tiers instead of real dependency.

Fixtures:

- `plan/fixture-tasks.md` — the source task list, with its ordering stated in prose: two parallel tasks, one task blocked by both, one blocked by that.
- `plan/fixture-plan.json` — the conforming plan derived from it. Node keys are task ids, so the fixture also demonstrates that dotted keys are accepted.
- `plan/fixtures/bad-*.json` — one deliberately malformed plan per rule. Each must trip exactly its own rule and nothing else.

### `plan-live` — the fixture materialized

Materializes the conforming fixture into a throwaway database and asserts the assumptions the apply instruction depends on: dotted keys are minted, the pinned epic is excluded from selection, the two parallel tasks are the whole ready frontier, the dependents are blocked, and the epic stays reachable by id while staying out of `bd list`.

### `scenarios` — the acceptance suite

`tests/scenarios/README.md` carries an entry for every requirement in every spec: what must exist first, what to do, the files and beads expected afterwards, and how the expectation is checked. Of the 31 requirements, 27 are `command`-verifiable, three are `cold-reader`, and one is `inspection`.

The entries come from the specs rather than from a separate test-authoring pass, because `openspec validate --strict` requires every requirement to carry at least one scenario. The specs already are the test cases; this layer makes them runnable and marks which ones a command can settle.

An entry is never amended to match what happened. If an expectation does not hold, that is the finding.

### `cold-reader` — the instructions against a session with no context

The bridge is prose, and the question that matters is not whether the author can follow the instructions but whether a session with no prior context can. Two tests, each run by handing a fresh agent session one instruction and asserting the resulting state rather than its report:

- the README's install prompt, in a project that uses OpenSpec but has not installed the schema
- the apply instruction, on a scratch change whose tasks do real, observable work

A divergence is recorded against the passage responsible and reported as a failure. These tests earned their place: they found nine defects in the apply instruction that no mechanical check could, including a pre-archive gate that could never fire because discovery beads were never given the change's label, and a reconciliation query that silently returned nothing once any work was done.

### `e2e` — the whole cycle

```bash
bash tests/e2e.sh
```

Installs the schema into a throwaway project and runs the cycle the instructions describe: create a change, produce all five artifacts, materialize the graph, work the ready frontier, verify against the graph, and archive behind a gate. It then exercises three failure paths — a ticked task whose bead is open, an open discovery at archive time, and a plan whose edge reverses a parent relationship — and asserts that each is reported rather than passing silently.

Every command in it is one the schema's own instructions tell an agent to run, so it also checks that those instructions are executable rather than merely plausible. It uses a human gate rather than a GitHub one, because a `gh:*` gate needs a git remote to evaluate.

## Hermetic

Every run creates its own Beads database under the system temporary directory and deletes it afterwards. Before and after, the runner fingerprints this repository's own beads and change folders. The harness therefore needs no project database to exist and cannot corrupt the work graph it exists to protect.

Two notes on how far that check reaches, both learned by getting it wrong:

- **The bead fingerprint is a hard failure.** Beads are what the harness could plausibly pollute, since every `bd` call is supposed to be pointed at the throwaway database with `BEADS_DIR`.
- **A change folder that appears mid-run is a warning, not a failure.** The harness never creates one, so a new entry means someone else is working in this repository at the same time — indistinguishable, from inside the run, from pollution. A check that fails whenever a human opens a change is worse than one that says so. A change folder that *disappears* is still a hard failure, because nothing but damage removes one.

## Not copied to adopters

This harness tests the schemas in this repository. It lives outside `openspec/schemas/`, so it is not part of the folder an adopter copies.
