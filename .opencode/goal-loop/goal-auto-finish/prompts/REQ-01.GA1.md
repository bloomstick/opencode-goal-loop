# GA1 — REQ-01 awaiting-input status + supervisor skip

## 1. Preamble

Base SHA: `edee36462c9fdeceeeb47d11333d003450c38f71`. First verify:
`git log --oneline -3` in your worktree (top must be `edee364`). Then
read in this order: `skills/goal-loop/SKILL.md` (full — you extend sec. 5
status table + sec. 8 reconcile; must compose with LAND sec. 7,
blocked/blocked-transient, and the no-redo invariant; ban in sec. 0
stands, you do NOT lift it), `scripts/goal-supervisor/Invoke-GoalSupervisor.ps1`
(full — you add the skip), `docs/crash-log-harness.md` sec. 4 + sec. 6
(context), `agents/goal-orch.md` (one-line note only). Load no other
skill. Worktree: `C:\Users\frnd\AppData\Local\Temp\work-autofinish-req01`,
branch `feat/goal-autofinish-req01` only.

## 2. Context

The external supervisor re-fires any idle actionable manifest, but a
turn parked on a human question looks identical to a dead turn — today
it would wrongly re-fire those. Fix: a first-class `awaiting-input`
state the orchestrator sets when it asks a human-only question, which
nothing automatic ever re-fires. Sibling work: REQ-02/REQ-03 run AFTER
you (same files); touch only your scope.

## 3. Scope (allowed files ONLY)

`skills/goal-loop/SKILL.md`, `scripts/goal-supervisor/Invoke-GoalSupervisor.ps1`,
`agents/goal-orch.md` (one line), `CHANGELOG.md` (Unreleased entry).

1. REQ-01a: SKILL.md sec. 5 gains `awaiting-input` status (human
   question pending; ONLY the human answer clears it back to
   `dispatched` with a new Runs entry; never auto re-fired; checkbox
   `- [ ]`; a `blocked`/`blocked-transient` REQ is never silently
   converted to it and vice versa).
2. REQ-01b: SKILL.md sec. 8 reconciles `awaiting-input` as NOOP (skip,
   count it in the resume summary as `awaiting: <n>`; never re-fire,
   never integrate).
3. REQ-01c: supervisor excludes `awaiting-input` from actionable REQs
   and reports `awaiting:<n>` on its NOOP line when that is why there
   is nothing to do.
4. REQ-01d: one-line agent note + CHANGELOG entry. Proofread the whole
   skill for contradictions (awaiting-input vs blocked vs no-redo vs
   sec. 8; no autonomy language; ban intact).

## 4. Forbidden

Listed files only. No tags, no workflow runs, no new deps, no
schedules/services/watchers/polling/intervals/retries beyond what the
files already contain, no `task`/subagent tool, no other repos, no main
push (branch-only; the orchestrator lands). You run FOREGROUND under
the dispatcher: never background yourself, stop every child process at
ship. ASCII-only added lines (non-ASCII corrupts on this toolchain —
verify with a scan before you finish). Do NOT touch `watch/`,
`commands/`, `scripts/` (except the one listed ps1), `docs/`
(except via CHANGELOG), standing-orders.

## 5. Heartbeat

Progress line per subtask boundary (skill status → supervisor skip →
proofread).

## 6. Acceptance

Owning worktree above. PowerShell syntax-parse clean on the edited ps1
(use the .NET parser, no downloads). Named green suite with exact
commands: supervisor fixture suite — synthetic manifest with one
`awaiting-input` + one `dispatched` REQ, old mtime, `-DryRun` must NOT
re-fire (NOOP mentioning awaiting), plus the three pre-existing proofs
(STALL/COOLDOWN/NOOP) still green. SLOC delta report.

## 7. Landing + report shape (exact order, last in stdout)

```
GA1 — awaiting-input status
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
