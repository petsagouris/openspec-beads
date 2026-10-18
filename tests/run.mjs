#!/usr/bin/env node
/**
 * Conformance harness for the beads-bridge schema.
 *
 * Two layers, both run against throwaway state so this repository's own work
 * graph and change folders are never touched:
 *
 *   plan      the conformance checker, over the conforming fixture and every
 *             malformed fixture, asserting which rule each one trips
 *   plan-live the conforming fixture materialized into a throwaway Beads
 *             database, asserting the graph behaves as the schema assumes
 *
 * Usage: node tests/run.mjs
 * Exit:  0 all checks pass, 1 any check failed
 */

import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import crypto from "node:crypto";
import { execFileSync } from "node:child_process";

const here = import.meta.dirname;
const repoRoot = path.resolve(here, "..");
const planDir = path.join(here, "plan");
const fixtureDir = path.join(planDir, "fixtures");

/** Each malformed fixture must trip exactly its own rule. */
const EXPECTED_RULE = {
  "bad-duplicate-key.json": "E1",
  "bad-unknown-edge-endpoint.json": "E2",
  "bad-edge-to-parent.json": "E3",
  "bad-unpinned-epic.json": "E4",
  "bad-two-epics.json": "E5",
  "bad-full-chain.json": "E6",
  "bad-orphan-parent.json": "E7",
};

let failures = 0;
let checks = 0;

function check(name, condition, detail) {
  checks += 1;
  if (condition) {
    console.log(`    ok    ${name}`);
  } else {
    failures += 1;
    console.log(`    FAIL  ${name}${detail ? ` - ${detail}` : ""}`);
  }
}

function section(title) {
  console.log(`\n${title}`);
}

/** Run a command and capture its result without throwing. */
function run(command, args, options = {}) {
  try {
    const stdout = execFileSync(command, args, {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
      ...options,
    });
    return { ok: true, stdout: stdout ?? "", code: 0 };
  } catch (error) {
    return {
      ok: false,
      stdout: error.stdout ?? "",
      stderr: error.stderr ?? "",
      code: typeof error.status === "number" ? error.status : 1,
    };
  }
}

const ruleCodes = (output) =>
  [...output.matchAll(/^ERROR \[([A-Z0-9]+)\]/gm)].map((m) => m[1]);

/** A stable fingerprint of this repository's own trackable state. */
function repoFingerprint() {
  const changes = fs
    .readdirSync(path.join(repoRoot, "openspec", "changes"))
    .sort()
    .join(",");
  const beads = run("bd", ["list", "--json", "--all"], { cwd: repoRoot });
  const digest = crypto
    .createHash("sha256")
    .update(beads.stdout || "")
    .digest("hex")
    .slice(0, 12);
  return { changes, beads: beads.ok ? digest : "no-database" };
}

const before = repoFingerprint();
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "beads-bridge-check-"));

try {
  // ---------------------------------------------------------------- plan layer
  section("plan: conformance checker");

  const good = run("node", [path.join(planDir, "check-plan.mjs"), path.join(planDir, "fixture-plan.json")]);
  check("the conforming fixture passes", good.ok && /All 1 plan/.test(good.stdout), `exit ${good.code}`);

  for (const [name, expected] of Object.entries(EXPECTED_RULE)) {
    const result = run("node", [path.join(planDir, "check-plan.mjs"), path.join(fixtureDir, name)]);
    const codes = ruleCodes(result.stdout + result.stderr);
    check(
      `${name} trips ${expected} and nothing else`,
      !result.ok && codes.length === 1 && codes[0] === expected,
      `exit ${result.code}, rules [${codes.join(",")}]`,
    );
  }

  const allBad = run("node", [
    path.join(planDir, "check-plan.mjs"),
    ...Object.keys(EXPECTED_RULE).map((name) => path.join(fixtureDir, name)),
  ]);
  check("every rule is reachable", new Set(ruleCodes(allBad.stdout + allBad.stderr)).size === 7);

  // ----------------------------------------------------------- plan-live layer
  section("plan-live: the fixture materialized in a throwaway database");

  const initialized = run("bd", ["init", "--prefix", "fx", "--non-interactive", "--role", "maintainer"], {
    cwd: tmp,
    env: { ...process.env, BEADS_DIR: path.join(tmp, ".beads") },
  });
  check("throwaway database initializes", initialized.ok, initialized.stderr?.slice(0, 120));

  const env = { ...process.env, BEADS_DIR: path.join(tmp, ".beads") };
  const planPath = path.join(planDir, "fixture-plan.json");

  const dry = run("bd", ["create", "--graph", planPath, "--dry-run"], { cwd: tmp, env });
  check("dry-run accepts the plan", dry.ok && /would create 5 issue/.test(dry.stdout), dry.stdout.slice(0, 120));

  const created = run("bd", ["create", "--graph", planPath, "--json"], { cwd: tmp, env });
  check("the plan materializes", created.ok, created.stderr?.slice(0, 120));

  let ids = {};
  try {
    ids = JSON.parse(created.stdout).ids ?? {};
  } catch {
    /* reported by the check below */
  }
  check("every node is minted, including dotted keys", Object.keys(ids).length === 5, JSON.stringify(Object.keys(ids)));

  const ready = run("bd", ["ready", "--label", "change:fixture-change", "--json"], { cwd: tmp, env });
  let readyIds = [];
  try {
    readyIds = JSON.parse(ready.stdout).map((issue) => issue.id);
  } catch {
    /* reported below */
  }
  check(
    "the ready frontier is exactly the two parallel tasks",
    readyIds.length === 2 && ids["1.1"] && readyIds.sort().join(",") === [ids["1.1"], ids["1.2"]].sort().join(","),
    JSON.stringify(readyIds),
  );

  const listed = run("bd", ["list", "--label", "change:fixture-change", "--json"], { cwd: tmp, env });
  let listedIds = [];
  try {
    listedIds = JSON.parse(listed.stdout).map((issue) => issue.id);
  } catch {
    /* reported below */
  }
  check(
    "the pinned epic is hidden from list and the four tasks are not",
    listedIds.length === 4 && !listedIds.includes(ids.epic),
    JSON.stringify(listedIds),
  );

  const epic = run("bd", ["show", ids.epic, "--json"], { cwd: tmp, env });
  let epicPinned = null;
  try {
    epicPinned = JSON.parse(epic.stdout)[0]?.pinned;
  } catch {
    /* reported below */
  }
  check("the epic is still reachable by id and pinned", epic.ok && epicPinned === true, `pinned=${epicPinned}`);

  const blocked = run("bd", ["blocked"], { cwd: tmp, env });
  check(
    "both dependent tasks are blocked",
    /Run the checker/.test(blocked.stdout) && /Record the conformance/.test(blocked.stdout),
    blocked.stdout.slice(0, 120),
  );

  // ------------------------------------------------------------ non-interference
  section("hermetic: this repository is untouched");

  const after = repoFingerprint();
  check("openspec/changes is unchanged", before.changes === after.changes, `${before.changes} -> ${after.changes}`);
  check("the repository's own beads are unchanged", before.beads === after.beads, `${before.beads} -> ${after.beads}`);
  check(
    "the throwaway database is separate from the repository's",
    path.join(tmp, ".beads") !== path.join(repoRoot, ".beads"),
  );
} finally {
  fs.rmSync(tmp, { recursive: true, force: true });
}

console.log(`\n${checks - failures}/${checks} checks passed.`);
if (failures > 0) {
  console.log(`${failures} failed.`);
  process.exit(1);
}
console.log("All checks passed.");
