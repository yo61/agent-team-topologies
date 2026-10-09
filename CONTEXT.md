# Agent Team Topologies

Reusable patterns for structuring Claude Code agent teams, published as a documentation site and
shipped as a Claude Code plugin. This repo is a fork maintained independently of its upstream.

## Language

### Distribution

**Site**:
The published documentation at `yo61.github.io/agent-team-topologies`; it always reflects `main`.
_Avoid_: docs site, Pages, website

**Plugin**:
The installable package of the topology skill and agent definitions; users receive it only as a
tagged release pinned by the marketplace.
_Avoid_: package, extension

**Upstream**:
`EIrwin/agent-team-topologies`, the repo this one was forked from.
_Avoid_: original, parent, source

### Maintenance

**Drift**:
A claim in this repo about Claude Code behaviour that disagrees with the official docs at
`code.claude.com/docs`, or with observed behaviour where the docs are wrong or silent.
_Avoid_: staleness, rot, out-of-date content
