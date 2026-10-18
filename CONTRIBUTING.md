# Contributing

This repository holds OpenSpec workflow schemas. Contributions add a schema or refine an existing one.

## Repo layout

```text
openspec/schemas/<name>/     one self-contained, copyable schema
  schema.yaml                the artifact graph
  templates/                 one template per declared artifact
  README.md                  purpose, activation, limitations
tests/                       the conformance harness for these schemas
openspec/changes/            this repository's own changes, archived when done
openspec/specs/              the accumulated behaviour contract for the schemas
```

## Quality gate

Schema work is not complete until both of these pass:

```bash
openspec schema validate <name>     # structure, templates, dependency graph
node tests/run.mjs                  # plan conformance and materialization
```

`openspec schema validate` catches a broken artifact graph — a missing template, an unresolvable `requires` edge, a dependency cycle. `tests/run.mjs` covers what validation cannot: whether the plan a schema produces is actually correct. See `tests/README.md` for what each layer covers.

If you are unsure which copy of a schema is being used, `openspec schema which <name>` prints the active directory and any lower-priority copies it shadows.

## Creating or forking a schema

Prefer forking a known-good schema over starting from nothing:

```bash
openspec schema fork <source> [new-name]
```

Sources can be this repository's schemas or the ones bundled with the CLI. To start from scratch instead:

```bash
openspec schema init <name> --description "..." --artifacts "proposal,specs,design,tasks"
```

Then work through the gate above.

## Conventions

- **A schema folder is self-contained.** It must work when copied alone into another project's `openspec/schemas/`. Nothing in `openspec/schemas/<name>/` may depend on a file outside it.
- **Forking a bundled schema means the shared artifacts stay byte-identical.** If a schema reuses artifacts from `spec-driven`, keep their `id`, `generates`, and `requires` exactly as the package has them, and copy their templates without edits, so the diff against upstream stays small.
- **Artifact ids are config keys.** Anything a schema README names as a `config.yaml` rules key must exist as an `artifact.id` in that schema's `schema.yaml`.
- **A schema is a snapshot.** Improving a shared artifact means re-forking and re-applying the change deliberately, not editing the fork's copy in place and letting it drift.

## This repository's own changes

This repository is developed with OpenSpec itself. Its specs live under `openspec/specs/`, and work in progress lives under `openspec/changes/` until archived.
