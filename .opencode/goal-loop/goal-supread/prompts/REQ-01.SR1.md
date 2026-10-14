# SR1 — REQ-01 readable status + in-flight verdict

## 1. Preamble

Base SHA: `1b951698049a422898f4959767c870a144b8ede8`. First verify:
`git log --oneline -3` in your worktree (top must be `1b95169`). Then
read in this order: `scripts/goal-supervisor/Get-GoalSupervisors.ps1`
(full — you rewrite its output layer),
`scripts/goal-supervisor/Invoke-GoalSupervisor.ps1` (the STALL +
re-fire spawn block only — you add one REFIRE-START line),
`docs/crash-log-harness.md` (status-command subsection only),
`CHANGELOG.md` (head). Load no other skill. Worktree:
`C:\Users\frnd\AppData\Local\Temp\work-supread-req01`, branch
`feat/goal-supread-req01` only.

## 2. Context

Live incident 2026-10-15 (char-adapt): supervisor STALLed at 23:21:17Z
and spawned a nested recovery run (visible process, born the same
second, alive since) while later ticks correctly stayed quiet — yet
the status command printed `FAILING (LastTaskResult 2147946720)` with
raw UTC decimals, epoch noise, and unexplained reason codes. The
display must tell the human truth: a recovery is running, be patient.
Design (implement exactly): local times (`HH:MM` + `N min ago`,
never raw UTC decimals, never epoch timestamps shown); result codes
translated (`0` ok, `267011` never ran, else `failed, code N — see
the log tail below`); reasons in words (`active` = workers busy, goal
moving; `cooldown` = waiting N min before next retry; STALL = quiet X
min, re-fired); progress in words (`1 done, 2 in progress, 3
waiting`); box as `expires in Xh Ym (HH:MM local)`; NEW verdict
RE-FIRING ranked second (STALE > RE-FIRING > RUNNING > IDLE-DISABLED >
FAILING > QUIET): the log's last REFIRE-START with no later
REFIRE-exit/SERVER-DOWN means a nested run is in flight — print since
when. Sibling work: none. NEVER touch the live
`goal-supervisor-char-adapt` task or the project-FATHER repo.

## 3. Scope (allowed files ONLY)

`scripts/goal-supervisor/Invoke-GoalSupervisor.ps1` (ONE added
REFIRE-START log line before the spawn, nothing else),
`scripts/goal-supervisor/Get-GoalSupervisors.ps1` (output rewrite;
detection logic extended ONLY with the REFIRE-START scan),
`docs/crash-log-harness.md` (verdict table rewrite in the status
subsection only),
`CHANGELOG.md` (Unreleased entry).

1. REQ-01a: Invoke logs `REFIRE-START slug=<s> attempt=<n>/<max>
   reqs=<list>` immediately before spawning `opencode run` (the
   existing `REFIRE exit=` line after stays the completion marker).
2. REQ-01b: status output rewrite per sec. 2 (times, codes, reasons,
   progress words, box countdown, verdict table with RE-FIRING).
   Everything previously shown stays available, translated — drop
   nothing silently (raw values may stay in parentheses where cheap,
   e.g. `failed, code 2147946720`).
3. REQ-01c: harness verdict table + CHANGELOG entry. Proofread touched
   lines (verdict order consistent everywhere it appears).

## 4. Forbidden

Listed files only. No tags, no workflow runs, no new deps, no
`task`/subagent tool, no other repos, no main push (branch-only; the
orchestrator lands). Proof tasks must be DISABLED-only with verified
removal — EXCEPT one instant `cmd /c exit 3` probe to mint a genuine
non-zero LastTaskResult for the FAILING case (fires once, exits at
once, removed right after; explicitly authorized here, nothing else
runs live). NEVER touch `goal-supervisor-char-adapt`, project-FATHER,
or any live task. You run FOREGROUND under the dispatcher: never
background yourself, stop every child process at ship. ASCII-only
added lines (non-ASCII corrupts on this toolchain — verify with a scan
before you finish). Do NOT touch `skills/`, `agents/`, `commands/`,
`standing-orders.md`, `watch/`, install scripts,
`Register-GoalSupervisor.ps1`.

## 5. Heartbeat

Progress line per subtask boundary (marker → rewrite → proofs).

## 6. Acceptance

Owning worktree dir, PowerShell syntax-parse clean on both scripts
(offline .NET parser, no downloads). Named green suite with exact
commands, fixtures only (canned supervisor.log content, Temp dirs,
removed after): (a) log ending in REFIRE-START with no exit after
renders verdict RE-FIRING with elapsed-since quoted; (b) fresh NOOPs
render RUNNING with a local time + `N min ago` quoted and NO raw UTC
decimal anywhere in the block; (c) stale log + Disabled task renders
IDLE-DISABLED quoted; (d) the instant exit-3 probe renders FAILING
with the translated code quoted, then is removed and verified absent;
(e) missing RepoRoot renders STALE quoted; (f) ASCII scan of added
lines empty. SLOC delta report.

## 7. Landing + report shape (exact order, last in stdout)

```
SR1 — readable status
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
