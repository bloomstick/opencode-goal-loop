# GS2 — REQ-02 live-fire e2e in contained fixture

## 1. Preamble

Base SHA: `f81253a` (local main tip, contains REQ-01; Register has
`-WorkingDirectory`). First verify: `git log --oneline -3` in your
worktree (top must be `f81253a`). Then read in this order:
`skills/goal-loop/SKILL.md` sec. 0 GOALAUTO exception + sec. 2 arm
rules (context — you do NOT edit the skill),
`scripts/goal-supervisor/Invoke-GoalSupervisor.ps1` (read-only),
`scripts/goal-supervisor/Register-GoalSupervisor.ps1` (read-only),
`docs/crash-log-harness.md` sec. 4 + sec. 6 (you add the e2e section).
Load no other skill. Worktree:
`C:\Users\frnd\AppData\Local\Temp\work-armstart-req02`, branch
`feat/goal-armstart-req02` only.

## 2. Context

User order: prove the whole chain fires unattended — supervisor tick
detects STALL, re-fires the orchestrator via `opencode run`, a worker
lands, the goal DONEs, the supervisor quiets. Containment is the
design: EVERYTHING lives in approved Temp (`C:\Users\frnd\AppData\Local\Temp\opencode\e2e-live/`)
with a LOCAL bare origin, so pushes/proofs succeed locally and zero
product impact is possible. The re-fired orchestrator will load the
globally installed skill (which may lag repo main) — observe whatever
happens; bounded handling (budgets, caps, task time limit) makes any
outcome safe. Sibling work: none after you.

## 3. Scope (allowed files ONLY)

Product files: `docs/crash-log-harness.md` (e2e section only),
`CHANGELOG.md` (Unreleased entry). Everything else lives in Temp and
is removed at the end. You MUST NOT modify `scripts/`, `skills/`,
`agents/`, `commands/`, `standing-orders.md`.

1. REQ-02a: build the fixture. Temp git repo `e2e-live` (branch main,
   local git identity via `-c user.name/user.email` flags ONLY, never
   global config) + local bare origin `e2e-origin.git` wired as its
   `origin`. One-goal manifest `.opencode/goal-loop/probelive/reqs-manifest.md`
   with a single REQ-01 `dispatched` + Runs record (branch
   `feat/probe-w1`, prompt `prompts/REQ-01.PROBE.md`, order text) and a
   SELF-CONTAINED probe prompt (no skill loading: create marker file
   `probe-ok.txt` with fixed content in Temp, add + commit on the
   worker branch, push branch to origin, end stdout with the exact
   four-line GA-probe report block you specify). Manifest mtime aged
   -20 min + state `lastAttemptUtc` epoch so the first tick STALLs.
   Commit + push fixture main to the local origin.
2. REQ-02b: arm ENABLED with a short box. Register
   `goal-supervisor-probelive` via the product Register script with
   `-Enable -IntervalMinutes 1 -BoxHours 1 -RepoRoot <fixture>`
   (uses `-WorkingDirectory` default = RepoRoot from REQ-01). Then
   tighten the runaway bound for the experiment with a direct command:
   set ExecutionTimeLimit to 15 min on the task (Register hardcodes
   1 h; document this one-off deviation). Record task name + box.
3. REQ-02c: observe with a deadline. Bounded foreground waits (max 25
   min total, then disarm regardless and report what was observed —
   partial evidence is still evidence): expect in fixture
   `supervisor.log` a STALL line, then a REFIRE line, then (nested
   runs take minutes) the worker marker + branch on the local origin,
   then DONE on fixture main, then supervisor NOOP. Quote each line.
4. REQ-02d: mandatory cleanup + docs. Unregister the task and verify
   absent (`Get-ScheduledTask` shows nothing matching). Remove the
   fixture dirs. Harness e2e section (box, chain observed with quoted
   lines, deviations) + CHANGELOG entry. Proofread the two product
   files for contradictions.

## 4. Forbidden

Product files: the two listed only. No tags, no workflow runs, no new
deps, no `task`/subagent tool, no other repos (fixture + bare origin
are Temp scratch, not repos you land to), no pushes outside Temp and
your worker branch. Outside the ONE experiment task (short box,
15-min exec cap, fixture-only), never background anything, stop every
child process at ship. ASCII-only added lines in product files
(non-ASCII corrupts on this toolchain — verify with a scan before you
finish). The experiment task MUST be gone at ship (removed, verified
absent) even on partial observation.

## 5. Heartbeat

Progress line per subtask boundary (fixture → arm → observe →
cleanup).

## 6. Acceptance

Owning worktree dir. Named green suite with exact commands:
(a) fixture `supervisor.log` shows STALL + REFIRE quoted;
(b) worker marker file content quoted + `feat/probe-w1` visible on the
LOCAL origin quoted (`git ls-remote <bare-path>`);
(c) DONE on fixture main quoted (or, if the chain bounded out: the
terminal evidence quoted + why, still a result);
(d) post-DONE supervisor tick NOOP quoted (or box-expiry NOOP);
(e) experiment task verified ABSENT + fixture dirs removed quoted;
(f) ASCII scan of product added lines empty. SLOC delta report
(product files only).

## 7. Landing + report shape (exact order, last in stdout)

```
GS2 — live-fire e2e
Added: <files>
SLOC: <+.->
Tests/proofs: <commands + outputs>
Caveats: <none or list>
```

Commit on worker branch, push branch ONLY, stop every child process.
Stdout MUST end with this block last.

## 8. Never-yield

Never claim completion before EVERY numbered acceptance item above is
met with proof (command output or file check per item, quoted in the
report) — on partial observation, claim exactly what was observed and
put the rest in Caveats, never invent lines. Never ask questions:
decide by best guess inside your scope. A turn with no progress is not
completion: keep working, or state the concrete blocker (which item,
what was tried, last output).
