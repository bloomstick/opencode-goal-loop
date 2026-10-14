# Invoke-GoalSupervisor.ps1 - EXPERIMENTAL external goal watchdog (GOALAUTO).
#
# Runs as a Windows Scheduled Task OUTSIDE the OpenCode server (that is the
# whole point: a server-held watcher dies in the restart it should fix, and
# server-held background children are the documented 2026-10-12 crash
# vector). It never queries server internals; it only reads git + the goal
# manifest, then re-invokes the orchestrator foreground as a task child.
#
# Stall rule: manifest has actionable REQs (pending/dispatched, never
# blocked/done/awaiting-input) AND no manifest/branch activity for
# StallMinutes AND no supervisor attempt inside CooldownMinutes AND
# attempts < MaxAttempts AND no REQ awaiting human input. Any
# awaiting-input REQ parks the whole goal: the supervisor exits NOOP
# reporting awaiting:<n> until the human answer clears it per skill
# sec. 5 (RESUME on a human turn still proceeds per-REQ per sec. 8).
# Otherwise it exits NOOP (a quiet run is the expected steady state).
#
# Collectors (REQ-02, feed docs/crash-log-harness.md sec. 3): a gap
# detector records missed supervisor runs, and a failed-refire record
# records a down server. Both append incident stubs to supervisor.log.
# A gap is NOT a crash claim: it only means this script did not run.
#
# Safety: bounded attempts with self-disable, task-level ExecutionTimeLimit
# + IgnoreNew set by Register-GoalSupervisor.ps1, everything appended to
# supervisor.log next to the manifest. Does NOT edit the skill; sec. 0 ban
# stands for all in-server behavior.
[CmdletBinding()]
param(
  [Parameter(Mandatory=$true)][string]$RepoRoot,
  [Parameter(Mandatory=$true)][string]$Slug,
  [string]$TaskName = '',
  [int]$StallMinutes = 15,
  [int]$CooldownMinutes = 10,
  [int]$MaxAttempts = 3,
  [int]$IntervalMinutes = 5,
  [string]$Agent = 'goal-orch',
  [switch]$DryRun
)
$ErrorActionPreference = 'Stop'

$goalDir   = Join-Path $RepoRoot ".opencode/goal-loop/$Slug"
$manifest  = Join-Path $goalDir 'reqs-manifest.md'
$logPath   = Join-Path $goalDir 'supervisor.log'
$statePath = Join-Path $goalDir 'supervisor-state.json'

function SLog([string]$m) {
  $line = (Get-Date).ToUniversalTime().ToString('o') + ' supervisor ' + $m
  try { Add-Content -Path $logPath -Value $line } catch {}
  Write-Output $line
}

function LoadState() {
  if (Test-Path $statePath) {
    try { return (Get-Content $statePath -Raw | ConvertFrom-Json) } catch {}
  }
  return [pscustomobject]@{ attempts = 0; lastAttemptUtc = '1970-01-01T00:00:00Z'; lastCheckUtc = '1970-01-01T00:00:00Z' }
}

function SaveState([object]$s) {
  try { $s | ConvertTo-Json | Set-Content -Path $statePath } catch {}
}

function TouchCheck([object]$s, [datetime]$t) {
  try { $s | Add-Member -NotePropertyName 'lastCheckUtc' -NotePropertyValue ($t.ToString('o')) -Force } catch {}
}

$state = LoadState
$attempts = [int]$state.attempts
$lastAttempt = [datetime]$state.lastAttemptUtc
$now = (Get-Date).ToUniversalTime()

# REQ-02a gap detector: 3x IntervalMinutes with no supervisor run means the
# machine or the task was down. A gap is NOT a crash claim: it records only
# that this script did not run in the window. Epoch/missing lastCheckUtc
# means first run or pre-collector state: initialize silently, no stub.
$gapThresholdMin = ($IntervalMinutes * 3)
$lastCheckRaw = $null
try { $lastCheckRaw = $state.lastCheckUtc } catch {}
$haveLastCheck = $false
$lastCheck = [datetime]'1970-01-01T00:00:00Z'
if ($lastCheckRaw -ne $null -and ("$lastCheckRaw") -ne '') {
  try { $lastCheck = ([datetime]("$lastCheckRaw")).ToUniversalTime(); $haveLastCheck = $true } catch { $haveLastCheck = $false }
}
if ($haveLastCheck -and $lastCheck.Year -gt 1970) {
  $gapMin = ($now - $lastCheck).TotalMinutes
  if ($gapMin -gt $gapThresholdMin) {
    SLog ("GAP slug=" + $Slug + " lastCheck=" + $lastCheck.ToString('o') + " gapMin=" + [math]::Round($gapMin,1) + " thresholdMin=" + $gapThresholdMin + " note=supervisor did not run in window (no crash claimed) see C:\Users\frnd\.local\share\opencode\log\opencode.log window per harness sec 3")
  }
}
TouchCheck $state $now
SaveState $state

if (-not (Test-Path $manifest)) { SLog "NOOP slug=$Slug reason=no-manifest"; TouchCheck $state $now; SaveState $state; exit 0 }

# Activity: last manifest commit if this is a repo, else file mtime.
$lastActivity = (Get-Item $manifest).LastWriteTimeUtc
try {
  git -C $RepoRoot fetch origin --quiet 2>$null
  $ts = git -C $RepoRoot log -1 --format=%ct -- $manifest 2>$null
  if ($ts -match '^\d+$') {
    $ct = ([datetime]'1970-01-01T00:00:00Z').AddSeconds([double]$ts)
    if ($ct -gt $lastActivity) { $lastActivity = $ct }
  }
} catch {}

$actionable = @()
$awaiting = 0
foreach ($l in (Get-Content $manifest)) {
  if ($l -match '^-\s*\[\s\]\s*(REQ-\d+).*status:\s*(\S+)') {
    if ($Matches[2] -eq 'pending' -or $Matches[2] -eq 'dispatched') {
      $actionable += ($Matches[1] + ':' + $Matches[2])
    } elseif ($Matches[2] -eq 'awaiting-input') {
      $awaiting += 1
    }
  }
}

$idleMin = ($now - $lastActivity.ToUniversalTime()).TotalMinutes
$sinceAttemptMin = ($now - $lastAttempt.ToUniversalTime()).TotalMinutes

if ($awaiting -gt 0) { SLog ("NOOP slug=" + $Slug + " reason=awaiting-input awaiting:" + $awaiting + " actionable:" + $actionable.Count + " (parked: human input pending, nothing re-fired)"); TouchCheck $state $now; SaveState $state; exit 0 }
if ($actionable.Count -eq 0) { SLog "NOOP slug=$Slug reason=nothing-actionable"; TouchCheck $state $now; SaveState $state; exit 0 }
if ($idleMin -lt $StallMinutes) {
  SLog ("NOOP slug=" + $Slug + " reason=active idleMin=" + [math]::Round($idleMin,1))
  TouchCheck $state $now; SaveState $state
  exit 0
}
if ($sinceAttemptMin -lt $CooldownMinutes) {
  SLog ("NOOP slug=" + $Slug + " reason=cooldown attempts=" + $attempts)
  TouchCheck $state $now; SaveState $state
  exit 0
}
if ($attempts -ge $MaxAttempts) {
  SLog ("NOOP slug=" + $Slug + " reason=cap-reached attempts=" + $attempts)
  if ($TaskName -ne '') {
    try { Disable-ScheduledTask -TaskName $TaskName | Out-Null } catch {}
    SLog ("SELF-DISABLE task=" + $TaskName)
  }
  TouchCheck $state $now; SaveState $state
  exit 0
}

$reqs = ($actionable -join ',')
$order = "continue goal $Slug ($RepoRoot)"
SLog ("STALL slug=" + $Slug + " reqs=" + $reqs + " idleMin=" + [math]::Round($idleMin,1) + " attempt=" + ($attempts + 1) + "/" + $MaxAttempts)

if ($DryRun) { SLog ("DRYRUN would run: opencode run --auto --agent " + $Agent + " """ + $order + """"); TouchCheck $state $now; SaveState $state; exit 0 }

# REQ-02b SERVER-DOWN condition: the refire child failed to launch (catch
# path, code stays -1) OR exited with a null code (treated as -1) OR exited
# non-zero. Any of these signals the server is down, not that the goal
# failed. A down server consumes NO MaxAttempts budget; lastAttemptUtc still
# advances so cooldown gates the next retry. Consecutive SERVER-DOWNs never
# self-disable, so recovery stays possible.
$code = -1
$launchFailed = $false
try {
  & opencode run --auto --agent $Agent $order
  $code = $LASTEXITCODE
} catch { $code = -1; $launchFailed = $true }
$isDown = $false
if ($launchFailed) { $isDown = $true }
elseif ($code -eq $null) { $code = -1; $isDown = $true }
elseif ([int]$code -ne 0) { $isDown = $true }
if ($isDown) {
  SLog ("SERVER-DOWN slug=" + $Slug + " exit=" + $code + " reqs=" + $reqs + " attempts=" + $attempts + " note=refire launch failed or non-zero exit (server down, budget unconsumed) cooldown applies, next cycle retries; see C:\Users\frnd\.local\share\opencode\log\opencode.log window per harness sec 3")
  $state.lastAttemptUtc = $now.ToString('o')
  TouchCheck $state $now
  SaveState $state
  exit 0
}
SLog ("REFIRE exit=" + $code + " reqs=" + $reqs)

$state.attempts = $attempts + 1
$state.lastAttemptUtc = $now.ToString('o')
TouchCheck $state $now
SaveState $state
$attempts = $state.attempts
if ($attempts -ge $MaxAttempts -and $TaskName -ne '') {
  try { Disable-ScheduledTask -TaskName $TaskName | Out-Null } catch {}
  SLog ("SELF-DISABLE task=" + $TaskName + " reason=cap-reached")
}
exit 0
