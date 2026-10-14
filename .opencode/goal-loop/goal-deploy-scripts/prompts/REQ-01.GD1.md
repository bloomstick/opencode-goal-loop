# GD1 — REQ-01 installer deploys scripts + skill resolves global copy

## 1. Preamble

Base SHA: `992e2cc4673b108f141d00bc88a2e0687101e51f`. First verify:
`git log --oneline -3` in your worktree (top must be `992e2cc`). Then
read in this order: `scripts/Install-GoalLoop.ps1` (full — you add the
scripts deploy block mirroring the existing copy style),
`skills/goal-loop/SKILL.md` sec. 0 exception + sec. 2 arm rules (you
repoint the Register reference), `docs/crash-log-harness.md` sec. 6
(same repoint), `standing-orders.md` (read-only context: note its
"global config copy, else the repo template" pattern — mirror that
language). Load no other skill. Worktree:
`C:\Users\frnd\AppData\Local\Temp\work-deploy-req01`, branch
`feat/goal-deploy-req01` only.

## 2. Context

The installed skill tells the orchestrator to run
`scripts/goal-supervisor/Register-GoalSupervisor.ps1`, but the
installer never deploys `scripts/` anywhere — arming only works from a
repo checkout. Fix: installer copies `scripts/goal-supervisor/*` to
the global config dir, and references resolve global-copy-else-repo
(the standing-orders pattern). Sibling work: none.

## 3. Scope (allowed files ONLY)

`scripts/Install-GoalLoop.ps1` (deploy block only),
`skills/goal-loop/SKILL.md` (Register reference lines only),
`docs/crash-log-harness.md` (sec. 6 reference lines only),
`CHANGELOG.md` (Unreleased entry).

1. REQ-01a: installer gains a scripts deploy block after the skills
   copy, same style (`-Force`, prints one line): target
   `Join-Path $env:USERPROFILE ".config/opencode/goal-supervisor"`,
   source `scripts/goal-supervisor/*` under `$SourceDir`. Scripts are
   product code, not user config: always overwrite (no keep-existing
   logic like standing orders).
2. REQ-01b: every Register-script reference in SKILL.md (sec. 0
   exception, sec. 2 manifest step + wrap-up arm rules) and harness
   sec. 6 resolves "global copy
   (`~/.config/opencode/goal-supervisor/`), else repo
   `scripts/goal-supervisor/`". Keep each reference short; do not
   reword surrounding rules.
3. REQ-01c: CHANGELOG entry. Proofread touched lines for stale paths.

## 4. Forbidden

Listed files only. No tags, no workflow runs, no new deps, no
`task`/subagent tool, no other repos, no main push (branch-only; the
orchestrator lands). Running the installer against THIS machine is
the orchestrator's post-landing step, not yours: you prove with a
DRY-RUN-free real install into a SANDBOX dir only (parameterize or
mirror the copy block against Temp; never touch the real global
config, never register/enable any task). You run FOREGROUND under the
dispatcher: never background yourself, stop every child process at
ship. ASCII-only added lines (non-ASCII corrupts on this toolchain —
verify with a scan before you finish). Do NOT touch `agents/`,
`commands/`, `standing-orders.md`, `watch/`, the supervisor scripts
themselves.

## 5. Heartbeat

Progress line per subtask boundary (installer → references → proofs).

## 6. Acceptance

Owning worktree dir, PowerShell syntax-parse clean on the installer
(offline .NET parser, no downloads). Named green suite with exact
commands: (a) sandbox install (Temp target): both ps1 files land in
`<sandbox>/goal-supervisor/`, parse-clean, byte-identical to repo
(`Get-FileHash` match quoted); (b) grep over SKILL.md + harness for
bare `scripts/goal-supervisor/Register` references — every hit must
carry the global-copy-else-repo form, residuals quoted;
(c) ASCII scan of added lines empty. SLOC delta report. Sandbox dir
removed after.

## 7. Landing + report shape (exact order, last in stdout)

```
GD1 — deploy scripts globally
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
