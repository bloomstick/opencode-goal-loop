# GP1 — REQ-01 path shim + installer PATH ensure

## 1. Preamble

Base SHA: `bb6236cef781c839b9d489c02484fd6875d9d119`. First verify:
`git log --oneline -3` in your worktree (top must be `bb6236c`). Then
read in this order: `scripts/Install-GoalLoop.ps1` (the supervisor
deploy block only — you append the PATH ensure right after it),
`scripts/goal-supervisor/Get-GoalSupervisors.ps1` (param names only:
`-Tail`, `-Slug` — your shim must forward args),
`docs/crash-log-harness.md` (status-command subsection only),
`CHANGELOG.md` (head). Load no other skill. Worktree:
`C:\Users\frnd\AppData\Local\Temp\work-pathshim-req01`, branch
`feat/goal-pathshim-req01` only.

## 2. Context

After install, a bare `goal-sup` word must work from any directory in
both `cmd.exe` and PowerShell. Design (fixed, implement exactly this):
new file `scripts/goal-supervisor/goal-sup.cmd` containing a two-line
shim that forwards all args (`%*`) to the GLOBAL
`Get-GoalSupervisors.ps1` under `%USERPROFILE%\.config\opencode\goal-supervisor\`
(it lives beside the ps1, so the existing deploy block ships it with
zero extra copy logic); installer appends that global dir to the USER
PATH (HKCU, no admin) only if not already listed, prints one PATH
line, and notes a new shell is needed to see it. Sibling work: none.

## 3. Scope (allowed files ONLY)

`scripts/goal-supervisor/goal-sup.cmd` (new, two lines + `@echo off`),
`scripts/Install-GoalLoop.ps1` (PATH ensure block only),
`docs/crash-log-harness.md` (status subsection: the `goal-sup` form),
`CHANGELOG.md` (Unreleased entry).

1. REQ-01a: the shim. Exactly: `@echo off` + one powershell line with
   `-NoLogo -NoProfile -NonInteractive -ExecutionPolicy Bypass -File`
   pointing at `%USERPROFILE%\.config\opencode\goal-supervisor\Get-GoalSupervisors.ps1`
   with `%*` appended. No other logic in the shim.
2. REQ-01b: installer PATH block after the SUPERVISOR line: read user
   PATH, split on `;`, case-insensitive contains-check for the
   supervisor dir, append + `SetEnvironmentVariable(..., 'User')` only
   when missing (idempotent, never dupes), print `PATH: ...` line
   (added vs already-listed), print `NOTE: restart your shell ...`
   line. Never touch machine PATH, never require admin.
3. REQ-01c: harness usage line (`goal-sup [-Tail n] [-Slug name]`
   from anywhere after install + reinstall) + CHANGELOG entry.
   Proofread touched lines.

## 4. Forbidden

Listed files only. No tags, no workflow runs, no new deps, no
`task`/subagent tool, no other repos, no main push (branch-only; the
orchestrator lands). NEVER modify the real user PATH in proofs (prove
against a scratch env var + a sandbox PATH dir, details below) and
never register/enable any task. You run FOREGROUND under the
dispatcher: never background yourself, stop every child process at
ship. ASCII-only added lines (non-ASCII corrupts on this toolchain —
verify with a scan before you finish). Do NOT touch `skills/`,
`agents/`, `commands/`, `standing-orders.md`, `watch/`, the ps1
supervisor scripts.

## 5. Heartbeat

Progress line per subtask boundary (shim → installer → proofs).

## 6. Acceptance

Owning worktree dir, PowerShell syntax-parse clean on the installer
(offline .NET parser, no downloads; the .cmd needs no parse).
Named green suite with exact commands: (a) sandbox PATH dir in Temp
containing a copy of the shim: from a FOREIGN working directory, with
the sandbox dir prepended to the PROCESS path only
(`$env:Path = "<sandbox>;" + $env:Path`, reverted after), `goal-sup`
resolves (`Get-Command goal-sup` quoted) and runs to `no supervisors
registered` (quoted) — proving the word + arg forwarding without
touching real PATH; (b) installer PATH logic proven idempotent: run
the same contains/append logic twice against a SCRATCH env var value
and show second run reports already-listed with no dupe (quoted);
(c) ASCII scan of added lines empty. SLOC delta report. Sandbox dirs
removed after.

## 7. Landing + report shape (exact order, last in stdout)

```
GP1 — path shim
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
