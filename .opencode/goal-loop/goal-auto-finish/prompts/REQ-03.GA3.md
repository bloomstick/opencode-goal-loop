# GA3 — REQ-03 full auto-arm wiring with explicit ban-lift

## 1. Preamble

Base SHA: `e92d72c` (local main tip, contains REQ-01 + REQ-02).
First verify: `git log --oneline -3` in your worktree (top must be
`e92d72c`). Then read in this order: `skills/goal-loop/SKILL.md` (full —
you add a bounded exception to sec. 0 + arm/disarm rules in sec. 2
wrap-up + consistency fixes wherever the old absolute ban is stated),
`standing-orders.md` (full — you add the same exception pointer to the
NEVER list), `agents/goal-orch.md` (you add the exception note to its
never-schedule line), `docs/crash-log-harness.md` sec. 4 + sec. 6 (you
add the arm/disarm protocol), `scripts/goal-supervisor/Register-GoalSupervisor.ps1`
(read-only context: `-Enable` already exists; do NOT change scripts).
Load no other skill. Worktree:
`C:\Users\frnd\AppData\Local\Temp\work-autofinish-req03`, branch
`feat/goal-autofinish-req03` only.

## 2. Context

Authorization of record: on 2026-10-14 the user explicitly chose FULL
auto-arm over the recommended assisted/deferred options, knowing it
needs a ban lift. The ban lift is therefore ORDERED, not a violation —
but it must stay minimal, bounded, and consistent everywhere the old
absolute ban is stated. The Register script already supports `-Enable`
and still defaults Disabled; no script changes needed. Sibling work:
REQ-01 + REQ-02 done (your base has them — no regressions).

## 3. Scope (allowed files ONLY)

`skills/goal-loop/SKILL.md`, `standing-orders.md`,
`agents/goal-orch.md` (exception note only),
`docs/crash-log-harness.md` (arm/disarm protocol),
`CHANGELOG.md` (Unreleased entry).

1. REQ-03a: SKILL.md sec. 0 gains a GOALAUTO exception (user order
   2026-10-14): the orchestrator MAY register + enable the EXTERNAL
   supervisor (Scheduled Task outside the server, per harness sec. 6)
   at a wrap-up that leaves actionable non-blocked non-awaiting REQs
   in flight, with a stated time box, and MUST unregister it at any
   terminal wrap-up (DONE / `blocked` / `blocked-transient`). Every
   other sec. 0 ban stands: no subagents, no server-held background,
   no schedules-as-monitoring, no polling, no unbounded waits.
2. REQ-03b: SKILL.md sec. 2 wrap-up gains the arm rule (when: resume
   with work still in flight; what: run the Register script with
   `-Enable` + stated box; record task name + box in Runs/Log +
   report) and the disarm rule (terminal wrap-up: Unregister if armed;
   record + report). Keep it short; reference the harness, do not
   duplicate it.
3. REQ-03c: hunt EVERY line that states the old absolute ban and make
   it consistent with the exception: sec. 2 step 5 "never schedules",
   sec. 2 step 9 "nothing keeps running", sec. 8 "RESUME is the only
   restart path / never adds autonomy", sec. 3 worker Forbidden
   (workers STILL never background — keep, say so), sec. 6 report
   shapes (arm/disarm lines where a task was armed). Use grep; leave
   no stale absolute behind.
4. REQ-03d: standing-orders.md NEVER list gains the same exception
   pointer (the "any line below that claims one of the above is void"
   line must now exempt exactly the GOALAUTO skill-sec.-0 exception);
   agents/goal-orch.md never-schedule line gains the exception note;
   harness doc arm/disarm protocol; CHANGELOG entry.

## 4. Forbidden

Listed files only. No tags, no workflow runs, no new deps, no
`task`/subagent tool, no other repos, no main push (branch-only; the
orchestrator lands). Do NOT change `scripts/` (Register already
satisfies arm/disarm; if you find a real gap, state it as a blocker
instead). You run FOREGROUND under the dispatcher: never background
yourself, stop every child process at ship. ASCII-only added lines
(non-ASCII corrupts on this toolchain — verify with a scan before you
finish). Do NOT touch `watch/`, `commands/`, install scripts.

## 5. Heartbeat

Progress line per subtask boundary (sec. 0 exception → consistency
hunt → proofread).

## 6. Acceptance

Owning worktree dir. Named green suite with exact commands:
(a) contradiction grep over the skill (`autonom`, `schedul`,
`watcher`, `polling`, `background`, `never adds`, `only restart
path`, `nothing keeps running`) — every hit must read consistent with
the exception, quote the residual hits; (b) ASCII scan of added lines
empty; (c) supervisor regression on rebuilt fixtures (STALL dry-run,
COOLDOWN, awaiting-NOOP, one GAP stub — quote outputs);
(d) Register script untouched AND still defaults Disabled (show the
param block / a Disabled registration round-trip with removal).
SLOC delta report.

## 7. Landing + report shape (exact order, last in stdout)

```
GA3 — auto-arm wiring
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
