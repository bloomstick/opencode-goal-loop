# AF1 — REQ-01 attachment forward chain (original paths, editable)

## 1. Preamble

Base SHA: `c2060f5a55d361cf92535791315c19847553fd42`. First verify:
`git log --oneline -3` in your worktree (top must be `c2060f5`). Then
read in this order: `skills/goal-loop/SKILL.md` (full — you extend
sec. 2 clarify + dispatch, sec. 3 scope, sec. 4 command, sec. 5
manifest; must compose with branch-only, re-fire budgets, RESUME,
GOALAUTO exception; sec. 0 ban stands), `agents/goal-orch.md`
(read-only context), `CHANGELOG.md` (head). Verified upstream fact
(do NOT re-verify by spending a run): `opencode run --help` and the
CLI docs both define `-f/--file` as `File(s) to attach to message` —
repeatable. The current dispatch (`-f <prompt-file>` only) drops every
user attachment from `/goal`; that is the bug. Load no other skill.
Worktree: `C:\Users\frnd\AppData\Local\Temp\work-attachfwd-req01`,
branch `feat/goal-attachfwd-req01` only.

## 2. Context

User decisions (do not relitigate): attachments are referenced by
ORIGINAL absolute path (no copies into the goal dir) and workers may
EDIT them. Consequences you must encode, not dodge: (a) a moved or
deleted file breaks a later re-fire — the Runs record must carry the
exact `-f` set so a re-fire is byte-identical, and a missing file at
re-fire time is evidence (WORK check failure or TRANSIENT per sec. 2
step 5 classification, never silent); (b) editable means attached
paths join the worker's editable scope for that dispatch — say so
plainly in sec. 3 Scope, including outside-the-repo paths. Sibling
work: none.

## 3. Scope (allowed files ONLY)

`skills/goal-loop/SKILL.md`, `agents/goal-orch.md` (one line),
`CHANGELOG.md` (Unreleased entry).

1. REQ-01a: sec. 2 clarify step: orchestrator records user-attached
   files as absolute paths in the manifest (`Attachments:` line, one
   per line, with a moved/deleted-file caveat line).
2. REQ-01b: sec. 2 dispatch + sec. 4 command: dispatch appends one
   `-f` per attached file AFTER `-f <prompt-file>`
   (`opencode run --auto --agent goal-worker -f <prompt-file>
   [-f <attachment>...] "<order>"`); Runs record gains the exact
   `files:` list; every re-fire reproduces the identical `-f` set
   (byte-identical, no edits); missing file at re-fire time is
   evidence, never silent.
3. REQ-01c: sec. 3 worker prompt Scope: attachments arrive as message
   attachments AND are editable inputs for that dispatch (including
   outside-the-repo paths); the allowed-files list still governs
   everything else; sec. 5 manifest format gains the `Attachments:`
   block + `files:` Runs field.
4. REQ-01d: agent one-liner + CHANGELOG entry. Proofread the whole
   skill for contradictions (attachments vs branch-only vs allowed-files
   vs re-fire budgets vs RESUME vs supervisor re-fire path — note the
   supervisor re-invokes the ORCHESTRATOR, which re-reads the manifest,
   so no supervisor change is needed; state that).

## 4. Forbidden

Listed files only. No tags, no workflow runs, no new deps, no
`task`/subagent tool, no other repos, no main push (branch-only; the
orchestrator lands). Do NOT spend a live `opencode run` to re-prove
`-f` repeatability (given above). You run FOREGROUND under the
dispatcher: never background yourself, stop every child process at
ship. ASCII-only added lines (non-ASCII corrupts on this toolchain —
verify with a scan before you finish). Do NOT touch `watch/`,
`commands/`, `scripts/`, `docs/`, `standing-orders.md`.

## 5. Heartbeat

Progress line per subtask boundary (clarify+manifest → dispatch+prompt
→ proofread).

## 6. Acceptance

Owning worktree dir. Named green suite with exact commands, no live
runs: (a) fixture proof WITHOUT dispatching: build a Temp goal dir
with a manifest carrying 2 Attachments + a saved prompt file, then run
a PowerShell snippet that renders the exact dispatch command from
those records and asserts both `-f` paths present in order after the
prompt file (quote output); (b) byte-identical re-fire proof: render
twice, `Compare-Object` empty (quote); (c) missing-file proof:
render path for a deleted Temp file yields the evidence line your
text specifies (quote which classification it feeds);
(d) ASCII scan of added lines empty. SLOC delta report. Fixtures in
approved Temp only, uncommitted, removed after.

## 7. Landing + report shape (exact order, last in stdout)

```
AF1 — attachment forward chain
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
