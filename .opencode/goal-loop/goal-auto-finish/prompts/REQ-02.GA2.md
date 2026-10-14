# GA2 — REQ-02 boot-gap crash collector (gap + failed-refire)

## 1. Preamble

Base SHA: `2cb6cf7` (local main tip, contains REQ-01; you branch from it
because you extend the same supervisor script — see manifest DAG note).
First verify: `git log --oneline -3` in your worktree (top must be
`2cb6cf7`). Then read in this order: `skills/goal-loop/SKILL.md` (full —
note the new `awaiting-input` status; you do NOT change the skill, ban
stands), `scripts/goal-supervisor/Invoke-GoalSupervisor.ps1` (full —
you extend it), `docs/crash-log-harness.md` (full — you wire sec. 3/6),
`CHANGELOG.md` (head). Load no other skill. Worktree:
`C:\Users\frnd\AppData\Local\Temp\work-autofinish-req02`, branch
`feat/goal-autofinish-req02` only.

## 2. Context

The supervisor only sees the present moment: if the machine or the
scheduler was down for hours, or a re-fire died because the server was
down, today that leaves no trace but a quiet log. Fix: the supervisor
detects its own missed runs (gap) and failed re-fires (server down) and
appends incident stubs that feed the harness protocol. Sibling work:
REQ-01 done (your base has it — do not regress the awaiting-input
skip); REQ-03 runs AFTER you (ban-lift + arm wiring; do not touch the
skill, standing orders, or commands).

## 3. Scope (allowed files ONLY)

`scripts/goal-supervisor/Invoke-GoalSupervisor.ps1`,
`docs/crash-log-harness.md` (collector subsection only),
`CHANGELOG.md` (Unreleased entry).

1. REQ-02a: gap detector. Track `lastCheckUtc` in
   `supervisor-state.json` (update on EVERY run including NOOP).
   Accept `-IntervalMinutes` (default 5, same default the Register
   script uses). If now minus lastCheck exceeds 3x the interval,
   append a GAP incident stub to `supervisor.log` (last check time,
   gap length, pointer to the server-log window
   `C:\Users\frnd\.local\share\opencode\log\opencode.log` for manual
   follow-up per harness sec. 3) and continue the normal pass. Never
   claim a crash: a gap means the supervisor did not run, nothing more.
2. REQ-02b: failed-refire record. If the `opencode run` re-fire fails
   to launch or exits in a way that signals the server is down
   (non-zero/exception — define the exact condition in a comment),
   append a SERVER-DOWN stub (exit/condition, cooldown applies) and do
   NOT consume MaxAttempts budget (a down server is not the goal's
   fault); the next cycle retries after cooldown. Consecutive
   SERVER-DOWNs must not self-disable (that would kill recovery).
3. REQ-02c: harness doc subsection (collector behavior + how GAP and
   SERVER-DOWN stubs feed the sec. 3 incident protocol) + CHANGELOG
   entry. Proofread for contradictions (gap-vs-crash language exact;
   no autonomy beyond the existing bounded re-fire; ban intact).

## 4. Forbidden

Listed files only. No tags, no workflow runs, no new deps, no
schedules/services/watchers/polling/intervals-as-monitoring beyond the
existing task cadence, no `task`/subagent tool, no other repos, no main
push (branch-only; the orchestrator lands). You run FOREGROUND under
the dispatcher: never background yourself, stop every child process at
ship. ASCII-only added lines (non-ASCII corrupts on this toolchain —
verify with a scan before you finish). Do NOT touch `skills/`,
`agents/`, `commands/`, `standing-orders.md`, `watch/`, the Register
script.

## 5. Heartbeat

Progress line per subtask boundary (gap detector → failed-refire →
proofread).

## 6. Acceptance

Owning worktree dir, PowerShell syntax-parse clean (offline .NET
parser, no downloads). Named green suite with exact commands:
collector fixture suite — (A) seeded old `lastCheckUtc` yields exactly
one GAP stub then a normal pass; (B) simulated failed launch yields a
SERVER-DOWN stub with budget unconsumed (attempts unchanged) and no
self-disable; (C) regression: awaiting-input mixed manifest still NOOP
with `awaiting:1`, STALL/COOLDOWN/NOOP proofs still green. SLOC delta
report. Fixtures live only in approved Temp, uncommitted.

## 7. Landing + report shape (exact order, last in stdout)

```
GA2 — boot-gap collector
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
report). Never ask questions: decide by best guess inside your scope.
A turn with no progress is not completion: keep working, or state the
concrete blocker (which item, what was tried, last output).
