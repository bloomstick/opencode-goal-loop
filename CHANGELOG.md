# Changelog

## [Unreleased]

- `goal-loop`: single-round clarification (max 3 questions, recommend
  first), then best-guess + manifest-logged decisions to DONE; mid-goal
  questions only for human-only blockers or unlisted destructive powers.
  Question-drip banned as a loop stall.

- `goal-loop`: stay-up (WSTAYUP): transient retry + standing orders.
  Failure classification in sec. 2 step 5: WORK failure (completed run,
  any acceptance check fails) keeps the 3 re-fire budget; TRANSIENT
  failure (dispatch itself dies: rate limit, ECONNRESET, service
  5xx/timeout, restart signature) triggers bounded backoff INSIDE the
  turn (announced 2/5/10 min waits, one progress line per wait,
  identical re-dispatch as the SAME attempt, ZERO re-fire budget, max 3
  retries). Exhausted transients mark the REQ `blocked-transient` with
  evidence and wrap up per sec. 6 (still with the `Landed:` line).
  Restart mid-backoff resumes ONLY via sec. 8 RESUME (retry count
  carries over in the Runs record); no unbounded waits, no polling, no
  schedules. Runs record carries `retries: <n>/3` alongside
  `re-fires: <n>/3` (separate counters, never interchangeable, both
  visible in the sec. 6 report). New `standing-orders.md` template
  (pre-authorized: merge + push with proof, tag push on explicit
  publish order, TEMP worktree removal, merged-branch deletion after
  proof, release PRs on order; NEVER subagents/background/schedules;
  commented extend-your-own section). Orchestrator reads standing
  orders at loop start and never gates on a listed power again;
  `Install-GoalLoop.ps1` installs the template to global config without
  overwriting an existing user copy. Turn ends ONLY on DONE/`blocked`,
  external death, or human-only input.

- `goal-loop`: bounded driver loop (WDRV, always terminates): after EVERY
  foreground run the orchestrator verifies three checks (report block
  last in the exact sec. 3 order, worker branch pushed to origin, every
  numbered acceptance item met with proof) and re-fires the SAME saved
  prompt file + order verbatim on ANY failure. Budget: max 3 re-fires
  per REQ (1 initial + up to 3 = at most 4 runs, `re-fires: <n>/3` in
  the Runs record with `run<N>`/`re-fire<N>` lines); budget exhausted
  means NEVER a 4th fire: mark the REQ `blocked` with the evidence,
  land whatever passed per LAND, report `blocked` per sec. 6 (symmetric
  to DONE, still carrying the `Landed:` line). New sec. 3 `never-yield`
  worker clause (no DONE/`blocked`/report claim before EVERY item is
  met with proof; no-progress turn is not completion; report block last
  or the run counts as failed). Termination paths: all-done,
  blocked-on-budget, restart-mid-loop via RESUME (re-fire count carries
  over; `done` never re-fired, `blocked` resumes as `blocked` unless
  the user re-opens it with a fresh budget). No timers/polling/hooks.

- `goal-loop`: RESUME phase (crash-safe continuation): manifest is
  resumable state (per-REQ status `pending`|`dispatched`|`done`, Runs
  record per dispatch with branch + prompt-file path + order text +
  pushed SHA + report tail, prompt files + orders saved under
  `.opencode/goal-loop/<slug>/prompts/` for byte-identical re-fire);
  orchestrator commits AND pushes the goal branch after every manifest
  mutation; no-redo invariant (pushed proof moves a REQ forward, never
  backward). New sec. 8: on any goal turn with an existing manifest
  (user says "continue" or re-runs `/goal` after a restart) read the
  manifest, fetch origin, reconcile non-done REQs (pushed branch means
  verify + integrate per LAND, absent/empty means re-fire the saved
  prompt verbatim), continue from the first non-done REQ, report a
  resume summary (recovered X, re-fired Y, redone: nothing or fail
  loudly). Attended only: no schedules/services/watchers/polling or
  retries. DONE still requires the `Landed:` proof.

- `watch/` 0.1.4: working spinner swaps badge (green dot removed);
  self-update one-shot check + modal + install (one-shot, no intervals).

- `goal-loop`: LAND phase (SKILL.md new sec. 7): solo flow merges locally,
  pushes, proves - no PRs (no protection, no PR CI to gate on).
  Orchestrator: fetch origin, merge each worker branch into local `main`
  with `--no-ff` one at a time (green suite after each; resolve +
  re-verify on conflict), push main, prove (`ls-remote origin main` SHA
  equals local `main` + every worker commit contained in `origin/main`),
  remove TEMP worktrees. Report DONE gains `Landed:` line (origin/main
  SHA, local==remote proof, tag/release state). Workers still branch-only;
  tags pushed only when the goal says publish.

- `watch/` 0.1.3: chat fixes (chronological order, true-bottom follow,
  centered dot, badges + WIP pulse).

- `watch/` 0.1.2: Dispatch renamed to Watch (title, productName,
  `ai.watch.app` identifier, npm + Cargo names) + release actions past
  Node 20 (checkout/setup-node v5, action-gh-release v3).

- `watch/` 0.1.1: chat list polish (session cards, live badge, WIP
  indicators, dead CSS pruned) + refreshed `docs/watch.png` showcase shot.

- `watch/`: promote release workflow to repo root as
  `.github/workflows/watch-release.yml` (scoped to `watch/`, triggers on
  `watch-v*` tags + `workflow_dispatch`); delete the watch-subdir `.github`
  dir.
  Version trio stays `0.1.0`; first release tag `watch-v0.1.0` is a later
  manual human step. Unsigned Windows `.exe` (+ MSI) on the GitHub Release.
- `watch/`: optional attended worker-chat watcher (cut-down dispatch
  `feat/watch-only`: session list + SessionChat, Tauri shell kept,
  Board/GitHub/vision/scripts removed). Run via `watch/docs/WATCH.md`;
  not part of global install.

- Proved: driver loop runs dispatch-to-DONE with zero manual continues (smoke SDRV, single REQ, verify-after-run green first try).

## [0.1.0] — 2026-10-13

- Initial `goal-loop` skill, `/goal` command, `goal-orch` / `goal-worker`
  agents (all `task`/subagent denied, foreground `opencode run` only).
- `Install-GoalLoop.ps1`: git clone/pull source + copy to global paths.
