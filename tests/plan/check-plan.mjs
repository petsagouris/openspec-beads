#!/usr/bin/env node
/**
 * Conformance check for a beads-bridge graph plan.
 *
 * The point of this file is that a plan is the one artifact in the bridge that
 * is both machine-checkable and easy to get subtly wrong. Beads will reject a
 * structurally invalid plan, but it will not tell you that the plan is *wrong*:
 * a plan whose every dependency is inverted still validates cleanly.
 *
 * The check cannot infer intent, so it decides only what is decidable:
 *
 *   E1  duplicate node keys
 *   E2  an edge endpoint that is not a declared node key
 *   E3  an edge between a node and its own parent, in either direction
 *   E4  an epic container that is not pinned, so it is claimable as work
 *   E5  a plan without exactly one epic container
 *   E6  every task serialised into one chain - the priority-tier signature
 *   E7  a parent_key that is not a declared node key
 *   W1  a task node with no parent_key
 *   W2  an epic container with no children
 *
 * Errors make the run exit non-zero. Warnings are printed and do not.
 *
 * Usage: node tests/plan/check-plan.mjs <plan.json> [more-plans.json ...]
 */

import fs from "node:fs";

const errors = [];
const warnings = [];
const fail = (file, rule, message) => errors.push({ rule, message, file });
const warn = (file, rule, message) => warnings.push({ rule, message, file });

/**
 * A chain that visits every task is what a plan looks like when its edges were
 * derived from priority tiers rather than from real dependency. Returns the
 * ordering when one exists, otherwise null.
 */
function fullChain(taskKeys, edges) {
  if (taskKeys.length < 3) return null;

  const blockers = new Map(taskKeys.map((k) => [k, 0])); // how many tasks block this one
  const dependents = new Map(taskKeys.map((k) => [k, 0])); // how many this one blocks
  const next = new Map(); // blocker -> the task it blocks
  let counted = 0;

  for (const edge of edges) {
    if (edge.type && edge.type !== "blocks") continue;
    // from_key is the DEPENDENT, to_key is the BLOCKER.
    if (!blockers.has(edge.from_key) || !blockers.has(edge.to_key)) continue;
    blockers.set(edge.from_key, blockers.get(edge.from_key) + 1);
    dependents.set(edge.to_key, dependents.get(edge.to_key) + 1);
    next.set(edge.to_key, edge.from_key);
    counted += 1;
  }

  if (counted !== taskKeys.length - 1) return null;
  if ([...blockers.values()].some((n) => n > 1)) return null;
  if ([...dependents.values()].some((n) => n > 1)) return null;

  const starts = [...blockers.entries()].filter(([, n]) => n === 0).map(([k]) => k);
  if (starts.length !== 1) return null;

  const order = [];
  let current = starts[0];
  while (current !== undefined && order.length <= taskKeys.length) {
    order.push(current);
    current = next.get(current);
  }
  return order.length === taskKeys.length ? order : null;
}

function checkPlan(file) {
  let plan;
  try {
    plan = JSON.parse(fs.readFileSync(file, "utf8"));
  } catch (error) {
    fail(file, "E0", `unreadable or invalid JSON: ${error.message}`);
    return;
  }

  const nodes = Array.isArray(plan.nodes) ? plan.nodes : [];
  const edges = Array.isArray(plan.edges) ? plan.edges : [];

  // E1 - unique keys
  const byKey = new Map();
  for (const node of nodes) {
    const key = node.key;
    if (key === undefined || key === null || key === "") {
      fail(file, "E1", `a node has no key (title: ${node.title ?? "<none>"})`);
      continue;
    }
    if (byKey.has(key)) fail(file, "E1", `duplicate node key "${key}"`);
    else byKey.set(key, node);
  }

  // E7 - parent_key resolves
  for (const node of nodes) {
    if (node.parent_key !== undefined && !byKey.has(node.parent_key)) {
      fail(file, "E7", `node "${node.key}" has parent_key "${node.parent_key}", which is not a declared node key`);
    }
  }

  // E4, E5, W1, W2 - the container
  const epics = nodes.filter((node) => node.type === "epic");
  if (epics.length !== 1) {
    fail(file, "E5", `expected exactly one node with type "epic", found ${epics.length}`);
  }
  for (const epic of epics) {
    if (epic.pinned !== true) {
      fail(file, "E4", `epic container "${epic.key}" is not pinned, so it is claimable as work`);
    }
  }
  const parented = new Set(nodes.map((node) => node.parent_key).filter(Boolean));
  for (const epic of epics) {
    if (!parented.has(epic.key)) warn(file, "W2", `epic container "${epic.key}" has no children`);
  }
  for (const node of nodes) {
    if (node.type !== "epic" && node.parent_key === undefined) {
      warn(file, "W1", `task node "${node.key}" has no parent_key, so it is outside the change's container`);
    }
  }

  // E2, E3 - edges
  for (const edge of edges) {
    const from = edge.from_key;
    const to = edge.to_key;
    if (!byKey.has(from)) fail(file, "E2", `edge from_key "${from}" is not a declared node key`);
    if (!byKey.has(to)) fail(file, "E2", `edge to_key "${to}" is not a declared node key`);
    if (byKey.has(from) && byKey.has(to)) {
      const fromNode = byKey.get(from);
      const toNode = byKey.get(to);
      if (fromNode.parent_key === to || toNode.parent_key === from) {
        fail(file, "E3", `edge ${from} -> ${to} runs between a node and its own parent or child; parent_key already establishes that relationship, and Beads rejects it as a cycle`);
      }
    }
  }

  // E6 - the priority-tier signature
  const taskKeys = nodes.filter((node) => node.type !== "epic").map((node) => node.key);
  const chain = fullChain(taskKeys, edges);
  if (chain) {
    fail(file, "E6", `every task is serialised into a single chain (${chain.join(" -> ")}); this is the priority-tier signature, where ordering was derived from priority instead of from real dependency`);
  }

  return { nodes: nodes.length, edges: edges.length };
}

const files = process.argv.slice(2);
if (files.length === 0) {
  console.error("usage: node tests/plan/check-plan.mjs <plan.json> [more-plans.json ...]");
  process.exit(2);
}

for (const file of files) {
  const summary = checkPlan(file);
  if (summary) {
    console.log(`${file}: ${summary.nodes} node(s), ${summary.edges} edge(s)`);
  }
}

for (const finding of warnings) {
  console.log(`WARN  [${finding.rule}] ${finding.file}: ${finding.message}`);
}
for (const finding of errors) {
  console.log(`ERROR [${finding.rule}] ${finding.file}: ${finding.message}`);
}

if (errors.length > 0) {
  console.log(`\n${errors.length} error(s) across ${files.length} plan(s).`);
  process.exit(1);
}
console.log(`\nAll ${files.length} plan(s) conform.`);
