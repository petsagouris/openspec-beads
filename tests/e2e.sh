#!/usr/bin/env bash
# End-to-end cycle for the beads-bridge schema, in a throwaway project.
#
# install -> create -> plan -> materialize -> apply -> verify -> gated archive
# plus the failure paths: a ticked task whose bead is open, an open discovery
# at archive time, and a plan whose edge reverses a parent relationship.
#
# Every command here is one the schema's own instructions tell an agent to run,
# so this doubles as a check that those instructions are executable rather than
# merely plausible.
#
# Usage: bash tests/e2e.sh
# Exit:  0 all checks passed, 1 the first check that failed

set -euo pipefail

SRC="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
P="$(mktemp -d "${TMPDIR:-/tmp}/beads-bridge-e2e-XXXXXX")"
export BEADS_DIR="$P/.beads"

ok()   { printf '  ok    %s\n' "$1"; }
fail() { printf '  FAIL  %s\n' "$1"; exit 1; }
step() { printf '\n%s\n' "$1"; }

cleanup() { rm -rf "$P"; }
trap cleanup EXIT

cd "$P"

step "setup: a project that does not have the schema"
git init -q
openspec init --tools opencode --profile core --language en --no-copilot-cloud --no-animation >/dev/null 2>&1
[ "$(openspec schemas --json | jq -r '.[].name' | tr '\n' ' ')" = "spec-driven " ] || fail "unexpected initial schema list"
ok "only spec-driven is available"

mkdir -p openspec/schemas
cp -R "$SRC/openspec/schemas/beads-bridge" openspec/schemas/beads-bridge
openspec schema validate beads-bridge >/dev/null 2>&1 || fail "schema did not validate"
ok "schema installed and validated"

bd init --prefix e2e --non-interactive --role maintainer >/dev/null 2>&1
ok "beads initialized ($(bd where | head -1))"

step "create the change and its planning artifacts"
openspec new change add-greeting --schema beads-bridge >/dev/null 2>&1
C=openspec/changes/add-greeting
mkdir -p "$C/specs/greeting" "$C/beads"

cat > "$C/proposal.md" <<'EOF'
# Proposal

## Why

The project needs a greeting file, so that the schema has a change with real,
observable work to run end to end.

## What Changes

- Creates `greeting.txt` and appends a second word to it.

## Capabilities

### New Capabilities
- `greeting`: the ability to produce a greeting file.

### Modified Capabilities

## Impact

Adds one file.
EOF

cat > "$C/specs/greeting/spec.md" <<'EOF'
# Spec Delta

## Purpose

The ability to produce a greeting file, used to give this change observable work.

## ADDED Requirements

### Requirement: A greeting file exists

The system SHALL provide `greeting.txt` containing the greeting.

#### Scenario: The greeting is present

- **WHEN** the change has been applied
- **THEN** `greeting.txt` exists and contains `hello world`
EOF

cat > "$C/design.md" <<'EOF'
# Design

## Context

A fixture change. Nothing to design.

## Goals / Non-Goals

**Goals:**
- Give the cycle real work with an unambiguous outcome.

**Non-Goals:**
- Anything requiring judgement.

## Decisions

The second task appends rather than rewrites, so it genuinely depends on the first.

## Risks / Trade-offs

None.
EOF

cat > "$C/tasks.md" <<'EOF'
# Tasks

## 1. Greeting

- [ ] 1.1 Create `greeting.txt` containing exactly `hello`
- [ ] 1.2 Append ` world` to `greeting.txt`, so the file reads `hello world`
EOF

cat > "$C/beads/plan.json" <<'EOF'
{
  "commit_message": "beads-bridge: add-greeting",
  "nodes": [
    { "key": "epic", "title": "add-greeting", "type": "epic", "priority": 1, "pinned": true,
      "description": "Create a greeting file with real, observable work for the end-to-end cycle.",
      "acceptance_criteria": "greeting.txt exists and contains 'hello world'.",
      "labels": ["openspec", "change:add-greeting"] },
    { "key": "1.1", "title": "Create greeting.txt containing exactly hello", "type": "task", "priority": 2,
      "parent_key": "epic", "labels": ["openspec", "change:add-greeting", "capability:greeting"],
      "metadata": { "openspec_change": "add-greeting", "openspec_task": "1.1" } },
    { "key": "1.2", "title": "Append world to greeting.txt", "type": "task", "priority": 2,
      "parent_key": "epic", "labels": ["openspec", "change:add-greeting", "capability:greeting"],
      "metadata": { "openspec_change": "add-greeting", "openspec_task": "1.2" } }
  ],
  "edges": [ { "from_key": "1.2", "to_key": "1.1", "type": "blocks" } ]
}
EOF

[ "$(openspec status --change add-greeting --json | jq -r '.artifacts[] | select(.status!="done") | .id' | wc -l)" -eq 0 ] \
  || fail "not all artifacts complete"
ok "all five artifacts produced; apply requires $(openspec status --change add-greeting --json | jq -c '.applyRequires')"

step "materialize once"
bd create --graph "$C/beads/plan.json" --dry-run | head -1
bd create --graph "$C/beads/plan.json" --json > "$P/ids.json"
EPIC=$(jq -r '.ids.epic' "$P/ids.json")
[ "$(jq '.ids | length' "$P/ids.json")" -eq 3 ] || fail "expected 3 nodes"
ok "3 nodes minted, epic $EPIC"

IDS="$P/ids.json" node -e '
const fs=require("fs");
const ids=JSON.parse(fs.readFileSync(process.env.IDS,"utf8")).ids;
const f="openspec/changes/add-greeting/tasks.md";
fs.writeFileSync(f, fs.readFileSync(f,"utf8").split("\n").map(l=>{
  const m=l.match(/^- \[ \] ([0-9]+\.[0-9]+) /);
  return m && ids[m[1]] ? l+" ("+ids[m[1]]+")" : l;
}).join("\n"));
'
grep -q "e2e-" "$C/tasks.md" || fail "ids were not recorded on the task lines"
ok "ids recorded on both task lines"

step "apply: work the ready frontier"
for T in 1.1 1.2; do
  ID=$(jq -r --arg t "$T" '.ids[$t]' "$P/ids.json")
  READY=$(bd ready --label change:add-greeting --json | jq -r --arg id "$ID" '[.[] | select(.id==$id)] | length')
  [ "$READY" -eq 1 ] || fail "$T was not ready when expected"
  bd update "$ID" --claim --quiet
  if [ "$T" = "1.1" ]; then printf 'hello' > greeting.txt; else printf ' world' >> greeting.txt; fi
  bd close "$ID" --reason "done" --quiet
  TASK="$T" node -e '
    const fs=require("fs");const t=process.env.TASK;const f="openspec/changes/add-greeting/tasks.md";
    fs.writeFileSync(f, fs.readFileSync(f,"utf8").replace(new RegExp("^- \\[ \\] "+t.replace(".","\\."),"m"),"- [x] "+t));
  '
  ok "$T: ready, claimed, done, closed, ticked"
done

[ "$(cat greeting.txt)" = "hello world" ] || fail "greeting.txt is wrong"
ok "greeting.txt reads 'hello world'"
[ "$(openspec instructions apply --change add-greeting --json | jq -r '.progress.complete')" -eq 2 ] || fail "checklist not complete"
ok "openspec agrees: 2 of 2 complete"

step "verification: the graph as evidence"
[ "$(bd ready --label change:add-greeting --json | jq 'length')" -eq 0 ] || fail "work still ready"
bd dep cycles | grep -qi "no dependency cycles" || fail "cycles reported"
bd orphans >/dev/null 2>&1 || fail "bd orphans failed"
[ "$(bd list --label change:add-greeting --all --json | jq '[.[] | select(.status=="open")] | length')" -eq 1 ] \
  || fail "expected only the pinned epic to be open"
ok "nothing ready, no cycles, only the epic still open"

step "failure path: a ticked task whose bead is open"
ID12=$(jq -r '.ids["1.2"]' "$P/ids.json")
bd reopen "$ID12" --quiet
MISMATCH=$(bd list --label change:add-greeting --all --json | jq -r --arg id "$ID12" '[.[] | select(.id==$id and .status!="closed")] | length')
TICKED=$(grep -c "^- \[x\]" "$C/tasks.md")
[ "$MISMATCH" -eq 1 ] && [ "$TICKED" -eq 2 ] || fail "the mismatch was not detectable"
ok "detected: 2 tasks ticked but bead $ID12 is $(bd show "$ID12" --json | jq -r '.[0].status')"
bd close "$ID12" --force --reason "restored" --quiet
ok "restored"

step "failure path: an open discovery at archive time"
DISC=$(bd create "Found something mid-implementation" -t bug -p 2 \
  --deps discovered-from:$EPIC -l "discovery,change:add-greeting" --json | jq -r '.id // .[0].id')
OPEN=$(bd list --label change:add-greeting --label discovery --status open --json | jq 'length')
[ "$OPEN" -eq 1 ] || fail "the pre-archive discovery gate did not fire"
ok "gate fires: $DISC is open and the pre-archive query finds it"
bd close "$DISC" --force --reason "resolved" --quiet
[ "$(bd list --label change:add-greeting --label discovery --status open --json | jq 'length')" -eq 0 ] \
  || fail "the gate did not clear"
ok "gate clears once the discovery is closed"

step "failure path: a plan whose edge reverses a parent relationship"
E3OUT=$(node "$SRC/tests/plan/check-plan.mjs" "$SRC/tests/plan/fixtures/bad-edge-to-parent.json" 2>&1 || true)
printf '%s\n' "$E3OUT" | grep -q "ERROR \[E3\]" || fail "E3 did not fire"
ok "E3 fires with a message naming the node"

step "archive, gated on an external condition"
bd gate create --type=human --blocks "$EPIC" --reason="maintainer sign-off before archive" >/dev/null 2>&1
bd blocked | grep -q "$EPIC" || fail "the gate did not block the change"
ok "the change is blocked by its gate and cannot be considered done"
GATE=$(bd gate list 2>/dev/null | grep -oE 'e2e-[a-z0-9]+' | head -1)
bd gate resolve "$GATE" --quiet 2>/dev/null || bd gate resolve "$GATE" >/dev/null 2>&1
ok "gate resolved"

bd close "$EPIC" --force --reason "all tasks complete" --quiet
openspec validate add-greeting --strict >/dev/null 2>&1 || fail "change did not validate before archive"
openspec archive add-greeting -y >/dev/null 2>&1 || fail "archive failed"

ARCH=$(ls -d openspec/changes/archive/*add-greeting)
[ -f "$ARCH/proposal.md" ] && [ -f "$ARCH/design.md" ] && [ -f "$ARCH/tasks.md" ] \
  && [ -f "$ARCH/beads/plan.json" ] && [ -f "$ARCH/specs/greeting/spec.md" ] \
  || fail "the archived change is missing artifacts"
ok "archived with every artifact intact: ${ARCH#openspec/changes/archive/}"
[ -f openspec/specs/greeting/spec.md ] || fail "the delta spec was not synced into openspec/specs"
grep -q "hello world" openspec/specs/greeting/spec.md || fail "the synced spec lacks the requirement"
ok "delta spec synced into openspec/specs/greeting/spec.md"

printf '\nAll end-to-end checks passed.\n'
