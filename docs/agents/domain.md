# Domain Docs

How the engineering skills should consume this repo's domain documentation when exploring.

## Before exploring, read these

- **`CONTEXT.md`** at the repo root: the project's ubiquitous language (topology, pattern
  card, spawn prompt, ...).
- **`decisions/`**: this repo's decision records, the equivalent of ADRs. Named
  `YYYY-MM-DD-<topic>.md`, not numbered. Read those that touch the area you are about to work
  in; `rg -l <term> decisions/` finds them.

If either doesn't exist, **proceed silently**. Don't flag its absence; don't suggest creating
it upfront. `/domain-modeling` creates `CONTEXT.md` lazily when terms actually get resolved.

## File structure

Single-context:

```
/
├── CONTEXT.md
├── decisions/
│   └── 2026-10-09-<topic>.md
├── docs/            ← Jekyll site source (docs/agents/ excluded from the build)
└── topologies/
```

## Use the glossary's vocabulary

When your output names a domain concept (in an issue title, a refactor proposal, a hypothesis,
a test name), use the term as defined in `CONTEXT.md`. Don't drift to synonyms the glossary
explicitly avoids.

If the concept you need isn't in the glossary yet, that's a signal: either you're inventing
language the project doesn't use (reconsider) or there's a real gap (note it for
`/domain-modeling`).

## Flag decision conflicts

If your output contradicts a decision record, surface it explicitly rather than silently
overriding:

> _Contradicts `decisions/YYYY-MM-DD-<topic>.md`, but worth reopening because…_

A new or replacing decision is written to `decisions/YYYY-MM-DD-<topic>.md` in the format the
global instructions give, with a `Supersedes` section when it replaces one.
