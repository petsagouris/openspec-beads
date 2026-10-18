# Tasks

## 1. Probe

- [x] 1.1 Confirm that `bd create --graph` stores arbitrary execution-hint metadata on a node and returns it intact, by materializing a two-node plan in a throwaway database carrying every documented key (`execution_agent_type`, `execution_suggested_model`, `execution_reasoning_effort`, `execution_mode`, `execution_parallel_group`) and reading them back with `bd show <id> --json`. Verified when every key round-trips with its value unchanged; if any is dropped or rewritten, record which in `design.md` and narrow the requirement to the keys that survive (osb-1tg)

## 2. The beads artifact instruction

- [x] 2.1 Add the execution-hint keys to the `beads` artifact instruction, naming each key, the values it takes, and the nature of task that warrants it, and stating that ordinary work carries none. Verified by generating a plan from this change's own `tasks.md` and checking that the tasks which warrant a hint carry one and the rest carry provenance alone (osb-qsr)
- [x] 2.2 Add the consistency rule to the instruction: a node in a parallel group must not be joined to a member of that group by an ordering edge, and a hint must never be used where an edge belongs. Verified when the generated plan has no such edge, and when a deliberately contradictory pair is reported by the reconciliation check rather than passing (osb-0gx)

## 3. Apply and reconciliation

- [x] 3.1 State in the apply instruction that execution hints are read before a task is executed and that a missing hint never blocks work. Verified mechanically where it can be: a bead carrying no hints is still selected by the ready frontier. The reading behaviour itself is a reader's, and belongs to the cold-reader test in the conformance harness rather than here (osb-c6j)
- [x] 3.2 Extend the reconciliation check in the apply instruction to report a parallel-group contradiction, naming both nodes. Verified by creating a contradictory pair in a scratch graph and confirming the check names them, then confirming the check still writes nothing (osb-ymw)

## 4. Documentation

- [x] 4.1 Document execution hints in `openspec/schemas/beads-bridge/README.md`: the keys, that they are advisory, and that the bridge records them without acting on them. Verified when every key named in the README appears in the schema's instruction, and no key appears in one and not the other (osb-1jr)
- [x] 4.2 Add a limitation to the repository README stating that the bridge does not orchestrate execution. Verified when the README says so, and when nothing else in it implies the bridge dispatches work (osb-lxl)

## 5. Verification

- [x] 5.1 Run `node tests/run.mjs` and `bash tests/e2e.sh` and confirm both still pass unchanged. Verified when both exit 0, since this change adds instruction text and should alter no mechanical behaviour (osb-0xq)
- [x] 5.2 Confirm the archive merge applies this change's MODIFIED delta correctly, by archiving it and comparing `openspec/specs/beads-plan-materialization/spec.md` against its pre-archive content. Verified when the provenance requirement reads as the delta intended, and the capability's other five requirements are untouched (osb-55q)

## Workflow follow-up

- Beads epic for this change: osb-qnn

### Evidence

- 9 of 9 tracked tasks closed; every checkbox ticked with its bead id recorded inline.
- Probe (1.1): all five execution-hint keys round-trip unchanged through `bd create --graph`.
- No discovery beads were created; nothing outside the plan turned up.
- The plan carried `execution_parallel_group` on two nodes and no contradiction with an ordering edge.
- `node tests/run.mjs` 20/20 and `bash tests/e2e.sh` green, unchanged.
- Verification should look at task 5.2: the MODIFIED delta merge into `openspec/specs/beads-plan-materialization/spec.md`.
