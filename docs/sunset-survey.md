# Sunset survey -- goal/orchestration duplicates vs opencode-goal-loop

Base: 534a071 (verified `git log --oneline -3` top) | Date: 2026-10-13
Truth source: `skills/goal-loop/SKILL.md` in this repo (opencode-goal-loop).
Method: read-only grep/glob/read of the six areas; no edits outside this file.
Rule of thumb applied: executors with no rule duplication = KEEP; rule
duplicates = DELETE or REPLACE-WITH-POINTER; product code = NOTE only.

Section key per candidate: Path / What (one line) / Duplicates (goal-loop
section or none) / Verdict / Risk of acting (what breaks).

Tally: DELETE 6, REPLACE-WITH-POINTER 8, KEEP-WITH-REASON 15, NOTE-only 9.

Heartbeat: noveldream done, orchestrator done, architect done,
monorepo done, misc done, dispatch-watch done, global done.

## Area 1 -- noveldream (C:/my/projects/noveldream/)

### 1.1 `.agents/skills/goal-sloc/SKILL.md` (+ `references/`)
What: SLOC-as-proxy simplification discipline (preflight, honest order, audits).
Duplicates: none (complements goal-loop section 6 report split; no loop rules).
Verdict: KEEP-WITH-REASON.
Risk: AGENTS.md hard rules + dream-orchestrator prompt-template cite it;
deleting loses the structural-vs-cheap honesty gate for cleanup goals.

### 1.2 `.agents/skills/flutter-performance/SKILL.md`
What: Flutter UI/raster jank triage for this app (profile-first, binding rules).
Duplicates: none (not goal/orchestration at all).
Verdict: KEEP-WITH-REASON.
Risk: `docs/flutter-performance.md` + AGENTS.md perf section reference it;
deleting loses the app's binding perf contract.

### 1.3 `.agents/skills/delegate/` (absent -- removed)
What: Old backgrounded-dispatch skill; already deleted (see CHANGELOG Unreleased).
Duplicates: goal-loop sections 0/2/4 (backgrounded `opencode run` vs foreground-only).
Verdict: NOTE-only (already sunset; verify absence, no further action).
Risk: none remaining; re-adding it would resurrect the server-restart pattern.

### 1.4 `AGENTS.md` Delegation section (lines 12-25)
What: Repo-local delegation pointer: subagent banned, goal-loop + tools/dispatch/ mandatory.
Duplicates: goal-loop sections 0/2/4 (condensed restatement, not a fork).
Verdict: KEEP-WITH-REASON (thin pointer plus repo-local binding, not a rule fork).
Risk: deleting loses the mandatory dispatch path and the 2026-10-12
background-restart ban; agents would revert to crashing `background: true` runs.

### 1.5 `tools/dispatch/Invoke-Dispatch.ps1`
What: Single-worker foreground runner (Tee transcript, branch verify, QuietShip).
Duplicates: none -- goal-loop section 4 explicitly references this script.
Verdict: KEEP-WITH-REASON (executor the plugin names; no rule duplication).
Risk: goal-loop section 4 + AGENTS.md name it; deleting breaks every /goal
dispatch in noveldream.

### 1.6 `tools/dispatch/Invoke-Fanout.ps1`
What: Bounded parallel fan-out over 1.5 (child jobs, WAIT heartbeat, Timeout cap).
Duplicates: none -- goal-loop section 4 references this script for 2+ workers.
Verdict: KEEP-WITH-REASON.
Risk: same referencing files as 1.5; deleting removes the only approved
parallel path and pushes agents back to ad-hoc backgrounding.

### 1.7 `.opencode/goal-loop/*/` (reqs-manifest.md, plans, audits)
What: Live per-goal acceptance state (ship-3-chapters, ship-3-followups, ch3-brief).
Duplicates: none -- this IS goal-loop section 5 state, current work.
Verdict: KEEP-WITH-REASON.
Risk: deleting destroys the acceptance record for in-flight goals.

### 1.8 `.opencode/goals/state.json.lock`, `state.json.lock.claims-v2`, `state.json.sessions/`
What: Old plugin lock/lease/claim state plus per-session blobs.
Duplicates: goal-loop section 0 (explicitly bans lock/lease/claim state files).
Verdict: DELETE (after confirming no live reader; repo grep shows no
references outside the state dir itself; no opencode.json plugin entries remain).
Risk: low; residual risk is an uninstalled old plugin build still reading the
dir -- mitigate by deleting only after `opencode-goal-plugin` is confirmed
uninstalled everywhere (service log already shows only the 0.11.0 trace).

### 1.9 (no `opencode.json` at noveldream root -- confirmed absent)
What: No plugin-entry config file exists in this repo.
Duplicates: none.
Verdict: NOTE-only (nothing to strip).
Risk: none.

### 1.10 `docs/chapter-factory.md` Parallel-work section + `tools/chapter_factory.dart` `--emit-parallel` text
What: Chapter art parallel prompts; doc line 102 and tool lines 28-29/1656-1657
say "backgrounded `opencode run`" -- contradicts goal-loop sections 0/4.
Duplicates: goal-loop sections 0/4 (stale background rule).
Verdict: REPLACE-WITH-POINTER (one-line doc fix + emitted-prompt-text fix:
foreground dispatch via tools/dispatch/ per the skill; no behavior change).
Risk of acting: near zero (doc/comment-only). Risk of NOT acting: workers
follow the stale line and reintroduce the server-crashing background pattern.

### 1.11 `docs/sloc.md`, `docs/flutter-performance.md`, `docs/spec.md`, `docs/art-pipeline.md`
What: Product/process companions (SLOC mirror, perf mirror, spec, art pipeline).
Duplicates: none.
Verdict: KEEP-WITH-REASON (companions, not orchestration duplicates).
Risk: AGENTS.md indexes them; deleting breaks the repo's guideline map.

## Area 2 -- dream-orchestrator (C:/my/projects/dream-orchestrator/, dispatcher origin)

### 2.1 `.agents/skills/architect/SKILL.md` (+ `references/prompt-template.md`)
What: Full Architect orchestrator skill (issue board, dispatch, judge, merge, close).
Duplicates: goal-loop sections 2 (orchestrator loop), 3 (worker prompt),
4 (dispatch), 6 (report) -- different model (GitHub-issue-driven vs manifest-driven).
Verdict: REPLACE-WITH-POINTER (stub pointing at goal-loop once orchestrator retires).
Risk: `$DREAM_ORCHESTRATOR` consumers + monorepo stub INSTALL resolution +
`.orchestrator/` installs reference this path; hard DELETE orphans them --
pointer first, delete with the repo.

### 2.2 `prompts/worker-prompt.md`
What: Worker wrapper (verbatim bans, issue-comment heartbeat, TWO report blocks).
Duplicates: goal-loop section 3 (different report shape: machine+human blocks
vs single block; issue-comment heartbeat vs session-output heartbeat).
Verdict: REPLACE-WITH-POINTER (single-block shape per goal-loop section 3).
Risk: dispatcher builds prompts from wrapper + live issue body; runbook step 1
+ walkthrough step 4 parse the trailing task-code line and PR title from it --
reshape without updating the judge/PR-title parsing breaks landing.

### 2.3 `prompts/architect-runbook.md`
What: Judge/request-fix/merge/close/silence procedure (5 steps).
Duplicates: goal-loop section 2 steps 5-7 + section 4 + section 6.
Verdict: REPLACE-WITH-POINTER (point judge/merge/verify at goal-loop section 2).
Risk: `docs/first-dispatch-walkthrough.md` + dispatcher scripts cite runbook
steps; un-updated cross-refs go stale.

### 2.4 `dispatcher/Invoke-Dispatch.ps1` (TargetRepo/IssueNumber claim-comment-PR-label variant)
What: Issue-claiming dispatcher (claim, worktree, run, sanitize, comment, PR,
label, QuietShip); allows background-with-notify; origin of the pattern that
noveldream `tools/dispatch/` forked and goal-loop section 4 blesses.
Duplicates: goal-loop section 4 (superseded executor embedding old rules).
Verdict: DELETE once callers migrate to noveldream `tools/dispatch/` per
goal-loop section 4.
Risk: `$DREAM_ORCHESTRATOR` users + runbook + walkthrough fire through this
script; deleting before migration strands in-flight issue boards.

### 2.5 `dispatcher/Invoke-Fanout.ps1`
What: Parallel fan-out over 2.4 (same superseded family).
Duplicates: goal-loop section 4 (superseded by `tools/dispatch/Invoke-Fanout.ps1`).
Verdict: DELETE (same migration gate as 2.4).
Risk: architect SKILL dispatch section + walkthrough step 2 cite it.

### 2.6 `dispatcher/Close-Shipped.ps1` + `dispatcher/Wait-IssuesClosed.ps1`
What: Armed close-wait (bounded wait for human merges, label done, prune worktree).
Duplicates: none -- goal-loop has no close-wait; section 2 landing is manual merge.
Verdict: KEEP-WITH-REASON (no duplicate; records a gap: sunsetting these needs
a goal-loop close convention first).
Risk: runbook step 4 arms the closer per issue set; deleting strands boards
in `in-review` with unpruned `work-p-*` worktrees.

### 2.7 `docs/first-dispatch-walkthrough.md`
What: Operator walkthrough (claim/run/comment/PR/judge/merge/close/silence table).
Duplicates: goal-loop sections 2/4 (same procedure, issue-board flavor).
Verdict: REPLACE-WITH-POINTER (point at goal-loop section 2; keep as history).
Risk: runbook + dispatcher help text cross-reference walkthrough steps.

### 2.8 `docs/attended-only-decision.md`, `docs/dispatcher-dryrun.md`, `docs/script-traps.md`, `docs/integration-monorepo.md`
What: Design decision logs and rollout notes behind the attended-only rules.
Duplicates: none (rationale/history, not live rules).
Verdict: NOTE-only (keep as history; delete with the repo on sunset).
Risk: none while the repo lives.

### 2.9 `templates/pull-request.md`, `templates/milestone-issue.md`, `templates/labels.md`
What: GitHub issue/PR/label shapes for the board workflow.
Duplicates: none (issue-board workflow is outside goal-loop scope).
Verdict: KEEP-WITH-REASON while the board lives; delete WITH the board on sunset.
Risk: dispatcher builds PR bodies from `pull-request.md` with required
`Closes: #<n>` (runbook step 3); deleting early breaks PR creation.

### 2.10 `.opencode/goals/state.json.lock`, `state.json.lock.claims-v2`, `state.json.sessions/`
What: Old plugin lock/lease/claim state (same class as 1.8).
Duplicates: goal-loop section 0 (banned state system).
Verdict: DELETE (same precondition as 1.8: no live plugin reader).
Risk: low; check dispatcher scripts for readers before deleting (none found).

## Area 3 -- the-architect + dream-monorepo

### 3.1 `C:/my/projects/the-architect/architect/SKILL.md` + `architect/INSTALL.ps1`
What: Doorway stub + setup helper fetching the orchestrator export (full skill
lives in dream-orchestrator per README lines 72-78).
Duplicates: none directly -- this is the install vector for the OLD system.
Verdict: REPLACE-WITH-POINTER (doorway should provision goal-loop, not the
orchestrator export).
Risk: external users clone this doorway; repointing changes its contract --
that is the sunset intent, but coordinate with its README + releases.

### 3.2 `C:/my/projects/dream-monorepo/.agents/skills/architect/SKILL.md` + `INSTALL.ps1`
What: Same bootstrap stub installed in the monorepo (resolution:
`$DREAM_ORCHESTRATOR`, else skill-local `.orchestrator/`, git-ignored).
Duplicates: none directly (same install-vector class as 3.1).
Verdict: REPLACE-WITH-POINTER (same repointing as 3.1).
Risk: monorepo AGENTS.md delegation paragraph + INSTALL.ps1 resolution order
+ any checked-out `.orchestrator/` installs cite these paths.

### 3.3 `C:/my/projects/dream-monorepo/AGENTS.md` delegation paragraph (lines 178-183)
What: "Task delegation via Orchestrator" (worktree + branch per agent through
the Orchestrator checkout; subagents unavailable).
Duplicates: goal-loop section 4 (dispatch path now lives in goal-loop).
Verdict: REPLACE-WITH-POINTER (point delegation at goal-loop + foreground
`opencode run`; keep the subagent-unavailable sentence).
Risk: the staged `merge_to_main.dart` landing (lines 199-228) differs from
goal-loop section 2 step 5 -- repointing without reconciling the landing rule
risks queue races on the shared main worktree. Flag as an open seam.

### 3.4 `dream-monorepo/.agents/skills/goal-sloc/` + `flutter-performance/`
What: Copies of the noveldream companion skills.
Duplicates: none (not orchestration).
Verdict: KEEP-WITH-REASON (dedup across repos is an opportunity but out of
sunset scope; each repo's AGENTS.md indexes its own copy).
Risk: cross-repo drift if one copy evolves; no sunset action needed.

### 3.5 `dream-monorepo/.opencode/goals/` (lock/claims/sessions)
What: Old plugin state (same class as 1.8/2.10).
Duplicates: goal-loop section 0.
Verdict: DELETE (same precondition: no live plugin reader).
Risk: low; confirm no monorepo tooling reads the dir first.

### 3.6 `dream-monorepo/.opencode/goal-loop/` (anime-win-release, repo-worktree-convention, ...)
What: Live per-goal manifests under the new system.
Duplicates: none -- goal-loop section 5 state.
Verdict: KEEP-WITH-REASON.
Risk: deleting loses live acceptance records (same class as 1.7).

### 3.7 `dream-monorepo/opencode.json`
What: Root config (lsp + formatter only).
Duplicates: none.
Verdict: NOTE-only (no plugin entries to strip; nothing goal-like).
Risk: none.

## Area 4 -- misc (local-ai, worktrees)

### 4.1 `C:/my/projects/local-ai/` (empty directory)
What: Nothing present; no goal/orchestration-like content found.
Duplicates: none.
Verdict: NOTE-only (no candidates).
Risk: none.

### 4.2 `C:/my/projects/worktrees/opencode-agent/` (stale noveldream checkout)
What: Stale copy whose AGENTS.md still mandates the deleted `delegate` skill
(lines 10/16-20) and backgrounded `opencode run`; ships a live
`.agents/skills/delegate/SKILL.md` copy resurrecting the banned section-0
pattern (background: true dispatch, no QuietShip).
Duplicates: goal-loop sections 0/2/4 (stale pre-sunset rules).
Verdict: DELETE (prune the stale worktree/tree; it is a copy, not source --
noveldream proper already deleted the skill per 1.3).
Risk: verify ownership first (`git worktree list` in the owning repo) and
check for uncommitted work (`git status --short`) before pruning; the
resurrected delegate copy is a live footgun until removed -- any agent working
in that tree follows background rules that restart the server.

## Area 5 -- dispatch-watch (C:/Users/frnd/AppData/Local/Temp/dispatch-watch/, branch feat/watch-only)

### 5.1 Watch tree: `src/lib/opencode.ts`, `src/lib/sessions.ts`, `src/lib/chatScroll*.ts`, `src/App.tsx`, `docs/WATCH.md`
What: Read-mostly SSE watch UI (session list + chat stream; explicitly no
dispatch/worktrees/issues/screenshots per WATCH.md lines 3-6).
Duplicates: none.
Verdict: NOTE-only -- product code, out of scope; never propose deleting
product features.
Risk: any deletion breaks the Watch product; no sunset action.

### 5.2 Removed surfaces (already cut on this branch, history only)
What: dispatchNext/autopilot/Architect-chat/pipeline engine (P-DSP-4/8/17-20/
23/24/27/32/33), sidecar gh/store/screenshot commands, `scripts/` npm
pipelines, `opencode.json`, TO-DO.md -- cut per CHANGELOG WSH/WUI entries;
`App.test.tsx` asserts the surfaces are absent.
Duplicates: goal-loop sections 2/4 (dispatcher-origin remnants, retired here).
Verdict: NOTE-only (already sunset on this branch; no action).
Risk: reverting the branch reintroduces dispatcher/autopilot remnants; keep
the branch watch-only.

## Area 6 -- global config (C:/Users/frnd/.config/opencode/)

### 6.1 `commands/goal.md`
What: Live `/goal` command (loads goal-loop skill, manifest/DAG/foreground-run
phases, no-schedules rule).
Duplicates: none -- this IS the plugin's command (mirrors repo `commands/goal.md`).
Verdict: KEEP-WITH-REASON (live entry point).
Risk: hand-editing diverges from the repo truth source; update only via
`scripts/Install-GoalLoop.ps1`, then restart OpenCode.

### 6.2 `agents/goal-orch.md` + `agents/goal-worker.md`
What: Live orchestrator/worker agents (section-0 `task: deny` frontmatter,
foreground-only protocol).
Duplicates: none -- these ARE the plugin's agents (mirror repo `agents/`).
Verdict: KEEP-WITH-REASON.
Risk: same update-via-installer rule as 6.1; relaxing `task: deny` reopens
the free-tier crash path the skill was built to close.

### 6.3 `skills/goal-loop/SKILL.md`
What: Installed canonical spec (header verified identical to repo truth source).
Duplicates: none -- this IS the plugin spec.
Verdict: KEEP-WITH-REASON.
Risk: same update-via-installer rule; a drifted copy silently forks the rules.

### 6.4 `goal-loop/` source clone (agents/commands/scripts/skills/README, Install-GoalLoop.ps1)
What: Update mechanism (clone/pull + copy installer, source
`github.com/bloomstick/opencode-goal-loop` per README lines 33-35).
Duplicates: none.
Verdict: KEEP-WITH-REASON.
Risk: deleting breaks `/goal` updates; reinstalls would re-clone anyway.

### 6.5 `plugins/media-tools/`
What: Unrelated media plugin (art pipeline surface, not goal-like).
Duplicates: none.
Verdict: NOTE-only (not a candidate; listed to show it was checked).
Risk: none for this survey.

### 6.6 Global `opencode.json`
What: Model/provider config (ollama tiers); no plugin entries.
Duplicates: none.
Verdict: NOTE-only (nothing goal-like to strip).
Risk: none.
