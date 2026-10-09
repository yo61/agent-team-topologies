## Decision: Treat this repo as a hard fork of EIrwin/agent-team-topologies and publish its own site at yo61.github.io/agent-team-topologies

## Context: The repo is a fork, 29 commits ahead and 0 behind upstream, with no PRs sent upstream. Its GitHub Pages build was already live at `yo61.github.io`, but `_config.yml`, `index.md`, `404.md` and the README pointed readers, edit links and issue reports at upstream.

## Alternatives considered:

- Soft fork: keep URLs out of shared files so fixes can be PR'd upstream.
- README links as relative repo paths instead of site URLs.
- Fork note in the site footer on every page.
- Actions-based Pages deploy instead of the legacy branch build.
- A custom domain.
- Leaving `LICENSE` unchanged and letting the fork note carry attribution.

## Reasoning:

- Hard fork: the plugin ships from the yo61 marketplace with its own manifest and repo
  tooling upstream lacks; there is no upstreaming flow to protect.
- All repo links to yo61: edit links and issue reports must reach the repo that builds the
  site. Attribution is carried by the fork note in the README and on the homepage.
- README links keep pointing at the rendered site (nav, Mermaid); only the host changes.
- Legacy build and `yo61.github.io` kept: neither is needed to re-point the site.
- `LICENSE` gains a second copyright line; MIT requires keeping Eric Irwin's notice.

## Trade-offs accepted:

- Upstream fixes now arrive only by manual cherry-pick from the `eirwin` remote.
- The fork note lists no differences from upstream; `CHANGELOG.md` holds those.

## Supersedes: none
