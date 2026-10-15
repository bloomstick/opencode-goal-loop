# LG1 — REQ-01 load gate + wake grace (never pile onto a busy machine)

## 1. Preamble

Base SHA: `690c40afef7cb515d75267e7f3cd11d1a4ace2bc`. First verify:
`git log --oneline -3` in your worktree (top must be `690c40a`). Then
read in this order: `scripts/goal-supervisor/Invoke-GoalSupervisor.ps1`
(the STALL-to-spawn block only — your edit zone; everything else
read-only context), `skills/goal-loop/SKILL.md` sec. 0 GOALAUTO
exception (one policy line only),
`docs/crash-log-harness.md` (status verdict table + collector
behavior, pointer updates only), `CHANGELOG.md` (head). Load no other
skill. Worktree:
`C:\Users\frnd\AppData\Local\Temp\work-loadgate-req01`, branch
`feat/goal-loadgate-req01` only.

## 2. Context

Live incident 2026-10-15 (char-adapt, disarmed for the duration): 3
STALLs woke nested orchestrators that dispatched ComfyUI workers on top
of the user's own manual image generation — PC brought down 3 times.
Root cause: the supervisor judges manifest-idle only; it is blind to
machine load and to the human's own heavy sessions (my 1-min/3-min
tightening made it more aggressive). Design (implement exactly):
before ANY re-fire spawn, take 2 one-second CPU samples
(`Get-Counter '\Processor(_Total)\% Processor Time'`); if the average
is over 75%, log `BUSY-SKIP` (with both samples + threshold) and exit
0 WITHOUT consuming MaxAttempts budget (a busy machine is not the
goal's fault — same doctrine as SERVER-DOWN) and WITHOUT advancing
lastAttempt (cooldown must not gate the retry once the machine idles;
idle is re-checked every tick anyway). GPU: try `nvidia-smi` at both
standard paths (System32 + NVSMI dir) plus bare name; if present and
parseable, skip when utilization over 70% with the same BUSY-SKIP
shape; if absent/unparseable (true on the incident machine — verified),
log one `GPU-UNAVAILABLE` line per PROCESS lifetime only (static flag,
never per-tick spam) and proceed on CPU alone. Wake grace: a tick that
writes a GAP stub must NOT re-fire on the same tick even if the goal
is stalled — log `WAKE-GRACE` and let the next quiet tick decide (one
full interval of observation after sleep). Sibling work: none. NEVER
touch `goal-supervisor-char-adapt` (disarmed, stays that way) or
project-FATHER.

## 3. Scope (allowed files ONLY)

`scripts/goal-supervisor/Invoke-GoalSupervisor.ps1` (gate + grace
only),
`skills/goal-loop/SKILL.md` (GOALAUTO exception: one load-gate policy
line — re-fire only into an idle machine, skip-when-busy is not a
failure),
`docs/crash-log-harness.md` (verdict/behavior notes only),
`CHANGELOG.md` (Unreleased entry).

1. REQ-01a load gate + wake grace per sec. 2 (all read-only checks
   under ~3 s total; no new deps; thresholds as literals with one
   comment each explaining the value).
2. REQ-01b policy line + behavior notes + CHANGELOG entry. Proofread
   touched lines (gate vs cooldown vs caps vs SERVER-DOWN doctrine
   consistent; ban intact).

## 4. Forbidden

Listed files only. No tags, no workflow runs, no new deps, no
`task`/subagent tool, no other repos, no main push (branch-only; the
orchestrator lands). NO live scheduled tasks beyond Disabled
round-trips with verified removal (prove firing logic with DryRun +
canned logs, never an enabled task; never touch char-adapt).
Simulating load: synthetic CPU spin in the test shell ONLY (bounded
seconds, stopped after), never real workloads. You run FOREGROUND
under the dispatcher: never background yourself, stop every child
process at ship. ASCII-only added lines (non-ASCII corrupts on this
toolchain — verify with a scan before you finish). Do NOT touch
`agents/`, `commands/`, `standing-orders.md`, `watch/`, install
scripts, `Register-GoalSupervisor.ps1`, `Get-GoalSupervisors.ps1`
(except a BUSY-SKIP/ WAKE-GRACE-aware verdict line IF the table needs
it — prefer leaving verdicts untouched).

## 5. Heartbeat

Progress line per subtask boundary (gate → grace → proofs).

## 6. Acceptance

Owning worktree dir, PowerShell syntax-parse clean (offline .NET
parser, no downloads). Named green suite with exact commands,
fixtures only: (a) stalled fixture + synthetic CPU load above
threshold: DryRun tick logs BUSY-SKIP with both samples quoted and NO
STALL/REFIRE lines, attempts unchanged quoted;
(b) same fixture idle: STALL + DRYRUN line quoted (gate passes when
idle);
(c) seeded old lastCheck: GAP stub + WAKE-GRACE on the SAME tick with
NO re-fire quoted, next tick (fresh lastCheck, still stalled) STALLs
quoted;
(d) GPU-UNAVAILABLE logged at most once per process across two ticks
quoted (or nvidia-smi present path, if it exists);
(e) ASCII scan of added lines empty. SLOC delta report. Fixtures
removed, no tasks left (Disabled round-trip only, verified absent).

## 7. Landing + report shape (exact order, last in stdout)

```
LG1 — load gate
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
