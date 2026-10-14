# ST1 — REQ-01 Get-GoalSupervisors status command

## 1. Preamble

Base SHA: `fe7da6d8f7507fe27b841aedd7d5ee433685754b`. First verify:
`git log --oneline -3` in your worktree (top must be `fe7da6d`). Then
read in this order: `scripts/goal-supervisor/Invoke-GoalSupervisor.ps1`
(param block + log line shapes only — your output must parse what it
writes: `supervisor.log` lines, `supervisor-state.json` fields
attempts/lastAttemptUtc/lastCheckUtc, manifest `- [ ]/- [x]` + `-- status:`),
`scripts/goal-supervisor/Register-GoalSupervisor.ps1` (task-name +
Arguments shape only: `-RepoRoot "<path>" -Slug "<slug>" -TaskName
"<name>" ...), `docs/crash-log-harness.md` sec. 6 (one short
subsection for the command), `CHANGELOG.md` (head). Load no other
skill. Worktree:
`C:\Users\frnd\AppData\Local\Temp\work-supstat-req01`, branch
`feat/goal-supstat-req01` only.

## 2. Context

One command answers "are my supervisors running": it lists every
`goal-supervisor-*` task with status, progress, and output. It ships
inside `scripts/goal-supervisor/` so the existing installer deploy
block carries it globally with zero installer changes (verify this
claim: the block copies `scripts/goal-supervisor/*`). Run form on any
machine after install:
`powershell -NoProfile -File ~/.config/opencode/goal-supervisor/Get-GoalSupervisors.ps1`
(document exactly this). Sibling work: none.

## 3. Scope (allowed files ONLY)

`scripts/goal-supervisor/Get-GoalSupervisors.ps1` (new),
`docs/crash-log-harness.md` (one short subsection in sec. 6),
`CHANGELOG.md` (Unreleased entry).

1. REQ-01a: the script. Params: `-Tail` (default 3, log lines per
   goal), `-Slug` (optional filter). For each
   `Get-ScheduledTask -TaskName 'goal-supervisor-*'`: extract
   `-RepoRoot`/`-Slug` from the exec Arguments; print one header block
   per goal: task State, LastRunTime, LastTaskResult, NextRunTime
   (via Get-ScheduledTaskInfo), box end (trigger EndBoundary when
   present); then progress: manifest REQ counts by status
   (done/dispatched/pending/blocked/blocked-transient/awaiting-input;
   missing manifest says so); then state fields
   (attempts/lastAttemptUtc/lastCheckUtc; missing file says so); then
   the last `-Tail` `supervisor.log` lines under an `output:` label.
   Verdict per goal, exactly one of: RUNNING (Ready + log fresh within
   3x tick) / IDLE-DISABLED (task Disabled) / STALE (RepoRoot or goal
   dir gone) / FAILING (LastTaskResult non-zero) / QUIET (Ready but log
   staler than 3x tick — points at box expiry or sleeping machine).
   No tasks at all prints `no supervisors registered` and exits 0.
   The script never modifies anything (read-only; no register/enable/
   unregister calls anywhere in it).
2. REQ-01b: harness subsection (command form, what each verdict means,
   where it reads from) + CHANGELOG entry. Proofread for stale paths.

## 4. Forbidden

Listed files only. No tags, no workflow runs, no new deps, no
`task`/subagent tool, no other repos, no main push (branch-only; the
orchestrator lands). Proof tasks must be DISABLED-only with verified
removal (no live runtime). The script itself must contain no
scheduling/enabling/disabling calls. You run FOREGROUND under the
dispatcher: never background yourself, stop every child process at
ship. ASCII-only added lines (non-ASCII corrupts on this toolchain —
verify with a scan before you finish). Do NOT touch `skills/`,
`agents/`, `commands/`, `standing-orders.md`, `watch/`, install
scripts, the other supervisor scripts.

## 5. Heartbeat

Progress line per subtask boundary (script → proofs → docs).

## 6. Acceptance

Owning worktree dir, PowerShell syntax-parse clean (offline .NET
parser, no downloads). Named green suite with exact commands:
(a) sandbox proof: two DISABLED probe tasks via the product Register
script — one healthy (Temp fixture goal with manifest 1-done +
1-dispatched, state file, supervisor.log with 2 NOOP lines), one
STALE (RepoRoot pointing at a removed dir); run the new script and
quote output showing verdict RUNNING (or QUIET with reason if timing
lands there — then state which) with counts `done:1` + a status word,
and verdict STALE for the second; then remove both tasks (verified
absent) + fixture (verified gone);
(b) `-Slug` filter shows only the matching goal, quoted;
(c) ASCII scan of added lines empty. SLOC delta report.

## 7. Landing + report shape (exact order, last in stdout)

```
ST1 — supervisors status command
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
