# EF1 — REQ-01 docs efficiency bundle (diet + template + fan-out)

## 1. Preamble

Base SHA: `98b0012d178d4d7d66d52fb734da88d6609e799a`. First verify:
`git log --oneline -3` in your worktree (top must be `98b0012`). Then
read in this order: `skills/goal-loop/SKILL.md` (full — you restructure
it: normative core stays tight, history/crash-narrative/examples move
to a trailing appendix; every section keeps its number and meaning),
`agents/goal-worker.md` (full — boilerplate moves here),
`agents/goal-orch.md` (read-only context),
`docs/crash-log-harness.md` (read-only context),
`CHANGELOG.md` (head). Census first: count lines per SKILL.md section
and quote the top-3 heaviest non-appendix sections; diet must target
measured bulk, not vibes. Load no other skill. Worktree:
`C:\Users\frnd\AppData\Local\Temp\work-effic-req01`, branch
`feat/goal-effic-req01` only.

## 2. Context

Observed cost structure across ~15 worker runs: workers re-read the
full 500+-line skill + ~100-line prompt + harness + changelog while
implementing ~30-line diffs; Windows shells burn minutes on
`sed/head/grep/wc` which do not exist there; everything runs
sequentially although file-disjoint REQs could fan out. Fix the docs
half now (benchmark + model routing is REQ-02, NOT you). Sibling work:
REQ-02 runs AFTER you and extends your sections — keep edits cleanly
scoped so it rebases trivially.

## 3. Scope (allowed files ONLY)

`skills/goal-loop/SKILL.md`, `agents/goal-worker.md`,
`agents/goal-orch.md` (only if a pointer line needs the same scoped-read
language, else untouched), `CHANGELOG.md` (Unreleased entry).

1. REQ-01a skill diet: move crash-history narrative, worked examples,
   and repeated rationale to a trailing `Appendix: history and
   examples` (sections keep numbers/meaning; normative core must read
   end-to-end without the appendix). Target: core (secs. 0-8 excl.
   appendix) measurably shorter — quote before/after line counts.
2. REQ-01b scoped reads: add the rule that a dispatch prompt names the
   EXACT sections/files a worker must read (e.g. `sec. 5 + sec. 8
   only`), and workers read nothing beyond the prompt list without
   recording why. Put it in sec. 2 step 4 + sec. 3.
3. REQ-01c prompt template: move the invariant 8-part boilerplate
   (heartbeat shape, landing block shape, never-background, no-task)
   into `agents/goal-worker.md` once; sec. 3 becomes deltas-only
   (Preamble/Context/Scope/Acceptance deltas + pointer to the agent
   file). Prompt files keep working standalone (a worker with ONLY the
   prompt + agent file must have everything).
4. REQ-01d Windows notes: in the agent file, a short literal block —
   no `sed/head/grep/wc/tail` on Windows, use `Select-String`,
   `Select-Object -First N`, `Get-Content -Tail`; quote `$env:TEMP`
   instead of `/tmp`. This exact flailing recurred across runs.
5. REQ-01e proof norms: verification evidence is trimmed outputs
   (`Select-Object -First N`) + hashes over full dumps, quoted; full
   terminal scrollback is not evidence. Put in sec. 3 Acceptance +
   sec. 6.
6. REQ-01f bounded fan-out: sec. 2 DAG/step 4 gains parallel dispatch
   for file-disjoint REQs, cap 3 concurrent FOREGROUND runs, one shell
   call that waits (never background persistence), server-load caution
   citing the background-children crash history, same-file edits stay
   sequential, per-worker branches + budgets unchanged.
7. REQ-01g CHANGELOG entry + full proofread (diet vs normative meaning
   identical; template deltas-only still complete; no autonomy added).

## 4. Forbidden

Listed files only. No tags, no workflow runs, no new deps, no
`task`/subagent tool, no other repos, no main push (branch-only; the
orchestrator lands). Do NOT benchmark models or write routing rules
(REQ-02 owns that). You run FOREGROUND under the dispatcher: never
background yourself, stop every child process at ship. ASCII-only
added lines (non-ASCII corrupts on this toolchain — verify with a scan
before you finish). Do NOT touch `watch/`, `commands/`, `scripts/`,
`docs/`, `standing-orders.md`.

## 5. Heartbeat

Progress line per subtask boundary (census → diet → template+notes →
fan-out → proofread).

## 6. Acceptance

Owning worktree dir. Named green suite with exact commands, no live
model runs beyond your own session: (a) section line-count census
quoted + core before/after quoted (core strictly shorter);
(b) a worker with ONLY a (new-shape) prompt + agent file has
everything — prove by quoting the pointer chain, no second full-skill
read needed in the common case; (c) Windows-notes block present
quoted; (d) fan-out rule states cap 3 + foreground-wait + crash-hx
caution, quoted; (e) ASCII scan of added lines empty.
SLOC delta report (expect net negative on SKILL.md core).

## 7. Landing + report shape (exact order, last in stdout)

```
EF1 — docs efficiency bundle
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
