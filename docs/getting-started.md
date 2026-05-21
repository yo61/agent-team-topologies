---
title: Getting Started
parent: Guides
nav_order: 0
---

# Getting Started

This guide walks you through enabling agent teams, installing the topology configs, and running your first topology.

---

## Prerequisites

You need [Claude Code](https://docs.anthropic.com/en/docs/claude-code/overview) installed and running.

{: .warning }
> **Agent teams are experimental.** They're disabled by default. Enable them by adding the following to your Claude Code settings or exporting the environment variable:
>
> ```json
> {
>   "env": {
>     "CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS": "1"
>   }
> }
> ```
>
> See the [official agent teams documentation](https://docs.anthropic.com/en/docs/claude-code/agent-teams) for setup details and known limitations.

---

## Install

### Option 1 (recommended): install as a Claude Code plugin

```
/plugin marketplace add yo61/claude-skills
/plugin install agent-team-topologies
```

The skill, subagents, and topology pattern cards all install together. Invoke the chooser with `/agent-team-topologies:topology`.

### Option 2: manual copy

Clone this repo and copy the components into your project's `.claude/` directory:

```bash
git clone https://github.com/yo61/agent-team-topologies.git
cp -r agent-team-topologies/agents/ your-project/.claude/agents/
cp -r agent-team-topologies/skills/ your-project/.claude/skills/
cp -r agent-team-topologies/.claude/hooks/ your-project/.claude/hooks/
```

{: .tip }
> Merge into an existing `.claude/` directory file-by-file so you don't clobber your own settings or instructions.

---

## What you get

- **6 subagents** -- explorer, security reviewer, performance reviewer, test reviewer, architect, implementer
- **`topology` skill** -- interactive chooser that recommends a topology based on your goal
- **Hook script templates** -- quality gates and idle summary enforcement

---

## Plugin layout

```
agent-team-topologies/
├── .claude-plugin/
│   └── plugin.json          # Plugin manifest
├── agents/
│   ├── explorer.md          # Read-only codebase discovery
│   ├── security-reviewer.md # OWASP-informed security review
│   ├── perf-reviewer.md     # Performance analysis
│   ├── test-reviewer.md     # Test coverage & correctness
│   ├── architect.md         # Plan-mode architecture design
│   └── implementer.md       # Focused code execution
├── skills/
│   └── topology/
│       └── SKILL.md         # Interactive topology chooser
├── topologies/              # Pattern cards the skill reads
└── .claude/hooks/           # Reference scripts (NOT auto-fired)
    ├── quality-gate.sh      # Block task completion if tests/lint fail
    ├── idle-summary.sh      # Require structured summary before idle
    └── README.md            # Installation guide
```

---

## Configure hooks

The hook scripts are reference templates -- they're not auto-fired when the plugin is enabled. Copy them into your own `.claude/hooks/` and wire them up in your settings:

```bash
chmod +x your-project/.claude/hooks/*.sh
```

See [`.claude/hooks/README.md`](https://github.com/yo61/agent-team-topologies/blob/main/.claude/hooks/README.md) for detailed installation and configuration instructions.

---

## Run your first topology

The fastest way to get started is the `/topology` skill. Run it inside Claude Code:

```
/topology
```

It walks you through the [decision tree](decision-tree.md) and outputs a ready-to-use spawn prompt for your chosen topology.

---

## Next steps

| Guide | What you'll learn |
|-------|-------------------|
| [Mental Model](mental-model.md) | Teams vs subagents, core concepts, selection heuristics |
| [Composing Topologies](composing-topologies.md) | Recipes for chaining, nesting, and combining patterns |
| [Cost Guide](cost-guide.md) | Token economics by topology, cost reduction strategies |
| [Best Practices](best-practices.md) | Operational guidance for running agent teams |
