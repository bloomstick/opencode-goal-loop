# OC2 — REQ-02 same-session checker + resend driver (max 10)

## 1. Preamble

Base SHA: `690c40afef7cb515d75267e7f3cd11d1a4ace2bc`. First verify:
`git log --oneline -3` in your worktree (top must be `690c40a`). Then
read in this order: `skills/goal-loop/SKILL.md` sec. 2 step 5 + sec. 5
Runs format + sec. 6 report shapes + sec. 8 (your rewrite zones; the
rest is read-only context), `agents/goal-orch.md` DRIVER duties (your
rewrite zone), `CHANGELOG.md` (head). Load no other skill. Worktree:
`C:\Users\frnd\AppData\Local\Temp\work-outcheck-req02`, branch
`feat/goal-outcheck-req02` only. (Create the worktree/branch yourself
with `git worktree add -b feat/goal-outcheck-req02 <path> origin/main`
after the fetch; base must be the live tip.)

## 2. Context

User order, exact: a foreground program checks TRUE, REAL agent output
for a DONE flag; without DONE or BLOCKED it re-sends a continue prompt
into the SAME agent, SAME chat, as the user (visible in the desktop
app), max 10 resends, until milestones complete. Background execution
stays forcefully banned (nothing you build may schedule, persist, or
outlive the turn). Architecture (implement exactly this split): the
checker program is PURE (reads a transcript, prints a verdict, never
dispatches); the orchestrator executes resends and records them
(manifest accounting cannot live inside a checker). Session targeting:
dispatches assign deterministic session ids (`-s <slug>-<req>-run<n>`);
resends continue them (`--session`), preserving context instead of
fresh runs.

## 3. Scope (allowed files ONLY)

`scripts/goal-loop/Check-GoalOutput.ps1` (new),
`skills/goal-loop/SKILL.md` (sec. 2 step 5 rewrite + sec. 5 Runs
`resends:` + sec. 6 shapes if touched + sec. 8 resend wording),
`agents/goal-orch.md` (DRIVER duties rewrite),
`CHANGELOG.md` (Unreleased entry).

1. REQ-02a checker: `Check-GoalOutput.ps1 -Transcript <path>` reads a
   transcript file, finds the LAST report-shaped block in exact sec. 3
   field order (CODE/Added/SLOC/Tests-proofs/Caveats); prints
   `VERDICT: DONE` (plain title) or `VERDICT: BLOCKED` (`(blocked)`
   title) with the matched title quoted, else `VERDICT: CONTINUE` with
   the reason (no block / block not last / malformed). Exit 0 always;
   script errors throw loudly. No dispatch calls anywhere in it.
2. REQ-02b driver rewrite: after EVERY run the orchestrator saves the
   captured stdout to `runs/<req>-run<N>.out` under the goal dir, runs
   the checker on it, and acts: DONE integrates, BLOCKED wraps up,
   CONTINUE re-sends `continue + outstanding items + report-block
   demand` into the SAME session id, max 10 resends after the initial
   run (`resends: <n>/10` in Runs; exhausted means `blocked` with
   evidence). Awaiting-input suppresses resend (manifest status is
   truth for parking; transcript for completion — state the split).
   Dead/missing session on resend means RESUME reconcile (kept), never
   a fresh silent run. RETIRE `re-fires:`/`retries:` counters and
   `blocked-transient` (folded into `blocked`; single budget now).
3. REQ-02c agent duties + CHANGELOG + full proofread (no dangling
   re-fire/retry/counter references anywhere touched).

## 4. Forbidden

Listed files only. No tags, no workflow runs, no new deps, no
`task`/subagent tool, no other repos, no main push (branch-only; the
orchestrator lands). Live model runs: EXACTLY TWO trivial ones, both
pre-authorized here and nowhere else: (1) open probe session
`<slug>-probe` with a one-word order, (2) ONE resend into it;
then `opencode export` must show BOTH user messages in the SAME
session (quote both) — this proves same-chat visibility, the entire
point. Then delete the probe session. No scheduled tasks (verify none
before/after). You run FOREGROUND under the dispatcher: never
background yourself, stop every child process at ship. ASCII-only
added lines (non-ASCII corrupts on this toolchain — verify with a scan
before you finish). Do NOT touch `standing-orders.md`, `watch/`,
`commands/`, `scripts/goal-init.ps1`, install scripts, `docs/`,
`agents/goal-worker.md`.

## 5. Heartbeat

Progress line per subtask boundary (checker → visibility probe →
driver rewrite → proofs).

## 6. Acceptance

Owning worktree dir, PowerShell syntax-parse clean (offline .NET
parser, no downloads). Named green suite with exact commands:
(a) fixture transcript WITH DONE block last → `VERDICT: DONE` quoted;
(b) fixture WITH `(blocked)` block last → `VERDICT: BLOCKED` quoted;
(c) fixture WITHOUT any block → `VERDICT: CONTINUE` quoted;
(d) live visibility probe: export shows the original user message AND
the resend user message in the same session id quoted, probe session
deleted after quoted;
(e) exhausted-counter rule text present quoted (`resends: 10/10`
means `blocked`);
(f) ASCII scan of added lines empty. SLOC delta report. Fixtures
removed, no tasks left.

## 7. Landing + report shape (exact order, last in stdout)

```
OC2 — same-session checker
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
