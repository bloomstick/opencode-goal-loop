# Get-GoalSupervisors.ps1 - read-only status for goal supervisor tasks.
#
# Answers "are my supervisors running": one block per goal-supervisor-*
# scheduled task with task status, manifest progress, supervisor state,
# and recent log output. This file only reads; it changes nothing.
#
# Run form (after install):
# powershell -NoProfile -File ~/.config/opencode/goal-supervisor/Get-GoalSupervisors.ps1
[CmdletBinding()]
param(
  [int]$Tail = 3,
  [string]$Slug = ''
)
$ErrorActionPreference = 'Stop'

$tasks = @()
try {
  $tasks = @(Get-ScheduledTask -TaskName 'goal-supervisor-*' -ErrorAction SilentlyContinue)
} catch {
  $tasks = @()
}
if ($tasks.Count -eq 0) { Write-Output 'no supervisors registered'; exit 0 }

$shown = 0
foreach ($t in $tasks) {
  $argText = ''
  try { $argText = ($t.Actions | Select-Object -First 1).Arguments } catch {}
  if ($null -eq $argText) { $argText = '' }

  $repo = ''
  $goalSlug = ''
  $interval = 1
  if ($argText -match '-RepoRoot\s+"([^"]+)"') { $repo = $Matches[1] }
  if ($argText -match '-Slug\s+"([^"]+)"') { $goalSlug = $Matches[1] }
  if ($argText -match '-IntervalMinutes\s+(\d+)') {
    try { $interval = [int]$Matches[1] } catch { $interval = 1 }
  }
  if ($interval -lt 1) { $interval = 1 }
  if ($Slug -ne '' -and $goalSlug -ne $Slug) { continue }
  $shown += 1

  $taskName = $t.TaskName
  $taskState = [string]$t.State

  $lastRun = ''
  $lastResult = ''
  $nextRun = ''
  try {
    $info = Get-ScheduledTaskInfo -TaskName $taskName -ErrorAction SilentlyContinue
    if ($null -ne $info) {
      $lastRun = [string]$info.LastRunTime
      $lastResult = [string]$info.LastTaskResult
      $nextRun = [string]$info.NextRunTime
    }
  } catch {}

  $boxEnd = ''
  try {
    foreach ($tr in @($t.Triggers)) {
      try {
        $eb = [string]$tr.EndBoundary
        if ($eb -ne '') { $boxEnd = $eb; break }
      } catch {}
    }
  } catch {}

  $goalDir = ''
  if ($repo -ne '' -and $goalSlug -ne '') {
    $goalDir = Join-Path $repo ".opencode/goal-loop/$goalSlug"
  }
  $manifest = ''
  $logPath = ''
  $statePath = ''
  if ($goalDir -ne '') {
    $manifest = Join-Path $goalDir 'reqs-manifest.md'
    $logPath = Join-Path $goalDir 'supervisor.log'
    $statePath = Join-Path $goalDir 'supervisor-state.json'
  }

  Write-Output "=== goal $goalSlug ($taskName) ==="
  Write-Output "task: State=$taskState LastRunTime=$lastRun LastTaskResult=$lastResult NextRunTime=$nextRun"
  if ($boxEnd -ne '') { Write-Output "box: ends $boxEnd" } else { Write-Output 'box: no end boundary' }
  if ($repo -ne '') { Write-Output "repo: $repo" } else { Write-Output 'repo: unknown (no -RepoRoot in task Arguments)' }

  if ($manifest -ne '' -and (Test-Path $manifest)) {
    $counts = @{ done = 0; dispatched = 0; pending = 0; blocked = 0; 'blocked-transient' = 0; 'awaiting-input' = 0 }
    try {
      foreach ($l in (Get-Content $manifest)) {
        if ($l -match '^-\s*\[[ xX]\]\s*\S+.*status:\s*(\S+)') {
          $w = $Matches[1]
          if ($counts.ContainsKey($w)) { $counts[$w] += 1 }
        }
      }
    } catch {}
    Write-Output ("progress: done:" + $counts['done'] + " dispatched:" + $counts['dispatched'] + " pending:" + $counts['pending'] + " blocked:" + $counts['blocked'] + " blocked-transient:" + $counts['blocked-transient'] + " awaiting-input:" + $counts['awaiting-input'])
  } else {
    Write-Output 'progress: manifest missing'
  }

  if ($statePath -ne '' -and (Test-Path $statePath)) {
    $att = '?'; $lastAtt = '?'; $lastCheck = '?'
    try {
      $s = Get-Content $statePath -Raw | ConvertFrom-Json
      try { $att = [string]$s.attempts } catch {}
      try { $lastAtt = [string]$s.lastAttemptUtc } catch {}
      try { $lastCheck = [string]$s.lastCheckUtc } catch {}
    } catch {}
    Write-Output "state: attempts=$att lastAttemptUtc=$lastAtt lastCheckUtc=$lastCheck"
  } else {
    Write-Output 'state: no supervisor-state.json'
  }

  $fresh = $false
  if ($logPath -ne '' -and (Test-Path $logPath)) {
    try {
      $lw = (Get-Item $logPath).LastWriteTimeUtc
      $ageMin = (((Get-Date).ToUniversalTime()) - $lw).TotalMinutes
      if ($ageMin -le ($interval * 3)) { $fresh = $true }
    } catch {}
  }

  if ($logPath -ne '' -and (Test-Path $logPath)) {
    Write-Output "output: (last $Tail supervisor.log lines)"
    try {
      $n = $Tail
      if ($n -lt 0) { $n = 0 }
      if ($n -gt 0) {
        $lines = @(Get-Content $logPath -Tail $n)
        foreach ($ln in $lines) { Write-Output $ln }
      }
    } catch {}
  } else {
    Write-Output 'output: no supervisor.log'
  }

  $verdict = ''
  $reason = ''
  $repoGone = ($repo -eq '' -or -not (Test-Path $repo))
  $goalGone = ($goalDir -eq '' -or -not (Test-Path $goalDir))
  $failed = $false
  try { if ($lastResult -ne '' -and [long]$lastResult -ne 0) { $failed = $true } } catch {}
  if ($repoGone -or $goalGone) {
    $verdict = 'STALE'
    if ($repoGone) { $reason = "RepoRoot gone: $repo" } else { $reason = "goal dir gone: $goalDir" }
  } elseif ($fresh) {
    $verdict = 'RUNNING'
    $reason = 'log fresh within 3x tick'
  } elseif ($taskState -eq 'Disabled') {
    $verdict = 'IDLE-DISABLED'
    $reason = 'task Disabled'
  } elseif ($failed) {
    $verdict = 'FAILING'
    $reason = "LastTaskResult $lastResult"
  } else {
    $verdict = 'QUIET'
    $reason = 'log staler than 3x tick (box expiry or sleeping machine)'
  }
  Write-Output "verdict: $verdict ($reason)"
  Write-Output ''
}
if ($shown -eq 0) {
  if ($Slug -ne '') { Write-Output "no supervisors match slug '$Slug'" }
  else { Write-Output 'no supervisors registered' }
}
exit 0
