# Tasks

Fixture task list for `tests/plan/check-plan.mjs`. Its declared ordering is what
the conforming fixture plan encodes, and what the malformed fixtures break.

## 1. Foundation

- [ ] 1.1 Write the plan conformance checker (osb-a1b2)
- [ ] 1.2 Write the fixture task list (osb-c3d4)

## 2. Wiring

- [ ] 2.1 Record the conformance check as part of the quality gate (osb-e5f6)

## 3. Verification

- [ ] 3.1 Run the checker against every fixture plan (osb-g7h8)

## Declared ordering

Deliberately mixed, so a plan that serialises everything is visibly wrong:

- **1.1 and 1.2 are parallel.** Neither blocks the other, and both are ready at
  the same time.
- **2.1 is blocked by 1.1 and by 1.2.** It needs both.
- **3.1 is blocked by 2.1.**

Task ids contain a dot on purpose: the plan's node keys are the task ids, so the
fixtures also demonstrate that dotted keys are accepted.
