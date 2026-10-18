# Design

## Context

This correction did not come from testing. It came from reading the upstream issue tracker while investigating two documentation divergences, and finding three reports that made claims in *this* repository stronger than the tool supports:

- #7370: any caller can resolve a human gate, including the agent whose work it gates.
- #3901: `bd gate check` fails on `gh:pr` gates with `Unknown JSON field: merged`.
- #3879: `bd create --graph` does not scale, and a failure leaves a partial graph with no rollback.

The third is the interesting one, because it is about a claim this repository made and verified — on plans of 2 to 37 nodes. Asserting atomicity from small-plan evidence is exactly the inference that has been wrong repeatedly in this project, so it was measured rather than believed.

## Goals / Non-Goals

**Goals:**

- Make every claim about what a gate guarantees match what the gate actually does.
- Record what the instructions were verified against, so an adopter can tell a verified instruction from a plausible one.
- Keep the difference from upstream documentation visible, so it is not "corrected" back.

**Non-Goals:**

- Changing the gate mechanism, or removing any gate type. The tool is what it is; only the description changes.
- Fixing anything upstream. Two documentation divergences were reported as one issue; the behavioural reports are someone else's to fix.
- Weakening a requirement that measurement supported.

## Decisions

### 1. Correct the claim, not the mechanism

A gate does block the change — `bd blocked` shows it, and the blocked work leaves the ready frontier. That part was never wrong. What was wrong is the *strength* implied: "a person's sign-off" reads as a barrier, when a human gate is a record of a decision that anyone can make. So the requirement keeps gating archiving on an external condition and gains a scenario stating what a human gate is worth.

### 2. The baseline lives in the schema README, not the repository README

The schema folder is the thing adopters copy. A baseline recorded only in the repository README would not travel with the instructions it describes, which defeats its purpose. The repository README keeps the limitations a reader of the project needs; the schema README carries what a reader of the *instructions* needs.

### 3. The materialization requirement is not weakened — it was measured

#3879 reports that a failed `bd create --graph` leaves nodes behind with no rollback, which would falsify the requirement "A failed materialization leaves nothing behind". Measured here instead of assumed:

| Plan | Result |
| --- | --- |
| 101 nodes, 180 edges | completes in 14s, exit 0, 101 minted |
| 193 nodes, 624 edges | completes in 41s, exit 0, 193 minted |
| Killed at 4s, 8s, 10s, 12s of a 14s run | **0 issues** each time |
| Killed at 13s | the complete 101-node graph and the full id map |

The transition is binary — nothing, or everything. The upstream report is against `bd 1.0.0`; this is `1.3.1`, and the reported 27+ minutes for 192 nodes becomes 41 seconds. So the requirement stands, and the evidence goes into the baseline rather than into a weakened claim.

An earlier attempt at this measurement was invalid and is worth recording as a caution: the killed run appeared to leave 101 issues behind, which would have "confirmed" the bug. The ids carried a different prefix, which showed the reading had come from the *other* database. The lesson is the same one this change is about — check which record you are actually reading.

### 4. State the broken gate type rather than quietly dropping it

`gh:pr` is the most compelling gate in the documentation and it currently fails. Removing it would leave a reader wondering why a merged pull request is not an option; presenting it unqualified would be the same over-claim in a new place. So it stays, named as currently failing, with the working alternatives next to it.

## Reproductions

Both inherited claims were checked before being written down, and both held.

**A human gate is not a barrier.** In a throwaway database: a task blocked by a `--type=human` gate, then resolved as a different actor.

```
task hg-d5f, human gate hg-d4k
blocked before: [hg-d5f,hg-d4k]
ready before:   []
resolve as agent:claude-code -> exit 0
ready after:    [hg-d5f]
```

The agent whose work the gate blocked resolved the gate and unblocked itself, in one command. Upstream #7370 confirmed first-hand.

**A `gh:pr` gate cannot auto-close.** Two observations, because the reported failure needs a merged PR to exist and this repository has none. First, a `gh:pr` gate whose PR does not resolve is *escalated*, not resolved — `bd gate check` printed `ESCALATE - pull request not found`, the gate stayed `open`, and the blocked task stayed blocked. Second, the underlying field is simply not valid:

```
$ gh pr view 1 --json merged
Unknown JSON field: "merged"
Available fields:
  additions
  ...

$ gh pr view 1 --json state,mergedAt
GraphQL: Could not resolve to a PullRequest with the number of 1.
```

The second command's error is about the missing PR, not the fields — so `merged` is rejected and `state`/`mergedAt` are accepted, which is upstream #3901's root cause, confirmed without a merged PR.

The operational consequence is the part that belongs in the documentation: a `gh:pr` gate never closes on its own today. It fails in the safe direction — an unevaluatable gate stays open and the change stays blocked rather than being waved through — but a pull-request gate is a dead end until upstream fixes the field.

## Risks / Trade-offs

- **The baseline ages.** A date and a version are true only until upstream moves. *Mitigation:* it names the date and the versions explicitly, so staleness is visible rather than silent; and the divergence note explains *why* an instruction differs, which stays true even when the divergence is fixed.
- **Two of the three corrections are inherited, not measured.** The human-gate and `gh:pr` findings come from upstream reports. *Mitigation:* tasks 1.1 and 1.2 reproduce both locally before the correction is written, so the wording rests on our own observation where it can.
- **A reader may over-correct.** Having been told a human gate is not a barrier, someone may conclude gates are useless. *Mitigation:* the wording keeps what a gate does do — it blocks the change and keeps it out of the ready frontier — alongside what it does not.

## Open Questions

- Whether the schema should ever act on the version it recorded, such as warning when the installed `bd` differs. Deferrable, and probably wrong: a warning on every minor bump is noise, and the baseline is for a human to read.
- Whether a gate that cannot be evaluated should be treated as blocked or as failed. Deferrable, and upstream's answer may change it: for now an error is neither, and the instruction says to read it as "cannot tell yet".
