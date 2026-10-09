# Mechanisms that can gate a teammate plan on real review

Research for issue #26 (map #24). Sources were fetched on 2026-10-09 from
`code.claude.com/docs/en/*.md`. Every claim below cites the page that states it. Where the docs
say nothing, this note says so.

## Answer

No documented setting or hook turns off the lead's automatic approval of a teammate's plan.
The docs call it "the designed exception" to teammate permission prompts. The documented hard
gates act on tool calls (`PreToolUse` hooks, `ask`/`deny` permission rules) and on tasks
(dependencies, `TaskCreated`, `TaskCompleted`). They do not act on the plan-approval message.

The most promising lever is a `PreToolUse` hook or an `ask` rule on `ExitPlanMode`, but it is
unverified. The docs never say whether a teammate's plan-approval request is an `ExitPlanMode`
call in the teammate's session, where those hooks would fire. Someone has to run Claude Code to
find out.

Gates that the docs do guarantee:

- **Per-action human review after planning.** Teammates in manual (`default`) mode send every
  edit and command prompt to the lead session for the human to approve.
- **A task-level gate.** An implementation task blocked by a review task, plus a
  `TaskCompleted` hook that will not let the review task close until a human approval marker
  exists.

## Mechanisms

### 1. Lead in plan mode at spawn

- **How it works:** a teammate that Claude spawns while the lead is in plan mode works in
  read-only plan mode until its plan is ready. It then sends a plan approval request to the lead.
  [agent-teams#have-teammates-plan-before-implementing][at-plan]
- **What it blocks:** edits while the teammate is planning. Plan mode keeps edits blocked "until
  you approve the plan". [permission-modes#analyze-before-you-edit-with-plan-mode][pm-plan]
- **Limits:**
  - "Claude Code approves the plan in the lead's session as soon as the request arrives, without
    the lead reviewing it." Nobody, neither the lead model nor the human, gets a review step.
    [at-plan]
  - "Plan approval is the designed exception: the lead session grants teammate plan approvals
    without a separate prompt to you." [agent-teams#permissions][at-perm]
  - After approval, "the teammate's edits and commands still go through the permission prompts".
    [at-plan]
  - In interactive terminal sessions with bypass permissions available, plan mode's blocks are
    not enforced. [permission-modes][pm-bypass]
  - Teammates inherit the lead's mode, except `dontAsk`. Per-teammate modes can't be set at
    spawn time, only changed afterwards. [at-perm]
  - A subagent definition's `permissionMode` and `hooks` are not among the parts Claude Code
    applies to a teammate. The applied parts are `tools`, `model`, `disallowedTools`, `effort`,
    the body, and (split-pane only) `mcpServers`.
    [agent-teams#use-subagent-definitions-for-teammates][at-defs]
- **No off switch:** `settings-reference` and `env-vars` document no setting or variable that
  disables the automatic approval. Grepping both pages for "plan approval" and "teammate" turns up
  only `teammateMode`, `showClearContextOnPlanAccept`, and model variables.

### 2. `PreToolUse` hook on `ExitPlanMode`

- **How it works:** `PreToolUse` matches `ExitPlanMode`. Claude Code injects `plan` (the
  Markdown content) and `planFilePath` into `tool_input`.
  [hooks#exitplanmode][h-epm]
  - The hook can return `permissionDecision` as `deny` (Claude sees the reason), `ask` (prompts
    the user, with the hook's source labelled), or `defer`.
  - `allow` on its own does not satisfy `ExitPlanMode`. It must be paired with `updatedInput`.
    [hooks#pretooluse-decision-control][h-ptu]
  - Exit code 2 routes the same way as `deny`.
  - A hook's `ask` also forces a prompt in auto mode.
- **What it would block:** leaving plan mode. A hook could, for example, deny until a
  human-written approval file exists for the plan.
- **Scope:** hooks from settings files, managed policy, and plugins run inside subagents, and the
  input carries `agent_id`/`agent_type`. [hooks#matcher-patterns][h-sub] Teammates load the same
  settings sources as the lead. [agent-teams#context-and-communication][at-ctx] Frontmatter hooks
  on the subagent definition are not applied to teammates. [at-defs]
- **Unresolved (needs a live test):**
  - The docs don't say whether a teammate's "plan approval request" goes through an
    `ExitPlanMode` tool call in the teammate's session, so it's unknown whether this hook fires
    for teammates at all.
  - If the hook does fire, the docs don't say whether an `ask` from a teammate's
    `ExitPlanMode` reaches the human, given that teammate prompts appear in the lead session, or
    whether the lead's automatic grant overrides it.
  - `agent_id` is documented as identifying in-process teammates only on `TaskCreated`,
    `TaskCompleted`, and `TeammateIdle`. On `PreToolUse`, the docs say it is present "only when
    the hook fires inside a subagent call", without mentioning teammates.

### 3. Permission rules

- **How it works:** `ExitPlanMode` accepts a rule with the bare tool name and no specifier.
  [tools-reference][tr-rules] `ask` and `deny` rules are evaluated whatever a `PreToolUse` hook
  returns. [permissions][p-hooks]
  - A bare-name deny rule removes the tool from Claude's context entirely.
    [permissions#manage-permissions][p-manage]
- **What it blocks:**
  - `ask: ["ExitPlanMode"]` would prompt before the plan is accepted.
  - `deny: ["ExitPlanMode"]` would remove the ability to leave plan mode at all, which is a
    blunt instrument.
  - `ask` rules on `Edit`, `Write` and `Bash(...)` give a documented per-action human gate after
    planning, even in auto mode for matching commands. [permissions][p-manage]
- **Limits:**
  - The same unknown as mechanism 2: the docs don't say whether the lead's automatic grant of
    teammate plan approvals honours an `ask` rule on `ExitPlanMode`.
  - The docs don't say what a bare deny on `ExitPlanMode` does to a teammate that is in plan
    mode.
  - Per-action `ask` rules gate actions, not the plan, and they add the prompt friction the docs
    warn about. [agent-teams#too-many-permission-prompts][at-friction]

### 4. `SendMessage` protocols

- **How it works:**
  - `plan_approval_response` and `shutdown_request` are structured team-protocol messages that
    require agent teams to be enabled. [sub-agents#resume-subagents][sa-resume] Their schema isn't
    documented.
  - A message is reported as sent only once it has been written to the recipient's mailbox.
    [agent-teams#architecture][at-arch]
  - A human can message any teammate directly. [agent-teams#talk-to-teammates-directly][at-talk]
- **What it blocks:** nothing, by itself.
  - A convention could work like this: no plan mode, and the teammate is told to send its plan as
    a plain message and wait for an explicit "approved" reply before editing.
  - That is enforced by the prompt only.
- **Limits:**
  - The receiving agent is told the message came from another Claude session, not from you. "A
    teammate can't approve a permission prompt or supply consent on your behalf." [at-perm]
  - In auto mode, the classifier treats an approval relayed from another agent as untrusted input.
    It reviews every message before delivery, plan approval responses included, and a message it
    blocks never arrives. [at-perm], [permission-modes][pm-classifier]
  - Messages carry review content, but enforcement still has to come from mechanism 3 or 5.

### 5. Tasks with dependencies, plus `TaskCreated` and `TaskCompleted` hooks

- **How it works:**
  - A pending task with unresolved dependencies can't be claimed until they complete. Claude Code
    unblocks dependent tasks automatically. [agent-teams#assign-and-claim-tasks][at-tasks],
    [at-arch]
  - `TaskUpdate` sets dependencies. [tools-reference][tr-tools]
  - `TaskCreated` exit 2, or `{"decision":"block"}`, deletes the task and returns the message.
    [hooks#taskcreated][h-tc]
  - `TaskCompleted` exit 2 stops the task from being marked complete.
    [hooks#taskcompleted][h-tdone]
  - Neither event supports matchers. Both receive `teammate_name`, plus `agent_id` from
    v2.1.290.
- **What it blocks:**
  - With a "Review plan for X" task blocking "Implement X", and a `TaskCompleted` hook that exits 2
    until a human approval marker exists, the implementation task can't be claimed until the human
    signs off.
  - `TaskCreated` can refuse implementation tasks that don't reference an approved plan.
- **Limits:**
  - This gates claiming through the task list, not edits. A teammate that edits without claiming,
    or is messaged directly, isn't stopped.
  - The docs don't say whether an explicit assignment by the lead bypasses unresolved
    dependencies.
  - Any agent with `TaskUpdate` can change dependencies.
  - Task status can lag and block dependants. [agent-teams#limitations][at-limits]
  - The Task tools exist only on some models by default (opt in with
    `CLAUDE_CODE_ENABLE_TODO_TOOLS=1`). Without them, `TaskCreated` doesn't fire.
    [tools-reference#task-tool-availability][tr-tasks]
  - A `TaskCompleted` triggered by `TaskUpdate` ignores `continue: false`.

### Adjacent hooks (not plan gates)

- **`TeammateIdle`:** exit 2 keeps the teammate working, and `continue: false` stops it. It fires
  when the teammate's turn ends, not at plan time. [hooks#teammateidle][h-idle]
- **`PermissionRequest`:** runs when Claude Code is about to ask for permission.
  [hooks#permissionrequest][h-pr] The docs say plan approvals are granted "without a separate
  prompt", and they don't say whether this event fires for them.

## Verification needed

1. With agent teams on and the lead in plan mode, add a settings-level `PreToolUse` hook matching
   `ExitPlanMode` that logs its stdin. Does it fire for the teammate, and with what `agent_id`?
2. Repeat with `permissionDecision: "ask"`, then `"deny"`, then an `ask: ["ExitPlanMode"]` rule.
   Does the teammate wait, and does the human see a prompt?
3. Check whether the lead can assign a dependency-blocked task to a teammate explicitly.

[at-plan]: https://code.claude.com/docs/en/agent-teams#have-teammates-plan-before-implementing
[at-perm]: https://code.claude.com/docs/en/agent-teams#permissions
[at-defs]: https://code.claude.com/docs/en/agent-teams#use-subagent-definitions-for-teammates
[at-ctx]: https://code.claude.com/docs/en/agent-teams#context-and-communication
[at-arch]: https://code.claude.com/docs/en/agent-teams#architecture
[at-talk]: https://code.claude.com/docs/en/agent-teams#talk-to-teammates-directly
[at-tasks]: https://code.claude.com/docs/en/agent-teams#assign-and-claim-tasks
[at-limits]: https://code.claude.com/docs/en/agent-teams#limitations
[at-friction]: https://code.claude.com/docs/en/agent-teams#too-many-permission-prompts
[pm-plan]: https://code.claude.com/docs/en/permission-modes#analyze-before-you-edit-with-plan-mode
[pm-bypass]: https://code.claude.com/docs/en/permission-modes#skip-all-checks-with-bypasspermissions-mode
[pm-classifier]: https://code.claude.com/docs/en/permission-modes#eliminate-prompts-with-auto-mode
[h-epm]: https://code.claude.com/docs/en/hooks#exitplanmode
[h-ptu]: https://code.claude.com/docs/en/hooks#pretooluse-decision-control
[h-sub]: https://code.claude.com/docs/en/hooks#matcher-patterns
[h-tc]: https://code.claude.com/docs/en/hooks#taskcreated
[h-tdone]: https://code.claude.com/docs/en/hooks#taskcompleted
[h-idle]: https://code.claude.com/docs/en/hooks#teammateidle
[h-pr]: https://code.claude.com/docs/en/hooks#permissionrequest
[p-manage]: https://code.claude.com/docs/en/permissions#manage-permissions
[p-hooks]: https://code.claude.com/docs/en/permissions
[sa-resume]: https://code.claude.com/docs/en/sub-agents#resume-subagents
[tr-rules]: https://code.claude.com/docs/en/tools-reference
[tr-tools]: https://code.claude.com/docs/en/tools-reference
[tr-tasks]: https://code.claude.com/docs/en/tools-reference#task-tool-availability
