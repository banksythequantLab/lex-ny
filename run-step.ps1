# run-step.ps1 - Load .env.local into the process and run a tsx script.
# Usage:
#   pwsh -ExecutionPolicy Bypass -File run-step.ps1 scripts/embed-corpus.ts --kind=statute --limit=2200

param([Parameter(ValueFromRemainingArguments=$true)][string[]]$ScriptArgs)

$ErrorActionPreference = 'Stop'
$root = 'E:\nota_lawyer_hackathon\nota-build'

# Parse .env.local into process env
Get-Content "$root\nota-lex\.env.local" | ForEach-Object {
    if ($_ -match '^([A-Z][A-Z_0-9]+)=(.*)$') {
        [Environment]::SetEnvironmentVariable($matches[1], $matches[2], 'Process')
    }
}

# Sanity-print which critical vars are set
$keys = 'NEXT_PUBLIC_SUPABASE_URL','SUPABASE_SERVICE_ROLE_KEY','OLLAMA_EMBED_URL','OLLAMA_EMBED_MODEL','COURTLISTENER_API_TOKEN','NY_SENATE_API_KEY','BRIGHT_DATA_API_TOKEN','GROQ_API_KEY'
foreach ($k in $keys) {
    $v = [Environment]::GetEnvironmentVariable($k)
    $status = if ($v) { 'SET' } else { '(empty)' }
    Write-Host ("  {0,-32} {1}" -f $k, $status)
}

Set-Location "$root\nota-shared"
Write-Host ""
Write-Host "=== Running: tsx $($ScriptArgs -join ' ') ===" -ForegroundColor Cyan
& "$root\node_modules\.bin\tsx.cmd" @ScriptArgs
$exit = $LASTEXITCODE
Write-Host ""
Write-Host "=== Done (exit $exit) ===" -ForegroundColor Cyan
exit $exit
