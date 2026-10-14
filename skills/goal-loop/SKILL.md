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

Termination guarantee: every `/goal` invocation ends in the same
invocation as DONE (all REQs `done` + sec. 7 proof) or explicit
`blocked` (sec. 6 blocked report). No silent stop, no infinite loop:
at most 1 initial run + 3 re-fires = 4 runs per REQ (WORK failures
only), plus at most 3 transient retries per run that consume ZERO
re-fire budget (sec. 2 step 5 TRANSIENT vs WORK, `retries: <n>/3`
alongside `re-fires: <n>/3`). A run that exhausts its transient
retries marks its REQ `blocked-transient` + wrap-up (sec. 6, still
with the `Landed:` line). The three terminal paths are: (a) all-done,
(b) blocked-on-budget, (c) restart-mid-loop via sec. 8 RESUME (state
survives on the goal branch + worker branches, loop continues to DONE
or blocked on the next human turn; nothing runs unattended).

1. **Clarify / Resume.** If a manifest already exists for the goal
   (`.opencode/goal-loop/<slug>/reqs-manifest.md` - including the first
   message after a restart, where the user says "continue" or re-runs
   `/goal`), do NOT re-clarify: run the RESUME rule (see sec. 8) first
   and continue from the first non-done, non-blocked REQ (either
   `blocked` or `blocked-transient` counts as blocked). Only clarify a fresh goal
   with no manifest. Do not code yet. Propose atomic requirements
   (best guess, not open-ended questions). User confirms or picks
   `recommend` for all. Standing orders: immediately after
   clarify/resume, read standing orders (global config copy deployed
   by `Install-GoalLoop.ps1`, falling back to the repo
   `standing-orders.md` template) and never gate on a listed power
   again; anything outside the list still asks.
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
   Write an eight-part worker prompt file (see sec. 3) saved under
   `prompts/` (see sec. 5), record the run in the manifest, commit AND
   push the goal branch, then run it foreground and collect
   the report block.
5. **Verify-after-every-run (bounded driver).** After EVERY foreground
   run, before any integrate, classify the outcome first:
   - TRANSIENT failure means the dispatch itself died before a
     verifiable report was possible: rate limit, connection reset
     (ECONNRESET), service 5xx/timeout aborting a dispatch mid-flight,
     or a server-restart signature. No acceptance verdict exists.
   - WORK failure means a completed run failed any of three checks:
     (a) report block present as the last stdout block in the exact
     sec. 3 order; (b) worker branch pushed to origin (tip visible via
     `git ls-remote origin <worker-branch>`); (c) every numbered
     acceptance item met with proof (commands + outputs, files checked).
   A TRANSIENT failure triggers bounded backoff INSIDE the turn: print
   one progress line per wait (so the turn never looks dead), wait, then
   re-dispatch the identical run (same saved prompt file + same recorded
   order text verbatim, counts as the SAME attempt, consumes ZERO
   re-fire budget). Max 3 transient retries per run with growing waits
   (2 min, then 5 min, then 10 min); waits are fixed sleeps announced up
   front, never condition polling, never schedules, never unbounded.
   Record each as a `retry<N>:` line with `retries: <n>/3` in the Runs
   record (sec. 5), commit AND push the goal branch per wait cycle. When
   all 3 transient retries are exhausted, NEVER wait a 4th time: mark
   the REQ `blocked-transient` with the evidence (which transient
   signature + last outputs), commit AND push the goal branch, stop
   dispatching that REQ, and go to wrap-up (verify + land whatever
   passed per sec. 7, report per sec. 6, still with the `Landed:` line).
   A server restart can still kill the turn itself mid-backoff: that
   path stays covered ONLY by sec. 8 RESUME (state is on the goal branch
   + worker branches), never by new autonomy.
   On a WORK failure (completed run, any check failing), re-fire the SAME saved prompt file + the SAME
   recorded order text verbatim (byte-identical, no edits), foreground
   per sec. 4. Budget: max 3 re-fires per REQ (1 initial run + up to 3
   re-fires = at most 4 runs per REQ), counted in the manifest Runs
   record as `re-fires: <n>/3` alongside `retries: <n>/3` (sec. 5, separate
   counters, never interchangeable). Each re-fire appends a
   `re-fire<N>:` line, commits AND pushes the goal branch, then
   dispatches. When the budget is exhausted (3 re-fires used and the
   run still fails), NEVER fire a 4th time: mark the REQ `blocked`
   with the evidence (which check failed + last outputs), commit AND
   push the goal branch, stop dispatching that REQ, and go to wrap-up
   (verify + land whatever passed per sec. 7, report `blocked` per
   sec. 6). Re-fire is per-REQ pre-integration only: it never re-fires
   a `done` REQ and never bypasses the sec. 7 LAND proof.
6. **Integrate sequentially.** Merge one worker at a time onto
   local `main` with `git merge --no-ff` (see sec. 7 LAND; sec. 8 RESUME
   feeds recovered branches here), resolving conflicts,
   re-running the named green suite after each. Fix cross-worker seams
   yourself. Only integrate runs that passed step 5; `blocked` and
   `blocked-transient` REQs are skipped (their landed siblings still land).
7. **Verify.** Full manifest acceptance: every requirement checked against
   its verification path (commands run + outputs, files checked). Frontend
   work adds an end-to-end pass with screenshots where available.
8. **Land (sec. 7).** `push main`, then prove: `git ls-remote origin main` SHA
   equals local `main` AND every worker commit is contained in
   `origin/main` (`git branch -r --contains <sha>`; fail loudly
   otherwise - that is never DONE). Remove TEMP worktrees. A
   blocked loop (either `blocked` or `blocked-transient`) still lands
   whatever passed and proves it the same way.
9. **Report.** Implementation report + what remains + next concrete step,
   with the sec. 6 `Landed:` proof line. DONE uses the DONE shape;
   a budget-exhausted loop uses the sec. 6 `blocked` shape
   (`blocked-transient` for transient exhaustion; symmetric,
   still carrying the `Landed:` line for whatever did land). No
   `Landed:` proof, no DONE, no `blocked`, and no `blocked-transient`. Wait
   for the next task. Nothing keeps running after DONE, `blocked`, or
   `blocked-transient`.

## 3. Worker prompt file (eight parts, in order)

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
8. **Never-yield:** never claim DONE, `blocked`, or any report before
   EVERY numbered acceptance item is met with proof (command output
   or file check per item, quoted in the report). A turn that
   produces no progress is not completion: keep working, or state
   the concrete blocker (which item, what was tried, last output).
   The sec. 3 report block goes last in stdout or the run counts as
   failed and will be re-fired per sec. 2 step 5 (max 3 re-fires per
   REQ, then the orchestrator marks the REQ `blocked`).

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
(branch in flight, Runs record below), `done` (pushed proof integrated),
`blocked` (WORK re-fire budget exhausted, evidence recorded, wrap-up done),
`blocked-transient` (transient retries exhausted, evidence recorded,
wrap-up done). Checkbox mirrors status: `- [ ]` for
pending/dispatched/blocked/blocked-transient,
`- [x]` for done only. A `blocked` or `blocked-transient` REQ is never
marked done.

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
- dispatch: <date> branch <worker-branch> prompt `prompts/REQ-02.<code>.md` order "<order text>" re-fires: <n>/3 retries: <m>/3
- run1: <date> pushed: <sha or FAIL> | report: <ok or FAIL-missing> | acceptance: <ok or FAIL-which-item>
- retry1: <date> transient: <rate-limit | conn-reset | 5xx-timeout | restart-signature> waited: <2min> | retries: 1/3
- re-fire1: <date> result: <ok or FAIL-which-check> | re-fires: 1/3 | retries: <m>/3
- re-fire2: <date> result: <ok or FAIL-which-check> | re-fires: 2/3 | retries: <m>/3
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
  origin is integrated, not redone (see sec. 8 RESUME). A REQ marked
  `blocked` or `blocked-transient` is never re-fired unless the user
  explicitly re-opens it
  (re-open resets `blocked`/`blocked-transient` to `dispatched` with a new
  Runs entry and fresh budgets -- 3 re-fires plus 3 transient retries,
  recorded as `re-open: <date> reason`).
- Budget accounting: every sec. 2 step 5 verify + re-fire + transient
  retry updates the Runs record (`run<N>` / `re-fire<N>` / `retry<N>`
  lines + `re-fires: <n>/3` alongside `retries: <m>/3`), then commits AND
  pushes the goal branch. The two counters are separate and never
  interchangeable: transient retries consume ZERO re-fire budget and a
  re-fire never resets the retry count. Caps are numeric and fixed:
  3 re-fires per REQ and 3 transient retries per run in sec. 2, sec. 5,
  and sec. 6 alike. A 4th fire or a 4th wait is never allowed; WORK
  budget exhausted means `blocked` + wrap-up, transient retries
  exhausted means `blocked-transient` + wrap-up (both still land
  whatever passed and report per sec. 6 with the `Landed:` line).

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

A budget-exhausted loop never ends silent: it reports `blocked` (or
`blocked-transient` when transient retries exhausted) with a
shape symmetric to DONE, still carrying the `Landed:` line for whatever
did land (caps stay 3 re-fires per REQ and 3 transient retries per run,
same as sec. 2 and sec. 5; both counters visible in the report, never
interchangeable). Stdout MUST end with this block last:

```
<CODE> -- <title> (blocked)
Added: <files that did land>
SLOC: <+/-> 
Tests/proofs: <commands + outputs + driver evidence: runs used <k>/4, re-fires <n>/3, retries <m>/3, last failure>
Blocked: <REQ-xx> <reason: missing-report | branch-unpushed | acceptance-unmet | transient-exhausted> -- <evidence + last output>
Landed: origin/main <sha> (local==remote: <sha>) | tags: <none pushed | pending owner>
Caveats: <blocker + concrete step to re-open>
```

`transient-exhausted` means the REQ status is `blocked-transient` (all 3
transient retries used, evidence recorded); every other reason means
`blocked` (WORK re-fire budget exhausted). Re-opening either resets both
budgets per sec. 5.

## 7. LAND phase (solo flow: merge locally, push, prove — no PRs)

No PRs on the solo flow: there is no branch protection and no PR CI to
gate on, so PRs are pure roundtrips where finished work rots. The loop
closes itself in the same invocation. Branch-per-worker is still
mandatory (isolation + remote backup before merge).

1. Workers pushed their branches (worker protocol, sec. 3 steps 7-8). Fetch
   first so the merge base is the live tip:
   `git fetch origin`.
2. Merge each worker branch into local `main` with `git merge --no-ff`,
   ONE at a time. Re-run the named green suite after each merge; on
   conflict, resolve, re-verify the suite, then continue with the next
   branch. Never batch merges without a green run between them.
3. `git push origin main` (orchestrator only — workers never push
   `main`). Never push tags unless the goal explicitly says publish;
   releases stay pending owner by default. Tag pushes and release PRs
   proceed without gating only when listed in standing orders (sec. 2
   step 1); anything unlisted still asks.
4. Prove landing, loudly or not at all:
   - `git ls-remote origin main` SHA equals local `git rev-parse main`.
   - Every worker commit is contained in `origin/main`:
     `git branch -r --contains <worker-sha>` must list `origin/main`.
   - Fail loudly otherwise — an unproven push is never DONE.
5. Remove TEMP worktrees (`git worktree remove <path>`). Keep branches
   as remote backup until the report is accepted. Deleting a merged
   remote worker branch after the LAND proof is pre-authorized only when
   listed in standing orders; otherwise keep it and ask. The merge +
   push with proof above likewise proceeds without gating only when
   listed; anything unlisted still asks.
6. DONE, with the sec. 6 `Landed:` line in the report. A
   budget-exhausted loop lands whatever passed the sec. 2 step 5
   checks the same way and reports `blocked` or `blocked-transient`
   per sec. 6 (still with
   the `Landed:` proof for what did land).

Sec. 8 RESUME feeds recovered branches into steps 1-2 above; the landing
proof is unchanged and still required for DONE, for `blocked`, and for
`blocked-transient`.

## 8. RESUME phase (crash-safe continuation, attended only)

A server restart kills the orchestrator session but the work survives:
manifest + prompt files are committed and pushed on the goal branch, and
worker commits are pushed on worker branches. RESUME rebuilds session
state from disk + remote; it adds no schedules, services, watchers,
polling loops, idle hooks, unattended retries, or background work.
In-turn transient retries stay per sec. 2 step 5 only; a restart that
kills a turn mid-backoff resumes here, and only here, from the pushed
Runs record (`retries: <m>/3` carries over like `re-fires: <n>/3`).
It runs only on
a human goal turn ("continue" or a re-run of `/goal`) when a manifest
exists. One invocation still ends at DONE, `blocked`, or
`blocked-transient`, or at the next
human turn after a resume that still has work in flight;
nothing keeps running after that (see sec. 0 hard rules).

On ANY goal turn with an existing manifest, the orchestrator MUST,
before any new dispatch:

1. Read `.opencode/goal-loop/<slug>/reqs-manifest.md` (this file, not
   chat memory, is the truth). Run `git fetch origin` so reconciliation
   sees the live remote.
2. Reconcile each non-done REQ against git (a `done` REQ is never
   re-fired; a `blocked` or `blocked-transient` REQ resumes as-is unless
   the user explicitly re-opens it per sec. 5, never silently re-fired):
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
     The sec. 2 step 5 budgets carry over: keep counting the recorded
     `re-fires: <n>/3` and `retries: <m>/3`, max 3 re-fires per REQ and
     max 3 transient retries per run, never a 4th fire and never a 4th wait.
3. Continue the loop from the first non-done, non-blocked REQ (either
   `blocked` or `blocked-transient` counts as blocked)
   (sec. 2 steps 4-9): dispatch what has no branch, integrate what
   survived, verify-after-every-run per sec. 2 step 5, verify, land.
4. Report a resume summary first (see sec. 6): recovered X from pushed
   proof, re-fired Y, redone: nothing. If anything completed was
   re-executed, fail loudly: name the REQ, what was repeated, and why.
   Redo of a `done` REQ is a bug per the sec. 5 no-redo invariant:
   presence of pushed proof moves a REQ forward, never backward.

Resume flows into LAND normally: DONE still requires the sec. 6
`Landed:` proof (local `main` == `origin/main` plus every worker commit
contained in `origin/main`). A resume summary alone is never DONE.
A loop with a `blocked` or `blocked-transient` REQ still lands whatever
passed and reports
`blocked` per sec. 6 (symmetric to DONE, still with the `Landed:`
line). The driver re-fire and the transient retry (sec. 2 step 5) are
per-REQ pre-integration
inside one invocation; RESUME never re-fires `done` and never silently
re-opens `blocked` or `blocked-transient`. RESUME is the only restart
path: it never adds autonomy beyond sec. 2 step 5.
