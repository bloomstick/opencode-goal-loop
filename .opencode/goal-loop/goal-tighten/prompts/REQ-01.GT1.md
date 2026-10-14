# GT1 — REQ-01 tighten defaults + docs

## 1. Preamble

Base SHA: `084815daea48c73c2b4a8124fadf2e6db57a6f3d`. First verify:
`git log --oneline -3` in your worktree (top must be `084815d`). Then
read in this order: `scripts/goal-supervisor/Register-GoalSupervisor.ps1`
(full — you change the interval default),
`scripts/goal-supervisor/Invoke-GoalSupervisor.ps1` (the
`-StallMinutes` default only — nothing else),
`docs/crash-log-harness.md` sec. 6 (defaults line only),
`CHANGELOG.md` (head). Load no other skill. Worktree:
`C:\Users\frnd\AppData\Local\Temp\work-tighten-req01`, branch
`feat/goal-tighten-req01` only.

## 2. Context

User order: stop-to-refire worst case must drop from ~20 min to ~4
min. Fix: 1-minute ticks + 3-minute stall. No architecture change, no
behavior change except cadence. The historical e2e section (1-min box
already) stays untouched — it records what ran, not defaults. Sibling
work: none.

## 3. Scope (allowed files ONLY)

`scripts/goal-supervisor/Register-GoalSupervisor.ps1` (interval
default 5 -> 1 only), `scripts/goal-supervisor/Invoke-GoalSupervisor.ps1`
(`-StallMinutes` default 15 -> 3 only),
`docs/crash-log-harness.md` (sec. 6 defaults line only),
`CHANGELOG.md` (Unreleased entry).

1. REQ-01a: Register `-IntervalMinutes` default 5 -> 1 (help text +
   printed Box line follow automatically; keep 2 h box, Disabled
   default, exec cap, IgnoreNew).
2. REQ-01b: Invoke `-StallMinutes` default 15 -> 3 (comment + param
   only; threshold logic `3x interval` for GAP stays as-is: with
   1-min ticks a missed-run gap now trips at 3 min — note this
   interaction in the CHANGELOG entry, one line).
3. REQ-01c: harness sec. 6 defaults line (5 min / 2 h -> 1 min / 2 h;
   worst-case note ~4 min) + CHANGELOG entry. Proofread the touched
   lines for stale numbers (grep `5min\|5 min\|15 min\|15min\|20 min`
   across the four files; e2e history section exempt).

## 4. Forbidden

Listed files only. No tags, no workflow runs, no new deps, no
`task`/subagent tool, no other repos, no main push (branch-only; the
orchestrator lands). Do NOT register or enable any scheduled task
(proof is Disabled round-trip + fixture dry-run only, no live
runtime). You run FOREGROUND under the dispatcher: never background
yourself, stop every child process at ship. ASCII-only added lines
(non-ASCII corrupts on this toolchain — verify with a scan before you
finish). Do NOT touch `skills/`, `agents/`, `commands/`,
`standing-orders.md`, `watch/`, install scripts.

## 5. Heartbeat

Progress line per subtask boundary (defaults → docs → proofs).

## 6. Acceptance

Owning worktree dir, PowerShell syntax-parse clean on both scripts
(offline .NET parser, no downloads). Named green suite with exact
commands: (a) Disabled registration round-trip showing interval 1 min
in the Box line + task XML, then removal verified absent;
(b) rebuilt Temp fixture (dispatched, mtime aged -5 min, epoch state):
first DryRun tick STALLs (idleMin >= 3), proving the 3-min threshold;
(c) ASCII scan of added lines empty; (d) stale-numbers grep clean
outside the exempt e2e history. SLOC delta report.

## 7. Landing + report shape (exact order, last in stdout)

```
GT1 — tighten cadence
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
