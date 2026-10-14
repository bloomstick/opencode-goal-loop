# Crash-log harness (debuggable environment for automation experiments)

Status: observation ONLY. This file adds no processes, no schedules, no
watchers, no polling, no background work. It does NOT lift sec. 0 of the
`goal-loop` skill: the automation prohibition stands. Its job is to make
any future experiment falsifiable: if something crashes, the evidence is
already wired.

## 1. Log locations (Windows, verified 2026-10-14)

- Server log (live, structured `timestamp=... level=...` lines):
  `C:\Users\frnd\.local\share\opencode\log\opencode.log`
  (37 MB at time of writing; still being appended to).
- Per-shell outputs: `C:\Users\frnd\.local\share\opencode\shell\<id>\`
  (`sh_<id>.out` full text, `.log` file).
- Server snapshots: `C:\Users\frnd\.local\share\opencode\snapshot\<id>\`
  (one dir per session id).
- Legacy goal-plugin state (dead system, archaeology only - sec. 0 bans
  this design, do not revive it): `C:\Users\frnd\.opencode\goals\`
  (`state.json.lock`, `state.json.lock.claims-v2`, `state.json.sessions`).
- Plugin cache (where the crashing plugin loaded from):
  `C:\Users\frnd\.cache\opencode\npm\opencode-goal-plugin@0.11.0\`.

## 2. Verified signatures (grep evidence, bounded)

Run greps against the server log; counts below are dated 2026-10-14.

- Plugin load (skill preamble corroborated):
  `msg="loading plugin" id=opencode-goal-plugin@0.11.0`
  `entrypoint=file:///C:/Users/frnd/.cache/opencode/npm/...`
  Seen 2026-10-12T13:30:00Z and repeats (repeated loads = restarts).
  A sibling `media-tools` plugin loads from
  `C:\Users\frnd\.config\opencode\plugins\media-tools`.
- Spawned children (the 2026-10-12 restart vector):
  `message="spawning process" command="...WindowsPowerShell...powershell.EXE"`
  Server-held background children are the documented crash cause;
  any experiment that parents work under the server must count these
  lines before/after and treat growth without reaping as a red flag.
- Deleted-worktree snapshot failure (observed live 2026-10-14
  18:17-18:18 UTC, 53 lines):
  `level=WARN ... message="failed to capture snapshot" ... ENOENT ...
  work-goalresume`
  Meaning: the session's worktree was deleted out from under a live
  session. Lesson, not a crash: keep worktrees in durable paths
  (e.g. under `C:\Users\frnd\code`), never bare Temp, and push every
  mutation so deletion costs nothing (sec. 5 / sec. 8 rule).
- Day volume sanity anchor: 44,067 lines for `timestamp=2026-10-12`
  (the crash day); 10 lines match `restart` literally.

## 3. Incident protocol (fill in per event, commit it)

For ANY suspected crash/restart during an experiment, record:

1. UTC window (first bad line to recovery) + affected session/run ids
   (`run=<hex>` field correlates lines).
2. Last 20 server lines before the gap + first 20 after.
3. `spawning process` count in-window (unreaped children?).
4. Git state: goal branch tip vs `origin` (`git ls-remote origin
   <goal-branch>`), worker branch tips, manifest status lines.
5. Verdict: TRANSIENT (sec. 2 step 5 path), restart (sec. 8 path), or
   unknown (new signature -> extend sec. 2 table above, then decide).

## 4. Experiment guardrails (pre-authorized limits)

- Time box every automation run; state the box up front.
- Kill switch: no process outlives its experiment. Server-held
  background children are banned by sec. 0; an external supervisor
  (Task Scheduler / OS service, the only design that survives a
  restart) needs its own stop procedure documented BEFORE it starts.
- Rollback criteria, evaluated in order: (a) crash with a signature
  matching sec. 2 -> restore prohibition, keep this file as evidence;
  (b) crash inside the OpenCode server binary -> upstream-only, same
  outcome; (c) time box expires crash-free -> propose the next bounded
  step, still no standing autonomy.
- NOTHING in this file authorizes standing orders beyond the skill:
  `standing-orders.md` still cannot list anything sec. 0 forbids,
  except the GOALAUTO skill-sec-0 exception.
- Arm/disarm protocol (GOALAUTO, skill sec. 0 exception, user order
  2026-10-14): arm ONLY at a non-terminal wrap-up with actionable
  non-blocked non-awaiting REQs in flight, via
  Register-GoalSupervisor.ps1 with `-Enable` and a stated time box
  (defaults: 5 min interval, 2 h expiry); record task name + box in the
  manifest Runs/Log + report. Disarm at any terminal wrap-up (DONE /
  `blocked` / `blocked-transient`) via Unregister-ScheduledTask even if
  the box has not expired; record + report it. Never arm while any REQ
  is `awaiting-input` (the supervisor parks as NOOP). Registration
  alone (Disabled default) starts nothing.

## 5. Kill-switch statement (this change)

No processes started, none running from this work. Two files changed:
this doc + CHANGELOG entry. Branch only, no tags, no workflow runs.

## 6. External supervisor (GOALAUTO experiment, feat/goal-auto)

Design constraint, read first: a server-held watcher cannot work (dies
in the restart it should fix; server-held background children are the
2026-10-12 crash vector). The supervisor therefore lives OUTSIDE
OpenCode as a Windows Scheduled Task and only reads git + manifest.

- Scripts: `scripts/goal-supervisor/Invoke-GoalSupervisor.ps1`
  (detect + bounded re-fire + own logging + self-disable) and
  `scripts/goal-supervisor/Register-GoalSupervisor.ps1` (registers the
  task DISABLED by default, 5 min interval, 2 h expiry, 1 h execution
  cap, IgnoreNew so runs never pile up).
- Stall rule: actionable REQs (pending/dispatched only) + no
  manifest/branch activity for 15 min + 10 min cooldown + max 3
  attempts; anything else exits NOOP (quiet is the steady state).
- Per-goal runtime files (next to the manifest, feed sec. 3 above):
  `supervisor.log` (every decision line) and `supervisor-state.json`
  (attempts + last attempt; cap reached self-disables the task).
- Proofs on landing (synthetic fixture, dry-run): STALL detected with
  exact re-fire command, COOLDOWN respected, missing manifest NOOP;
  task registration verified Disabled then removed (zero residue).
- Enable ONLY against a live goal, inside a stated time box:
  `Enable-ScheduledTask -TaskName goal-supervisor-<slug>`
  Stop/remove any time:
  `Unregister-ScheduledTask -TaskName goal-supervisor-<slug> -Confirm:$false`
- Arm means register + enable with `-Enable` + stated box at a
  non-terminal wrap-up with work in flight; disarm means unregister at
  any terminal wrap-up (DONE / `blocked` / `blocked-transient`) even if
  the box has not expired. Both are recorded in the manifest Runs/Log
  and in the report (`Armed:` / `Disarmed:` lines per skill sec. 6).
- Arm-at-start: same Register call MAY arm right after the manifest push, with `-WorkingDirectory` defaulting to the repo root (idempotent).
- Explicit non-goals: no skill/agent/installer edits, sec. 0 ban
  stands, supervisor never touches server internals, and a crash in
  the OpenCode binary is upstream-only (rollback per sec. 4).

### Collector behavior (REQ-02 boot-gap crash collector)

- `lastCheckUtc` in `supervisor-state.json` is updated on EVERY run,
  including every NOOP. `-IntervalMinutes` (default 5, same default the
  Register script uses) sets the expected cadence.
- GAP stub: when now minus `lastCheckUtc` exceeds 3x the interval, the
  supervisor appends one `GAP slug=... lastCheck=... gapMin=...
  thresholdMin=...` line to `supervisor.log` and continues the normal
  pass. Language is exact: a gap means the supervisor did not run in
  the window, nothing more. It NEVER claims a crash. First run (epoch
  or missing `lastCheckUtc`) initializes silently with no stub.
- SERVER-DOWN stub: when the `opencode run` re-fire fails to launch
  (catch path) or exits non-zero/null, the supervisor appends one
  `SERVER-DOWN slug=... exit=... reqs=... attempts=...` line, advances
  `lastAttemptUtc` so cooldown gates the next retry, and does NOT
  consume MaxAttempts budget (a down server is not the goal's fault).
  Consecutive SERVER-DOWNs never self-disable, so recovery stays
  possible. A clean exit 0 still takes the normal REFIRE path with
  budget consumed.
- How the stubs feed sec. 3: each stub carries its UTC timestamp (log
  line prefix), the affected goal/slug, and a pointer to the server-log
  window `C:\Users\frnd\.local\share\opencode\log\opencode.log`. Manual
  follow-up per sec. 3 means: take the stub window, pull the last 20
  server lines before it plus the first 20 after, count `spawning
  process` lines in-window, record git-vs-origin state, then file the
  verdict (TRANSIENT / restart / unknown). The stubs start the paper
  trail; the human finishes it. No autonomy beyond the existing bounded
  re-fire; sec. 0 ban stands.
