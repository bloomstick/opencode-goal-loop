---
name: goal-loop
description: Fully automated coding loop for OpenCode without plugins. Use when asked to run /goal, drive requirements-to-verified-code with child agents via foreground opencode run, or replace crash-prone goal plugins on free-tier models with no subagent access.
---

# goal-loop — automated coding loop with child agents, no plugins

Markdown-only replacement for `opencode-goal-plugin` variants. There is no
TypeScript, no hooks, no server code — so there is nothing to crash the
OpenCode service. History: the service log shows `opencode-goal-plugin@0.11.0`
(`william-ricchiuti/OpenCode-goal-plugin#81`, silent service death) loaded on
2026-10-10; no trace of the `prevalentWare` variant ever installed.
Separately, server-held background `opencode run` children restarted the
server 3 times on 2026-10-12. This skill avoids all three: no hooks, no
background children, plain-manifest state only.

Free-tier constraint: the `task` tool (subagents) is unavailable. All child
work runs as foreground `opencode run` processes, never as subagents.

## 0. Hard rules (no exceptions)

- NEVER use the `subagent` task tool. It is unavailable on free tier and
  forbidden here. Deny it in agent frontmatter (`permission: task: deny`).
- NEVER run `opencode run` in background (`shell` `background: true`,
  `Start-Job` holding it server-side, `&`, `nohup`). Foreground only.
- NEVER add schedules, services, watchers, polling loops, idle hooks, or
  background persistence. Attended loop only: one `/goal` invocation runs
  to DONE, then stops. No timers survive the session.
- NEVER write plugin state with locks/leases/claims (the old
  `.opencode/goals/state.json.lock*` system). Goal state is one plain
  `reqs-manifest.md` per goal, written atomically by the orchestrator.
- Orchestrator never does worker work when delegating. Workers never touch
  seams outside their scope. Branch only, never push `main`.

## 1. When to use

- `/goal <task>` — user wants requirements-to-verified-code, hands-off.
- 2+ independent file-disjoint requirements — fan out to child agents.
- Single requirement — run it as one child agent, same protocol.
- Do NOT use for open-ended chat, or for same-file edits in parallel
  (split into disjoint touch sets or run sequentially).

## 2. Orchestrator loop (goal-orch, primary agent)

1. **Clarify.** Do not code yet. Propose atomic requirements (best guess,
   not open-ended questions). User confirms or picks `recommend` for all.
2. **Manifest.** Write `reqs-manifest.md` (see §5) under
   `.opencode/goal-loop/<slug>/` (repo-local, per goal). This file — not
   chat memory — is the acceptance record.
3. **DAG.** Map dependencies. No-dependency requirements may run parallel;
   dependent ones run in order. Same-file edits always sequential.
4. **Dispatch.** One worktree + branch per worker (§4). Write a six-part
   worker prompt file (§3), run it foreground, collect the report block.
5. **Integrate sequentially.** Merge/cherry-pick one worker at a time onto
   the integration branch, resolving conflicts, re-running the named green
   suite after each. Fix cross-worker seams yourself.
6. **Verify.** Full manifest acceptance: every requirement checked against
   its verification path (commands run + outputs, files checked). Frontend
   work adds an end-to-end pass with screenshots where available.
7. **Report.** Implementation report + what remains + next concrete step.
   Wait for the next task. Nothing keeps running after DONE.

## 3. Worker prompt file (six parts, in order)

Write to a temp prompt file (e.g. `$TEMP/prompt-<code>.md`):

1. **Preamble:** base SHA + `git log --oneline -3` verify, docs to read
   first (ordered), skill to load (`goal-loop`).
2. **Context:** what exists, why this task, what is out of scope (name the
   other workers/requirements).
3. **Scope:** allowed files ONLY (new file or explicit list) + numbered
   requirements + verification path per requirement.
4. **Forbidden:** branch-only, no main push, no other files, no new deps,
   no schedules/services/watchers/polling, no other repos, no `task`
   tool (ask the orchestrator via the report instead). Runs FOREGROUND:
   never background itself, stop every child process at ship.
5. **Heartbeat:** progress line per subtask boundary in session output
   (silence past the timeout = killed run, branch/worktree kept).
6. **Acceptance:** owning worktree dir, static check clean
   (`flutter analyze` / `tsc` / `bun run typecheck` per repo), named green
   suite with exact commands, SLOC delta report.
7. **Landing + report shape**, exact order, last in stdout:
   ```
   <CODE> — <title>
   Added: <files>
   SLOC: <+/-> 
   Tests/proofs: <commands + outputs>
   Caveats: <none or list>
   ```
   Commit on worker branch, push branch ONLY, stop every child process.

Keep prompts precise — workers get no other context.

## 4. Dispatch (foreground only)

Generic (any repo), one foreground call per worker batch, large timeout:

```powershell
opencode run --auto --agent goal-worker -f <prompt-file> "<order>"
```

In noveldream, ALWAYS dispatch through `tools/dispatch/` (it parents each
`opencode run` as a foreground process so the server never holds background
children): `Invoke-Dispatch.ps1` for one worker, `Invoke-Fanout.ps1` for
2+ parallel workers, one foreground `shell` call, `-DryRun` first when
changing the scripts. See the `delegate` skill for exact invocations.

To stop a worker there is no kill API: read its transcript, then abandon
its branch/worktree. The fan-out `-Timeout` cap stops hung jobs.

## 5. Manifest format (`reqs-manifest.md`)

```markdown
# Goal: <one-line objective>
Base: <sha> | Date: <yyyy-mm-dd>
- [ ] REQ-01 <requirement> — verify: <command/file check>
- [ ] REQ-02 <requirement> — verify: <command/file check>
## DAG
- REQ-01: no deps
- REQ-02: after REQ-01
## Log
- <date> REQ-01 done by <branch> — <proof>
```

Orchestrator updates status + log per completed requirement. Workers never
edit the manifest directly; they report, the orchestrator records.

## 6. Report

Per worker + integration: task-code, files, SLOC structural-vs-cheap
split, commands + outputs, `Caveats: none` or explicit list (unverified
areas, risks, follow-ups). Stdout MUST end with the §3 report block last.
