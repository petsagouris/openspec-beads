# Proposal

## Why

Three claims in this repository's documentation are stronger than the tool supports. All three were found by reading upstream issue reports rather than by testing, and the first two are the kind of claim a reader relies on:

- **A human gate is presented as a sign-off.** The schema README says a `--type=human` gate is "a person's sign-off" and the apply instruction offers it as the archive condition for human approval. In practice any caller can resolve it, **including the agent whose work it gates** — `bd gate resolve` and `bd close` both succeed and the blocked task immediately returns to the ready frontier (upstream #7370). It records a decision; it does not prevent one.
- **The pull-request gate is the headline example, and it does not work.** "Archiving waits on a merged pull request" is the most compelling reason to gate archiving at all, and `bd gate check` currently fails on `gh:pr` gates with `Unknown JSON field: merged` (upstream #3901, open, priority 1).
- **Nothing records what these instructions were verified against.** The schema README says "OpenSpec 1.14 or later" and "the `bd` CLI" with no version, no date, and no list of verified behaviours. That is how an adopter ends up reading the Beads documentation, finding a command form the CLI rejects, and "correcting" this schema back to it.

The third is the one with the longest tail: the first two are wrong today and will be right when upstream fixes them, but without a baseline nobody can tell a verified instruction from a plausible one.

## What Changes

- The archiving requirement states what each gate type actually guarantees, and says that a human gate records a decision rather than enforcing one.
- The packaging requirements gain a verification baseline: what was verified, against which versions, and when — plus a note wherever an instruction deliberately differs from upstream documentation.
- The schema README, the apply instruction's gate section, and the repository README's limitations are corrected to match.
- A gate whose condition cannot be evaluated is stated to report an error, which is read as "cannot tell yet" rather than as satisfied.

## Capabilities

### New Capabilities

None. This corrects claims the existing capabilities make.

### Modified Capabilities
- `beads-evidence`: the archiving requirement now states the strength of each gate type instead of implying a guarantee the tool does not provide.
- `custom-schema-packaging`: the limitations requirement now also requires a verification baseline, so a reader can tell verified instructions from plausible ones.

## Impact

Schema instruction text, the schema README, and the repository README. No code, no CLI change, no new dependency.

The one thing deliberately *not* changed is the materialization requirement. Upstream #3879 reports that a failed `bd create --graph` leaves a partial graph with no rollback; that was measured here instead of assumed, and it did not reproduce, so the requirement stands with its evidence recorded rather than weakened.
