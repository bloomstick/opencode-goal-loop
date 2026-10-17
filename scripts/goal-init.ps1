<#
.SYNOPSIS
    Initialize a goal-loop goal branch + goal dir (REQ-02 GI2, orch-side attachments only).
.DESCRIPTION
    Deterministic, fail-loudly Step 0 init for one goal slug. Resolves the
    repo root, enforces a clean tree (tolerating ONLY untracked files under
    the pending goal dir, i.e. pre-seeded attachments), creates branch
    goal/<slug>, creates the goal dir with prompts/ + attachments/, hashes
    any present attachments into the manifest skeleton, commits + pushes
    with upstream, and prints a MACHINE block. Entry point: commands/goal.md
    Step 0. Workers never run this; workers receive NO attachments.
.PARAMETER Slug
    Goal slug: lowercase letters, digits, hyphens (e.g. my-goal).
.PARAMETER Goal
    One-line goal objective, written into the manifest skeleton.
.PARAMETER RepoRoot
    ABSOLUTE path of the repo root the goal lives in. Mandatory on
    purpose: the script refuses ambient-CWD operation so it can never
    create branches or push in whatever directory you happen to stand in.
.EXAMPLE
    powershell -NoProfile -File scripts/goal-init.ps1 -Slug my-goal -Goal "Ship the thing" -RepoRoot "C:\work\myrepo"
#>
param(
  [Parameter(Mandatory=$true)][string]$Slug,
  [Parameter(Mandatory=$true)][string]$Goal,
  [Parameter(Mandatory=$true)][string]$RepoRoot
)
$ErrorActionPreference = "Stop"

if ($Slug -notmatch '^[a-z0-9]+(-[a-z0-9]+)*$') { throw "bad slug '$Slug' (want lowercase alnum + hyphens)" }
if ([string]::IsNullOrWhiteSpace($Goal)) { throw "Goal must not be empty" }
if (-not (Test-Path $RepoRoot -PathType Container)) { throw "RepoRoot is not a directory: '$RepoRoot'" }

$Root = (& git -C $RepoRoot rev-parse --show-toplevel 2>$null)
if ($LASTEXITCODE -ne 0 -or [string]::IsNullOrWhiteSpace($Root)) { throw "RepoRoot is not inside a git repo: '$RepoRoot'" }
$Root = $Root.Trim().TrimEnd('\').Replace('/', '\')
$Given = $RepoRoot.Trim().TrimEnd('\').Replace('/', '\')
if ($Root -ine $Given) { throw "RepoRoot '$RepoRoot' is not a repo root (top level is '$Root'); pass the root, not a subdir" }

& git -C $Root fetch origin 2>$null
if ($LASTEXITCODE -ne 0) { throw "git fetch origin failed in '$Root'" }
$Base = (& git -C $Root rev-parse origin/main 2>$null)
if ($LASTEXITCODE -ne 0) { throw "cannot resolve origin/main in '$Root'" }
$Base = $Base.Trim()
if ($Base -notmatch '^[0-9a-f]{40}$') { throw "unreadable origin/main tip: '$Base'" }

$Branch = "goal/$Slug"
$GoalDirRel = ".opencode/goal-loop/$Slug"
$PromptsRel = "$GoalDirRel/prompts"
$AttachRel = "$GoalDirRel/attachments"
$ManifestRel = "$GoalDirRel/reqs-manifest.md"
$Date = (Get-Date -Format 'yyyy-MM-dd')

$Porc = (& git -C $Root status --porcelain -uall)
if ($LASTEXITCODE -ne 0) { throw "git status failed" }
$Bad = @()
foreach ($l in $Porc) {
  if ($l.StartsWith("?? $GoalDirRel/") -or $l -eq "?? $GoalDirRel") { continue }
  $Bad += $l
}
if ($Bad.Count -gt 0) {
  throw ("dirty tree (only untracked files under $GoalDirRel/ are tolerated):`n" + ($Bad -join "`n"))
}

& git -C $Root rev-parse --verify --quiet $Branch 2>$null | Out-Null
if ($LASTEXITCODE -eq 0) { throw "branch $Branch already exists (init is one-shot; refusing second run)" }
$RemoteHead = (& git -C $Root ls-remote --heads origin $Branch 2>$null)
if ($LASTEXITCODE -ne 0) { throw "git ls-remote origin failed (cannot check remote branch $Branch)" }
if (-not [string]::IsNullOrWhiteSpace($RemoteHead)) { throw "branch $Branch already exists on origin (init is one-shot; refusing second run)" }
if (Test-Path (Join-Path $Root $ManifestRel) -PathType Leaf) { throw "manifest $ManifestRel already exists (init is one-shot; refusing second run)" }

& cmd /c "git -C ""$Root"" checkout -b $Branch >nul 2>&1"
if ($LASTEXITCODE -ne 0) { throw "git checkout -b $Branch failed" }

foreach ($D in @($GoalDirRel, $PromptsRel, $AttachRel)) {
  New-Item -ItemType Directory -Force (Join-Path $Root $D) | Out-Null
}

$Files = @(Get-ChildItem (Join-Path $Root $AttachRel) -File -ErrorAction SilentlyContinue | Sort-Object Name)
$AttachLines = @()
foreach ($F in $Files) {
  $H = (Get-FileHash -Path $F.FullName -Algorithm SHA256).Hash.ToLower()
  $AttachLines += "- $AttachRel/$($F.Name) sha256:$H"
}
if ($AttachLines.Count -eq 0) { $AttachHeader = "- Attachments: none" }
else { $AttachHeader = "- Attachments: $($AttachLines.Count) saved file(s) under $AttachRel/" }

$Manifest = @(
  "# Goal: $Goal",
  "Base: $Base | Date: $Date | Slug: $Slug | Goal-branch: $Branch",
  "- [ ] REQ-01 TBD -- verify: TBD -- status: pending",
  "## Attachments",
  $AttachHeader
) + $AttachLines + @(
  "- NOTE: saved copies only - sessions retain attachment BASENAMES only, so original paths are unrecoverable.",
  "## DAG",
  "- REQ-01: no deps",
  "## Runs",
  "## Log",
  "- $Date init slug=$Slug branch=$Branch attachments=$($AttachLines.Count)"
)
[IO.File]::WriteAllLines((Join-Path $Root $ManifestRel), $Manifest, [Text.Encoding]::ASCII)

& cmd /c "git -C ""$Root"" add -f $GoalDirRel >nul 2>&1"
if ($LASTEXITCODE -ne 0) { throw "git add $GoalDirRel failed" }
& cmd /c "git -C ""$Root"" commit -m ""goal($Slug): init branch + manifest skeleton"" >nul 2>&1"
if ($LASTEXITCODE -ne 0) { throw "git commit failed" }
& cmd /c "git -C ""$Root"" push -u origin $Branch >nul 2>&1"
if ($LASTEXITCODE -ne 0) { throw "git push -u origin $Branch failed" }

Write-Output "MACHINE-BEGIN"
Write-Output "slug: $Slug"
Write-Output "branch: $Branch"
Write-Output "goalDir: $GoalDirRel"
Write-Output "manifest: $ManifestRel"
Write-Output "attachments: $($AttachLines.Count)"
Write-Output "base: $Base"
Write-Output "MACHINE-END"
