# Quality criteria

Checked before any piece of work in this repository is called done.

Evaluations recorded: 1, to 2026-10-09 (2026-10-09: agent skills setup).

## Category: Published site boundary

## Criteria:

    - Every new top-level directory or `docs/` subdirectory that is not reader-facing
      appears in `_config.yml` `exclude`.
    - `_config.yml` still parses (`check yaml` prek hook passes).

## Severity: blocking

## Source: 2026-10-09 agent skills setup; `docs/` is the just-the-docs site source.

## Last triggered: 2026-10-09 (`docs/agents/` would have been published)

## Category: Pattern cards and examples

## Criteria:

    - A new topology has `topologies/<name>/index.md` with when to use, team shape, spawn
      prompt and example walkthrough, and an entry in `topologies/index.md`.
    - Examples state what actually happened, what went wrong, and duration, tokens and cost.
    - Topology counts in `CLAUDE.md`, `README.md`, `_config.yml` `description` and the
      `topology` skill agree with the number of directories under `topologies/`.

## Severity: blocking

## Source: project `CLAUDE.md`, "For agents working in this repo".

## Last triggered: never

## Category: Agent instructions

## Criteria:

    - `CLAUDE.md` and `docs/agents/*.md` name only files, labels and commands that exist
      or that a skill creates lazily, and say which.
    - `prek run --files <changed>` passes with no warnings.

## Severity: warning

## Source: global CLAUDE.md, "No phantom features" and "Zero warnings policy".

## Last triggered: never
