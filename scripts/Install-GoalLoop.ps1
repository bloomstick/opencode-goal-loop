<#
.SYNOPSIS
    Install/update the goal-loop coding loop globally from its GitHub source.
.DESCRIPTION
    Clones bloomstick/opencode-goal-loop (or pulls if present), then copies
    commands/*.md -> global commands, agents/*.md -> global agents,
    skills/* -> global skills. Re-run to update. No symlinks, no plugins,
    no background state. Restart OpenCode after install/update.
.PARAMETER RepoUrl
    Source repo URL. Default: https://github.com/bloomstick/opencode-goal-loop.git
.PARAMETER SourceDir
    Local git clone path. Default: ~/.config/opencode/goal-loop
.EXAMPLE
    .\Install-GoalLoop.ps1
    .\Install-GoalLoop.ps1 -RepoUrl https://github.com/bloomstick/opencode-goal-loop.git
#>
param(
  [string]$RepoUrl = "https://github.com/bloomstick/opencode-goal-loop.git",
  [string]$SourceDir = (Join-Path $env:USERPROFILE ".config/opencode/goal-loop")
)
$ErrorActionPreference = "Stop"

$CmdDir = (Join-Path $env:USERPROFILE ".config/opencode/commands")
$AgentDir = (Join-Path $env:USERPROFILE ".config/opencode/agents")
$SkillDir = (Join-Path $env:USERPROFILE ".config/opencode/skills")

if (-not (Test-Path $SourceDir -PathType Container)) {
  Write-Output ("CLONE: {0} -> {1}" -f $RepoUrl, $SourceDir)
  & git clone $RepoUrl $SourceDir
  if ($LASTEXITCODE -ne 0) { throw "git clone failed" }
} else {
  Write-Output ("PULL: {0}" -f $SourceDir)
  & git -C $SourceDir pull --ff-only
  if ($LASTEXITCODE -ne 0) { throw "git pull failed (resolve in $SourceDir, then re-run)" }
}

foreach ($D in @($CmdDir, $AgentDir, $SkillDir)) {
  New-Item -ItemType Directory -Force $D | Out-Null
}

Copy-Item (Join-Path $SourceDir "commands/*.md") $CmdDir -Force
Copy-Item (Join-Path $SourceDir "agents/*.md") $AgentDir -Force
foreach ($S in (Get-ChildItem (Join-Path $SourceDir "skills") -Directory)) {
  $Dst = (Join-Path $SkillDir $S.Name)
  New-Item -ItemType Directory -Force $Dst | Out-Null
  Copy-Item (Join-Path $S.FullName "*") $Dst -Recurse -Force
}

Write-Output "DONE: goal-loop installed globally. Restart OpenCode, then run /goal <task>."
