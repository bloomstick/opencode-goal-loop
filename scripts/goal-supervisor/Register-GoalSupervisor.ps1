# Register-GoalSupervisor.ps1 - EXPERIMENTAL (GOALAUTO). Registers the
# external supervisor as a Windows Scheduled Task running OUTSIDE OpenCode.
#
# Defaults ship DISABLED: registration alone starts nothing. Enable only
# when a live goal exists, with a time box. Stop/remove any time with the
# command printed at the end. Never point this at a repo without reading
# docs/crash-log-harness.md sec. 4 + sec. 6 first.
[CmdletBinding()]
param(
  [Parameter(Mandatory=$true)][string]$RepoRoot,
  [Parameter(Mandatory=$true)][string]$Slug,
  [int]$IntervalMinutes = 1,
  [int]$BoxHours = 2,
  [switch]$Enable,
  [string]$WorkingDirectory = ""
)
$ErrorActionPreference = 'Stop'
if ([string]::IsNullOrEmpty($WorkingDirectory)) { $WorkingDirectory = $RepoRoot }

$taskName = "goal-supervisor-$Slug"
$worker = Join-Path $PSScriptRoot 'Invoke-GoalSupervisor.ps1'
if (-not (Test-Path $worker)) { throw "supervisor script missing: $worker" }

$arg = "-NoLogo -NoProfile -NonInteractive -ExecutionPolicy Bypass -File `"$worker`" -RepoRoot `"$RepoRoot`" -Slug `"$Slug`" -TaskName `"$taskName`" -IntervalMinutes $IntervalMinutes"
$action = New-ScheduledTaskAction -Execute 'powershell.exe' -Argument $arg -WorkingDirectory $WorkingDirectory
$trigger = New-ScheduledTaskTrigger -Once -At (Get-Date).AddMinutes(1) `
  -RepetitionInterval (New-TimeSpan -Minutes $IntervalMinutes) `
  -RepetitionDuration (New-TimeSpan -Hours $BoxHours)
$trigger.EndBoundary = (Get-Date).AddHours($BoxHours).ToString('s')
$settings = New-ScheduledTaskSettingsSet -ExecutionTimeLimit (New-TimeSpan -Hours 1) `
  -MultipleInstances IgnoreNew -StartWhenAvailable

try { Unregister-ScheduledTask -TaskName $taskName -Confirm:$false -ErrorAction SilentlyContinue } catch {}
Register-ScheduledTask -TaskName $taskName -Action $action -Trigger $trigger -Settings $settings | Out-Null
if (-not $Enable) { Disable-ScheduledTask -TaskName $taskName | Out-Null }

Get-ScheduledTask -TaskName $taskName | Select-Object TaskName, State
Write-Output "Box: every ${IntervalMinutes}min, expires $((Get-Date).AddHours($BoxHours).ToString('s'))"
Write-Output "Enable: Enable-ScheduledTask -TaskName $taskName"
Write-Output "Stop/remove: Unregister-ScheduledTask -TaskName $taskName -Confirm:`$false"
