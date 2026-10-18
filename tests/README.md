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

## Hermetic

Every run creates its own Beads database under the system temporary directory and deletes it afterwards. Before and after, the runner fingerprints this repository's own change folders and beads, and fails if either changed. The harness therefore needs no project database to exist and cannot corrupt the work graph it exists to protect.

## Not copied to adopters

This harness tests the schemas in this repository. It lives outside `openspec/schemas/`, so it is not part of the folder an adopter copies.
