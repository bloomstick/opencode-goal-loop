# Changelog

## [Unreleased]

- `goal-supervisor`: re-fire carries manifest Attachments (correction,
  2026-10-15): the AF1 entry below wrongly said no supervisor change
  was needed - but the re-fired ORCHESTRATOR starts blind, so the
  supervisor now appends the manifest Attachments `-f` set to its
  `opencode run` re-fire (shared arg builder feeds DryRun display and
  the real call alike); missing files are skipped with an
  `ATTACH-MISSING` evidence line while the `-f` set keeps the rest,
  and the orchestrator reconciles per manifest on arrival. Skill sec. 4
  + sec. 5 lines fixed to match.

- `goal-loop`: attachment forward chain (REQ-01 AF1, 2026-10-15): the
  old dispatch (`-f <prompt-file>` only) dropped every user attachment;
  the orchestrator now records `/goal` user files as ORIGINAL absolute
  paths in the manifest Attachments block (one per line, `none` when
  empty, no copies) and forwards each as a repeat `-f` AFTER
  `-f <prompt-file>` in manifest order, with the exact `files:` set in
  the Runs record reproduced byte-identical on every re-fire and RESUME
  (a missing file is evidence per sec. 2 step 5, never silent; attached
  paths are editable for that dispatch, even outside the repo, while the
  allowed-files list still governs the rest; supervisor path unchanged:
  it re-invokes the orchestrator, which re-reads the manifest).

- `goal-loop`: tiny-task fast path (user order 2026-10-14): the
  orchestrator MAY execute a requirement inline with no worker iff all
  tiny caps hold (at most 2 allow-listed files, ~30 added lines, no
  cross-file hunt, inline verification under ~10 min, nothing touching
  live machine state), with the same bar (manifest `inline:` Runs
  line, commit + push, verified proof, SLOC); past ~15 min or past any
  cap it MUST dispatch a worker instead. Sec. 0 + agent file point at
  sec. 2 step 4; NEVER list and budgets unchanged.

- `goal-sup`: PATH shim + installer PATH ensure (REQ-01, 2026-10-14):
  new `scripts/goal-supervisor/goal-sup.cmd` forwards all args to the
  global `Get-GoalSupervisors.ps1`; the installer appends the global
  supervisor dir to the USER PATH once (idempotent, no admin) and
  prints one PATH line plus a restart-shell note. After install
  (re-run once): `goal-sup [-Tail n] [-Slug name]` from anywhere.

- `goal-supervisor`: status command (REQ-01, 2026-10-14):
  `scripts/goal-supervisor/Get-GoalSupervisors.ps1` answers "are my
  supervisors running": one block per `goal-supervisor-*` task (State /
  LastRunTime / LastTaskResult / NextRunTime + box EndBoundary,
  manifest REQ counts, state fields, last `-Tail` log lines) with one
  verdict per goal (STALE / RUNNING / IDLE-DISABLED / FAILING / QUIET).
  Read-only; ships globally via the existing installer deploy block
  (`scripts/goal-supervisor/*`, zero installer changes). Run form
  `powershell -NoProfile -File
  ~/.config/opencode/goal-supervisor/Get-GoalSupervisors.ps1`; proofs:
  two DISABLED probes via the product Register script (fresh-log goal
  RUNNING with done:1, removed-RepoRoot goal STALE), `-Slug` filter,
  empty machine prints `no supervisors registered`; probes + fixture
  removed with zero residue. See `docs/crash-log-harness.md` sec. 6.

- `Install-GoalLoop.ps1`: deploy supervisor scripts globally (REQ-01,
  2026-10-14): installer copies `scripts/goal-supervisor/*` to the
  global copy `~/.config/opencode/goal-supervisor/` after the skills
  copy (same `-Force` style, one SUPERVISOR line, always overwrite:
  scripts are product code, no keep-existing logic); skill sec. 0
  exception + sec. 2 arm rules and harness sec. 6 now resolve the
  Register script via the global copy, else repo
  `scripts/goal-supervisor/` (standing-orders pattern).

- `goal-supervisor`: tighten cadence to 1-min ticks + 3-min stall
  (REQ-01, 2026-10-14): Register `-IntervalMinutes` default 5 -> 1
  (2 h box, Disabled default, exec cap, IgnoreNew unchanged);
  Invoke `-StallMinutes` default 15 -> 3 (comment + param only);
  harness sec. 6 defaults line now 1 min / 2 h. Worst-case
  stop-to-refire drops from the old ~20-minute bound to ~4 min. GAP threshold logic
  unchanged (3x interval): with 1-min ticks a missed-run gap trips at 3 min.
   Alignment (REQ-02, 2026-10-14): Register forwards `-IntervalMinutes` in the
   task Arguments and Invoke `-IntervalMinutes` default is now 1, so one number
   governs ticks and the 3 min GAP threshold end to end.

- `goal-supervisor`: live-fire e2e in contained fixture (REQ-02 GS2,
  2026-10-14): Temp repo `e2e-live` + local bare origin, one-goal
  `probelive` manifest STALL-aged; task `goal-supervisor-probelive`
  armed `-Enable -IntervalMinutes 1 -BoxHours 1` (exec cap tightened
  PT1H -> PT15M one-off). Chain observed: STALL -> REFIRE exit 0 ->
  worker marker + `feat/probe-w1` on local origin -> DONE on fixture
  main -> post-DONE NOOP; then task unregistered (verified absent) and
  fixture dirs removed. See `docs/crash-log-harness.md` sec. 6 e2e
  section. Zero product impact.

- `goal-loop`: arm-at-start rule + Register working directory (REQ-01):
  skill sec. 2 gains the arm-at-start rule (after the manifest is
  written + pushed the orchestrator MAY arm the EXTERNAL supervisor
  with the same Register call + stated box, task + box in Runs/Log +
  report; idempotent via unregister-first; disarm-at-terminal and
  never-arm-on-awaiting-input unchanged; same GOALAUTO sec. 0
  exception, no new autonomy); Register script gains
  `-WorkingDirectory` (defaults to the RepoRoot value, passed to the
  task action so a re-fired run starts in the repo); one-line
  `goal-orch` + harness sec. 6 pointers.

- `goal-loop`: full auto-arm wiring (REQ-03, GOALAUTO ban-lift per user
  order 2026-10-14): skill sec. 0 gains the ONLY exception (orchestrator
  MAY register + enable the EXTERNAL supervisor at a wrap-up with
  actionable non-blocked non-awaiting REQs in flight, with a stated time
  box via `Register-GoalSupervisor.ps1 -Enable`, and MUST unregister it
  at any terminal wrap-up DONE / `blocked` / `blocked-transient`; every
  other ban stands); sec. 2 wrap-up gains the arm/disarm rules (task name
  + box in Runs/Log + report; terminal disarm recorded + reported);
  every stale absolute (`never schedules`, `nothing keeps running`,
  `RESUME is the only restart path`, `never adds autonomy`) now points at
  the exception; workers still NEVER arm (orchestrator-only). Standing
  orders NEVER list + `goal-orch` never-schedule line carry the same
  pointer; harness sec. 4 + sec. 6 carry the arm/disarm protocol
  (never arm on `awaiting-input`; Disabled default starts nothing).
  No `scripts/` changes.

- `goal-supervisor`: boot-gap crash collector (REQ-02): `lastCheckUtc`
  tracked in `supervisor-state.json` on every run including NOOP with
  new `-IntervalMinutes` (default 5, matches the Register script); a
  gap over 3x the interval appends one GAP stub (last check + gap
  length + server-log window pointer, never a crash claim) and continues
  the normal pass; a failed `opencode run` re-fire (launch exception or
  non-zero/null exit) appends one SERVER-DOWN stub, advances cooldown,
  consumes no MaxAttempts budget, and never self-disables on consecutive
  SERVER-DOWNs. Collector stubs feed the harness sec. 3 incident
  protocol (human pulls the server-log window and files the verdict).
  No autonomy beyond the existing bounded re-fire; sec. 0 ban stands.
- `goal-loop`: awaiting-input status (REQ-01): new per-REQ `awaiting-input`
  state for a turn parked on a human-only question (skill sec. 5: ONLY the
  human answer clears it back to `dispatched` with a new Runs entry, never
  auto re-fired, never silently converted to/from `blocked`;
  checkbox `- [ ]`); sec. 8 RESUME reconciles it as NOOP (skip, never
  re-fire, never integrate, counted as `awaiting: <n>` in the resume
  summary); the external supervisor parks the whole goal as NOOP
  (`reason=awaiting-input awaiting:<n>`) while any REQ awaits input;
  one-line `goal-orch` note. No autonomy added: sec. 0 ban stands.

- `goal-loop`: external supervisor experiment (GOALAUTO, ban stands):
  `scripts/goal-supervisor/` holds an out-of-server Windows Scheduled
  Task watchdog (manifest + git stall detection, bounded re-fire via
  foreground `opencode run` as a task child, cooldown + attempt caps +
  self-disable, per-goal `supervisor.log` wired into the harness
  incident protocol). Registers DISABLED with 5 min / 2 h box; proofs:
  dry-run STALL/COOLDOWN/NOOP + registration round-trip with zero
  residue. No skill/agent/installer edits.

- `goal-loop`: crash-log harness (`docs/crash-log-harness.md`,
  observation only): debuggable environment for any future automation
  experiment without lifting sec. 0. Verified Windows log locations
  (live server log, per-shell outputs, snapshots, legacy
  `.opencode/goals` locks, plugin cache), grep-backed signatures
  (plugin load repeats, spawned powershell children, 53-line
  deleted-worktree snapshot WARN burst observed 2026-10-14), per-event
  incident protocol (UTC window, run-id correlation, git-vs-origin
  state, verdict bucket), and guardrails (time box, kill switch,
  rollback criteria). No processes, no schedules, no watchers.

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
