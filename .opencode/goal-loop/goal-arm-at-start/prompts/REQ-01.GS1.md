# GS1 — REQ-01 arm-at-start rule + Register working directory

## 1. Preamble

Base SHA: `6113d2872482dc68706f4298eed5130e73e1539e`. First verify:
`git log --oneline -3` in your worktree (top must be `6113d28`). Then
read in this order: `skills/goal-loop/SKILL.md` (full — you add the
arm-at-start rule next to the sec. 2 step 9 arm/disarm rules; must stay
consistent with the GOALAUTO sec. 0 exception, disarm-at-terminal, and
never-arm-on-awaiting-input), `scripts/goal-supervisor/Register-GoalSupervisor.ps1`
(full — you add `-WorkingDirectory`), `agents/goal-orch.md` (arm/disarm
note only), `docs/crash-log-harness.md` sec. 6 (one-line pointer
update only). Load no other skill. Worktree:
`C:\Users\frnd\AppData\Local\Temp\work-armstart-req01`, branch
`feat/goal-armstart-req01` only.

## 2. Context

Auto-arm today happens only at non-terminal wrap-ups — but a mid-turn
death never reaches wrap-up, so nothing would be armed. Fix: arm right
after the manifest is written, so every turn is covered from the start.
Second gap: the re-fired orchestrator inherits the task's working
directory, so relative skill paths break; the Register script must set
the task working directory to the repo root. Sibling work: REQ-02
(live-fire e2e) runs AFTER you and uses your `-WorkingDirectory`; do
not build fixtures yourself.

## 3. Scope (allowed files ONLY)

`skills/goal-loop/SKILL.md`, `scripts/goal-supervisor/Register-GoalSupervisor.ps1`,
`agents/goal-orch.md` (arm note only), `docs/crash-log-harness.md`
(one-line pointer only), `CHANGELOG.md` (Unreleased entry).

1. REQ-01a: SKILL.md sec. 2 (manifest step + wrap-up arm/disarm rules)
   gains the arm-at-start rule: after the manifest is written + pushed,
   the orchestrator MAY arm the EXTERNAL supervisor (same Register
   call, stated box, record task + box in Runs/Log). Arming is
   idempotent (Register unregisters the name first). Disarm-at-terminal
   and never-arm-on-awaiting-input unchanged.
2. REQ-01b: Register script gains `-WorkingDirectory` (default: the
   RepoRoot value) and passes it to the task action, so a re-fired run
   starts in the repo and relative skill paths resolve. Keep Disabled
   default, box defaults, and printed enable/stop lines.
3. REQ-01c: agent one-liner + harness one-liner + CHANGELOG entry.
   Proofread for contradictions (arm-at-start vs disarm vs
   awaiting-input vs GOALAUTO exception; no new autonomy beyond the
   ordered exception).

## 4. Forbidden

Listed files only. No tags, no workflow runs, no new deps, no
`task`/subagent tool, no other repos, no main push (branch-only; the
orchestrator lands). Do NOT register or enable any scheduled task
yourself (no live runtime from this REQ — REQ-02 owns the live fire).
You run FOREGROUND under the dispatcher: never background yourself,
stop every child process at ship. ASCII-only added lines (non-ASCII
corrupts on this toolchain — verify with a scan before you finish).
Do NOT touch `watch/`, `commands/`, install scripts, standing-orders.

## 5. Heartbeat

Progress line per subtask boundary (arm-at-start rule →
WorkingDirectory → proofread).

## 6. Acceptance

Owning worktree dir, PowerShell syntax-parse clean (offline .NET
parser, no downloads). Named green suite with exact commands:
(a) contradiction grep over the skill for the arm/disarm/awaiting
lanes, residuals quoted consistent; (b) ASCII scan of added lines
empty; (c) Register round-trip Disabled (existing proof shape):
register with `-WorkingDirectory` pointed at a Temp dir, show the task
exists Disabled with the working directory set, then remove it and
verify absent. SLOC delta report.

## 7. Landing + report shape (exact order, last in stdout)

```
GS1 — arm-at-start rule
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
