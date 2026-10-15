# Check-GoalOutput.ps1 - PURE same-session resend checker (REQ-02a).
#
# Reads a captured run transcript, finds the LAST report-shaped block in the
# exact skill sec. 3 field order (CODE / Added / SLOC / Tests-proofs /
# Caveats), and prints one verdict line. The checker is PURE: it reads a
# file and prints a verdict. It never dispatches, never resends, never
# touches sessions. The orchestrator executes every resend (skill sec. 2
# step 5) and records it in the manifest Runs record.
#
# Usage: powershell -NoProfile -File scripts/goal-loop/Check-GoalOutput.ps1 -Transcript runs/<req>-run<N>.out
#
# Verdicts (exit 0 always on a verdict path; script errors throw loudly):
#   VERDICT: DONE "title"               last block has a plain title
#   VERDICT: BLOCKED "title"            last block title ends in (blocked)
#   VERDICT: CONTINUE (reason: no block | block not last | malformed)
param(
    [Parameter(Mandatory = $true)]
    [string]$Transcript
)

$ErrorActionPreference = 'Stop'

if (-not (Test-Path -LiteralPath $Transcript -PathType Leaf)) {
    throw "Check-GoalOutput: transcript not found: $Transcript"
}

$lines = Get-Content -LiteralPath $Transcript

function Test-TitleLine([string]$line, [ref]$code, [ref]$title, [ref]$isBlocked) {
    # Title form: <CODE> - <title>  or  <CODE> -- <title> [(blocked)]
    $m = [regex]::Match($line, '^(\S+)\s-{1,2}\s(.+?)\s*$')
    if (-not $m.Success) { return $false }
    if ([string]::IsNullOrWhiteSpace($m.Groups[2].Value)) { return $false }
    $t = $m.Groups[2].Value.Trim()
    $blocked = $false
    $bm = [regex]::Match($t, '^(.+?)\s+\(blocked\)\s*$')
    if ($bm.Success) {
        $blocked = $true
        $t = $bm.Groups[1].Value.Trim()
        if ([string]::IsNullOrWhiteSpace($t)) { return $false }
    }
    $code.Value = $m.Groups[1].Value
    $title.Value = $t
    $isBlocked.Value = $blocked
    return $true
}

function Test-BlockAt([string[]]$all, [int]$i, [ref]$title, [ref]$isBlocked, [ref]$endIndex) {
    # A block is 5 ordered field lines; optional Blocked:/Landed: lines may
    # sit between Tests/proofs: and Caveats: (sec. 6 blocked shape) without
    # breaking the sec. 3 field order.
    $code = ''
    $t = ''
    $b = $false
    if (-not (Test-TitleLine $all[$i] ([ref]$code) ([ref]$t) ([ref]$b))) { return $false }
    if ($i + 4 -ge $all.Count) { return $false }
    if ($all[$i + 1] -notmatch '^Added:') { return $false }
    if ($all[$i + 2] -notmatch '^SLOC:') { return $false }
    if ($all[$i + 3] -notmatch '^Tests/proofs:') { return $false }
    $j = $i + 4
    while ($j -lt $all.Count -and $all[$j] -match '^(Blocked|Landed):') { $j++ }
    if ($j -ge $all.Count) { return $false }
    if ($all[$j] -notmatch '^Caveats:') { return $false }
    $title.Value = $t
    $isBlocked.Value = $b
    $endIndex.Value = $j
    return $true
}

$blocks = @()
for ($i = 0; $i -lt $lines.Count; $i++) {
    $title = ''
    $isBlocked = $false
    $endIndex = -1
    if (Test-BlockAt $lines $i ([ref]$title) ([ref]$isBlocked) ([ref]$endIndex)) {
        $blocks += [pscustomobject]@{
            Start = $i
            End = $endIndex
            Title = $title
            IsBlocked = $isBlocked
        }
    }
}

if ($blocks.Count -gt 0) {
    $last = $blocks[$blocks.Count - 1]
    $trailing = @()
    if ($last.End + 1 -lt $lines.Count) {
        $trailing = $lines[($last.End + 1)..($lines.Count - 1)] | Where-Object { -not [string]::IsNullOrWhiteSpace($_) }
    }
    if ($trailing.Count -gt 0) {
        Write-Output 'VERDICT: CONTINUE (reason: block not last)'
        exit 0
    }
    if ($last.IsBlocked) {
        Write-Output ('VERDICT: BLOCKED "' + $last.Title + '"')
        exit 0
    }
    Write-Output ('VERDICT: DONE "' + $last.Title + '"')
    exit 0
}

# No valid block: distinguish "almost a block" (malformed) from "no block".
$markers = $lines | Where-Object {
    $_ -match '^Added:' -or $_ -match '^SLOC:' -or $_ -match '^Tests/proofs:' -or `
    $_ -match '^Caveats:' -or $_ -match '^\S+\s-{1,2}\s.+'
}
if ($markers.Count -gt 0) {
    Write-Output 'VERDICT: CONTINUE (reason: malformed)'
    exit 0
}

Write-Output 'VERDICT: CONTINUE (reason: no block)'
exit 0
