# Get-GoalSupervisors.ps1 - read-only status for goal supervisor tasks.
#
# Answers "are my supervisors running": one block per goal-supervisor-*
# scheduled task with task status, manifest progress, supervisor state,
# and recent log output. This file only reads; it changes nothing.
#
# Readable display (REQ-01): local times (HH:MM + age, never raw UTC,
# never epoch), translated result codes, reasons and progress in words,
# box countdown, and a RE-FIRING verdict when a nested recovery run is
# in flight (last REFIRE-START with no later REFIRE exit= or
# SERVER-DOWN). Raw codes stay in parentheses where cheap; nothing else
# is dropped, only translated.
#
# Run form (after install):
# powershell -NoProfile -File ~/.config/opencode/goal-supervisor/Get-GoalSupervisors.ps1
[CmdletBinding()]
param(
  [int]$Tail = 3,
  [string]$Slug = ''
)
$ErrorActionPreference = 'Stop'

function Get-AgeMin([datetime]$utc) {
  return (((Get-Date).ToUniversalTime()) - $utc.ToUniversalTime()).TotalMinutes
}

function Get-DurWords([double]$minutes) {
  $m = [math]::Floor([math]::Abs($minutes) + 0.5)
  if ($m -lt 60) { return ($m.ToString() + ' min') }
  $h = [math]::Floor($m / 60)
  $r = $m - ($h * 60)
  if ($h -lt 48) { return ($h.ToString() + 'h ' + $r.ToString() + 'm') }
  $d = [math]::Floor($h / 24)
  $hr = $h - ($d * 24)
  return ($d.ToString() + 'd ' + $hr.ToString() + 'h')
}

function Show-Past([object]$raw) {
  if ($raw -eq $null -or ("$raw") -eq '') { return 'never' }
  try {
    $dt = ([datetime]("$raw")).ToUniversalTime()
  } catch { return 'unknown' }
  if ($dt.Year -lt 2000) { return 'never' }
  $age = (((Get-Date).ToUniversalTime()) - $dt).TotalMinutes
  if ($age -lt 0) { $age = 0 }
  return ($dt.ToLocalTime().ToString('HH:mm') + ' local (' + (Get-DurWords $age) + ' ago)')
}

function Show-Next([object]$raw) {
  if ($raw -eq $null -or ("$raw") -eq '') { return 'unknown' }
  try {
    $dt = ([datetime]("$raw"))
  } catch { return 'unknown' }
  if ($dt.Year -lt 2000 -or $dt.Year -ge 2200) { return 'unknown' }
  $loc = $dt
  if ($dt.Kind -eq [System.DateTimeKind]::Utc) { $loc = $dt.ToLocalTime() }
  $hhmm = $loc.ToString('HH:mm')
  try {
    $diffMin = ($dt.ToUniversalTime() - (Get-Date).ToUniversalTime()).TotalMinutes
  } catch { return ($hhmm + ' local') }
  if ($diffMin -ge 0) { return ($hhmm + ' local (in ' + (Get-DurWords $diffMin) + ')') }
  return ($hhmm + ' local (' + (Get-DurWords $diffMin) + ' ago)')
}

function Get-ResultWords([string]$code) {
  if ($code -eq $null -or $code -eq '') { return 'unknown' }
  if ($code -eq '0') { return 'ok' }
  if ($code -eq '267011') { return 'never ran' }
  return ('failed, code ' + $code + ' - see the log tail below')
}

function Convert-Stamps([string]$s) {
  $pat = '\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?Z'
  $out = $s
  $guard = 0
  while ($guard -lt 20 -and ($out -match '(' + $pat + ')')) {
    $raw = $Matches[1]
    $rep = $raw
    try {
      $dt = ([datetime]$raw).ToUniversalTime()
      if ($dt.Year -gt 1970) { $rep = $dt.ToLocalTime().ToString('HH:mm') + ' local' }
      else { $rep = 'never' }
    } catch {}
    $idx = $out.IndexOf($raw)
    if ($idx -lt 0) { break }
    $out = $out.Substring(0, $idx) + $rep + $out.Substring($idx + $raw.Length)
    $guard += 1
  }
  $out = [regex]::Replace($out, '(idleMin|gapMin|thresholdMin)=(\d+)(\.\d+)?', {
    param($m)
    try {
      $v = [math]::Floor([double]$m.Groups[2].Value + $m.Groups[3].Value + 0.5)
      return ($m.Groups[1].Value + '=' + $v.ToString() + ' min')
    } catch { return $m.Value }
  })
  return $out
}

function Convert-LogLine([string]$ln) {
  if ($ln -match '^(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?Z)\s*(.*)$') {
    $raw = $Matches[1]
    $body = Convert-Stamps $Matches[3]
    try {
      $ts = ([datetime]$raw).ToUniversalTime()
      if ($ts.Year -gt 1970) {
        $local = $ts.ToLocalTime().ToString('HH:mm')
        $age = Get-AgeMin $ts
        if ($age -lt 0) { $age = 0 }
        return ('[' + $local + ' local, ' + (Get-DurWords $age) + ' ago] ' + $body)
      }
    } catch {}
    return $body
  }
  return (Convert-Stamps $ln)
}

function Get-ReasonWords([string]$ln) {
  if ($ln -eq $null -or $ln -eq '') { return 'no ticks logged yet' }
  if ($ln -match 'reason=awaiting-input') { return 'parked: human input pending, nothing re-fired' }
  if ($ln -match 'reason=nothing-actionable') { return 'nothing actionable left' }
  if ($ln -match 'reason=cap-reached') { return 'attempt cap reached, supervisor stood down' }
  if ($ln -match 'reason=no-manifest') { return 'manifest missing' }
  if ($ln -match 'reason=cooldown') { return 'waiting before next retry (cooling down)' }
  if ($ln -match 'reason=active') { return 'workers busy, goal moving' }
  if ($ln -match 'REFIRE-START') { return 'recovery launch started' }
  if ($ln -match 'SERVER-DOWN') { return 'recovery launch failed (server down), retrying after cooldown' }
  if ($ln -match 'REFIRE exit=0') { return 'recovery finished ok' }
  if ($ln -match 'REFIRE exit=') { return 'recovery run ended' }
  if ($ln -match 'GAP') { return 'supervisor missed its window (machine or task was down)' }
  if ($ln -match 'STALL') {
    $idle = '?'
    if ($ln -match 'idleMin=([\d\.]+)') {
      try { $idle = ([math]::Floor([double]$Matches[1] + 0.5)).ToString() + ' min' } catch {}
    }
    return ('quiet ' + $idle + ', re-fired')
  }
  if ($ln -match 'DRYRUN') { return 'dry run only, nothing launched' }
  if ($ln -match 'ATTACH-MISSING') { return 'an attachment was missing, skipped with evidence' }
  if ($ln -match 'SELF-DISABLE') { return 'supervisor disabled its own task at cap' }
  return 'see the log tail below'
}

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

  $lastLine = ''
  try {
    if ($logPath -ne '' -and (Test-Path $logPath)) {
      $lastLine = @((Get-Content $logPath | Where-Object { $_ -ne '' }) | Select-Object -Last 1)
      if ($lastLine -is [array]) {
        if ($lastLine.Count -gt 0) { $lastLine = [string]$lastLine[-1] } else { $lastLine = '' }
      } else { $lastLine = [string]$lastLine }
    }
  } catch { $lastLine = '' }
  $lastWords = Get-ReasonWords $lastLine

  $resultWords = Get-ResultWords $lastResult
  Write-Output "=== goal $goalSlug ($taskName) ==="
  Write-Output ("task: " + $taskState + ", last run " + (Show-Past $lastRun) + ", result " + $resultWords + ", next run " + (Show-Next $nextRun))
  if ($boxEnd -ne '') {
    try { $bdt = ([datetime]$boxEnd) } catch { $bdt = $null }
    if ($bdt -eq $null -or $bdt.Year -le 1970) {
      Write-Output 'box: end boundary unreadable'
    } else {
      $bloc = $bdt
      if ($bdt.Kind -eq [System.DateTimeKind]::Utc) { $bloc = $bdt.ToLocalTime() }
      $hhmm = $bloc.ToString('HH:mm')
      try { $diff = ($bdt.ToUniversalTime() - (Get-Date).ToUniversalTime()).TotalMinutes } catch { $diff = 0 }
      if ($diff -ge 0) { Write-Output ("box: expires in " + (Get-DurWords $diff) + " (" + $hhmm + " local)") }
      else { Write-Output ("box: expired " + (Get-DurWords $diff) + " ago (" + $hhmm + " local)") }
    }
  } else { Write-Output 'box: no end boundary (runs until disabled)' }
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
    $parts = @()
    if ($counts['done'] -gt 0) { $parts += ($counts['done'].ToString() + ' done') }
    if ($counts['dispatched'] -gt 0) { $parts += ($counts['dispatched'].ToString() + ' in progress') }
    if ($counts['pending'] -gt 0) { $parts += ($counts['pending'].ToString() + ' waiting') }
    if ($counts['blocked'] -gt 0) { $parts += ($counts['blocked'].ToString() + ' blocked') }
    if ($counts['blocked-transient'] -gt 0) { $parts += ($counts['blocked-transient'].ToString() + ' transient-blocked') }
    if ($counts['awaiting-input'] -gt 0) { $parts += ($counts['awaiting-input'].ToString() + ' awaiting input') }
    if ($parts.Count -eq 0) { Write-Output 'progress: nothing yet (no REQs counted)' }
    else { Write-Output ('progress: ' + ($parts -join ', ')) }
  } else {
    Write-Output 'progress: manifest missing'
  }

  if ($statePath -ne '' -and (Test-Path $statePath)) {
    $att = '?'; $lastAtt = '?'; $lastCheck = '?'
    try {
      $s = Get-Content $statePath -Raw | ConvertFrom-Json
      try { $att = [string]$s.attempts } catch {}
      try { $lastAtt = Show-Past ([string]$s.lastAttemptUtc) } catch {}
      try { $lastCheck = Show-Past ([string]$s.lastCheckUtc) } catch {}
    } catch {}
    Write-Output "state: attempts=$att, last attempt $lastAtt, last check $lastCheck"
  } else {
    Write-Output 'state: no supervisor-state.json (no attempts recorded yet)'
  }

  $fresh = $false
  $lastTickWords = 'no ticks logged yet'
  if ($logPath -ne '' -and (Test-Path $logPath)) {
    try {
      $lw = (Get-Item $logPath).LastWriteTimeUtc
      $ageMin = (((Get-Date).ToUniversalTime()) - $lw).TotalMinutes
      if ($ageMin -le ($interval * 3)) { $fresh = $true }
      if ($ageMin -lt 0) { $ageMin = 0 }
      $lastTickWords = $lw.ToLocalTime().ToString('HH:mm') + ' local (' + (Get-DurWords $ageMin) + ' ago)'
    } catch {}
  }

  if ($logPath -ne '' -and (Test-Path $logPath)) {
    Write-Output "output: (last $Tail supervisor.log lines, times local)"
    try {
      $n = $Tail
      if ($n -lt 0) { $n = 0 }
      if ($n -gt 0) {
        $lines = @(Get-Content $logPath -Tail $n)
        foreach ($ln in $lines) { Write-Output (Convert-LogLine ([string]$ln)) }
      }
    } catch {}
  } else {
    Write-Output 'output: no supervisor.log yet'
  }

  $refirePending = $false
  $refireSince = 'start time unreadable'
  try {
    if ($logPath -ne '' -and (Test-Path $logPath)) {
      $all = @(Get-Content $logPath)
      $lastStart = -1
      $lastDone = -1
      for ($i = 0; $i -lt $all.Count; $i++) {
        if (([string]$all[$i]) -match 'REFIRE-START') { $lastStart = $i }
        if (([string]$all[$i]) -match 'REFIRE exit=' -or ([string]$all[$i]) -match 'SERVER-DOWN') { $lastDone = $i }
      }
      if ($lastStart -ge 0 -and $lastStart -gt $lastDone) {
        $refirePending = $true
        $startLine = [string]$all[$lastStart]
        if ($startLine -match '^(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?Z)') {
          try {
            $sts = ([datetime]$Matches[1]).ToUniversalTime()
            if ($sts.Year -gt 1970) {
              $sage = Get-AgeMin $sts
              if ($sage -lt 0) { $sage = 0 }
              $refireSince = $sts.ToLocalTime().ToString('HH:mm') + ' local (' + (Get-DurWords $sage) + ' ago)'
            }
          } catch {}
        }
      }
    }
  } catch {}

  $verdict = ''
  $reason = ''
  $repoGone = ($repo -eq '' -or -not (Test-Path $repo))
  $goalGone = ($goalDir -eq '' -or -not (Test-Path $goalDir))
  $failed = $false
  try { if ($lastResult -ne '' -and [long]$lastResult -ne 0) { $failed = $true } } catch {}
  if ($repoGone -or $goalGone) {
    $verdict = 'STALE'
    if ($repoGone) { $reason = "repo folder missing: $repo" } else { $reason = "goal folder missing: $goalDir" }
  } elseif ($refirePending) {
    $verdict = 'RE-FIRING'
    $reason = "recovery run in flight since $refireSince - be patient"
  } elseif ($fresh) {
    $verdict = 'RUNNING'
    $reason = "log fresh, last tick $lastTickWords - $lastWords"
  } elseif ($taskState -eq 'Disabled') {
    $verdict = 'IDLE-DISABLED'
    $reason = "task Disabled, log quiet (last tick $lastTickWords) - nothing scheduled"
  } elseif ($failed) {
    $verdict = 'FAILING'
    $reason = $resultWords
  } else {
    $verdict = 'QUIET'
    $reason = "log quiet (last tick $lastTickWords) - box expiry or sleeping machine"
  }
  Write-Output "verdict: $verdict ($reason)"
  Write-Output ''
}
if ($shown -eq 0) {
  if ($Slug -ne '') { Write-Output "no supervisors match slug '$Slug'" }
  else { Write-Output 'no supervisors registered' }
}
exit 0
