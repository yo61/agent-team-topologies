## Decision: Configure the mattpocock engineering skills for GitHub Issues on yo61, default triage labels, and `decisions/` in place of `docs/adr/`

## Context: `/setup-matt-pocock-skills` scaffolds where `to-tickets`, `triage`, `to-spec`, `wayfinder` and `domain-modeling` read and write. This repo is a fork with two remotes and its `docs/` directory is the Jekyll site source.

## Alternatives considered:

- Local markdown issues under `.scratch/`.
- Mapping `ready-for-human` to Last Light's existing `requires-human` label.
- The skill's default `docs/adr/` with numbered ADRs.
- Publishing `docs/agents/` on the site, or moving it outside `docs/`.

## Reasoning:

- GitHub: `gh` already resolves to `yo61/agent-team-topologies`; issues are enabled there.
- Default labels: `requires-human` means a bot could not proceed, not that a ticket is
  scoped for a human; conflating them would let Last Light and `/triage` fight over it.
- `decisions/`: matches the global decision-journal convention and the horopter repos'
  adapted `domain.md`, so one place holds decision records.
- Jekyll `exclude` for `docs/agents/`, `decisions/`, `knowledge/`, `quality/`: keeps the
  skill's standard path while keeping internal agent state off the public pattern site.

## Trade-offs accepted:

- Four triage labels (`needs-triage`, `needs-info`, `ready-for-agent`, `ready-for-human`)
  don't exist yet and get created on first use.
- `docs/agents/` lives inside the site source and depends on the `exclude` list to stay
  unpublished.

## Supersedes: none
