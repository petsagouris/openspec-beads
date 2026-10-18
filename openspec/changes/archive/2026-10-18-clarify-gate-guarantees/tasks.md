# Tasks

## 1. Reproduce the inherited claims before writing them down

Both of these are upstream reports, not observations of ours. The correction should rest on what we saw.

- [x] 1.1 Reproduce that a human gate can be resolved by any caller, by creating a `--type=human` gate blocking a bead, resolving it as a different actor, and checking whether the blocked bead returns to the ready frontier. Verified when the blocked bead becomes ready without the gate's owner acting; if it does not reproduce, say so in `design.md` and soften only the wording that claims otherwise (osb-3zg)
- [x] 1.2 Reproduce what `bd gate check` does with a `gh:pr` gate, by creating one in this repository — which now has a git remote — and running the check. Verified when the observed behaviour is recorded verbatim in `design.md`, whether that is the reported `Unknown JSON field: merged` failure or something else; a check that cannot be evaluated at all is itself the finding (osb-kxy)

## 2. Correct the claims

- [x] 2.1 Rewrite the gate section of the apply instruction so each type states what it actually guarantees: a human gate records a decision any caller can make, a GitHub gate is evaluated against the remote and reports an error rather than closing when it cannot be, and a timer closes on `bd gate check` once elapsed. Verified when no gate type is described in terms stronger than its behaviour (osb-q36)
- [x] 2.2 Add the verification baseline to the schema README — the tool versions, the date, and the behaviours measured rather than assumed, including the materialization measurements and the fact that the upstream atomicity and scaling reports did not reproduce on 1.3.1. Verified when every command the baseline names runs as written, and when each figure in it traces to a measurement recorded in `design.md` (osb-ts8)
- [x] 2.3 Add the divergence note to the schema README: that the gate creation command deliberately differs from the upstream documentation because the documented form is rejected by the CLI, and why. Verified when the note names the documented form, the working form, and the upstream issue (osb-6sz)
- [x] 2.4 Correct the repository README's limitations so the gate bullets match 2.1, and add the baseline to the list of things a reader should know. Verified when the two READMEs do not contradict each other on any gate type (osb-5io)

## 3. Verification

- [x] 3.1 Run `node tests/run.mjs` and `bash tests/e2e.sh`, and confirm both still pass unchanged. Verified when both exit 0, since this change alters documentation and requirement wording but no mechanism (osb-rl8)
- [x] 3.2 Confirm both MODIFIED deltas merge correctly by archiving and comparing the two target specs against their pre-archive content. Verified when each has exactly the intended requirement modified, its other requirements byte-identical, and every scenario retained (osb-n4z)

## Workflow follow-up

- Beads epic for this change: osb-y4x

### Evidence

- 7 of 8 tracked tasks closed; every checkbox ticked with its bead id inline.
- 1.1 reproduced: the gated agent resolved its own human gate and unblocked itself.
- 1.2 reproduced the root cause: `gh pr view --json merged` is rejected, so a `gh:pr` gate cannot auto-close.
- Materialization re-measured: 101/180 in ~14s, 193/624 in ~41s, four kill points leaving 0 issues.
- Upstream issue filed: https://github.com/gastownhall/beads/issues/7664
- `node tests/run.mjs` 20/20 and `bash tests/e2e.sh` green, unchanged.
