# EF2 — REQ-02 model routing after benchmark (scoped reads)

## 1. Preamble

Base SHA: `bdc8a52` (local main tip, contains REQ-01). First verify:
`git log --oneline -3` in your worktree (top must be `bdc8a52`).
Scoped read list (per the new sec. 3 rule — read ONLY this, record any
extra read with why): `skills/goal-loop/SKILL.md` sec. 2 step 4
(dispatch area) + `CHANGELOG.md` head (first 15 lines).
Skill to load (`goal-loop`).

## 2. Context

Routing trivial workers to a faster model is currently a hunch. Prove
or kill it: race three candidates on ONE deterministic trivial probe
and write the routing rule from the table, not from vibes. Candidates:
`opencode/mimo-v2.6-flash-free`, `opencode/nemotron-3.5-lightning-free`,
control `opencode/muse-spark-1.3-contributor-free` (the incumbent).
The probe doubles as the free/auth check the user asked about: any
auth error disqualifies that candidate instantly with the error
quoted. Sibling work: none after you.

## 3. Scope (allowed files ONLY)

`skills/goal-loop/SKILL.md` (routing rule in sec. 2 step 4 area only),
`CHANGELOG.md` (append to the efficiency entry, no new entry).

1. REQ-02a benchmark: ONE trivial probe, identical for all three —
   deterministic with a checkable answer (e.g. count non-ASCII lines
   in a Temp fixture file + report top 3 with line numbers). Run each
   as `opencode run --auto -m <model> --agent goal-worker -f <tiny
   prompt file> "<order>"`, foreground, sequentially, each capped at
   ~10 min wall (a hang past that is evidence against the candidate:
   transcript tail + abandon). Record wall time per candidate
   (Measure-Command), answer correctness (match vs known answer),
   report-block presence, and any auth/quality failure quoted.
2. REQ-02b routing rule from the table: trivial class (docs-only, grep
   proofs, fixture runs) goes to the fastest PASSING model; default
   stays the incumbent; fallback chain on auth/quality failure
   (next-fastest passing, then incumbent). Budgets, branches, and caps
   unchanged. If NO challenger beats the control (or both fail
   auth/quality), write that verdict instead: routing stays incumbent,
   table quoted as the evidence. No routing fiction.
3. REQ-02c CHANGELOG append + proofread (rule vs budgets/caps
   consistent; no autonomy added).

## 4. Forbidden

Listed files only. No tags, no workflow runs, no new deps, no
`task`/subagent tool, no other repos, no main push (branch-only; the
orchestrator lands). Probe runs are the ONLY live model runs allowed,
exactly 3 (one per candidate), trivial prompt, foreground, bounded.
No scheduled tasks. You run FOREGROUND under the dispatcher: never
background yourself, stop every child process at ship. ASCII-only
added lines (non-ASCII corrupts on this toolchain — verify with a scan
before you finish). Do NOT touch `agents/`, `commands/`, `scripts/`,
`docs/`, `watch/`, `standing-orders.md`.

## 5. Heartbeat

Progress line per subtask boundary (probe × 3 → table → rule).

## 6. Acceptance

Owning worktree dir. Named green suite with exact commands:
(a) benchmark table quoted: model × wall-time × correctness ×
report-block × auth outcome (3 rows, no blanks — a missing cell is a
failed item);
(b) routing rule matches the table (or incumbent-verdict with the
table as evidence), quoted;
(c) ASCII scan of added lines empty. SLOC delta report. Fixtures in
approved Temp only, uncommitted, removed after.

## 7. Landing + report shape (exact order, last in stdout)

```
EF2 — model routing
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
