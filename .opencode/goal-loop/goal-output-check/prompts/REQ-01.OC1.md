# OC1 — REQ-01 full supervisor delete (background autonomy ends)

## 1. Preamble

Base SHA: `690c40afef7cb515d75267e7f3cd11d1a4ace2bc`. First verify:
`git log --oneline -3` in your worktree (top must be `690c40a`). Then
read in this order: `skills/goal-loop/SKILL.md` (full — you are
deleting from it; track every supervisor touchpoint before cutting),
`agents/goal-orch.md` (full), `standing-orders.md` (full),
`scripts/Install-GoalLoop.ps1` (supervisor deploy + PATH blocks only),
`docs/crash-log-harness.md` (full — you keep sec. 1-3 + log
locations, neutralize the rest),
`scripts/goal-supervisor/` (list only, to confirm deletion scope),
`CHANGELOG.md` (head). Load no other skill. Worktree:
`C:\Users\frnd\AppData\Local\Temp\work-outcheck-req01`, branch
`feat/goal-outcheck-req01` only.

## 2. Context

User order, absolute: the supervisor experiment is OVER. Background
autonomy caused real harm (3 PC-killing pile-ons) and answered a
question the user never asked. What dies: the entire supervisor
apparatus. What survives untouched: RESUME (attended, human continue),
the clarify-check + saved-copy attachment capture (orch-side),
`scripts/goal-init.ps1`, commands Step 0, transient immediate retries,
re-fire budgets, blocked/awaiting-input, LAND proof, the tiny-task
rule. A follow-up REQ builds the foreground transcript checker; leave
it maximum room (no driver rewrite from you beyond deleting
supervisor-entangled lines). Sibling work: none.

## 3. Scope (allowed files ONLY)

DELETED outright: `scripts/goal-supervisor/` (entire dir: Invoke,
Register, Get, goal-sup.cmd).
Edited: `scripts/Install-GoalLoop.ps1` (remove supervisor deploy block
+ PATH ensure block ONLY),
`skills/goal-loop/SKILL.md` (delete GOALAUTO exception block,
arm-at-start rule, step 9 arm/disarm rules, every supervisor mention
in steps 5/6/8; non-terminal wrap-up with work in flight now reports +
waits human, nothing arms),
`agents/goal-orch.md` (delete arm/disarm + supervisor lines),
`standing-orders.md` (delete GOALAUTO exception pointer +
supervisor-specific lines ONLY; keep merged-branch-deletion and all
LAND powers),
`docs/crash-log-harness.md` (keep sec. 1-3 log locations + incident
protocol; neutralize supervisor sections to a dated removal pointer),
`CHANGELOG.md` (removal entry; past entries stay as history).

1. REQ-01a: perform the deletion list above. Appendix gets the history
   (GOALAUTO dates, why it died: PC-killing pile-ons + answering an
   unasked question), non-normative.
2. REQ-01b: proofread the WHOLE skill end to end for dangling pointers
   (every Arm/Disarm/supervisor/GOALAUTO/scheduled-task reference must
   resolve or be gone; wrap-up paths must terminate without autonomy).
3. REQ-01c: CHANGELOG removal entry + docs pointer updates.

## 4. Forbidden

Listed files only (delete the dir; edit the rest). No tags, no
workflow runs, no new deps, no `task`/subagent tool, no other repos,
no main push (branch-only; the orchestrator lands). Do NOT build the
checker (next REQ owns it). Do NOT touch RESUME, manifest Attachments
capture, clarify-check, `scripts/goal-init.ps1`, `commands/goal.md`
Step 0, `watch/`. Verify ZERO scheduled tasks named
`goal-supervisor-*` exist before AND after (quote both; create none).
You run FOREGROUND under the dispatcher: never background yourself,
stop every child process at ship. ASCII-only added lines (non-ASCII
corrupts on this toolchain — verify with a scan before you finish).

## 5. Heartbeat

Progress line per subtask boundary (inventory → delete → proofread).

## 6. Acceptance

Owning worktree dir. Named green suite with exact commands:
(a) residual grep across SKILL.md + goal-orch.md + standing-orders.md
+ Install-GoalLoop.ps1 + goal.md for
`supervisor|GOALAUTO|goal-sup|Register-GoalSupervisor|ScheduledTask|arm-at-start|Arm:|Disarmed:`
returns EMPTY outside the Appendix history block — quote the residual
set (Appendix lines + nothing else);
(b) harness grep for the same patterns returns only the removal
pointer + history — quoted;
(c) installer syntax-parse clean (offline .NET parser) + sandbox
proof the deploy/PATH blocks are gone (grep the installer for
`goal-supervisor` returns empty — quoted);
(d) `git status` shows the dir deletion + only the 5 edited files;
(e) ASCII scan of added lines empty. SLOC delta report (expect large
negative).

## 7. Landing + report shape (exact order, last in stdout)

```
OC1 — supervisor delete
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
