# GT2 — REQ-02 align IntervalMinutes end to end

## 1. Preamble

Base SHA: `a17c80a` (local main tip, contains REQ-01). First verify:
`git log --oneline -3` in your worktree (top must be `a17c80a`). Then
read in this order: `scripts/goal-supervisor/Register-GoalSupervisor.ps1`
(full), `scripts/goal-supervisor/Invoke-GoalSupervisor.ps1` (param
block + gap-threshold lines only), `docs/crash-log-harness.md` (the
collector `-IntervalMinutes` line only), `CHANGELOG.md` (head). Load
no other skill. Worktree:
`C:\Users\frnd\AppData\Local\Temp\work-tighten-req02`, branch
`feat/goal-tighten-req02` only.

## 2. Context

REQ-01 tightened the tick (Register `-IntervalMinutes` default 1) but
the Invoke side still defaults `-IntervalMinutes` 5 and Register never
forwards the value — so the GAP threshold (3x the Invoke-side
interval) silently means 15 min while ticks run every 1 min. Fix the
plumbing so one number governs end to end. Sibling work: none.

## 3. Scope (allowed files ONLY)

`scripts/goal-supervisor/Register-GoalSupervisor.ps1` (forward
`-IntervalMinutes $IntervalMinutes` in the task Arguments only),
`scripts/goal-supervisor/Invoke-GoalSupervisor.ps1` (`-IntervalMinutes`
default 5 -> 1 only), `docs/crash-log-harness.md` (collector
`-IntervalMinutes` line: true statement under the new defaults only),
`CHANGELOG.md` (append to the tighten entry, no new entry).

1. REQ-02a: Register appends `-IntervalMinutes $IntervalMinutes` to
   the task Arguments (defaults + explicit values both flow through).
2. REQ-02b: Invoke `-IntervalMinutes` default 5 -> 1 (param + comment
   only; GAP logic untouched: 3x interval now trips at 3 min on the
   default cadence, matching the tightened design).
3. REQ-02c: collector doc line states the true defaults; CHANGELOG
   tighten entry gains one alignment line. Proofread the touched
   lines for stale numbers.

## 4. Forbidden

Listed files only. No tags, no workflow runs, no new deps, no
`task`/subagent tool, no other repos, no main push (branch-only; the
orchestrator lands). Do NOT register or enable any scheduled task
beyond a Disabled round-trip with removal (no live runtime). You run
FOREGROUND under the dispatcher: never background yourself, stop every
child process at ship. ASCII-only added lines (non-ASCII corrupts on
this toolchain — verify with a scan before you finish). Do NOT touch
`skills/`, `agents/`, `commands/`, `standing-orders.md`, `watch/`,
install scripts.

## 5. Heartbeat

Progress line per subtask boundary (forward → default → proofs).

## 6. Acceptance

Owning worktree dir, PowerShell syntax-parse clean on both scripts
(offline .NET parser, no downloads). Named green suite with exact
commands: (a) Disabled round-trip whose task XML Arguments literally
contain `-IntervalMinutes 1`, then removal verified absent;
(b) rebuilt Temp fixture: seeded 5-min-old lastCheckUtc yields exactly
one GAP stub (proves 3x1-min threshold live), then normal pass;
(c) ASCII scan of added lines empty. SLOC delta report.

## 7. Landing + report shape (exact order, last in stdout)

```
GT2 — align intervals
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
