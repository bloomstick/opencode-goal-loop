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
  background children are banned by sec. 0.
- Rollback criteria, evaluated in order: (a) crash with a signature
  matching sec. 2 -> restore prohibition, keep this file as evidence;
  (b) crash inside the OpenCode server binary -> upstream-only, same
  outcome; (c) time box expires crash-free -> propose the next bounded
  step, still no standing autonomy.
- NOTHING in this file authorizes standing orders beyond the skill:
  `standing-orders.md` still cannot list anything sec. 0 forbids.

## 5. Kill-switch statement (this change)

No processes started, none running from this work. Two files changed:
this doc + CHANGELOG entry. Branch only, no tags, no workflow runs.

## 6. External supervisor (REMOVED 2026-10-15, REQ-01 full supervisor delete)

The GOALAUTO supervisor experiment is OVER by user order 2026-10-15:
it caused real harm (3 PC-killing supervisor pile-ons) and answered a
question the user never asked. scripts/goal-supervisor/
(Invoke-GoalSupervisor.ps1, Register-GoalSupervisor.ps1,
Get-GoalSupervisors.ps1, goal-sup.cmd) is DELETED, as are the installer
supervisor deploy + PATH blocks and every skill/agent arm/disarm rule.
A non-terminal wrap-up with work in flight now reports + waits for the
human; nothing arms, nothing keeps running. Scheduled tasks named
goal-supervisor-* must not exist (verify with
Get-ScheduledTask -TaskName goal-supervisor-*).

History (non-normative): the supervisor lived OUTSIDE OpenCode as a
Windows Scheduled Task named goal-supervisor-<slug> (registered
DISABLED by default, 1 min interval, 2 h expiry), detected STALLs
(actionable REQs + 3 min quiet + 10 min cooldown, max 3 attempts), kept
per-goal supervisor.log + supervisor-state.json, and re-fired the
orchestrator via foreground opencode run. Past CHANGELOG entries and
the skill Appendix keep the full story; this section will not grow a
replacement (the follow-up foreground transcript checker owns that).