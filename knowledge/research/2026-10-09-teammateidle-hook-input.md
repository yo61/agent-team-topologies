# What TeammateIdle and task hooks can read

Research for [#30](https://github.com/yo61/agent-team-topologies/issues/30), under map
[#24](https://github.com/yo61/agent-team-topologies/issues/24). Docs fetched 2026-10-09.
Local CLI: Claude Code 2.1.286.

## Question

`.claude/hooks/idle-summary.sh` expects the teammate's last message on stdin. Can a
`TeammateIdle` hook reliably get that message, for example from `transcript_path`? What is
the transcript format, is it documented, and is it stable? What do `TaskCompleted` and
`TaskCreated` hooks see?

## Answer

- **No hook input carries the teammate's last message.** `TeammateIdle` stdin is the common
  fields plus `teammate_name`, `team_name` (deprecated) and, from v2.1.290, `agent_id`. Only
  `Stop`, `SubagentStop` and `StopFailure` get `last_assistant_message`.
- **`transcript_path` is not a reliable source.** The docs say the file is written
  asynchronously and may not yet hold the current turn's last messages when a hook fires.
  Its line schema is undocumented.
- **The teammate's own transcript can be found, but only through internal conventions.**
  Treat it as best effort, not a gate.
- **`idle-summary.sh` as written blocks every idle.** It reads the whole stdin JSON as the
  "message", finds no `## Findings` header in it, and exits 2.

## What each hook receives on stdin

All three get the [common input fields][common]: `session_id`, `prompt_id`, `transcript_path`,
`cwd`, `scratchpad_dir`, `permission_mode` (not on every event), `hook_event_name`, plus
`agent_id`/`agent_type` when the hook fires inside a subagent. None of the three supports a
matcher. Each one fires every time ([matcher table][matchers]).

| Event | Event-specific fields | Fires when |
| :- | :- | :- |
| [`TeammateIdle`][idle] | `teammate_name`, `team_name` (deprecated), `agent_id` (in-process teammate, may be absent, v2.1.290+) | A teammate is about to go idle after its turn |
| [`TaskCompleted`][completed] | `task_id`, `task_subject`, optional `task_description`, `teammate_name`, `team_name` (deprecated), `agent_id` (v2.1.290+) | `TaskUpdate` marks a task completed, **or** a teammate ends its turn with tasks still in progress |
| [`TaskCreated`][created] | `task_id`, `task_subject`, optional `task_description`, `teammate_name`, `team_name` (deprecated), `agent_id` (v2.1.290+) | `TaskCreate` runs. It doesn't fire in a session without the Task tools |

Neither task event carries message text either. All a task hook gets is the task's subject
and description.

Decision control, from the same sections:

- `TeammateIdle`: exit 2 sends stderr to the teammate as feedback and keeps it working.
  `{"continue": false, "stopReason": ...}` stops it.
- `TaskCompleted`: exit 2 leaves the task open and sends stderr back. `continue: false` stops
  the teammate only when the teammate's turn ending triggered the event, and is ignored when
  `TaskUpdate` triggered it.
- `TaskCreated`: exit 2, or `{"decision": "block", "reason": ...}`, deletes the task and
  returns the message as the tool error. `continue: false` is ignored.
- Exit-2 feedback goes on **stderr**. The repo's README and scripts use stdout.

## Why `transcript_path` doesn't work

1. **Whose transcript.** The `TeammateIdle` example shows a session-level
   `.../.claude/projects/.../<session-uuid>.jsonl` path ([TeammateIdle input][idle]). The docs
   don't say whether it is the lead's transcript or the teammate's. `SubagentStop` says outright
   that `transcript_path` is the main session's and adds a separate `agent_transcript_path`
   ([SubagentStop input][substop]). `TeammateIdle` has no such field.
2. **Timing.** "The transcript file is written asynchronously and may lag the in-memory
   conversation, so it may not yet include the current turn's most recent messages when a hook
   fires." ([common input fields][common]). The Stop section adds that "the transcript file
   isn't guaranteed to include the final message at Stop time on all versions" ([Stop
   input][stop]). `TeammateIdle` fires right after the teammate's turn ends, so the race is
   built in.
3. **Format.** The docs give the location, `projects/<project>/<session>.jsonl` ("every
   message, tool call, and tool result") and `projects/<project>/<session>/subagents/`, but not
   the schema ([application data][appdata]). They point hooks to `last_assistant_message`
   instead of parsing the file ([common input fields][common], [Stop input][stop]).

## Transcript shape (undocumented, observed locally)

**This section describes internal, undocumented structure, seen on Claude Code 2.1.286.** It
records field names and structure only. Nothing here is a contract, and any of it can change
in any release.

- JSONL, one object per line. Each line has a top-level `type`: `user`, `assistant`,
  `attachment`, `system`, plus bookkeeping types such as `mode`, `permission-mode`,
  `last-prompt`, `file-history-snapshot` and `ai-title`.
- Most lines also carry `uuid`, `parentUuid`, `sessionId`, `timestamp`, `isSidechain`, `cwd`,
  `gitBranch` and `version`.
- `assistant` lines hold an API-style `message` (`id`, `role`, `model`, `content`,
  `stop_reason`, `usage`, ...). **Each line holds one content block.** A single assistant
  message (one `message.id`) is spread over several lines: `thinking`, then `text` or
  `tool_use`, each with an `apiBlockIndex`. In one sample session, 67 of 86 assistant message
  ids spanned 2 to 6 lines. To rebuild the final text, a reader has to group by `message.id`
  and keep only the `text` blocks.
- Subagent and teammate transcripts live in `<session>/subagents/agent-<agentId>.jsonl`. Each
  line carries `agentId` and `isSidechain: true`, next to an `agent-<agentId>.meta.json`
  holding `agentType`, `description`, `spawnDepth` and so on. Meta files for named agents,
  meaning teammates, also hold a `name` key. A teammate's transcript observed this way ended
  with a `thinking` line followed by a `text` line.
- Split-pane teammates run as separate processes. Where their transcripts land, and whether
  `transcript_path` points at them, was not established.

## Getting the last message anyway (best effort)

On v2.1.290 or later, for an in-process teammate:

1. Read `agent_id` and `transcript_path` from stdin.
2. Open `"${transcript_path%.jsonl}/subagents/agent-${agent_id}.jsonl"`. That path is an
   internal convention, the same folder `SubagentStop`'s `agent_transcript_path` uses.
3. Take the last `assistant` line's `message.id`, then concatenate the `text` blocks of every
   line with that id.
4. If the file or the text is missing, perhaps because the write hasn't landed yet, **allow
   the idle (exit 0)**. Don't block. Otherwise a lagging write traps the teammate in a loop.

On versions before 2.1.290, `agent_id` is absent. The fallback is to match `teammate_name`
against `name` in the `*.meta.json` files, which is internal again.

## Documented alternatives that need no parsing

- **Prompt or agent hook.** `TeammateIdle`, `TaskCompleted` and `TaskCreated` support
  `type: "prompt"` and `type: "agent"` ([prompt-based hooks][prompt]). An agent hook gets the
  same JSON through `$ARGUMENTS` and has tool access, so it can read files. It still has no
  message text, and `ok: false` stops the teammate unless `continueOnBlock: true` is set.
- **Gate on artifacts, not prose.** The documented `TeammateIdle` example checks that an
  output file exists ([TeammateIdle decision control][idle-dc]). Have teammates write their
  summary (Findings / Blockers / Next Steps) to a known file, such as
  `$CLAUDE_PROJECT_DIR/.team/<teammate_name>.md`, and check that file. The paths are stable
  because the hook names the teammate.
- **The lead already gets the final answer.** "When a teammate finishes and stops, it
  automatically notifies the lead and includes its final answer in the notification" ([how
  teammates share information][share]). If the goal is for the lead to see a summary, a
  prompt instruction is enough and no hook is needed.
- **`SubagentStop` has `last_assistant_message`, but don't rely on it here.** `SubagentStart`
  fires "each time an in-process agent team teammate handles a new message" ([SubagentStart][substart]).
  The docs don't say whether `SubagentStop` fires for teammates, and this was not verified.

## Stability caveats

- Agent teams are experimental and off by default ([agent teams][teams]).
- `team_name` is deprecated on all three events, "will be removed in a future release".
- `agent_id` on these events needs v2.1.290 (changelog, 2026-10-05). That release also stopped
  `TeammateIdle` firing from a teammate's own subagents and forks ([changelog][changelog]).
- The transcript schema is undocumented, and the observed one-block-per-line layout is an
  implementation detail.

## Not verified by running

The plan was to run an interactive session with `CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS=1` and
logging hooks on `TeammateIdle`, `TaskCompleted`, `TaskCreated`, `SubagentStart`,
`SubagentStop` and `Stop`. It would have captured real stdin and checked whether the
teammate's final text was on disk when `TeammateIdle` fired. Teammates aren't spawned in `-p`
sessions, so the run needs a driven TUI, and the auto-mode permission classifier refused it.
These points are still open and need a manual run:

- Whose transcript `transcript_path` is on `TeammateIdle` (lead's or teammate's).
- Whether the teammate's final `text` line is already written when `TeammateIdle` fires.
- Whether `SubagentStop`, with `last_assistant_message`, fires at the end of an in-process
  teammate's turn.
- How split-pane teammates differ on all of the above.

## Sources

- [Hooks reference: common input fields][common]
- [Hooks reference: TeammateIdle][idle], [TaskCompleted][completed], [TaskCreated][created]
- [Hooks reference: Stop][stop], [SubagentStart][substart], [SubagentStop][substop],
  [prompt-based hooks][prompt]
- [Agent teams: quality gates and how teammates share information][teams]
- [`.claude` directory: application data][appdata]
- [Changelog][changelog]: 2.1.290 (`agent_id`), `TeammateIdle`/`TaskCompleted` added,
  `continue: false` support, `TaskCreated` added

[common]: https://code.claude.com/docs/en/hooks#common-input-fields
[matchers]: https://code.claude.com/docs/en/hooks#matcher-patterns
[idle]: https://code.claude.com/docs/en/hooks#teammateidle
[idle-dc]: https://code.claude.com/docs/en/hooks#teammateidle-decision-control
[completed]: https://code.claude.com/docs/en/hooks#taskcompleted
[created]: https://code.claude.com/docs/en/hooks#taskcreated
[stop]: https://code.claude.com/docs/en/hooks#stop-input
[substart]: https://code.claude.com/docs/en/hooks#subagentstart
[substop]: https://code.claude.com/docs/en/hooks#subagentstop-input
[prompt]: https://code.claude.com/docs/en/hooks#prompt-based-hooks
[teams]: https://code.claude.com/docs/en/agent-teams#enforce-quality-gates-with-hooks
[share]: https://code.claude.com/docs/en/agent-teams#context-and-communication
[appdata]: https://code.claude.com/docs/en/claude-directory#application-data
[changelog]: https://code.claude.com/docs/en/changelog
