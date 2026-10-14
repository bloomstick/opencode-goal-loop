# GI1 — REQ-01 goal-init script + command step 0 + saved-copy attachments

## 1. Preamble

Base SHA: `ae92854dabe0d086cfe40e5afbf7ad04f88c8f37`. First verify:
`git log --oneline -3` in your worktree (top must be `ae92854`). Then
read in this order: `skills/goal-loop/SKILL.md` sec. 0 GOALAUTO
exception + sec. 2 steps 1-2 + step 9 arm/disarm + sec. 5 manifest
format (these are your edit zones; everything else read-only context),
`commands/goal.md` (full, 20 lines — you add Step 0),
`scripts/goal-supervisor/Register-GoalSupervisor.ps1` (param block +
idempotency lines only — your arm form must match its real params),
`docs/crash-log-harness.md` sec. 6 arm/disarm (one pointer update
only), `CHANGELOG.md` (head). Load no other skill. Worktree:
`C:\Users\frnd\AppData\Local\Temp\work-init-req01`, branch
`feat/goal-init-req01` only.

## 2. Context

User order: enforcement by code, not prose. Orchestrators keep
skipping MAY prose (observed: live goal never armed); the fix is a
deterministic init script + verbatim command steps with quoted
outputs. What CANNOT move into code (do not attempt): reading the
invoking message stays AI (only the agent sees attachments; OpenCode
has no pre-agent hooks — that slot crashed the service before).
Second forced flip: sessions retain attachment BASENAMES only
(proven: inline `<file name>` blocks, `files:[]` always empty), so
"original paths" is unimplementable — attachments become SAVED COPIES
under the goal dir. Sibling work: none.

## 3. Scope (allowed files ONLY)

`scripts/goal-init.ps1` (new),
`commands/goal.md` (Step 0 block only),
`skills/goal-loop/SKILL.md` (arm verbatim forms + Attachments
saved-copy rewrite of the AF1-era ORIGINAL-paths lines only),
`docs/crash-log-harness.md` (arm/disarm pointer only),
`CHANGELOG.md` (Unreleased entry).

1. REQ-01a init script. `scripts/goal-init.ps1 -Slug <slug>
   -RepoRoot <repo>`: fetch origin; base = `origin/main` tip; require
   a clean tree (fail loudly otherwise); create branch `goal/<slug>`
   (fail loudly if it exists — deterministic, no guessing); mkdir
   goal dir + `prompts/` + `attachments/`; hash every file already
   present in `attachments/` (sha256) and write the manifest skeleton
   (header with base/date/slug/branch, `## Attachments` listing saved
   path + hash per file or `Attachments: none`, empty DAG/Runs/Log
   sections); commit + push goal branch (upstream set); print a
   MACHINE block (base SHA, branch, manifest path, goal dir,
   attachments recorded) for the agent to quote. Pure code, no
   judgment calls; every failure LOUD with reason.
2. REQ-01b command Step 0. `commands/goal.md` gains Step 0 BEFORE
   clarify: derive slug (lowercase kebab, <=4 words), run the init
   script VERBATIM (show both global-copy and repo-relative forms),
   quote the MACHINE block, do not continue until it succeeds.
   Attachment capture rule (the irreducible AI step, stated plainly):
   the agent saves each attached file's content VERBATIM to
   `<goaldir>/attachments/<original-name>` BEFORE running init, so
   init hashes + records them; with no attachments it runs init
   directly (`Attachments: none`).
3. REQ-01c arm/disarm verbatim forms + saved-copy rewrite. Skill arm
   sections gain the EXACT Register/Unregister command forms (global
   copy path, `-RepoRoot/-Slug/-Enable/-BoxHours` placeholders, box
   stated) with required quoted outputs; AF1-era ORIGINAL-paths/no-copy
   lines rewritten to saved-copy semantics (manifest holds saved paths
   + hashes; dispatch + supervisor re-fire attach saved paths;
   missing-saved-file is evidence per step 5). Harness pointer
   updated. Proofread: no stale ORIGINAL-paths/no-copy instruction
   anywhere outside quoted history (grep it).
4. REQ-01d CHANGELOG entry. Proofread whole diff for contradictions
   (script vs skill forms identical; MUST policy intact; ban intact).

## 4. Forbidden

Listed files only. No tags, no workflow runs, no new deps, no
`task`/subagent tool, no other repos, no main push (branch-only; the
orchestrator lands). Do NOT register/enable any scheduled task (prove
arm forms by Disabled round-trip + removal only — the live e2e already
proved firing). You run FOREGROUND under the dispatcher: never
background yourself, stop every child process at ship. ASCII-only
added lines (non-ASCII corrupts on this toolchain — verify with a scan
before you finish). Do NOT touch `agents/`, `standing-orders.md`,
`watch/`, supervisor scripts, install scripts.

## 5. Heartbeat

Progress line per subtask boundary (init script → command step →
skill rewrite → proofs).

## 6. Acceptance

Owning worktree dir, PowerShell syntax-parse clean (offline .NET
parser, no downloads). Named green suite with exact commands:
(a) LIVE init run in a Temp fixture repo (git init + local bare
origin): run init, quote MACHINE block; assert branch `goal/<slug>`
exists with upstream, manifest skeleton content correct, second run
fails loudly on existing branch (quote); then seed 2 attachment
files, re-run init on a fresh slug? NO — init is one-shot per slug;
instead: place the 2 files BEFORE init and assert manifest lists both
paths + sha256 matching `Get-FileHash` (quote);
(b) skill forms grep: every Register/Unregister mention in the arm
sections shows the exact global-copy command form, residuals quoted;
(c) stale-semantics grep (`ORIGINAL absolute|no copies`) returns zero
outside quoted history/CHANGELOG-past entries — quote the residual
set or its emptiness;
(d) ASCII scan of added lines empty. SLOC delta report. Fixture repo
+ bare origin removed after.

## 7. Landing + report shape (exact order, last in stdout)

```
GI1 — mechanized goal-init
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
