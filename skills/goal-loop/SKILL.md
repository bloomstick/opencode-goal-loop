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
  seams outside their scope. Workers: branch only, never push `main` (only
  the orchestrator pushes `main`, in §7 LAND).

## 1. When to use

- `/goal <task>` — user wants requirements-to-verified-code, hands-off.
- 2+ independent file-disjoint requirements — fan out to child agents.
- Single requirement — run it as one child agent, same protocol.
- Do NOT use for open-ended chat, or for same-file edits in parallel
  (split into disjoint touch sets or run sequentially).

## 2. Orchestrator loop (goal-orch, primary agent)

1. **Clarify / Resume.** If a manifest already exists for the goal
   (`.opencode/goal-loop/<slug>/reqs-manifest.md` - including the first
   message after a restart, where the user says "continue" or re-runs
   `/goal`), do NOT re-clarify: run the RESUME rule (see sec. 8) first
   and continue from the first non-done REQ. Only clarify a fresh goal
   with no manifest. Do not code yet. Propose atomic requirements
   (best guess, not open-ended questions). User confirms or picks
   `recommend` for all.
2. **Manifest.** Write `reqs-manifest.md` (see sec. 5) under
   `.opencode/goal-loop/<slug>/` (repo-local, per goal). This file, not
   chat memory, is the acceptance record and the resumable state for
   sec. 8 RESUME. Commit AND push the goal branch after every manifest
   mutation (see sec. 5 rules).
3. **DAG.** Map dependencies. No-dependency requirements may run parallel;
   dependent ones run in order. Same-file edits always sequential.
4. **Dispatch.** Fetch `origin` first; base every worker branch on the
   `origin/main` tip so stale bases cannot strand work. One worktree +
   branch per worker (see sec. 4). Branch-per-worker stays mandatory even though
   the solo flow uses no PRs (isolation + remote backup before merge).
   Write a six-part worker prompt file (see sec. 3) saved under
   `prompts/` (see sec. 5), record the run in the manifest, commit AND
   push the goal branch, then run it foreground and collect
   the report block.
5. **Integrate sequentially.** Merge one worker at a time onto
   local `main` with `git merge --no-ff` (see sec. 7 LAND; sec. 8 RESUME
   feeds recovered branches here), resolving conflicts,
   re-running the named green suite after each. Fix cross-worker seams
   yourself.
6. **Verify.** Full manifest acceptance: every requirement checked against
   its verification path (commands run + outputs, files checked). Frontend
   work adds an end-to-end pass with screenshots where available.
7. **Land (§7).** `push main`, then prove: `git ls-remote origin main` SHA
   equals local `main` AND every worker commit is contained in
   `origin/main` (`git branch -r --contains <sha>`; fail loudly
   otherwise — that is never DONE). Remove TEMP worktrees.
8. **Report.** Implementation report + what remains + next concrete step,
   with the §6 `Landed:` proof line. No `Landed:` proof, no DONE. Wait
   for the next task. Nothing keeps running after DONE.

## 3. Worker prompt file (six parts, in order)

Write to a saved prompt file under the goal dir (never $TEMP only),
e.g. `.opencode/goal-loop/<slug>/prompts/REQ-01.<code>.md`. The saved
file plus the recorded order text is the byte-identical re-fire source
for sec. 8 RESUME; record its path in the manifest Runs record (sec. 5)
before dispatch:

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

<prompt-file> is the saved file under
`.opencode/goal-loop/<slug>/prompts/` (see sec. 5), not a $TEMP copy;
<order> must match the manifest Runs record verbatim so a re-fire is
byte-identical.

In noveldream, ALWAYS dispatch through `tools/dispatch/` (it parents each
`opencode run` as a foreground process so the server never holds background
children): `Invoke-Dispatch.ps1` for one worker, `Invoke-Fanout.ps1` for
2+ parallel workers, one foreground `shell` call, `-DryRun` first when
changing the scripts. See the `delegate` skill for exact invocations.

To stop a worker there is no kill API: read its transcript, then abandon
its branch/worktree. The fan-out `-Timeout` cap stops hung jobs.

## 5. Manifest format (`reqs-manifest.md`)

The manifest is resumable state: everything needed to continue after a
restart lives in the manifest + git, not in chat memory. Workers never
edit the manifest directly; they report, the orchestrator records.

Per-REQ status is explicit: `pending` (never dispatched), `dispatched`
(branch in flight, Runs record below), `done` (pushed proof integrated).
Checkbox mirrors status: `- [ ]` for pending/dispatched, `- [x]` for done.

```markdown
# Goal: <one-line objective>
Base: <sha> | Date: <yyyy-mm-dd> | Slug: <slug> | Goal-branch: <goal-branch>
- [ ] REQ-01 <requirement> -- verify: <command/file check> -- status: pending
- [ ] REQ-02 <requirement> -- verify: <command/file check> -- status: dispatched
## DAG
- REQ-01: no deps
- REQ-02: after REQ-01
## Runs
### REQ-02
- dispatch: <date> branch <worker-branch> prompt `prompts/REQ-02.<code>.md` order "<order text>"
- pushed: <sha or none-yet> (<date>) | report-tail: <last report lines>
## Log
- <date> REQ-01 done by <branch> -- <proof>
```

Rules:

- Save every worker prompt file + order text under the goal dir
  (`.opencode/goal-loop/<slug>/prompts/`, e.g.
  `prompts/REQ-01.<code>.md` plus the order string in the Runs record)
  so a re-fire is byte-identical: never rely on $TEMP copies after a
  restart, they do not survive one.
- Orchestrator commits AND pushes the goal branch after every manifest
  mutation (status change, new Runs entry, pushed SHA, log line). Cheap
  insurance: disk + remote both survive a restart. The goal branch is
  the orchestrator's own branch, distinct from worker branches and from
  `main`; pushing it does not push `main` (only sec. 7 LAND pushes `main`).
- Invariant (no-redo): re-running any completed step is a bug. Presence
  of pushed proof moves a REQ forward, never backward. A REQ marked
  `done` is never re-fired; a `dispatched` REQ with pushed commits on
  origin is integrated, not redone (see sec. 8 RESUME).

## 6. Report

Per worker + integration: task-code, files, SLOC structural-vs-cheap
split, commands + outputs, `Caveats: none` or explicit list (unverified
areas, risks, follow-ups). Stdout MUST end with the §3 report block last.

After any resume (see sec. 8), the report opens with a resume summary
line (before the per-worker detail):

```
Resume: recovered <X> from pushed proof, re-fired <Y>, redone: <nothing | describe>
```

`redone: nothing` is the expected case; anything redone fails loudly
with what was repeated and why the no-redo invariant (see sec. 5) broke.
A resume summary alone is never DONE.

DONE block gains a `Landed:` line — `origin/main` SHA, local==remote
proof (`git rev-parse main` vs `git ls-remote origin main`), tag/release
state (pushed vs. pending owner). No `Landed:` proof, no DONE.

```
Landed: origin/main <sha> (local==remote: <sha>) | tags: <none pushed | pending owner>
```

## 7. LAND phase (solo flow: merge locally, push, prove — no PRs)

No PRs on the solo flow: there is no branch protection and no PR CI to
gate on, so PRs are pure roundtrips where finished work rots. The loop
closes itself in the same invocation. Branch-per-worker is still
mandatory (isolation + remote backup before merge).

1. Workers pushed their branches (worker protocol, §3 step 7). Fetch
   first so the merge base is the live tip:
   `git fetch origin`.
2. Merge each worker branch into local `main` with `git merge --no-ff`,
   ONE at a time. Re-run the named green suite after each merge; on
   conflict, resolve, re-verify the suite, then continue with the next
   branch. Never batch merges without a green run between them.
3. `git push origin main` (orchestrator only — workers never push
   `main`). Never push tags unless the goal explicitly says publish;
   releases stay pending owner by default.
4. Prove landing, loudly or not at all:
   - `git ls-remote origin main` SHA equals local `git rev-parse main`.
   - Every worker commit is contained in `origin/main`:
     `git branch -r --contains <worker-sha>` must list `origin/main`.
   - Fail loudly otherwise — an unproven push is never DONE.
5. Remove TEMP worktrees (`git worktree remove <path>`). Keep branches
   as remote backup until the report is accepted.
6. DONE, with the sec. 6 `Landed:` line in the report.

Sec. 8 RESUME feeds recovered branches into steps 1-2 above; the landing
proof is unchanged and still required for DONE.

## 8. RESUME phase (crash-safe continuation, attended only)

A server restart kills the orchestrator session but the work survives:
manifest + prompt files are committed and pushed on the goal branch, and
worker commits are pushed on worker branches. RESUME rebuilds session
state from disk + remote; it adds no schedules, services, watchers,
polling loops, idle hooks, retries, or background work. It runs only on
a human goal turn ("continue" or a re-run of `/goal`) when a manifest
exists. One invocation still ends at DONE or at the next human turn;
nothing keeps running after that (see sec. 0 hard rules).

On ANY goal turn with an existing manifest, the orchestrator MUST,
before any new dispatch:

1. Read `.opencode/goal-loop/<slug>/reqs-manifest.md` (this file, not
   chat memory, is the truth). Run `git fetch origin` so reconciliation
   sees the live remote.
2. Reconcile each non-done REQ against git:
   - Branch with pushed commits on origin (branch exists AND its tip or
     recorded SHA is visible on origin): treat it as survived work.
     Verify the branch state (report tail + branch diff), then integrate
     it per sec. 7 LAND steps 1-2 (merge ONE at a time, green suite
     after each). Mark the REQ `done` only after its merge + green run;
     commit AND push the goal branch on each mark.
   - Branch absent, or present with no pushed commits: re-fire the saved
     prompt file verbatim (`prompts/REQ-0<code>.md` + the recorded order
     text, byte-identical, no edits). Record the new run in Runs, commit
     AND push the goal branch, then dispatch foreground per sec. 4.
3. Continue the loop from the first non-done REQ (sec. 2 steps 4-8):
   dispatch what has no branch, integrate what survived, verify, land.
4. Report a resume summary first (see sec. 6): recovered X from pushed
   proof, re-fired Y, redone: nothing. If anything completed was
   re-executed, fail loudly: name the REQ, what was repeated, and why.
   Redo of a `done` REQ is a bug per the sec. 5 no-redo invariant:
   presence of pushed proof moves a REQ forward, never backward.

Resume flows into LAND normally: DONE still requires the sec. 6
`Landed:` proof (local `main` == `origin/main` plus every worker commit
contained in `origin/main`). A resume summary alone is never DONE.
