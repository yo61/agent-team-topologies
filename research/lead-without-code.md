# Mechanisms that can keep the lead from writing code

Research for [#28](https://github.com/yo61/agent-team-topologies/issues/28), under map
[#24](https://github.com/yo61/agent-team-topologies/issues/24). Docs fetched from
`code.claude.com/docs/en/*` on 2026-10-09. Nothing here was verified by running Claude Code.

## Answer

The docs have no "delegate mode", and no mechanism that is documented as "restrict the lead, leave
the teammates alone". Six permission modes exist: `default`, `acceptEdits`, `plan`, `auto`,
`dontAsk` and `bypassPermissions`
([permission-modes#available-modes](https://code.claude.com/docs/en/permission-modes#available-modes)).
"Delegate mode" doesn't appear on any of the pages fetched.

The only lead-restraint guidance on the agent-teams page is a prompt. When the lead starts doing
tasks itself, tell it "Wait for your teammates to complete their tasks before proceeding"
([agent-teams#wait-for-teammates-to-finish](https://code.claude.com/docs/en/agent-teams#wait-for-teammates-to-finish)).

What teammates inherit at spawn, per
[agent-teams#permissions](https://code.claude.com/docs/en/agent-teams#permissions):

- They inherit the lead's **permission mode**, except `dontAsk`. `--dangerously-skip-permissions`
  also carries over.
- You can't set a per-teammate mode at spawn. You can change one teammate's mode after it spawns.
- Teammate permission prompts appear in the lead's session.

The docs say inheritance covers the **mode**. They don't say it covers permission **rules** or CLI
tool flags. The ticket's framing ("teammates inheriting permissions at spawn") is broader than the
docs. So is the earlier bot comment on #28, which claims deny rules propagate through spawn
inheritance.

Teammates load project context: CLAUDE.md, MCP servers and skills. A lead started with
`--setting-sources` passes that restricted list to its teammates
([agent-teams#context-and-communication](https://code.claude.com/docs/en/agent-teams#context-and-communication)).
The docs imply that teammates read the same settings files. Rules in settings files therefore
reach teammates because those files are loaded, not through spawn inheritance.

## Mechanisms

### 1. Permission deny rules in settings (`permissions.deny`)

- **Setup.** Put bare tool names in `permissions.deny`, for example `"Edit"`, `"Write"`,
  `"NotebookEdit"` and `"Bash"`. A bare name removes the tool from Claude's context entirely
  ([permissions](https://code.claude.com/docs/en/permissions), "Deny rules behave differently...").
  Deny rules block in every mode, including `bypassPermissions`. A deny at any level can't be
  overridden by another level
  ([permissions](https://code.claude.com/docs/en/permissions), settings precedence).
- **Path rules.** Path rules for `Write` and `NotebookEdit` are accepted but never consulted. Use
  `Edit(path)`. Edit deny rules also cover Bash redirects, `tee`, and the file commands Claude
  Code recognises. They don't cover every command that writes
  ([permissions](https://code.claude.com/docs/en/permissions), redirects and file-rule notes).
- **Session.** It persists for as long as the settings file says so. Changes made in
  `/permissions` mid-session apply from the next tool call.
- **Teammates.** It isn't lead-only. A `permissions.deny` rule "applies to the main conversation
  and to subagents" ([sub-agents#available-tools](https://code.claude.com/docs/en/sub-agents#available-tools)).
  Split-pane teammates are separate
  Claude Code processes that load settings. A settings deny on `Edit` would block the
  implementers too.
- **Fit.** It suits an all-read-only team, such as Review Board or Parallel Explorers. It doesn't
  suit "lead coordinates, workers code".

### 2. Plan mode (`--permission-mode plan`, `Shift+Tab`, `defaultMode: "plan"`)

- **Setup.** Start with `claude --permission-mode plan`, cycle to it with `Shift+Tab`, or set
  `defaultMode: "plan"` in project settings
  ([permission-modes#analyze-before-you-edit-with-plan-mode](https://code.claude.com/docs/en/permission-modes#analyze-before-you-edit-with-plan-mode)).
- **Effect.** It blocks edits. Shell commands are reviewed by the auto-mode classifier when it's
  available and `useAutoModeDuringPlan` is on, which is the default. Otherwise commands outside
  the read-only set prompt.
- **Exception.** In an interactive terminal session where bypass permissions are available, plan
  mode's blocks aren't enforced at all
  ([permission-modes#skip-all-checks-with-bypasspermissions-mode](https://code.claude.com/docs/en/permission-modes#skip-all-checks-with-bypasspermissions-mode)).
  Bypass is available when the session was started with `--allow-dangerously-skip-permissions` or
  in bypass.
- **Session.** It doesn't hold. It ends when the user presses `Shift+Tab` or approves a plan the
  lead presents, because approving switches the session to another mode.
- **Teammates.** "A teammate that Claude spawns while the lead is in plan mode works in read-only
  plan mode until its plan is ready". Its plan is then auto-approved by the lead's session with no
  review, and it starts implementing
  ([agent-teams#have-teammates-plan-before-implementing](https://code.claude.com/docs/en/agent-teams#have-teammates-plan-before-implementing)).
  A lead in plan mode can still spawn implementers. They pass through a forced planning step and
  then edit under the permission prompts.
- **Undocumented.** It isn't stated what mode a teammate lands in after that auto-approval.
- **Fit.** It's the closest documented fit, but it's soft. It breaks under bypass, and it lasts
  only until the lead's own plan is approved or the mode is toggled.

### 3. `--disallowedTools` / `--tools` / `--allowedTools` (CLI)

- **Setup.**
  - `--disallowedTools "Edit" "Write" "NotebookEdit" "Bash"`: bare names remove tools from
    context, and scoped rules deny only matching calls.
  - `--tools "Read,Grep,Glob,..."`: an allowlist of built-in tools, with no effect on MCP tools.
  - `--allowedTools`: only pre-approves tools and doesn't restrict anything, so it doesn't fit
    ([cli-reference#cli-flags](https://code.claude.com/docs/en/cli-reference#cli-flags)).
- **Session.** It lasts for that process only. It isn't saved anywhere.
- **Teammates.** **Undocumented.** The agent-teams page names `--setting-sources` as passed to
  teammates and doesn't mention the tool flags. There are two pieces of indirect evidence:
  - Subagents inherit "the built-in tools and MCP tools available in the main conversation"
    ([sub-agents#available-tools](https://code.claude.com/docs/en/sub-agents#available-tools)).
  - "An in-process teammate follows your session the same way" for Task-tool availability
    ([tools-reference](https://code.claude.com/docs/en/tools-reference), task tool availability).

  If in-process teammates draw on the lead's tool pool in general, removing `Edit` from the lead
  also removes it from in-process teammates. Split-pane teammates are separate processes, and the
  docs don't say which flags they receive.
- **Coordination tools.** If you use `--tools`, include `Agent`, `SendMessage` and the Task tools.
  Naming a Task tool opts the session in.
- **Fit.** Unknown until it's tested. It needs a run to settle.

### 4. Lead running as a restricted agent (`claude --agent <name>` or `"agent"` setting)

- **Setup.** Define an agent whose `tools:` omits `Edit`, `Write`, `NotebookEdit` and `Bash`, and
  launch with `claude --agent lead-coordinator`, or set `"agent": "lead-coordinator"` in settings.
  "The main thread itself takes on that subagent's tool restrictions and model"
  ([sub-agents#invoke-subagents-explicitly](https://code.claude.com/docs/en/sub-agents#invoke-subagents-explicitly)
  and [settings-reference#agent](https://code.claude.com/docs/en/settings-reference#agent)).
- **Spawn allowlist.** Only in this main-thread mode, `tools: Agent(implementer, tester), ...`
  limits which agent types the lead can spawn
  ([sub-agents#restrict-which-subagents-can-be-spawned](https://code.claude.com/docs/en/sub-agents#restrict-which-subagents-can-be-spawned)).
- **System prompt.** The agent body replaces the default system prompt.
- **Session.** It lasts the whole session and survives resume, which restores tool restrictions
  and model. The `tools:` list on a lead definition isn't something the lead can toggle off. That
  makes it the only mechanism here that is a hard boundary for the session's lifetime.
- **Teammates.**
  - A teammate spawned from its own definition is limited to that definition's `tools`, with
    `SendMessage` and the Task tools added for in-process teammates
    ([agent-teams#use-subagent-definitions-for-teammates](https://code.claude.com/docs/en/agent-teams#use-subagent-definitions-for-teammates)).
  - **Undocumented:** whether a teammate's `tools` list resolves against the lead's reduced pool.
    For subagents it does: "disallowedTools is applied first, then tools is resolved against the
    remaining pool". If teammates behave like subagents, a lead without `Edit` can't hand `Edit`
    to in-process teammates.
  - The permission mode still propagates as described above.
- **Plugin agents.** The lead definition must be project, user or CLI-defined if it needs
  `permissionMode` or `hooks`, because plugin agents ignore both
  ([sub-agents#choose-the-subagent-scope](https://code.claude.com/docs/en/sub-agents#choose-the-subagent-scope)).
- **Fit.** It's the strongest candidate on paper, but whether teammates get their pool from the
  lead must be tested.

### 5. Hooks (`PreToolUse` deny)

- **Setup.** Add a `PreToolUse` hook matching `Edit|Write|NotebookEdit|Bash` that returns
  `hookSpecificOutput.permissionDecision: "deny"`. Exit 2 also blocks
  ([hooks](https://code.claude.com/docs/en/hooks)).
- **Telling the lead apart.** Settings hooks fire inside subagents too, and the input there
  carries `agent_id` and `agent_type`. `agent_id` is "present only when the hook fires inside a
  subagent call", and `agent_type` is present when the session uses `--agent`
  ([hooks#common-input-fields](https://code.claude.com/docs/en/hooks#common-input-fields)). A hook
  could deny when `agent_id` is absent (the main thread), or when `agent_type` equals the lead's
  `--agent` name and `agent_id` is absent.
- **Session.** It lasts as long as the settings file. Frontmatter hooks on an agent run while that
  agent runs, including as the main session via `--agent`
  ([sub-agents](https://code.claude.com/docs/en/sub-agents), hooks in subagent frontmatter).
  Putting the hook in the lead agent's own frontmatter scopes it to the lead with no detection
  logic.
- **Teammates.** **Undocumented** for `PreToolUse`:
  - `agent_id` is documented for in-process teammates only on `TaskCreated`, `TaskCompleted` and
    `TeammateIdle`, from v2.1.290.
  - A split-pane teammate is its own process, so its tool calls probably look like main-thread
    calls (no `agent_id`) to a settings hook. That is an inference.
  - An "absent `agent_id` means lead" rule may therefore also block split-pane teammates.
  - A hook in the lead agent's frontmatter avoids that question, unless frontmatter hooks also
    follow teammates spawned from that definition. Teammates get only `tools`, `model`,
    `disallowedTools`, `effort`, the body and `mcpServers` from a definition, and `hooks` isn't on
    that list.
- **Rules still win.** PreToolUse decisions don't bypass permission rules, but a hook deny adds a
  block.
- **Fit.** It's a usable hard block, especially as a frontmatter hook on a `--agent` lead. Whether
  lead and teammates can be told apart reliably needs a run.

### 6. `dontAsk` mode on the lead (not in the ticket's list)

- **Setup.** Start with `claude --permission-mode dontAsk` and allow only coordination tools.
  Anything that would prompt is auto-denied, which by default includes `Edit`, `Write` and Bash
  writes
  ([permission-modes#allow-only-pre-approved-tools-with-dontask-mode](https://code.claude.com/docs/en/permission-modes#allow-only-pre-approved-tools-with-dontask-mode)).
- **Session.** It lasts until the mode is changed.
- **Teammates.** This is the one mode teammates **don't** inherit.
- **Undocumented.**
  - Which mode teammates get instead.
  - Whether teammate prompts surfacing in a `dontAsk` lead's session get auto-denied. If they do,
    the implementers would be unable to edit anything.
- **Fit.** It's interesting because it's the documented exception to inheritance. It needs a run.

## Summary

| Mechanism | Hard block? | Survives session? | Reaches teammates? | Doc |
| --- | --- | --- | --- | --- |
| `permissions.deny` in settings | Yes | Yes | Yes (settings load) | [permissions](https://code.claude.com/docs/en/permissions) |
| Plan mode | Partly (not under bypass) | No (exits on approval or toggle) | Yes (plan, auto-approved) | [permission-modes](https://code.claude.com/docs/en/permission-modes#analyze-before-you-edit-with-plan-mode) |
| `--disallowedTools` / `--tools` | Yes | Process only | Undocumented | [cli-reference](https://code.claude.com/docs/en/cli-reference#cli-flags) |
| `--agent` lead with `tools:` | Yes | Yes, also on resume | Pool inheritance undocumented | [sub-agents](https://code.claude.com/docs/en/sub-agents#invoke-subagents-explicitly) |
| `PreToolUse` hook | Yes | Yes | Undocumented for teammates | [hooks](https://code.claude.com/docs/en/hooks#common-input-fields) |
| `dontAsk` lead | Yes | Until changed | Not inherited; fallback undocumented | [agent-teams](https://code.claude.com/docs/en/agent-teams#permissions) |

## Left unresolved by the docs

The docs don't settle these six points. Each needs a test run:

1. Do `--tools` and `--disallowedTools` on the lead reach in-process teammates or split-pane
   teammates?
2. Does a teammate's definition `tools` list resolve against the lead's tool pool, the way
   subagents' lists do? Can a `--agent` lead without `Edit` spawn an implementer with `Edit`?
3. Does `PreToolUse` input carry `agent_id` for in-process teammates? What do split-pane
   teammates' hook inputs look like?
4. What mode does a teammate spawned under a `dontAsk` lead get? Are teammate prompts
   auto-denied in a `dontAsk` lead?
5. After a plan-mode teammate's plan is auto-approved, which mode does it switch to?
6. If the lead's mode changes after teammates spawn, does the change propagate? The docs say only
   that modes are "set at spawn".
