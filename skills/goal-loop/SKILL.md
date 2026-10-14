---
name: goal-loop
description: Fully automated coding loop for OpenCode without plugins. Use when asked to run /goal, drive requirements-to-verified-code with child agents via foreground opencode run, or replace crash-prone goal plugins on free-tier models with no subagent access.
---

# goal-loop - automated coding loop with child agents, no plugins

Markdown-only replacement for crash-prone goal plugins: no TypeScript,
no hooks, no server code, no background children, plain-manifest state
only. Incident history and rationale live in the trailing Appendix
(non-normative); the core below reads end-to-end without it.

Free-tier constraint: the `task` tool (subagents) is unavailable. All child
work runs as foreground `opencode run` processes, never as subagents.

## 0. Hard rules (one bounded exception: GOALAUTO)

- NEVER use the `subagent` task tool. It is unavailable on free tier and
  forbidden here. Deny it in agent frontmatter (`permission: task: deny`).
- NEVER run `opencode run` in background (`shell` `background: true`,
  `Start-Job` holding it server-side, `&`, `nohup`). Foreground only.
- NEVER add schedules, services, watchers, polling loops, idle hooks, or
  background persistence, except the GOALAUTO external supervisor below.
  Attended loop only: one `/goal` invocation runs
  to DONE, then stops. No timers survive the session except a
  time-boxed armed supervisor (see exception).
- NEVER write plugin state with locks/leases/claims (the old
  `.opencode/goals/state.json.lock*` system). Goal state is one plain
  `reqs-manifest.md` per goal, written atomically by the orchestrator.
- Orchestrator never does worker work when delegating, except the
  tiny-task fast path (sec. 2 step 4: inline ONLY when all tiny caps
  hold, same acceptance bar, escalate to a worker the moment they
  break). Workers never touch
  seams outside their scope. Workers: branch only, never push `main` (only
  the orchestrator pushes `main`, in §7 LAND).

GOALAUTO exception (user order 2026-10-14, the ONLY sec. 0 exception,
arming made MANDATORY by user order 2026-10-15):
after the manifest is written + pushed, or at a wrap-up that leaves
actionable non-blocked non-awaiting REQs in flight, the orchestrator
MUST register + enable the EXTERNAL supervisor only (Windows Scheduled Task
outside the OpenCode server, per
docs/crash-log-harness.md sec. 6, via
Register-GoalSupervisor.ps1 (global copy `~/.config/opencode/goal-supervisor/`, else repo `scripts/goal-supervisor/`)
with `-Enable` and
a stated time box), and MUST unregister it at any terminal wrap-up
(DONE / `blocked` / `blocked-transient`). If arming fails, record the
failure in Runs/Log + report and continue the goal anyway (arming is
insurance, never a gate). The user saying "no supervisor" opts out.
Every other sec. 0 ban
stands: no subagents, no server-held background, no
schedules-as-monitoring, no polling, no unbounded waits.

## 1. When to use

- `/goal <task>` — user wants requirements-to-verified-code, hands-off.
- 2+ independent file-disjoint requirements — fan out to child agents.
- Single requirement — run it as one child agent, same protocol.
- Do NOT use for open-ended chat, or for same-file edits in parallel
  (split into disjoint touch sets or run sequentially).

## 2. Orchestrator loop (goal-orch, primary agent)

Termination guarantee: every `/goal` invocation ends in the same
invocation as DONE (all REQs `done` + sec. 7 proof), explicit
`blocked` (sec. 6 blocked report), or parked on `awaiting-input`
(sec. 5: report names the REQ + pending question, then stop).
No silent stop, no infinite loop:
at most 1 initial run + 3 re-fires = 4 runs per REQ (WORK failures
only), plus at most 3 transient retries per run that consume ZERO
re-fire budget (sec. 2 step 5 TRANSIENT vs WORK, `retries: <n>/3`
alongside `re-fires: <n>/3`). Terminal paths are: (a) all-done,
(b) blocked-on-budget, (c) resume-mid-loop via sec. 8 RESUME,
(d) parked-awaiting-input per sec. 5.

1. **Clarify / Resume.** If a manifest already exists for the goal
   (`.opencode/goal-loop/<slug>/reqs-manifest.md` - including the first
   message after a restart, where the user says "continue" or re-runs
   `/goal`), do NOT re-clarify: run the RESUME rule (see sec. 8) first
   and continue from the first non-done, non-blocked, non-awaiting REQ (either
   `blocked` or `blocked-transient` counts as blocked; `awaiting-input`
   counts as parked per sec. 5). Only clarify a fresh goal
   with no manifest. Do not code yet. Clarification is ONE round, max 3
   questions: propose atomic requirements (best guess, not open-ended
   questions) and put `recommend: accept all` first. The user confirms
   once. After that round, NEVER ask again mid-goal: decide everything
   below destructive impact by best guess, record each decision in the
   manifest Log, and drive to DONE/`blocked`. Mid-goal questions are
   allowed ONLY for (a) input only the human can give that blocks all
   forward motion, or (b) an unlisted destructive power. When the
   orchestrator asks such a question it marks the REQ `awaiting-input`
   per sec. 5 and stops; nothing automatic re-fires it. Question-drip
   (returning for one more preference at a time) is a loop stall and is
   banned with the same force as backgrounding. Standing orders: immediately after
   clarify/resume, read standing orders (global config copy deployed
   by `Install-GoalLoop.ps1`, falling back to the repo
   `standing-orders.md` template) and never gate on a listed power
   again; anything outside the list still asks. Attachments: record each
   `/goal` user-attached file as an ORIGINAL absolute path in the manifest
   Attachments block (sec. 5), one per line, in received order, before any
   dispatch (`Attachments: none` when empty, no copies). Re-fire and
   missing-file rules: see step 5.
2. **Manifest.** Write `reqs-manifest.md` (see sec. 5) under
   `.opencode/goal-loop/<slug>/` (repo-local, per goal). This file, not
   chat memory, is the acceptance record and the resumable state for
   sec. 8 RESUME. Commit AND push the goal branch after every manifest
   mutation (see sec. 5 rules). Arm-at-start (GOALAUTO sec. 0 exception,
   MANDATORY since 2026-10-15 unless the user said no supervisor):
   after the manifest is written + pushed, the orchestrator MUST arm the
   EXTERNAL supervisor when actionable non-blocked non-awaiting REQs are
   in flight; record task name + box in Runs/Log + report (full
   call, idempotency, and never-arm-on-`awaiting-input`: see step 9).
   A failed arm is recorded, never a gate: continue the goal anyway.
3. **DAG.** Map dependencies. No-dependency requirements may run parallel
   (bounded fan-out: see step 4); dependent ones run in order. Same-file
   edits always sequential.
4. **Dispatch.** Fetch `origin` first; base every worker branch on the
   `origin/main` tip. One worktree + branch per worker (see sec. 4;
   mandatory for isolation + remote backup; per-worker branches and the
   step 5 budgets hold under fan-out too). Write a deltas-only worker
   prompt file (see sec. 3) saved under `prompts/` (see sec. 5), record
   the run in the manifest, commit AND push the goal branch, then run it
   foreground and collect the report block. The prompt Preamble names the
   EXACT skill sections and files the worker must read (e.g. sec. 5 +
   sec. 8 only); the worker reads nothing beyond that list without
   recording why. Forward attachments: append one `-f` per manifest
   Attachments path AFTER `-f <prompt-file>`, in manifest order (sec. 4);
   record the exact set in the Runs record `files:` list (sec. 5,
   `files: none` when empty). Re-fire rules and the missing-file rule:
   see step 5. Bounded fan-out: file-disjoint REQs MAY dispatch in
   parallel, at most 3 concurrent FOREGROUND runs in one shell call that
   waits for all of them (never background persistence: server-held
   background children restarted the server 3 times on 2026-10-12, see
   Appendix). Same-file edits stay sequential.
   Tiny-task fast path: the orchestrator MAY execute a requirement inline
   with NO worker iff ALL hold: touches at most 2 files of substantive
   change, expected diff at most ~30 added lines, no cross-file hunt
   (more than ~3 places to reconcile means dispatch), verification
   runnable inline in under ~10 min foreground with quoted outputs, and
   nothing touching live machine state (those always dispatch). Inline
   work keeps the same bar: manifest `inline:` Runs line, commit AND push
   the goal branch, every acceptance item verified with proof, SLOC
   reported. Past ~15 min effort or past any cap, STOP inline and
   dispatch a worker with the saved prompt; a failed inline attempt
   dispatches the worker as the initial run, noted in Runs. Never inline
   anything the NEVER list forbids, multi-file refactors, live
   experiments, or landing/merging itself.
   Model routing (REQ-02 benchmark 2026-10-15, trivial probe count=4 lines=3,7,10,12): control opencode/muse-spark-1.3-contributor-free 13s PASS with report block and no auth error; opencode/nemotron-3.5-lightning-free 17s PASS with report block and no auth error; opencode/mimo-v2.6-flash-free 23s PASS with report block and no auth error. Verdict: no challenger beats the control, so routing stays incumbent for all classes with an incumbent-only fallback chain; budgets, branches, and caps unchanged.
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
   one progress line per wait, wait, then re-dispatch the identical run
   (same prompt + order + `-f` set: the SAME attempt, ZERO re-fire
   budget). Max 3 transient retries per run with growing waits (2 min,
   then 5 min, then 10 min); waits are fixed sleeps announced up front,
   never condition polling, never schedules except the GOALAUTO
   external-supervisor arm per sec. 0, never unbounded.
   Record each as a `retry<N>:` line with `retries: <n>/3` in the Runs
   record (sec. 5), commit AND push the goal branch per wait cycle. When
   all 3 transient retries are exhausted, NEVER wait a 4th time: mark
   the REQ `blocked-transient` with the evidence (transient signature +
   last outputs), commit AND push the goal branch, stop dispatching that
   REQ, and go to wrap-up (steps 6-9, still with the `Landed:` line).
   A server restart can still kill the turn itself mid-backoff: that
   path stays covered ONLY by sec. 8 RESUME (state is on the goal branch
   + worker branches), never by new autonomy except the GOALAUTO
   external supervisor per sec. 0.
   On a WORK failure (completed run, any check failing), re-fire the SAME
   saved prompt + order + `-f` set (byte-identical, no edits), foreground
   per sec. 4. Budget: max 3 re-fires per REQ, counted in the manifest
   Runs record as `re-fires: <n>/3` alongside `retries: <n>/3` (sec. 5,
   separate counters, never interchangeable). Each re-fire appends a
   `re-fire<N>:` line, commits AND pushes the goal branch, then
   dispatches. When the budget is exhausted, NEVER fire a 4th time: mark
   the REQ `blocked` with the evidence (which check failed + last
   outputs), commit AND push the goal branch, stop dispatching that REQ,
   and go to wrap-up (steps 6-9, report `blocked` per sec. 6). Re-fire
   is per-REQ pre-integration only: it never re-fires a `done` or
   `awaiting-input` REQ and never bypasses the sec. 7 LAND proof.
   Missing attachment at (re-)fire time is evidence, never silent: when a
   dispatch cannot launch because an `-f` path is gone, classify per this
   step (TRANSIENT while the dispatch died before a verifiable report was
   possible, else WORK failure feeding the re-fire budget) and record
   which path was missing with the last output.
6. **Integrate sequentially.** Merge one worker at a time onto
   local `main` with `git merge --no-ff` (see sec. 7 LAND; sec. 8 RESUME
   feeds recovered branches here; fan-out runs land here one by one),
   resolving conflicts,
   re-running the named green suite after each. Fix cross-worker seams
   yourself. Only integrate runs that passed step 5; `blocked`,
   `blocked-transient`, and `awaiting-input` REQs are skipped (their
   landed siblings still land).
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
   still carrying the `Landed:` line for whatever did land). A turn parked
   on `awaiting-input` is neither DONE nor `blocked`: it lands whatever
   passed per sec. 7 (still with the `Landed:` line) and reports the REQ
   plus the pending human question. No
   `Landed:` proof, no DONE, no `blocked`, and no `blocked-transient`. Wait
   for the next task.
   Arm (GOALAUTO sec. 0 exception, non-terminal wrap-up only,
   MANDATORY since 2026-10-15 unless the user said no supervisor): when the
   turn parks with actionable non-blocked non-awaiting REQs in flight
   (including arm-at-start right after the manifest is written + pushed),
   the orchestrator MUST register + enable the EXTERNAL supervisor via
   Register-GoalSupervisor.ps1 with `-Enable` and a stated time box (per
   harness sec. 6; idempotent; record task name + box in Runs/Log +
   report). A failed arm is recorded, never a gate. Disarm (terminal wrap-up): at DONE / `blocked` /
   `blocked-transient`, the orchestrator MUST unregister the supervisor
   if armed, and records + reports it. Never arm while any REQ is
   `awaiting-input`; nothing keeps running after a terminal wrap-up or a
   parked `awaiting-input` turn.

## 3. Worker prompt file (deltas-only)

Write to a saved prompt file under the goal dir (never $TEMP only),
e.g. `.opencode/goal-loop/<slug>/prompts/REQ-01.<code>.md`. The saved
file plus the recorded order text plus the recorded `files:` `-f` set is
the byte-identical re-fire source for sec. 8 RESUME; record its path in
the manifest Runs record (sec. 5) before dispatch.

Invariant boilerplate lives once in `agents/goal-worker.md` (heartbeat
shape, landing report-block shape, never-background, no-`task` tool,
Windows notes, proof norms, never-yield): do NOT repeat it in the prompt.
Prompt + agent file is the worker's full context; a worker with ONLY the
two has everything. Canonical report-block field order (checked as the
last stdout block per sec. 2 step 5): CODE / Added / SLOC /
Tests-proofs / Caveats.

Scoped reads: the Preamble names the EXACT skill sections and files the
worker must read (e.g. `sec. 5 + sec. 8 only`); the worker reads nothing
beyond that list without recording why in its report.

The prompt carries deltas only, in order:

1. **Preamble:** base SHA + `git log --oneline -3` verify, ordered read
   list (scoped per above), skill to load (`goal-loop`).
2. **Context:** what exists, why this task, what is out of scope (name the
   other workers/requirements).
3. **Scope:** allowed files ONLY (new file or explicit list) + numbered
   requirements + verification path per requirement. Attachments:
   user-attached files arrive as message attachments AND are editable
   inputs for that dispatch, including outside-the-repo paths; they join
   the worker editable scope for that dispatch only, while the
   allowed-files list still governs everything else. Branch-only still
   holds (workers never push `main`).
4. **Acceptance deltas:** owning worktree dir, named green suite with
   exact commands, SLOC delta report. Proof norms (see also sec. 6):
   trimmed command outputs (`Select-Object -First N`) plus hashes over
   the full dumps, quoted; full terminal scrollback is not evidence.

Keep prompt deltas precise - the prompt plus `agents/goal-worker.md` is
the worker's full context.

## 4. Dispatch (foreground only)

Generic (any repo), one foreground call per worker batch, large timeout:

```powershell
opencode run --auto --agent goal-worker -f <prompt-file> [-f <attachment>...] "<order>"
```

<prompt-file> is the saved file under
`.opencode/goal-loop/<slug>/prompts/` (see sec. 5), not a $TEMP copy;
<order> must match the manifest Runs record verbatim so a re-fire is
byte-identical. Each <attachment> is one manifest Attachments absolute
path, appended AFTER `-f <prompt-file>` in manifest order; the Runs
record `files:` list carries the exact `-f` set (sec. 5; re-fire and
missing-file rules per sec. 2 step 5). The supervisor re-invokes the
ORCHESTRATOR with the manifest Attachments `-f` set appended; the
orchestrator re-reads the manifest for the rest.

In noveldream, ALWAYS dispatch through `tools/dispatch/` (it parents each
`opencode run` as a foreground process so the server never holds background
children): `Invoke-Dispatch.ps1` for one worker, `Invoke-Fanout.ps1` for
2+ parallel workers, one foreground `shell` call that waits, `-DryRun`
first when changing the scripts. See the `delegate` skill for exact
invocations.

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
wrap-up done), `awaiting-input` (human question pending; set by the
orchestrator when it asks a human-only question per sec. 2 step 1;
nothing automatic ever re-fires it, and the external supervisor parks
the whole goal as NOOP while any REQ awaits input). Checkbox mirrors
status: `- [ ]` for
pending/dispatched/blocked/blocked-transient/awaiting-input,
`- [x]` for done only. A `blocked` or `blocked-transient` REQ is never
marked done. ONLY a human answer clears `awaiting-input` back to
`dispatched` with a new Runs entry (budgets carry over; nothing is
consumed while parked); a `blocked`/`blocked-transient` REQ is never
silently converted to `awaiting-input` and vice versa.

```markdown
# Goal: <one-line objective>
Base: <sha> | Date: <yyyy-mm-dd> | Slug: <slug> | Goal-branch: <goal-branch>
- [ ] REQ-01 <requirement> -- verify: <command/file check> -- status: pending
- [ ] REQ-02 <requirement> -- verify: <command/file check> -- status: dispatched
## Attachments
- Attachments: none (or one ORIGINAL absolute path per line below, in received order)
- <abs path 1>
- <abs path 2>
- NOTE: paths are ORIGINAL absolute paths (no copies into the goal dir); a moved or deleted file breaks a later re-fire (see sec. 2 step 5).
## DAG
- REQ-01: no deps
- REQ-02: after REQ-01
## Runs
### REQ-02
- dispatch: <date> branch <worker-branch> prompt `prompts/REQ-02.<code>.md` order "<order text>" files: <none | abs paths in dispatch order> re-fires: <n>/3 retries: <m>/3
- run1: <date> pushed: <sha or FAIL> | report: <ok or FAIL-missing> | acceptance: <ok or FAIL-which-item>
- retry1: <date> transient: <rate-limit | conn-reset | 5xx-timeout | restart-signature> waited: <2min> | retries: 1/3
- re-fire1: <date> result: <ok or FAIL-which-check> | re-fires: 1/3 | retries: <m>/3
- re-fire2: <date> result: <ok or FAIL-which-check> | re-fires: 2/3 | retries: <m>/3
- pushed: <sha or none-yet> (<date>) | report-tail: <last report lines>
## Log
- <date> REQ-01 done by <branch> -- <proof>
```

Rules:

- Save every worker prompt file + order text + `files:` `-f` set under the goal dir
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
  recorded as `re-open: <date> reason`). A REQ marked `awaiting-input`
  is never re-fired and never integrated; only the human answer clears
  it to `dispatched` per the status rule above, never a re-fire, never
  RESUME, never the supervisor.
- Budget accounting: every sec. 2 step 5 verify + re-fire + transient
  retry updates the Runs record, then commits AND pushes the goal
  branch. The two counters (`re-fires: <n>/3`, `retries: <m>/3`) are
  separate and never interchangeable. A 4th fire or a 4th wait is never
  allowed (see step 5 for the `blocked` / `blocked-transient` wrap-ups,
  still with the `Landed:` line).
- Attachments rule: the Attachments block holds ORIGINAL absolute paths
  in received order (`Attachments: none` when empty); each dispatch Runs
  line carries `files:` with the exact `-f` set in dispatch order.
  Re-fires and sec. 8 RESUME reproduce it byte-identical (a missing file
  is evidence per sec. 2 step 5, never silent). Attached paths join the
  worker editable scope for that dispatch only (sec. 3); branch-only
  still holds. The supervisor re-invokes the ORCHESTRATOR with the
  manifest Attachments `-f` set appended.

## 6. Report

Per worker + integration: task-code, files, SLOC structural-vs-cheap
split, commands + outputs, `Caveats: none` or explicit list (unverified
areas, risks, follow-ups). Proof norms: quote trimmed command outputs
(`Select-Object -First N`) plus hashes over the full dumps; full
terminal scrollback is not evidence. Where the GOALAUTO supervisor was
armed or
disarmed this turn, the report carries one line each:
`Armed: goal-supervisor-<slug> box <N>h` and/or
`Disarmed: goal-supervisor-<slug>`. Stdout MUST end with the sec. 3 report block last.

After any resume (see sec. 8), the report opens with a resume summary
line (before the per-worker detail):

```
Resume: recovered <X> from pushed proof, re-fired <Y>, awaiting: <n>, redone: <nothing | describe>
```

`awaiting: <n>` counts REQs skipped as `awaiting-input` per sec. 8
(never re-fired, never integrated).
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

No PRs on the solo flow (no branch protection, no PR CI to gate on).
The loop closes itself in the same invocation. Branch-per-worker is
still mandatory (isolation + remote backup before merge).

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
   the `Landed:` proof for what did land). A turn parked on
   `awaiting-input` lands whatever passed the same way and reports the
   pending human question (neither DONE nor `blocked`, still with the
   `Landed:` line for what did land).

Sec. 8 RESUME feeds recovered branches into steps 1-2 above; the landing
proof is unchanged and still required for DONE, for `blocked`, and for
`blocked-transient`.

## 8. RESUME phase (crash-safe continuation, attended only)

A server restart kills the orchestrator session but the work survives on
the goal branch + worker branches. RESUME rebuilds session state from
disk + remote; it adds nothing but the GOALAUTO external-supervisor arm
per sec. 0 (no schedules, services, watchers, polling, idle hooks,
unattended retries, or background work). In-turn transient retries stay
per sec. 2 step 5 only; a restart that kills a turn mid-backoff resumes
here, and only here, from the pushed Runs record (`retries: <m>/3`
carries over like `re-fires: <n>/3`). RESUME runs only on a human goal
turn ("continue" or a re-run of `/goal`) when a manifest exists. One
invocation still ends at DONE, `blocked`, or `blocked-transient`, or at
the next human turn with work still in flight; nothing keeps running
after that except an armed GOALAUTO supervisor per sec. 0 (disarmed at
any terminal wrap-up).

On ANY goal turn with an existing manifest, the orchestrator MUST,
before any new dispatch:

1. Read `.opencode/goal-loop/<slug>/reqs-manifest.md` (this file, not
   chat memory, is the truth). Run `git fetch origin` so reconciliation
   sees the live remote.
2. Reconcile each non-done, non-awaiting REQ against git (a `done` REQ is never
   re-fired; a `blocked` or `blocked-transient` REQ resumes as-is unless
   the user explicitly re-opens it per sec. 5, never silently re-fired;
   an `awaiting-input` REQ is NOOP: skip it entirely, never re-fire it,
   never integrate it, and count it as `awaiting: <n>` in the sec. 6
   resume summary):
   - REQ marked `awaiting-input`: skip (NOOP). Never re-fire, never
     integrate, even with pushed commits on origin; it waits for the
     human answer, which clears it per sec. 5.
   - Branch with pushed commits on origin (branch exists AND its tip or
     recorded SHA is visible on origin): treat it as survived work.
     Verify the branch state (report tail + branch diff), then integrate
     it per sec. 7 LAND steps 1-2 (merge ONE at a time, green suite
     after each). Mark the REQ `done` only after its merge + green run;
     commit AND push the goal branch on each mark.
   - Branch absent, or present with no pushed commits: re-fire the saved
     prompt file verbatim (`prompts/REQ-0<code>.md` + the recorded order
     text, byte-identical, no edits) with the identical recorded `files:`
     `-f` set per sec. 4 (never drop a missing `-f`; a missing file is
     evidence per sec. 2 step 5, never silent). Record the new run in Runs, commit
     AND push the goal branch, then dispatch foreground per sec. 4.
     The sec. 2 step 5 budgets carry over: keep counting the recorded
     `re-fires: <n>/3` and `retries: <m>/3`, max 3 re-fires per REQ and
     max 3 transient retries per run, never a 4th fire and never a 4th wait.
3. Continue the loop from the first non-done, non-blocked, non-awaiting REQ
   (either `blocked` or `blocked-transient` counts as blocked;
   `awaiting-input` counts as parked, never dispatched)
   (sec. 2 steps 4-9): dispatch what has no branch, integrate what
   survived, verify-after-every-run per sec. 2 step 5, verify, land.
4. Report a resume summary first (see sec. 6): recovered X from pushed
   proof, re-fired Y, awaiting N, redone: nothing. If anything completed was
   re-executed, fail loudly: name the REQ, what was repeated, and why.
   Redo of a `done` REQ is a bug per the sec. 5 no-redo invariant:
   presence of pushed proof moves a REQ forward, never backward.

Resume flows into LAND normally: DONE still requires the sec. 6
`Landed:` proof. A resume summary alone is never DONE. A loop with a
`blocked` or `blocked-transient` REQ still lands whatever passed and
reports per sec. 6 (still with the `Landed:` line). The driver re-fire
and the transient retry (sec. 2 step 5) are per-REQ pre-integration
inside one invocation; RESUME never re-fires `done`, never silently
re-opens `blocked` or `blocked-transient`, and never touches
`awaiting-input` (only the human answer clears it per sec. 5). RESUME is
the only restart path: it never adds autonomy beyond sec. 2 step 5 and
the GOALAUTO external-supervisor arm per sec. 0.

## Appendix: history and examples (non-normative)

This appendix carries crash history, provenance, and rationale. It adds
no rules: the normative core is secs. 0-8, which reads end-to-end
without it.

- Plugin crash history: `opencode-goal-plugin@0.11.0`
  (`william-ricchiuti/OpenCode-goal-plugin#81`, silent service death)
  was loaded on 2026-10-10; no trace of the `prevalentWare` variant was
  ever installed. Server-held background `opencode run` children
  restarted the server 3 times on 2026-10-12. Design answer: no hooks,
  no background children, plain-manifest state only (see preamble).
- GOALAUTO provenance: the sec. 0 exception was a user order of
  2026-10-14, the ONLY exception ever granted. Register-then-enable is
  idempotent because Register unregisters the name first.
- Worked rationale: stale bases strand work (hence fetch + rebase on
  `origin/main` in sec. 2 step 4); PRs on the solo flow are pure
  roundtrips with no gate (hence merge-locally LAND in sec. 7); sunk-cost
  sprawl kills tiny tasks (hence the ~15 min inline escalation in sec. 2
  step 4); a moved or deleted attachment breaks byte-identical re-fire
  (hence ORIGINAL paths + the step 5 evidence rule); silence past the
  timeout means a killed run (hence heartbeats), and scrollback alone
  proves nothing (hence trimmed outputs + hashes in sec. 3 and sec. 6).
- REQ tags seen in this file's history (attachments REQ-01a/b/c, the
  tiny-task user order of 2026-10-14) are provenance markers, not live
  instructions.
