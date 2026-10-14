# GI2 — REQ-02 orch-side attachments only (workers get NOTHING)

## 1. Preamble

Base SHA: `ae92854dabe0d086cfe40e5afbf7ad04f88c8f37`. First verify:
`git log --oneline -3` in your worktree (top must be `ae92854`). Then
read in this order: `skills/goal-loop/SKILL.md` sec. 0 GOALAUTO
exception + sec. 2 steps 1-2 + step 9 arm/disarm + sec. 4 dispatch
command + sec. 5 manifest Attachments block (your edit zones; the
AF1-era worker-forwarding lines inside them are what you STRIP),
`commands/goal.md` (full, 20 lines — you add Step 0),
`scripts/goal-supervisor/Invoke-GoalSupervisor.ps1` (the Attachments
parse + shared refireArgs builder ONLY, read-only — already landed,
verify present, do NOT touch),
`scripts/goal-supervisor/Register-GoalSupervisor.ps1` (param block
only, read-only), `docs/crash-log-harness.md` sec. 6 (one pointer
update only), `CHANGELOG.md` (head). Proven upstream facts (do NOT
re-prove, do NOT spend runs): `-f` is repeatable (`File(s) to attach
to message`); sessions retain attachment BASENAMES only (inline
`<file name>` blocks, `files:[]` always empty — verified live twice).
Load no other skill. Worktree:
`C:\Users\frnd\AppData\Local\Temp\work-init-req02`, branch
`feat/goal-init-req02` only.

## 2. Context

User order, final and explicit: WORKERS MUST NOT RECEIVE ATTACHMENTS.
The only link that matters is UI-to-ORCHESTRATOR receipt (initial
`/goal` message + supervisor re-fire). A prior run built the wrong
half (orch-to-worker forwarding) and died uncommitted; its branch was
scrapped. Design consequences, all mandatory: (a) the orchestrator
saves each attached file's content VERBATIM to
`<goaldir>/attachments/<original-name>` (only it can see the content —
irreducible AI step, stated plainly in commands/goal.md Step 0);
(b) manifest Attachments block holds SAVED paths + sha256 (basenames
are unrecoverable, so original-paths are gone — say why in one line);
(c) supervisor re-fire keeps working UNCHANGED (already landed: it
reads the manifest block — verify, don't duplicate);
(d) NO `-f` attachments on worker dispatches, NO worker editable
scope for attachments, NO `files:` Runs field — strip every AF1-era
line that says otherwise; (e) clarify-check: if the user message
claims an attachment but none arrived (no `<file>` blocks, no paths),
STOP and ask for path/content as `awaiting-input` instead of running
blind (this is exactly the 3D-pipeline failure).

## 3. Scope (allowed files ONLY)

`scripts/goal-init.ps1` (new: base resolve, clean-tree, branch
`goal/<slug>`, goal dir + prompts/ + attachments/, hash present
attachments into manifest skeleton, commit + push, MACHINE block),
`commands/goal.md` (Step 0 block only: slug, save-verbatim,
verbatim init call global-copy-else-repo, quote MACHINE, STOP on
failure),
`skills/goal-loop/SKILL.md` (Step 0 pointer + saved-copy capture rule +
clarify-check + STRIP list below + arm verbatim forms ONLY if missing),
`agents/goal-orch.md` (ATTACHMENTS dispatch line rewritten to
orch-capture + supervisor re-fire only),
`docs/crash-log-harness.md` (arm/disarm pointer only),
`CHANGELOG.md` (Unreleased entry + one line marking AF1
worker-direction stripped per user order).

1. REQ-02a init script (same contract as the scrapped run: deterministic,
   fail-loudly, MACHINE block; clean tree tolerating only the pending
   goal dir for pre-seeded attachments).
2. REQ-02b command Step 0 with the save-verbatim attachment rule.
3. REQ-02c skill rewrite: ADD capture rule + clarify-check
   (awaiting-input on missing-promised-attachment) + MUST-arm verbatim
   forms if absent; STRIP all worker-forwarding (dispatch `-f`
   append, Runs `files:`, worker editable scope + Forbidden exception,
   sec. 8 re-fire `files:`, agent ATTACHMENTS dispatch line rewritten
   to orch-capture + supervisor re-fire only — agents/goal-orch.md IS
   in scope for that one line). KEEP manifest Attachments block +
   supervisor behavior lines. Proofread: no remaining line may tell a
   worker it receives attachments; grep `files:` + `editable` +
   `AF <prompt-file>` residuals and quote the empty set.
4. REQ-02d harness pointer + CHANGELOG (new entry; mark the AF1
   worker-direction stripped, supervisor/orch half retained).

## 4. Forbidden

Listed files only (plus the one agent line). No tags, no workflow
runs, no new deps, no `task`/subagent tool, no other repos, no main
push (branch-only; the orchestrator lands). Do NOT register/enable any
scheduled task; do NOT spend live `opencode run` dispatches (init
proof is local git only). You run FOREGROUND under the dispatcher:
never background yourself, stop every child process at ship.
ASCII-only added lines (non-ASCII corrupts on this toolchain — verify
with a scan before you finish). Do NOT touch `standing-orders.md`,
`watch/`, supervisor scripts, install scripts.

## 5. Heartbeat

Progress line per subtask boundary (init script → strip → capture
rule → proofs).

## 6. Acceptance

Owning worktree dir, PowerShell syntax-parse clean (offline .NET
parser, no downloads). Named green suite with exact commands, no live
model runs, no tasks: (a) LIVE init run in Temp fixture repo (git init
+ local bare origin): MACHINE block quoted; branch `goal/<slug>`
with upstream quoted; manifest skeleton with 2 pre-seeded attachments
listed WITH matching sha256 quoted; second run fails loudly quoted;
stray-file guard still trips quoted; fixture removed quoted;
(b) residual greps EMPTY and quoted: worker-facing forward lines
(`-f <attachment>`, `files:`, `editable scope`, `AF <prompt-file>`)
across SKILL.md + agent file;
(c) clarify-check text present quoted + awaiting-input wiring quoted;
(d) ASCII scan of added lines empty. SLOC delta report.

## 7. Landing + report shape (exact order, last in stdout)

```
GI2 — orch-side attachments only
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
