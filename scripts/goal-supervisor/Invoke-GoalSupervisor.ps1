# Invoke-GoalSupervisor.ps1 - EXPERIMENTAL external goal watchdog (GOALAUTO).
#
# Runs as a Windows Scheduled Task OUTSIDE the OpenCode server (that is the
# whole point: a server-held watcher dies in the restart it should fix, and
# server-held background children are the documented 2026-10-12 crash
# vector). It never queries server internals; it only reads git + the goal
# manifest, then re-invokes the orchestrator foreground as a task child.
#
# Stall rule: manifest has actionable REQs (pending/dispatched, never
# blocked/done) AND no manifest/branch activity for StallMinutes AND no
# supervisor attempt inside CooldownMinutes AND attempts < MaxAttempts.
# Otherwise it exits NOOP (a quiet run is the expected steady state).
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
  return [pscustomobject]@{ attempts = 0; lastAttemptUtc = '1970-01-01T00:00:00Z' }
}

if (-not (Test-Path $manifest)) { SLog "NOOP slug=$Slug reason=no-manifest"; exit 0 }

$state = LoadState
$attempts = [int]$state.attempts
$lastAttempt = [datetime]$state.lastAttemptUtc

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
foreach ($l in (Get-Content $manifest)) {
  if ($l -match '^-\s*\[\s\]\s*(REQ-\d+).*status:\s*(\S+)') {
    if ($Matches[2] -eq 'pending' -or $Matches[2] -eq 'dispatched') {
      $actionable += ($Matches[1] + ':' + $Matches[2])
    }
  }
}

$now = (Get-Date).ToUniversalTime()
$idleMin = ($now - $lastActivity.ToUniversalTime()).TotalMinutes
$sinceAttemptMin = ($now - $lastAttempt.ToUniversalTime()).TotalMinutes

if ($actionable.Count -eq 0) { SLog "NOOP slug=$Slug reason=nothing-actionable"; exit 0 }
if ($idleMin -lt $StallMinutes) {
  SLog ("NOOP slug=" + $Slug + " reason=active idleMin=" + [math]::Round($idleMin,1))
  exit 0
}
if ($sinceAttemptMin -lt $CooldownMinutes) {
  SLog ("NOOP slug=" + $Slug + " reason=cooldown attempts=" + $attempts)
  exit 0
}
if ($attempts -ge $MaxAttempts) {
  SLog ("NOOP slug=" + $Slug + " reason=cap-reached attempts=" + $attempts)
  if ($TaskName -ne '') {
    try { Disable-ScheduledTask -TaskName $TaskName | Out-Null } catch {}
    SLog ("SELF-DISABLE task=" + $TaskName)
  }
  exit 0
}

$reqs = ($actionable -join ',')
$order = "continue goal $Slug ($RepoRoot)"
SLog ("STALL slug=" + $Slug + " reqs=" + $reqs + " idleMin=" + [math]::Round($idleMin,1) + " attempt=" + ($attempts + 1) + "/" + $MaxAttempts)

if ($DryRun) { SLog ("DRYRUN would run: opencode run --auto --agent " + $Agent + " """ + $order + """"); exit 0 }

$code = -1
try {
  & opencode run --auto --agent $Agent $order
  $code = $LASTEXITCODE
} catch { $code = -1 }
SLog ("REFIRE exit=" + $code + " reqs=" + $reqs)

$state.attempts = $attempts + 1
$state.lastAttemptUtc = $now.ToString('o')
$state | ConvertTo-Json | Set-Content -Path $statePath
$attempts = $state.attempts
if ($attempts -ge $MaxAttempts -and $TaskName -ne '') {
  try { Disable-ScheduledTask -TaskName $TaskName | Out-Null } catch {}
  SLog ("SELF-DISABLE task=" + $TaskName + " reason=cap-reached")
}
exit 0
