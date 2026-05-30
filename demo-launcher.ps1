# =============================================================================
# Lex.NY demo launcher
# =============================================================================
#
# Opens every tab you need for the 90-second + 3-minute demo cuts, in the
# order they appear in DEMO_SCRIPT.md, all in a single Chrome window so the
# tab strip across the top shows your demo flow at a glance.
#
# USE:
#   .\demo-launcher.ps1                          # local dev (localhost:3000)
#   .\demo-launcher.ps1 -Public                  # public URL (iam.nota.lawyer)
#
# Tabs open in left-to-right order, so just tap Ctrl+Tab during recording.
# Each tab gets a 600ms delay so Chrome's tab manager doesn't dedupe.
# =============================================================================

param(
    [switch]$Public
)

$base = if ($Public) { "https://iam.nota.lawyer" } else { "http://localhost:3000" }

Write-Host ""
Write-Host "Lex.NY demo launcher" -ForegroundColor Cyan
Write-Host "Base URL: $base" -ForegroundColor DarkGray
Write-Host ""

# The demo flow from DEMO_SCRIPT.md, in recording order:
$tabs = @(
    # Tab 1 - homepage hero (open on this; show live stats strip)
    "$base/",

    # Tab 2 - /ask with the GBS 349 question pre-filled (marquee answer)
    "$base/ask?q=Under%20what%20circumstances%20can%20a%20New%20York%20court%20vacate%20a%20judgment%20under%20CPLR%205015%3F",

    # Tab 3 - /ask with a clean abstain query (proves 0.55 similarity floor)
    "$base/ask?q=What%20is%20the%20best%20chocolate%20chip%20cookie%20recipe%3F",

    # Tab 4 - /search semantic+keyword on a marquee chain
    "$base/search?q=weight%20of%20evidence%20appellate%20review",

    # Tab 5 - /cited-by Bleakley (the citation-graph wow moment)
    "$base/cited-by/5688657",

    # Tab 6 - /stats - live numbers, sponsor wall
    "$base/stats",

    # Tab 7 - /watches - Triggerware live deltas
    "$base/watches",

    # Tab 8 - /how-it-works - the architecture story
    "$base/how-it-works",

    # Tab 9 - GitHub repo (for the close)
    "https://github.com/banksythequantLab/lex-ny"
)

# Detect Chrome path - try the common locations
$chromePaths = @(
    "${env:ProgramFiles}\Google\Chrome\Application\chrome.exe",
    "${env:ProgramFiles(x86)}\Google\Chrome\Application\chrome.exe",
    "${env:LOCALAPPDATA}\Google\Chrome\Application\chrome.exe"
)
$chrome = $chromePaths | Where-Object { Test-Path $_ } | Select-Object -First 1

if (-not $chrome) {
    Write-Host "ERROR: Chrome not found. Open the tabs manually:" -ForegroundColor Red
    $tabs | ForEach-Object { Write-Host "  $_" }
    exit 1
}

Write-Host "Chrome: $chrome" -ForegroundColor DarkGray
Write-Host ""
Write-Host "Opening $($tabs.Count) tabs..." -ForegroundColor Yellow

# Open the first tab in a new window
& $chrome --new-window $tabs[0]
Start-Sleep -Milliseconds 1200

# Open the rest in the same window
for ($i = 1; $i -lt $tabs.Count; $i++) {
    $url = $tabs[$i]
    Write-Host "  Tab $($i+1): $url" -ForegroundColor DarkGray
    & $chrome $url
    Start-Sleep -Milliseconds 600
}

Write-Host ""
Write-Host "All tabs open. Recording cheat sheet: DEMO_CHEAT_SHEET.md" -ForegroundColor Green
Write-Host ""
Write-Host "Pre-warm tips:" -ForegroundColor Yellow
Write-Host "  - Click through each tab once to trigger the LLM calls and warm cache"
Write-Host "  - The /ask CPLR 5015 tab will take ~6s on first load (Groq cold)"
Write-Host "  - After warm-up, recording-time latency is ~2-3s per tab"
Write-Host "  - Bright Data + Groq counters persist across restarts now (commit 0c580da)"
Write-Host ""
